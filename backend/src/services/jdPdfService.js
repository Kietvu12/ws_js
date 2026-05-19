/**
 * Service tạo PDF từ JD template
 */
import fs from 'fs';
import { copyFile, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import { pathToFileURL } from 'url';
import { findJdTemplateLogoAbsolutePath, generateJdTemplateHtml } from '../utils/jdTemplateHtml.js';

/** Cùng thư mục với `index.html` khi mở `file://` — tránh ảnh `data:` không in được trên một số Chromium headless */
const JD_PDF_LOGO_BASENAME = 'jd-template-logo.png';

/** Đường dẫn thường gặp trên server Ubuntu/Debian (khi không dùng cache ~/.cache/puppeteer). Snap hay có trên AWS Ubuntu. */
const SYSTEM_CHROME_CANDIDATES = [
  () => process.env.PUPPETEER_EXECUTABLE_PATH,
  () => process.env.CHROME_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/lib/chromium-browser/chromium-browser',
  '/usr/lib/chromium/chromium',
  '/snap/bin/chromium',
];

function resolveChromeExecutable() {
  for (const entry of SYSTEM_CHROME_CANDIDATES) {
    try {
      const p = typeof entry === 'function' ? entry() : entry;
      if (p && typeof p === 'string' && fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  try {
    if (typeof puppeteer.executablePath === 'function') {
      const bundled = puppeteer.executablePath();
      if (bundled && fs.existsSync(bundled)) return bundled;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-extensions',
  /** Một số Chromium khi `page.goto(file://…)` không vẽ `<img src="tên-file-tương đối">`; file:// tuyệt đối + cờ này giúp ổn định trên Linux/server. */
  '--allow-file-access-from-files',
];

/** setContent: tránh networkidle0 — HTML JD có @font / ảnh ngoài có thể không bao giờ “idle” trên server (timeout 60s). */
const SETCONTENT_TIMEOUT_MS = parseInt(process.env.JD_PDF_SETCONTENT_TIMEOUT_MS || '', 10) || 120000;
const SETCONTENT_WAIT_UNTIL = process.env.JD_PDF_SETCONTENT_WAIT_UNTIL || 'domcontentloaded';

/**
 * Thử lần lượt: Chromium hệ thống → Puppeteer bundled (npx puppeteer browsers install chrome) → launch không chỉ định executable (một số bản cài đặt).
 */
async function launchBrowser(userDataDir) {
  const exec = resolveChromeExecutable();
  const opts = { headless: true, args: LAUNCH_ARGS };
  if (userDataDir) opts.userDataDir = userDataDir;

  if (exec) {
    try {
      return await puppeteer.launch({ ...opts, executablePath: exec });
    } catch (err) {
      console.warn('[jdPdfService] Launch với executablePath thất bại:', exec, '|', err?.message || err);
    }
  } else {
    console.warn('[jdPdfService] Không tìm thấy file Chrome/Chromium trên disk (kiểm tra /snap/bin/chromium, PUPPETEER_EXECUTABLE_PATH, hoặc chạy: pnpm run puppeteer:install-chrome).');
  }

  try {
    return await puppeteer.launch(opts);
  } catch (err) {
    console.error('[jdPdfService] Puppeteer launch mặc định (bundled) thất bại:', err?.message || err);
    return null;
  }
}

/**
 * Tạo PDF buffer từ dữ liệu Job theo ngôn ngữ
 * @param {Object} job - Job model instance đã include đầy đủ (recruitingCompany, category, salaryRanges, requirements, workingLocations, ...)
 * @param {string} [lang='vi'] - 'vi' | 'en' | 'jp'
 * @returns {Promise<Buffer|null>} PDF buffer hoặc null nếu lỗi
 */
export async function generateJdPdfBuffer(job, lang = 'vi') {
  let browser = null;
  let tmpUserDataDir = null;
  let tmpHtmlDir = null;
  try {
    tmpUserDataDir = await mkdtemp(path.join(os.tmpdir(), 'jd_pdf_chrome_'));

    const logoPath = findJdTemplateLogoAbsolutePath();
    let html;
    let openAsFileUrl = false;
    let indexPath = null;
    if (logoPath && fs.existsSync(logoPath)) {
      tmpHtmlDir = await mkdtemp(path.join(os.tmpdir(), 'jd_pdf_html_'));
      indexPath = path.join(tmpHtmlDir, 'index.html');
      const logoDestPath = path.join(tmpHtmlDir, JD_PDF_LOGO_BASENAME);
      await copyFile(logoPath, logoDestPath);
      const logoFileUrl = pathToFileURL(logoDestPath).href;
      html = generateJdTemplateHtml(job, lang, { logoFileUrl: logoFileUrl });
      await writeFile(indexPath, html, 'utf8');
      openAsFileUrl = true;
    } else {
      html = generateJdTemplateHtml(job, lang);
    }

    browser = await launchBrowser(tmpUserDataDir);
    if (!browser) {
      return null;
    }
    const page = await browser.newPage();
    if (openAsFileUrl && indexPath) {
      const fileUrl = pathToFileURL(indexPath).href;
      await page.goto(fileUrl, {
        waitUntil: SETCONTENT_WAIT_UNTIL,
        timeout: SETCONTENT_TIMEOUT_MS,
      });
    } else {
      await page.setContent(html, {
        waitUntil: SETCONTENT_WAIT_UNTIL,
        timeout: SETCONTENT_TIMEOUT_MS,
      });
    }
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      }
    });
    // Logo JD nhúng data URI — đợi decode/vẽ xong trước khi in PDF (tránh ô trống trên một số bản Chromium)
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.addEventListener('load', resolve, { once: true });
                  img.addEventListener('error', resolve, { once: true });
                  setTimeout(resolve, 8000);
                })
        )
      );
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    return Buffer.from(pdfBuffer);
  } catch (err) {
    console.error('[jdPdfService] Lỗi khi tạo PDF:', err?.message || err, err?.stack);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (tmpUserDataDir) {
      await rm(tmpUserDataDir, { recursive: true, force: true }).catch(() => {});
    }
    if (tmpHtmlDir) {
      await rm(tmpHtmlDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

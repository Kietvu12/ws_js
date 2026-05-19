/**heheheheheheheheeh
 * Service tạo PDF từ CV template (Rirekisho + Shokumu)
 * Font: load qua page.goto(URL) để trang có origin thật → Google Fonts tải được, tránh ô vuông.
 */
import puppeteer from 'puppeteer';
import { existsSync, readlinkSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { generateCvTemplateHtml } from '../utils/cvTemplateHtml.js';

/** Store HTML tạm để Puppeteer load qua URL (giúp font từ Google Fonts tải đúng) */
const _htmlStore = new Map();

export function storeHtmlForPdf(html) {
  const id = uuidv4();
  _htmlStore.set(id, html);
  return id;
}

export function getStoredHtml(id) {
  return _htmlStore.get(id) || null;
}

export function deleteStoredHtml(id) {
  _htmlStore.delete(id);
}

const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check'
];

/** Queue tạo PDF để tránh launch Chromium đồng thời gây lock profile trên một số môi trường server. */
let _cvPdfGenerateQueue = Promise.resolve();

const FULLWIDTH_UNDERSCORE = '＿'; // U+FF3F

function sanitizeFilenamePart(input) {
  const s = String(input ?? '')
    .replace(/[\\/:*?"<>|]/g, '_') // Windows forbidden chars
    .replace(/\s+/g, ' ')
    .trim();
  return s || 'cv';
}

function getTemplateLabelFromCvTemplate(cvTemplate) {
  const t = String(cvTemplate ?? '').trim();
  if (t === 'cv_it') return 'IT系';
  if (t === 'cv_technical') return '理系';
  // common | unknown
  return '一般';
}

function getTemplateLabelFromTemplateDir(templateDir) {
  const t = String(templateDir ?? '').trim().toLowerCase();
  if (t === 'it') return 'IT系';
  if (t === 'technical') return '理系';
  // Common | unknown
  return '一般';
}

/**
 * Content-Disposition cho inline + hỗ trợ Unicode (RFC 5987).
 * @param {string} filename
 */
export function makeInlineDisposition(filename) {
  if (!filename || typeof filename !== 'string') return 'inline';
  const clean = filename.replace(/["\\]/g, '_').trim();
  const isAscii = /^[\x00-\x7F]*$/.test(clean);
  if (isAscii) return `inline; filename="${clean}"`;
  const ext = path.extname(clean);
  const fallback = `download${ext}`;
  const encoded = encodeURIComponent(clean);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Filename cho preview (payload cvTemplate: common|cv_it|cv_technical; tab: rirekisho|shokumu|all)
 * Ví dụ:
 * - `${name} _履歴書_一般.pdf`
 * - `${name}_職務経歴書＿一般.pdf`
 */
export function buildCvTemplatePdfFilenameFromPreviewPayload({ cvData, cvTemplate, tab }) {
  const candidateName = sanitizeFilenamePart(cvData?.nameKanji ?? cvData?.name ?? '');
  const label = getTemplateLabelFromCvTemplate(cvTemplate);

  if (tab === 'shokumu') {
    return `${candidateName}_職務経歴書＿${label}.pdf`;
  }
  if (tab === 'rirekisho') {
    return `${candidateName} _履歴書_${label}.pdf`;
  }
  // tab === 'all'
  return `${candidateName} _履歴書+職務経歴書＿${label}.pdf`;
}

/**
 * Filename cho download template lưu trong snapshot (template: Common|IT|Technical; document: rirekisho|shokumu)
 */
export function buildCvTemplatePdfFilenameFromStorageQuery({ cv, template, document }) {
  const candidateName = sanitizeFilenamePart(cv?.nameKanji ?? cv?.name ?? cv?.code ?? '');
  const label = getTemplateLabelFromTemplateDir(template);
  const doc = document === 'shokumu' ? 'shokumu' : 'rirekisho';

  if (doc === 'shokumu') {
    return `${candidateName}_職務経歴書＿${label}.pdf`;
  }
  return `${candidateName} _履歴書_${label}.pdf`;
}

/**
 * Đường dẫn Chrome/Chromium phổ biến trên Linux.
 * Ưu tiên google-chrome-stable (deb) trước snap chromium — snap có sandbox riêng gây lỗi userDataDir lock.
 */
const CHROME_FALLBACK_PATHS = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/lib/chromium-browser/chromium-browser',
  '/usr/lib/chromium/chromium',
  '/snap/bin/chromium',
  '/usr/bin/chrome'
];

const SNAP_PATHS = new Set(['/snap/bin/chromium']);

function _isSnapChromium(binPath) {
  try {
    const resolved = readlinkSync(binPath);
    return resolved.includes('/snap/');
  } catch { return false; }
}

let _chromiumPathLogged = false;

function getChromiumExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const p = process.env.PUPPETEER_EXECUTABLE_PATH.trim();
    if (p && existsSync(p)) return p;
  }
  for (const p of CHROME_FALLBACK_PATHS) {
    if (p && existsSync(p)) {
      if (!_chromiumPathLogged) {
        _chromiumPathLogged = true;
        console.log('[cvPdfService] Dùng Chrome/Chromium tại:', p);
        if (SNAP_PATHS.has(p) || _isSnapChromium(p)) {
          console.warn('[cvPdfService] ⚠ Có thể đang dùng Snap Chromium — snap sandbox gây lỗi "browser already running". Nên cài google-chrome-stable (deb): wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list && sudo apt update && sudo apt install -y google-chrome-stable');
        }
      }
      return p;
    }
  }
  if (!_chromiumPathLogged) {
    console.warn('[cvPdfService] Không tìm thấy Chrome/Chromium. Cài google-chrome-stable: wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list && sudo apt update && sudo apt install -y google-chrome-stable');
    _chromiumPathLogged = true;
  }
  return null;
}

/**
 * Tạo PDF buffer từ HTML (dùng chung cho 1 tab hoặc full).
 * @param {Object} cv - CV model hoặc plain object
 * @param {Object} options - { avatarDataUrl, avatarBase64, avatarPreview, avatarPhoto, cvTemplate, tab: 'rirekisho'|'shokumu'|'all' }
 * @returns {Promise<Buffer|null>}
 */
async function _generateCvPdfBufferFromHtml(cv, options = {}) {
  const waitPrev = _cvPdfGenerateQueue.catch(() => {});
  let releaseQueue = null;
  _cvPdfGenerateQueue = new Promise((resolve) => {
    releaseQueue = resolve;
  });
  await waitPrev;

  const avatarDataUrl = options.avatarDataUrl || options.avatarBase64 || options.avatarPreview || options.avatarPhoto || '';
  const cvTemplate = options.cvTemplate || 'common';
  const tab = options.tab || 'all';
  const html = generateCvTemplateHtml(cv, { avatarDataUrl, cvTemplate, tab });
  const port = config.port || process.env.PORT || 3000;
  const baseUrl = `http://127.0.0.1:${port}`;
  const renderId = storeHtmlForPdf(html);
  let browser = null;
  try {
    const executablePath = getChromiumExecutablePath();
    const launchOptions = {
      headless: true,
      args: PUPPETEER_ARGS
    };
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    const renderUrl = `${baseUrl}/cv-pdf-render/${renderId}`;
    await page.goto(renderUrl, {
      waitUntil: 'networkidle0',
      timeout: 25000
    });
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise(r => setTimeout(r, 8000))
    ]).catch(() => {});

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      preferCSSPageSize: false
    });
    return Buffer.from(pdfBuffer);
  } catch (err) {
    console.error('[cvPdfService] Lỗi khi tạo PDF:', err.message);
    if (/Could not find Chrome|Failed to launch|executable doesn't exist/i.test(err.message || '')) {
      console.error('[cvPdfService] Trên server: chạy "sudo apt-get update && sudo apt-get install -y chromium-browser". Sau đó chạy "which chromium-browser" để lấy đường dẫn, set env: export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser (thay bằng path thật), rồi restart backend.');
    }
    return null;
  } finally {
    deleteStoredHtml(renderId);
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (typeof releaseQueue === 'function') releaseQueue();
  }
}

/**
 * Tạo PDF buffer từ dữ liệu CV (cả 2 tab Rirekisho + Shokumu).
 * @param {Object} cv - CV model instance hoặc plain object
 * @param {Object} options - { avatarDataUrl: string, cvTemplate: string }
 * @returns {Promise<Buffer|null>} PDF buffer hoặc null
 */
export async function generateCvPdfBuffer(cv, options = {}) {
  return _generateCvPdfBufferFromHtml(cv, { ...options, tab: 'all' });
}

/**
 * Chỉ tạo PDF tab 履歴書 (Lý lịch - tab 1).
 */
export async function generateCvRirekishoPdfBuffer(cv, options = {}) {
  return _generateCvPdfBufferFromHtml(cv, { ...options, tab: 'rirekisho' });
}

/**
 * Chỉ tạo PDF tab 職務経歴書 (Lịch sử việc làm - tab 2).
 */
export async function generateCvShokumuPdfBuffer(cv, options = {}) {
  return _generateCvPdfBufferFromHtml(cv, { ...options, tab: 'shokumu' });
}

/**
 * PDF từ template — tab 'all' | 'rirekisho' | 'shokumu' (preview / tải về khớp HTML).
 */
export async function generateCvTemplatePdfBuffer(cv, options = {}) {
  const tab = (options.tab === 'rirekisho' || options.tab === 'shokumu') ? options.tab : 'all';
  return _generateCvPdfBufferFromHtml(cv, { ...options, tab });
}

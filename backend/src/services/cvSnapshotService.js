/**
 * Lưu CV gốc (snapshot) + sinh PDF template — dùng chung cho createCV và bulk import.
 * Caller chịu trách nhiệm xóa file tạm trên đĩa (multer disk) sau khi gọi xong.
 */
import path from 'path';
import fs from 'fs/promises';
import {
  s3Enabled,
  getCvSnapshotDateTime,
  buildCvOriginalFolderKey,
  buildCvTemplateFolderKey,
  buildCvTemplateFileKey,
  uploadCvOriginalsToSnapshot,
  uploadCvAvatarToSnapshot,
  uploadBufferToS3
} from './s3Service.js';
import { generateCvRirekishoPdfBuffer, generateCvShokumuPdfBuffer } from './cvPdfService.js';
import { Collaborator, Admin } from '../models/index.js';

const templateList = [
  { cvTemplate: 'common', dir: 'Common' },
  { cvTemplate: 'cv_it', dir: 'IT' },
  { cvTemplate: 'cv_technical', dir: 'Technical' }
];

function parseDataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!m) return null;
  try {
    const mime = m[1].split(';')[0].trim();
    const buffer = Buffer.from(m[2], 'base64');
    if (!buffer.length) return null;
    return { mime, buffer };
  } catch {
    return null;
  }
}

/**
 * Lưu ảnh chân dung vào snapshot (S3: CV_avatar/…; local: …/CV_avatar/profile_photo.*)
 */
export async function saveCvAvatarForSnapshot(cv, dateTime, avatarDataUrl, backendRoot, uploadDir) {
  if (!avatarDataUrl || typeof avatarDataUrl !== 'string' || !avatarDataUrl.startsWith('data:image/')) {
    return;
  }
  const parsed = parseDataUrlToBuffer(avatarDataUrl);
  if (!parsed?.buffer?.length) return;
  try {
    if (s3Enabled()) {
      cv.avatarPhotoPath = await uploadCvAvatarToSnapshot(cv.id, dateTime, parsed.buffer, parsed.mime);
    } else {
      const avatarDir = path.join(uploadDir, String(cv.id), dateTime, 'CV_avatar');
      await fs.mkdir(avatarDir, { recursive: true });
      const ext = parsed.mime.includes('png')
        ? '.png'
        : parsed.mime.includes('webp')
          ? '.webp'
          : parsed.mime.includes('gif')
            ? '.gif'
            : '.jpg';
      const dest = path.join(avatarDir, `profile_photo${ext}`);
      await fs.writeFile(dest, parsed.buffer);
      cv.avatarPhotoPath = path.relative(backendRoot, dest).replace(/\\/g, '/');
    }
    await cv.save();
  } catch (e) {
    console.warn('[saveCvAvatarForSnapshot]', e.message);
  }
}

/**
 * @param {import('../models/index.js').CVStorage} cv
 * @param {object} opts
 * @param {Array<{ buffer?: Buffer, path?: string, originalname?: string, mimetype?: string }>} [opts.cvFiles]
 * @param {string} [opts.avatarDataUrl]
 * @param {string} opts.backendRoot
 * @param {string} opts.uploadDir - thư mục gốc uploads/cvs (local)
 * @param {string} [opts.logPrefix]
 */
export async function saveCvOriginalsAndTemplatesForCv(cv, opts) {
  const {
    cvFiles = [],
    avatarDataUrl = '',
    backendRoot,
    uploadDir,
    logPrefix = '[cvSnapshot]',
    skipPdfGeneration = false
  } = opts;

  const dateTime = getCvSnapshotDateTime();
  await saveCvAvatarForSnapshot(cv, dateTime, avatarDataUrl, backendRoot, uploadDir);
  const files = Array.isArray(cvFiles) ? cvFiles.filter(Boolean) : [];

  if (files.length) {
    try {
      if (s3Enabled()) {
        cv.cvOriginalPath = await uploadCvOriginalsToSnapshot(cv.id, dateTime, files);
      } else {
        const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
        const origDir = path.join(snapshotDir, 'CV_original');
        await fs.mkdir(origDir, { recursive: true });
        const usedNames = new Set();
        const toSafeUploadName = (originalname, index) => {
          const rawBase = path.basename(String(originalname || '').trim());
          const sanitized = rawBase
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
          const fallback = `cv-original-${index + 1}.pdf`;
          const name = sanitized || fallback;
          const ext = path.extname(name);
          const stem = ext ? name.slice(0, -ext.length) : name;
          let candidate = name;
          let counter = 2;
          while (usedNames.has(candidate.toLowerCase())) {
            candidate = `${stem}-${counter}${ext}`;
            counter += 1;
          }
          usedNames.add(candidate.toLowerCase());
          return candidate;
        };
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const dest = path.join(origDir, toSafeUploadName(f.originalname, i));
          if (f.path) await fs.copyFile(f.path, dest);
          else if (f.buffer) await fs.writeFile(dest, f.buffer);
        }
        cv.cvOriginalPath = path.relative(backendRoot, origDir);
      }
      await cv.save();
    } catch (e) {
      console.warn(`${logPrefix} Lưu CV gốc thất bại:`, e.message);
    }
  } else {
    if (s3Enabled()) {
      cv.cvOriginalPath = buildCvOriginalFolderKey(cv.id, dateTime);
    } else {
      const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
      const origDir = path.join(snapshotDir, 'CV_original');
      await fs.mkdir(origDir, { recursive: true });
      cv.cvOriginalPath = path.relative(backendRoot, origDir);
    }
    await cv.save();
  }

  try {
    if (!skipPdfGeneration) {
      if (s3Enabled()) {
        for (const { cvTemplate: tpl, dir: templateDir } of templateList) {
          try {
            const rirekishoBuffer = await generateCvRirekishoPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
            if (rirekishoBuffer) {
              const key = buildCvTemplateFileKey(cv.id, dateTime, templateDir, 'cv-rirekisho.pdf');
              await uploadBufferToS3(rirekishoBuffer, key, 'application/pdf');
            }
            const shokumuBuffer = await generateCvShokumuPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
            if (shokumuBuffer) {
              const key = buildCvTemplateFileKey(cv.id, dateTime, templateDir, 'cv-shokumu.pdf');
              await uploadBufferToS3(shokumuBuffer, key, 'application/pdf');
            }
          } catch (e) {
            console.warn(`${logPrefix} PDF ${templateDir} thất bại:`, e.message);
          }
        }
        cv.curriculumVitae = buildCvTemplateFolderKey(cv.id, dateTime);
      } else {
        const snapshotDir = path.join(uploadDir, String(cv.id), dateTime);
        const tplDir = path.join(snapshotDir, 'CV_Template');
        for (const { cvTemplate: tpl, dir: templateDir } of templateList) {
          const subDir = path.join(tplDir, templateDir);
          await fs.mkdir(subDir, { recursive: true });
          try {
            const rirekishoBuffer = await generateCvRirekishoPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
            if (rirekishoBuffer) await fs.writeFile(path.join(subDir, 'cv-rirekisho.pdf'), rirekishoBuffer);
            const shokumuBuffer = await generateCvShokumuPdfBuffer(cv, { avatarDataUrl, cvTemplate: tpl });
            if (shokumuBuffer) await fs.writeFile(path.join(subDir, 'cv-shokumu.pdf'), shokumuBuffer);
          } catch (e) {
            console.warn(`${logPrefix} PDF ${templateDir} thất bại:`, e.message);
          }
        }
        cv.curriculumVitae = path.relative(backendRoot, tplDir);
      }
    }
    if (cv.curriculumVitae) {
      await cv.save();
      await cv.reload({
        include: [
          { model: Collaborator, as: 'collaborator', required: false },
          { model: Admin, as: 'admin', required: false }
        ]
      });
    }
  } catch (e) {
    console.warn(`${logPrefix} Không thể tạo PDF template:`, e.message);
  }
}

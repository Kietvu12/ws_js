import path from 'path';
import fs from 'fs/promises';
import { isS3Key, listKeysUnderPrefix } from '../services/s3Service.js';

/**
 * Các cặp (templateDir, document) thực sự có file PDF trong thư mục CV_Template (S3 hoặc local).
 * Tránh liệt kê 3 mẫu khi chỉ tạo một mẫu (ứng viên).
 *
 * @param {string} templateFolderRef - Key S3 folder CV_Template hoặc đường dẫn tương đối/absolute tới CV_Template
 * @param {string} backendRoot - Gốc backend để resolve path local tương đối
 * @returns {Promise<Array<{ template: string, document: string }>>}
 */
export async function listExistingCvTemplateDocumentPairs(templateFolderRef, backendRoot) {
  if (!templateFolderRef || typeof templateFolderRef !== 'string') return [];
  const normalized = templateFolderRef.trim();
  if (!normalized.includes('CV_Template')) return [];

  const pairs = [];
  if (isS3Key(normalized)) {
    const keys = await listKeysUnderPrefix(normalized);
    const re = /\/(Common|IT|Technical)\/cv-(rirekisho|shokumu)\.pdf$/i;
    for (const key of keys) {
      const m = key.match(re);
      if (m) {
        pairs.push({ template: m[1], document: m[2].toLowerCase() });
      }
    }
    return pairs;
  }

  const base = path.isAbsolute(normalized)
    ? normalized
    : path.join(backendRoot, normalized.replace(/^\//, ''));
  for (const tpl of ['Common', 'IT', 'Technical']) {
    for (const doc of ['rirekisho', 'shokumu']) {
      const f = path.join(base, tpl, `cv-${doc}.pdf`);
      try {
        await fs.access(f);
        pairs.push({ template: tpl, document: doc });
      } catch {
        // missing
      }
    }
  }
  return pairs;
}

import path from 'path';

const CV_ORIGINAL_EXTS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'txt',
  'rtf',
  'odt',
  'ods'
]);

/** CV original upload: extension whitelist; MIME may be empty or generic (browser quirks). */
export function isAllowedCvOriginalUpload(file) {
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/^\./, '');
  if (!CV_ORIGINAL_EXTS.has(ext)) return false;
  const mime = String(file.mimetype || '').toLowerCase();
  if (!mime || mime === 'application/octet-stream') return true;
  return /pdf|msword|wordprocessing|spreadsheet|excel|powerpoint|presentation|officedocument|image\/|text\/plain|text\/rtf|rtf|opendocument/.test(
    mime
  );
}

export const CV_ORIGINAL_UPLOAD_ERROR =
  'Ch\u1EC9 ch\u1EA5p nh\u1EADn file PDF, Word, Excel, PowerPoint, \u1EA3nh (JPG/PNG/GIF/WEBP), TXT, RTF, ODT/ODS';

/**
 * Kiểm tra job có đường dẫn file (camelCase hoặc snake_case từ API).
 */

function strOk(v) {
  return v != null && String(v).trim() !== '';
}

export function hasJobAttachment(job, fileType) {
  if (!job || typeof job !== 'object') return false;
  switch (fileType) {
    case 'jdFile':
      return strOk(job.jdFile) || strOk(job.jd_file);
    case 'jdFileEn':
      return strOk(job.jdFileEn) || strOk(job.jd_file_en);
    case 'jdFileJp':
      return strOk(job.jdFileJp) || strOk(job.jd_file_jp);
    case 'jdOriginalFile':
      return strOk(job.jdOriginalFile) || strOk(job.jd_original_file);
    case 'requiredCvForm':
      return strOk(job.requiredCvForm) || strOk(job.required_cv_form);
    default:
      return false;
  }
}

const DOWNLOAD_TYPES = ['jdFile', 'jdFileEn', 'jdFileJp', 'jdOriginalFile', 'requiredCvForm'];

export function hasAnyDownloadableAttachment(job) {
  return DOWNLOAD_TYPES.some((ft) => hasJobAttachment(job, ft));
}

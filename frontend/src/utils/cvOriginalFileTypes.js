/** Original CV upload extensions (keep in sync with backend cvOriginalUploadAllowlist). */
export const CV_ORIGINAL_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.rtf,.odt,.ods';

const CV_ORIGINAL_EXT_RE =
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|webp|txt|rtf|odt|ods)$/i;

export function isSupportedCvOriginalFile(file) {
  if (!file) return false;
  const name = String(file.name || '').toLowerCase();
  if (CV_ORIGINAL_EXT_RE.test(name)) return true;
  const mime = String(file.type || '').toLowerCase();
  if (!mime) return false;
  return /pdf|msword|wordprocessing|spreadsheet|excel|powerpoint|presentation|officedocument|image\/|text\/plain|text\/rtf|rtf|opendocument/.test(
    mime
  );
}

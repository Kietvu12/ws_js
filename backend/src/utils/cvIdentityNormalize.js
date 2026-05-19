/**
 * Chuẩn hóa email / SĐT để so khớp trùng hồ sơ.
 *
 * Quy tắc sản phẩm: hai hồ sơ coi là trùng nếu **trùng email HOẶC trùng SĐT** (chỉ cần một trong hai).
 * Dùng chung cho `cvDuplicateChecker`, `ctvCvChainStatus`, script backfill.
 */

export function normalizeCvEmail(email) {
  if (email == null || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export function normalizeCvPhone(phone) {
  if (phone == null || typeof phone !== 'string') return '';
  return phone
    .trim()
    .replace(/\s/g, '')
    .replace(/-/g, '')
    .replace(/\./g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\+/g, '');
}

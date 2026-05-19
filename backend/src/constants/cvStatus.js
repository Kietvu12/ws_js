/**
 * Trạng thái hồ sơ ứng viên (cv_storages.status)
 * Dùng chung cho backend (controller, cvDuplicateChecker, ...)
 *
 * Gán hàng loạt theo chuỗi thời gian (cùng CTV; nhóm OR email/SĐT; 6 tháng; bản sau có thể trùng / hợp lệ / quá hạn):
 * Logic: `backend/src/utils/ctvCvChainStatus.js`
 * Script: `backend/scripts/mark-ctv-cv-duplicate-status.js` (mặc định dry-run, `--apply` để ghi DB).
 * Backfill oldest-wins (only status=1; OR email/phone graph; earliest created_at wins): `backend/scripts/backfill-cv-status-oldest-wins.js`
 * Quá hạn 6 tháng: `POST /api/admin/cvs/mark-overdue`, scheduler `src/utils/cvOverdueScheduler.js` (disable env `CV_OVERDUE_SCHEDULER_DISABLED`), script `backend/scripts/backfill-cv-overdue-6-months.js`
 *
 * Khả dụng/không khả dụng (promoted-inactive):
 *   Khi CV hợp lệ quá hạn → các CV trùng với nó được đổi status=1, isDuplicate=0
 *   nhưng giữ nguyên duplicateWithCvId. Điều kiện "không khả dụng":
 *     status = 1 AND is_duplicate = 0 AND duplicate_with_cv_id IS NOT NULL
 *   Những CV này hiển thị "Hồ sơ mới" nhưng bị làm mờ, không thể click/tiến cử.
 */
export const CV_STATUS = {
  1: {
    label: 'Hồ sơ mới',
    value: 'new',
    canNominate: true
  },
  3: {
    label: 'Hồ sơ trùng',
    value: 'duplicate',
    canNominate: false
  },
  4: {
    label: 'Hồ sơ quá hạn quá 6 tháng',
    value: 'overdue_6_months',
    canNominate: false
  }
};

/** Hồ sơ mới – có thể dùng để tiến cử */
export const CV_STATUS_NEW = 1;

/** Hồ sơ trùng – không thể dùng để tiến cử */
export const CV_STATUS_DUPLICATE = 3;

/** Hồ sơ quá hạn quá 6 tháng – tồn tại > 6 tháng, không có đơn tiến cử nào có lịch sử xử lý */
export const CV_STATUS_OVERDUE_6_MONTHS = 4;

/** Hồ sơ khởi tạo thất bại do trùng dữ liệu khi tạo nhanh */
export const CV_STATUS_CREATE_FAILED = 5;

/**
 * Lấy thông tin trạng thái theo mã số
 * @param {number|string|null|undefined} status
 * @returns {{ label: string, value: string, canNominate: boolean }}
 */
export const getCVStatus = (status) => {
  const num = status != null && status !== '' ? Number(status) : NaN;
  if (Number.isNaN(num) || num < 1 || num > 5) {
    return CV_STATUS[CV_STATUS_NEW];
  }
  // 2 (cũ: Đã lưu trữ) không dùng nữa → coi như hồ sơ mới
  if (num === 2) return CV_STATUS[CV_STATUS_NEW];
  return CV_STATUS[num] || CV_STATUS[CV_STATUS_NEW];
};

/** Kiểm tra CV có thể dùng để tiến cử không (chỉ xét status, không xét promoted-inactive) */
export const canCVBeNominated = (status) => {
  return getCVStatus(status).canNominate;
};

/**
 * Kiểm tra CV có phải "promoted-inactive" không (hồ sơ mới nhưng không khả dụng).
 * Điều kiện: status=1, isDuplicate=0/false, duplicateWithCvId IS NOT NULL.
 */
export const isCvPromotedInactive = (cv) => {
  return Number(cv?.status) === CV_STATUS_NEW
    && !cv?.isDuplicate
    && cv?.duplicateWithCvId != null;
};

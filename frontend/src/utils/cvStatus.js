/**
 * Trạng thái hồ sơ ứng viên (cv_storages.status)
 * Đồng bộ với backend/src/constants/cvStatus.js
 */
export const CV_STATUS = {
  1: {
    label: 'Hồ sơ hợp lệ',
    value: 'new',
    canNominate: true,
  },
  3: {
    label: 'Hồ sơ trùng',
    value: 'duplicate',
    canNominate: false,
  },
  4: {
    label: 'Hồ sơ quá hạn quá 6 tháng',
    value: 'overdue_6_months',
    canNominate: false,
  },
  5: {
    label: 'Hồ sơ khởi tạo thất bại',
    value: 'creation_failed',
    canNominate: false,
  },
};

export const CV_STATUS_NEW = 1;
export const CV_STATUS_DUPLICATE = 3;
export const CV_STATUS_OVERDUE_6_MONTHS = 4;
export const CV_STATUS_CREATION_FAILED = 5;

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

/**
 * Style cho badge trạng thái (backgroundColor, color, borderColor)
 */
export const getCVStatusStyle = (status) => {
  const num = status != null && status !== '' ? Number(status) : 1;
  const styles = {
    1: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
    2: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
    3: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
    4: { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
    5: { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  };
  return styles[num] || styles[1];
};

/** Nhãn trạng thái theo ngôn ngữ (vi / en / ja) */
export const CV_STATUS_LABELS = {
  vi: {
    1: 'Hồ sơ hợp lệ',
    3: 'Hồ sơ trùng',
    4: 'Hồ sơ quá hạn quá 6 tháng',
    5: 'Hồ sơ khởi tạo thất bại',
    promotedInactive: 'Không khả dụng',
  },
  en: {
    1: 'Valid profile',
    3: 'Duplicate profile',
    4: 'Overdue 6+ months',
    5: 'Creation failed',
    promotedInactive: 'Unavailable',
  },
  ja: {
    1: '有効なプロフィール',
    3: '重複',
    4: '6ヶ月以上期限切れ',
    5: '作成失敗',
    promotedInactive: '利用不可',
  },
};

/**
 * Lấy nhãn trạng thái theo ngôn ngữ
 * @param {number|string|null|undefined} status
 * @param {'vi'|'en'|'ja'} language
 */
export const getCVStatusLabel = (status, language = 'vi') => {
  const num = status != null && status !== '' ? Number(status) : 1;
  const lang = language === 'en' || language === 'ja' ? language : 'vi';
  const labels = CV_STATUS_LABELS[lang];
  if (num === 2) return labels[1];
  return labels[num] || labels[1];
};

/**
 * Danh sách tất cả trạng thái để dùng cho filter/select (giữ backward compatibility)
 */
export const CV_STATUS_OPTIONS = [
  { value: 1, label: 'Hồ sơ hợp lệ' },
  { value: 3, label: 'Hồ sơ trùng' },
  { value: 4, label: 'Hồ sơ quá hạn quá 6 tháng' },
  { value: 5, label: 'Hồ sơ khởi tạo thất bại' },
];

/**
 * Options trạng thái theo ngôn ngữ (dùng cho dropdown filter)
 */
export const getCVStatusOptions = (language = 'vi') => {
  const lang = language === 'en' || language === 'ja' ? language : 'vi';
  const labels = CV_STATUS_LABELS[lang];
  return [
    { value: 1, label: labels[1] },
    { value: 3, label: labels[3] },
    { value: 4, label: labels[4] },
    { value: 5, label: labels[5] },
  ];
};

/** Chấm màu trong dropdown lọc (khớp badge: xanh = hợp lệ, đỏ = trùng) */
export const getCVStatusFilterDotStyle = (value) => {
  const n = Number(value);
  if (n === 3) return { backgroundColor: '#dc2626' };
  if (n === 1) return { backgroundColor: '#16a34a' };
  if (n === 4) return { backgroundColor: '#6b7280' };
  if (n === 5) return { backgroundColor: '#f97316' };
  return { backgroundColor: '#cbd5e1' };
};

/**
 * Kiểm tra CV có phải "promoted-inactive" không (hồ sơ mới nhưng không khả dụng).
 * status=1 (hồ sơ mới), isDuplicate=false, nhưng duplicateWithCvId vẫn còn giá trị.
 */
export const isCvPromotedInactive = (cv) => {
  const dupId = cv?.duplicateWithCvId ?? cv?.duplicate_with_cv_id ?? null;
  return Number(cv?.status) === CV_STATUS_NEW
    && !cv?.isDuplicate
    && !cv?.is_duplicate
    && dupId != null;
};

/** Style badge khi là promoted-inactive (không khả dụng) */
const PROMOTED_INACTIVE_STYLE = { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };

/**
 * Badge style theo bản ghi CV (có xét promoted-inactive).
 */
export const getCvDisplayStatusStyle = (cv) => {
  if (isCvPromotedInactive(cv)) return { ...PROMOTED_INACTIVE_STYLE };
  return getCVStatusStyle(cv?.status);
};

/**
 * Nhãn trạng thái hiển thị theo bản ghi CV (có xét promoted-inactive).
 */
export const getCvDisplayStatusLabel = (cv, language = 'vi') => {
  const lang = language === 'en' || language === 'ja' ? language : 'vi';
  if (isCvPromotedInactive(cv)) {
    return CV_STATUS_LABELS[lang].promotedInactive || CV_STATUS_LABELS.vi.promotedInactive;
  }
  return getCVStatusLabel(cv?.status, language);
};

/**
 * CV cannot be selected for nomination (CTV): duplicate, overdue, or promoted-inactive.
 */
export const isCvUnavailableForNomination = (cv) => {
  if (!cv) return true;
  if (isCvPromotedInactive(cv)) return true;
  if (cv.isDuplicate || cv.is_duplicate) return true;
  return !getCVStatus(cv.status).canNominate;
};

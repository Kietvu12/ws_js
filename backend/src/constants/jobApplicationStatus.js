/**
 * Trạng thái đơn ứng tuyển / tiến cử (job_applications.status)
 * Dùng chung cho backend (controller, payment, ...) và đồng bộ với frontend utils/jobApplicationStatus.js
 */
export const JOB_APPLICATION_STATUS = {
  1: {
    label: 'Hồ sơ trùng',
    value: 'duplicate',
    category: 'rejected'
  },
  2: {
    label: 'Đang đợi xử lý hồ sơ WS',
    value: 'waiting_ws',
    category: 'processing'
  },
  3: {
    label: 'Đang xử lý hồ sơ',
    value: 'processing_ws',
    category: 'processing'
  },
  4: {
    label: 'Trượt hồ sơ WS',
    value: 'rejected_ws',
    category: 'rejected'
  },
  5: {
    label: 'Đang tiến cử khách hàng',
    value: 'nominating',
    category: 'processing'
  },
  6: {
    label: 'Trượt hồ sơ khách hàng',
    value: 'rejected_client',
    category: 'rejected'
  },
  7: {
    label: 'Đang điều chỉnh lịch phỏng vấn',
    value: 'scheduling_interview',
    category: 'interview'
  },
  8: {
    label: 'Đang chờ phỏng vấn',
    value: 'waiting_interview',
    category: 'interview'
  },
  9: {
    label: 'Đang chờ kết quả phỏng vấn',
    value: 'waiting_interview_result',
    category: 'interview'
  },
  10: {
    label: 'Trượt phỏng vấn',
    value: 'failed_interview',
    category: 'rejected'
  },
  11: {
    label: 'Đã có thông báo trúng tuyển',
    value: 'has_naitei',
    category: 'waiting'
  },
  12: {
    label: 'Đã nhận thông báo trúng tuyển',
    value: 'accepted_naitei',
    category: 'success'
  },
  13: {
    label: 'Từ chối thông báo trúng tuyển',
    value: 'declined_naitei',
    category: 'rejected'
  },
  14: {
    label: 'Đã vào công ty',
    value: 'joined_company',
    category: 'success'
  },
  15: {
    label: 'Đã thanh toán',
    value: 'paid',
    category: 'success'
  },
  16: {
    label: 'Ứng viên huỷ giữa chừng',
    value: 'candidate_withdrew',
    category: 'cancelled'
  }
};

/** Hồ sơ trùng – tiến cử lần 2 cùng job khi đơn cũ chưa kết thúc */
export const STATUS_DUPLICATE = 1;

/** Số trạng thái: dùng khi tạo đơn (CTV tiến cử → đợi WS xử lý) */
export const STATUS_WAITING_WS = 2;

/** Đã vào công ty (nyusha) – dùng cho payment request, lịch nhận tiền n+4 */
export const STATUS_JOINED_COMPANY = 14;

/** Đã thanh toán – không cho xóa đơn */
export const STATUS_PAID = 15;

/** Các trạng thái không cho phép CTV xóa đơn */
export const RESTRICTED_STATUSES_FOR_DELETE = [STATUS_JOINED_COMPANY, STATUS_PAID];

/** Các trạng thái coi là đã kết thúc (trượt/từ chối/hủy) – ứng viên có thể được tiến cử lại cùng job */
export const STATUSES_ENDED = [4, 6, 10, 13, 16]; // Trượt WS, Trượt khách, Trượt PV, Từ chối naitei, Huỷ giữa chừng

/** Các trạng thái đang xử lý — cấm tạo đơn trùng (cùng CV + cùng job) */
export const STATUSES_ACTIVE_BLOCK_DUPLICATE = [2, 3, 5, 7, 8, 9];

/**
 * Kiểm tra trạng thái đơn đã kết thúc chưa (cho phép tiến cử lại cùng job)
 * @param {number} status
 * @returns {boolean}
 */
export const isStatusEnded = (status) => {
  const n = Number(status);
  return Number.isInteger(n) && STATUSES_ENDED.includes(n);
};

/**
 * Lấy thông tin trạng thái theo mã số. Null/undefined/không hợp lệ → coi như 2 (Đang đợi xử lý hồ sơ WS)
 * @param {number|string|null|undefined} status
 * @returns {{ label: string, value: string, category: string }}
 */
export const getJobApplicationStatus = (status) => {
  const num = status != null && status !== '' ? Number(status) : NaN;
  if (Number.isNaN(num) || num < 1 || num > 16) {
    return JOB_APPLICATION_STATUS[2];
  }
  return JOB_APPLICATION_STATUS[num] || JOB_APPLICATION_STATUS[2];
};

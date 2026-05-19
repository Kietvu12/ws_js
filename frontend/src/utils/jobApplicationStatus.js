/**
 * Trạng thái đơn ứng tuyển / tiến cử (job_applications.status)
 * Đồng bộ với backend constants/jobApplicationStatus.js – cùng số và label
 */
export const JOB_APPLICATION_STATUS = {
  1: {
    label: 'Hồ sơ trùng',
    value: 'duplicate',
    color: 'bg-red-100 text-red-800 border-red-300',
    category: 'rejected'
  },
  2: {
    label: 'Đang đợi xử lý hồ sơ WS',
    value: 'waiting_ws',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    category: 'processing'
  },
  3: {
    label: 'Đang xử lý hồ sơ',
    value: 'processing_ws',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    category: 'processing'
  },
  4: {
    label: 'Trượt hồ sơ WS',
    value: 'rejected_ws',
    color: 'bg-red-100 text-red-800 border-red-300',
    category: 'rejected'
  },
  5: {
    label: 'Đang tiến cử khách hàng',
    value: 'nominating',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    category: 'processing'
  },
  6: {
    label: 'Trượt hồ sơ khách hàng',
    value: 'rejected_client',
    color: 'bg-red-100 text-red-800 border-red-300',
    category: 'rejected'
  },
  7: {
    label: 'Đang điều chỉnh lịch phỏng vấn',
    value: 'scheduling_interview',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    category: 'interview'
  },
  8: {
    label: 'Đang chờ phỏng vấn',
    value: 'waiting_interview',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    category: 'interview'
  },
  9: {
    label: 'Đang chờ kết quả phỏng vấn',
    value: 'waiting_interview_result',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    category: 'interview'
  },
  10: {
    label: 'Trượt phỏng vấn',
    value: 'failed_interview',
    color: 'bg-red-100 text-red-800 border-red-300',
    category: 'rejected'
  },
  11: {
    label: 'Đã có thông báo trúng tuyển',
    value: 'has_naitei',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    category: 'waiting'
  },
  12: {
    label: 'Đã nhận thông báo trúng tuyển',
    value: 'accepted_naitei',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    category: 'success'
  },
  13: {
    label: 'Từ chối thông báo trúng tuyển',
    value: 'declined_naitei',
    color: 'bg-red-100 text-red-800 border-red-300',
    category: 'rejected'
  },
  14: {
    label: 'Đã vào công ty',
    value: 'joined_company',
    color: 'bg-green-100 text-green-800 border-green-300',
    category: 'success'
  },
  15: {
    label: 'Đã thanh toán',
    value: 'paid',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    category: 'success'
  },
  16: {
    label: 'Ứng viên huỷ giữa chừng',
    value: 'candidate_withdrew',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    category: 'cancelled'
  }
};

/**
 * @param {number|string|null|undefined} status - Mã trạng thái (1-16). Null/undefined/không hợp lệ → coi như 2 (Đang đợi xử lý hồ sơ WS)
 * @returns {{ label: string, value: string, color: string, category: string }}
 */
export const getJobApplicationStatus = (status) => {
  const num = status != null && status !== '' ? Number(status) : NaN;
  if (num !== num || num < 1 || num > 16) {
    return JOB_APPLICATION_STATUS[2];
  }
  return JOB_APPLICATION_STATUS[num] || JOB_APPLICATION_STATUS[2];
};

export const getJobApplicationStatusLabel = (status) => {
  return getJobApplicationStatus(status).label;
};

/** Nhãn trạng thái đơn tiến cử theo ngôn ngữ (vi / en / ja) */
export const JOB_APPLICATION_STATUS_LABELS = {
  vi: {
    1: 'Hồ sơ trùng',
    2: 'Đang đợi xử lý hồ sơ WS',
    3: 'Đang xử lý hồ sơ',
    4: 'Trượt hồ sơ WS',
    5: 'Đang tiến cử khách hàng',
    6: 'Trượt hồ sơ khách hàng',
    7: 'Đang điều chỉnh lịch phỏng vấn',
    8: 'Đang chờ phỏng vấn',
    9: 'Đang chờ kết quả phỏng vấn',
    10: 'Trượt phỏng vấn',
    11: 'Đã có thông báo trúng tuyển',
    12: 'Đã nhận thông báo trúng tuyển',
    13: 'Từ chối thông báo trúng tuyển',
    14: 'Đã vào công ty',
    15: 'Đã thanh toán',
    16: 'Ứng viên huỷ giữa chừng',
  },
  en: {
    1: 'Duplicate profile',
    2: 'Waiting for WS processing',
    3: 'Processing profile',
    4: 'Rejected by WS',
    5: 'Nominating to client',
    6: 'Rejected by client',
    7: 'Scheduling interview',
    8: 'Waiting for interview',
    9: 'Waiting for interview result',
    10: 'Failed interview',
    11: 'Has job offer (naitei)',
    12: 'Accepted job offer',
    13: 'Declined job offer',
    14: 'Joined company',
    15: 'Paid',
    16: 'Candidate withdrew',
  },
  ja: {
    1: '重複',
    2: 'WS書類審査待ち',
    3: '書類審査中',
    4: 'WS書類不合格',
    5: 'クライアントへ推薦中',
    6: 'クライアント書類不合格',
    7: '面接調整中',
    8: '面接待ち',
    9: '面接結果待ち',
    10: '面接不合格',
    11: '内定通知あり',
    12: '内定承諾',
    13: '内定辞退',
    14: '入社済み',
    15: '支払済み',
    16: '応募者辞退',
  },
};

/**
 * Lấy nhãn trạng thái đơn tiến cử theo ngôn ngữ
 * @param {number|string|null|undefined} status
 * @param {'vi'|'en'|'ja'} language
 */
export const getJobApplicationStatusLabelByLanguage = (status, language = 'vi') => {
  const num = status != null && status !== '' ? Number(status) : 2;
  const lang = language === 'en' || language === 'ja' ? language : 'vi';
  const labels = JOB_APPLICATION_STATUS_LABELS[lang];
  if (num < 1 || num > 16) return labels[2];
  return labels[num] || labels[2];
};

export const getJobApplicationStatusColor = (status) => {
  return getJobApplicationStatus(status).color;
};

/** Options cho select (value = số trạng thái 1–16, không dùng slug) */
export const getJobApplicationStatusOptions = () => {
  return Object.keys(JOB_APPLICATION_STATUS).map((status) => {
    const item = JOB_APPLICATION_STATUS[status];
    return {
      ...item,
      value: parseInt(status, 10),
      label: item.label
    };
  });
};

/** Options theo ngôn ngữ (label vi/en/ja) */
export const getJobApplicationStatusOptionsByLanguage = (language = 'vi') => {
  const lang = language === 'en' || language === 'ja' ? language : 'vi';
  const labels = JOB_APPLICATION_STATUS_LABELS[lang];
  return Object.keys(JOB_APPLICATION_STATUS).map((status) => {
    const num = parseInt(status, 10);
    const item = JOB_APPLICATION_STATUS[status];
    return {
      ...item,
      value: num,
      label: labels[num] || item.label
    };
  });
};

/** Kiểm tra trạng thái có phải từ chối/hủy không (cần nhập lý do) */
export const isRejectionOrCancelledStatus = (status) => {
  const info = getJobApplicationStatus(status);
  return info.category === 'rejected' || info.category === 'cancelled';
};

/**
 * @param {string} category - 'processing' | 'interview' | 'waiting' | 'success' | 'rejected' | 'cancelled'
 */
export const getJobApplicationStatusesByCategory = (category) => {
  return Object.keys(JOB_APPLICATION_STATUS)
    .filter((key) => JOB_APPLICATION_STATUS[key].category === category)
    .map((key) => ({
      value: parseInt(key, 10),
      ...JOB_APPLICATION_STATUS[key]
    }));
};

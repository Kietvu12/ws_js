/**
 * Đảm bảo base URL luôn kết thúc bằng /api (backend mount prefix).
 * Tránh 404 "Route not found" khi VITE_API_BASE_URL thiếu /api (vd: http://localhost:3000).
 */
function ensureApiSuffix(url) {
  if (!url || typeof url !== 'string') return url;
  const u = url.trim().replace(/\/+$/, '');
  return u.endsWith('/api') ? u : `${u}/api`;
}

/**
 * API base URL. Khi chạy qua HTTPS (VD: VS Code Dev Tunnels), trình duyệt chặn mixed content (HTTPS page gọi HTTP).
 * - Ưu tiên: VITE_API_BASE_URL (trong .env, không có khoảng trắng thừa trước tên biến)
 * - Nếu trang đang HTTPS mà env là http: hoặc chưa set: tự suy backend tunnel (đổi -5173 sang -3000 trong host)
 * - Còn lại: http://192.168.1.196:3000/api (dev local)
 * - Luôn chuẩn hóa để base kết thúc bằng /api (route backend là /api/admin/..., /api/ctv/...).
 */
function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (fromEnv && typeof fromEnv === 'string') {
    const url = fromEnv.trim().replace(/\/$/, '');
    if (url.startsWith('https')) return ensureApiSuffix(url);
    if (isHttps && url.startsWith('http:')) { /* mixed content, bỏ qua env, suy từ tunnel bên dưới */ }
    else if (url.startsWith('http')) return ensureApiSuffix(url);
  }
  if (isHttps && typeof window !== 'undefined') {
    const host = window.location.host;
    if (host.includes('-5173')) {
      const apiHost = host.replace(/-5173\b/, '-3000');
      return `${window.location.protocol}//${apiHost}/api`;
    }
  }
  const base = (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().startsWith('http'))
    ? fromEnv.trim().replace(/\/+$/, '')
    : 'http://192.168.1.196:3000';
  return ensureApiSuffix(base);
}
const API_BASE_URL = getApiBaseUrl();
const UPLOAD_LIMIT_MB = Number(import.meta.env.VITE_UPLOAD_LIMIT_MB || 40);

/** Tránh xử lý đăng xuất trùng khi nhiều request 401 song song */
let sessionExpiredHandling = false;

const SESSION_END_CODES = new Set([
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'ADMIN_NOT_FOUND',
  'COLLABORATOR_NOT_FOUND'
]);

function shouldEndAdminOrCtvSession(status, data) {
  if (status !== 401 || !data || typeof data !== 'object') return false;
  const code = data.code;
  if (code === 'NO_TOKEN') return false;
  if (code && SESSION_END_CODES.has(code)) return true;
  const m = String(data.message || '').toLowerCase();
  return /invalid or expired|token không hợp lệ|phiên đăng nhập đã hết hạn/.test(m);
}

/**
 * Đăng xuất phiên admin/CTV và báo UI (AuthSessionListener) về trang chủ.
 * @returns {boolean} true nếu đã xử lý (caller có thể bỏ qua hiển thị lỗi trùng)
 */
function tryNotifySessionExpired(status, data) {
  if (status !== 401) return false;
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');
  if (!token || (userType !== 'admin' && userType !== 'ctv')) return false;
  if (!shouldEndAdminOrCtvSession(status, data)) return false;
  if (sessionExpiredHandling) return true;
  sessionExpiredHandling = true;
  const message = data?.message || '';
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    window.dispatchEvent(new CustomEvent('app:session-expired', { detail: { message } }));
  } finally {
    window.setTimeout(() => {
      sessionExpiredHandling = false;
    }, 1500);
  }
  return true;
}

const getApplicantAuth = () => {
  try {
    const raw = localStorage.getItem('ungvienjs_auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
};

const getCurrentUserType = () => localStorage.getItem('userType') || '';

/** Base URL for AI matching (vector compare / reranking). Mặc định gọi thẳng server AI, không qua localhost. */
const AI_API_BASE_DEFAULT = 'https://ws-jobshare.com/api_ai';

/** Số kết quả match tối đa (query `top_k`). */
const DEFAULT_AI_MATCH_TOP_K = 20;

function getAiApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_AI_API_BASE_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, '');
  }
  return AI_API_BASE_DEFAULT;
}

function getAuthHeadersForMultipart() {
  const headers = getAuthHeaders();
  if (!headers) return {};
  const next = { ...headers };
  delete next['Content-Type'];
  delete next['content-type'];
  return next;
}

/** Tránh `new URLSearchParams({ x: undefined })` → `x=undefined` gây lỗi Sequelize DATEONLY. */
function buildQueryString(params) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && (v === '' || v === 'undefined' || v === 'null')) continue;
    out[k] = v;
  }
  return new URLSearchParams(out).toString();
}

async function handleAiJsonResponse(response) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    const error = new Error(response.status ? `HTTP ${response.status}: ${response.statusText}` : 'Phản hồi không hợp lệ');
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

/** Base URL for assets (no /api). Use for post images etc. */
export function getAssetBaseUrl() {
  const fromEnv = import.meta.env.VITE_ASSET_BASE_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, '');
  }
  return API_BASE_URL.replace(/\/api\/?$/, '') || '';
}

/**
 * Backend serve ảnh tại /uploads (express.static).
 * DB có thể lưu "posts/xxx.jpg" hoặc "/uploads/posts/xxx.jpg" → cần trỏ đúng /uploads/...
 */
function toUploadsPath(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return '';
  const p = imagePath.replace(/^\/+/, '');
  if (p.startsWith('uploads/') || p.startsWith('uploads\\')) return p.replace(/\\/g, '/');
  if (p.startsWith('posts/')) return 'uploads/' + p;
  if (p.startsWith('uploads')) return 'uploads/' + p.slice(7).replace(/^\/+/, '');
  return 'uploads/' + p;
}

/**
 * Giống backend `isS3Key`: DB lưu object key trên S3 (không phải file trong thư mục uploads/).
 * Ảnh hiển thị qua GET /api/media/s3-view → redirect presigned URL (bucket có thể private).
 */
function looksLikeStoredS3Key(imagePath) {
  const normalized = String(imagePath || '').replace(/^\/+/, '').trim();
  if (!normalized || normalized.startsWith('uploads/')) return false;
  const px = (typeof import.meta.env.VITE_AWS_S3_KEY_PREFIX === 'string'
    ? import.meta.env.VITE_AWS_S3_KEY_PREFIX
    : '').trim().replace(/^\/+|\/+$/g, '');
  return (
    /^posts\//.test(normalized) ||
    /^campaign\//.test(normalized) ||
    /^job-pickups\//.test(normalized) ||
    /^apply\//.test(normalized) ||
    /cvs\//.test(normalized) ||
    /jobs\//.test(normalized) ||
    /job_descriptions\//.test(normalized) ||
    /^jsshare\//.test(normalized) ||
    /^Collabborator\//.test(normalized) ||
    (px !== '' && normalized.startsWith(`${px}/`))
  );
}

/** Normalize post image path to full URL (S3 via /api/media/s3-view hoặc backend /uploads). */
export function normalizePostImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  const trimmed = imagePath.replace(/^\/+/, '');
  if (looksLikeStoredS3Key(trimmed)) {
    const base = API_BASE_URL.replace(/\/+$/, '');
    return `${base}/media/s3-view?key=${encodeURIComponent(trimmed)}`;
  }
  const path = toUploadsPath(imagePath);
  const base = getAssetBaseUrl();
  const slashPath = path.startsWith('/') ? path : '/' + path;
  return base ? `${base}${slashPath}` : slashPath;
}

/**
 * Get authorization header
 */
const getAuthHeaders = () => {
  const userType = getCurrentUserType();
  const token = userType === 'applicant'
    ? getApplicantAuth()?.token
    : localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

/** Chỉ Bearer — dùng cho FormData (không set Content-Type để browser gắn boundary multipart). */
const getMultipartAuthHeaders = () => {
  const userType = getCurrentUserType();
  const token = userType === 'applicant'
    ? getApplicantAuth()?.token
    : localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Chỉ Bearer agent (CTV) — dùng cho chat landing public để gắn phiên với CTV đã đăng ký */
const getOptionalCtvAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

/**
 * Handle API response.
 * Khi proxy (Nginx) trả 413, body thường là HTML → parse JSON sẽ lỗi. Đọc text trước, parse an toàn.
 */
const handleResponse = async (response) => {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Proxy trả HTML (vd: 413 Request Entity Too Large)
    if (response.status === 413) {
      const error = new Error(
        `Dung lượng request quá lớn (file/ảnh). Vui lòng giảm kích thước file hoặc nhờ quản trị viên cấu hình Nginx: client_max_body_size ${UPLOAD_LIMIT_MB}m;`
      );
      error.status = 413;
      error.data = { message: error.message };
      throw error;
    }
    const error = new Error(
      response.status ? `Lỗi ${response.status}: ${response.statusText}` : 'Phản hồi không hợp lệ'
    );
    error.status = response.status;
    error.data = {};
    throw error;
  }
  if (!response.ok) {
    const sessionEnded = tryNotifySessionExpired(response.status, data);
    const errorMessage = sessionEnded
      ? ''
      : (data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    if (sessionEnded) error.sessionExpired = true;
    throw error;
  }
  return data;
};

/**
 * API Service - Centralized API calls
 */
const apiService = {
  /**
   * Applicant Authentication
   */
  registerApplicant: async (data) => {
    const response = await fetch(`${API_BASE_URL}/applicant/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  loginApplicant: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/applicant/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  forgotPasswordApplicant: async (email) => {
    const response = await fetch(`${API_BASE_URL}/applicant/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(response);
  },

  resetPasswordApplicant: async (token, password) => {
    const response = await fetch(`${API_BASE_URL}/applicant/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    return handleResponse(response);
  },

  logoutApplicant: async (token) => {
    const response = await fetch(`${API_BASE_URL}/applicant/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return handleResponse(response);
  },

  /** Thông tin ứng viên đăng nhập — chỉ dùng token trong `ungvienjs_auth`, không lấy token CTV. */
  getApplicantMe: async () => {
    const applicantSession = getApplicantAuth();
    const t = applicantSession?.token;
    const response = await fetch(`${API_BASE_URL}/applicant/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    });
    return handleResponse(response);
  },

  /**
   * CTV Authentication
   */
  loginCTV: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/ctv/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  registerCTV: async (data) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/ctv/auth/register`, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? data : JSON.stringify(data)
    });
    return handleResponse(response);
  },

  forgotPasswordCTV: async (email) => {
    const response = await fetch(`${API_BASE_URL}/ctv/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(response);
  },

  resetPasswordCTV: async (token, password) => {
    const response = await fetch(`${API_BASE_URL}/ctv/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    return handleResponse(response);
  },

  forgotPasswordAdmin: async (email) => {
    const response = await fetch(`${API_BASE_URL}/admin/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(response);
  },

  resetPasswordAdmin: async (token, password) => {
    const response = await fetch(`${API_BASE_URL}/admin/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    return handleResponse(response);
  },

  verifyCTVEmail: async (token) => {
    const response = await fetch(`${API_BASE_URL}/ctv/auth/verify-email?token=${encodeURIComponent(token || '')}`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  getCTVProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateCTVProfile: async (data) => {
    const response = await fetch(`${API_BASE_URL}/ctv/auth/me`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  uploadCTVBusinessLicense: async (file) => {
    const formData = new FormData();
    formData.append('businessLicenseFile', file);
    const response = await fetch(`${API_BASE_URL}/ctv/auth/me/business-license`, {
      method: 'PUT',
      headers: getAuthHeadersForMultipart(),
      body: formData,
    });
    return handleResponse(response);
  },

  deleteCTVBusinessLicense: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/auth/me/business-license`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  logoutCTV: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin Authentication
   */
  loginAdmin: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  logoutAdmin: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Outlook OAuth – đồng bộ tài khoản Outlook (Microsoft)
   * Trả về URL để redirect: dùng khi user bấm "Kết nối Outlook" (token gửi qua query vì redirect không gửi header).
   */
  getOutlookConnectUrl: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return `${API_BASE_URL}/oauth/outlook/connect?token=${encodeURIComponent(token)}`;
  },

  getOutlookConnection: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/outlook/connection`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data?.data ?? { connection: null, connected: false };
  },

  /** Đăng xuất Outlook (ngắt kết nối, xóa connection và dữ liệu đã đồng bộ) */
  disconnectOutlook: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/outlook/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  syncOutlookEmails: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/outlook/sync`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getOutlookEmails: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/outlook/emails?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data?.data ?? { emails: [], total: 0, page: 1, limit: 20 };
  },

  getOutlookEmailById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/outlook/emails/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data?.data?.email ?? null;
  },

  /** Gửi email qua Outlook. Payload: { to, cc?, subject, body, bodyContentType?: 'Text'|'HTML' } */
  sendOutlookEmail: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/admin/outlook/send`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  /**
   * Admin Dashboard – thống kê tổng quan (CTV, Jobs, Ứng tuyển, Yêu cầu thanh toán)
   */
  getAdminDashboard: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** Thống kê jobs (hot jobs) cho dashboard */
  getJobStatistics: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/job-statistics?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** Đơn tiến cử thành công/thất bại theo tháng (biểu đồ line) */
  getAdminDashboardNominationOverTime: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_BASE_URL}/admin/dashboard/nomination-over-time?${queryString}`
      : `${API_BASE_URL}/admin/dashboard/nomination-over-time`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** Số lượng job có đơn tiến cử / không có đơn tiến cử theo tháng trong năm */
  getAdminDashboardJobNominationByMonth: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_BASE_URL}/admin/dashboard/job-nomination-by-month?${queryString}`
      : `${API_BASE_URL}/admin/dashboard/job-nomination-by-month`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** Số lượt đăng ký hệ thống theo ngày trong tháng (month = YYYY-MM, mặc định tháng hiện tại) */
  getAdminDashboardRegistrationsOverTime: async (month) => {
    const params = month ? { month } : {};
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_BASE_URL}/admin/dashboard/registrations-over-time?${queryString}`
      : `${API_BASE_URL}/admin/dashboard/registrations-over-time`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** Số lượt phê duyệt đăng ký (approved/pending/rejected) theo ngày trong tháng */
  getAdminDashboardApprovalsByDay: async (month) => {
    const params = month ? { month } : {};
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_BASE_URL}/admin/dashboard/approvals-by-day?${queryString}`
      : `${API_BASE_URL}/admin/dashboard/approvals-by-day`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin Management APIs
   */
  getAdmins: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/admins?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/admins/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createAdmin: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/admins`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateAdmin: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/admins/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteAdmin: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/admins/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Dashboard APIs (CTV)
   */
  getDashboard: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getDashboardChart: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/dashboard/chart?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * CV Statistics API (CTV)
   */
  getCVStatistics: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/statistics`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * CV Management APIs (CTV)
   */
  getCVStorages: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/cvs?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCVStorageById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** CTV gửi duyệt bổ sung — thông báo admin */
  submitCtvSupplementReview: async (cvId) => {
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/${cvId}/submit-supplement-review`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * @param {string} cvId
   * @param {string} fileType - 'curriculumVitae' | 'cvOriginalPath' | 'cvCareerHistoryPath' | 'otherDocuments'
   * @param {string} purpose - 'view' | 'download'
   * @param {{ template?: string, document?: string, index?: number }} [params] - for snapshot folder: template (Common|IT|Technical), document (rirekisho|shokumu), index (for CV gốc)
   */
  getCtvCVFileUrl: async (cvId, fileType = 'curriculumVitae', purpose = 'view', params = {}) => {
    const search = new URLSearchParams({ fileType, purpose });
    if (params.template != null) search.set('template', String(params.template));
    if (params.document != null) search.set('document', String(params.document));
    if (params.index != null) search.set('index', String(params.index));
    const response = await fetch(
      `${API_BASE_URL}/ctv/cvs/${cvId}/view-url?${search.toString()}`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    return data?.data?.url || null;
  },

  getCtvCVFileContent: async (cvStorageId, fileType = 'curriculumVitae', params = {}) => {
    const { data } = await apiService.getCtvCVFileContentWithType(cvStorageId, fileType, params);
    return data;
  },

  getCtvCVFileContentWithType: async (cvStorageId, fileType = 'curriculumVitae', params = {}) => {
    const search = new URLSearchParams({ fileType });
    if (params.template != null) search.set('template', String(params.template));
    if (params.document != null) search.set('document', String(params.document));
    if (params.index != null) search.set('index', String(params.index));
    const response = await fetch(
      `${API_BASE_URL}/ctv/cvs/${cvStorageId}/file-content?${search.toString()}`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || `HTTP ${response.status}`);
    }
    const data = await response.arrayBuffer();
    return { data, contentType: response.headers.get('content-type') || '' };
  },

  /**
   * List all CV files (originals + templates) with view/download URLs
   * @returns {Promise<{ originals: Array<{ index, name, viewUrl, downloadUrl }>, templates: Array<{ template, document, label, viewUrl, downloadUrl }> }>}
   */
  getCtvCVFileList: async (cvId) => {
    const response = await fetch(
      `${API_BASE_URL}/ctv/cvs/${cvId}/cv-file-list`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    return data?.data || { originals: [], templates: [] };
  },

  /** GET /api/applicant/cvs/:id/cv-file-list */
  getApplicantCVFileList: async (cvId) => {
    const applicantAuth = getApplicantAuth();
    const t = applicantAuth?.token;
    const response = await fetch(`${API_BASE_URL}/applicant/cvs/${cvId}/cv-file-list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(t && { Authorization: `Bearer ${t}` })
      }
    });
    const data = await handleResponse(response);
    return data?.data || { originals: [], templates: [] };
  },

  /**
   * @param {string} cvId
   * @param {string} fileType
   * @param {'view'|'download'} purpose
   * @param {{ template?: string, document?: string, index?: number }} [params]
   */
  getApplicantCVFileUrl: async (cvId, fileType = 'curriculumVitae', purpose = 'view', params = {}) => {
    const applicantAuth = getApplicantAuth();
    const t = applicantAuth?.token;
    const search = new URLSearchParams({ fileType, purpose });
    if (params.template != null) search.set('template', String(params.template));
    if (params.document != null) search.set('document', String(params.document));
    if (params.index != null) search.set('index', String(params.index));
    const response = await fetch(
      `${API_BASE_URL}/applicant/cvs/${cvId}/view-url?${search.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(t && { Authorization: `Bearer ${t}` })
        }
      }
    );
    const data = await handleResponse(response);
    return data?.data?.url || null;
  },

  getApplicantCVFileContent: async (cvStorageId, fileType = 'curriculumVitae', params = {}) => {
    const { data } = await apiService.getApplicantCVFileContentWithType(cvStorageId, fileType, params);
    return data;
  },

  getApplicantCVFileContentWithType: async (cvStorageId, fileType = 'curriculumVitae', params = {}) => {
    const applicantAuth = getApplicantAuth();
    const t = applicantAuth?.token;
    const search = new URLSearchParams({ fileType });
    if (params.template != null) search.set('template', String(params.template));
    if (params.document != null) search.set('document', String(params.document));
    if (params.index != null) search.set('index', String(params.index));
    const response = await fetch(
      `${API_BASE_URL}/applicant/cvs/${cvStorageId}/file-content?${search.toString()}`,
      {
        method: 'GET',
        headers: {
          ...(t && { Authorization: `Bearer ${t}` })
        }
      }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || `HTTP ${response.status}`);
    }
    const data = await response.arrayBuffer();
    return { data, contentType: response.headers.get('content-type') || '' };
  },

  /**
   * Download ZIP (Agent/CTV) via authenticated request.
   * @param {string|number} cvId
   * @param {'original'|'template'} scope
   * @param {'all'|'Common'|'IT'|'Technical'} template
   * @returns {Promise<{ blob: Blob, filename: string }>}
   */
  downloadCtvCVZip: async (cvId, scope = 'template', template = 'all', dateTime = null) => {
    const search = new URLSearchParams({ scope, template });
    if (dateTime) search.set('dateTime', String(dateTime));
    const response = await fetch(
      `${API_BASE_URL}/ctv/cvs/${cvId}/download-zip?${search.toString()}`,
      { method: 'GET', headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } }
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `HTTP ${response.status}`);
    }
    const cd = response.headers.get('content-disposition') || '';
    const m = cd.match(/filename\\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
    const filename = decodeURIComponent((m && (m[1] || m[2])) || `cv_${cvId}.zip`);
    const blob = await response.blob();
    return { blob, filename };
  },

  /** GET /api/applicant/cvs/:id/download-zip */
  downloadApplicantCVZip: async (cvId, scope = 'template', template = 'all', dateTime = null) => {
    const applicantAuth = getApplicantAuth();
    const t = applicantAuth?.token;
    const search = new URLSearchParams({ scope, template });
    if (dateTime) search.set('dateTime', String(dateTime));
    const response = await fetch(
      `${API_BASE_URL}/applicant/cvs/${cvId}/download-zip?${search.toString()}`,
      { method: 'GET', headers: { ...(t && { Authorization: `Bearer ${t}` }) } }
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `HTTP ${response.status}`);
    }
    const cd = response.headers.get('content-disposition') || '';
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const filename = decodeURIComponent((m && (m[1] || m[2])) || `cv_${cvId}.zip`);
    const blob = await response.blob();
    return { blob, filename };
  },

  getCtvCVSnapshots: async (cvId, params = {}) => {
    const search = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/ctv/cvs/${cvId}/snapshots${search ? `?${search}` : ''}`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    return data?.data?.snapshots || [];
  },

  rollbackCtvCV: async (cvId, srcDateTime) => {
    const response = await fetch(
      `${API_BASE_URL}/ctv/cvs/${cvId}/rollback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ srcDateTime: String(srcDateTime) })
      }
    );
    return handleResponse(response);
  },

  /**
   * Get nomination history for a candidate (by CV code or email)
   */
  getCandidateNominationHistory: async (cvCode, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/job-applications/candidates/${cvCode}/nomination-history?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Get recently updated CVs for replacement
   */
  getRecentUpdatedCVs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/recent?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createCVStorage: async (formData) => {
    const userType = getCurrentUserType();
    const isAdmin = userType === 'admin';
    const isCtv = userType === 'ctv';
    const applicantAuth = getApplicantAuth();
    const token = isAdmin || isCtv ? localStorage.getItem('token') : applicantAuth?.token;
    const endpoint = isAdmin
      ? `${API_BASE_URL}/admin/cvs`
      : (isCtv ? `${API_BASE_URL}/ctv/cvs` : `${API_BASE_URL}/applicant/cvs`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, browser will set it with boundary
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });
    return handleResponse(response);
  },

  updateCVStorage: async (id, formData) => {
    const userType = getCurrentUserType();
    const isAdmin = userType === 'admin';
    const endpoint = isAdmin ? `${API_BASE_URL}/admin/cvs/${id}` : `${API_BASE_URL}/ctv/cvs/${id}`;
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        // Don't set Content-Type for FormData, browser will set it with boundary
        ...((localStorage.getItem('token')) && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      },
      body: formData
    });
    return handleResponse(response);
  },

  markCTVReadyForParse: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/${id}/mark-ready-for-parse`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  deleteCVStorage: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  checkDuplicateCV: async (data) => {
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/check-duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  /**
   * Job Application APIs (CTV)
   */
  getJobApplications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/job-applications?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getJobApplicationById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/job-applications/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createJobApplication: async (formData) => {
    // Check if formData is FormData or regular object
    const isFormData = formData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/ctv/job-applications`, {
      method: 'POST',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? formData : JSON.stringify(formData)
    });
    const result = await handleResponse(response);

    // Fallback: nếu backend chưa tạo được tin nhắn mặc định thì frontend tự tạo 1 tin nhắn hệ thống.
    try {
      const createdJobApp = result?.data?.jobApplication;
      const jobApplicationId = createdJobApp?.id;
      if (jobApplicationId) {
        const messagesRes = await fetch(`${API_BASE_URL}/ctv/messages/job-application/${jobApplicationId}`, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        const messagesData = await handleResponse(messagesRes);
        const existingMessages = messagesData?.data?.messages || [];

        if (Array.isArray(existingMessages) && existingMessages.length === 0) {
          const candidateName = createdJobApp?.cv?.name || 'ứng viên';
          const jobTitle = createdJobApp?.job?.title || createdJobApp?.title || '';
          const introMessage = `Cảm ơn bạn đã tiến cử ${candidateName} tới job: ${jobTitle}`;
          await fetch(`${API_BASE_URL}/ctv/messages`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              jobApplicationId: parseInt(jobApplicationId, 10),
              content: introMessage,
              senderType: 3
            })
          }).then(handleResponse);
        }
      }
    } catch (err) {
      console.warn('[createJobApplication] Intro message fallback failed:', err?.message || err);
    }

    return result;
  },

  /**
   * Tạo CV mới rồi tạo đơn tiến cử (Agent modal) — luôn gửi cvId để backend join tên ứng viên.
   */
  createCVStorageAndNominate: async (formData) => {
    const createRes = await apiService.createCVStorage(formData);
    if (!createRes.success) return createRes;

    const cv = createRes.data?.cv;
    const dupInfo = createRes.data?.duplicateInfo;
    const isDup = !!(dupInfo?.isDuplicate || cv?.isDuplicate);

    const jobIdRaw = formData instanceof FormData ? formData.get('jobId') : null;
    const jobId =
      jobIdRaw != null && String(jobIdRaw).trim() !== ''
        ? parseInt(String(jobIdRaw), 10)
        : NaN;

    if (!cv || Number.isNaN(jobId)) {
      return {
        ...createRes,
        data: { ...(createRes.data || {}), isDuplicate: isDup }
      };
    }

    const nominateRes = await apiService.createJobApplication({
      jobId,
      cvId: cv.id,
      cvCode: cv.code || '',
      cvSource: 'original'
    });

    if (!nominateRes.success) {
      return {
        success: false,
        message: nominateRes.message || createRes.message,
        data: { ...(createRes.data || {}), isDuplicate: isDup }
      };
    }

    return {
      ...nominateRes,
      data: {
        ...(nominateRes.data || {}),
        isDuplicate: isDup
      }
    };
  },

  updateJobApplication: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/ctv/job-applications/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteJobApplication: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/job-applications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Dashboard Category Distribution API (CTV)
   * Phân bố đơn theo nhóm ngành nghề (jobCategory). Params: startDate, endDate (YYYY-MM-DD, optional).
   */
  getCategoryDistribution: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_BASE_URL}/ctv/dashboard/category-distribution?${queryString}`
      : `${API_BASE_URL}/ctv/dashboard/category-distribution`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Dashboard Offer/Rejection Stats API (CTV)
   * Params: type ('month'|'week'), startDate, endDate (YYYY-MM-DD, optional).
   */
  getOfferRejectionStats: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/dashboard/offer-rejection?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Schedule API (CTV)
   */
  getSchedule: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/calendars/schedule?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createCTVCalendar: async (calendarData) => {
    console.log('[API Service] createCTVCalendar called with:', calendarData);
    console.log('[API Service] API_BASE_URL:', API_BASE_URL);
    console.log('[API Service] URL:', `${API_BASE_URL}/ctv/calendars`);
    console.log('[API Service] Headers:', getAuthHeaders());
    
    try {
      const response = await fetch(`${API_BASE_URL}/ctv/calendars`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(calendarData)
      });
      console.log('[API Service] Fetch response received:', response.status, response.statusText);
      const result = await handleResponse(response);
      console.log('[API Service] handleResponse result:', result);
      return result;
    } catch (error) {
      console.error('[API Service] Error in createCTVCalendar:', error);
      throw error;
    }
  },

  /**
   * Job Pickups API (CTV)
   */
  getCTVJobPickups: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/job-pickups?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Campaigns API (CTV)
   */
  getCTVCampaigns: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/campaigns?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Posts API (CTV)
   */
  getCTVPosts: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/posts?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Public Posts API (no auth) - landing/news page
   */
  getPublicPosts: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const suffix = queryString ? `?${queryString}` : '';
    const response = await fetch(`${API_BASE_URL}/public/posts${suffix}`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  getPublicPostCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/public/post-categories`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  getPublicPostById: async (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const suffix = queryString ? `?${queryString}` : '';
    const response = await fetch(`${API_BASE_URL}/public/posts/${id}${suffix}`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  registerPublicEvent: async (eventId, body) => {
    const response = await fetch(`${API_BASE_URL}/public/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  /**
   * Jobs API (CTV)
   */
  getApplicantJobs: async (params = {}) => {
    const queryString = buildQueryString(params);
    const suffix = queryString ? `?${queryString}` : '';
    const response = await fetch(`${API_BASE_URL}/applicant/jobs${suffix}`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  getApplicantJobById: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/applicant/jobs/${jobId}`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  getApplicantJobFileUrl: async (jobId, fileType = 'jdFile', purpose = 'view') => {
    const response = await fetch(
      `${API_BASE_URL}/applicant/jobs/${jobId}/view-url?fileType=${encodeURIComponent(fileType)}&purpose=${encodeURIComponent(purpose)}`,
      { method: 'GET' }
    );
    const data = await handleResponse(response);
    return data?.data?.url || null;
  },

  createApplicantJobApplication: async (data) => {
    const response = await fetch(`${API_BASE_URL}/applicant/job-applications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  getApplicantJobApplications: async (params = {}) => {
    const queryString = buildQueryString(params);
    const suffix = queryString ? `?${queryString}` : '';
    const response = await fetch(`${API_BASE_URL}/applicant/job-applications${suffix}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getApplicantJobApplicationById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/applicant/job-applications/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getApplicantMessagesByJobApplication: async (jobApplicationId) => {
    const applicantSession = getApplicantAuth();
    const token = applicantSession?.token;
    const response = await fetch(
      `${API_BASE_URL}/applicant/messages/job-application/${encodeURIComponent(jobApplicationId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );
    return handleResponse(response);
  },

  createApplicantMessage: async (messageData) => {
    const applicantSession = getApplicantAuth();
    const token = applicantSession?.token;
    const isFormData = messageData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/applicant/messages`, {
      method: 'POST',
      headers: isFormData
        ? { ...(token && { Authorization: `Bearer ${token}` }) }
        : {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
      body: isFormData ? messageData : JSON.stringify({ ...messageData, senderType: 4 }),
    });
    return handleResponse(response);
  },

  getApplicantMyCVs: async () => {
    const applicantSession = getApplicantAuth();
    const t = applicantSession?.token;
    const response = await fetch(`${API_BASE_URL}/applicant/cvs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(t && { Authorization: `Bearer ${t}` })
      }
    });
    return handleResponse(response);
  },

  getApplicantMyCVById: async (id) => {
    const applicantSession = getApplicantAuth();
    const t = applicantSession?.token;
    const response = await fetch(`${API_BASE_URL}/applicant/cvs/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(t && { Authorization: `Bearer ${t}` })
      }
    });
    return handleResponse(response);
  },

  createApplicantMyCV: async (body) => {
    const applicantSession = getApplicantAuth();
    const t = applicantSession?.token;
    const response = await fetch(`${API_BASE_URL}/applicant/cvs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(t && { Authorization: `Bearer ${t}` })
      },
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  getCTVJobs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/jobs?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Get jobs by campaign ID (CTV)
   */
  getCTVJobsByCampaign: async (campaignId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/jobs/by-campaign/${campaignId}?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Get jobs by job pickup ID (CTV)
   */
  getCTVJobsByJobPickup: async (jobPickupId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/jobs/by-job-pickup/${jobPickupId}?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Get job by ID (CTV)
   */
  getJobById: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/ctv/jobs/${jobId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCtvJobFileUrl: async (jobId, fileType = 'jdFile', purpose = 'view') => {
    const response = await fetch(
      `${API_BASE_URL}/ctv/jobs/${jobId}/view-url?fileType=${encodeURIComponent(fileType)}&purpose=${encodeURIComponent(purpose)}`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    return data?.data?.url || null;
  },

  /**
   * Get job categories (CTV)
   * Can be used to get parent categories (parentId: null) or children (parentId: number)
   */
  getCTVJobCategories: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/job-categories?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Get job category tree (CTV)
   * Returns hierarchical tree structure of all categories
   */
  getCTVJobCategoryTree: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/job-categories/tree`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Get job category children (CTV)
   * Get children categories of a specific parent category
   */
  getJobCategoryChildren: async (parentId, params = {}) => {
    const queryParams = { ...params, parentId };
    const queryString = new URLSearchParams(queryParams).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/job-categories?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * CTV Search History
   */
  getCTVSearchHistory: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/search-history?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  saveCTVSearchHistory: async (body) => {
    const response = await fetch(`${API_BASE_URL}/ctv/search-history`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  clearCTVSearchHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/search-history`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  deleteCTVSearchHistoryItem: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/search-history/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * CTV Saved Search Criteria (tiêu chí tìm kiếm đã lưu)
   */
  getSavedSearchCriteria: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/saved-search-criteria?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  getSavedSearchCriteriaById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-search-criteria/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  createSavedSearchCriteria: async (body) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-search-criteria`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  updateSavedSearchCriteria: async (id, body) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-search-criteria/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  deleteSavedSearchCriteria: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-search-criteria/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * CTV Saved Lists (playlist / danh sách lưu giữ)
   */
  getSavedLists: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  getSavedListById: async (listId) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists/${listId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  createSavedList: async (body) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  updateSavedList: async (listId, body) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists/${listId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  deleteSavedList: async (listId) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists/${listId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  getSavedListJobs: async (listId) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists/${listId}/jobs`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  addJobToSavedList: async (listId, body) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists/${listId}/jobs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  removeJobFromSavedList: async (listId, jobId) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists/${listId}/jobs/${jobId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  reorderSavedListJobs: async (listId, jobIds) => {
    const response = await fetch(`${API_BASE_URL}/ctv/saved-lists/${listId}/jobs/reorder`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ jobIds })
    });
    return handleResponse(response);
  },

  /**
   * Admin Job Management APIs
   */
  getAdminJobs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/jobs?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminJobById: async (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminJobEditData: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}/edit-data`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminJobFileUrl: async (jobId, fileType = 'jdFile', purpose = 'view') => {
    const response = await fetch(
      `${API_BASE_URL}/admin/jobs/${jobId}/view-url?fileType=${encodeURIComponent(fileType)}&purpose=${encodeURIComponent(purpose)}`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    return data?.data?.url || null;
  },

  /**
   * Preview JD template PDF (A4) from form payload (không lưu DB)
   * POST /api/admin/jobs/preview-jd-pdf
   */
  previewAdminJobJdPdf: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/admin/jobs/preview-jd-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      },
      body: JSON.stringify(payload || {})
    });
    const ct = response.headers.get('content-type') || '';
    if (response.ok && ct.includes('application/pdf')) {
      const blob = await response.blob();
      return { ok: true, status: response.status, blob, message: '' };
    }
    let message = '';
    try {
      if (ct.includes('application/json')) {
        const j = await response.json();
        message = j.message || '';
      }
    } catch (_) { /* ignore */ }
    return { ok: false, status: response.status, blob: null, message };
  },

  createAdminJob: async (formData) => {
    const isFormData = formData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/jobs`, {
      method: 'POST',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? formData : JSON.stringify(formData)
    });
    return handleResponse(response);
  },

  updateAdminJob: async (id, formData) => {
    const isFormData = formData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}`, {
      method: 'PUT',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? formData : JSON.stringify(formData)
    });
    return handleResponse(response);
  },

  deleteAdminJob: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  toggleJobPinned: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}/toggle-pinned`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  toggleJobHot: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}/toggle-hot`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateJobStatus: async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/admin/jobs/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(response);
  },

  /**
   * Admin Company APIs
   */
  getCompanies: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/companies?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCompanyById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/companies/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createCompany: async (data) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/companies`, {
      method: 'POST',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? data : JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateCompany: async (id, data) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/companies/${id}`, {
      method: 'PUT',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? data : JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteCompany: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/companies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  toggleCompanyStatus: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/companies/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin Post APIs (bài viết)
   */
  getAdminPosts: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/posts?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminPostById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/posts/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createAdminPost: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateAdminPost: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/posts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteAdminPost: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/posts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateAdminPostStatus: async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/admin/posts/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(response);
  },

  /**
   * Admin Post Categories (danh mục bài viết - table categories)
   */
  getPostCategories: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/categories?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPostCategoriesAll: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/categories/all`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Upload post image (when post already exists). S3: posts/{id}/
   */
  uploadPostImage: async (postId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/admin/posts/${postId}/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    return handleResponse(response);
  },

  /**
   * Upload post image temp (when creating new post, no id yet). S3: posts/temp/
   */
  uploadPostTempImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/admin/posts/upload-temp`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    return handleResponse(response);
  },

  /**
   * Upload thumbnail cho bài viết (đã có id). S3: posts/{id}/thumb_*
   * Trả về { url, key }: lưu key vào DB, url dùng để preview.
   */
  uploadPostThumbnail: async (postId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/admin/posts/${postId}/upload-thumbnail`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    return handleResponse(response);
  },

  /**
   * Upload thumbnail tạm (khi tạo bài viết mới chưa có id). S3: posts/temp/thumb_*
   */
  uploadPostTempThumbnail: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/admin/posts/upload-thumbnail-temp`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    return handleResponse(response);
  },

  /**
   * Admin Job Category APIs
   */
  getJobCategories: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/job-categories?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getJobCategoryTree: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `${API_BASE_URL}/admin/job-categories/tree?${qs}` : `${API_BASE_URL}/admin/job-categories/tree`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getJobCategoryById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-categories/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createJobCategory: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateJobCategory: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteJobCategory: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin Job Pick-up (job_pickups, job_pickups_id)
   */
  getAdminJobPickups: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  getAdminJobPickupById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  createAdminJobPickup: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  updateAdminJobPickup: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  deleteAdminJobPickup: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  getAdminJobPickupJobs: async (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups/${id}/jobs?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  addJobToAdminJobPickup: async (pickupId, jobId) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups/${pickupId}/jobs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ jobId })
    });
    return handleResponse(response);
  },

  addJobsToAdminJobPickup: async (pickupId, jobIds) => {
    const ids = (Array.isArray(jobIds) ? jobIds : [])
      .map((x) => parseInt(String(x), 10))
      .filter((n) => !Number.isNaN(n) && n >= 1);
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups/${pickupId}/jobs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ jobIds: ids })
    });
    return handleResponse(response);
  },
  removeJobFromAdminJobPickup: async (pickupId, jobId) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups/${pickupId}/jobs/${jobId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  uploadAdminJobPickupCover: async (pickupId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/admin/job-pickups/${pickupId}/upload-cover`, {
      method: 'POST',
      headers: getMultipartAuthHeaders(),
      body: formData
    });
    return handleResponse(response);
  },

  /**
   * Admin Type & Value APIs (for job_values)
   */
  getTypes: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/types?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAllTypes: async (includeValues = false) => {
    const queryString = new URLSearchParams({ includeValues: includeValues ? 'true' : 'false' }).toString();
    const response = await fetch(`${API_BASE_URL}/admin/types/all?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getValues: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/values?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getValuesByType: async (typeId) => {
    const response = await fetch(`${API_BASE_URL}/admin/values/by-type/${typeId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createType: async (typeData) => {
    const response = await fetch(`${API_BASE_URL}/admin/types`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(typeData)
    });
    return handleResponse(response);
  },

  createValue: async (valueData) => {
    const response = await fetch(`${API_BASE_URL}/admin/values`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(valueData)
    });
    return handleResponse(response);
  },

  updateType: async (typeId, typeData) => {
    const response = await fetch(`${API_BASE_URL}/admin/types/${typeId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(typeData)
    });
    return handleResponse(response);
  },

  deleteType: async (typeId) => {
    const response = await fetch(`${API_BASE_URL}/admin/types/${typeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateValue: async (valueId, valueData) => {
    const response = await fetch(`${API_BASE_URL}/admin/values/${valueId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(valueData)
    });
    return handleResponse(response);
  },

  deleteValue: async (valueId) => {
    const response = await fetch(`${API_BASE_URL}/admin/values/${valueId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin CV (Candidate) APIs
   */
  getAdminCVs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/cvs?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminCVById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  patchAdminCVSupplementMarks: async (id, marks) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/${id}/supplement-marks`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ marks })
    });
    return handleResponse(response);
  },

  sendAdminCVSupplementRequest: async (id, marks) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/${id}/supplement-marks/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ marks })
    });
    return handleResponse(response);
  },

  createAdminCV: async (formData) => {
    const isFormData = formData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/cvs`, {
      method: 'POST',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? formData : JSON.stringify(formData)
    });
    return handleResponse(response);
  },

  /** FormData: excelFile (.xlsx), cvZip (.zip, tùy chọn), collaboratorId (string, tùy chọn) */
  bulkImportAdminCVs: async (formData) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/bulk-import`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      },
      body: formData
    });
    return handleResponse(response);
  },

  /** Cùng FormData như bulkImportAdminCVs — trả về bySheet / sheetOrder (không tạo CV) */
  bulkImportAdminCVsPreview: async (formData) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/bulk-import/preview`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      },
      body: formData
    });
    return handleResponse(response);
  },

  previewAdminCVTemplate: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, html: text };
  },

  /** Preview CV PDF — cùng pipeline với PDF lưu S3 (khớp tải về) */
  previewAdminCVTemplatePdf: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/preview-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` })
      },
      body: JSON.stringify(payload)
    });
    const ct = response.headers.get('content-type') || '';
    if (response.ok && ct.includes('application/pdf')) {
      const blob = await response.blob();
      return { ok: true, status: response.status, blob, message: '' };
    }
    let message = '';
    try {
      if (ct.includes('application/json')) {
        const j = await response.json();
        message = j.message || '';
      }
    } catch (_) { /* ignore */ }
    return { ok: false, status: response.status, blob: null, message };
  },

  /** Preview CV template (CTV khi tạo/sửa UV) – cùng payload với admin */
  previewCTVCVTemplate: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, html: text };
  },

  previewCTVCVTemplatePdf: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/ctv/cvs/preview-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const ct = response.headers.get('content-type') || '';
    if (response.ok && ct.includes('application/pdf')) {
      const blob = await response.blob();
      return { ok: true, status: response.status, blob, message: '' };
    }
    let message = '';
    try {
      if (ct.includes('application/json')) {
        const j = await response.json();
        message = j.message || '';
      }
    } catch (_) { /* ignore */ }
    return { ok: false, status: response.status, blob: null, message };
  },

  previewApplicantCVTemplate: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/applicant/cvs/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, html: text };
  },

  previewApplicantCVTemplatePdf: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/applicant/cvs/preview-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const ct = response.headers.get('content-type') || '';
    if (response.ok && ct.includes('application/pdf')) {
      const blob = await response.blob();
      return { ok: true, status: response.status, blob, message: '' };
    }
    let message = '';
    try {
      if (ct.includes('application/json')) {
        const j = await response.json();
        message = j.message || '';
      }
    } catch (_) { /* ignore */ }
    return { ok: false, status: response.status, blob: null, message };
  },

  updateAdminCV: async (id, formData) => {
    const isFormData = formData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/cvs/${id}`, {
      method: 'PUT',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? formData : JSON.stringify(formData)
    });
    return handleResponse(response);
  },

  deleteAdminCV: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminCVHistory: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/cvs/${id}/history`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Auto-parse CVs (AI) - background worker start/stop
   */
  startAutoParseCVs: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/cv-auto-parse/start`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  stopAutoParseCVs: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/cv-auto-parse/stop`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Lấy URL để xem hoặc tải file CV (signed URL nếu S3, URL tĩnh nếu local)
   * @param {string} cvStorageId - id cv_storages
   * @param {string} fileType - 'curriculumVitae' | 'cvOriginalPath' | 'cvCareerHistoryPath' | 'otherDocuments'
   * @param {string} purpose - 'view' | 'download'
   * @param {{ template?: string, document?: string, index?: number }} [params] - for snapshot: template (Common|IT|Technical), document (rirekisho|shokumu), index (CV gốc)
   */
  getAdminCVFileUrl: async (cvStorageId, fileType = 'curriculumVitae', purpose = 'view', params = {}) => {
    const search = new URLSearchParams({ fileType, purpose });
    if (params.template != null) search.set('template', String(params.template));
    if (params.document != null) search.set('document', String(params.document));
    if (params.index != null) search.set('index', String(params.index));
    const response = await fetch(
      `${API_BASE_URL}/admin/cv-storages/${cvStorageId}/view-url?${search.toString()}`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    return data?.data?.url || null;
  },

  /**
   * Lấy nội dung file qua proxy (có auth) để preview DOCX/DOC/XLSX tránh CORS.
   * @param {string|number} cvStorageId
   * @param {string} fileType - 'curriculumVitae' | 'cvOriginalPath' | 'cvCareerHistoryPath' | 'otherDocuments'
   * @param {{ template?: string, document?: string, index?: number }} [params]
   * @returns {Promise<ArrayBuffer>}
   */
  getAdminCVFileContent: async (cvStorageId, fileType = 'curriculumVitae', params = {}) => {
    const { data } = await apiService.getAdminCVFileContentWithType(cvStorageId, fileType, params);
    return data;
  },

  getAdminCVFileContentWithType: async (cvStorageId, fileType = 'curriculumVitae', params = {}) => {
    const search = new URLSearchParams({ fileType });
    if (params.template != null) search.set('template', String(params.template));
    if (params.document != null) search.set('document', String(params.document));
    if (params.index != null) search.set('index', String(params.index));
    const response = await fetch(
      `${API_BASE_URL}/admin/cv-storages/${cvStorageId}/file-content?${search.toString()}`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || `HTTP ${response.status}`);
    }
    const data = await response.arrayBuffer();
    return { data, contentType: response.headers.get('content-type') || '' };
  },

  /**
   * List all CV files (originals + templates) with view/download URLs
   * @returns {Promise<{ originals: Array<{ index, name, viewUrl, downloadUrl }>, templates: Array<{ template, document, label, viewUrl, downloadUrl }> }>}
   */
  getAdminCVFileList: async (cvStorageId) => {
    const response = await fetch(
      `${API_BASE_URL}/admin/cv-storages/${cvStorageId}/cv-file-list`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    return data?.data || { originals: [], templates: [] };
  },

  /**
   * Download ZIP (Admin) via authenticated request.
   * @param {string|number} cvStorageId
   * @param {'original'|'template'} scope
   * @param {'all'|'Common'|'IT'|'Technical'} template
   * @returns {Promise<{ blob: Blob, filename: string }>}
   */
  downloadAdminCVZip: async (cvStorageId, scope = 'template', template = 'all', dateTime = null) => {
    const search = new URLSearchParams({ scope, template });
    if (dateTime) search.set('dateTime', String(dateTime));
    const response = await fetch(
      `${API_BASE_URL}/admin/cv-storages/${cvStorageId}/download-zip?${search.toString()}`,
      { method: 'GET', headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } }
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `HTTP ${response.status}`);
    }
    const cd = response.headers.get('content-disposition') || '';
    const m = cd.match(/filename\\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
    const filename = decodeURIComponent((m && (m[1] || m[2])) || `cv_${cvStorageId}.zip`);
    const blob = await response.blob();
    return { blob, filename };
  },

  getAdminCVSnapshots: async (cvStorageId, params = {}) => {
    const search = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/admin/cv-storages/${cvStorageId}/snapshots${search ? `?${search}` : ''}`,
      { method: 'GET', headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    return data?.data?.snapshots || [];
  },

  rollbackAdminCV: async (cvStorageId, srcDateTime) => {
    const response = await fetch(
      `${API_BASE_URL}/admin/cv-storages/${cvStorageId}/rollback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ srcDateTime: String(srcDateTime) })
      }
    );
    return handleResponse(response);
  },

  /**
   * Admin Job Application (Nomination) APIs
   */
  getAdminJobApplications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/job-applications?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminJobApplicationById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-applications/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createAdminJobApplication: async (formData) => {
    const isFormData = formData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/job-applications`, {
      method: 'POST',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? formData : JSON.stringify(formData)
    });
    return handleResponse(response);
  },

  updateAdminJobApplication: async (id, formData) => {
    const isFormData = formData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/job-applications/${id}`, {
      method: 'PUT',
      headers: isFormData 
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? formData : JSON.stringify(formData)
    });
    return handleResponse(response);
  },

  deleteAdminJobApplication: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-applications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  bulkDeleteAdminDuplicateCvNominations: async () => {
    const response = await fetch(
      `${API_BASE_URL}/admin/job-applications/bulk-delete-duplicate-cv-nominations`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({})
      }
    );
    return handleResponse(response);
  },

  updateJobApplicationStatus: async (id, status, rejectNote = null, paymentAmount = null, forceClearRejectNote = false) => {
    const statusNum = typeof status === 'number' ? status : parseInt(status, 10);
    const body = { status: statusNum };
    if (forceClearRejectNote) {
      body.rejectNote = '';
    } else if (rejectNote !== undefined && rejectNote !== null && String(rejectNote).trim() !== '') {
      body.rejectNote = String(rejectNote).trim();
    }
    if (paymentAmount !== undefined && paymentAmount !== null && paymentAmount !== '') {
      const amount = typeof paymentAmount === 'number' ? paymentAmount : parseFloat(paymentAmount);
      if (!Number.isNaN(amount)) {
        body.paymentAmount = amount;
      }
    }
    const response = await fetch(`${API_BASE_URL}/admin/job-applications/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  /**
   * Admin Job Application Memos
   */
  getAdminJobApplicationMemos: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-applications/${id}/memos`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createAdminJobApplicationMemo: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-applications/${id}/memos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateAdminJobApplicationMemo: async (id, memoId, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-applications/${id}/memos/${memoId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteAdminJobApplicationMemo: async (id, memoId) => {
    const response = await fetch(`${API_BASE_URL}/admin/job-applications/${id}/memos/${memoId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin Collaborator APIs
   */
  getCollaborators: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/collaborators?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCollaboratorById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborators/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** Danh sách cấp rank (dropdown quản trị) */
  getCollaboratorRankLevels: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborators/rank-levels`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateCollaborator: async (id, data) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/collaborators/${id}`, {
      method: 'PUT',
      headers: isFormData ? getAuthHeadersForMultipart() : getAuthHeaders(),
      body: isFormData ? data : JSON.stringify(data)
    });
    return handleResponse(response);
  },

  createCollaborator: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborators`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteCollaborator: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborators/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  approveCollaborator: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborators/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  approveCollaboratorsBulk: async (ids) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborators/approve-bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids })
    });
    return handleResponse(response);
  },

  rejectCollaborator: async (id, reason) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborators/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(typeof reason === 'string' ? { reason } : {})
    });
    return handleResponse(response);
  },

  /**
   * Admin Campaign APIs
   */
  getAdminCampaigns: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/campaigns?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminCampaignById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createAdminCampaign: async (campaignData) => {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(campaignData)
    });
    return handleResponse(response);
  },

  updateAdminCampaign: async (id, campaignData) => {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(campaignData)
    });
    return handleResponse(response);
  },

  deleteAdminCampaign: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateCampaignStatus: async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(response);
  },

  uploadAdminCampaignCover: async (campaignId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/admin/campaigns/${campaignId}/upload-cover`, {
      method: 'POST',
      headers: getMultipartAuthHeaders(),
      body: formData
    });
    return handleResponse(response);
  },

  /**
   * Admin Event APIs
   */
  getAdminEvents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/events?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminEventById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/events/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createAdminEvent: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateAdminEvent: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteAdminEvent: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * CTV Event APIs
   */
  getCTVEvents: async (params = {}) => {
    const clean = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      clean[k] = typeof v === 'number' ? String(v) : v;
    }
    const queryString = new URLSearchParams(clean).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/events?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    return handleResponse(response);
  },

  getCTVEventById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/events/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  registerCTVEvent: async (eventId, payload) => {
    const response = await fetch(`${API_BASE_URL}/ctv/events/${eventId}/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload || {})
    });
    return handleResponse(response);
  },

  /**
   * Admin Message APIs
   */
  getAdminMessages: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/messages?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminMessagesByJobApplication: async (jobApplicationId) => {
    const response = await fetch(`${API_BASE_URL}/admin/messages/job-application/${jobApplicationId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminUnreadMessageCount: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/messages/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const res = await handleResponse(response);
    return res?.data?.count ?? 0;
  },

  getAdminUnreadByJobApplication: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/messages/unread-by-application`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const res = await handleResponse(response);
    return res?.data?.unreadByJobApplication ?? {};
  },

  createAdminMessage: async (messageData) => {
    const isFormData = messageData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/admin/messages`, {
      method: 'POST',
      headers: isFormData
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? messageData : JSON.stringify(messageData)
    });
    return handleResponse(response);
  },

  deleteAdminMessage: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/messages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  markMessageReadByAdmin: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/messages/${id}/mark-read-admin`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  markAllMessagesReadByAdmin: async (jobApplicationId) => {
    const response = await fetch(`${API_BASE_URL}/admin/messages/job-application/${jobApplicationId}/mark-all-read-admin`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin Calendar APIs
   */
  getAdminCalendars: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/calendars?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createAdminCalendar: async (calendarData) => {
    console.log('[API Service] createAdminCalendar called with:', calendarData);
    console.log('[API Service] API_BASE_URL:', API_BASE_URL);
    console.log('[API Service] URL:', `${API_BASE_URL}/admin/calendars`);
    console.log('[API Service] Headers:', getAuthHeaders());
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/calendars`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(calendarData)
      });
      console.log('[API Service] Fetch response received:', response.status, response.statusText);
      const result = await handleResponse(response);
      console.log('[API Service] handleResponse result:', result);
      return result;
    } catch (error) {
      console.error('[API Service] Error in createAdminCalendar:', error);
      throw error;
    }
  },

  updateAdminCalendar: async (id, calendarData) => {
    const response = await fetch(`${API_BASE_URL}/admin/calendars/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(calendarData)
    });
    return handleResponse(response);
  },

  deleteAdminCalendar: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/calendars/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * CTV Message APIs
   */
  getCTVMessagesByJobApplication: async (jobApplicationId) => {
    const response = await fetch(`${API_BASE_URL}/ctv/messages/job-application/${jobApplicationId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCTVUnreadMessageCount: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/messages/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const res = await handleResponse(response);
    return res?.data?.count ?? 0;
  },

  getCTVUnreadByJobApplication: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/messages/unread-by-application`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const res = await handleResponse(response);
    return res?.data?.unreadByJobApplication ?? {};
  },

  getCTVAdminsForMessage: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/messages/admins?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createCTVMessage: async (messageData) => {
    const isFormData = messageData instanceof FormData;
    const response = await fetch(`${API_BASE_URL}/ctv/messages`, {
      method: 'POST',
      headers: isFormData
        ? { ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }) }
        : getAuthHeaders(),
      body: isFormData ? messageData : JSON.stringify(messageData)
    });
    return handleResponse(response);
  },

  deleteCTVMessage: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/messages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  markCTVMessageRead: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/messages/${id}/mark-read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  markAllCTVMessagesRead: async (jobApplicationId) => {
    const response = await fetch(`${API_BASE_URL}/ctv/messages/job-application/${jobApplicationId}/mark-all-read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * CTV Notifications APIs
   */
  getCTVNotifications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const suffix = queryString ? `?${queryString}` : '';
    const response = await fetch(`${API_BASE_URL}/ctv/notifications${suffix}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCTVNotificationUnreadCount: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/notifications/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const res = await handleResponse(response);
    return res?.data?.count ?? 0;
  },

  markCTVNotificationRead: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  markAllCTVNotificationsRead: async () => {
    const response = await fetch(`${API_BASE_URL}/ctv/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Stream notifications (SSE-like)
   * Lưu ý: không dùng handleResponse vì cần đọc response body dạng stream.
   */
  streamCTVNotifications: async () => {
    return fetch(`${API_BASE_URL}/ctv/notifications/stream`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  /** Admin notifications (cùng bảng collaborator_notifications, lọc admin_id) */
  getAdminNotifications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const suffix = queryString ? `?${queryString}` : '';
    const response = await fetch(`${API_BASE_URL}/admin/notifications${suffix}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminNotificationUnreadCount: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/notifications/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const res = await handleResponse(response);
    return res?.data?.count ?? 0;
  },

  markAdminNotificationRead: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  markAllAdminNotificationsRead: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  streamAdminNotifications: async () => {
    return fetch(`${API_BASE_URL}/admin/notifications/stream`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  /**
   * CTV Payment Request APIs
   */
  getPaymentRequests: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ctv/payment-requests?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPaymentRequestById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/payment-requests/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createPaymentRequest: async (formData) => {
    const response = await fetch(`${API_BASE_URL}/ctv/payment-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    return handleResponse(response);
  },

  updatePaymentRequest: async (id, formData) => {
    const response = await fetch(`${API_BASE_URL}/ctv/payment-requests/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    return handleResponse(response);
  },

  deletePaymentRequest: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ctv/payment-requests/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin Payment Request APIs
   */
  getAdminPaymentRequests: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/payment-requests?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAdminPaymentRequestById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/payment-requests/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  approvePaymentRequest: async (id, note, amount) => {
    const body = { note };
    if (amount != null && !Number.isNaN(parseFloat(amount))) {
      body.amount = parseFloat(amount);
    }
    const response = await fetch(`${API_BASE_URL}/admin/payment-requests/${id}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  rejectPaymentRequest: async (id, rejectedReason, note) => {
    const response = await fetch(`${API_BASE_URL}/admin/payment-requests/${id}/reject`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rejectedReason, note })
    });
    return handleResponse(response);
  },

  markPaymentRequestAsPaid: async (id, note, amount) => {
    const body = { note };
    if (amount != null && !Number.isNaN(parseFloat(amount))) {
      body.amount = parseFloat(amount);
    }
    const response = await fetch(`${API_BASE_URL}/admin/payment-requests/${id}/mark-paid`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  updateAdminPaymentRequest: async (id, updateData) => {
    const response = await fetch(`${API_BASE_URL}/admin/payment-requests/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(response);
  },

  deleteAdminPaymentRequest: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/payment-requests/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Admin Collaborator Assignment APIs
   */
  getCollaboratorAssignments: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** Danh sách hồ sơ ứng viên (cv_storages) chưa được giao cho AdminBackOffice */
  getUnassignedCvStorages: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments/unassigned?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getMyAssignedCollaborators: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments/my-assigned?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCollaboratorAssignmentById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /** data: { cvStorageId, adminId, notes? } */
  createCollaboratorAssignment: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  /** data: { cvStorageIds, adminId, notes? } */
  bulkAssignCollaborators: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateCollaboratorAssignment: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteCollaboratorAssignment: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCollaboratorAssignmentHistory: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments/history?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCollaboratorAssignmentStatistics: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/collaborator-assignments/statistics?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Group Management APIs
   */
  getGroups: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/groups?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAllGroups: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/all`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getGroupById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createGroup: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/groups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateGroup: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteGroup: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  assignAdminToGroup: async (groupId, adminId) => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/${groupId}/assign-admin`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ adminId })
    });
    return handleResponse(response);
  },

  bulkAssignAdminsToGroup: async (groupId, adminIds) => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/${groupId}/bulk-assign-admins`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ adminIds })
    });
    return handleResponse(response);
  },

  removeAdminFromGroup: async (groupId, adminId) => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/${groupId}/remove-admin`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ adminId })
    });
    return handleResponse(response);
  },

  getGroupStatistics: async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/${id}/statistics`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getGroupHistory: async (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/groups/${id}/history?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getMyGroup: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/my-group`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getMyGroupStatistics: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/groups/my-group/statistics`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Reports API
   */
  getNominationEffectiveness: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/reports/nomination-effectiveness?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPlatformEffectiveness: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/reports/platform-effectiveness?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getHREffectiveness: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/reports/hr-effectiveness?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getMyPerformance: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/reports/my-performance?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getReportsOverview: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/reports/overview?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getReportsTopCollaborators: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/reports/top-collaborators?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Export monthly report as Excel. Returns raw Response; caller should use response.blob() then trigger download.
   */
  getReportsExportExcel: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/reports/export-excel?${queryString}`, {
      method: 'GET',
      headers: { Authorization: getAuthHeaders().Authorization }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || 'Export failed');
    }
    return response;
  },

  /**
   * AI matching — không dùng JWT backend; gọi trực tiếp service AI (CORS phải mở hoặc dùng proxy).
   * GET …/compare/0/api/v1/match/cv/{cvId}/jobs?top_k=… → [{ id, similarity_score, metadata }]
   * @param {string|number} cvId
   * @param {{ top_k?: number }} [options] — mặc định top_k = 20
   */
  getAiMatchJobsForCv: async (cvId, options = {}) => {
    const topK = options.top_k != null ? Math.max(1, Number(options.top_k)) : DEFAULT_AI_MATCH_TOP_K;
    const base = getAiApiBaseUrl();
    const qs = new URLSearchParams({ top_k: String(topK) });
    const url = `${base}/v2/matching/match/cv/${encodeURIComponent(cvId)}/jobs?${qs.toString()}`;
    const response = await fetch(url, { method: 'GET' });
    return handleAiJsonResponse(response);
  },

  /**
   * POST …/v2/matching/match
   * body: { job_id, top_k, cv_ids }
   * Trả về điểm matching + lý do matching cho từng cặp job/CV được truyền vào.
   */
  getAiMatchScoreForJobCv: async ({ job_id, top_k = 5, cv_ids = [] }) => {
    const base = getAiApiBaseUrl();
    const response = await fetch(`${base}/v2/matching/ctv/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: String(job_id),
        top_k: Math.max(1, Number(top_k) || 5),
        cv_ids: (Array.isArray(cv_ids) ? cv_ids : []).map((id) => String(id)).filter(Boolean),
      }),
    });
    return handleAiJsonResponse(response);
  },

  /**
   * GET …/compare/0/api/v1/match/job/{jobId}/cvs?top_k=…
   * @param {string|number} jobId
   * @param {{ top_k?: number }} [options] — mặc định top_k = 20
   */
  getAiMatchCvsForJob: async (jobId, options = {}) => {
    const topK = options.top_k != null ? Math.max(1, Number(options.top_k)) : DEFAULT_AI_MATCH_TOP_K;
    const base = getAiApiBaseUrl();
    const qs = new URLSearchParams({ top_k: String(topK) });
    const url = `${base}/v2/matching/match/job/${encodeURIComponent(jobId)}/cvs?${qs.toString()}`;
    const response = await fetch(url, { method: 'GET' });
    return handleAiJsonResponse(response);
  },

  /**
   * POST …/reranking/generate-reasons — body: { jd_id, candidate_id } (ID job + ID hồ sơ/CV trong hệ thống).
   */
  getAiMatchingReasons: async ({ jd_id, candidate_id, lang }) => {
    const base = getAiApiBaseUrl();
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    const qs = params.toString();
    const response = await fetch(`${base}/reranking/generate-reasons${qs ? `?${qs}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jd_id: Number(jd_id),
        candidate_id: Number(candidate_id),
      }),
    });
    return handleAiJsonResponse(response);
  },

  /** Chat landing CTV — gửi Bearer token CTV (nếu có) để lưu phiên cùng bảng với khách, gắn collaborator_id */
  ensurePublicCtvChatSession: async (payload = {}) => {
    const response = await fetch(`${API_BASE_URL}/public/ctv-chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getOptionalCtvAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  getPublicCtvChatMessages: async (sessionToken) => {
    const qs = new URLSearchParams({ sessionToken }).toString();
    const response = await fetch(`${API_BASE_URL}/public/ctv-chat/messages?${qs}`, {
      headers: { ...getOptionalCtvAuthHeaders() },
    });
    return handleResponse(response);
  },

  sendPublicCtvChatMessage: async ({ sessionToken, body }) => {
    const response = await fetch(`${API_BASE_URL}/public/ctv-chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getOptionalCtvAuthHeaders() },
      body: JSON.stringify({ sessionToken, body }),
    });
    return handleResponse(response);
  },

  getPublicCtvChatStreamUrl: (sessionToken) => {
    const qs = new URLSearchParams({ sessionToken }).toString();
    return `${API_BASE_URL}/public/ctv-chat/stream?${qs}`;
  },

  searchCollaboratorsForChat: async (q) => {
    const qs = new URLSearchParams({ q }).toString();
    const response = await fetch(`${API_BASE_URL}/admin/public-ctv-chat/search-collaborators?${qs}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  createCtvChatSession: async (collaboratorId) => {
    const response = await fetch(`${API_BASE_URL}/admin/public-ctv-chat/sessions`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaboratorId }),
    });
    return handleResponse(response);
  },

  getAdminPublicCtvChatSessions: async (params = {}) => {
    const qs = buildQueryString(params);
    const response = await fetch(`${API_BASE_URL}/admin/public-ctv-chat/sessions?${qs}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getAdminPublicCtvChatMessages: async (sessionId) => {
    const response = await fetch(`${API_BASE_URL}/admin/public-ctv-chat/sessions/${sessionId}/messages`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  sendAdminPublicCtvChatMessage: async (sessionId, text) => {
    const response = await fetch(`${API_BASE_URL}/admin/public-ctv-chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    return handleResponse(response);
  },

  getAdminPublicCtvChatInboxStreamUrl: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return `${API_BASE_URL}/admin/public-ctv-chat/inbox-stream?token=${encodeURIComponent(token)}`;
  },

  /** Chat landing ứng viên (khách, không JWT) */
  ensurePublicCandidateChatSession: async (payload = {}) => {
    const response = await fetch(`${API_BASE_URL}/public/candidate-chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  getPublicCandidateChatMessages: async (sessionToken) => {
    const qs = new URLSearchParams({ sessionToken }).toString();
    const response = await fetch(`${API_BASE_URL}/public/candidate-chat/messages?${qs}`);
    return handleResponse(response);
  },

  sendPublicCandidateChatMessage: async ({ sessionToken, body }) => {
    const response = await fetch(`${API_BASE_URL}/public/candidate-chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, body }),
    });
    return handleResponse(response);
  },

  getPublicCandidateChatStreamUrl: (sessionToken) => {
    const qs = new URLSearchParams({ sessionToken }).toString();
    return `${API_BASE_URL}/public/candidate-chat/stream?${qs}`;
  },

  getAdminPublicCandidateChatSessions: async (params = {}) => {
    const qs = buildQueryString(params);
    const response = await fetch(`${API_BASE_URL}/admin/public-candidate-chat/sessions?${qs}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getAdminPublicCandidateChatMessages: async (sessionId) => {
    const response = await fetch(`${API_BASE_URL}/admin/public-candidate-chat/sessions/${sessionId}/messages`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  sendAdminPublicCandidateChatMessage: async (sessionId, text) => {
    const response = await fetch(`${API_BASE_URL}/admin/public-candidate-chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    return handleResponse(response);
  },

  getAdminPublicCandidateChatInboxStreamUrl: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return `${API_BASE_URL}/admin/public-candidate-chat/inbox-stream?token=${encodeURIComponent(token)}`;
  },

};

export default apiService;

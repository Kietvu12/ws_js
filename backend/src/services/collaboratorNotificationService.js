import { Op } from 'sequelize';
import { Admin, CollaboratorNotification } from '../models/index.js';

const collaboratorStreams = new Map();
const adminStreams = new Map();

const formatDateVi = (dateValue) => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN');
};

const writeSseEvent = (res, eventName, data) => {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const publishToCollaborator = (collaboratorId, payload) => {
  if (!collaboratorId) return;
  const streams = collaboratorStreams.get(Number(collaboratorId));
  if (!streams || streams.size === 0) return;

  for (const res of streams) {
    try {
      writeSseEvent(res, 'notification', payload);
    } catch (err) {
      // Nếu stream lỗi thì bỏ qua, cleanup sẽ xử lý khi connection close.
    }
  }
};

const publishToAdmin = (adminId, payload) => {
  if (!adminId) return;
  const streams = adminStreams.get(Number(adminId));
  if (!streams || streams.size === 0) return;
  for (const res of streams) {
    try {
      writeSseEvent(res, 'notification', payload);
    } catch (err) {
      // ignore
    }
  }
};

const buildNominationContent = ({ candidateName, jobCode, createdByAdmin }) => {
  const safeCandidate = candidateName || 'Ứng viên';
  const safeJobCode = jobCode || 'N/A';
  if (createdByAdmin) {
    return `Hồ sơ ${safeCandidate} đã được tạo đơn tiến cử hộ - đơn tiến cử ${safeJobCode}`;
  }
  return `Hồ sơ ${safeCandidate} đã được tiến cử thành công - đơn tiến cử ${safeJobCode}`;
};

const buildStatusContent = ({ status, candidateName, jobCode, nyushaDate }) => {
  const safeCandidate = candidateName || 'Ứng viên';
  const safeJobCode = jobCode || 'N/A';
  const statusNum = Number(status);

  if (statusNum === 2) {
    return `Đơn tiến cử ${safeJobCode} cho hồ sơ ${safeCandidate} đã được admin phê duyệt`;
  }
  if (statusNum === 7 || statusNum === 8) {
    return `Hồ sơ ${safeCandidate} đã có lịch phỏng vấn đơn tiến cử ${safeJobCode}`;
  }
  if ([4, 6, 10].includes(statusNum)) {
    return `Hồ sơ ${safeCandidate} đã trượt tại đơn tiến cử ${safeJobCode}`;
  }
  if (statusNum === 11) {
    return `Hồ sơ ${safeCandidate} đã có thông báo trúng tuyển tại đơn tiến cử ${safeJobCode}`;
  }
  if (statusNum === 12) {
    return `Hồ sơ ${safeCandidate} đã xác nhận thông báo trúng tuyển tại đơn tiến cử ${safeJobCode}`;
  }
  if (statusNum === 13) {
    return `Hồ sơ ${safeCandidate} đã từ chối nhận việc tại đơn tiến cử ${safeJobCode}`;
  }
  if (statusNum === 14) {
    const dateText = formatDateVi(nyushaDate);
    return `Hồ sơ ${safeCandidate} đã vào công ty - đơn tiến cử ${safeJobCode}${dateText ? ` ngày ${dateText}` : ''}`;
  }
  if (statusNum === 16) {
    return `Hồ sơ ${safeCandidate} đã hủy giữa chừng tại đơn tiến cử ${safeJobCode}`;
  }
  return `Đơn tiến cử ${safeJobCode} đã được cập nhật trạng thái`;
};

export const collaboratorNotificationService = {
  subscribe(collaboratorId, res) {
    const key = Number(collaboratorId);
    if (!collaboratorStreams.has(key)) {
      collaboratorStreams.set(key, new Set());
    }
    collaboratorStreams.get(key).add(res);
  },

  unsubscribe(collaboratorId, res) {
    const key = Number(collaboratorId);
    const streams = collaboratorStreams.get(key);
    if (!streams) return;
    streams.delete(res);
    if (streams.size === 0) {
      collaboratorStreams.delete(key);
    }
  },

  async createAndEmit({ collaboratorId = null, adminId = null, title, content, jobId = null, url = null }) {
    if ((!collaboratorId && !adminId) || !title || !content) return null;
    const notification = await CollaboratorNotification.create({
      collaboratorId,
      adminId,
      title,
      content,
      jobId,
      url,
      isRead: false
    });

    const payload = {
      id: notification.id,
      title: notification.title,
      content: notification.content,
      jobId: notification.jobId,
      url: notification.url,
      isRead: notification.isRead,
      createdAt: notification.createdAt || notification.created_at || new Date().toISOString()
    };
    if (collaboratorId) publishToCollaborator(collaboratorId, payload);
    if (adminId) publishToAdmin(adminId, payload);

    return notification;
  },

  subscribeAdmin(adminId, res) {
    const key = Number(adminId);
    if (!adminStreams.has(key)) adminStreams.set(key, new Set());
    adminStreams.get(key).add(res);
  },

  unsubscribeAdmin(adminId, res) {
    const key = Number(adminId);
    const streams = adminStreams.get(key);
    if (!streams) return;
    streams.delete(res);
    if (streams.size === 0) adminStreams.delete(key);
  },

  async notifySupplementInfoRequested({ collaboratorId, cvId, candidateName }) {
    const safeName = candidateName || 'Ứng viên';
    return this.createAndEmit({
      collaboratorId,
      adminId: null,
      title: 'Yêu cầu bổ sung thông tin hồ sơ',
      content: `Admin đã đánh dấu các vị trí cần bổ sung trên hồ sơ ${safeName}. Vui lòng mở hồ sơ và cập nhật.`,
      jobId: null,
      url: `/agent/candidates/${cvId}`
    });
  },

  async notifyAdminCtvUpdatedAfterSupplement({ adminId, cvId, candidateName }) {
    if (!adminId) return null;
    const safeName = candidateName || 'Ứng viên';
    return this.createAndEmit({
      collaboratorId: null,
      adminId,
      title: 'CTV đã cập nhật hồ sơ',
      content: `CTV đã chỉnh sửa hồ sơ ${safeName} sau yêu cầu bổ sung thông tin.`,
      jobId: null,
      url: `/admin/candidates/${cvId}/edit`
    });
  },

  /** CTV bấm «Gửi duyệt bổ sung» — thông báo admin được chọn (admin_note hoặc admin gán hồ sơ). */
  async notifyAdminCtvSupplementReviewSubmitted({ adminId, cvId, candidateName }) {
    if (!adminId) return null;
    const safeName = candidateName || 'Ứng viên';
    return this.createAndEmit({
      collaboratorId: null,
      adminId,
      title: 'CTV gửi duyệt bổ sung hồ sơ',
      content: `CTV đã gửi hồ sơ ${safeName} để admin duyệt sau khi bổ sung thông tin.`,
      jobId: null,
      url: `/admin/candidates/${cvId}/edit`
    });
  },

  async notifyNominationCreated({ collaboratorId, candidateName, jobCode, jobId = null, jobApplicationId = null, createdByAdmin = false }) {
    const content = buildNominationContent({ candidateName, jobCode, createdByAdmin });
    return this.createAndEmit({
      collaboratorId,
      title: 'Đơn tiến cử mới',
      content,
      jobId,
      url: jobApplicationId ? `/ctv/job-applications/${jobApplicationId}` : null
    });
  },

  async notifyStatusChanged({ collaboratorId, candidateName, jobCode, status, nyushaDate = null, jobId = null, jobApplicationId = null }) {
    const content = buildStatusContent({ status, candidateName, jobCode, nyushaDate });
    return this.createAndEmit({
      collaboratorId,
      title: 'Cập nhật trạng thái đơn tiến cử',
      content,
      jobId,
      url: jobApplicationId ? `/ctv/job-applications/${jobApplicationId}` : null
    });
  },

  async notifyIncomingMessage({ collaboratorId, jobCode, jobId = null, jobApplicationId = null }) {
    const safeJobCode = jobCode || 'N/A';
    return this.createAndEmit({
      collaboratorId,
      title: 'Tin nhắn mới',
      content: `Bạn có tin nhắn mới về đơn tiến cử ${safeJobCode}`,
      jobId,
      url: jobApplicationId ? `/ctv/job-applications/${jobApplicationId}` : null
    });
  },

  async notifyNominationApproved({ collaboratorId, candidateName, jobCode, jobId = null, jobApplicationId = null }) {
    const safeCandidate = candidateName || 'Ứng viên';
    const safeJobCode = jobCode || 'N/A';
    return this.createAndEmit({
      collaboratorId,
      title: 'Đơn tiến cử được phê duyệt',
      content: `Đơn tiến cử ${safeJobCode} cho hồ sơ ${safeCandidate} đã được admin phê duyệt.`,
      jobId,
      url: jobApplicationId ? `/ctv/job-applications/${jobApplicationId}` : null
    });
  },

  async notifyNominationRemovedInvalidProfile({ collaboratorId, candidateName, jobCode, jobId = null }) {
    if (!collaboratorId) return null;
    const safeCandidate = candidateName || 'Ứng viên';
    const safeJobCode = jobCode || 'N/A';
    return this.createAndEmit({
      collaboratorId,
      title: 'Đơn tiến cử đã bị gỡ (hồ sơ trùng)',
      content: `Admin đã xóa đơn tiến cử ${safeJobCode} cho hồ sơ ${safeCandidate} do hồ sơ ở trạng thái trùng/sai lệch.`,
      jobId,
      url: '/ctv/job-applications'
    });
  },

  async notifyAdminsPaymentRequestCreated({
    candidateName,
    jobCode,
    paymentRequestId,
    jobApplicationId = null
  }) {
    const admins = await Admin.findAll({
      where: { isActive: true, status: 1, role: { [Op.in]: [1, 2] } },
      attributes: ['id']
    });
    const safeCandidate = candidateName || 'Ứng viên';
    const safeJobCode = jobCode || 'N/A';
    for (const a of admins) {
      await this.createAndEmit({
        collaboratorId: null,
        adminId: a.id,
        title: 'Yêu cầu thanh toán mới',
        content: `Có yêu cầu thanh toán mới cho hồ sơ ${safeCandidate} - đơn tiến cử ${safeJobCode}.`,
        jobId: null,
        url: jobApplicationId
          ? `/admin/payments?jobApplicationId=${jobApplicationId}&paymentRequestId=${paymentRequestId}`
          : '/admin/payments'
      });
    }
  },

  /** Thông báo Super Admin & Admin Backoffice: tin nhắn từ hộp chat landing ứng viên (khách không đăng nhập). */
  async notifyAdminsPublicCandidateLandingChat({ visitorLabel, preview, sessionId }) {
    const admins = await Admin.findAll({
      where: { isActive: true, status: 1, role: { [Op.in]: [1, 2] } },
      attributes: ['id']
    });
    const safePreview = (preview || '').slice(0, 200);
    const label = visitorLabel || 'Khách';
    const content = safePreview
      ? `${label}: ${safePreview}`
      : `${label} vừa mở hộp chat tư vấn từ trang ứng viên (landing).`;
    const base = '/admin/public-ctv-chat';
    for (const a of admins) {
      await this.createAndEmit({
        collaboratorId: null,
        adminId: a.id,
        title: 'Chat landing ứng viên — tin nhắn mới',
        content,
        jobId: null,
        url: sessionId
          ? `${base}?tab=candidate&sessionId=${sessionId}`
          : `${base}?tab=candidate`
      });
    }
  },

  /** Thông báo Super Admin & Admin Backoffice: tin nhắn từ hộp chat landing CTV (khách không đăng nhập). */
  async notifyAdminsPublicCtvLandingChat({ visitorLabel, preview, sessionId }) {
    const admins = await Admin.findAll({
      where: { isActive: true, status: 1, role: { [Op.in]: [1, 2] } },
      attributes: ['id']
    });
    const safePreview = (preview || '').slice(0, 200);
    const label = visitorLabel || 'Khách';
    const content = safePreview
      ? `${label}: ${safePreview}`
      : `${label} vừa mở hộp chat tư vấn từ trang CTV (landing).`;
    const base = '/admin/public-ctv-chat';
    for (const a of admins) {
      await this.createAndEmit({
        collaboratorId: null,
        adminId: a.id,
        title: 'Chat landing CTV — tin nhắn mới',
        content,
        jobId: null,
        url: sessionId ? `${base}?tab=ctv&sessionId=${sessionId}` : `${base}?tab=ctv`
      });
    }
  },

  async notifyPaymentApprovedOrPaid({ collaboratorId, candidateName, jobCode, jobId = null, jobApplicationId = null, action = 'approved' }) {
    const safeCandidate = candidateName || 'Ứng viên';
    const safeJobCode = jobCode || 'N/A';
    const content = action === 'paid'
      ? `Bạn đã được thanh toán phí giới thiệu với hồ sơ ${safeCandidate} - đơn tiến cử ${safeJobCode}`
      : `Đơn thanh toán của bạn đã được phê duyệt với hồ sơ ${safeCandidate} - đơn tiến cử ${safeJobCode}`;

    return this.createAndEmit({
      collaboratorId,
      title: action === 'paid' ? 'Thanh toán hoàn tất' : 'Đơn thanh toán được phê duyệt',
      content,
      jobId,
      url: jobApplicationId ? `/ctv/job-applications/${jobApplicationId}` : null
    });
  }
};

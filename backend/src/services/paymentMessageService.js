/**
 * Tạo tin nhắn trong chat khi cập nhật thanh toán (đồng bộ với box chat Admin-CTV)
 */
import { Message } from '../models/index.js';

const STATUS_LABELS = {
  0: 'Chờ duyệt',
  1: 'Đã duyệt',
  2: 'Đã từ chối',
  3: 'Đã thanh toán'
};

/**
 * Tạo tin nhắn khi admin cập nhật payment request
 * @param {Object} params
 * @param {number} params.jobApplicationId - ID đơn tiến cử
 * @param {number} params.collaboratorId - ID CTV
 * @param {string} params.action - 'approve' | 'reject' | 'mark_paid' | 'update_amount'
 * @param {number} params.amount - Số tiền (nếu có)
 * @param {string} params.rejectedReason - Lý do từ chối (nếu reject)
 * @param {string} params.note - Ghi chú
 */
export async function createPaymentUpdateMessage({
  jobApplicationId,
  collaboratorId,
  action,
  amount = null,
  rejectedReason = null,
  note = null
}) {
  if (!jobApplicationId || !collaboratorId) return null;

  let content = '';
  switch (action) {
    case 'approve':
      content = [
        '✅ **Admin đã duyệt yêu cầu thanh toán**',
        amount != null ? `**Số tiền:** ${Number(amount).toLocaleString('vi-VN')} VNĐ` : '',
        note ? `**Ghi chú:** ${note}` : '',
        '\n*Tin nhắn tự động từ hệ thống*'
      ].filter(Boolean).join('\n');
      break;
    case 'reject':
      content = [
        '❌ **Admin đã từ chối yêu cầu thanh toán**',
        rejectedReason ? `**Lý do:** ${rejectedReason}` : '',
        note ? `**Ghi chú:** ${note}` : '',
        '\n*Tin nhắn tự động từ hệ thống*'
      ].filter(Boolean).join('\n');
      break;
    case 'mark_paid':
      content = [
        '💳 **Admin đã đánh dấu đã thanh toán**',
        amount != null ? `**Số tiền:** ${Number(amount).toLocaleString('vi-VN')} VNĐ` : '',
        note ? `**Ghi chú:** ${note}` : '',
        '\n*Tin nhắn tự động từ hệ thống*'
      ].filter(Boolean).join('\n');
      break;
    case 'update_amount':
      content = [
        '📝 **Admin đã cập nhật số tiền thanh toán**',
        amount != null ? `**Số tiền mới:** ${Number(amount).toLocaleString('vi-VN')} VNĐ` : '',
        note ? `**Ghi chú:** ${note}` : '',
        '\n*Tin nhắn tự động từ hệ thống*'
      ].filter(Boolean).join('\n');
      break;
    default:
      return null;
  }

  try {
    const message = await Message.create({
      jobApplicationId,
      adminId: null,
      collaboratorId,
      senderType: 3, // System
      content,
      isReadByAdmin: false,
      isReadByCollaborator: false,
      isReadByApplicant: false
    });
    return message;
  } catch (err) {
    console.error('[PaymentMessageService] Error creating message:', err);
    return null;
  }
}

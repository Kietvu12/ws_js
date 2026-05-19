import { Message, JobApplication, Job, CVStorage, Collaborator } from '../models/index.js';
import { getJobApplicationStatus } from '../constants/jobApplicationStatus.js';

function getStatusLabel(status) {
  const num = status != null && status !== '' ? Number(status) : NaN;
  if (Number.isNaN(num) || num < 1 || num > 16) {
    return num >= 1 && num <= 17 ? `Trạng thái ${num}` : 'Trạng thái';
  }
  return getJobApplicationStatus(num).label;
}

/**
 * Status Message Service
 * Tự động tạo tin nhắn trạng thái khi admin cập nhật trạng thái
 */
export const statusMessageService = {
  getStatusLabel,

  /**
   * Tạo tin nhắn trạng thái tự động
   * @param {Object} params
   * @param {number} params.jobApplicationId - ID của job application
   * @param {number} params.oldStatus - Trạng thái cũ
   * @param {number} params.newStatus - Trạng thái mới
   * @param {number} params.adminId - ID của admin thực hiện
   * @param {string} params.note - Ghi chú thêm (tùy chọn)
   * @param {number} params.paymentAmount - Số tiền thanh toán (khi newStatus = 15)
   */
  createStatusMessage: async ({ jobApplicationId, oldStatus, newStatus, adminId, note = null, paymentAmount = null }) => {
    try {
      // Lấy thông tin job application
      const jobApplication = await JobApplication.findByPk(jobApplicationId, {
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'title', 'jobCode']
          },
          {
            model: Collaborator,
            as: 'collaborator',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: CVStorage,
            as: 'cv',
            required: false,
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      if (!jobApplication) {
        console.error(`[Status Message] Job application #${jobApplicationId} not found`);
        return null;
      }

      // Tạo nội dung tin nhắn (luôn tạo message để hiển thị trong chat, kể cả khi chưa có CTV)
      const oldStatusLabel = getStatusLabel(oldStatus);
      const newStatusLabel = getStatusLabel(newStatus);
      
      let content = `📋 **Cập nhật trạng thái đơn ứng tuyển**\n\n`;
      content += `**Đơn ứng tuyển:** ${jobApplication.job?.title || 'N/A'} (${jobApplication.job?.jobCode || 'N/A'})\n`;
      content += `**Ứng viên:** ${jobApplication.cv?.name || 'N/A'} (${jobApplication.cv?.code || 'N/A'})\n\n`;
      content += `**Trạng thái cũ:** ${oldStatusLabel}\n`;
      content += `**Trạng thái mới:** ${newStatusLabel}\n`;

      // Thêm thông tin bổ sung theo constants (14 = Đã vào công ty, 7/8 = phỏng vấn)
      if (newStatus === 14 && jobApplication.nyushaDate) {
        content += `\n**Ngày nyusha:** ${new Date(jobApplication.nyushaDate).toLocaleDateString('vi-VN')}\n`;
      }
      if ((newStatus === 7 || newStatus === 8) && jobApplication.interviewDate) {
        const ivDate = new Date(jobApplication.interviewDate);
        content += `\n**Ngày phỏng vấn:** ${ivDate.toLocaleDateString('vi-VN')} ${ivDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}\n`;
      }
      if (newStatus === 14 && jobApplication.yearlySalary) {
        content += `\n**Lương năm:** ${jobApplication.yearlySalary.toLocaleString('vi-VN')}đ\n`;
      }
      if (newStatus === 15 && paymentAmount != null && !Number.isNaN(parseFloat(paymentAmount))) {
        content += `\n**Số tiền thanh toán:** ${parseFloat(paymentAmount).toLocaleString('vi-VN')} VNĐ\n`;
      }

      // Lý do / ghi chú (từ rejectNote hoặc note) – luôn thêm để CTV thấy và frontend hiển thị thẻ
      const reasonText = jobApplication.rejectNote || note;
      if (reasonText) {
        content += `\n**Lý do:** ${reasonText}\n`;
      }

      content += `\n*Tin nhắn tự động từ hệ thống*`;

      // Tạo message (collaboratorId có thể null nếu đơn chưa gán CTV – vẫn hiển thị trong chat)
      const message = await Message.create({
        jobApplicationId: Number(jobApplicationId),
        adminId,
        collaboratorId: jobApplication.collaboratorId || null,
        senderType: 3, // System message
        content,
        isReadByAdmin: true,
        isReadByCollaborator: false,
        isReadByApplicant: false
      });

      console.log(`[Status Message] Created status message #${message.id} for job application #${jobApplicationId}`);

      return message;
    } catch (error) {
      console.error(`[Status Message] Error creating status message for job application #${jobApplicationId}:`, error);
      // Không throw error để không ảnh hưởng đến việc update status
      return null;
    }
  },

  /**
   * Tạo tin nhắn khi cập nhật các thông tin khác (không phải status)
   * @param {Object} params
   * @param {number} params.jobApplicationId - ID của job application
   * @param {Object} params.oldData - Dữ liệu cũ
   * @param {Object} params.newData - Dữ liệu mới
   * @param {number} params.adminId - ID của admin thực hiện
   */
  createUpdateMessage: async ({ jobApplicationId, oldData, newData, adminId }) => {
    try {
      const jobApplication = await JobApplication.findByPk(jobApplicationId, {
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'title', 'jobCode']
          },
          {
            model: Collaborator,
            as: 'collaborator',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: CVStorage,
            as: 'cv',
            required: false,
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      if (!jobApplication || !jobApplication.collaboratorId) {
        return null;
      }

      const changes = [];
      
      // Kiểm tra các thay đổi quan trọng
      if (oldData.interviewDate !== newData.interviewDate && newData.interviewDate) {
        changes.push(`📅 **Ngày phỏng vấn:** ${new Date(newData.interviewDate).toLocaleString('vi-VN')}`);
      }
      if (oldData.interviewRound2Date !== newData.interviewRound2Date && newData.interviewRound2Date) {
        changes.push(`📅 **Ngày phỏng vấn vòng 2:** ${new Date(newData.interviewRound2Date).toLocaleString('vi-VN')}`);
      }
      if (oldData.nyushaDate !== newData.nyushaDate && newData.nyushaDate) {
        changes.push(`🎉 **Ngày nyusha:** ${new Date(newData.nyushaDate).toLocaleDateString('vi-VN')}`);
      }
      if (oldData.yearlySalary !== newData.yearlySalary && newData.yearlySalary) {
        changes.push(`💰 **Lương năm:** ${parseFloat(newData.yearlySalary).toLocaleString('vi-VN')}đ`);
      }
      if (oldData.expectedPaymentDate !== newData.expectedPaymentDate && newData.expectedPaymentDate) {
        changes.push(`💳 **Ngày thanh toán dự kiến:** ${new Date(newData.expectedPaymentDate).toLocaleDateString('vi-VN')}`);
      }
      if (oldData.rejectNote !== newData.rejectNote && newData.rejectNote) {
        changes.push(`📝 **Lý do từ chối:** ${newData.rejectNote}`);
      }

      // Chỉ tạo message nếu có thay đổi
      if (changes.length === 0) {
        return null;
      }

      let content = `📋 **Cập nhật thông tin đơn ứng tuyển**\n\n`;
      content += `**Đơn ứng tuyển:** ${jobApplication.job?.title || 'N/A'} (${jobApplication.job?.jobCode || 'N/A'})\n`;
      content += `**Ứng viên:** ${jobApplication.cv?.name || 'N/A'} (${jobApplication.cv?.code || 'N/A'})\n\n`;
      content += changes.join('\n');
      content += `\n\n*Tin nhắn tự động từ hệ thống*`;

      const message = await Message.create({
        jobApplicationId,
        adminId,
        collaboratorId: jobApplication.collaboratorId,
        senderType: 3, // System message
        content,
        isReadByAdmin: true,
        isReadByCollaborator: false,
        isReadByApplicant: false
      });

      console.log(`[Status Message] Created update message #${message.id} for job application #${jobApplicationId}`);

      return message;
    } catch (error) {
      console.error(`[Status Message] Error creating update message for job application #${jobApplicationId}:`, error);
      return null;
    }
  }
};


import {
  Message,
  JobApplication,
  Admin,
  Applicant,
} from '../../models/index.js';
import { col } from 'sequelize';
import { uploadBufferToS3, buildMessageAttachmentKey, getSignedUrlForFile, makeDownloadDisposition } from '../../services/s3Service.js';

/**
 * Tin nhắn đơn tiến cử — ứng viên chat với Admin (đơn có applicant_id, không qua CTV)
 */
export const applicantMessageController = {
  getMessagesByJobApplication: async (req, res, next) => {
    try {
      const { jobApplicationId } = req.params;
      const applicantId = req.applicant.id;

      const jobApplication = await JobApplication.findOne({
        where: {
          id: jobApplicationId,
          applicantId,
        },
      });

      if (!jobApplication) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem tin nhắn của đơn này',
        });
      }

      const messages = await Message.findAll({
        where: { jobApplicationId: parseInt(jobApplicationId, 10) },
        include: [
          {
            model: Admin,
            as: 'admin',
            required: false,
            attributes: ['id', 'name', 'email', 'avatar'],
          },
          {
            model: Applicant,
            as: 'applicant',
            required: false,
            attributes: ['id', 'email', 'name'],
          },
        ],
        order: [[col('Message.created_at'), 'ASC']],
        paranoid: true,
      });

      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const item = message.toJSON();
          if (item.attachmentKey) {
            const disposition = makeDownloadDisposition(item.attachmentName || 'attachment');
            item.attachmentUrl = await getSignedUrlForFile(item.attachmentKey, 'download', disposition);
          } else {
            item.attachmentUrl = null;
          }
          return item;
        })
      );

      res.json({
        success: true,
        data: { messages: enrichedMessages },
      });
    } catch (error) {
      next(error);
    }
  },

  createMessage: async (req, res, next) => {
    try {
      const { jobApplicationId, content, senderType = 4 } = req.body;
      const senderTypeNum = parseInt(senderType, 10);
      const trimmedContent = (content || '').trim();
      const hasAttachment = !!req.file;
      const applicantId = req.applicant.id;

      if (!jobApplicationId || (!trimmedContent && !hasAttachment)) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung hoặc tệp đính kèm là bắt buộc',
        });
      }

      if (senderTypeNum !== 4) {
        return res.status(400).json({
          success: false,
          message: 'Ứng viên chỉ gửi với senderType 4',
        });
      }

      const jobApplication = await JobApplication.findOne({
        where: {
          id: jobApplicationId,
          applicantId,
        },
      });

      if (!jobApplication) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền gửi tin nhắn cho đơn này',
        });
      }

      let attachmentKey = null;
      let attachmentName = null;
      let attachmentMimeType = null;
      let attachmentSize = null;

      if (hasAttachment) {
        attachmentName = req.file.originalname || 'attachment';
        attachmentMimeType = req.file.mimetype || 'application/octet-stream';
        attachmentSize = req.file.size || 0;
        attachmentKey = buildMessageAttachmentKey(jobApplicationId, attachmentName);
        await uploadBufferToS3(req.file.buffer, attachmentKey, attachmentMimeType);
      }

      const message = await Message.create({
        jobApplicationId: parseInt(jobApplicationId, 10),
        applicantId,
        senderType: 4,
        content: trimmedContent || '[Attachment]',
        attachmentName,
        attachmentKey,
        attachmentMimeType,
        attachmentSize,
        isReadByAdmin: false,
        isReadByCollaborator: false,
        isReadByApplicant: true,
      });

      await message.reload({
        include: [
          { model: Admin, as: 'admin', required: false },
          { model: Applicant, as: 'applicant', required: false },
        ],
      });

      const messageData = message.toJSON();
      if (messageData.attachmentKey) {
        const disposition = makeDownloadDisposition(messageData.attachmentName || 'attachment');
        messageData.attachmentUrl = await getSignedUrlForFile(messageData.attachmentKey, 'download', disposition);
      } else {
        messageData.attachmentUrl = null;
      }

      res.status(201).json({
        success: true,
        message: 'Đã gửi tin nhắn',
        data: { message: messageData },
      });
    } catch (error) {
      next(error);
    }
  },
};

import {
  EmailToCollaborator,
  Collaborator,
  Admin,
  ActionLog
} from '../../models/index.js';
import { Op } from 'sequelize';
import emailService from '../../services/emailService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'sentAt': 'sent_at'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Email To Collaborator Management Controller (Admin)
 * Quản lý email gửi đến CTV (Collaborator)
 */
export const emailToCollaboratorController = {
  /**
   * Get list of emails to collaborators
   * GET /api/admin/emails/collaborators
   */
  getEmails: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        collaboratorId,
        status,
        sortBy = 'id',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by title or subject
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { subject: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by collaborator
      if (collaboratorId) {
        where.collaboratorId = parseInt(collaboratorId);
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'title', 'subject', 'status', 'sentAt', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await EmailToCollaborator.findAndCountAll({
        where,
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false,
            attributes: ['id', 'name', 'email', 'code']
          },
          {
            model: Admin,
            as: 'creator',
            required: false,
            attributes: ['id', 'name', 'email']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      res.json({
        success: true,
        data: {
          emails: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get email by ID
   * GET /api/admin/emails/collaborators/:id
   */
  getEmailById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const email = await EmailToCollaborator.findByPk(id, {
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          },
          {
            model: Admin,
            as: 'creator',
            required: false
          }
        ]
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy email'
        });
      }

      res.json({
        success: true,
        data: { email }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new email to collaborator(s)
   * POST /api/admin/emails/collaborators
   * 
   * Body:
   * - title, subject, content
   * - collaboratorIds: [1, 2, 3] - Danh sách ID CTV (nếu gửi nhiều CTV)
   * - collaboratorId: 1 - ID CTV (nếu gửi 1 CTV)
   * - emailTemplateId (optional)
   * - recipientType (default: 'specific')
   * - cc, bcc (optional)
   */
  createEmail: async (req, res, next) => {
    try {
      const {
        title,
        subject,
        content,
        collaboratorIds,
        collaboratorId,
        emailTemplateId,
        recipientType = 'specific',
        cc,
        bcc
      } = req.body;

      // Validate required fields
      if (!title || !subject || !content) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề, chủ đề và nội dung email là bắt buộc'
        });
      }

      // Determine collaborator IDs
      let targetCollaboratorIds = [];
      if (collaboratorIds && Array.isArray(collaboratorIds)) {
        targetCollaboratorIds = collaboratorIds;
      } else if (collaboratorId) {
        targetCollaboratorIds = [collaboratorId];
      } else {
        return res.status(400).json({
          success: false,
          message: 'ID CTV hoặc danh sách ID CTV là bắt buộc'
        });
      }

      // Validate collaborators exist
      const collaborators = await Collaborator.findAll({
        where: { id: { [Op.in]: targetCollaboratorIds } }
      });

      if (collaborators.length !== targetCollaboratorIds.length) {
        return res.status(404).json({
          success: false,
          message: 'Một số CTV không tồn tại'
        });
      }

      // Collect recipients
      const recipients = [];
      const recipientsDetail = [];

      for (const collaborator of collaborators) {
        if (collaborator.email) {
          recipients.push(collaborator.email);
          recipientsDetail.push({
            collaboratorId: collaborator.id,
            collaboratorName: collaborator.name,
            collaboratorCode: collaborator.code,
            email: collaborator.email
          });
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có email nào để gửi. Vui lòng kiểm tra lại danh sách CTV.'
        });
      }

      // Create email records (one per collaborator or one for all)
      const emails = [];
      
      // Option 1: Create one email record for all collaborators
      if (recipients.length > 0) {
        const email = await EmailToCollaborator.create({
          collaboratorId: targetCollaboratorIds[0], // Primary collaborator
          title,
          subject,
          content,
          recipients: recipients,
          recipientsDetail: recipientsDetail,
          recipientType,
          status: 'draft',
          recipientsCount: recipients.length,
          createdBy: req.admin.id
        });
        emails.push(email);
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'EmailToCollaborator',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: emails[0]?.toJSON(),
        description: `Tạo email gửi đến CTV: ${title}`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo email thành công',
        data: {
          email: emails[0],
          recipientsCount: recipients.length,
          recipientsPreview: recipients.slice(0, 5) // Preview 5 email đầu
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Send email to collaborator(s)
   * POST /api/admin/emails/collaborators/:id/send
   */
  sendEmail: async (req, res, next) => {
    try {
      const { id } = req.params;

      const email = await EmailToCollaborator.findByPk(id, {
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          }
        ]
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy email'
        });
      }

      if (email.status === 'sent') {
        return res.status(400).json({
          success: false,
          message: 'Email đã được gửi'
        });
      }

      const recipients = email.recipients || [];
      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có người nhận'
        });
      }

      // Prepare attachments
      const attachments = [];
      if (email.fileAttachmentPath) {
        const filePath = path.join(__dirname, '../../..', email.fileAttachmentPath);
        if (fs.existsSync(filePath)) {
          attachments.push({
            filename: email.fileAttachmentOriginalName || path.basename(filePath),
            path: filePath
          });
        }
      }

      // Send email using email service
      try {
        const result = await emailService.sendBulkEmail({
          recipients: recipients.map(email => ({ email })),
          subject: email.subject,
          html: email.content,
          text: email.content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          attachments
        });

        // Update email status
        email.status = 'sent';
        email.sentAt = new Date();
        await email.save();

        // Log action
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'EmailToCollaborator',
          action: 'send',
          ip: req.ip || req.connection.remoteAddress,
          before: { status: 'draft' },
          after: email.toJSON(),
          description: `Gửi email đến CTV: ${email.title} - ${result.successful}/${result.total} thành công`
        });

        res.json({
          success: true,
          message: `Gửi email thành công: ${result.successful}/${result.total}`,
          data: {
            email,
            sendResult: result
          }
        });
      } catch (emailError) {
        // Log error but don't fail completely
        console.error('Error sending email:', emailError);
        
        res.status(500).json({
          success: false,
          message: 'Lỗi khi gửi email: ' + emailError.message
        });
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update email (only if draft)
   * PUT /api/admin/emails/collaborators/:id
   */
  updateEmail: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const email = await EmailToCollaborator.findByPk(id);
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy email'
        });
      }

      if (email.status === 'sent') {
        return res.status(400).json({
          success: false,
          message: 'Không thể chỉnh sửa email đã gửi'
        });
      }

      const oldData = email.toJSON();

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'id' && key !== 'createdBy') {
          email[key] = updateData[key];
        }
      });

      await email.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'EmailToCollaborator',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: email.toJSON(),
        description: `Cập nhật email: ${email.title}`
      });

      res.json({
        success: true,
        message: 'Cập nhật email thành công',
        data: { email }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete email (soft delete)
   * DELETE /api/admin/emails/collaborators/:id
   */
  deleteEmail: async (req, res, next) => {
    try {
      const { id } = req.params;

      const email = await EmailToCollaborator.findByPk(id);
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy email'
        });
      }

      const oldData = email.toJSON();

      // Soft delete
      await email.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'EmailToCollaborator',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa email: ${email.title}`
      });

      res.json({
        success: true,
        message: 'Xóa email thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


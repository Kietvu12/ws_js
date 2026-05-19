import {
  EmailToCompany,
  Company,
  CompanyEmailAddress,
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
 * Email To Company Management Controller (Admin)
 * Quản lý email gửi đến doanh nghiệp
 * Cho phép chọn email từ danh sách email của công ty (CompanyEmailAddress)
 */
export const emailToCompanyController = {
  /**
   * Get list of emails to companies
   * GET /api/admin/emails/companies
   */
  getEmails: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
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

      const { count, rows } = await EmailToCompany.findAndCountAll({
        where,
        include: [
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
   * GET /api/admin/emails/companies/:id
   */
  getEmailById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const email = await EmailToCompany.findByPk(id, {
        include: [
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
   * Create new email to companies
   * POST /api/admin/emails/companies
   * 
   * Body:
   * - title, subject, content
   * - companyIds: [1, 2, 3] - Danh sách ID công ty
   * - selectedEmails: [{companyId: 1, emailIds: [1, 2]}] - Chọn email cụ thể từ mỗi công ty
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
        companyIds,
        selectedEmails, // [{companyId: 1, emailIds: [1, 2]}]
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

      if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách công ty là bắt buộc'
        });
      }

      // Validate companies exist
      const companies = await Company.findAll({
        where: { id: { [Op.in]: companyIds } },
        include: [
          {
            model: CompanyEmailAddress,
            as: 'emailAddresses',
            required: false
          }
        ]
      });

      if (companies.length !== companyIds.length) {
        return res.status(404).json({
          success: false,
          message: 'Một số công ty không tồn tại'
        });
      }

      // Collect recipients
      const recipients = [];
      const recipientsDetail = [];

      for (const company of companies) {
        const companyEmails = company.emailAddresses || [];
        
        // Nếu có selectedEmails, chỉ lấy email được chọn
        let emailsToUse = companyEmails;
        if (selectedEmails && Array.isArray(selectedEmails)) {
          const selected = selectedEmails.find(s => s.companyId === company.id);
          if (selected && selected.emailIds && selected.emailIds.length > 0) {
            emailsToUse = companyEmails.filter(e => selected.emailIds.includes(e.id));
          }
        }

        // Nếu công ty không có email nào, bỏ qua
        if (emailsToUse.length === 0) {
          continue;
        }

        for (const emailAddr of emailsToUse) {
          recipients.push(emailAddr.email);
          recipientsDetail.push({
            companyId: company.id,
            companyName: company.name,
            emailId: emailAddr.id,
            email: emailAddr.email
          });
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có email nào để gửi. Vui lòng kiểm tra lại danh sách công ty và email đã chọn.'
        });
      }

      // Create email record
      const email = await EmailToCompany.create({
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

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'EmailToCompany',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: email.toJSON(),
        description: `Tạo email gửi đến công ty: ${email.title}`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo email thành công',
        data: {
          email,
          recipientsCount: recipients.length,
          recipientsPreview: recipients.slice(0, 5) // Preview 5 email đầu
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Send email to companies
   * POST /api/admin/emails/companies/:id/send
   */
  sendEmail: async (req, res, next) => {
    try {
      const { id } = req.params;

      const email = await EmailToCompany.findByPk(id);
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
          object: 'EmailToCompany',
          action: 'send',
          ip: req.ip || req.connection.remoteAddress,
          before: { status: 'draft' },
          after: email.toJSON(),
          description: `Gửi email đến công ty: ${email.title} - ${result.successful}/${result.total} thành công`
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
   * PUT /api/admin/emails/companies/:id
   */
  updateEmail: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const email = await EmailToCompany.findByPk(id);
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
        object: 'EmailToCompany',
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
   * DELETE /api/admin/emails/companies/:id
   */
  deleteEmail: async (req, res, next) => {
    try {
      const { id } = req.params;

      const email = await EmailToCompany.findByPk(id);
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
        object: 'EmailToCompany',
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


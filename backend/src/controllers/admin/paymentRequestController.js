import {
  PaymentRequest,
  Collaborator,
  JobApplication,
  Job,
  Company,
  CVStorage,
  Admin,
  ActionLog
} from '../../models/index.js';
import { createPaymentUpdateMessage } from '../../services/paymentMessageService.js';
import { collaboratorNotificationService } from '../../services/collaboratorNotificationService.js';
import { Op } from 'sequelize';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'approvedAt': 'approved_at',
    'rejectedAt': 'rejected_at'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Payment Request Management Controller (Admin)
 * Quản lý yêu cầu thanh toán từ CTV
 * Status: 0 = Chờ duyệt, 1 = Đã duyệt, 2 = Từ chối, 3 = Đã thanh toán
 */
export const paymentRequestController = {
  /**
   * Get list of payment requests
   * GET /api/admin/payment-requests
   */
  getPaymentRequests: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        collaboratorId,
        jobApplicationId,
        status,
        minAmount,
        maxAmount,
        approvedFrom,
        approvedTo,
        rejectedFrom,
        rejectedTo,
        sortBy = 'id',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Filter by collaborator
      if (collaboratorId) {
        where.collaboratorId = parseInt(collaboratorId);
      }

      // Filter by job application
      if (jobApplicationId) {
        where.jobApplicationId = parseInt(jobApplicationId);
      }

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by amount range
      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) {
          where.amount[Op.gte] = parseFloat(minAmount);
        }
        if (maxAmount) {
          where.amount[Op.lte] = parseFloat(maxAmount);
        }
      }

      // Filter by approved date
      if (approvedFrom || approvedTo) {
        where.approved_at = {};
        if (approvedFrom) {
          where.approved_at[Op.gte] = new Date(approvedFrom);
        }
        if (approvedTo) {
          where.approved_at[Op.lte] = new Date(approvedTo);
        }
      }

      // Filter by rejected date
      if (rejectedFrom || rejectedTo) {
        where.rejected_at = {};
        if (rejectedFrom) {
          where.rejected_at[Op.gte] = new Date(rejectedFrom);
        }
        if (rejectedTo) {
          where.rejected_at[Op.lte] = new Date(rejectedTo);
        }
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'amount', 'status', 'createdAt', 'updatedAt', 'approvedAt', 'rejectedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await PaymentRequest.findAndCountAll({
        where,
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false,
            attributes: ['id', 'name', 'email', 'code'],
            ...(search && {
              where: {
                [Op.or]: [
                  { name: { [Op.like]: `%${search}%` } },
                  { email: { [Op.like]: `%${search}%` } },
                  { code: { [Op.like]: `%${search}%` } }
                ]
              }
            })
          },
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false,
            attributes: ['id', 'cvCode', 'jobId', 'title', 'status', 'nyushaDate', 'expectedPaymentDate'],
            include: [
              {
                model: CVStorage,
                as: 'cv',
                required: false,
                attributes: ['id', 'code', 'name']
              },
              {
                model: Job,
                as: 'job',
                required: false,
                attributes: ['id', 'jobCode', 'title', 'slug'],
                include: [
                  {
                    model: Company,
                    as: 'company',
                    required: false,
                    attributes: ['id', 'name', 'companyCode']
                  }
                ]
              }
            ]
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      res.json({
        success: true,
        data: {
          paymentRequests: rows,
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
   * Get payment request by ID
   * GET /api/admin/payment-requests/:id
   */
  getPaymentRequestById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const paymentRequest = await PaymentRequest.findByPk(id, {
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          },
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false,
            include: [
              {
                model: Job,
                as: 'job',
                required: false,
                include: [
                  {
                    model: Company,
                    as: 'company',
                    required: false
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán'
        });
      }

      res.json({
        success: true,
        data: { paymentRequest }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Approve payment request
   * PATCH /api/admin/payment-requests/:id/approve
   */
  approvePaymentRequest: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { note, amount } = req.body;

      const paymentRequest = await PaymentRequest.findByPk(id, {
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          },
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false
          }
        ]
      });

      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán'
        });
      }

      if (paymentRequest.status !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể duyệt yêu cầu ở trạng thái "Chờ duyệt" (status = 0)'
        });
      }

      const oldData = paymentRequest.toJSON();

      // Cập nhật amount nếu admin nhập (không tính tự động)
      if (amount != null && !Number.isNaN(parseFloat(amount))) {
        paymentRequest.amount = parseFloat(amount);
      }
      paymentRequest.status = 1; // Đã duyệt
      paymentRequest.approvedAt = new Date();
      if (note) {
        paymentRequest.note = note;
      }
      await paymentRequest.save();

      // Tạo tin nhắn trong chat (đồng bộ Admin-CTV)
      if (paymentRequest.jobApplicationId && paymentRequest.collaboratorId) {
        await createPaymentUpdateMessage({
          jobApplicationId: paymentRequest.jobApplicationId,
          collaboratorId: paymentRequest.collaboratorId,
          action: 'approve',
          amount: paymentRequest.amount,
          note: note || null
        });

        try {
          const detail = await JobApplication.findByPk(paymentRequest.jobApplicationId, {
            include: [
              { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode', 'title'] },
              { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'name', 'code'] }
            ]
          });
          await collaboratorNotificationService.notifyPaymentApprovedOrPaid({
            collaboratorId: paymentRequest.collaboratorId,
            candidateName: detail?.cv?.name || null,
            jobCode: detail?.job?.jobCode || String(paymentRequest.jobApplicationId),
            jobId: detail?.jobId || null,
            jobApplicationId: paymentRequest.jobApplicationId,
            action: 'approved'
          });
        } catch (notificationError) {
          console.error('[Payment approve] Error creating notification:', notificationError);
        }
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'PaymentRequest',
        action: 'approve',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: paymentRequest.toJSON(),
        description: `Duyệt yêu cầu thanh toán #${id} - Số tiền: ${paymentRequest.amount}`
      });

      res.json({
        success: true,
        message: 'Duyệt yêu cầu thanh toán thành công',
        data: { paymentRequest }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reject payment request
   * PATCH /api/admin/payment-requests/:id/reject
   */
  rejectPaymentRequest: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rejectedReason, note } = req.body;

      if (!rejectedReason) {
        return res.status(400).json({
          success: false,
          message: 'Lý do từ chối là bắt buộc'
        });
      }

      const paymentRequest = await PaymentRequest.findByPk(id, {
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          },
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false
          }
        ]
      });

      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán'
        });
      }

      if (paymentRequest.status !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể từ chối yêu cầu ở trạng thái "Chờ duyệt" (status = 0)'
        });
      }

      const oldData = paymentRequest.toJSON();

      paymentRequest.status = 2; // Từ chối
      paymentRequest.rejectedAt = new Date();
      paymentRequest.rejectedReason = rejectedReason;
      if (note) {
        paymentRequest.note = note;
      }
      await paymentRequest.save();

      // Tạo tin nhắn trong chat
      if (paymentRequest.jobApplicationId && paymentRequest.collaboratorId) {
        await createPaymentUpdateMessage({
          jobApplicationId: paymentRequest.jobApplicationId,
          collaboratorId: paymentRequest.collaboratorId,
          action: 'reject',
          rejectedReason,
          note: note || null
        });

        try {
          const detail = await JobApplication.findByPk(paymentRequest.jobApplicationId, {
            include: [
              { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode', 'title'] },
              { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'name', 'code'] }
            ]
          });
          await collaboratorNotificationService.notifyPaymentApprovedOrPaid({
            collaboratorId: paymentRequest.collaboratorId,
            candidateName: detail?.cv?.name || null,
            jobCode: detail?.job?.jobCode || String(paymentRequest.jobApplicationId),
            jobId: detail?.jobId || null,
            jobApplicationId: paymentRequest.jobApplicationId,
            action: 'paid'
          });
        } catch (notificationError) {
          console.error('[Payment mark_paid] Error creating notification:', notificationError);
        }
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'PaymentRequest',
        action: 'reject',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: paymentRequest.toJSON(),
        description: `Từ chối yêu cầu thanh toán #${id} - Lý do: ${rejectedReason}`
      });

      res.json({
        success: true,
        message: 'Từ chối yêu cầu thanh toán thành công',
        data: { paymentRequest }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mark payment request as paid
   * PATCH /api/admin/payment-requests/:id/mark-paid
   */
  markAsPaid: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { note, amount } = req.body;

      const paymentRequest = await PaymentRequest.findByPk(id, {
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          },
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false
          }
        ]
      });

      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán'
        });
      }

      if (paymentRequest.status !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể đánh dấu đã thanh toán cho yêu cầu đã được duyệt (status = 1)'
        });
      }

      const oldData = paymentRequest.toJSON();

      // Cập nhật amount nếu admin nhập
      if (amount != null && !Number.isNaN(parseFloat(amount))) {
        paymentRequest.amount = parseFloat(amount);
      }
      paymentRequest.status = 3; // Đã thanh toán
      if (note) {
        paymentRequest.note = note;
      }
      await paymentRequest.save();

      // Tạo tin nhắn trong chat
      if (paymentRequest.jobApplicationId && paymentRequest.collaboratorId) {
        await createPaymentUpdateMessage({
          jobApplicationId: paymentRequest.jobApplicationId,
          collaboratorId: paymentRequest.collaboratorId,
          action: 'mark_paid',
          amount: paymentRequest.amount,
          note: note || null
        });
      }

      // Tự động chuyển job_application status = 15 (Đã thanh toán)
      if (paymentRequest.jobApplication) {
        const jobApplication = paymentRequest.jobApplication;
        const oldJobAppData = jobApplication.toJSON();
        
        jobApplication.status = 15; // Đã thanh toán
        await jobApplication.save();

        // Log action cho job_application
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'JobApplication',
          action: 'update_status',
          ip: req.ip || req.connection.remoteAddress,
          before: oldJobAppData,
          after: jobApplication.toJSON(),
          description: `Tự động chuyển trạng thái đơn ứng tuyển #${jobApplication.id} sang "Đã thanh toán" sau khi đánh dấu đã thanh toán payment request #${id}`
        });
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'PaymentRequest',
        action: 'mark_paid',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: paymentRequest.toJSON(),
        description: `Đánh dấu đã thanh toán yêu cầu #${id} - Số tiền: ${paymentRequest.amount}`
      });

      res.json({
        success: true,
        message: 'Đánh dấu đã thanh toán thành công',
        data: { paymentRequest }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update payment request
   * PUT /api/admin/payment-requests/:id
   */
  updatePaymentRequest: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const paymentRequest = await PaymentRequest.findByPk(id);
      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán'
        });
      }

      // Cho phép update amount khi status = 0 (Chờ duyệt) hoặc 1 (Đã duyệt, chưa thanh toán)
      if (paymentRequest.status !== 0 && paymentRequest.status !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể cập nhật yêu cầu ở trạng thái "Chờ duyệt" hoặc "Đã duyệt"'
        });
      }

      const oldData = paymentRequest.toJSON();
      const oldAmount = paymentRequest.amount;

      // Update fields (exclude status, approvedAt, rejectedAt)
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined &&
            key !== 'id' &&
            key !== 'status' &&
            key !== 'approvedAt' &&
            key !== 'rejectedAt' &&
            key !== 'rejectedReason') {
          paymentRequest[key] = updateData[key];
        }
      });

      await paymentRequest.save();

      // Tạo tin nhắn khi cập nhật amount (đồng bộ chat)
      const newAmount = updateData.amount != null ? parseFloat(updateData.amount) : null;
      if (paymentRequest.jobApplicationId && paymentRequest.collaboratorId &&
          newAmount != null && !Number.isNaN(newAmount) && Number(newAmount) !== Number(oldAmount)) {
        await createPaymentUpdateMessage({
          jobApplicationId: paymentRequest.jobApplicationId,
          collaboratorId: paymentRequest.collaboratorId,
          action: 'update_amount',
          amount: newAmount,
          note: updateData.note || null
        });
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'PaymentRequest',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: paymentRequest.toJSON(),
        description: `Cập nhật yêu cầu thanh toán #${id}`
      });

      res.json({
        success: true,
        message: 'Cập nhật yêu cầu thanh toán thành công',
        data: { paymentRequest }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete payment request (soft delete)
   * DELETE /api/admin/payment-requests/:id
   */
  deletePaymentRequest: async (req, res, next) => {
    try {
      const { id } = req.params;

      const paymentRequest = await PaymentRequest.findByPk(id);
      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán'
        });
      }

      const oldData = paymentRequest.toJSON();

      // Soft delete
      await paymentRequest.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'PaymentRequest',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa yêu cầu thanh toán #${id}`
      });

      res.json({
        success: true,
        message: 'Xóa yêu cầu thanh toán thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


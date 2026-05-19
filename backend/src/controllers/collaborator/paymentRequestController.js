import {
  PaymentRequest,
  JobApplication,
  Job,
  Company,
  CVStorage
} from '../../models/index.js';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import multer from 'multer';
import config from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file upload
const uploadDir = path.join(__dirname, '../../../', config.upload.dir, 'payment-requests', 'ctv');
// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `payment-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX'));
    }
  }
}).single('file');

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
 * Payment Request Management Controller (CTV)
 * CTV chỉ có thể quản lý yêu cầu thanh toán của chính họ
 * Status: 0 = Chờ duyệt, 1 = Đã duyệt, 2 = Từ chối, 3 = Đã thanh toán
 */
export const paymentRequestController = {
  /**
   * Get list of payment requests (only own requests)
   * GET /api/ctv/payment-requests
   */
  getPaymentRequests: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        jobApplicationId,
        minAmount,
        maxAmount,
        sortBy = 'id',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {
        collaboratorId: req.collaborator.id // Chỉ lấy yêu cầu của CTV này
      };

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by job application
      if (jobApplicationId) {
        where.jobApplicationId = parseInt(jobApplicationId);
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
            model: JobApplication,
            as: 'jobApplication',
            required: false,
            attributes: ['id', 'title', 'status', 'nyushaDate', 'expectedPaymentDate'],
            include: [
              {
                model: Job,
                as: 'job',
                required: false,
                attributes: ['id', 'jobCode', 'title'],
                include: [
                  {
                    model: Company,
                    as: 'company',
                    required: false,
                    attributes: ['id', 'name', 'companyCode']
                  }
                ]
              },
              {
                model: CVStorage,
                as: 'cv',
                required: false,
                attributes: ['id', 'code', 'name', 'email']
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
   * Get payment request by ID (only own request)
   * GET /api/ctv/payment-requests/:id
   */
  getPaymentRequestById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const paymentRequest = await PaymentRequest.findOne({
        where: {
          id: parseInt(id),
          collaboratorId: req.collaborator.id
        },
        include: [
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
              },
              {
                model: CVStorage,
                as: 'cv',
                required: false
              }
            ]
          }
        ]
      });

      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán hoặc bạn không có quyền truy cập'
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
   * Create new payment request
   * POST /api/ctv/payment-requests
   */
  createPaymentRequest: async (req, res, next) => {
    try {
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        try {
          const { jobApplicationId, amount, note } = req.body;

          // Validate required fields
          if (!jobApplicationId) {
            // Delete uploaded file if validation fails
            if (req.file) {
              try {
                await fs.unlink(req.file.path);
              } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
              }
            }
            return res.status(400).json({
              success: false,
              message: 'ID đơn ứng tuyển là bắt buộc'
            });
          }

          if (!amount || parseFloat(amount) <= 0) {
            // Delete uploaded file if validation fails
            if (req.file) {
              try {
                await fs.unlink(req.file.path);
              } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
              }
            }
            return res.status(400).json({
              success: false,
              message: 'Số tiền phải lớn hơn 0'
            });
          }

          // Validate job application exists and belongs to this collaborator
          const jobApplication = await JobApplication.findOne({
            where: {
              id: parseInt(jobApplicationId),
              collaboratorId: req.collaborator.id
            }
          });

          if (!jobApplication) {
            // Delete uploaded file if validation fails
            if (req.file) {
              try {
                await fs.unlink(req.file.path);
              } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
              }
            }
            return res.status(404).json({
              success: false,
              message: 'Đơn ứng tuyển không tồn tại hoặc không thuộc về bạn'
            });
          }

          // Check if there's already a pending payment request for this job application
          const existingRequest = await PaymentRequest.findOne({
            where: {
              jobApplicationId: parseInt(jobApplicationId),
              collaboratorId: req.collaborator.id,
              status: 0 // Chờ duyệt
            }
          });

          if (existingRequest) {
            // Delete uploaded file if validation fails
            if (req.file) {
              try {
                await fs.unlink(req.file.path);
              } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
              }
            }
            return res.status(409).json({
              success: false,
              message: 'Đã có yêu cầu thanh toán đang chờ duyệt cho đơn ứng tuyển này'
            });
          }

          // Handle file upload
          let filePath = null;
          if (req.file) {
            filePath = path.relative(path.join(__dirname, '../../../'), req.file.path);
          }

          // Create payment request
          const paymentRequest = await PaymentRequest.create({
            collaboratorId: req.collaborator.id,
            jobApplicationId: parseInt(jobApplicationId),
            amount: parseFloat(amount),
            status: 0, // Chờ duyệt
            note: note || null,
            filePath: filePath
          });

          // Reload with relations
          await paymentRequest.reload({
            include: [
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
                  },
                  {
                    model: CVStorage,
                    as: 'cv',
                    required: false
                  }
                ]
              }
            ]
          });

          res.status(201).json({
            success: true,
            message: 'Tạo yêu cầu thanh toán thành công',
            data: { paymentRequest }
          });
        } catch (error) {
          // Delete uploaded file if creation fails
          if (req.file) {
            try {
              await fs.unlink(req.file.path);
            } catch (unlinkError) {
              console.error('Error deleting file:', unlinkError);
            }
          }
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update payment request (only own request, only if status = 0)
   * PUT /api/ctv/payment-requests/:id
   */
  updatePaymentRequest: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if payment request exists and belongs to this collaborator
      const paymentRequest = await PaymentRequest.findOne({
        where: {
          id: parseInt(id),
          collaboratorId: req.collaborator.id
        }
      });

      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán hoặc bạn không có quyền chỉnh sửa'
        });
      }

      // Only allow update if status is 0 (Chờ duyệt)
      if (paymentRequest.status !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể cập nhật yêu cầu thanh toán đang chờ duyệt'
        });
      }

      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        try {
          const { amount, note } = req.body;

          // Update amount if provided
          if (amount !== undefined) {
            const newAmount = parseFloat(amount);
            if (isNaN(newAmount) || newAmount <= 0) {
              // Delete uploaded file if validation fails
              if (req.file) {
                try {
                  await fs.unlink(req.file.path);
                } catch (unlinkError) {
                  console.error('Error deleting file:', unlinkError);
                }
              }
              return res.status(400).json({
                success: false,
                message: 'Số tiền phải lớn hơn 0'
              });
            }
            paymentRequest.amount = newAmount;
          }

          // Update note if provided
          if (note !== undefined) {
            paymentRequest.note = note;
          }

          // Handle file upload
          if (req.file) {
            // Delete old file if exists
            if (paymentRequest.filePath) {
              try {
                const oldFilePath = path.join(__dirname, '../../../', paymentRequest.filePath);
                await fs.unlink(oldFilePath);
              } catch (unlinkError) {
                console.error('Error deleting old file:', unlinkError);
              }
            }
            paymentRequest.filePath = path.relative(path.join(__dirname, '../../../'), req.file.path);
          }

          await paymentRequest.save();

          // Reload with relations
          await paymentRequest.reload({
            include: [
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
                  },
                  {
                    model: CVStorage,
                    as: 'cv',
                    required: false
                  }
                ]
              }
            ]
          });

          res.json({
            success: true,
            message: 'Cập nhật yêu cầu thanh toán thành công',
            data: { paymentRequest }
          });
        } catch (error) {
          // Delete uploaded file if update fails
          if (req.file) {
            try {
              await fs.unlink(req.file.path);
            } catch (unlinkError) {
              console.error('Error deleting file:', unlinkError);
            }
          }
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete payment request (only own request, only if status = 0)
   * DELETE /api/ctv/payment-requests/:id
   */
  deletePaymentRequest: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if payment request exists and belongs to this collaborator
      const paymentRequest = await PaymentRequest.findOne({
        where: {
          id: parseInt(id),
          collaboratorId: req.collaborator.id
        }
      });

      if (!paymentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu thanh toán hoặc bạn không có quyền xóa'
        });
      }

      // Only allow delete if status is 0 (Chờ duyệt)
      if (paymentRequest.status !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể xóa yêu cầu thanh toán đang chờ duyệt'
        });
      }

      // Delete file if exists
      if (paymentRequest.filePath) {
        try {
          const filePath = path.join(__dirname, '../../../', paymentRequest.filePath);
          await fs.unlink(filePath);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }

      // Soft delete
      await paymentRequest.destroy();

      res.json({
        success: true,
        message: 'Xóa yêu cầu thanh toán thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


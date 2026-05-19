import {
  Calendar,
  JobApplication,
  Job,
  Admin,
  Collaborator,
  ActionLog
} from '../../models/index.js';
import { Op } from 'sequelize';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'startAt': 'start_at',
    'endAt': 'end_at'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Calendar Management Controller (Admin)
 */
export const calendarController = {
  /**
   * Get list of calendars
   * GET /api/admin/calendars
   */
  getCalendars: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        jobApplicationId,
        adminId,
        collaboratorId,
        eventType,
        status,
        startFrom,
        startTo,
        endFrom,
        endTo,
        sortBy = 'startAt',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by title or description
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by job application
      if (jobApplicationId) {
        where.jobApplicationId = parseInt(jobApplicationId);
      }

      // Filter by admin
      if (adminId) {
        where.adminId = parseInt(adminId);
      }

      // Filter by collaborator
      if (collaboratorId) {
        where.collaboratorId = parseInt(collaboratorId);
      }

      // Filter by event type
      if (eventType !== undefined) {
        where.eventType = parseInt(eventType);
      }

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by start date
      if (startFrom || startTo) {
        where.start_at = {};
        if (startFrom) {
          where.start_at[Op.gte] = new Date(startFrom);
        }
        if (startTo) {
          where.start_at[Op.lte] = new Date(startTo);
        }
      }

      // Filter by end date
      if (endFrom || endTo) {
        where.end_at = {};
        if (endFrom) {
          where.end_at[Op.gte] = new Date(endFrom);
        }
        if (endTo) {
          where.end_at[Op.lte] = new Date(endTo);
        }
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'title', 'startAt', 'endAt', 'status', 'eventType', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'startAt';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const { count, rows } = await Calendar.findAndCountAll({
        where,
        include: [
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false,
            attributes: ['id', 'title', 'status'],
            include: [
              {
                model: Job,
                as: 'job',
                required: false,
                attributes: ['id', 'jobCode', 'title']
              }
            ]
          },
          {
            model: Admin,
            as: 'admin',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: Collaborator,
            as: 'collaborator',
            required: false,
            attributes: ['id', 'name', 'email', 'code']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      res.json({
        success: true,
        data: {
          calendars: rows,
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
   * Get calendar by ID
   * GET /api/admin/calendars/:id
   */
  getCalendarById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const calendar = await Calendar.findByPk(id, {
        include: [
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false,
            include: [
              {
                model: Job,
                as: 'job',
                required: false
              },
              {
                model: Collaborator,
                as: 'collaborator',
                required: false
              }
            ]
          },
          {
            model: Admin,
            as: 'admin',
            required: false
          },
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          }
        ]
      });

      if (!calendar) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch hẹn'
        });
      }

      res.json({
        success: true,
        data: { calendar }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new calendar
   * POST /api/admin/calendars
   */
  createCalendar: async (req, res, next) => {
    try {
      console.log('[Calendar Create] Request body:', JSON.stringify(req.body, null, 2));
      console.log('[Calendar Create] Admin ID:', req.admin?.id);
      
      const {
        jobApplicationId,
        collaboratorId,
        eventType = 1,
        title,
        description,
        startAt,
        endAt,
        status = 0
      } = req.body;

      // Validate required fields
      if (!jobApplicationId || !title || !startAt) {
        console.log('[Calendar Create] Validation failed:', { jobApplicationId, title, startAt });
        return res.status(400).json({
          success: false,
          message: 'ID đơn ứng tuyển, tiêu đề và thời gian bắt đầu là bắt buộc'
        });
      }

      // Validate job application exists
      const jobApplication = await JobApplication.findByPk(jobApplicationId);
      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Đơn ứng tuyển không tồn tại'
        });
      }

      // Validate collaborator if provided
      if (collaboratorId) {
        const collaborator = await Collaborator.findByPk(collaboratorId);
        if (!collaborator) {
          return res.status(404).json({
            success: false,
            message: 'CTV không tồn tại'
          });
        }
      }

      // Validate dates
      const start = new Date(startAt);
      if (endAt) {
        const end = new Date(endAt);
        if (end < start) {
          return res.status(400).json({
            success: false,
            message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
          });
        }
      }

      console.log('[Calendar Create] Creating calendar with data:', {
        jobApplicationId,
        adminId: req.admin.id,
        collaboratorId: collaboratorId || null,
        eventType,
        title,
        description,
        startAt: start,
        endAt: endAt ? new Date(endAt) : null,
        status
      });

      const calendar = await Calendar.create({
        jobApplicationId,
        adminId: req.admin.id,
        collaboratorId: collaboratorId || null,
        eventType,
        title,
        description,
        startAt: start,
        endAt: endAt ? new Date(endAt) : null,
        status
      });

      console.log('[Calendar Create] Calendar created successfully:', calendar.id);

      // Tự động cập nhật trạng thái job_application dựa trên eventType
      // eventType = 1 (Phỏng vấn) -> status = 4 (Đang phỏng vấn)
      // eventType = 2 (Nyusha) -> status = 8 (Đã nyusha)
      if (eventType === 1) {
        // Phỏng vấn -> Đang phỏng vấn (status = 4)
        await jobApplication.update({
          status: 4,
          interviewDate: start
        });
      } else if (eventType === 2) {
        // Nyusha -> Đã nyusha (status = 8)
        await jobApplication.update({
          status: 8,
          nyushaDate: start
        });
      }

      // Reload with relations
      await calendar.reload({
        include: [
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false
          },
          {
            model: Admin,
            as: 'admin',
            required: false
          },
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Calendar',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: calendar.toJSON(),
        description: `Tạo mới lịch hẹn: ${calendar.title}`
      });

      console.log('[Calendar Create] Successfully created calendar:', calendar.id);
      
      res.status(201).json({
        success: true,
        message: 'Tạo lịch hẹn thành công',
        data: { calendar }
      });
    } catch (error) {
      console.error('[Calendar Create] Error:', error);
      console.error('[Calendar Create] Error stack:', error.stack);
      next(error);
    }
  },

  /**
   * Update calendar
   * PUT /api/admin/calendars/:id
   */
  updateCalendar: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const calendar = await Calendar.findByPk(id);
      if (!calendar) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch hẹn'
        });
      }

      const oldData = calendar.toJSON();

      // Validate job application if being changed
      if (updateData.jobApplicationId && updateData.jobApplicationId !== calendar.jobApplicationId) {
        const jobApplication = await JobApplication.findByPk(updateData.jobApplicationId);
        if (!jobApplication) {
          return res.status(404).json({
            success: false,
            message: 'Đơn ứng tuyển không tồn tại'
          });
        }
      }

      // Validate collaborator if being changed
      if (updateData.collaboratorId !== undefined) {
        if (updateData.collaboratorId && updateData.collaboratorId !== calendar.collaboratorId) {
          const collaborator = await Collaborator.findByPk(updateData.collaboratorId);
          if (!collaborator) {
            return res.status(404).json({
              success: false,
              message: 'CTV không tồn tại'
            });
          }
        }
      }

      // Validate dates
      const startAt = updateData.startAt ? new Date(updateData.startAt) : calendar.startAt;
      const endAt = updateData.endAt ? new Date(updateData.endAt) : calendar.endAt;
      
      if (endAt && endAt < startAt) {
        return res.status(400).json({
          success: false,
          message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
        });
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          if (key === 'startAt' || key === 'endAt') {
            calendar[key] = updateData[key] ? new Date(updateData[key]) : null;
          } else {
            calendar[key] = updateData[key];
          }
        }
      });

      await calendar.save();

      // Reload with relations
      await calendar.reload({
        include: [
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false
          },
          {
            model: Admin,
            as: 'admin',
            required: false
          },
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Calendar',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: calendar.toJSON(),
        description: `Cập nhật lịch hẹn: ${calendar.title}`
      });

      res.json({
        success: true,
        message: 'Cập nhật lịch hẹn thành công',
        data: { calendar }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update calendar status
   * PATCH /api/admin/calendars/:id/status
   */
  updateStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái là bắt buộc'
        });
      }

      const calendar = await Calendar.findByPk(id);
      if (!calendar) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch hẹn'
        });
      }

      const oldData = calendar.toJSON();

      calendar.status = parseInt(status);
      await calendar.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Calendar',
        action: 'update_status',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: calendar.toJSON(),
        description: `Cập nhật trạng thái lịch hẹn: ${calendar.title} - Status: ${status}`
      });

      res.json({
        success: true,
        message: 'Cập nhật trạng thái lịch hẹn thành công',
        data: { calendar }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete calendar (soft delete)
   * DELETE /api/admin/calendars/:id
   */
  deleteCalendar: async (req, res, next) => {
    try {
      const { id } = req.params;

      const calendar = await Calendar.findByPk(id);
      if (!calendar) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch hẹn'
        });
      }

      const oldData = calendar.toJSON();

      // Soft delete
      await calendar.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Calendar',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa lịch hẹn: ${calendar.title}`
      });

      res.json({
        success: true,
        message: 'Xóa lịch hẹn thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


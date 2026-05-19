import {
  Calendar,
  JobApplication,
  Job,
  Company,
  Collaborator
} from '../../models/index.js';
import { Op } from 'sequelize';

/**
 * Schedule Controller (CTV)
 * CTV có thể xem lịch hẹn của mình (interviews và naitei)
 */
export const scheduleController = {
  /**
   * Get schedule for CTV (interviews and naitei)
   * GET /api/ctv/calendars/schedule
   */
  getSchedule: async (req, res, next) => {
    try {
      const { month, year } = req.query;
      const collaboratorId = req.collaborator.id;

      // Validate month and year
      const currentDate = new Date();
      const queryMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
      const queryYear = year ? parseInt(year) : currentDate.getFullYear();

      // Calculate start and end of month
      const startDate = new Date(queryYear, queryMonth - 1, 1);
      const endDate = new Date(queryYear, queryMonth, 0, 23, 59, 59, 999);

      // Build where clause
      const where = {
        collaboratorId: collaboratorId,
        startAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      };

      // Get all calendars for the month
      const calendars = await Calendar.findAll({
        where,
        include: [
          {
            model: JobApplication,
            as: 'jobApplication',
            required: false,
            attributes: ['id', 'status'],
            include: [
              {
                model: Job,
                as: 'job',
                required: false,
                attributes: ['id', 'title', 'jobCode'],
                include: [
                  {
                    model: Company,
                    as: 'company',
                    required: false,
                    attributes: ['id', 'name']
                  }
                ]
              }
            ]
          }
        ],
        order: [['startAt', 'ASC']],
        paranoid: true
      });

      // Separate interviews (eventType = 1) and naitei (eventType = 2)
      const interviews = [];
      const naitei = [];

      calendars.forEach(calendar => {
        const calendarData = calendar.toJSON();
        
        // Format data for frontend
        const formattedEvent = {
          id: calendarData.id,
          name: calendarData.title,
          description: calendarData.description || '',
          interviewDate: calendarData.startAt,
          interviewTime: calendarData.startAt ? new Date(calendarData.startAt).toTimeString().slice(0, 5) : '00:00',
          naiteiDate: calendarData.eventType === 2 ? calendarData.startAt : null,
          naiteiTime: calendarData.eventType === 2 && calendarData.startAt ? new Date(calendarData.startAt).toTimeString().slice(0, 5) : null,
          role: calendarData.jobApplication?.job?.title || '',
          job: calendarData.jobApplication?.job || null,
          status: calendarData.status,
          eventType: calendarData.eventType
        };

        if (calendarData.eventType === 1) {
          // Interview
          interviews.push(formattedEvent);
        } else if (calendarData.eventType === 2) {
          // Naitei
          naitei.push(formattedEvent);
        }
      });

      res.json({
        success: true,
        data: {
          interviews,
          naitei,
          month: queryMonth,
          year: queryYear
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create calendar event for CTV
   * POST /api/ctv/calendars
   */
  createCalendar: async (req, res, next) => {
    try {
      console.log('[CTV Calendar Create] Request body:', JSON.stringify(req.body, null, 2));
      console.log('[CTV Calendar Create] Collaborator ID:', req.collaborator?.id);
      
      const {
        jobApplicationId,
        eventType = 1,
        title,
        description,
        startAt,
        endAt,
        status = 0
      } = req.body;

      const collaboratorId = req.collaborator.id;

      // Validate required fields
      if (!jobApplicationId || !title || !startAt) {
        console.log('[CTV Calendar Create] Validation failed:', { jobApplicationId, title, startAt });
        return res.status(400).json({
          success: false,
          message: 'ID đơn ứng tuyển, tiêu đề và thời gian bắt đầu là bắt buộc'
        });
      }

      // Validate job application exists and belongs to this collaborator
      const jobApplication = await JobApplication.findOne({
        where: {
          id: jobApplicationId,
          collaboratorId: collaboratorId
        }
      });

      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Đơn ứng tuyển không tồn tại hoặc không thuộc về bạn'
        });
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

      console.log('[CTV Calendar Create] Creating calendar with data:', {
        jobApplicationId,
        collaboratorId: collaboratorId,
        eventType,
        title,
        description,
        startAt: start,
        endAt: endAt ? new Date(endAt) : null,
        status
      });

      const calendar = await Calendar.create({
        jobApplicationId,
        adminId: null, // CTV không có adminId
        collaboratorId: collaboratorId,
        eventType,
        title,
        description,
        startAt: start,
        endAt: endAt ? new Date(endAt) : null,
        status
      });

      console.log('[CTV Calendar Create] Calendar created successfully:', calendar.id);

      // Tự động cập nhật trạng thái job_application dựa trên eventType
      if (eventType === 1) {
        // Phỏng vấn -> Đang xếp lịch phỏng vấn (status = 3)
        await jobApplication.update({
          status: 3,
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
            model: Collaborator,
            as: 'collaborator',
            required: false
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Tạo lịch hẹn thành công',
        data: { calendar }
      });
    } catch (error) {
      console.error('[CTV Calendar Create] Error:', error);
      console.error('[CTV Calendar Create] Error stack:', error.stack);
      next(error);
    }
  }
};


import { JobApplication, CVStorage, JobCategory, Job } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

/**
 * Dashboard Controller (CTV)
 * Cung cấp thống kê và dữ liệu cho dashboard của CTV
 */
export const dashboardController = {
  /**
   * Get dashboard overview
   * GET /api/ctv/dashboard
   */
  getDashboard: async (req, res, next) => {
    try {
      const collaboratorId = req.collaborator.id;

      // Đếm tổng số đơn ứng tuyển
      const totalApplications = await JobApplication.count({
        where: {
          collaboratorId: collaboratorId
        }
      });

      // Đếm số đơn theo từng status
      const applicationsByStatus = {};
      for (let status = 0; status <= 17; status++) {
        const count = await JobApplication.count({
          where: {
            collaboratorId: collaboratorId,
            status: status
          }
        });
        applicationsByStatus[status] = count;
      }

      // Đếm số đơn đã phỏng vấn (chỉ status = 4)
      const interviewedCount = await JobApplication.count({
        where: {
          collaboratorId: collaboratorId,
          status: 4 // Chỉ đếm status = 4 (Đang phỏng vấn)
        }
      });

      // Đếm số đơn đã được tuyển (status = 8)
      const nyushaCount = applicationsByStatus[8] || 0;

      // Đếm tổng số CV
      const totalCVs = await CVStorage.count({
        where: {
          collaboratorId: collaboratorId
        }
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalApplications,
            totalCVs,
            interviewedCount,
            nyushaCount
          },
          applicationsByStatus
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get dashboard chart data
   * GET /api/ctv/dashboard/chart
   */
  getDashboardChart: async (req, res, next) => {
    try {
      const collaboratorId = req.collaborator.id;
      const { type = 'month' } = req.query; // 'month' or 'week'

      let dateFormat, dateRange;
      if (type === 'week') {
        dateFormat = '%Y-%u'; // Year-Week
        dateRange = 12; // 12 weeks
      } else {
        dateFormat = '%Y-%m'; // Year-Month
        dateRange = 12; // 12 months
      }

      // Lấy dữ liệu đơn ứng tuyển theo thời gian
      const [results] = await sequelize.query(
        `SELECT 
          DATE_FORMAT(created_at, :dateFormat) as period,
          COUNT(*) as count
        FROM job_applications
        WHERE collaborator_id = :collaboratorId
          AND deleted_at IS NULL
          AND created_at >= DATE_SUB(NOW(), INTERVAL :dateRange ${type === 'week' ? 'WEEK' : 'MONTH'})
        GROUP BY period
        ORDER BY period ASC`,
        {
          replacements: {
            collaboratorId,
            dateFormat,
            dateRange
          },
          type: sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: {
          applications: results || []
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get job category distribution
   * GET /api/ctv/dashboard/category-distribution
   * Phân bố đơn ứng tuyển theo nhóm ngành nghề (jobCategory) mà CTV đã tiến cử, có lọc theo ngày.
   * Query: startDate, endDate (YYYY-MM-DD, optional)
   */
  getCategoryDistribution: async (req, res, next) => {
    try {
      const collaboratorId = req.collaborator.id;
      const { startDate, endDate } = req.query;

      const replacements = {
        collaboratorId
      };
      let dateCondition = '';
      if (startDate) {
        dateCondition += ' AND ja.created_at >= :startDate';
        replacements.startDate = `${startDate} 00:00:00`;
      }
      if (endDate) {
        dateCondition += ' AND ja.created_at <= :endDate';
        replacements.endDate = `${endDate} 23:59:59`;
      }

      const [results] = await sequelize.query(
        `SELECT 
          jc.id,
          jc.name,
          jc.slug,
          COUNT(ja.id) as count
        FROM job_applications ja
        INNER JOIN jobs j ON ja.job_id = j.id
        INNER JOIN job_categories jc ON j.job_category_id = jc.id
        WHERE ja.collaborator_id = :collaboratorId
          AND ja.deleted_at IS NULL
          AND j.deleted_at IS NULL
          AND jc.deleted_at IS NULL
          ${dateCondition}
        GROUP BY jc.id, jc.name, jc.slug
        ORDER BY count DESC`,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: {
          categories: results || []
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get offer and rejection statistics
   * GET /api/ctv/dashboard/offer-rejection
   * Số lượng đơn được offer (status 8, 14) và bị từ chối (status 4, 6, 10, 13, 16) theo thời gian.
   * Query: type ('month'|'week'), startDate, endDate (YYYY-MM-DD, optional – nếu có thì lọc theo khoảng ngày).
   */
  getOfferRejectionStats: async (req, res, next) => {
    try {
      const collaboratorId = req.collaborator.id;
      const { type = 'month', startDate, endDate } = req.query;

      const dateFormat = type === 'week' ? '%Y-%u' : '%Y-%m';

      let dateCondition = '';
      const replacements = {
        collaboratorId,
        dateFormat
      };
      if (startDate && endDate) {
        dateCondition = ' AND created_at >= :startDate AND created_at <= :endDate';
        replacements.startDate = `${startDate} 00:00:00`;
        replacements.endDate = `${endDate} 23:59:59`;
      } else {
        const dateRange = type === 'week' ? 12 : 6; // Mặc định 6 tháng gần nhất
        dateCondition = ` AND created_at >= DATE_SUB(NOW(), INTERVAL ${dateRange} ${type === 'week' ? 'WEEK' : 'MONTH'})`;
      }

      // Offer: status 8 (Đang chờ phỏng vấn), 14 (Đã vào công ty) – theo context “được offer”
      const [offerResults] = await sequelize.query(
        `SELECT 
          DATE_FORMAT(created_at, :dateFormat) as period,
          COUNT(*) as count
        FROM job_applications
        WHERE collaborator_id = :collaboratorId
          AND status IN (8, 14)
          AND deleted_at IS NULL
          ${dateCondition}
        GROUP BY period
        ORDER BY period ASC`,
        {
          replacements: { ...replacements },
          type: sequelize.QueryTypes.SELECT
        }
      );

      // Rejection: status 4, 6, 10, 13, 16 (trượt/từ chối/hủy)
      const [rejectionResults] = await sequelize.query(
        `SELECT 
          DATE_FORMAT(created_at, :dateFormat) as period,
          COUNT(*) as count
        FROM job_applications
        WHERE collaborator_id = :collaboratorId
          AND status IN (4, 6, 10, 13, 16)
          AND deleted_at IS NULL
          ${dateCondition}
        GROUP BY period
        ORDER BY period ASC`,
        {
          replacements: { ...replacements },
          type: sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: {
          offers: offerResults || [],
          rejections: rejectionResults || []
        }
      });
    } catch (error) {
      next(error);
    }
  }
};


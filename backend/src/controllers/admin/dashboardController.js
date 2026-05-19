import { Collaborator, Company, Job, JobApplication, PaymentRequest, CVStorage } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { JOB_APPLICATION_STATUS } from '../../constants/jobApplicationStatus.js';

// Trạng thái đơn tiến cử: success (category 'success') vs failed (rejected + cancelled)
const STATUS_SUCCESS = Object.entries(JOB_APPLICATION_STATUS)
  .filter(([, v]) => v.category === 'success')
  .map(([k]) => parseInt(k, 10));
const STATUS_FAILED = Object.entries(JOB_APPLICATION_STATUS)
  .filter(([, v]) => v.category === 'rejected' || v.category === 'cancelled')
  .map(([k]) => parseInt(k, 10));

/**
 * Thống kê dashboard admin: CTV, Jobs, Ứng tuyển, Yêu cầu thanh toán, Đơn thành công/thất bại
 * GET /api/admin/dashboard
 */
export const dashboardController = {
  getDashboard: async (req, res) => {
    try {
      const [
        collaboratorsTotal,
        collaboratorsActive,
        companiesTotal,
        jobsTotal,
        jobsPublished,
        candidatesTotal,
        applicationsTotal,
        applicationsApproved,
        paymentTotal,
        paymentPaid,
        nominationSuccess,
        nominationFailed
      ] = await Promise.all([
        Collaborator.count(),
        Collaborator.count({ where: { status: 1 } }),
        Company.count(),
        Job.count(),
        Job.count({ where: { status: 1 } }),
        CVStorage.count(),
        JobApplication.count(),
        JobApplication.count({
          where: {
            status: {
              [Op.notIn]: [1, 4, 6, 10, 13, 16]
            }
          }
        }),
        PaymentRequest.count(),
        PaymentRequest.count({ where: { status: 3 } }),
        STATUS_SUCCESS.length
          ? JobApplication.count({ where: { status: { [Op.in]: STATUS_SUCCESS } } })
          : 0,
        STATUS_FAILED.length
          ? JobApplication.count({ where: { status: { [Op.in]: STATUS_FAILED } } })
          : 0
      ]);

      return res.json({
        success: true,
        data: {
          collaborators: { total: collaboratorsTotal, active: collaboratorsActive },
          companies: { total: companiesTotal },
          jobs: { total: jobsTotal, published: jobsPublished },
          candidates: { total: candidatesTotal },
          applications: { total: applicationsTotal, approved: applicationsApproved },
          paymentRequests: { total: paymentTotal, paid: paymentPaid },
          nominationStats: { success: nominationSuccess, failed: nominationFailed }
        }
      });
    } catch (err) {
      console.error('Dashboard getDashboard error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Lỗi khi tải thống kê dashboard'
      });
    }
  },

  /**
   * Đơn tiến cử thành công/thất bại theo tháng (cho biểu đồ line)
   * GET /api/admin/dashboard/nomination-over-time?months=6
   * hoặc ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   *
   * Frontend (AdminDashboardSession4) đang mong shape:
   * {
   *   labels: [...],
   *   success: [...],
   *   failed: [...],
   *   totalSuccess,
   *   totalFailed
   * }
   * nên ở đây trả thêm các trường đó bên cạnh months/successData/failedData cũ.
   */
  getNominationOverTime: async (req, res) => {
    try {
      const { startDate: startParam, endDate: endParam, months: monthsParam } = req.query;

      let monthStarts = [];

      if (startParam && endParam) {
        const start = new Date(startParam);
        const end = new Date(endParam);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
          return res.status(400).json({
            success: false,
            message: 'startDate và endDate không hợp lệ'
          });
        }
        const rangeStart = new Date(start.getFullYear(), start.getMonth(), 1);
        const rangeEnd = new Date(end.getFullYear(), end.getMonth(), 1);
        const maxMonths = 12;
        let d = new Date(rangeStart);
        while (d <= rangeEnd && monthStarts.length < maxMonths) {
          monthStarts.push(new Date(d));
          d.setMonth(d.getMonth() + 1);
        }
      } else {
        const monthsCount = Math.min(12, Math.max(3, parseInt(monthsParam, 10) || 6));
        const end = new Date();
        const start = new Date(end.getFullYear(), end.getMonth() - monthsCount + 1, 1);
        for (let i = 0; i < monthsCount; i++) {
          monthStarts.push(new Date(start.getFullYear(), start.getMonth() + i, 1));
        }
      }

      const months = [];
      const successData = [];
      const failedData = [];

      for (let i = 0; i < monthStarts.length; i++) {
        const d = monthStarts[i];
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        months.push(`${d.getMonth() + 1}/${d.getFullYear()}`);

        const colCreated = sequelize.col('JobApplication.created_at');
        const [success, failed] = await Promise.all([
          STATUS_SUCCESS.length
            ? JobApplication.count({
                where: {
                  status: { [Op.in]: STATUS_SUCCESS },
                  [Op.and]: [
                    sequelize.where(colCreated, Op.gte, d),
                    sequelize.where(colCreated, Op.lt, next)
                  ]
                }
              })
            : 0,
          STATUS_FAILED.length
            ? JobApplication.count({
                where: {
                  status: { [Op.in]: STATUS_FAILED },
                  [Op.and]: [
                    sequelize.where(colCreated, Op.gte, d),
                    sequelize.where(colCreated, Op.lt, next)
                  ]
                }
              })
            : 0
        ]);
        successData.push(success);
        failedData.push(failed);
      }

      const totalSuccess = successData.reduce((sum, v) => sum + v, 0);
      const totalFailed = failedData.reduce((sum, v) => sum + v, 0);

      return res.json({
        success: true,
        data: {
          months,
          successData,
          failedData,
          labels: months,
          success: successData,
          failed: failedData,
          totalSuccess,
          totalFailed
        }
      });
    } catch (err) {
      console.error('Dashboard getNominationOverTime error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Lỗi khi tải dữ liệu đơn theo tháng'
      });
    }
  },

  /**
   * Số lượng job có đơn tiến cử / không có đơn tiến cử theo tháng trong năm
   * GET /api/admin/dashboard/job-nomination-by-month?year=YYYY
   */
  getJobNominationByMonth: async (req, res) => {
    try {
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();

      if (Number.isNaN(year) || year < 2000 || year > 9999) {
        return res.status(400).json({
          success: false,
          message: 'year không hợp lệ'
        });
      }

      // Tổng số job (không bị xóa) để tính "không có đơn tiến cử" tương đối
      const totalJobs = await Job.count({
        where: {
          deleted_at: null
        }
      });

      // Lấy số lượng job có ít nhất 1 đơn tiến cử trong từng tháng của năm
      // NOTE: với QueryTypes.SELECT, sequelize.query trả về trực tiếp mảng rows
      const rows = await sequelize.query(
        `
          SELECT 
            MONTH(ja.created_at) AS month,
            COUNT(DISTINCT ja.job_id) AS jobs_with_nomination
          FROM job_applications ja
          WHERE YEAR(ja.created_at) = :year
            AND ja.deleted_at IS NULL
          GROUP BY MONTH(ja.created_at)
        `,
        {
          replacements: { year },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const byMonth = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => {
        const m = parseInt(r.month, 10);
        if (!Number.isNaN(m)) {
          byMonth[m] = parseInt(r.jobs_with_nomination, 10) || 0;
        }
      });

      const labels = [];
      const withNomination = [];
      const withoutNomination = [];

      for (let m = 1; m <= 12; m++) {
        labels.push(String(m).padStart(2, '0'));
        const withCount = byMonth[m] || 0;
        const withoutCount = totalJobs > withCount ? totalJobs - withCount : 0;
        withNomination.push(withCount);
        withoutNomination.push(withoutCount);
      }

      return res.json({
        success: true,
        data: {
          year,
          labels,
          withNomination,
          withoutNomination
        }
      });
    } catch (err) {
      console.error('Dashboard getJobNominationByMonth error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Lỗi khi tải thống kê job theo đơn tiến cử'
      });
    }
  },

  /**
   * Số lượt đăng ký hệ thống (CTV) theo ngày trong tháng. Lọc theo tháng, mặc định tháng hiện tại.
   * GET /api/admin/dashboard/registrations-over-time?month=YYYY-MM
   */
  getRegistrationsOverTime: async (req, res) => {
    try {
      const monthParam = req.query.month;
      const now = new Date();
      const year = monthParam ? parseInt(monthParam.slice(0, 4), 10) : now.getFullYear();
      const month = monthParam ? parseInt(monthParam.slice(5, 7), 10) - 1 : now.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const daysInMonth = end.getDate();
      const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

      const rows = await sequelize.query(
        `SELECT DAY(created_at) as day, COUNT(*) as count
         FROM collaborators
         WHERE created_at >= :start AND created_at < DATE_ADD(:end, INTERVAL 1 DAY)
         AND deleted_at IS NULL
         GROUP BY DAY(created_at)
         ORDER BY day`,
        {
          replacements: { start, end: endDateStr },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const countByDay = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => { countByDay[r.day] = parseInt(r.count, 10); });
      const labels = [];
      const data = [];
      for (let d = 1; d <= daysInMonth; d++) {
        labels.push(String(d));
        data.push(countByDay[d] || 0);
      }

      const total = data.reduce((a, b) => a + b, 0);
      return res.json({
        success: true,
        data: {
          month: `${year}-${String(month + 1).padStart(2, '0')}`,
          labels,
          data,
          total
        }
      });
    } catch (err) {
      console.error('Dashboard getRegistrationsOverTime error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Lỗi khi tải thống kê đăng ký'
      });
    }
  },

  /**
   * Số lượt phê duyệt đăng ký (phê duyệt / chưa phê duyệt / từ chối) theo ngày trong tháng.
   * Mỗi ngày: count CTV đăng ký trong ngày đó, phân theo status hiện tại: approved (1+approvedAt), pending (1+no approvedAt), rejected (0).
   * GET /api/admin/dashboard/approvals-by-day?month=YYYY-MM
   */
  getApprovalsByDay: async (req, res) => {
    try {
      const monthParam = req.query.month;
      const now = new Date();
      const year = monthParam ? parseInt(monthParam.slice(0, 4), 10) : now.getFullYear();
      const month = monthParam ? parseInt(monthParam.slice(5, 7), 10) - 1 : now.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const daysInMonth = end.getDate();
      const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

      const rows = await sequelize.query(
        `SELECT
          DAY(created_at) as day,
          SUM(CASE WHEN status = 1 AND approved_at IS NOT NULL THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 1 AND approved_at IS NULL THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as rejected
         FROM collaborators
         WHERE created_at >= :start AND created_at < DATE_ADD(:end, INTERVAL 1 DAY)
         AND deleted_at IS NULL
         GROUP BY DAY(created_at)
         ORDER BY day`,
        {
          replacements: { start, end: endDateStr },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const byDay = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => {
        byDay[r.day] = {
          approved: parseInt(r.approved, 10) || 0,
          pending: parseInt(r.pending, 10) || 0,
          rejected: parseInt(r.rejected, 10) || 0
        };
      });

      const labels = [];
      const approved = [];
      const pending = [];
      const rejected = [];
      for (let d = 1; d <= daysInMonth; d++) {
        labels.push(String(d));
        const row = byDay[d] || { approved: 0, pending: 0, rejected: 0 };
        approved.push(row.approved);
        pending.push(row.pending);
        rejected.push(row.rejected);
      }

      return res.json({
        success: true,
        data: {
          month: `${year}-${String(month + 1).padStart(2, '0')}`,
          labels,
          approved,
          pending,
          rejected
        }
      });
    } catch (err) {
      console.error('Dashboard getApprovalsByDay error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Lỗi khi tải thống kê phê duyệt'
      });
    }
  },

  /**
   * Thống kê jobs (hot jobs, jobs có nhiều ứng tuyển) – dùng cho dashboard session 3/4
   * GET /api/admin/dashboard/job-statistics
   */
  getJobStatistics: async (req, res) => {
    try {
      const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

      const hotJobs = await Job.findAll({
        where: { isHot: true },
        attributes: ['id', 'title', 'jobCode'],
        order: [['id', 'DESC']],
        limit
      });

      const list = hotJobs.map((j) => j.toJSON());
      return res.json({
        success: true,
        data: {
          hotJobs: list,
          jobsWithMostApplications: list
        }
      });
    } catch (err) {
      console.error('Dashboard getJobStatistics error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Lỗi khi tải thống kê jobs'
      });
    }
  }
};

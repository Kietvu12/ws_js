import {
  JobApplication,
  Job,
  CVStorage,
  Collaborator,
  Admin,
  Company,
  JobCategory,
  PaymentRequest,
  JobRecruitingCompany,
  sequelize
} from '../../models/index.js';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize';
import ExcelJS from 'exceljs';
import { getJobApplicationStatus } from '../../constants/jobApplicationStatus.js';

// Status groups for reports
const STATUS_NAITEI = [11, 12];
const STATUS_NYUSHA = 14;
const STATUS_PROCESSING = [2, 3, 5, 7, 8, 9];
const STATUS_INTERVIEW = [7, 8, 9];
const PAYMENT_STATUS_PAID = 3;

/**
 * Reports Controller - Statistics and Analytics
 */
export const reportsController = {
  /**
   * Get overview KPIs for reports page
   * GET /api/admin/reports/overview?month=YYYY-MM
   */
  getOverview: async (req, res, next) => {
    try {
      let month = req.query.month;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        const d = new Date();
        month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      const [y, m] = month.split('-').map(Number);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
      const startOfPrev = new Date(y, m - 2, 1);
      const endOfPrev = new Date(y, m - 1, 0, 23, 59, 59, 999);

      const totalNewCandidates = await CVStorage.count({
        where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } }
      });
      const prevMonthCandidates = await CVStorage.count({
        where: { created_at: { [Op.between]: [startOfPrev, endOfPrev] } }
      });
      const previousMonthPercent = prevMonthCandidates > 0
        ? Math.round(((totalNewCandidates - prevMonthCandidates) / prevMonthCandidates) * 100)
        : (totalNewCandidates > 0 ? 100 : 0);

      const newNaiteiCount = await JobApplication.count({
        where: {
          status: { [Op.in]: STATUS_NAITEI },
          updated_at: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      const nyushaCountThisMonth = await JobApplication.count({
        where: {
          status: STATUS_NYUSHA,
          updated_at: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      const nyushaAppIds = await JobApplication.findAll({
        where: {
          status: STATUS_NYUSHA,
          updated_at: { [Op.between]: [startOfMonth, endOfMonth] }
        },
        attributes: ['id'],
        raw: true
      });
      const ids = nyushaAppIds.map((a) => a.id);
      const actualRevenueNextMonth = ids.length > 0
        ? await PaymentRequest.sum('amount', {
            where: {
              jobApplicationId: { [Op.in]: ids },
              status: PAYMENT_STATUS_PAID
            }
          }) || 0
        : 0;

      const projectedRevenueFromNaitei = 0;

      res.json({
        success: true,
        data: {
          totalNewCandidates,
          previousMonthPercent,
          newNaiteiCount,
          projectedRevenueFromNaitei,
          nyushaCountThisMonth,
          actualRevenueNextMonth: Number(actualRevenueNextMonth)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get top collaborators by nominations / conversion
   * GET /api/admin/reports/top-collaborators?limit=10&sortBy=conversionRate|nominations&month=YYYY-MM
   */
  getTopCollaborators: async (req, res, next) => {
    try {
      const limit = Math.min(100, parseInt(req.query.limit, 10) || 10);
      const sortBy = req.query.sortBy === 'nominations' ? 'nominations' : 'conversionRate';
      let month = req.query.month;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        const d = new Date();
        month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      const [y, m] = month.split('-').map(Number);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

      const rows = await sequelize.query(
        `SELECT
          c.id AS collaboratorId,
          c.name AS collaboratorName,
          COUNT(ja.id) AS nominations,
          SUM(CASE WHEN ja.status IN (11, 12) THEN 1 ELSE 0 END) AS naiteiCount
        FROM collaborators c
        INNER JOIN job_applications ja ON ja.collaborator_id = c.id AND ja.deleted_at IS NULL
          AND ja.created_at >= :startOfMonth AND ja.created_at <= :endOfMonth
        WHERE c.deleted_at IS NULL
        GROUP BY c.id, c.name
        HAVING COUNT(ja.id) > 0
        ORDER BY ${sortBy === 'nominations' ? 'COUNT(ja.id) DESC' : '(SUM(CASE WHEN ja.status IN (11, 12) THEN 1 ELSE 0 END) / NULLIF(COUNT(ja.id), 0)) DESC'}
        LIMIT :limit`,
        {
          replacements: { startOfMonth, endOfMonth, limit },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      const list = rows.map((r) => {
        const nominations = parseInt(r.nominations, 10) || 0;
        const naiteiCount = parseInt(r.naiteiCount, 10) || 0;
        const conversionRate = nominations > 0 ? Math.round((naiteiCount / nominations) * 100) : 0;
        return {
          collaboratorId: r.collaboratorId,
          collaboratorName: r.collaboratorName,
          nominations,
          naiteiCount,
          conversionRate
        };
      });

      res.json({ success: true, data: { list } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get nomination effectiveness statistics (Super Admin)
   * GET /api/admin/reports/nomination-effectiveness
   */
  getNominationEffectiveness: async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      
      const whereClause = {};
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
        if (endDate) whereClause.created_at[Op.lte] = new Date(endDate);
      }

      // Total revenue from nominations
      const totalRevenue = await PaymentRequest.sum('amount', {
        where: {
          status: 11, // Đã thanh toán
          ...(startDate || endDate ? {
            created_at: {
              ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
              ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
            }
          } : {})
        }
      }) || 0;

      // Applications by status
      const applicationsByStatus = await JobApplication.findAll({
        where: whereClause,
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // CV effectiveness (CVs that led to successful applications)
      const successfulApplications = await JobApplication.findAll({
        where: {
          status: { [Op.in]: [8, 11] },
          cv_code: { [Op.not]: null },
          ...(startDate || endDate ? {
            created_at: {
              ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
              ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
            }
          } : {})
        },
        attributes: ['cv_code'],
        raw: true
      });
      
      // Get distinct CV codes
      const effectiveCVCodes = [...new Set(successfulApplications.map(app => app.cv_code).filter(Boolean))];
      
      const effectiveCVs = await CVStorage.count({
        where: {
          isDuplicate: false,
          code: { [Op.in]: effectiveCVCodes },
          ...(startDate || endDate ? {
            created_at: {
              ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
              ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
            }
          } : {})
        }
      });

      // Job effectiveness - Use raw query to avoid Sequelize subquery issues
      const whereCondition = startDate || endDate 
        ? `WHERE j.created_at >= :startDate AND j.created_at <= :endDate AND j.deleted_at IS NULL`
        : `WHERE j.deleted_at IS NULL`;
      
      const jobEffectiveness = await sequelize.query(`
        SELECT 
          j.id,
          j.title,
          j.title_en AS titleEn,
          j.title_jp AS titleJp,
          j.job_code AS jobCode,
          COUNT(ja.id) AS totalApplications,
          SUM(CASE WHEN ja.status = 8 THEN 1 ELSE 0 END) AS nyushaCount,
          SUM(CASE WHEN ja.status = 11 THEN 1 ELSE 0 END) AS paidCount
        FROM jobs j
        LEFT JOIN job_applications ja ON j.id = ja.job_id AND ja.deleted_at IS NULL
        ${whereCondition}
        GROUP BY j.id, j.title, j.title_en, j.title_jp, j.job_code
        ORDER BY totalApplications DESC
        LIMIT 20
      `, {
        replacements: {
          startDate: startDate || '1970-01-01',
          endDate: endDate || new Date().toISOString()
        },
        type: Sequelize.QueryTypes.SELECT
      });

      // Job category distribution (include multilingual name for frontend)
      const categoryDistribution = await JobCategory.findAll({
        attributes: [
          'id',
          'name',
          'nameEn',
          'nameJp',
          [Sequelize.fn('COUNT', Sequelize.col('jobs.applications.id')), 'applicationCount']
        ],
        include: [{
          model: Job,
          as: 'jobs',
          required: false,
          attributes: [],
          include: [{
            model: JobApplication,
            as: 'applications',
            required: false,
            attributes: [],
            where: whereClause
          }]
        }],
        group: [Sequelize.col('JobCategory.id'), Sequelize.col('JobCategory.name'), Sequelize.col('JobCategory.name_en'), Sequelize.col('JobCategory.name_jp')],
        order: [[Sequelize.literal('applicationCount'), 'DESC']]
      });

      res.json({
        success: true,
        data: {
          totalRevenue,
          applicationsByStatus: applicationsByStatus.reduce((acc, item) => {
            acc[item.status] = parseInt(item.count);
            return acc;
          }, {}),
          effectiveCVs,
          jobEffectiveness: jobEffectiveness.map(job => ({
            id: job.id,
            title: job.title,
            titleEn: job.titleEn,
            titleJp: job.titleJp,
            jobCode: job.jobCode,
            totalApplications: parseInt(job.totalApplications || 0),
            nyushaCount: parseInt(job.nyushaCount || 0),
            paidCount: parseInt(job.paidCount || 0)
          })),
          categoryDistribution: categoryDistribution.map(cat => ({
            id: cat.id,
            name: cat.name,
            nameEn: cat.nameEn,
            nameJp: cat.nameJp,
            applicationCount: parseInt(cat.dataValues.applicationCount || 0)
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get platform operation effectiveness (Super Admin)
   * GET /api/admin/reports/platform-effectiveness
   */
  getPlatformEffectiveness: async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      
      const whereClause = {};
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
        if (endDate) whereClause.created_at[Op.lte] = new Date(endDate);
      }

      // Total collaborators
      const totalCollaborators = await Collaborator.count({
        where: whereClause
      });

      // New jobs
      const newJobs = await Job.count({
        where: whereClause
      });

      // Note: Page views, clicks, registrations would need separate tracking tables
      // For now, we'll use placeholder data structure

      res.json({
        success: true,
        data: {
          totalCollaborators,
          newJobs,
          // Placeholder for future implementation
          pageViews: 0,
          landingPageClicks: 0,
          registrations: 0,
          aiMatchingEffectiveness: {
            totalMatches: 0,
            successfulMatches: 0,
            successRate: 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get HR management effectiveness (Super Admin)
   * GET /api/admin/reports/hr-effectiveness
   */
  getHREffectiveness: async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      
      const whereClause = {};
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
        if (endDate) whereClause.created_at[Op.lte] = new Date(endDate);
      }

      // Admin performance with extended columns (filesInProcess, interviewCount, naiteiCount, nyushaCount)
      const adminPerformance = await Admin.findAll({
        attributes: [
          'id',
          'name',
          'email',
          'role',
          [Sequelize.fn('COUNT', Sequelize.col('responsibleJobApplications.id')), 'totalAssigned'],
          [Sequelize.literal(`SUM(CASE WHEN responsibleJobApplications.status IN (2, 3, 5, 7, 8, 9) THEN 1 ELSE 0 END)`), 'filesInProcess'],
          [Sequelize.literal(`SUM(CASE WHEN responsibleJobApplications.status IN (7, 8, 9) THEN 1 ELSE 0 END)`), 'interviewCount'],
          [Sequelize.literal(`SUM(CASE WHEN responsibleJobApplications.status IN (11, 12) THEN 1 ELSE 0 END)`), 'naiteiCount'],
          [Sequelize.literal(`SUM(CASE WHEN responsibleJobApplications.status = 14 THEN 1 ELSE 0 END)`), 'nyushaCount'],
          [Sequelize.literal(`SUM(CASE WHEN responsibleJobApplications.status IN (8, 11) THEN 1 ELSE 0 END)`), 'successfulApplications']
        ],
        include: [{
          model: JobApplication,
          as: 'responsibleJobApplications',
          required: false,
          attributes: [],
          where: whereClause
        }],
        group: ['Admin.id'],
        order: [[Sequelize.literal('totalAssigned'), 'DESC']]
      });

      const adminIds = adminPerformance.map((a) => a.id);
      let revenueByAdmin = {};
      if (adminIds.length > 0) {
        const revenueRows = await sequelize.query(
          `SELECT ja.admin_responsible_id AS adminId, COALESCE(SUM(pr.amount), 0) AS revenue
           FROM job_applications ja
           INNER JOIN payment_requests pr ON pr.job_application_id = ja.id AND pr.status = :paidStatus
           WHERE ja.admin_responsible_id IS NOT NULL AND ja.deleted_at IS NULL
           GROUP BY ja.admin_responsible_id`,
          { replacements: { paidStatus: PAYMENT_STATUS_PAID }, type: Sequelize.QueryTypes.SELECT }
        );
        revenueRows.forEach((r) => { revenueByAdmin[r.adminId] = Number(r.revenue); });
      }

      const dateRange = startDate && endDate
        ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        : 30;

      const avgApplicationsPerDay = adminPerformance.map(admin => ({
        adminId: admin.id,
        adminName: admin.name,
        totalAssigned: parseInt(admin.dataValues.totalAssigned || 0),
        avgPerDay: (parseInt(admin.dataValues.totalAssigned || 0) / dateRange).toFixed(2)
      }));

      const totalAssignments = await JobApplication.count({
        where: {
          ...whereClause,
          admin_id: { [Op.not]: null }
        }
      });

      const uniqueAdminsResult = await JobApplication.findAll({
        where: {
          ...whereClause,
          admin_id: { [Op.not]: null },
          admin_responsible_id: { [Op.not]: null }
        },
        attributes: ['admin_responsible_id'],
        raw: true
      });
      const uniqueAdmins = [...new Set(uniqueAdminsResult.map(item => item.admin_responsible_id).filter(Boolean))].length;
      const superAdminAssignments = { totalAssignments, uniqueAdmins };

      res.json({
        success: true,
        data: {
          adminPerformance: adminPerformance.map(admin => ({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            totalAssigned: parseInt(admin.dataValues.totalAssigned || 0),
            successfulApplications: parseInt(admin.dataValues.successfulApplications || 0),
            filesInProcess: parseInt(admin.dataValues.filesInProcess || 0),
            interviewCount: parseInt(admin.dataValues.interviewCount || 0),
            naiteiCount: parseInt(admin.dataValues.naiteiCount || 0),
            nyushaCount: parseInt(admin.dataValues.nyushaCount || 0),
            revenue: revenueByAdmin[admin.id] || 0
          })),
          avgApplicationsPerDay,
          superAdminAssignments
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get admin's own performance report (Regular Admin)
   * GET /api/admin/reports/my-performance
   */
  getMyPerformance: async (req, res, next) => {
    try {
      const adminId = req.admin.id;
      const { startDate, endDate, status } = req.query;
      
      const whereClause = {
        adminResponsibleId: adminId
      };
      
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
        if (endDate) whereClause.created_at[Op.lte] = new Date(endDate);
      }

      if (status) {
        whereClause.status = parseInt(status);
      }

      // Total revenue
      const totalRevenue = await PaymentRequest.sum('amount', {
        include: [{
          model: JobApplication,
          as: 'jobApplication',
          where: whereClause,
          required: true
        }],
        where: {
          status: 11 // Đã thanh toán
        }
      }) || 0;

      // Applications by status
      const applicationsByStatus = await JobApplication.findAll({
        where: whereClause,
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Processing speed (average time from created to updated)
      const processingSpeed = await JobApplication.findAll({
        where: whereClause,
        attributes: [
          [Sequelize.fn('AVG', Sequelize.literal(`TIMESTAMPDIFF(HOUR, created_at, updated_at)`)), 'avgHours']
        ],
        raw: true
      });

      // All applications for export
      const allApplications = await JobApplication.findAll({
        where: whereClause,
        include: [{
          model: Job,
          as: 'job',
          required: false,
          attributes: ['id', 'title', 'jobCode']
        }, {
          model: CVStorage,
          as: 'cv',
          required: false,
          attributes: ['id', 'code', 'name']
        }],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          totalRevenue,
          applicationsByStatus: applicationsByStatus.reduce((acc, item) => {
            acc[item.status] = parseInt(item.count);
            return acc;
          }, {}),
          avgProcessingHours: processingSpeed[0]?.avgHours ? parseFloat(processingSpeed[0].avgHours).toFixed(2) : 0,
          totalApplications: allApplications.length,
          applications: allApplications.map(app => ({
            id: app.id,
            jobTitle: app.job?.title,
            jobCode: app.job?.jobCode,
            candidateName: app.cv?.name,
            candidateCode: app.cv?.code,
            status: app.status,
            createdAt: app.created_at,
            updatedAt: app.updated_at
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Export monthly report to Excel (3 sheets: Tổng hợp, Chi tiết ứng viên, Hiệu suất)
   * GET /api/admin/reports/export-excel?month=YYYY-MM
   */
  exportExcel: async (req, res, next) => {
    try {
      let month = req.query.month;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        const d = new Date();
        month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      const [y, m] = month.split('-').map(Number);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
      const monthStart = `${month}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

      // --- Overview (reuse getOverview logic) ---
      const startOfPrev = new Date(y, m - 2, 1);
      const endOfPrev = new Date(y, m - 1, 0, 23, 59, 59, 999);
      const totalNewCandidates = await CVStorage.count({
        where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } }
      });
      const prevMonthCandidates = await CVStorage.count({
        where: { created_at: { [Op.between]: [startOfPrev, endOfPrev] } }
      });
      const previousMonthPercent = prevMonthCandidates > 0
        ? Math.round(((totalNewCandidates - prevMonthCandidates) / prevMonthCandidates) * 100)
        : (totalNewCandidates > 0 ? 100 : 0);
      const newNaiteiCount = await JobApplication.count({
        where: {
          status: { [Op.in]: STATUS_NAITEI },
          updated_at: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });
      const nyushaCountThisMonth = await JobApplication.count({
        where: {
          status: STATUS_NYUSHA,
          updated_at: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });
      const nyushaAppIds = await JobApplication.findAll({
        where: {
          status: STATUS_NYUSHA,
          updated_at: { [Op.between]: [startOfMonth, endOfMonth] }
        },
        attributes: ['id'],
        raw: true
      });
      const ids = nyushaAppIds.map((a) => a.id);
      const actualRevenueNextMonth = ids.length > 0
        ? await PaymentRequest.sum('amount', {
            where: {
              jobApplicationId: { [Op.in]: ids },
              status: PAYMENT_STATUS_PAID
            }
          }) || 0
        : 0;
      const projectedRevenueFromNaitei = 0;

      // --- Candidate details (Sheet 2) ---
      const applications = await JobApplication.findAll({
        where: {
          created_at: { [Op.between]: [startOfMonth, endOfMonth] }
        },
        attributes: ['id', 'status', 'nyushaDate', 'cvCode'],
        include: [
          { model: Collaborator, as: 'collaborator', required: false, attributes: ['name'] },
          { model: Admin, as: 'adminResponsible', required: false, attributes: ['name'] },
          { model: CVStorage, as: 'cv', required: false, attributes: ['name'] },
          {
            model: PaymentRequest,
            as: 'paymentRequests',
            required: false,
            attributes: ['amount'],
            where: { status: PAYMENT_STATUS_PAID }
          }
        ],
        order: [['id', 'ASC']]
      });

      const candidateRows = applications.map((ja) => {
        const totalPaid = (ja.paymentRequests && ja.paymentRequests.length)
          ? ja.paymentRequests.reduce((s, pr) => s + Number(pr.amount || 0), 0)
          : '';
        return {
          id: ja.id,
          candidateName: (ja.cv && ja.cv.name) ? ja.cv.name : (ja.cvCode || '—'),
          collaboratorName: (ja.collaborator && ja.collaborator.name) ? ja.collaborator.name : '—',
          adminName: (ja.adminResponsible && ja.adminResponsible.name) ? ja.adminResponsible.name : '—',
          statusLabel: getJobApplicationStatus(ja.status).label,
          naiteiDate: '', // DB không có cột naitei_date
          nyushaDate: ja.nyushaDate ? String(ja.nyushaDate) : '',
          serviceFee: totalPaid
        };
      });

      // --- HR effectiveness (Sheet 3) ---
      const whereClause = {
        created_at: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth }
      };
      const adminPerformance = await Admin.findAll({
        attributes: [
          'id',
          'name',
          [Sequelize.fn('COUNT', Sequelize.col('responsibleJobApplications.id')), 'totalAssigned'],
          [Sequelize.literal(`SUM(CASE WHEN responsibleJobApplications.status IN (7, 8, 9) THEN 1 ELSE 0 END)`), 'interviewCount'],
          [Sequelize.literal(`SUM(CASE WHEN responsibleJobApplications.status IN (11, 12) THEN 1 ELSE 0 END)`), 'naiteiCount'],
          [Sequelize.literal(`SUM(CASE WHEN responsibleJobApplications.status = 14 THEN 1 ELSE 0 END)`), 'nyushaCount']
        ],
        include: [{
          model: JobApplication,
          as: 'responsibleJobApplications',
          required: false,
          attributes: [],
          where: whereClause
        }],
        group: ['Admin.id']
      });
      const adminIds = adminPerformance.map((a) => a.id);
      let revenueByAdmin = {};
      if (adminIds.length > 0) {
        const revenueRows = await sequelize.query(
          `SELECT ja.admin_responsible_id AS adminId, COALESCE(SUM(pr.amount), 0) AS revenue
           FROM job_applications ja
           INNER JOIN payment_requests pr ON pr.job_application_id = ja.id AND pr.status = :paidStatus
           WHERE ja.admin_responsible_id IN (:adminIds) AND ja.deleted_at IS NULL
           AND ja.created_at >= :startDate AND ja.created_at <= :endDate
           GROUP BY ja.admin_responsible_id`,
          {
            replacements: {
              paidStatus: PAYMENT_STATUS_PAID,
              adminIds,
              startDate: startOfMonth,
              endDate: endOfMonth
            },
            type: Sequelize.QueryTypes.SELECT
          }
        );
        revenueRows.forEach((r) => { revenueByAdmin[r.adminId] = Number(r.revenue); });
      }
      const dateRange = lastDay;
      const performanceRows = adminPerformance.map((admin) => ({
        adminName: admin.name || '—',
        totalAssigned: parseInt(admin.dataValues.totalAssigned || 0, 10),
        avgProcessingTime: dateRange > 0
          ? (parseInt(admin.dataValues.totalAssigned || 0, 10) / dateRange).toFixed(2) + ' hồ sơ/ngày'
          : '—',
        revenue: revenueByAdmin[admin.id] || 0
      }));

      // --- Build workbook ---
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'JobShare';
      workbook.created = new Date();

      // Sheet 1 - Tổng hợp (bảng thông số + biểu đồ)
      const sheet1 = workbook.addWorksheet('Tổng hợp', { pageSetup: { fitToPage: true } });
      sheet1.columns = [
        { header: 'Chỉ số', width: 42 },
        { header: 'Giá trị', width: 22 }
      ];
      // Tiêu đề
      const titleRow = sheet1.addRow([`Báo cáo tháng ${month}`, '']);
      titleRow.font = { bold: true, size: 12 };
      sheet1.addRow([]);
      // Bảng thông số (header)
      const headerRow = sheet1.addRow(['Chỉ số', 'Giá trị']);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
      };
      sheet1.addRow(['Tổng ứng viên mới', totalNewCandidates]);
      sheet1.addRow(['So với tháng trước (%)', previousMonthPercent != null ? previousMonthPercent + '%' : '—']);
      sheet1.addRow(['Số Naitei mới (tháng)', newNaiteiCount]);
      sheet1.addRow(['Doanh thu dự kiến (Từ Naitei)', projectedRevenueFromNaitei]);
      sheet1.addRow(['Số Nyusha (Tháng này)', nyushaCountThisMonth]);
      sheet1.addRow(['Doanh thu thực nhận (Cuối tháng sau)', Number(actualRevenueNextMonth)]);
      sheet1.addRow([]);
      sheet1.addRow(['(Dữ liệu cho biểu đồ — chọn vùng dưới đây và chèn biểu đồ trong Excel nếu cần)', '']);
      sheet1.addRow(['UV mới', totalNewCandidates]);
      sheet1.addRow(['Naitei mới', newNaiteiCount]);
      sheet1.addRow(['Nyusha', nyushaCountThisMonth]);
      sheet1.addRow(['Doanh thu dự kiến', projectedRevenueFromNaitei]);
      sheet1.addRow(['Doanh thu thực nhận', Number(actualRevenueNextMonth)]);
      // Biểu đồ cột (ảnh từ QuickChart) — đặt bên phải bảng
      const chartConfig = {
        type: 'bar',
        data: {
          labels: ['UV mới', 'Naitei', 'Nyusha', 'DT dự kiến (tr)', 'DT thực (tr)'],
          datasets: [{
            label: `Tháng ${month}`,
            data: [
              totalNewCandidates,
              newNaiteiCount,
              nyushaCountThisMonth,
              Math.round(Number(projectedRevenueFromNaitei) / 1000) / 1000,
              Math.round(Number(actualRevenueNextMonth) / 1000) / 1000
            ],
            backgroundColor: ['#6366f1', '#8b5cf6', '#a855f7', '#6366f1', '#22c55e']
          }]
        },
        options: {
          title: { display: true, text: 'Chỉ số tổng quan' },
          legend: { display: false },
          scales: {
            yAxes: [{ ticks: { beginAtZero: true } }]
          }
        }
      };
      try {
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=420&height=260`;
        const chartRes = await fetch(chartUrl);
        if (chartRes.ok) {
          const arrayBuffer = await chartRes.arrayBuffer();
          const imageBuffer = Buffer.from(arrayBuffer);
          const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
          sheet1.addImage(imageId, {
            tl: { col: 2, row: 0 },
            ext: { width: 420, height: 260 },
            editAs: 'oneCell'
          });
        }
      } catch (chartErr) {
        console.warn('[Reports exportExcel] Chart image failed:', chartErr.message);
      }

      // Sheet 2 - Chi tiết ứng viên
      const sheet2 = workbook.addWorksheet('Chi tiết ứng viên', { pageSetup: { fitToPage: true } });
      sheet2.columns = [
        { header: 'ID', width: 12 },
        { header: 'Tên UV', width: 25 },
        { header: 'CTV', width: 20 },
        { header: 'Admin phụ trách', width: 20 },
        { header: 'Trạng thái', width: 35 },
        { header: 'Ngày Naitei', width: 14 },
        { header: 'Ngày Nyusha', width: 14 },
        { header: 'Phí dịch vụ', width: 16 }
      ];
      sheet2.getRow(1).font = { bold: true };
      candidateRows.forEach((row) => {
        sheet2.addRow([
          row.id,
          row.candidateName,
          row.collaboratorName,
          row.adminName,
          row.statusLabel,
          row.naiteiDate,
          row.nyushaDate,
          row.serviceFee
        ]);
      });

      // Sheet 3 - Hiệu suất
      const sheet3 = workbook.addWorksheet('Hiệu suất', { pageSetup: { fitToPage: true } });
      sheet3.columns = [
        { header: 'Tên Admin', width: 25 },
        { header: 'Số hồ sơ', width: 14 },
        { header: 'Thời gian xử lý TB', width: 22 },
        { header: 'Doanh thu', width: 16 }
      ];
      sheet3.getRow(1).font = { bold: true };
      performanceRows.forEach((row) => {
        sheet3.addRow([row.adminName, row.totalAssigned, row.avgProcessingTime, row.revenue]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `Bao-cao-${month}.xlsx`;
      res.setHeader('Content-Type', 'application/Y.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(Buffer.from(buffer));
    } catch (error) {
      next(error);
    }
  }
};


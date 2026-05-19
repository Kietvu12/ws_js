import {
  JobApplication,
  Job,
  JobCategory,
  Company,
  JobRecruitingCompany,
  Collaborator,
  Applicant,
  CVStorage,
  ActionLog,
  PaymentRequest,
  Admin,
  CollaboratorAssignment,
  JobApplicationMemo,
  Message
} from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { statusMessageService } from '../../services/statusMessageService.js';
import { STATUS_JOINED_COMPANY, STATUS_PAID, STATUS_DUPLICATE, STATUSES_ENDED, STATUSES_ACTIVE_BLOCK_DUPLICATE } from '../../constants/jobApplicationStatus.js';
import { canCVBeNominated, CV_STATUS_DUPLICATE } from '../../constants/cvStatus.js';
import { collaboratorNotificationService } from '../../services/collaboratorNotificationService.js';
import { nominationEmailService } from '../../services/nominationEmailService.js';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'appliedAt': 'applied_at',
    'interviewDate': 'interview_date',
    'nyushaDate': 'nyusha_date'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Kiểm tra xem AdminBackOffice có quyền với job application này không.
 * Ưu tiên:
 * - SuperAdmin: luôn true
 * - AdminBackOffice:
 *   + Nếu là adminResponsibleId của đơn → true
 *   + Hoặc được phân công xử lý hồ sơ CV tương ứng (collaborator_assignments.cv_storage_id)
 */
const checkAdminBackOfficePermission = async (admin, jobApplication) => {
  // SuperAdmin (role = 1) có quyền tất cả
  if (admin.role === 1) {
    return true;
  }

  // AdminBackOffice (role = 2)
  if (admin.role === 2) {
    // Nếu là admin phụ trách đơn này thì có toàn quyền
    if (jobApplication.adminResponsibleId && jobApplication.adminResponsibleId === admin.id) {
      return true;
    }

    // Nếu không có cvCode thì không thể kiểm tra phân công hồ sơ
    if (!jobApplication.cvCode) {
      return false;
    }

    // Tìm CVStorage theo code
    const cv = await CVStorage.findOne({
      where: { code: jobApplication.cvCode },
      attributes: ['id']
    });

    if (!cv) {
      return false;
    }

    // Kiểm tra xem hồ sơ này có assignment active cho admin không
    const assignment = await CollaboratorAssignment.findOne({
      where: {
        cvStorageId: cv.id,
        adminId: admin.id,
        status: 1 // Active assignment
      }
    });

    return assignment !== null;
  }

  // Các role khác không có quyền
  return false;
};

const INTERVIEW_STATUSES = new Set([8]);
const FAILED_STATUSES = new Set(STATUSES_ENDED);
const STATUS_HAS_NAITEI = 11;
const STATUS_ACCEPTED_NAITEI = 12;
const STATUS_JOINED = 14;

const sendInterviewEmailIfNeeded = async (jobApplicationId, status) => {
  const nextStatus = Number(status);
  if (!INTERVIEW_STATUSES.has(nextStatus)) return;

  const fullJobApplication = await JobApplication.findByPk(jobApplicationId, {
    include: [
      { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp'] },
      { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'name', 'code'] },
      { model: Collaborator, as: 'collaborator', required: false, attributes: ['id', 'email'] }
    ]
  });

  if (!fullJobApplication?.collaborator?.email) return;

  await nominationEmailService.sendInterviewScheduledEmail({
    to: fullJobApplication.collaborator.email,
    jobApplicationId: fullJobApplication.id,
    jobCode: fullJobApplication.job?.jobCode || String(fullJobApplication.id),
    candidateName: fullJobApplication.cv?.name || null,
    jobTitleVi: fullJobApplication.job?.title || null,
    jobTitleEn: fullJobApplication.job?.titleEn || fullJobApplication.job?.title_en || null,
    jobTitleJp: fullJobApplication.job?.titleJp || fullJobApplication.job?.title_jp || null,
    interviewDate: fullJobApplication.interviewDate || null
  });
};

const sendFailedEmailIfNeeded = async (jobApplicationId, status, rejectReason = null) => {
  const nextStatus = Number(status);
  if (!FAILED_STATUSES.has(nextStatus)) return;

  const fullJobApplication = await JobApplication.findByPk(jobApplicationId, {
    include: [
      { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp'] },
      { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'name', 'code'] },
      { model: Collaborator, as: 'collaborator', required: false, attributes: ['id', 'email'] }
    ]
  });

  if (!fullJobApplication?.collaborator?.email) return;

  await nominationEmailService.sendNominationFailedEmail({
    to: fullJobApplication.collaborator.email,
    jobApplicationId: fullJobApplication.id,
    jobCode: fullJobApplication.job?.jobCode || String(fullJobApplication.id),
    candidateName: fullJobApplication.cv?.name || null,
    jobTitleVi: fullJobApplication.job?.title || null,
    jobTitleEn: fullJobApplication.job?.titleEn || fullJobApplication.job?.title_en || null,
    jobTitleJp: fullJobApplication.job?.titleJp || fullJobApplication.job?.title_jp || null,
    rejectReason: rejectReason || fullJobApplication.rejectNote || null
  });
};

const sendJobOfferEmailIfNeeded = async (jobApplicationId, status) => {
  const nextStatus = Number(status);
  if (nextStatus !== STATUS_HAS_NAITEI) return;

  const fullJobApplication = await JobApplication.findByPk(jobApplicationId, {
    include: [
      { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp'] },
      { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'name', 'code'] },
      { model: Collaborator, as: 'collaborator', required: false, attributes: ['id', 'email'] }
    ]
  });

  if (!fullJobApplication?.collaborator?.email) return;

  await nominationEmailService.sendJobOfferEmail({
    to: fullJobApplication.collaborator.email,
    jobApplicationId: fullJobApplication.id,
    jobCode: fullJobApplication.job?.jobCode || String(fullJobApplication.id),
    candidateName: fullJobApplication.cv?.name || null,
    jobTitleVi: fullJobApplication.job?.title || null,
    jobTitleEn: fullJobApplication.job?.titleEn || fullJobApplication.job?.title_en || null,
    jobTitleJp: fullJobApplication.job?.titleJp || fullJobApplication.job?.title_jp || null
  });
};

const sendOfferAcceptedEmailIfNeeded = async (jobApplicationId, status) => {
  const nextStatus = Number(status);
  if (nextStatus !== STATUS_ACCEPTED_NAITEI) return;

  const fullJobApplication = await JobApplication.findByPk(jobApplicationId, {
    include: [
      { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp'] },
      { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'name', 'code'] },
      { model: Collaborator, as: 'collaborator', required: false, attributes: ['id', 'email'] }
    ]
  });

  if (!fullJobApplication?.collaborator?.email) return;

  await nominationEmailService.sendOfferAcceptedEmail({
    to: fullJobApplication.collaborator.email,
    jobApplicationId: fullJobApplication.id,
    jobCode: fullJobApplication.job?.jobCode || String(fullJobApplication.id),
    candidateName: fullJobApplication.cv?.name || null,
    jobTitleVi: fullJobApplication.job?.title || null,
    jobTitleEn: fullJobApplication.job?.titleEn || fullJobApplication.job?.title_en || null,
    jobTitleJp: fullJobApplication.job?.titleJp || fullJobApplication.job?.title_jp || null
  });
};

const sendJoinedCompanyEmailIfNeeded = async (jobApplicationId, status) => {
  const nextStatus = Number(status);
  if (nextStatus !== STATUS_JOINED) return;

  const fullJobApplication = await JobApplication.findByPk(jobApplicationId, {
    include: [
      { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp'] },
      { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'name', 'code'] },
      { model: Collaborator, as: 'collaborator', required: false, attributes: ['id', 'email'] }
    ]
  });

  if (!fullJobApplication?.collaborator?.email) return;

  await nominationEmailService.sendJoinedCompanyEmail({
    to: fullJobApplication.collaborator.email,
    jobApplicationId: fullJobApplication.id,
    jobCode: fullJobApplication.job?.jobCode || String(fullJobApplication.id),
    candidateName: fullJobApplication.cv?.name || null,
    jobTitleVi: fullJobApplication.job?.title || null,
    jobTitleEn: fullJobApplication.job?.titleEn || fullJobApplication.job?.title_en || null,
    jobTitleJp: fullJobApplication.job?.titleJp || fullJobApplication.job?.title_jp || null,
    startDate: fullJobApplication.nyushaDate || null
  });
};

/**
 * Job Application Management Controller (Admin)
 */
export const jobApplicationController = {
  /**
   * Get list of job applications
   * GET /api/admin/job-applications
   */
  getJobApplications: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        jobId,
        collaboratorId,
        cvCode,
        cvId,
        appliedFrom,
        appliedTo,
        interviewFrom,
        interviewTo,
        nyushaFrom,
        nyushaTo,
        adminResponsibleId,
        cvStorageStatus,
        sortBy = 'id',
        sortOrder = 'ASC'
      } = req.query;

      let cvStorageStatusFilter;
      if (cvStorageStatus !== undefined && cvStorageStatus !== '') {
        const n = parseInt(cvStorageStatus, 10);
        if (!Number.isNaN(n)) cvStorageStatusFilter = n;
      }
      const cvIncludeAttrs = ['id', 'code', 'name', 'email', 'status'];
      const cvIncludeExtra = cvStorageStatusFilter !== undefined
        ? { required: true, where: { status: cvStorageStatusFilter } }
        : { required: false };

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by job
      if (jobId) {
        where.jobId = parseInt(jobId);
      }

      // Filter by collaborator
      if (collaboratorId) {
        where.collaboratorId = parseInt(collaboratorId);
      }

      // Filter by CV (ứng viên) – dùng cho trang Danh sách ứng tuyển của Admin
      if (cvCode) {
        where.cvCode = cvCode;
      }
      if (cvId && !cvCode) {
        const cv = await CVStorage.findByPk(cvId, { attributes: ['code'] });
        if (cv?.code) where.cvCode = cv.code;
      }

      // Filter by admin responsible (phân công đơn cho AdminBackOffice)
      // Chỉ lọc khi có query adminResponsibleId; mặc định cho phép AdminBackOffice xem toàn bộ
      if (adminResponsibleId) {
        where.adminResponsibleId = parseInt(adminResponsibleId);
      }

      // Filter by applied date
      if (appliedFrom || appliedTo) {
        where.applied_at = {};
        if (appliedFrom) {
          where.applied_at[Op.gte] = new Date(appliedFrom);
        }
        if (appliedTo) {
          where.applied_at[Op.lte] = new Date(appliedTo);
        }
      }

      // Filter by interview date
      if (interviewFrom || interviewTo) {
        where.interview_date = {};
        if (interviewFrom) {
          where.interview_date[Op.gte] = new Date(interviewFrom);
        }
        if (interviewTo) {
          where.interview_date[Op.lte] = new Date(interviewTo);
        }
      }

      // Filter by nyusha date
      if (nyushaFrom || nyushaTo) {
        where.nyusha_date = {};
        if (nyushaFrom) {
          where.nyusha_date[Op.gte] = nyushaFrom;
        }
        if (nyushaTo) {
          where.nyusha_date[Op.lte] = nyushaTo;
        }
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'status', 'appliedAt', 'interviewDate', 'nyushaDate', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const includeOptions = [
        {
          model: Job,
          as: 'job',
          required: false,
          attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp', 'slug'],
          include: [{
            model: JobRecruitingCompany,
            as: 'recruitingCompany',
            required: false,
            attributes: ['id', 'companyName', 'companyNameEn', 'companyNameJp']
          }]
        },
        {
          model: Collaborator,
          as: 'collaborator',
          required: false,
          attributes: ['id', 'name', 'email', 'code']
        },
        {
          model: Admin,
          as: 'admin',
          required: false,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Admin,
          as: 'adminResponsible',
          required: false,
          attributes: ['id', 'name', 'email']
        },
        {
          model: CVStorage,
          as: 'cv',
          attributes: cvIncludeAttrs,
          ...cvIncludeExtra
        }
      ];

      // Search by CV name, email, phone, or job title/code
      if (search) {
        const cvIndex = includeOptions.findIndex(item => item.as === 'cv');
        if (cvIndex !== -1) {
          includeOptions[cvIndex] = {
            model: CVStorage,
            as: 'cv',
            attributes: cvIncludeAttrs,
            ...cvIncludeExtra
          };
        }

        const jobIndex = includeOptions.findIndex(item => item.as === 'job');

        const searchLike = `%${search}%`;
        const cvWhere = {
          [Op.or]: [
            { name: { [Op.like]: searchLike } },
            { email: { [Op.like]: searchLike } },
            { phone: { [Op.like]: searchLike } },
            { code: { [Op.like]: searchLike } }
          ],
          ...(cvStorageStatusFilter !== undefined ? { status: cvStorageStatusFilter } : {})
        };

        const jobWhere = {
          [Op.or]: [
            { title: { [Op.like]: searchLike } },
            { titleEn: { [Op.like]: searchLike } },
            { titleJp: { [Op.like]: searchLike } },
            { jobCode: { [Op.like]: searchLike } }
          ]
        };

        // Use subquery to find matching job application IDs first, then fetch with all includes
        const cvMatches = await CVStorage.findAll({
          where: cvWhere,
          attributes: ['id'],
          raw: true
        });
        const cvIds = cvMatches.map(c => c.id);

        const jobMatches = await Job.findAll({
          where: jobWhere,
          attributes: ['id'],
          raw: true
        });
        const jobIds = jobMatches.map(j => j.id);

        const searchConditions = [];
        if (cvIds.length > 0) searchConditions.push({ cvId: { [Op.in]: cvIds } });
        if (jobIds.length > 0) searchConditions.push({ jobId: { [Op.in]: jobIds } });

        // Also search by job application id if search is numeric
        const searchNum = parseInt(search, 10);
        if (!Number.isNaN(searchNum)) searchConditions.push({ id: searchNum });

        if (searchConditions.length > 0) {
          where[Op.or] = searchConditions;
        } else {
          where.id = { [Op.eq]: -1 };
        }
      }

      const { count, rows } = await JobApplication.findAndCountAll({
        where,
        include: includeOptions,
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      res.json({
        success: true,
        data: {
          jobApplications: rows,
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
   * Get job application by ID
   * GET /api/admin/job-applications/:id
   */
  getJobApplicationById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const jobApplication = await JobApplication.findByPk(id, {
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            include: [
              {
                model: JobCategory,
                as: 'category',
                required: false
              },
              {
                model: Company,
                as: 'company',
                required: false
              },
              {
                model: JobRecruitingCompany,
                as: 'recruitingCompany',
                required: false
              }
            ]
          },
          {
            model: Collaborator,
            as: 'collaborator',
            required: false
          },
          {
            model: Applicant,
            as: 'applicant',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: Admin,
            as: 'admin',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: Admin,
            as: 'adminResponsible',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: CVStorage,
            as: 'cv',
            required: false
          }
        ]
      });

      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển'
        });
      }

      res.json({
        success: true,
        data: { jobApplication }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new job application
   * POST /api/admin/job-applications
   */
  createJobApplication: async (req, res, next) => {
    try {
      const {
        jobId,
        collaboratorId,
        title,
        status = 2,
        cvCode,
        cvPath: bodyCvPath,
        monthlySalary,
        appliedAt,
        interviewDate,
        interviewRound2Date,
        nyushaDate,
        expectedPaymentDate,
        rejectNote
      } = req.body;

      // Validate required fields
      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'ID việc làm là bắt buộc'
        });
      }

      // Validate job exists
      const job = await Job.findByPk(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Việc làm không tồn tại'
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

      // Validate CV if provided (must not be duplicate)
      let selectedCvPath = null;
      let selectedCvId = null;
      if (cvCode) {
        const cv = await CVStorage.findOne({ where: { code: cvCode } });
        if (!cv) {
          return res.status(404).json({
            success: false,
            message: 'CV không tồn tại'
          });
        }
        selectedCvId = cv.id;
        
        // Check if CV can be nominated (không trùng, không quá hạn, không archived)
        if (!canCVBeNominated(cv.status)) {
          return res.status(400).json({
            success: false,
            message: cv.status === 3 ? 'CV này bị trùng với CV đã tồn tại, không thể dùng để tạo đơn ứng tuyển' : 'CV này không thể dùng để tạo đơn ứng tuyển'
          });
        }

        const normalizePath = (value) => String(value || '').replace(/\\/g, '/').trim().replace(/\/+$/, '');
        const normalizedBodyPath = bodyCvPath && typeof bodyCvPath === 'string'
          ? normalizePath(bodyCvPath)
          : '';
        if (normalizedBodyPath.length > 0) {
          const originalBasePath = normalizePath(cv.cvOriginalPath);
          const templateBasePath = normalizePath(cv.curriculumVitae);
          const allowedTemplateBasePaths = ['Common', 'IT', 'Technical']
            .map((tpl) => `${templateBasePath}/${tpl}`)
            .filter(Boolean);
          const isOriginalPath = !!originalBasePath && (
            normalizedBodyPath === originalBasePath || normalizedBodyPath.startsWith(`${originalBasePath}/`)
          );
          const isTemplatePath = !!templateBasePath && (
            normalizedBodyPath === templateBasePath ||
            normalizedBodyPath.startsWith(`${templateBasePath}/`) ||
            allowedTemplateBasePaths.some((p) => normalizedBodyPath === p || normalizedBodyPath.startsWith(`${p}/`))
          );
          if (!isOriginalPath && !isTemplatePath) {
            return res.status(400).json({
              success: false,
              message: 'Đường dẫn CV không hợp lệ hoặc không thuộc hồ sơ này'
            });
          }
          selectedCvPath = normalizedBodyPath;
        }
      }

      // Chặn tạo đơn trùng: cùng CV + cùng job đang ở trạng thái xử lý (2,3,5,7,8,9)
      if (selectedCvId) {
        const activeExisting = await JobApplication.findOne({
          where: {
            jobId,
            cvId: selectedCvId,
            status: { [Op.in]: STATUSES_ACTIVE_BLOCK_DUPLICATE }
          }
        });
        if (activeExisting) {
          return res.status(400).json({
            success: false,
            message: 'Đơn tiến cử cho ứng viên này với công việc này đã tồn tại và đang được xử lý. Không thể tạo lại.'
          });
        }
      }

      // Trùng hồ sơ: đã có đơn cùng ứng viên (cvCode) + cùng job mà đơn đó chưa kết thúc → tạo đơn với status 1 (Hồ sơ trùng)
      let statusToUse = status;
      if (selectedCvId) {
        const existing = await JobApplication.findOne({
          where: {
            jobId,
            cvId: selectedCvId,
            status: { [Op.notIn]: STATUSES_ENDED }
          }
        });
        if (existing) {
          statusToUse = STATUS_DUPLICATE; // 1 - Hồ sơ trùng
        }
      }

      // Logic phân biệt adminId và adminResponsibleId:
      // - adminId: ID của admin tạo đơn (tương ứng với CTV thuộc admin đó) - chỉ set khi CTV tự tạo đơn và admin quản lý CTV đó
      // - adminResponsibleId: ID của admin phụ trách (khi admin tạo đơn từ trang admin, có thể có hoặc không có collaboratorId)
      // 
      // Khi AdminBackOffice tạo đơn từ trang AddNominationPage (/api/admin/job-applications):
      // - Luôn set adminResponsibleId = req.admin.id (admin phụ trách tạo đơn)
      // - adminId = null (không phải admin tạo đơn cho CTV của mình)
      // - collaboratorId có thể có hoặc không (tùy vào việc có chọn CTV hay không)
      const adminIdValue = null; // Admin tạo đơn từ trang admin không set adminId
      const adminResponsibleIdValue = req.admin?.id || null; // Luôn set admin phụ trách

      const jobApplication = await JobApplication.create({
        jobId,
        collaboratorId: collaboratorId || null,
        adminId: adminIdValue,
        adminResponsibleId: adminResponsibleIdValue,
        title,
        status: statusToUse,
        cvId: selectedCvId,
        cvCode: cvCode || null,
        cvPath: selectedCvPath,
        monthlySalary,
        appliedAt: appliedAt || new Date(),
        interviewDate,
        interviewRound2Date,
        nyushaDate,
        expectedPaymentDate,
        rejectNote
      });

      // Reload with relations
      await jobApplication.reload({
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
          },
          {
            model: Admin,
            as: 'admin',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: Admin,
            as: 'adminResponsible',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: CVStorage,
            as: 'cv',
            required: false
          }
        ]
      });

      // Tạo tin nhắn hệ thống mặc định sau khi tạo đơn tiến cử
      try {
        const candidateName = String(jobApplication.cv?.name || 'ứng viên').trim();
        const jobTitleText = String(jobApplication.job?.title || '').trim();
        const introMessage = `Cảm ơn bạn đã tiến cử ${candidateName} tới job: ${jobTitleText}`;
        await Message.create({
          jobApplicationId: jobApplication.id,
          adminId: req.admin?.id || null,
          collaboratorId: jobApplication.collaboratorId || null,
          senderType: 3, // System
          content: introMessage,
          isReadByAdmin: true,
          isReadByCollaborator: true
        });
      } catch (messageError) {
        console.error('[Admin createJobApplication] Error creating intro message:', messageError);
      }

      if (jobApplication.collaboratorId) {
        try {
          await collaboratorNotificationService.notifyNominationCreated({
            collaboratorId: jobApplication.collaboratorId,
            candidateName: jobApplication.cv?.name || null,
            jobCode: jobApplication.job?.jobCode || String(jobApplication.id),
            jobId: jobApplication.jobId || null,
            jobApplicationId: jobApplication.id,
            createdByAdmin: true
          });
        } catch (notificationError) {
          console.error('[Admin createJobApplication] Error creating notification:', notificationError);
        }

        try {
          const recipientEmail = jobApplication.collaborator?.email || null;
          await nominationEmailService.sendNominationSubmittedEmail({
            to: recipientEmail,
            jobApplicationId: jobApplication.id,
            jobCode: jobApplication.job?.jobCode || String(jobApplication.id),
            candidateName: jobApplication.cv?.name || null,
            jobTitleVi: jobApplication.job?.title || null,
            jobTitleEn: jobApplication.job?.titleEn || jobApplication.job?.title_en || null,
            jobTitleJp: jobApplication.job?.titleJp || jobApplication.job?.title_jp || null
          });
        } catch (emailError) {
          console.error('[Admin createJobApplication] Error sending nomination email:', emailError);
        }
      }

      try {
        await nominationEmailService.sendNewNominationAdminNotification({
          jobApplicationId: jobApplication.id,
          candidateName: jobApplication.cv?.name || null,
          jobTitleVi: jobApplication.job?.title || null,
          jobTitleEn: jobApplication.job?.titleEn || jobApplication.job?.title_en || null,
          jobTitleJp: jobApplication.job?.titleJp || jobApplication.job?.title_jp || null,
          appliedAt: jobApplication.appliedAt || jobApplication.createdAt,
          collaboratorLabel: jobApplication.collaborator?.name
            || (req.admin?.name ? `Admin (${req.admin.name})` : 'Admin (hệ thống)')
        });
      } catch (adminNotifyErr) {
        console.error('[Admin createJobApplication] Error sending admin new-nomination email:', adminNotifyErr);
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'JobApplication',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: jobApplication.toJSON(),
        description: `Tạo mới đơn ứng tuyển: Job #${jobId}`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo đơn ứng tuyển thành công',
        data: { jobApplication }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update job application
   * PUT /api/admin/job-applications/:id
   */
  updateJobApplication: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const jobApplication = await JobApplication.findByPk(id);
      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển'
        });
      }

      // Kiểm tra quyền AdminBackOffice
      const hasPermission = await checkAdminBackOfficePermission(req.admin, jobApplication);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật đơn ứng tuyển này. Chỉ có thể cập nhật đơn của CTV được phân công cho bạn.'
        });
      }

      const oldData = jobApplication.toJSON();
      const oldAdminResponsibleId = oldData.adminResponsibleId;
      const newAdminResponsibleIdFromBody =
        updateData.adminResponsibleId !== undefined ? updateData.adminResponsibleId : oldAdminResponsibleId;
      const adminResponsibleChanged =
        updateData.adminResponsibleId !== undefined &&
        parseInt(newAdminResponsibleIdFromBody, 10) !== parseInt(oldAdminResponsibleId || 0, 10);

      // Validate job if being changed
      if (updateData.jobId && updateData.jobId !== jobApplication.jobId) {
        const job = await Job.findByPk(updateData.jobId);
        if (!job) {
          return res.status(404).json({
            success: false,
            message: 'Việc làm không tồn tại'
          });
        }
      }

      // Validate collaborator if being changed
      if (updateData.collaboratorId !== undefined) {
        if (updateData.collaboratorId && updateData.collaboratorId !== jobApplication.collaboratorId) {
          const collaborator = await Collaborator.findByPk(updateData.collaboratorId);
          if (!collaborator) {
            return res.status(404).json({
              success: false,
              message: 'CTV không tồn tại'
            });
          }
        }
      }

      // Validate CV if being changed (must not be duplicate)
      if (updateData.cvCode !== undefined && updateData.cvCode !== jobApplication.cvCode) {
        if (updateData.cvCode) {
          const cv = await CVStorage.findOne({ where: { code: updateData.cvCode } });
          if (!cv) {
            return res.status(404).json({
              success: false,
              message: 'CV không tồn tại'
            });
          }
          
          // Check if CV can be nominated
          if (!canCVBeNominated(cv.status)) {
            return res.status(400).json({
              success: false,
              message: cv.status === 3 ? 'CV này bị trùng với CV đã tồn tại, không thể dùng để tạo đơn ứng tuyển' : 'CV này không thể dùng để tạo đơn ứng tuyển'
            });
          }
        }
      }

      // Update fields - loại bỏ monthlySalary, chỉ cho phép yearlySalary
      Object.keys(updateData).forEach(key => {
        // Loại bỏ monthlySalary khỏi update
        if (key === 'monthlySalary' || key === 'monthly_salary') {
          return;
        }
        // Chỉ cho phép SuperAdmin (role = 1) cập nhật memo
        if (key === 'memo' && req.admin?.role !== 1) {
          return;
        }
        if (updateData[key] !== undefined) {
          jobApplication[key] = updateData[key];
        }
      });

      // Chuẩn hóa status: chỉ ghi khi là số 1–16; nếu không hợp lệ giữ nguyên giá trị cũ
      if (updateData.status !== undefined) {
        const statusNum = parseInt(updateData.status, 10);
        if (!Number.isNaN(statusNum) && statusNum >= 1 && statusNum <= 16) {
          jobApplication.status = statusNum;
        } else {
          jobApplication.status = oldData.status;
        }
      }
      
      // Đảm bảo yearlySalary được cập nhật nếu có trong updateData
      if (updateData.yearlySalary !== undefined) {
        // Parse thành number nếu là string
        const yearlySalaryValue = typeof updateData.yearlySalary === 'string' 
          ? parseFloat(updateData.yearlySalary) 
          : updateData.yearlySalary;
        jobApplication.yearlySalary = yearlySalaryValue;
        console.log(`[Update Job Application] Cập nhật yearlySalary: ${yearlySalaryValue} (từ ${updateData.yearlySalary})`);
      }

      await jobApplication.save();

      // Reload with relations
      await jobApplication.reload({
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
          },
          {
            model: Admin,
            as: 'admin',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: Admin,
            as: 'adminResponsible',
            required: false,
            attributes: ['id', 'name', 'email']
          },
          {
            model: CVStorage,
            as: 'cv',
            required: false
          }
        ]
      });

      // Nếu Super Admin đổi adminResponsibleId và đơn có CV, tự động tạo/khôi phục phân công hồ sơ (collaborator_assignments)
      if (
        req.admin?.role === 1 &&
        adminResponsibleChanged &&
        jobApplication.cvCode
      ) {
        try {
          const cv = await CVStorage.findOne({
            where: { code: jobApplication.cvCode },
            attributes: ['id', 'name']
          });
          if (cv) {
            const targetAdminId = parseInt(newAdminResponsibleIdFromBody, 10);
            if (!Number.isNaN(targetAdminId)) {
              const existingAssignment = await CollaboratorAssignment.findOne({
                where: {
                  cvStorageId: cv.id,
                  adminId: targetAdminId
                },
                paranoid: false
              });

              if (existingAssignment) {
                await existingAssignment.update({
                  assignedBy: req.admin.id,
                  notes: existingAssignment.notes,
                  status: 1,
                  deletedAt: null
                });
              } else {
                await CollaboratorAssignment.create({
                  cvStorageId: cv.id,
                  adminId: targetAdminId,
                  assignedBy: req.admin.id,
                  notes: updateData.assignmentNote || null,
                  status: 1
                });
              }
            }
          }
        } catch (e) {
          console.error('Error syncing collaborator assignment from job application:', e);
        }
      }

      const newData = jobApplication.toJSON();

      // Tự động tạo tin nhắn nếu có thay đổi status
      if (updateData.status !== undefined && oldData.status !== parseInt(updateData.status)) {
        try {
          await statusMessageService.createStatusMessage({
            jobApplicationId: id,
            oldStatus: oldData.status,
            newStatus: parseInt(updateData.status),
            adminId: req.admin.id,
            note: updateData.rejectNote || null
          });
        } catch (messageError) {
          console.error('[Job Application] Error creating status message:', messageError);
        }

        if (jobApplication.collaboratorId) {
          try {
            await collaboratorNotificationService.notifyStatusChanged({
              collaboratorId: jobApplication.collaboratorId,
              candidateName: jobApplication.cv?.name || null,
              jobCode: jobApplication.job?.jobCode || String(jobApplication.id),
              status: parseInt(updateData.status),
              nyushaDate: jobApplication.nyushaDate || null,
              jobId: jobApplication.jobId || null,
              jobApplicationId: jobApplication.id
            });
            if (parseInt(updateData.status, 10) === 2) {
              await collaboratorNotificationService.notifyNominationApproved({
                collaboratorId: jobApplication.collaboratorId,
                candidateName: jobApplication.cv?.name || null,
                jobCode: jobApplication.job?.jobCode || String(jobApplication.id),
                jobId: jobApplication.jobId || null,
                jobApplicationId: jobApplication.id
              });
            }
          } catch (notificationError) {
            console.error('[Job Application] Error creating status notification:', notificationError);
          }

          try {
            await sendInterviewEmailIfNeeded(jobApplication.id, parseInt(updateData.status, 10));
          } catch (emailError) {
            console.error('[Job Application] Error sending interview scheduled email:', emailError);
          }
          try {
            await sendFailedEmailIfNeeded(
              jobApplication.id,
              parseInt(updateData.status, 10),
              updateData.rejectNote || null
            );
          } catch (emailError) {
            console.error('[Job Application] Error sending failed nomination email:', emailError);
          }
          try {
            await sendJobOfferEmailIfNeeded(jobApplication.id, parseInt(updateData.status, 10));
          } catch (emailError) {
            console.error('[Job Application] Error sending job offer email:', emailError);
          }
          try {
            await sendOfferAcceptedEmailIfNeeded(jobApplication.id, parseInt(updateData.status, 10));
          } catch (emailError) {
            console.error('[Job Application] Error sending offer accepted email:', emailError);
          }
          try {
            await sendJoinedCompanyEmailIfNeeded(jobApplication.id, parseInt(updateData.status, 10));
          } catch (emailError) {
            console.error('[Job Application] Error sending joined company email:', emailError);
          }
        }
      } else if (updateData.status === undefined) {
        // Nếu không thay đổi status, kiểm tra các thay đổi khác
        try {
          await statusMessageService.createUpdateMessage({
            jobApplicationId: id,
            oldData,
            newData,
            adminId: req.admin.id
          });
        } catch (messageError) {
          console.error('[Job Application] Error creating update message:', messageError);
        }
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'JobApplication',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: jobApplication.toJSON(),
        description: `Cập nhật đơn ứng tuyển #${id}`
      });

      res.json({
        success: true,
        message: 'Cập nhật đơn ứng tuyển thành công',
        data: { jobApplication }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get memos for a job application
   * GET /api/admin/job-applications/:id/memos
   */
  getMemos: async (req, res, next) => {
    try {
      const { id } = req.params;

      const jobApplication = await JobApplication.findByPk(id);
      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển'
        });
      }

      // SuperAdmin xem được tất cả; AdminBackOffice tuân theo cùng rule với cập nhật đơn
      if (req.admin?.role === 2) {
        const hasPermission = await checkAdminBackOfficePermission(req.admin, jobApplication);
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ được xem memo của các đơn mình phụ trách'
          });
        }
      }

      let memos = await JobApplicationMemo.findAll({
        where: { jobApplicationId: id },
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp']
          },
          {
            model: Admin,
            as: 'creator',
            required: false,
            attributes: ['id', 'name', 'email', 'role']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Backward compatibility: nếu chưa có bản ghi trong bảng memos
      // nhưng cột job_applications.memo có dữ liệu, hiển thị memo này như 1 bản ghi ảo
      if ((!memos || memos.length === 0) && jobApplication.memo) {
        memos = [
          {
            id: 0,
            jobApplicationId: jobApplication.id,
            jobId: null,
            note: jobApplication.memo,
            createdBy: null,
            created_at: jobApplication.created_at,
            updated_at: jobApplication.updated_at,
            deleted_at: null,
            job: null,
            creator: null
          }
        ];
      }

      res.json({
        success: true,
        data: { memos }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create memo for a job application
   * POST /api/admin/job-applications/:id/memos
   * Only SuperAdmin (role = 1) can create
   */
  createMemo: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { note, jobId } = req.body;

      if (!note || !note.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung memo là bắt buộc'
        });
      }

      if (!req.admin || req.admin.role !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Super Admin mới được tạo memo'
        });
      }

      const jobApplication = await JobApplication.findByPk(id);
      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển'
        });
      }

      let suggestedJob = null;
      if (jobId) {
        suggestedJob = await Job.findByPk(jobId);
        if (!suggestedJob) {
          return res.status(404).json({
            success: false,
            message: 'Job gợi ý không tồn tại'
          });
        }
      }

      const memo = await JobApplicationMemo.create({
        jobApplicationId: jobApplication.id,
        jobId: suggestedJob ? suggestedJob.id : null,
        note: note.trim(),
        createdBy: req.admin.id
      });

      // Cập nhật trường memo ngắn trên job_applications để hiển thị nhanh trong bảng
      jobApplication.memo = note.trim();
      await jobApplication.save();

      const memoWithRelations = await JobApplicationMemo.findByPk(memo.id, {
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp']
          },
          {
            model: Admin,
            as: 'creator',
            required: false,
            attributes: ['id', 'name', 'email', 'role']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Tạo memo thành công',
        data: { memo: memoWithRelations }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update memo for a job application
   * PUT /api/admin/job-applications/:id/memos/:memoId
   * Only SuperAdmin (role = 1) can update
   */
  updateMemo: async (req, res, next) => {
    try {
      const { id, memoId } = req.params;
      const { note, jobId } = req.body;

      if (!req.admin || req.admin.role !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Super Admin mới được sửa memo'
        });
      }

      const memo = await JobApplicationMemo.findByPk(memoId);
      if (!memo || memo.jobApplicationId !== parseInt(id, 10)) {
        return res.status(404).json({
          success: false,
          message: 'Memo không tồn tại'
        });
      }

      let suggestedJob = null;
      if (jobId !== undefined) {
        if (jobId) {
          suggestedJob = await Job.findByPk(jobId);
          if (!suggestedJob) {
            return res.status(404).json({
              success: false,
              message: 'Job gợi ý không tồn tại'
            });
          }
          memo.jobId = suggestedJob.id;
        } else {
          memo.jobId = null;
        }
      }

      if (note !== undefined && note !== null) {
        const trimmed = String(note).trim();
        if (!trimmed) {
          return res.status(400).json({
            success: false,
            message: 'Nội dung memo là bắt buộc'
          });
        }
        memo.note = trimmed;
      }

      await memo.save();

      // Đồng bộ memo ngắn trên job_applications bằng memo mới nhất
      const latestMemo = await JobApplicationMemo.findOne({
        where: { jobApplicationId: id },
        order: [['created_at', 'DESC']]
      });
      const jobApplication = await JobApplication.findByPk(id);
      if (jobApplication) {
        jobApplication.memo = latestMemo ? latestMemo.note : null;
        await jobApplication.save();
      }

      const memoWithRelations = await JobApplicationMemo.findByPk(memo.id, {
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp']
          },
          {
            model: Admin,
            as: 'creator',
            required: false,
            attributes: ['id', 'name', 'email', 'role']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Cập nhật memo thành công',
        data: { memo: memoWithRelations }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete memo for a job application
   * DELETE /api/admin/job-applications/:id/memos/:memoId
   * Only SuperAdmin (role = 1) can delete
   */
  deleteMemo: async (req, res, next) => {
    try {
      const { id, memoId } = req.params;

      if (!req.admin || req.admin.role !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Super Admin mới được xóa memo'
        });
      }

      const memo = await JobApplicationMemo.findByPk(memoId);
      if (!memo || memo.jobApplicationId !== parseInt(id, 10)) {
        return res.status(404).json({
          success: false,
          message: 'Memo không tồn tại'
        });
      }

      await memo.destroy();

      // Đồng bộ lại trường memo ngắn trên job_applications
      const latestMemo = await JobApplicationMemo.findOne({
        where: { jobApplicationId: id },
        order: [['created_at', 'DESC']]
      });

      const jobApplication = await JobApplication.findByPk(id);
      if (jobApplication) {
        jobApplication.memo = latestMemo ? latestMemo.note : null;
        await jobApplication.save();
      }

      res.json({
        success: true,
        message: 'Xóa memo thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update job application status
   * PATCH /api/admin/job-applications/:id/status
   */
  updateStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, rejectNote, paymentAmount } = req.body;

      if (status === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái là bắt buộc'
        });
      }

      const statusNum = parseInt(status, 10);
      if (Number.isNaN(statusNum) || statusNum < 1 || statusNum > 17) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái không hợp lệ (phải từ 1 đến 17)'
        });
      }

      // Khi chuyển sang Đã thanh toán (15), bắt buộc nhập số tiền
      if (statusNum === STATUS_PAID) {
        const amount = paymentAmount != null ? parseFloat(paymentAmount) : NaN;
        if (Number.isNaN(amount) || amount < 0) {
          return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập số tiền thanh toán hợp lệ'
          });
        }
      }

      const jobApplication = await JobApplication.findByPk(id);
      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển'
        });
      }

      // Kiểm tra quyền AdminBackOffice
      const hasPermission = await checkAdminBackOfficePermission(req.admin, jobApplication);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật trạng thái đơn ứng tuyển này. Chỉ có thể cập nhật đơn của CTV được phân công cho bạn.'
        });
      }

      const oldData = jobApplication.toJSON();
      const oldStatus = jobApplication.status;

      jobApplication.status = statusNum;
      if (rejectNote !== undefined) {
        jobApplication.rejectNote = rejectNote;
      }

      await jobApplication.save();

      // Cập nhật CV status/phase dựa trên job application status
      if (jobApplication.cvCode) {
        try {
          const cv = await CVStorage.findOne({
            where: { code: jobApplication.cvCode }
          });

          if (cv) {
            // Map job application status sang CV phase/status
            // Status mapping:
            // 1: Admin đang xử lý hồ sơ -> CV status giữ nguyên
            // 2: Đang tiến cử -> CV status = 1 (active)
            // 3-7: Các giai đoạn -> CV status = 1 (active)
            // 8: Đã nyusha -> CV status = 1 (active)
            // 9-11: Thanh toán -> CV status = 1 (active)
            // 12, 15, 16, 17: Từ chối/Hủy -> CV status có thể giữ nguyên hoặc = 2 (archived)
            
            let newCVStatus = cv.status; // Giữ nguyên mặc định
            
            if (jobApplication.status >= 2 && jobApplication.status <= 11) {
              // Các status tích cực -> active
              newCVStatus = 1;
            } else if (jobApplication.status === 12 || jobApplication.status === 15 || 
                       jobApplication.status === 16 || jobApplication.status === 17) {
              // Từ chối/Hủy -> có thể archive hoặc giữ nguyên
              // Tạm thời giữ nguyên, có thể thay đổi logic sau
              newCVStatus = cv.status;
            }

            if (cv.status !== newCVStatus) {
              cv.status = newCVStatus;
              await cv.save();
              console.log(`[Job Application] Đã cập nhật CV status: ${cv.code} -> ${newCVStatus}`);
            }
          }
        } catch (cvError) {
          console.error('[Job Application] Error updating CV status:', cvError);
          // Không throw error, chỉ log
        }
      }

      // Khi chuyển sang Đã thanh toán (15): bắt buộc có CTV để tạo đơn thanh toán, rồi tạo/cập nhật payment_request
      if (statusNum === STATUS_PAID) {
        if (!jobApplication.collaboratorId) {
          return res.status(400).json({
            success: false,
            message: 'Không thể tạo đơn thanh toán: đơn ứng tuyển chưa có CTV. Vui lòng gán CTV trước khi chuyển sang trạng thái Đã thanh toán.'
          });
        }
        try {
          const amount = parseFloat(paymentAmount);
          if (Number.isNaN(amount) || amount < 0) {
            return res.status(400).json({
              success: false,
              message: 'Vui lòng nhập số tiền thanh toán hợp lệ'
            });
          }
          const paymentWhere = { jobApplicationId: jobApplication.id };
          let paymentRequest = await PaymentRequest.findOne({ where: paymentWhere });

          if (paymentRequest) {
            paymentRequest.amount = amount;
            if (paymentRequest.status === 0) {
              paymentRequest.status = 1; // Đã phê duyệt (admin nhập số tiền từ chat / danh sách)
              paymentRequest.approvedAt = new Date();
            }
            await paymentRequest.save();
          } else {
            await PaymentRequest.create({
              collaboratorId: jobApplication.collaboratorId,
              jobApplicationId: jobApplication.id,
              amount,
              status: 1, // Đã phê duyệt (chưa đến hạn scheduler vẫn có thể ghi nhận từ admin)
              approvedAt: new Date()
            });
          }
        } catch (paymentError) {
          console.error('[Payment Request] Error creating/updating payment on status=paid:', paymentError);
          return res.status(500).json({
            success: false,
            message: 'Không thể lưu thông tin thanh toán'
          });
        }
      }

      // Tự động tạo tin nhắn trạng thái nếu có thay đổi (jobApplicationId số để Message lưu đúng, GET messages trả về đủ)
      if (oldStatus !== statusNum) {
        try {
          await statusMessageService.createStatusMessage({
            jobApplicationId: parseInt(id, 10),
            oldStatus,
            newStatus: statusNum,
            adminId: req.admin.id,
            note: rejectNote !== undefined && rejectNote !== null ? String(rejectNote).trim() || null : null,
            paymentAmount: statusNum === STATUS_PAID && paymentAmount != null ? parseFloat(paymentAmount) : null
          });
        } catch (messageError) {
          console.error('[Job Application] Error creating status message:', messageError);
          // Không throw error để không ảnh hưởng đến việc update status
        }

        if (jobApplication.collaboratorId) {
          try {
            const fullJobApplication = await JobApplication.findByPk(jobApplication.id, {
              include: [
                { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode', 'title'] },
                { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'name', 'code'] }
              ]
            });

            await collaboratorNotificationService.notifyStatusChanged({
              collaboratorId: jobApplication.collaboratorId,
              candidateName: fullJobApplication?.cv?.name || null,
              jobCode: fullJobApplication?.job?.jobCode || String(jobApplication.id),
              status: statusNum,
              nyushaDate: jobApplication.nyushaDate || null,
              jobId: jobApplication.jobId || null,
              jobApplicationId: jobApplication.id
            });
            if (statusNum === 2) {
              await collaboratorNotificationService.notifyNominationApproved({
                collaboratorId: jobApplication.collaboratorId,
                candidateName: fullJobApplication?.cv?.name || null,
                jobCode: fullJobApplication?.job?.jobCode || String(jobApplication.id),
                jobId: jobApplication.jobId || null,
                jobApplicationId: jobApplication.id
              });
            }
          } catch (notificationError) {
            console.error('[Job Application] Error creating status notification:', notificationError);
          }

          try {
            await sendInterviewEmailIfNeeded(jobApplication.id, statusNum);
          } catch (emailError) {
            console.error('[Job Application] Error sending interview scheduled email:', emailError);
          }
          try {
            await sendFailedEmailIfNeeded(
              jobApplication.id,
              statusNum,
              rejectNote !== undefined && rejectNote !== null ? String(rejectNote).trim() || null : null
            );
          } catch (emailError) {
            console.error('[Job Application] Error sending failed nomination email:', emailError);
          }
          try {
            await sendJobOfferEmailIfNeeded(jobApplication.id, statusNum);
          } catch (emailError) {
            console.error('[Job Application] Error sending job offer email:', emailError);
          }
          try {
            await sendOfferAcceptedEmailIfNeeded(jobApplication.id, statusNum);
          } catch (emailError) {
            console.error('[Job Application] Error sending offer accepted email:', emailError);
          }
          try {
            await sendJoinedCompanyEmailIfNeeded(jobApplication.id, statusNum);
          } catch (emailError) {
            console.error('[Job Application] Error sending joined company email:', emailError);
          }
        }
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'JobApplication',
        action: 'update_status',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: jobApplication.toJSON(),
        description: `Cập nhật trạng thái đơn ứng tuyển #${id}: ${status}`
      });

      res.json({
        success: true,
        message: 'Cập nhật trạng thái đơn ứng tuyển thành công',
        data: { jobApplication }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete job application (soft delete)
   * DELETE /api/admin/job-applications/:id
   */
  deleteJobApplication: async (req, res, next) => {
    try {
      const { id } = req.params;

      const jobApplication = await JobApplication.findByPk(id, {
        include: [
          { model: CVStorage, as: 'cv', required: false, attributes: ['id', 'code', 'name', 'status'] },
          { model: Job, as: 'job', required: false, attributes: ['id', 'jobCode'] }
        ]
      });
      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển'
        });
      }

      const hasPermission = await checkAdminBackOfficePermission(req.admin, jobApplication);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa đơn này'
        });
      }

      const oldData = jobApplication.toJSON();
      const collaboratorId = jobApplication.collaboratorId;
      const cvStatus = jobApplication.cv?.status != null ? Number(jobApplication.cv.status) : null;
      const candidateName = jobApplication.cv?.name;
      const jobCode = jobApplication.job?.jobCode;

      await jobApplication.destroy();

      if (collaboratorId && cvStatus === CV_STATUS_DUPLICATE) {
        try {
          await collaboratorNotificationService.notifyNominationRemovedInvalidProfile({
            collaboratorId,
            candidateName,
            jobCode,
            jobId: jobApplication.jobId
          });
        } catch (notifyErr) {
          console.error('notifyNominationRemovedInvalidProfile:', notifyErr);
        }
      }

      await ActionLog.create({
        adminId: req.admin.id,
        object: 'JobApplication',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa đơn ứng tuyển #${id}`
      });

      res.json({
        success: true,
        message: 'Xóa đơn ứng tuyển thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk soft-delete nominations whose linked CV is duplicate (cv_storages.status = 3).
   * POST /api/admin/job-applications/bulk-delete-duplicate-cv-nominations
   */
  bulkDeleteDuplicateCvNominations: async (req, res, next) => {
    try {
      const admin = req.admin;
      const BATCH = 150;
      const MAX_ROUNDS = 500;
      let deleted = 0;
      let notified = 0;
      let afterId = 0;

      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const rows = await JobApplication.findAll({
          where: { id: { [Op.gt]: afterId } },
          limit: BATCH,
          order: [['id', 'ASC']],
          include: [
            {
              model: CVStorage,
              as: 'cv',
              required: true,
              where: { status: CV_STATUS_DUPLICATE },
              attributes: ['id', 'code', 'name', 'status']
            },
            {
              model: Job,
              as: 'job',
              required: false,
              attributes: ['id', 'jobCode']
            }
          ]
        });

        if (!rows.length) break;

        for (const ja of rows) {
          afterId = ja.id;
          // eslint-disable-next-line no-await-in-loop
          const ok = await checkAdminBackOfficePermission(admin, ja);
          if (!ok) continue;

          const collaboratorId = ja.collaboratorId;
          const candidateName = ja.cv?.name;
          const jobCode = ja.job?.jobCode;

          // eslint-disable-next-line no-await-in-loop
          await ja.destroy();
          deleted += 1;

          if (collaboratorId) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await collaboratorNotificationService.notifyNominationRemovedInvalidProfile({
                collaboratorId,
                candidateName,
                jobCode,
                jobId: ja.jobId
              });
              notified += 1;
            } catch (notifyErr) {
              console.error('notifyNominationRemovedInvalidProfile (bulk):', notifyErr);
            }
          }
        }

        if (rows.length < BATCH) break;
      }

      const summary = `Bulk xóa đơn CV trùng: ${deleted} đơn, ${notified} TB CTV`;
      await ActionLog.create({
        adminId: admin.id,
        object: 'JobApplication',
        action: 'bulk_delete_duplicate_cv',
        ip: req.ip || req.connection.remoteAddress,
        before: null,
        after: { deleted, notified },
        description: summary.length > 255 ? `${summary.slice(0, 252)}...` : summary
      });

      let responseMessage =
        deleted > 0 ? 'Đã xóa ' + deleted + ' đơn tiến cử.' : 'Không có đơn nào được xóa (hoặc bạn không có quyền với các đơn còn lại).';
      if (deleted > 0 && notified > 0) {
        responseMessage += ' Đã gửi ' + notified + ' thông báo tới CTV.';
      }

      res.json({
        success: true,
        message: responseMessage,
        data: { deleted, notified }
      });
    } catch (error) {
      next(error);
    }
  }
};


import {
  JobApplication,
  Job,
  JobCategory,
  Company,
  JobRecruitingCompany,
  CVStorage,
  Message,
  Collaborator
} from '../../models/index.js';
import { Op } from 'sequelize';
import {
  STATUS_WAITING_WS,
  STATUS_DUPLICATE,
  RESTRICTED_STATUSES_FOR_DELETE,
  STATUSES_ENDED,
  STATUSES_ACTIVE_BLOCK_DUPLICATE
} from '../../constants/jobApplicationStatus.js';
import { canCVBeNominated } from '../../constants/cvStatus.js';
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
 * Job Application Management Controller (CTV)
 * CTV chỉ có thể quản lý đơn ứng tuyển của chính họ
 */
export const jobApplicationController = {
  /**
   * Get list of job applications (only own applications)
   * GET /api/ctv/job-applications
   */
  getJobApplications: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        jobId,
        cvId,
        cvCode,
        appliedFrom,
        appliedTo,
        interviewFrom,
        interviewTo,
        nyushaFrom,
        nyushaTo,
        cvStorageStatus,
        sortBy = 'id',
        sortOrder = 'DESC'
      } = req.query;

      let cvStorageStatusFilter;
      if (cvStorageStatus !== undefined && cvStorageStatus !== '') {
        const n = parseInt(cvStorageStatus, 10);
        if (!Number.isNaN(n)) cvStorageStatusFilter = n;
      }
      const cvIncludeAttrs = ['id', 'code', 'name', 'email', 'phone', 'status'];
      const cvIncludeExtra = cvStorageStatusFilter !== undefined
        ? { required: true, where: { status: cvStorageStatusFilter } }
        : { required: false };

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {
        collaboratorId: req.collaborator.id // Chỉ lấy đơn của CTV này
      };

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by job
      if (jobId) {
        where.jobId = parseInt(jobId);
      }

      // Filter by CV code
      if (cvId) {
        where.cvId = Number(cvId);
      }
      if (cvCode) {
        where.cvCode = cvCode;
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

      // Search by CV name/email/phone or job title/code
      if (search) {
        const searchLike = `%${search}%`;

        const cvMatches = await CVStorage.findAll({
          where: {
            collaboratorId: req.collaborator.id,
            [Op.or]: [
              { name: { [Op.like]: searchLike } },
              { email: { [Op.like]: searchLike } },
              { phone: { [Op.like]: searchLike } },
              { code: { [Op.like]: searchLike } }
            ],
            ...(cvStorageStatusFilter !== undefined ? { status: cvStorageStatusFilter } : {})
          },
          attributes: ['id'],
          raw: true
        });
        const cvIds = cvMatches.map(c => c.id);

        const jobMatches = await Job.findAll({
          where: {
            [Op.or]: [
              { title: { [Op.like]: searchLike } },
              { titleEn: { [Op.like]: searchLike } },
              { titleJp: { [Op.like]: searchLike } },
              { jobCode: { [Op.like]: searchLike } }
            ]
          },
          attributes: ['id'],
          raw: true
        });
        const jobIds = jobMatches.map(j => j.id);

        const searchConditions = [];
        if (cvIds.length > 0) searchConditions.push({ cvId: { [Op.in]: cvIds } });
        if (jobIds.length > 0) searchConditions.push({ jobId: { [Op.in]: jobIds } });
        const searchNum = parseInt(search, 10);
        if (!Number.isNaN(searchNum)) searchConditions.push({ id: searchNum });

        if (searchConditions.length > 0) {
          where[Op.or] = searchConditions;
        } else {
          where.id = { [Op.eq]: -1 };
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
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await JobApplication.findAndCountAll({
        where,
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp', 'status'],
            include: [
              {
                model: JobCategory,
                as: 'category',
                required: false,
                attributes: ['id', 'name', 'slug']
              },
              {
                model: Company,
                as: 'company',
                required: false,
                attributes: ['id', 'name', 'companyCode']
              },
              {
                model: JobRecruitingCompany,
                as: 'recruitingCompany',
                required: false,
                attributes: ['id', 'companyName', 'companyNameEn', 'companyNameJp', 'company_name', 'company_name_en', 'company_name_jp']
              }
            ]
          },
          {
            model: CVStorage,
            as: 'cv',
            attributes: cvIncludeAttrs,
            ...cvIncludeExtra
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      rows.forEach((row) => {
        const job = row?.job;
        const recruitingCompany = job?.recruitingCompany;
        if (job && recruitingCompany) {
          const companyName = recruitingCompany.companyName || recruitingCompany.name || recruitingCompany.company_name || '';
          if (companyName) {
            job.dataValues.recruitingCompanyName = companyName;
            job.dataValues.recruitingCompanyNameEn = recruitingCompany.companyNameEn || recruitingCompany.company_name_en || '';
            job.dataValues.recruitingCompanyNameJp = recruitingCompany.companyNameJp || recruitingCompany.company_name_jp || '';
          }
        }
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
   * Get job application by ID (only own application)
   * GET /api/ctv/job-applications/:id
   */
  getJobApplicationById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const jobApplication = await JobApplication.findOne({
        where: {
          id,
          collaboratorId: req.collaborator.id
        },
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
            model: CVStorage,
            as: 'cv',
            required: false
          }
        ]
      });

      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển hoặc bạn không có quyền truy cập'
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
   * POST /api/ctv/job-applications
   */
  createJobApplication: async (req, res, next) => {
    try {
      const {
        jobId,
        title,
        cvCode,
        cvId: bodyCvId,
        cvPath: bodyCvPath,
        cvSource,
        template,
        monthlySalary,
        yearlySalary,
        appliedAt,
        interviewDate,
        interviewRound2Date,
        nyushaDate,
        expectedPaymentDate
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

      // Validate CV if provided — theo cv_id hoặc cv_code (bắt buộc lưu cv_id để join tên ứng viên trên danh sách)
      let selectedCvPath = null;
      let resolvedCvId = null;
      const rawCvCode =
        cvCode != null && String(cvCode).trim() !== '' ? String(cvCode).trim() : null;
      const rawCvIdNum =
        bodyCvId != null && bodyCvId !== ''
          ? parseInt(String(bodyCvId), 10)
          : NaN;

      let cv = null;
      if (!Number.isNaN(rawCvIdNum)) {
        cv = await CVStorage.findOne({
          where: {
            id: rawCvIdNum,
            collaboratorId: req.collaborator.id
          }
        });
      } else if (rawCvCode) {
        cv = await CVStorage.findOne({
          where: {
            code: rawCvCode,
            collaboratorId: req.collaborator.id
          }
        });
      }

      const lookedUpCv = !Number.isNaN(rawCvIdNum) || !!rawCvCode;
      if (lookedUpCv && !cv) {
        return res.status(404).json({
          success: false,
          message: 'CV không tồn tại hoặc không thuộc về bạn'
        });
      }

      if (cv) {
        resolvedCvId = cv.id;

        // Check if CV can be nominated
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
        } else {
          const source = (cvSource ? String(cvSource) : 'original').toLowerCase();
          if (source === 'template') {
            const tpl = template ? String(template) : '';
            const allowed = ['Common', 'IT', 'Technical'];
            if (!allowed.includes(tpl)) {
              return res.status(400).json({
                success: false,
                message: 'Template không hợp lệ (Common|IT|Technical)'
              });
            }
            if (!cv.curriculumVitae) {
              return res.status(400).json({
                success: false,
                message: 'CV chưa có template để ứng tuyển'
              });
            }
            selectedCvPath = `${String(cv.curriculumVitae).replace(/\/+$/, '')}/${tpl}`;
          } else if (source === 'original') {
            if (!cv.cvOriginalPath) {
              return res.status(400).json({
                success: false,
                message: 'CV chưa có file gốc để ứng tuyển'
              });
            }
            selectedCvPath = String(cv.cvOriginalPath).replace(/\/+$/, '');
          } else {
            return res.status(400).json({
              success: false,
              message: 'cvSource không hợp lệ (original|template)'
            });
          }
        }
      }

      const codeForDedup = cv?.code || rawCvCode || null;

      // Chặn tạo đơn trùng: cùng CV + cùng job đang ở trạng thái xử lý (2,3,5,7,8,9)
      if (resolvedCvId) {
        const activeExisting = await JobApplication.findOne({
          where: {
            jobId,
            cvId: resolvedCvId,
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

      // Trùng hồ sơ: đã có đơn cùng ứng viên + cùng job mà đơn đó chưa kết thúc (4,6,10,13,16) → tạo đơn với status 1 (Hồ sơ trùng)
      let initialStatus = STATUS_WAITING_WS;
      if (codeForDedup) {
        const existing = await JobApplication.findOne({
          where: {
            jobId,
            cvCode: codeForDedup,
            status: { [Op.notIn]: STATUSES_ENDED }
          }
        });
        if (existing) {
          initialStatus = STATUS_DUPLICATE; // 1 - Hồ sơ trùng
        }
      }

      // Create job application – đơn hợp lệ (hoặc Hồ sơ trùng nếu tiến cử lần 2)
      const jobApplication = await JobApplication.create({
        jobId,
        collaboratorId: req.collaborator.id,
        title: title || `Ứng tuyển ${job.title}`,
        status: initialStatus,
        cvId: resolvedCvId,
        cvCode: codeForDedup,
        cvPath: selectedCvPath,
        monthlySalary,
        yearlySalary,
        appliedAt: appliedAt || new Date(),
        interviewDate,
        interviewRound2Date,
        nyushaDate,
        expectedPaymentDate
      });

      // Payment request sẽ được tạo tự động sau 3 tháng từ ngày nyusha (xem logic trong updateJobApplication)

      // Reload with relations
      await jobApplication.reload({
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
            model: CVStorage,
            as: 'cv',
            required: false
          }
        ]
      });

      // Tạo tin nhắn hệ thống mặc định sau khi tạo đơn tiến cử
      try {
        const candidateName = String(jobApplication.cv?.name || 'ứng viên').trim();
        const jobTitleText = String(jobApplication.job?.title || job.title || '').trim();
        const introMessage = `Cảm ơn bạn đã tiến cử ${candidateName} tới job: ${jobTitleText}`;
        await Message.create({
          jobApplicationId: jobApplication.id,
          collaboratorId: req.collaborator.id,
          senderType: 3, // System
          content: introMessage,
          isReadByAdmin: true,
          isReadByCollaborator: true
        });
      } catch (messageError) {
        console.error('[CTV createJobApplication] Error creating intro message:', messageError);
      }

      try {
        await collaboratorNotificationService.notifyNominationCreated({
          collaboratorId: req.collaborator.id,
          candidateName: jobApplication.cv?.name || null,
          jobCode: jobApplication.job?.jobCode || job.jobCode || String(jobApplication.id),
          jobId: jobApplication.jobId || null,
          jobApplicationId: jobApplication.id,
          createdByAdmin: false
        });
      } catch (notificationError) {
        console.error('[CTV createJobApplication] Error creating notification:', notificationError);
      }

      try {
        let recipientEmail = req.collaborator?.email || null;
        if (!recipientEmail) {
          const collaborator = await Collaborator.findByPk(req.collaborator.id, { attributes: ['email'] });
          recipientEmail = collaborator?.email || null;
        }
        await nominationEmailService.sendNominationSubmittedEmail({
          to: recipientEmail,
          jobApplicationId: jobApplication.id,
          jobCode: jobApplication.job?.jobCode || job.jobCode || String(jobApplication.id),
          candidateName: jobApplication.cv?.name || null,
          jobTitleVi: jobApplication.job?.title || job.title || null,
          jobTitleEn: jobApplication.job?.titleEn || jobApplication.job?.title_en || null,
          jobTitleJp: jobApplication.job?.titleJp || jobApplication.job?.title_jp || null
        });
      } catch (emailError) {
        console.error('[CTV createJobApplication] Error sending nomination email:', emailError);
      }

      try {
        await nominationEmailService.sendNewNominationAdminNotification({
          jobApplicationId: jobApplication.id,
          candidateName: jobApplication.cv?.name || null,
          jobTitleVi: jobApplication.job?.title || job.title || null,
          jobTitleEn: jobApplication.job?.titleEn || jobApplication.job?.title_en || job.titleEn || null,
          jobTitleJp: jobApplication.job?.titleJp || jobApplication.job?.title_jp || job.titleJp || null,
          appliedAt: jobApplication.appliedAt || jobApplication.createdAt,
          collaboratorLabel: req.collaborator?.name || null
        });
      } catch (adminNotifyErr) {
        console.error('[CTV createJobApplication] Error sending admin new-nomination email:', adminNotifyErr);
      }

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
   * Update job application (only own application, limited fields)
   * PUT /api/ctv/job-applications/:id
   */
  updateJobApplication: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if job application exists and belongs to this collaborator
      const jobApplication = await JobApplication.findOne({
        where: {
          id,
          collaboratorId: req.collaborator.id
        }
      });

      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển hoặc bạn không có quyền chỉnh sửa'
        });
      }

      // CTV chỉ có thể cập nhật một số trường nhất định
      // Không thể thay đổi status (admin mới có quyền)
      const allowedFields = [
        'title',
        'cvCode',
        'yearlySalary',
        'appliedAt',
        'interviewDate',
        'interviewRound2Date',
        'nyushaDate',
        'expectedPaymentDate'
      ];

      // Validate CV if being changed (must not be duplicate)
      if (updateData.cvCode && updateData.cvCode !== jobApplication.cvCode) {
        const cv = await CVStorage.findOne({
          where: {
            code: updateData.cvCode,
            collaboratorId: req.collaborator.id
          }
        });
        if (!cv) {
          return res.status(404).json({
            success: false,
            message: 'CV không tồn tại hoặc không thuộc về bạn'
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

      // Update allowed fields only - loại bỏ monthlySalary
      Object.keys(updateData).forEach(key => {
        // Loại bỏ monthlySalary khỏi update
        if (key === 'monthlySalary' || key === 'monthly_salary') {
          return;
        }
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          jobApplication[key] = updateData[key];
        }
      });
      
      // Đảm bảo yearlySalary được cập nhật nếu có trong updateData
      if (updateData.yearlySalary !== undefined && allowedFields.includes('yearlySalary')) {
        // Parse thành number nếu là string
        const yearlySalaryValue = typeof updateData.yearlySalary === 'string' 
          ? parseFloat(updateData.yearlySalary) 
          : updateData.yearlySalary;
        jobApplication.yearlySalary = yearlySalaryValue;
        console.log(`[Update Job Application] Cập nhật yearlySalary (CTV): ${yearlySalaryValue} (từ ${updateData.yearlySalary})`);
      }

      await jobApplication.save();

      // Reload with relations
      await jobApplication.reload({
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
            model: CVStorage,
            as: 'cv',
            required: false
          }
        ]
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
   * Delete job application (only own application, soft delete)
   * DELETE /api/ctv/job-applications/:id
   */
  deleteJobApplication: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if job application exists and belongs to this collaborator
      const jobApplication = await JobApplication.findOne({
        where: {
          id,
          collaboratorId: req.collaborator.id
        }
      });

      if (!jobApplication) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn ứng tuyển hoặc bạn không có quyền xóa'
        });
      }

      // Không cho phép xóa nếu đã vào công ty hoặc đã thanh toán
      if (RESTRICTED_STATUSES_FOR_DELETE.includes(jobApplication.status)) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa đơn ứng tuyển ở trạng thái này. Vui lòng liên hệ admin.'
        });
      }

      // Soft delete
      await jobApplication.destroy();

      res.json({
        success: true,
        message: 'Xóa đơn ứng tuyển thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get nomination history for a candidate by CV code
   * GET /api/ctv/candidates/:cvCode/nomination-history
   */
  getCandidateNominationHistory: async (req, res, next) => {
    try {
      const { cvCode } = req.params;
      const {
        page = 1,
        limit = 50,
        search
      } = req.query;

      // Verify CV belongs to this collaborator
      const cv = await CVStorage.findOne({
        where: {
          code: cvCode,
          collaboratorId: req.collaborator.id
        }
      });

      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'CV không tồn tại hoặc không thuộc về bạn'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {
        collaboratorId: req.collaborator.id,
        cvCode: cvCode
      };

      // Search filter
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await JobApplication.findAndCountAll({
        where,
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp', 'status'],
            include: [
              {
                model: JobCategory,
                as: 'category',
                required: false,
                attributes: ['id', 'name', 'slug']
              },
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
            attributes: ['id', 'code', 'name', 'email', 'phone']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          applications: rows,
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
  }
};


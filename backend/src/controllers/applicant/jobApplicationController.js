import { Op } from 'sequelize';
import {
  JobApplication,
  Job,
  CVStorage,
  JobCategory,
  Company,
  JobRecruitingCompany,
} from '../../models/index.js';
import { STATUS_WAITING_WS, STATUS_DUPLICATE, STATUSES_ENDED, STATUSES_ACTIVE_BLOCK_DUPLICATE } from '../../constants/jobApplicationStatus.js';
import { canCVBeNominated, CV_STATUS_DUPLICATE, isCvPromotedInactive } from '../../constants/cvStatus.js';
import { nominationEmailService } from '../../services/nominationEmailService.js';

const mapOrderFieldApplicant = (fieldName) => {
  const fieldMap = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    appliedAt: 'applied_at',
    interviewDate: 'interview_date',
    nyushaDate: 'nyusha_date',
  };
  return fieldMap[fieldName] || fieldName;
};

export const applicantJobApplicationController = {
  /**
   * Danh sách đơn tiến cử của ứng viên (theo mọi CV thuộc tài khoản)
   * GET /api/applicant/job-applications
   */
  listMyJobApplications: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        appliedFrom,
        appliedTo,
        cvStorageStatus,
        sortBy = 'appliedAt',
        sortOrder = 'DESC',
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

      const myCvs = await CVStorage.findAll({
        where: { applicantId: req.applicant.id },
        attributes: ['id'],
      });
      const cvIds = myCvs.map((r) => r.id).filter((id) => id != null);
      if (cvIds.length === 0) {
        return res.json({
          success: true,
          data: {
            jobApplications: [],
            pagination: {
              total: 0,
              page: parseInt(page, 10),
              limit: parseInt(limit, 10),
              totalPages: 0,
            },
          },
        });
      }

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const where = {
        cvId: { [Op.in]: cvIds },
      };

      if (status !== undefined && status !== '') {
        where.status = parseInt(status, 10);
      }

      if (appliedFrom || appliedTo) {
        where.applied_at = {};
        if (appliedFrom) where.applied_at[Op.gte] = new Date(appliedFrom);
        if (appliedTo) where.applied_at[Op.lte] = new Date(appliedTo);
      }

      const allowedSortFields = ['id', 'status', 'appliedAt', 'interviewDate', 'nyushaDate', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'appliedAt';
      const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderFieldApplicant(sortField);
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') orderClause.push(['id', 'DESC']);

      const { count, rows } = await JobApplication.findAndCountAll({
        where,
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'jobCode', 'slug', 'title', 'titleEn', 'titleJp', 'status'],
            include: [
              { model: JobCategory, as: 'category', required: false, attributes: ['id', 'name', 'slug'] },
              { model: Company, as: 'company', required: false, attributes: ['id', 'name', 'companyCode'] },
              {
                model: JobRecruitingCompany,
                as: 'recruitingCompany',
                required: false,
              },
            ],
          },
          {
            model: CVStorage,
            as: 'cv',
            attributes: cvIncludeAttrs,
            ...cvIncludeExtra,
          },
        ],
        limit: parseInt(limit, 10),
        offset,
        order: orderClause,
      });

      res.json({
        success: true,
        data: {
          jobApplications: rows,
          pagination: {
            total: count,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalPages: Math.ceil(count / parseInt(limit, 10)) || 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Chi tiết một đơn tiến cử của ứng viên (chỉ khi CV thuộc tài khoản)
   * GET /api/applicant/job-applications/:id
   */
  getMyJobApplicationById: async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id || Number.isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      }

      const myCvs = await CVStorage.findAll({
        where: { applicantId: req.applicant.id },
        attributes: ['id'],
      });
      const cvIds = myCvs.map((r) => r.id).filter((cid) => cid != null);

      const accessOr = [{ applicantId: req.applicant.id }];
      if (cvIds.length > 0) {
        accessOr.push({ cvId: { [Op.in]: cvIds } });
      }

      const row = await JobApplication.findOne({
        where: {
          id,
          [Op.or]: accessOr,
        },
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            include: [
              { model: JobCategory, as: 'category', required: false, attributes: ['id', 'name', 'slug'] },
              { model: Company, as: 'company', required: false, attributes: ['id', 'name', 'companyCode'] },
              {
                model: JobRecruitingCompany,
                as: 'recruitingCompany',
                required: false,
              },
            ],
          },
          {
            model: CVStorage,
            as: 'cv',
            required: false,
            // CVStorage model: không có fullName — dùng name; DB column qua field mapping
            attributes: ['id', 'code', 'name', 'email', 'phone', 'birthDate', 'gender', 'addressCurrent', 'curriculumVitae'],
          },
        ],
      });

      if (!row) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn tiến cử' });
      }

      return res.json({
        success: true,
        data: { jobApplication: row },
      });
    } catch (error) {
      next(error);
    }
  },

  createMyJobApplication: async (req, res, next) => {
    try {
      const { jobId, cvId, cvPath: bodyCvPath } = req.body || {};
      if (!jobId) {
        return res.status(400).json({ success: false, message: 'ID việc làm là bắt buộc' });
      }

      const job = await Job.findByPk(jobId);
      if (!job || Number(job.status) !== 1) {
        return res.status(404).json({ success: false, message: 'Việc làm không tồn tại hoặc chưa được xuất bản' });
      }

      const cv = await CVStorage.findOne({
        where: { applicantId: req.applicant.id },
        attributes: ['id', 'code', 'status', 'adminId', 'cvOriginalPath', 'curriculumVitae'],
        order: [['id', 'DESC']]
      });
      if (!cv) {
        return res.status(400).json({ success: false, message: 'Bạn chưa có hồ sơ để tiến cử' });
      }

      // Ngoại lệ Applicant: CV trạng thái "trùng" hoặc "promoted-inactive" vẫn được phép apply.
      const cvStatusNum = Number(cv.status);
      if (!canCVBeNominated(cv.status) && cvStatusNum !== CV_STATUS_DUPLICATE && !isCvPromotedInactive(cv)) {
        return res.status(400).json({
          success: false,
          message: 'Hồ sơ chưa đủ điều kiện tiến cử'
        });
      }

      // Chặn tạo đơn trùng: cùng CV + cùng job đang ở trạng thái xử lý (2,3,5,7,8,9)
      const activeExisting = await JobApplication.findOne({
        where: {
          jobId: Number(jobId),
          cvId: cv.id,
          status: { [Op.in]: STATUSES_ACTIVE_BLOCK_DUPLICATE }
        }
      });
      if (activeExisting) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã ứng tuyển công việc này rồi và đơn đang được xử lý. Không thể tạo lại.'
        });
      }

      // Theo rule applicant: tạo đơn luôn ở trạng thái "Đang đợi xử lý hồ sơ WS".
      const initialStatus = STATUS_WAITING_WS;

      const normalizePath = (value) => String(value || '').replace(/\\/g, '/').trim().replace(/\/+$/, '');
      const normalizedBodyPath = bodyCvPath && typeof bodyCvPath === 'string'
        ? normalizePath(bodyCvPath)
        : '';
      let selectedCvPath = cv.cvOriginalPath || cv.curriculumVitae || null;
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

      const jobApplication = await JobApplication.create({
        jobId: Number(jobId),
        collaboratorId: null,
        applicantId: req.applicant.id,
        adminId: cv.adminId || null,
        title: `Ứng tuyển ${job.title || ''}`.trim(),
        status: initialStatus,
        cvId: cv.id,
        cvCode: cv.code || null,
        cvPath: selectedCvPath,
        appliedAt: new Date()
      });

      await jobApplication.reload({
        include: [
          { model: Job, as: 'job', required: false },
          { model: CVStorage, as: 'cv', required: false }
        ]
      });

      try {
        await nominationEmailService.sendNewNominationAdminNotification({
          jobApplicationId: jobApplication.id,
          candidateName: jobApplication.cv?.name || null,
          jobTitleVi: jobApplication.job?.title || null,
          jobTitleEn: jobApplication.job?.titleEn || jobApplication.job?.title_en || null,
          jobTitleJp: jobApplication.job?.titleJp || jobApplication.job?.title_jp || null,
          appliedAt: jobApplication.appliedAt || jobApplication.createdAt,
          collaboratorLabel: 'Ứng viên tự nộp đơn (landing)'
        });
      } catch (adminNotifyErr) {
        console.error('[Applicant createMyJobApplication] Error sending admin new-nomination email:', adminNotifyErr);
      }

      return res.status(201).json({
        success: true,
        message: 'Gửi đơn tiến cử thành công',
        data: { jobApplication }
      });
    } catch (error) {
      next(error);
    }
  }
};


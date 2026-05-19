import { Admin, Applicant, CVStorage, JobCategory } from '../../models/index.js';
import { CV_STATUS_NEW } from '../../constants/cvStatus.js';
import { runCvDuplicatePipelineAfterCreate } from '../../utils/cvDuplicateChecker.js';
import { enqueueCvVectorSync } from '../../services/cvVectorSyncService.js';

const makeCvCode = () => `CV${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

function parseJsonLike(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function normalizeEducationsResponse(raw) {
  const parsed = parseJsonLike(raw);
  const list = Array.isArray(parsed) ? parsed : [];
  return list.map((edu) => {
    if (!edu || typeof edu !== 'object') return {};
    const startDate = edu.start_date || (edu.year ? `${edu.year}${edu.month ? `/${edu.month}` : ''}` : null);
    const endDate = edu.end_date || (edu.endYear ? `${edu.endYear}${edu.endMonth ? `/${edu.endMonth}` : ''}` : null);
    return {
      school_name: edu.school_name || null,
      major: edu.major || null,
      start_date: startDate,
      end_date: endDate,
      status: edu.status || null
    };
  });
}

function normalizeProjectResponse(raw) {
  const parsed = parseJsonLike(raw);
  const list = Array.isArray(parsed) ? parsed : [];
  return list.map((project) => {
    if (!project || typeof project !== 'object') return {};
    return {
      project_name: project.project_name || project.name || project.business_objective || project.business_purpose || '',
      role: project.role || project.project_role || project.position || '',
      description: project.description || project.responsibilities || '',
      tools_tech: Array.isArray(project.tools)
        ? project.tools.map((t) => (t == null ? '' : String(t))).filter(Boolean).join(', ')
        : (project.tools_tech || project.tools || ''),
      team_size: project.team_size || project.teamSize || project.team_size_role || project.scale_role || '',
      startYear: project.startYear || project.project_start_year || '',
      startMonth: project.startMonth || project.project_start_month || '',
      endYear: project.endYear || project.project_end_year || '',
      endMonth: project.endMonth || project.project_end_month || '',
      period: project.period || '',
    };
  });
}

function normalizeWorkExperienceItemResponse(item) {
  const base = item && typeof item === 'object' ? item : {};
  return {
    ...base,
    employmentPlace: base.employmentPlace || base.employment_place || base.work_location || base.location || '',
    employment_place: base.employment_place || base.employmentPlace || base.work_location || base.location || '',
    companyRole: base.companyRole || base.company_role || base.position_role || base.position_name || base.position || '',
    company_role: base.company_role || base.companyRole || base.position_role || base.position_name || base.position || '',
    projects: normalizeProjectResponse(base.projects)
  };
}

function normalizeWorkExperiencesResponse(raw) {
  const parsed = parseJsonLike(raw);
  const empty = { shokumu_job_history: [], rirekisho_work_history: [] };
  if (!parsed) return empty;

  if (Array.isArray(parsed)) {
    return {
      shokumu_job_history: [],
      rirekisho_work_history: parsed.map(normalizeWorkExperienceItemResponse)
    };
  }

  if (typeof parsed === 'object') {
    return {
      shokumu_job_history: Array.isArray(parsed.shokumu_job_history)
        ? parsed.shokumu_job_history.map(normalizeWorkExperienceItemResponse)
        : [],
      rirekisho_work_history: Array.isArray(parsed.rirekisho_work_history)
        ? parsed.rirekisho_work_history.map(normalizeWorkExperienceItemResponse)
        : []
    };
  }

  return empty;
}

function normalizeCvDetailResponse(cvLike) {
  const cvData = cvLike && typeof cvLike.toJSON === 'function' ? cvLike.toJSON() : { ...(cvLike || {}) };
  cvData.educations = normalizeEducationsResponse(cvData.educations);
  cvData.workExperiences = normalizeWorkExperiencesResponse(cvData.workExperiences);
  return cvData;
}

async function getSuperAdminId() {
  const superAdmin = await Admin.findOne({
    where: { role: 1 },
    order: [['id', 'ASC']],
    attributes: ['id']
  });
  return superAdmin?.id || null;
}

export const applicantCvController = {
  createMyCV: async (req, res, next) => {
    try {
      const superAdminId = await getSuperAdminId();
      if (!superAdminId) {
        return res.status(500).json({
          success: false,
          message: 'Không tìm thấy tài khoản super_admin để gán hồ sơ'
        });
      }

      const applicant = await Applicant.findByPk(req.applicant.id, { attributes: ['id', 'name', 'email', 'phone'] });
      if (!applicant) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản ứng viên'
        });
      }

      const payload = req.body || {};
      const cv = await CVStorage.create({
        applicantId: applicant.id,
        adminId: superAdminId,
        collaboratorId: null,
        code: makeCvCode(),
        name: payload.name || applicant.name || null,
        email: payload.email || applicant.email || null,
        phone: payload.phone || applicant.phone || null,
        furigana: payload.furigana || null,
        birthDate: payload.birthDate || null,
        gender: payload.gender ?? null,
        postalCode: payload.postalCode || null,
        addressCurrent: payload.addressCurrent || null,
        addressOrigin: payload.addressOrigin || null,
        desiredPosition: payload.desiredPosition || null,
        desiredWorkLocation: payload.desiredWorkLocation || null,
        careerSummary: payload.careerSummary || null,
        strengths: payload.strengths || null,
        motivation: payload.motivation || null,
        technicalSkills: payload.technicalSkills || null,
        educations: payload.educations || null,
        workExperiences: payload.workExperiences || null,
        certificates: payload.certificates || null,
        status: CV_STATUS_NEW,
        isDuplicate: false,
        duplicateWithCvId: null
      });

      let duplicateResult = null;
      const cvEmail = payload.email || applicant.email || null;
      const cvPhone = payload.phone || applicant.phone || null;
      if (cvEmail || cvPhone) {
        const { duplicateResult: dr } = await runCvDuplicatePipelineAfterCreate(cv);
        duplicateResult = dr;
      }
      await cv.reload();

      try {
        await enqueueCvVectorSync(cv.id);
      } catch (vectorError) {
        console.warn('[Applicant createMyCV] Enqueue vector sync failed:', vectorError?.message || vectorError);
      }

      return res.status(201).json({
        success: true,
        message: 'Tạo hồ sơ ứng viên thành công',
        data: {
          cv: normalizeCvDetailResponse(cv),
          duplicateInfo: duplicateResult
            ? {
                isDuplicate: duplicateResult.isDuplicate,
                duplicateWithCvId: duplicateResult.duplicateWithCvId,
                message: duplicateResult.message
              }
            : { isDuplicate: false }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  getMyCVs: async (req, res, next) => {
    try {
      const cvs = await CVStorage.findAll({
        where: { applicantId: req.applicant.id },
        order: [['created_at', 'DESC']],
        include: [
          {
            model: JobCategory,
            as: 'jobCategory',
            required: false,
            attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug', 'parentId']
          }
        ]
      });

      return res.json({
        success: true,
        data: { cvs: cvs.map((cv) => normalizeCvDetailResponse(cv)) }
      });
    } catch (error) {
      next(error);
    }
  },

  getMyCVById: async (req, res, next) => {
    try {
      const cv = await CVStorage.findOne({
        where: {
          id: req.params.id,
          applicantId: req.applicant.id
        },
        include: [
          {
            model: JobCategory,
            as: 'jobCategory',
            required: false,
            attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug', 'parentId']
          }
        ]
      });
      if (!cv) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hồ sơ'
        });
      }

      return res.json({
        success: true,
        data: { cv: normalizeCvDetailResponse(cv) }
      });
    } catch (error) {
      next(error);
    }
  }
};


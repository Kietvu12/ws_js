import {
  Job,
  JobCategory,
  Company,
  WorkingLocation,
  WorkingLocationDetail,
  SalaryRange,
  SalaryRangeDetail,
  OvertimeAllowance,
  OvertimeAllowanceDetail,
  Requirement,
  SmokingPolicy,
  SmokingPolicyDetail,
  WorkingHour,
  WorkingHourDetail,
  Benefit,
  JobPickup,
  JobPickupId,
  Type,
  Value,
  JobValue,
  JobApplication,
  JobCampaign,
  Campaign,
  ActionLog,
  JobRecruitingCompany,
  JobRecruitingCompanyService,
  JobRecruitingCompanyBusinessSector
} from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { isS3Key, getSignedUrlForFile, buildJdTemplatePdfKey, buildJdFileKey, uploadBufferToS3, s3Enabled, deleteFileFromS3, makeDownloadDisposition } from '../../services/s3Service.js';
import { generateJdPdfBuffer } from '../../services/jdPdfService.js';
import { parseDateOnlyQuery } from '../../utils/parseDateOnlyQuery.js';
import { executeJobListQuery, MAX_JOB_LIST_LIMIT } from '../../services/jobListQueryService.js';
import { bumpJobListCacheVersion } from '../../services/jobListCache.js';
import { buildJdDownloadFilename } from '../../utils/jdDownloadFilename.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Body JSON thuần hoặc multipart có field `data` = JSON string. */
function parseAdminJobBody(req) {
  const b = req.body;
  if (b && typeof b.data === 'string') {
    try {
      return JSON.parse(b.data);
    } catch {
      return b;
    }
  }
  return b;
}

/** Mảng phúc lợi bổ sung (bảng `benefits`): content bắt buộc ở DB; bỏ dòng trống hoàn toàn. */
function normalizeBenefitCreateRows(benefitsInput) {
  if (!Array.isArray(benefitsInput)) return [];
  const rows = [];
  for (const item of benefitsInput) {
    if (item == null) continue;
    if (typeof item === 'string') {
      const c = String(item).trim();
      if (!c) continue;
      rows.push({ content: c, contentEn: null, contentJp: null });
      continue;
    }
    if (typeof item === 'object') {
      const content = String(
        item.content ?? item.contentVi ?? item.content_vi ?? ''
      ).trim();
      const contentEn = item.contentEn != null && String(item.contentEn).trim() !== ''
        ? String(item.contentEn).trim()
        : (item.content_en != null && String(item.content_en).trim() !== ''
          ? String(item.content_en).trim()
          : null);
      const contentJp = item.contentJp != null && String(item.contentJp).trim() !== ''
        ? String(item.contentJp).trim()
        : (item.content_jp != null && String(item.content_jp).trim() !== ''
          ? String(item.content_jp).trim()
          : null);
      if (!content && !contentEn && !contentJp) continue;
      rows.push({
        content: content || contentEn || contentJp || '',
        contentEn,
        contentJp
      });
    }
  }
  return rows;
}

/** Lưu file JD gốc upload (S3 hoặc local). Trả true nếu đã gán jdOriginal*. */
async function persistJdOriginalUpload(job, reqFile, jdFolder) {
  if (!reqFile?.buffer?.length) return false;
  const origName = reqFile.originalname || 'jd_original.pdf';
  const extRaw = path.extname(origName) || '.pdf';
  const safeExt = /^\.[a-zA-Z0-9]{1,10}$/.test(extRaw) ? extRaw.toLowerCase() : '.pdf';
  const mime = reqFile.mimetype || 'application/octet-stream';
  if (s3Enabled()) {
    const keyOriginal = `job_descriptions/${job.id}/jd_original${safeExt}`;
    await uploadBufferToS3(reqFile.buffer, keyOriginal, mime);
    job.jdOriginalFile = keyOriginal;
    job.jdOriginalFilename = origName;
  } else {
    await fs.mkdir(jdFolder, { recursive: true });
    const base = path.join(__dirname, '../../../');
    const p = path.join(jdFolder, `jd_original${safeExt}`);
    await fs.writeFile(p, reqFile.buffer);
    job.jdOriginalFile = path.relative(base, p);
    job.jdOriginalFilename = origName;
  }
  return true;
}

function makeInlineDisposition(filename) {
  if (!filename || typeof filename !== 'string') return 'inline';
  const clean = filename.replace(/["\\]/g, '_').trim() || 'download.pdf';
  const isAscii = /^[\x00-\x7F]*$/.test(clean);
  if (isAscii) return `inline; filename="${clean}"`;
  const ext = path.extname(clean);
  const fallback = `download${ext}`;
  const encoded = encodeURIComponent(clean);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function deriveNumberOfHires(body, workingLocations = []) {
  const candidates = [
    body?.numberOfHires,
    body?.numberOfHiresEn,
    body?.numberOfHiresJp,
    workingLocations?.[0]?.numberOfHires,
    workingLocations?.[0]?.number_of_hires
  ];
  const raw = candidates.find((v) => v != null && String(v).trim() !== '');
  return raw != null ? String(raw).trim() : null;
}

/**
 * Job Management Controller (Admin)
 */
export const jobController = {
  /**
   * Get list of jobs
   * GET /api/admin/jobs
   */
  getJobs: async (req, res, next) => {
    try {
      const { cursor, limit = 10 } = req.query;
      const { plainRows, nextCursor, hasMore } = await executeJobListQuery({
        mode: 'admin',
        reqQuery: req.query,
        cursorToken: cursor || null,
        limitRaw: limit
      });
      const { attachCampaignCommissionToJobs } = await import('../../utils/campaignCommissionHelper.js');
      const jobs = attachCampaignCommissionToJobs(plainRows, true, 1);
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_JOB_LIST_LIMIT);
      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            limit: limitNum,
            nextCursor,
            hasMore
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get job by ID
   * GET /api/admin/jobs/:id
   */
  getJobById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const mode = String(req.query.mode || req.query.view || '').toLowerCase();
      const isEditMode = mode === 'edit' || mode === 'light' || mode === 'form';

      const include = [
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
          required: false,
          include: [
            {
              model: JobRecruitingCompanyService,
              as: 'services',
              required: false,
              order: [['order', 'ASC']]
            },
            {
              model: JobRecruitingCompanyBusinessSector,
              as: 'businessSectors',
              required: false,
              order: [['order', 'ASC']]
            }
          ]
        },
        {
          model: WorkingLocation,
          as: 'workingLocations',
          required: false
        },
        {
          model: WorkingLocationDetail,
          as: 'workingLocationDetails',
          required: false,
          separate: true
        },
        {
          model: SalaryRange,
          as: 'salaryRanges',
          required: false,
          separate: true
        },
        {
          model: SalaryRangeDetail,
          as: 'salaryRangeDetails',
          required: false,
          separate: true
        },
        {
          model: OvertimeAllowance,
          as: 'overtimeAllowances',
          required: false,
          separate: true
        },
        {
          model: OvertimeAllowanceDetail,
          as: 'overtimeAllowanceDetails',
          required: false,
          separate: true
        },
        {
          model: Requirement,
          as: 'requirements',
          required: false,
          separate: true
        },
        {
          model: SmokingPolicy,
          as: 'smokingPolicies',
          required: false,
          separate: true
        },
        {
          model: SmokingPolicyDetail,
          as: 'smokingPolicyDetails',
          required: false,
          separate: true
        },
        {
          model: WorkingHour,
          as: 'workingHours',
          required: false,
          separate: true
        },
        {
          model: WorkingHourDetail,
          as: 'workingHourDetails',
          required: false,
          separate: true
        },
        {
          model: Benefit,
          as: 'benefits',
          required: false,
          separate: true,
          attributes: ['id', 'content', 'contentEn', 'contentJp']
        },
        {
          model: JobValue,
          as: 'jobValues',
          required: false,
          separate: true,
          include: [
            {
              model: Type,
              as: 'type',
              required: false
            },
            {
              model: Value,
              as: 'valueRef',
              required: false
            }
          ]
        },
        {
          model: JobPickupId,
          as: 'jobPickupIds',
          required: false,
          separate: true,
          include: [
            {
              model: JobPickup,
              as: 'pickup',
              required: false
            }
          ]
        },
        {
          model: JobCampaign,
          as: 'jobCampaigns',
          required: false,
          separate: true,
          include: [
            {
              model: Campaign,
              as: 'campaign',
              required: false,
              attributes: ['id', 'name', 'status']
            }
          ]
        }
      ];

      const job = await Job.findByPk(id, { include });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy việc làm'
        });
      }

      const jobJson = typeof job.toJSON === 'function' ? job.toJSON() : { ...job };
      res.json({
        success: true,
        data: { job: jobJson }
      });
    } catch (error) {
      next(error);
    }
  },

  getJobEditData: async (req, res, next) => {
    try {
      const { id } = req.params;

      const job = await Job.findByPk(id, {
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
            required: false,
            include: [
              {
                model: JobRecruitingCompanyService,
                as: 'services',
                required: false,
                order: [['order', 'ASC']]
              },
              {
                model: JobRecruitingCompanyBusinessSector,
                as: 'businessSectors',
                required: false,
                order: [['order', 'ASC']]
              }
            ]
          },
          { model: WorkingLocation, as: 'workingLocations', required: false },
          { model: WorkingLocationDetail, as: 'workingLocationDetails', required: false, separate: true },
          { model: SalaryRange, as: 'salaryRanges', required: false, separate: true },
          { model: SalaryRangeDetail, as: 'salaryRangeDetails', required: false, separate: true },
          { model: OvertimeAllowance, as: 'overtimeAllowances', required: false, separate: true },
          { model: OvertimeAllowanceDetail, as: 'overtimeAllowanceDetails', required: false, separate: true },
          { model: Requirement, as: 'requirements', required: false, separate: true },
          { model: SmokingPolicy, as: 'smokingPolicies', required: false, separate: true },
          { model: SmokingPolicyDetail, as: 'smokingPolicyDetails', required: false, separate: true },
          { model: WorkingHour, as: 'workingHours', required: false, separate: true },
          { model: WorkingHourDetail, as: 'workingHourDetails', required: false, separate: true },
          {
            model: Benefit,
            as: 'benefits',
            required: false,
            separate: true,
            attributes: ['id', 'content', 'contentEn', 'contentJp']
          },
          {
            model: JobValue,
            as: 'jobValues',
            required: false,
            separate: true,
            include: [
              { model: Type, as: 'type', required: false },
              { model: Value, as: 'valueRef', required: false }
            ]
          },
          {
            model: JobPickupId,
            as: 'jobPickupIds',
            required: false,
            separate: true,
            include: [{ model: JobPickup, as: 'pickup', required: false }]
          },
          {
            model: JobCampaign,
            as: 'jobCampaigns',
            required: false,
            separate: true,
            include: [{ model: Campaign, as: 'campaign', required: false, attributes: ['id', 'name', 'status'] }]
          }
        ]
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy việc làm'
        });
      }

      res.json({
        success: true,
        data: { job: typeof job.toJSON === 'function' ? job.toJSON() : job }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Lấy URL xem/tải file JD hoặc required CV form (S3 signed URL hoặc URL tĩnh)
   * GET /api/admin/jobs/:id/view-url?fileType=jdFile|jdFileEn|jdFileJp|jdOriginalFile|requiredCvForm&purpose=view|download
   */
  getJobFileUrl: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'jdFile', purpose = 'view' } = req.query;

      const job = await Job.findByPk(id, {
        attributes: [
          'id',
          'jobCode',
          'title',
          'titleEn',
          'titleJp',
          'jdFile',
          'jdFileEn',
          'jdFileJp',
          'jdOriginalFile',
          'requiredCvForm'
        ]
      });
      if (!job) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy việc làm' });
      }

      let filePath;
      if (fileType === 'requiredCvForm') {
        filePath = job.requiredCvForm ?? job.get?.('required_cv_form');
      } else if (fileType === 'jdFileEn') {
        filePath = job.jdFileEn ?? job.get?.('jd_file_en');
      } else if (fileType === 'jdFileJp') {
        filePath = job.jdFileJp ?? job.get?.('jd_file_jp');
      } else if (fileType === 'jdOriginalFile') {
        filePath = job.jdOriginalFile ?? job.get?.('jd_original_file');
      } else {
        filePath = job.jdFile ?? job.get?.('jd_file');
      }
      if (!filePath) {
        return res.status(404).json({ success: false, message: 'File không tồn tại' });
      }

      const desiredFilename = (() => {
        if (purpose !== 'download') return null;
        if (fileType === 'jdFile') return buildJdDownloadFilename(job.jobCode, job.title, filePath);
        if (fileType === 'jdFileEn') return buildJdDownloadFilename(job.jobCode, job.titleEn, filePath);
        if (fileType === 'jdFileJp') return buildJdDownloadFilename(job.jobCode, job.titleJp, filePath);
        if (fileType === 'jdOriginalFile') return buildJdDownloadFilename(job.jobCode, job.title, filePath);
        if (fileType === 'requiredCvForm') return buildJdDownloadFilename(job.jobCode, job.title, filePath);
        return null;
      })();

      if (isS3Key(filePath)) {
        const disposition = purpose === 'download'
          ? makeDownloadDisposition(desiredFilename || (path.basename(filePath).replace(/^[a-f0-9-]+_/i, '') || 'download'))
          : null;
        const url = await getSignedUrlForFile(filePath, purpose, disposition);
        if (url) return res.json({ success: true, data: { url } });
        return res.status(503).json({
          success: false,
          message: 'File lưu trên S3. Vui lòng cấu hình AWS S3 trong .env.'
        });
      }

      // Local file: purpose=download -> trả về endpoint download để set Content-Disposition đúng filename.
      if (purpose === 'download') {
        const apiBase = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
        return res.json({
          success: true,
          data: {
            url: `${apiBase}/api/admin/jobs/${id}/download?${new URLSearchParams({ fileType: String(fileType) }).toString()}`
          }
        });
      }

      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return res.json({ success: true, data: { url: filePath } });
      }
      const apiBase = `${req.protocol}://${req.get('host')}`;
      const url = filePath.startsWith('/') ? `${apiBase}${filePath}` : `${apiBase}/${filePath}`;
      res.json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Download local file / redirect S3 signed URL (để set Content-Disposition filename unicode đúng)
   * GET /api/admin/jobs/:id/download?fileType=jdFile|jdFileEn|jdFileJp|jdOriginalFile|requiredCvForm
   */
  downloadJobFile: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fileType = 'jdFile' } = req.query;

      const job = await Job.findByPk(id, {
        attributes: [
          'id',
          'jobCode',
          'title',
          'titleEn',
          'titleJp',
          'jdFile',
          'jdFileEn',
          'jdFileJp',
          'jdOriginalFile',
          'requiredCvForm'
        ]
      });
      if (!job) return res.status(404).json({ success: false, message: 'Không tìm thấy việc làm' });

      let filePath;
      if (fileType === 'requiredCvForm') filePath = job.requiredCvForm ?? job.get?.('required_cv_form');
      else if (fileType === 'jdFileEn') filePath = job.jdFileEn ?? job.get?.('jd_file_en');
      else if (fileType === 'jdFileJp') filePath = job.jdFileJp ?? job.get?.('jd_file_jp');
      else if (fileType === 'jdOriginalFile') filePath = job.jdOriginalFile ?? job.get?.('jd_original_file');
      else filePath = job.jdFile ?? job.get?.('jd_file');

      if (!filePath) return res.status(404).json({ success: false, message: 'File không tồn tại' });

      const desiredFilename = (() => {
        if (fileType === 'jdFile') return buildJdDownloadFilename(job.jobCode, job.title, filePath);
        if (fileType === 'jdFileEn') return buildJdDownloadFilename(job.jobCode, job.titleEn, filePath);
        if (fileType === 'jdFileJp') return buildJdDownloadFilename(job.jobCode, job.titleJp, filePath);
        if (fileType === 'jdOriginalFile') return buildJdDownloadFilename(job.jobCode, job.title, filePath);
        if (fileType === 'requiredCvForm') return buildJdDownloadFilename(job.jobCode, job.title, filePath);
        return null;
      })();

      if (isS3Key(filePath)) {
        const disposition = makeDownloadDisposition(desiredFilename || (path.basename(filePath).replace(/^[a-f0-9-]+_/i, '') || 'download'));
        const signedUrl = await getSignedUrlForFile(filePath, 'download', disposition);
        if (signedUrl) return res.redirect(302, signedUrl);
        return res.status(503).json({ success: false, message: 'Không tạo được signed URL cho S3.' });
      }

      const backendRoot = path.resolve(__dirname, '../../../');
      const fullPath = path.join(backendRoot, String(filePath).replace(/^\//, ''));
      const stats = await fs.stat(fullPath).catch(() => null);
      if (!stats) return res.status(404).json({ success: false, message: 'File không tồn tại trên server' });

      const ext = path.extname(fullPath).toLowerCase();
      const mime = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';
      const filename = desiredFilename || path.basename(fullPath);

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', makeDownloadDisposition(filename));
      res.setHeader('Content-Length', stats.size);

      const data = await fs.readFile(fullPath);
      res.send(data);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Preview JD template PDF (A4) from current form payload (không lưu DB)
   * POST /api/admin/jobs/preview-jd-pdf
   */
  previewJdPdf: async (req, res, next) => {
    try {
      const payload = req.body && typeof req.body === 'object' ? req.body : {};
      const langRaw = String(payload.lang ?? payload.jdlanguage ?? payload.language ?? 'vi').toLowerCase();
      const lang = langRaw === 'en' ? 'en' : langRaw === 'jp' ? 'jp' : 'vi';

      const jobCategoryId = payload.jobCategoryId ?? payload.job_category_id ?? payload.categoryId ?? null;

      let category = null;
      if (jobCategoryId) {
        category = await JobCategory.findByPk(jobCategoryId);
      }

      const jobValuesPayload = Array.isArray(payload.jobValues) ? payload.jobValues : [];
      const typeIds = [...new Set(jobValuesPayload.map(jv => jv?.typeId).filter(v => v != null))];
      const valueIds = [...new Set(jobValuesPayload.map(jv => jv?.valueId).filter(v => v != null))];

      const [types, values] = await Promise.all([
        typeIds.length ? Type.findAll({ where: { id: typeIds } }) : Promise.resolve([]),
        valueIds.length ? Value.findAll({ where: { id: valueIds } }) : Promise.resolve([])
      ]);

      const typeMap = new Map(types.map(t => [String(t.id), t]));
      const valueMap = new Map(values.map(v => [String(v.id), v]));

      const jobValuesEnriched = jobValuesPayload.map(jv => {
        const type = typeMap.get(String(jv.typeId)) || null;
        const valueRef = valueMap.get(String(jv.valueId)) || null;
        return {
          ...jv,
          type: type || (jv.typeId ? { id: jv.typeId, cvField: null } : null),
          valueRef: valueRef || { id: jv.valueId, valuename: jv.value ?? '', name: jv.value ?? '' }
        };
      });

      const titleForLang = lang === 'en' ? (payload.titleEn || payload.title) : lang === 'jp' ? (payload.titleJp || payload.title) : payload.title;
      const filename = buildJdDownloadFilename(payload.jobCode, titleForLang, 'preview.pdf');

      const jobLike = {
        ...payload,
        category,
        recruitingCompany: payload.recruitingCompany || null,
        jobValues: jobValuesEnriched
      };

      const buffer = await generateJdPdfBuffer(jobLike, lang);
      if (!buffer || !buffer.length) {
        return res.status(503).json({ success: false, message: 'Không tạo được JD PDF. Kiểm tra Chromium/Puppeteer.' });
      }

      res.status(200)
        .set('Content-Type', 'application/pdf')
        .set('Content-Disposition', makeInlineDisposition(filename))
        .send(buffer);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new job
   * POST /api/admin/jobs
   */
  createJob: async (req, res, next) => {
    try {
      const body = parseAdminJobBody(req);
      const {
        jobCode,
        jobCategoryId,
        title,
        titleEn,
        titleJp,
        slug,
        description,
        descriptionEn,
        descriptionJp,
        instruction,
        instructionEn,
        instructionJp,
        recruitmentReason,
        recruitmentReasonEn,
        recruitmentReasonJp,
        interviewLocation,
        numberOfHires,
        numberOfHiresEn,
        numberOfHiresJp,
        bonus,
        bonusEn,
        bonusJp,
        salaryReview,
        salaryReviewEn,
        salaryReviewJp,
        holidays,
        holidaysEn,
        holidaysJp,
        holidayDetails,
        holidayDetailsEn,
        holidayDetailsJp,
        socialInsurance,
        socialInsuranceEn,
        socialInsuranceJp,
        transportation,
        transportationEn,
        transportationJp,
        breakTime,
        breakTimeEn,
        breakTimeJp,
        overtime,
        overtimeEn,
        overtimeJp,
        recruitmentType,
        residenceStatus,
        residenceStatusEn,
        residenceStatusJp,
        residenceStatuses,
        contractPeriod,
        contractPeriodEn,
        contractPeriodJp,
        probationPeriod,
        probationPeriodEn,
        probationPeriodJp,
        probationDetail,
        probationDetailEn,
        probationDetailJp,
        companyId,
        recruitmentProcess,
        recruitmentProcessEn,
        recruitmentProcessJp,
        transferAbility,
        transferAbilityEn,
        transferAbilityJp,
        highlights,
        adminAdviseVi,
        adminAdviseEn,
        adminAdviseJp,
        admin_advise_vi,
        admin_advise_en,
        admin_advise_jp,
        deadline,
        status = 1,
        isPinned = false,
        isHot = false,
        jobCommissionType = 'fixed',
        jdFile,
        jdOriginalFilename,
        requiredCvForm,
        requiredCvFormOriginalFilename,
        // Related data
        workingLocations = [],
        workingLocationDetails = [],
        salaryRanges = [],
        salaryRangeDetails = [],
        overtimeAllowances = [],
        overtimeAllowanceDetails = [],
        requirements = [],
        benefits = [],
        smokingPolicies = [],
        smokingPolicyDetails = [],
        workingHours = [],
        workingHourDetails = [],
        jobValues = [],
        jobPickupIds = [],
        campaignIds = [],
        // Recruiting company data
        recruitingCompany
      } = body;

      const benefitRows = normalizeBenefitCreateRows(benefits);
      const normalizeJsonField = (value) => {
        if (value == null || value === '') return null;
        if (Array.isArray(value)) return JSON.stringify(value);
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'string') {
          const s = value.trim();
          if (!s) return null;
          try {
            const parsed = JSON.parse(s);
            return JSON.stringify(parsed);
          } catch {
            return JSON.stringify([s]);
          }
        }
        return JSON.stringify([value]);
      };

      // Validate required fields
      if (!jobCode || !jobCategoryId || !title || !slug) {
        return res.status(400).json({
          success: false,
          message: 'Mã việc làm, danh mục, tiêu đề và slug là bắt buộc'
        });
      }

      // Check if job_code already exists
      const existingJob = await Job.findOne({ where: { jobCode } });
      if (existingJob) {
        return res.status(409).json({
          success: false,
          message: 'Mã việc làm đã tồn tại'
        });
      }

      // Check if slug already exists
      const existingSlug = await Job.findOne({ where: { slug } });
      if (existingSlug) {
        return res.status(409).json({
          success: false,
          message: 'Slug đã tồn tại'
        });
      }

      // Validate category
      const category = await JobCategory.findByPk(jobCategoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Danh mục việc làm không tồn tại'
        });
      }

      // Validate company if provided
      if (companyId) {
        const company = await Company.findByPk(companyId);
        if (!company) {
          return res.status(404).json({
            success: false,
            message: 'Công ty không tồn tại'
          });
        }
      }

      // Use transaction for all related data
      const transaction = await sequelize.transaction();

      try {
        // Create job
        const derivedNumberOfHires = deriveNumberOfHires(body, workingLocations);
        const job = await Job.create({
          jobCode,
          jobCategoryId,
          businessSectorKey: body.businessSectorKey || null,
          title,
          titleEn: titleEn || null,
          titleJp: titleJp || null,
          slug,
          description,
          descriptionEn: descriptionEn || null,
          descriptionJp: descriptionJp || null,
          instruction,
          instructionEn: instructionEn || null,
          instructionJp: instructionJp || null,
          recruitmentReason: recruitmentReason || null,
          recruitmentReasonEn: recruitmentReasonEn || null,
          recruitmentReasonJp: recruitmentReasonJp || null,
          interviewLocation,
          numberOfHires: derivedNumberOfHires,
          numberOfHiresEn: numberOfHiresEn || derivedNumberOfHires || null,
          numberOfHiresJp: numberOfHiresJp || derivedNumberOfHires || null,
          bonus,
          bonusEn: bonusEn || null,
          bonusJp: bonusJp || null,
          salaryReview,
          salaryReviewEn: salaryReviewEn || null,
          salaryReviewJp: salaryReviewJp || null,
          holidays,
          holidaysEn: holidaysEn || null,
          holidaysJp: holidaysJp || null,
          holidayDetails: holidayDetails || null,
          holidayDetailsEn: holidayDetailsEn || null,
          holidayDetailsJp: holidayDetailsJp || null,
          socialInsurance,
          socialInsuranceEn: socialInsuranceEn || null,
          socialInsuranceJp: socialInsuranceJp || null,
          transportation,
          transportationEn: transportationEn || null,
          transportationJp: transportationJp || null,
          breakTime,
          breakTimeEn: breakTimeEn || null,
          breakTimeJp: breakTimeJp || null,
          overtime,
          overtimeEn: overtimeEn || null,
          overtimeJp: overtimeJp || null,
          recruitmentType,
          residenceStatuses: normalizeJsonField(residenceStatuses),
          residenceStatus: residenceStatus || null,
          residenceStatusEn: residenceStatusEn || null,
          residenceStatusJp: residenceStatusJp || null,
          contractPeriod,
          contractPeriodEn: contractPeriodEn || null,
          contractPeriodJp: contractPeriodJp || null,
          probationPeriod: probationPeriod || null,
          probationPeriodEn: probationPeriodEn || null,
          probationPeriodJp: probationPeriodJp || null,
          probationDetail: probationDetail || null,
          probationDetailEn: probationDetailEn || null,
          probationDetailJp: probationDetailJp || null,
          companyId: companyId || null,
          recruitmentProcess,
          recruitmentProcessEn: recruitmentProcessEn || null,
          recruitmentProcessJp: recruitmentProcessJp || null,
          transferAbility: transferAbility || null,
          transferAbilityEn: transferAbilityEn || null,
          transferAbilityJp: transferAbilityJp || null,
          highlights: highlights || null,
          adminAdviseVi: (adminAdviseVi ?? admin_advise_vi) || null,
          adminAdviseEn: (adminAdviseEn ?? admin_advise_en) || null,
          adminAdviseJp: (adminAdviseJp ?? admin_advise_jp) || null,
          deadline,
          status,
          isPinned,
          isHot,
          jobCommissionType,
          jdFile: null,
          jdOriginalFilename: null,
          requiredCvForm,
          requiredCvFormOriginalFilename
        }, { transaction });

        // Create working locations
        if (workingLocations.length > 0) {
          await WorkingLocation.bulkCreate(
            workingLocations.map(loc => ({
              jobId: job.id,
              location: loc.location,
              country: loc.country,
              numberOfHires: loc.numberOfHires || null
            })),
            { transaction }
          );
        }

        // Create working location details
        if (workingLocationDetails.length > 0) {
          await WorkingLocationDetail.bulkCreate(
            workingLocationDetails.map(detail => ({
              jobId: job.id,
              content: typeof detail === 'string' ? detail : detail.content || '',
              contentEn: typeof detail === 'object'
                ? (detail.contentEn || detail.content_en || null)
                : null,
              contentJp: typeof detail === 'object'
                ? (detail.contentJp || detail.content_jp || null)
                : null
            })),
            { transaction }
          );
        }

        // Create salary ranges
        if (salaryRanges.length > 0) {
          await SalaryRange.bulkCreate(
            salaryRanges.map(range => ({
              jobId: job.id,
              salaryRange: range.salaryRange,
              salaryRangeEn: range.salaryRangeEn || range.salary_range_en || null,
              salaryRangeJp: range.salaryRangeJp || range.salary_range_jp || null,
              type: range.type,
              typeEn: range.typeEn || range.type_en || null,
              typeJp: range.typeJp || range.type_jp || null
            })),
            { transaction }
          );
        }

        // Create salary range details
        if (salaryRangeDetails.length > 0) {
          await SalaryRangeDetail.bulkCreate(
            salaryRangeDetails.map(detail => ({
              jobId: job.id,
              content: typeof detail === 'string' ? detail : detail.content || '',
              contentEn: typeof detail === 'object'
                ? (detail.contentEn || detail.content_en || null)
                : null,
              contentJp: typeof detail === 'object'
                ? (detail.contentJp || detail.content_jp || null)
                : null
            })),
            { transaction }
          );
        }

        // Create overtime allowances
        if (overtimeAllowances.length > 0) {
          await OvertimeAllowance.bulkCreate(
            overtimeAllowances.map(allowance => ({
              jobId: job.id,
              overtimeAllowanceRange: allowance.overtimeAllowanceRange || allowance.range
            })),
            { transaction }
          );
        }

        // Create overtime allowance details
        if (overtimeAllowanceDetails.length > 0) {
          await OvertimeAllowanceDetail.bulkCreate(
            overtimeAllowanceDetails.map(detail => ({
              jobId: job.id,
              content: typeof detail === 'string' ? detail : detail.content || '',
              contentEn: typeof detail === 'object'
                ? (detail.contentEn || detail.content_en || null)
                : null,
              contentJp: typeof detail === 'object'
                ? (detail.contentJp || detail.content_jp || null)
                : null
            })),
            { transaction }
          );
        }

        // Create requirements
        if (requirements.length > 0) {
          await Requirement.bulkCreate(
            requirements.map(req => ({
              jobId: job.id,
              content: req.content,
              contentEn: req.contentEn || req.content_en || null,
              contentJp: req.contentJp || req.content_jp || null,
              type: req.type,
              status: req.status
            })),
            { transaction }
          );
        }

        if (benefitRows.length > 0) {
          await Benefit.bulkCreate(
            benefitRows.map((row) => ({
              jobId: job.id,
              content: row.content,
              contentEn: row.contentEn,
              contentJp: row.contentJp
            })),
            { transaction }
          );
        }

        // Create smoking policies
        if (smokingPolicies.length > 0) {
          await SmokingPolicy.bulkCreate(
            smokingPolicies.map(policy => ({
              jobId: job.id,
              allow: policy.allow
            })),
            { transaction }
          );
        }

        // Create smoking policy details
        if (smokingPolicyDetails.length > 0) {
          await SmokingPolicyDetail.bulkCreate(
            smokingPolicyDetails.map(detail => ({
              jobId: job.id,
              content: typeof detail === 'string' ? detail : detail.content || '',
              contentEn: typeof detail === 'object'
                ? (detail.contentEn || detail.content_en || null)
                : null,
              contentJp: typeof detail === 'object'
                ? (detail.contentJp || detail.content_jp || null)
                : null
            })),
            { transaction }
          );
        }

        // Create working hours
        if (workingHours.length > 0) {
          await WorkingHour.bulkCreate(
            workingHours.map(wh => ({
              jobId: job.id,
              workingHours: wh.workingHours || wh.hours
            })),
            { transaction }
          );
        }

        // Create working hour details
        if (workingHourDetails.length > 0) {
          await WorkingHourDetail.bulkCreate(
            workingHourDetails.map(detail => ({
              jobId: job.id,
              content: typeof detail === 'string' ? detail : detail.content || '',
              contentEn: typeof detail === 'object'
                ? (detail.contentEn || detail.content_en || null)
                : null,
              contentJp: typeof detail === 'object'
                ? (detail.contentJp || detail.content_jp || null)
                : null
            })),
            { transaction }
          );
        }

        // Create job values
        if (jobValues.length > 0) {
          for (const jv of jobValues) {
            if (jv.value && !(parseInt(jv.typeId) === 7 && parseInt(jv.valueId) === 34)) {
              const valueNum = parseFloat(jv.value);
              if (isNaN(valueNum) || valueNum < 0) {
                await transaction.rollback();
                return res.status(400).json({
                  success: false,
                  message: `Giá trị hoa hồng không hợp lệ. Phải là số dương.`
                });
              }
            }
          }

          await JobValue.bulkCreate(
            jobValues.map(jv => ({
              jobId: job.id,
              typeId: jv.typeId,
              valueId: jv.valueId,
              value: jv.value,
              isRequired: jv.isRequired || false,
              viewOnCollaborator: jv.viewOnCollaborator || null
            })),
            { transaction }
          );
        }

        // Create job pickup ids
        if (jobPickupIds.length > 0) {
          await JobPickupId.bulkCreate(
            jobPickupIds.map(pickup => ({
              jobId: job.id,
              jobPickupId: pickup.jobPickupId || pickup.pickupId
            })),
            { transaction }
          );
        }

        // Create job-campaign associations if campaignIds provided
        if (campaignIds && campaignIds.length > 0) {
          // Validate that all campaignIds exist
          const campaigns = await Campaign.findAll({
            where: { id: { [Op.in]: campaignIds } },
            transaction
          });

          if (campaigns.length !== campaignIds.length) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Một số chiến dịch không tồn tại'
            });
          }

          // Create JobCampaign records
          await JobCampaign.bulkCreate(
            campaignIds.map(campaignId => ({
              campaignId: parseInt(campaignId),
              jobId: job.id
            })),
            { transaction }
          );
        }

        // Create recruiting company if provided
        if (recruitingCompany) {
          const recruitingCompanyData = {
            jobId: job.id,
            companyName: recruitingCompany.companyName || null,
            companyNameEn: recruitingCompany.companyNameEn || null,
            companyNameJp: recruitingCompany.companyNameJp || null,
            revenue: recruitingCompany.revenue || null,
            revenueEn: recruitingCompany.revenueEn || null,
            revenueJp: recruitingCompany.revenueJp || null,
            numberOfEmployees: recruitingCompany.numberOfEmployees || null,
            numberOfEmployeesEn: recruitingCompany.numberOfEmployeesEn || null,
            numberOfEmployeesJp: recruitingCompany.numberOfEmployeesJp || null,
            headquarters: recruitingCompany.headquarters || null,
            headquartersEn: recruitingCompany.headquartersEn || null,
            headquartersJp: recruitingCompany.headquartersJp || null,
            companyIntroduction: recruitingCompany.companyIntroduction || null,
            companyIntroductionEn: recruitingCompany.companyIntroductionEn || null,
            companyIntroductionJp: recruitingCompany.companyIntroductionJp || null,
            stockExchangeInfo: recruitingCompany.stockExchangeInfo || null,
            stockExchangeInfoEn: recruitingCompany.stockExchangeInfoEn || null,
            stockExchangeInfoJp: recruitingCompany.stockExchangeInfoJp || null,
            investmentCapital: recruitingCompany.investmentCapital || null,
            investmentCapitalEn: recruitingCompany.investmentCapitalEn || null,
            investmentCapitalJp: recruitingCompany.investmentCapitalJp || null,
            establishedDate: recruitingCompany.establishedDate || null,
            establishedDateEn: recruitingCompany.establishedDateEn || null,
            establishedDateJp: recruitingCompany.establishedDateJp || null
          };

          const createdRecruitingCompany = await JobRecruitingCompany.create(
            recruitingCompanyData,
            { transaction }
          );

          // Create services if provided
          if (recruitingCompany.services && Array.isArray(recruitingCompany.services) && recruitingCompany.services.length > 0) {
            await JobRecruitingCompanyService.bulkCreate(
              recruitingCompany.services.map((service, index) => ({
                jobRecruitingCompanyId: createdRecruitingCompany.id,
                serviceName: typeof service === 'string' ? service : service.serviceName || service.name,
                serviceNameEn: typeof service === 'object' ? (service.serviceNameEn || null) : null,
                serviceNameJp: typeof service === 'object' ? (service.serviceNameJp || null) : null,
                order: typeof service === 'object' && service.order !== undefined ? service.order : index
              })),
              { transaction }
            );
          }

          // Create business sectors if provided
          if (recruitingCompany.businessSectors && Array.isArray(recruitingCompany.businessSectors) && recruitingCompany.businessSectors.length > 0) {
            await JobRecruitingCompanyBusinessSector.bulkCreate(
              recruitingCompany.businessSectors.map((sector, index) => ({
                jobRecruitingCompanyId: createdRecruitingCompany.id,
                sectorName: typeof sector === 'string' ? sector : sector.sectorName || sector.name,
                sectorNameEn: typeof sector === 'object' ? (sector.sectorNameEn || null) : null,
                sectorNameJp: typeof sector === 'object' ? (sector.sectorNameJp || null) : null,
                order: typeof sector === 'object' && sector.order !== undefined ? sector.order : index
              })),
              { transaction }
            );
          }
        }

        await transaction.commit();

        // Reload with all relations
        await job.reload({
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
              required: false,
              include: [
                {
                  model: JobRecruitingCompanyService,
                  as: 'services',
                  required: false,
                  order: [['order', 'ASC']]
                },
                {
                  model: JobRecruitingCompanyBusinessSector,
                  as: 'businessSectors',
                  required: false,
                  order: [['order', 'ASC']]
                }
              ]
            },
            {
              model: WorkingLocation,
              as: 'workingLocations',
              required: false
            },
            {
              model: SalaryRange,
              as: 'salaryRanges',
              required: false
            },
            {
              model: Requirement,
              as: 'requirements',
              required: false
            },
            {
              model: WorkingLocationDetail,
              as: 'workingLocationDetails',
              required: false
            },
            {
              model: SalaryRangeDetail,
              as: 'salaryRangeDetails',
              required: false
            },
            {
              model: OvertimeAllowance,
              as: 'overtimeAllowances',
              required: false
            },
            {
              model: OvertimeAllowanceDetail,
              as: 'overtimeAllowanceDetails',
              required: false
            },
            {
              model: WorkingHour,
              as: 'workingHours',
              required: false
            },
            {
              model: Benefit,
              as: 'benefits',
              required: false,
              attributes: ['id', 'content', 'contentEn', 'contentJp']
            },
            {
              model: JobValue,
              as: 'jobValues',
              required: false,
              include: [
                { model: Type, as: 'type', required: false },
                { model: Value, as: 'valueRef', required: false }
              ]
            }
          ]
        });

        // JD PDF: Puppeteer → buffer → S3 PutObject (S3 không có “thư mục”; key dạng prefix/job_descriptions/id/file_vn.pdf là đủ).
        // Generate JD template PDFs (vi, en, jp), upload to S3 job_descriptions/{id}/file_vn.pdf, file_eng.pdf, file_jp.pdf
        const uploadDir = path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'uploads');
        const jdFolder = path.join(uploadDir, 'job_descriptions', String(job.id));
        try {
          const [pdfBufferVi, pdfBufferEn, pdfBufferJp] = await Promise.all([
            generateJdPdfBuffer(job, 'vi'),
            generateJdPdfBuffer(job, 'en'),
            generateJdPdfBuffer(job, 'jp')
          ]);
          const hasAnyJdPdf =
            (pdfBufferVi && pdfBufferVi.length) ||
            (pdfBufferEn && pdfBufferEn.length) ||
            (pdfBufferJp && pdfBufferJp.length);
          if (!hasAnyJdPdf) {
            console.warn(
              `[Admin createJob] JD PDF: không tạo được buffer nào (Puppeteer/Chromium). jobId=${job.id} — các cột jd_file sẽ NULL. ` +
                'Cài Chromium hoặc đặt PUPPETEER_EXECUTABLE_PATH (vd: /snap/bin/chromium), hoặc chạy: pnpm run puppeteer:install-chrome'
            );
          } else if (!s3Enabled()) {
            console.warn(
              `[Admin createJob] JD PDF: S3 chưa bật (thiếu bucket/credentials trong config) — file ghi vào uploads/job_descriptions/${job.id}/, không upload lên AWS.`
            );
          }
          if (s3Enabled()) {
            const tasks = [];
            if (pdfBufferVi) {
              const keyVn = buildJdFileKey(job.id, 'file_vn');
              tasks.push(uploadBufferToS3(pdfBufferVi, keyVn, 'application/pdf').then(() => { job.jdFile = keyVn; }).catch((e) => { console.warn('[Admin createJob] JD file_vn upload failed:', e.message); }));
            }
            if (pdfBufferEn) {
              const keyEn = buildJdFileKey(job.id, 'file_eng');
              tasks.push(uploadBufferToS3(pdfBufferEn, keyEn, 'application/pdf').then(() => { job.jdFileEn = keyEn; }).catch((e) => { console.warn('[Admin createJob] JD file_eng upload failed:', e.message); }));
            }
            if (pdfBufferJp) {
              const keyJp = buildJdFileKey(job.id, 'file_jp');
              tasks.push(uploadBufferToS3(pdfBufferJp, keyJp, 'application/pdf').then(() => { job.jdFileJp = keyJp; }).catch((e) => { console.warn('[Admin createJob] JD file_jp upload failed:', e.message); }));
            }
            await Promise.all(tasks);
          } else {
            await fs.mkdir(jdFolder, { recursive: true });
            const base = path.join(__dirname, '../../../');
            if (pdfBufferVi) {
              const p = path.join(jdFolder, 'file_vn.pdf');
              await fs.writeFile(p, pdfBufferVi);
              job.jdFile = path.relative(base, p);
            }
            if (pdfBufferEn) {
              const p = path.join(jdFolder, 'file_eng.pdf');
              await fs.writeFile(p, pdfBufferEn);
              job.jdFileEn = path.relative(base, p);
            }
            if (pdfBufferJp) {
              const p = path.join(jdFolder, 'file_jp.pdf');
              await fs.writeFile(p, pdfBufferJp);
              job.jdFileJp = path.relative(base, p);
            }
          }
        } catch (pdfErr) {
          console.warn('[Admin createJob] Không thể tạo JD template PDF:', pdfErr.message);
        }

        // JD gốc: file upload (multipart) hoặc mặc định = bản template tiếng Việt (jd_file)
        let uploadedOriginal = false;
        if (req.file?.buffer?.length) {
          try {
            uploadedOriginal = await persistJdOriginalUpload(job, req.file, jdFolder);
          } catch (origErr) {
            console.warn('[Admin createJob] Upload JD gốc thất bại:', origErr.message);
          }
        }
        if (!uploadedOriginal && job.jdFile) {
          job.jdOriginalFile = job.jdFile;
          job.jdOriginalFilename = buildJdDownloadFilename(job.jobCode, job.title, '.pdf');
        } else if (!uploadedOriginal) {
          job.jdOriginalFile = null;
          job.jdOriginalFilename = null;
        }
        if (job.jdFile != null || job.jdFileEn != null || job.jdFileJp != null || uploadedOriginal) {
          await job.save();
          await job.reload({ include: [{ model: JobCategory, as: 'category', required: false }, { model: Company, as: 'company', required: false }, { model: JobRecruitingCompany, as: 'recruitingCompany', required: false, include: [{ model: JobRecruitingCompanyService, as: 'services', required: false }, { model: JobRecruitingCompanyBusinessSector, as: 'businessSectors', required: false }] }] });
        }

        // Log action
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'Job',
          action: 'create',
          ip: req.ip || req.connection.remoteAddress,
          after: job.toJSON(),
          description: `Tạo mới việc làm: ${job.title} (${job.jobCode})`
        });

        await bumpJobListCacheVersion();

        res.status(201).json({
          success: true,
          message: 'Tạo việc làm thành công',
          data: { job }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update job
   * PUT /api/admin/jobs/:id
   */
  updateJob: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = parseAdminJobBody(req);

      const job = await Job.findByPk(id);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy việc làm'
        });
      }

      // Store old data for log
      const oldData = job.toJSON();

      // Extract related data from updateData
      const {
        workingLocations,
        workingLocationDetails,
        salaryRanges,
        salaryRangeDetails,
        overtimeAllowances,
        overtimeAllowanceDetails,
        requirements,
        smokingPolicies,
        smokingPolicyDetails,
        workingHours,
        workingHourDetails,
        jobValues,
        jobPickupIds,
        campaignIds,
        benefits,
        recruitingCompany,
        ...jobFields
      } = updateData;

      // Normalize possible snake_case payloads -> model camelCase fields
      if (jobFields.admin_advise_vi !== undefined) {
        jobFields.adminAdviseVi = jobFields.admin_advise_vi;
        delete jobFields.admin_advise_vi;
      }
      if (jobFields.admin_advise_en !== undefined) {
        jobFields.adminAdviseEn = jobFields.admin_advise_en;
        delete jobFields.admin_advise_en;
      }
      if (jobFields.admin_advise_jp !== undefined) {
        jobFields.adminAdviseJp = jobFields.admin_advise_jp;
        delete jobFields.admin_advise_jp;
      }
      if (jobFields.recruitment_reason !== undefined) {
        jobFields.recruitmentReason = jobFields.recruitment_reason;
        delete jobFields.recruitment_reason;
      }
      if (jobFields.recruitment_reason_en !== undefined) {
        jobFields.recruitmentReasonEn = jobFields.recruitment_reason_en;
        delete jobFields.recruitment_reason_en;
      }
      if (jobFields.recruitment_reason_jp !== undefined) {
        jobFields.recruitmentReasonJp = jobFields.recruitment_reason_jp;
        delete jobFields.recruitment_reason_jp;
      }

      // Use transaction
      const transaction = await sequelize.transaction();

      try {
        // Update basic job fields
        if (jobFields.jobCode !== undefined) {
          // Cùng transaction để không mượn thêm connection từ pool trong lúc transaction đang mở
          const existingJob = await Job.findOne({
            where: { jobCode: jobFields.jobCode, id: { [Op.ne]: id } },
            transaction
          });
          if (existingJob) {
            await transaction.rollback();
            return res.status(409).json({
              success: false,
              message: 'Mã việc làm đã tồn tại'
            });
          }
        }

        if (jobFields.numberOfHires === undefined || jobFields.numberOfHires === null || String(jobFields.numberOfHires).trim() === '') {
          jobFields.numberOfHires = deriveNumberOfHires(updateData, workingLocations) ?? job.numberOfHires;
        }
        if (jobFields.numberOfHiresEn === undefined || jobFields.numberOfHiresEn === null || String(jobFields.numberOfHiresEn).trim() === '') {
          jobFields.numberOfHiresEn = jobFields.numberOfHires ?? job.numberOfHiresEn;
        }
        if (jobFields.numberOfHiresJp === undefined || jobFields.numberOfHiresJp === null || String(jobFields.numberOfHiresJp).trim() === '') {
          jobFields.numberOfHiresJp = jobFields.numberOfHires ?? job.numberOfHiresJp;
        }

        if (jobFields.slug !== undefined) {
          const existingSlug = await Job.findOne({
            where: { slug: jobFields.slug, id: { [Op.ne]: id } },
            transaction
          });
          if (existingSlug) {
            await transaction.rollback();
            return res.status(409).json({
              success: false,
              message: 'Slug đã tồn tại'
            });
          }
        }

        // jdFile / jdOriginal* được set từ JD template PDF generated, không dùng từ body
        delete jobFields.jdFile;
        delete jobFields.jdOriginalFilename;
        delete jobFields.jdOriginalFile;

        // Update job fields
        Object.keys(jobFields).forEach(key => {
          if (jobFields[key] !== undefined) {
            job[key] = jobFields[key];
          }
        });

        await job.save({ transaction });

        // Update related data if provided
        if (workingLocations !== undefined) {
          await WorkingLocation.destroy({ where: { jobId: job.id }, transaction });
          if (workingLocations.length > 0) {
            await WorkingLocation.bulkCreate(
              workingLocations.map(loc => ({
                jobId: job.id,
                location: loc.location,
                country: loc.country,
                numberOfHires: loc.numberOfHires || null
              })),
              { transaction }
            );
          }
        }

        if (workingLocationDetails !== undefined) {
          await WorkingLocationDetail.destroy({ where: { jobId: job.id }, transaction });
          if (workingLocationDetails.length > 0) {
            await WorkingLocationDetail.bulkCreate(
              workingLocationDetails.map(detail => ({
                jobId: job.id,
                content: typeof detail === 'string' ? detail : detail.content || '',
                contentEn: typeof detail === 'object'
                  ? (detail.contentEn || detail.content_en || null)
                  : null,
                contentJp: typeof detail === 'object'
                  ? (detail.contentJp || detail.content_jp || null)
                  : null
              })),
              { transaction }
            );
          }
        }

        if (salaryRanges !== undefined) {
          await SalaryRange.destroy({ where: { jobId: job.id }, transaction });
          if (salaryRanges.length > 0) {
            await SalaryRange.bulkCreate(
              salaryRanges.map(range => ({
                jobId: job.id,
                salaryRange: range.salaryRange,
                salaryRangeEn: range.salaryRangeEn || range.salary_range_en || null,
                salaryRangeJp: range.salaryRangeJp || range.salary_range_jp || null,
                type: range.type,
                typeEn: range.typeEn || range.type_en || null,
                typeJp: range.typeJp || range.type_jp || null
              })),
              { transaction }
            );
          }
        }

        if (salaryRangeDetails !== undefined) {
          await SalaryRangeDetail.destroy({ where: { jobId: job.id }, transaction });
          if (salaryRangeDetails.length > 0) {
            await SalaryRangeDetail.bulkCreate(
              salaryRangeDetails.map(detail => ({
                jobId: job.id,
                content: typeof detail === 'string' ? detail : detail.content || '',
                contentEn: typeof detail === 'object'
                  ? (detail.contentEn || detail.content_en || null)
                  : null,
                contentJp: typeof detail === 'object'
                  ? (detail.contentJp || detail.content_jp || null)
                  : null
              })),
              { transaction }
            );
          }
        }

        if (overtimeAllowances !== undefined) {
          await OvertimeAllowance.destroy({ where: { jobId: job.id }, transaction });
          if (overtimeAllowances.length > 0) {
            await OvertimeAllowance.bulkCreate(
              overtimeAllowances.map(allowance => ({
                jobId: job.id,
                overtimeAllowanceRange: allowance.overtimeAllowanceRange || allowance.range
              })),
              { transaction }
            );
          }
        }

        if (overtimeAllowanceDetails !== undefined) {
          await OvertimeAllowanceDetail.destroy({ where: { jobId: job.id }, transaction });
          if (overtimeAllowanceDetails.length > 0) {
            await OvertimeAllowanceDetail.bulkCreate(
              overtimeAllowanceDetails.map(detail => ({
                jobId: job.id,
                content: typeof detail === 'string' ? detail : detail.content || '',
                contentEn: typeof detail === 'object'
                  ? (detail.contentEn || detail.content_en || null)
                  : null,
                contentJp: typeof detail === 'object'
                  ? (detail.contentJp || detail.content_jp || null)
                  : null
              })),
              { transaction }
            );
          }
        }

        if (requirements !== undefined) {
          await Requirement.destroy({ where: { jobId: job.id }, transaction });
          if (requirements.length > 0) {
            await Requirement.bulkCreate(
              requirements.map(req => ({
                jobId: job.id,
                content: req.content,
                contentEn: req.contentEn || req.content_en || null,
                contentJp: req.contentJp || req.content_jp || null,
                type: req.type,
                status: req.status
              })),
              { transaction }
            );
          }
        }

        if (benefits !== undefined) {
          const benefitRows = normalizeBenefitCreateRows(benefits);
          await Benefit.destroy({ where: { jobId: job.id }, transaction });
          if (benefitRows.length > 0) {
            await Benefit.bulkCreate(
              benefitRows.map((row) => ({
                jobId: job.id,
                content: row.content,
                contentEn: row.contentEn,
                contentJp: row.contentJp
              })),
              { transaction }
            );
          }
        }

        if (smokingPolicies !== undefined) {
          await SmokingPolicy.destroy({ where: { jobId: job.id }, transaction });
          if (smokingPolicies.length > 0) {
            await SmokingPolicy.bulkCreate(
              smokingPolicies.map(policy => ({
                jobId: job.id,
                allow: policy.allow
              })),
              { transaction }
            );
          }
        }

        if (smokingPolicyDetails !== undefined) {
          await SmokingPolicyDetail.destroy({ where: { jobId: job.id }, transaction });
          if (smokingPolicyDetails.length > 0) {
            await SmokingPolicyDetail.bulkCreate(
              smokingPolicyDetails.map(detail => ({
                jobId: job.id,
                content: typeof detail === 'string' ? detail : detail.content || '',
                contentEn: typeof detail === 'object'
                  ? (detail.contentEn || detail.content_en || null)
                  : null,
                contentJp: typeof detail === 'object'
                  ? (detail.contentJp || detail.content_jp || null)
                  : null
              })),
              { transaction }
            );
          }
        }

        if (workingHours !== undefined) {
          await WorkingHour.destroy({ where: { jobId: job.id }, transaction });
          if (workingHours.length > 0) {
            await WorkingHour.bulkCreate(
              workingHours.map(wh => ({
                jobId: job.id,
                workingHours: wh.workingHours || wh.hours
              })),
              { transaction }
            );
          }
        }

        if (workingHourDetails !== undefined) {
          await WorkingHourDetail.destroy({ where: { jobId: job.id }, transaction });
          if (workingHourDetails.length > 0) {
            await WorkingHourDetail.bulkCreate(
              workingHourDetails.map(detail => ({
                jobId: job.id,
                content: typeof detail === 'string' ? detail : detail.content || '',
                contentEn: typeof detail === 'object'
                  ? (detail.contentEn || detail.content_en || null)
                  : null,
                contentJp: typeof detail === 'object'
                  ? (detail.contentJp || detail.content_jp || null)
                  : null
              })),
              { transaction }
            );
          }
        }

        if (jobValues !== undefined) {
          // Xóa tất cả job values hiện tại
          await JobValue.destroy({ 
            where: { jobId: job.id }, 
            transaction,
            force: true // Hard delete để tránh conflict với soft delete
          });
          
          if (jobValues.length > 0) {
            // Loại bỏ duplicate entries dựa trên (typeId, valueId)
            // Giữ lại entry cuối cùng nếu có duplicate
            const uniqueJobValuesMap = new Map();
            
            for (const jv of jobValues) {
              // Validate required fields
              if (!jv.typeId || !jv.valueId) {
                console.warn(`[Job Update] Bỏ qua job value thiếu typeId hoặc valueId:`, jv);
                continue;
              }
              
              const key = `${jv.typeId}_${jv.valueId}`;
              // Nếu đã có, ghi đè bằng entry mới (giữ entry cuối cùng)
              uniqueJobValuesMap.set(key, {
                jobId: job.id,
                typeId: parseInt(jv.typeId),
                valueId: parseInt(jv.valueId),
                value: jv.value || null,
                isRequired: jv.isRequired || false,
                viewOnCollaborator: jv.viewOnCollaborator || null
              });
            }
            
            const uniqueJobValues = Array.from(uniqueJobValuesMap.values());
            
            if (uniqueJobValues.length > 0) {
              try {
                await JobValue.bulkCreate(uniqueJobValues, { 
                  transaction,
                  ignoreDuplicates: false // Không ignore để phát hiện lỗi
                });
              } catch (createError) {
                // Nếu vẫn có lỗi duplicate, thử tạo từng cái một
                if (createError.name === 'SequelizeUniqueConstraintError' || createError.message.includes('Duplicate entry')) {
                  console.warn('[Job Update] Bulk create failed, trying individual creates:', createError.message);
                  // Xóa lại và tạo từng cái một
                  await JobValue.destroy({ 
                    where: { jobId: job.id }, 
                    transaction,
                    force: true
                  });
                  
                  for (const jv of uniqueJobValues) {
                    try {
                      await JobValue.create(jv, { transaction });
                    } catch (individualError) {
                      // Nếu vẫn duplicate, bỏ qua (có thể đã được tạo trong transaction)
                      if (individualError.name !== 'SequelizeUniqueConstraintError' && !individualError.message.includes('Duplicate entry')) {
                        throw individualError;
                      }
                      console.warn(`[Job Update] Bỏ qua duplicate job value: typeId=${jv.typeId}, valueId=${jv.valueId}`);
                    }
                  }
                } else {
                  throw createError;
                }
              }
            }
          }
        }

        if (jobPickupIds !== undefined) {
          await JobPickupId.destroy({ where: { jobId: job.id }, transaction });
          if (jobPickupIds.length > 0) {
            await JobPickupId.bulkCreate(
              jobPickupIds.map(pickup => ({
                jobId: job.id,
                jobPickupId: pickup.jobPickupId || pickup.pickupId
              })),
              { transaction }
            );
          }
        }

        // Update job-campaign associations if campaignIds provided
        if (campaignIds !== undefined) {
          // Delete existing associations
          await JobCampaign.destroy({
            where: { jobId: job.id },
            transaction,
            force: true // Hard delete để tránh conflict
          });
          
          // Create new associations if campaignIds provided
          if (campaignIds.length > 0) {
            // Loại bỏ duplicate campaignIds
            const uniqueCampaignIds = [...new Set(campaignIds.map((cid) => parseInt(cid, 10)))];
            
            // Validate that all campaignIds exist
            const campaigns = await Campaign.findAll({
              where: { id: { [Op.in]: uniqueCampaignIds } },
              transaction
            });

            if (campaigns.length !== uniqueCampaignIds.length) {
              await transaction.rollback();
              return res.status(400).json({
                success: false,
                message: 'Một số chiến dịch không tồn tại'
              });
            }

            try {
              await JobCampaign.bulkCreate(
                uniqueCampaignIds.map((campaignId) => ({
                  campaignId,
                  jobId: job.id
                })),
                { transaction, ignoreDuplicates: true }
              );
            } catch (createError) {
              if (createError.name === 'SequelizeUniqueConstraintError' || createError.message.includes('Duplicate entry')) {
                console.warn('[Job Update] Bulk create job_campaigns failed, trying individual creates:', createError.message);
                for (const campaignId of uniqueCampaignIds) {
                  try {
                    await JobCampaign.create({ campaignId, jobId: job.id }, { transaction });
                  } catch (individualError) {
                    if (individualError.name !== 'SequelizeUniqueConstraintError' && !individualError.message.includes('Duplicate entry')) {
                      throw individualError;
                    }
                    console.warn(`[Job Update] Bỏ qua duplicate job_campaign: campaignId=${campaignId}, jobId=${job.id}`);
                  }
                }
              } else {
                throw createError;
              }
            }

          }
        }

        // Update recruiting company if provided
        if (recruitingCompany !== undefined) {
          const recruitingCompanyDefaults = {
            jobId: job.id,
            companyName: recruitingCompany.companyName || null,
            companyNameEn: recruitingCompany.companyNameEn || null,
            companyNameJp: recruitingCompany.companyNameJp || null,
            revenue: recruitingCompany.revenue || null,
            revenueEn: recruitingCompany.revenueEn || null,
            revenueJp: recruitingCompany.revenueJp || null,
            numberOfEmployees: recruitingCompany.numberOfEmployees || null,
            numberOfEmployeesEn: recruitingCompany.numberOfEmployeesEn || null,
            numberOfEmployeesJp: recruitingCompany.numberOfEmployeesJp || null,
            headquarters: recruitingCompany.headquarters || null,
            headquartersEn: recruitingCompany.headquartersEn || null,
            headquartersJp: recruitingCompany.headquartersJp || null,
            companyIntroduction: recruitingCompany.companyIntroduction || null,
            companyIntroductionEn: recruitingCompany.companyIntroductionEn || null,
            companyIntroductionJp: recruitingCompany.companyIntroductionJp || null,
            stockExchangeInfo: recruitingCompany.stockExchangeInfo || null,
            stockExchangeInfoEn: recruitingCompany.stockExchangeInfoEn || null,
            stockExchangeInfoJp: recruitingCompany.stockExchangeInfoJp || null,
            investmentCapital: recruitingCompany.investmentCapital || null,
            investmentCapitalEn: recruitingCompany.investmentCapitalEn || null,
            investmentCapitalJp: recruitingCompany.investmentCapitalJp || null,
            establishedDate: recruitingCompany.establishedDate || null,
            establishedDateEn: recruitingCompany.establishedDateEn || null,
            establishedDateJp: recruitingCompany.establishedDateJp || null
          };

          const hasRecruitingCompanyData = recruitingCompany !== null && typeof recruitingCompany === 'object' && Object.keys(recruitingCompany).length > 0;
          const existingRecruitingCompany = await JobRecruitingCompany.findOne({
            where: { jobId: job.id },
            paranoid: false,
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (!hasRecruitingCompanyData) {
            if (existingRecruitingCompany) {
              await JobRecruitingCompanyService.destroy({
                where: { jobRecruitingCompanyId: existingRecruitingCompany.id },
                transaction
              });
              await JobRecruitingCompanyBusinessSector.destroy({
                where: { jobRecruitingCompanyId: existingRecruitingCompany.id },
                transaction
              });
              await existingRecruitingCompany.destroy({ transaction });
            }
          } else {
            let recruitingCompanyRecord;
            if (existingRecruitingCompany) {
              await existingRecruitingCompany.update(recruitingCompanyDefaults, { transaction });
              recruitingCompanyRecord = existingRecruitingCompany;
            } else {
              recruitingCompanyRecord = await JobRecruitingCompany.create(recruitingCompanyDefaults, { transaction });
            }

            const recruitingCompanyId = recruitingCompanyRecord.id;
            if (!recruitingCompanyId) {
              throw new Error('Không thể lưu recruiting company');
            }

            await JobRecruitingCompanyService.destroy({
              where: { jobRecruitingCompanyId: recruitingCompanyId },
              transaction
            });
            await JobRecruitingCompanyBusinessSector.destroy({
              where: { jobRecruitingCompanyId: recruitingCompanyId },
              transaction
            });

            if (Array.isArray(recruitingCompany.services) && recruitingCompany.services.length > 0) {
              await JobRecruitingCompanyService.bulkCreate(
                recruitingCompany.services.map((service, index) => ({
                  jobRecruitingCompanyId: recruitingCompanyId,
                  serviceName: typeof service === 'string' ? service : service.serviceName || service.name,
                  order: typeof service === 'object' && service.order !== undefined ? service.order : index
                })),
                { transaction }
              );
            }

            if (Array.isArray(recruitingCompany.businessSectors) && recruitingCompany.businessSectors.length > 0) {
              await JobRecruitingCompanyBusinessSector.bulkCreate(
                recruitingCompany.businessSectors.map((sector, index) => ({
                  jobRecruitingCompanyId: recruitingCompanyId,
                  sectorName: typeof sector === 'string' ? sector : sector.sectorName || sector.name,
                  sectorNameEn: typeof sector === 'object' ? (sector.sectorNameEn || null) : null,
                  sectorNameJp: typeof sector === 'object' ? (sector.sectorNameJp || null) : null,
                  order: typeof sector === 'object' && sector.order !== undefined ? sector.order : index
                })),
                { transaction }
              );
            }
          }
        }

        await transaction.commit();

        // Reload with all relations (for response and JD PDF)
        await job.reload({
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
              required: false,
              include: [
                {
                  model: JobRecruitingCompanyService,
                  as: 'services',
                  required: false,
                  order: [['order', 'ASC']]
                },
                {
                  model: JobRecruitingCompanyBusinessSector,
                  as: 'businessSectors',
                  required: false,
                  order: [['order', 'ASC']]
                }
              ]
            },
            {
              model: WorkingLocation,
              as: 'workingLocations',
              required: false
            },
            {
              model: WorkingLocationDetail,
              as: 'workingLocationDetails',
              required: false
            },
            {
              model: SalaryRange,
              as: 'salaryRanges',
              required: false
            },
            {
              model: SalaryRangeDetail,
              as: 'salaryRangeDetails',
              required: false
            },
            {
              model: OvertimeAllowance,
              as: 'overtimeAllowances',
              required: false
            },
            {
              model: OvertimeAllowanceDetail,
              as: 'overtimeAllowanceDetails',
              required: false
            },
            {
              model: Requirement,
              as: 'requirements',
              required: false
            },
            {
              model: WorkingHour,
              as: 'workingHours',
              required: false
            },
            {
              model: Benefit,
              as: 'benefits',
              required: false,
              attributes: ['id', 'content', 'contentEn', 'contentJp']
            },
            {
              model: JobValue,
              as: 'jobValues',
              required: false,
              include: [
                { model: Type, as: 'type', required: false },
                { model: Value, as: 'valueRef', required: false }
              ]
            }
          ]
        });

        // Generate JD template PDFs (vi, en, jp), upload to S3; xóa file cũ trước
        const uploadDir = path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'uploads');
        const jdFolder = path.join(uploadDir, 'job_descriptions', String(job.id));
        try {
          const keysToDelete = [...new Set([
            ...[job.jdFile, job.jdFileEn, job.jdFileJp].filter(Boolean),
            ...(req.file?.buffer?.length && job.jdOriginalFile ? [job.jdOriginalFile] : [])
          ])];
          for (const key of keysToDelete) {
            if (isS3Key(key)) {
              await deleteFileFromS3(key).catch(() => {});
            } else {
              const oldPath = path.join(__dirname, '../../../', key);
              await fs.unlink(oldPath).catch(() => {});
            }
          }
          const [pdfBufferVi, pdfBufferEn, pdfBufferJp] = await Promise.all([
            generateJdPdfBuffer(job, 'vi'),
            generateJdPdfBuffer(job, 'en'),
            generateJdPdfBuffer(job, 'jp')
          ]);
          const hasAnyJdPdf =
            (pdfBufferVi && pdfBufferVi.length) ||
            (pdfBufferEn && pdfBufferEn.length) ||
            (pdfBufferJp && pdfBufferJp.length);
          if (!hasAnyJdPdf) {
            console.warn(
              `[Admin updateJob] JD PDF: không tạo được buffer nào (Puppeteer/Chromium). jobId=${job.id} — jd_file có thể trống. ` +
                'Kiểm tra PUPPETEER_EXECUTABLE_PATH hoặc pnpm run puppeteer:install-chrome'
            );
          } else if (!s3Enabled()) {
            console.warn(
              `[Admin updateJob] JD PDF: S3 chưa bật — file JD lưu local uploads/job_descriptions/${job.id}/, không lên AWS.`
            );
          }
          if (s3Enabled()) {
            const tasks = [];
            if (pdfBufferVi) {
              const keyVn = buildJdFileKey(job.id, 'file_vn');
              tasks.push(uploadBufferToS3(pdfBufferVi, keyVn, 'application/pdf').then(() => { job.jdFile = keyVn; }).catch((e) => { console.warn('[Admin updateJob] JD file_vn upload failed:', e.message); }));
            }
            if (pdfBufferEn) {
              const keyEn = buildJdFileKey(job.id, 'file_eng');
              tasks.push(uploadBufferToS3(pdfBufferEn, keyEn, 'application/pdf').then(() => { job.jdFileEn = keyEn; }).catch((e) => { console.warn('[Admin updateJob] JD file_eng upload failed:', e.message); }));
            }
            if (pdfBufferJp) {
              const keyJp = buildJdFileKey(job.id, 'file_jp');
              tasks.push(uploadBufferToS3(pdfBufferJp, keyJp, 'application/pdf').then(() => { job.jdFileJp = keyJp; }).catch((e) => { console.warn('[Admin updateJob] JD file_jp upload failed:', e.message); }));
            }
            await Promise.all(tasks);
          } else {
            await fs.mkdir(jdFolder, { recursive: true });
            const base = path.join(__dirname, '../../../');
            if (pdfBufferVi) {
              const p = path.join(jdFolder, 'file_vn.pdf');
              await fs.writeFile(p, pdfBufferVi);
              job.jdFile = path.relative(base, p);
            }
            if (pdfBufferEn) {
              const p = path.join(jdFolder, 'file_eng.pdf');
              await fs.writeFile(p, pdfBufferEn);
              job.jdFileEn = path.relative(base, p);
            }
            if (pdfBufferJp) {
              const p = path.join(jdFolder, 'file_jp.pdf');
              await fs.writeFile(p, pdfBufferJp);
              job.jdFileJp = path.relative(base, p);
            }
          }
        } catch (pdfErr) {
          console.warn('[Admin updateJob] Không thể tạo JD template PDF:', pdfErr.message);
        }

        let uploadedOriginal = false;
        if (req.file?.buffer?.length) {
          try {
            uploadedOriginal = await persistJdOriginalUpload(job, req.file, jdFolder);
          } catch (origErr) {
            console.warn('[Admin updateJob] Upload JD gốc thất bại:', origErr.message);
          }
        }
        // JD gốc (upload riêng) ≠ file template jd_file (VN) sau regen — không gán jd_original = template mới.
        if (!uploadedOriginal) {
          const prevO = oldData.jdOriginalFile ?? oldData.jd_original_file;
          const prevJd = oldData.jdFile ?? oldData.jd_file;
          const prevOrigName = oldData.jdOriginalFilename ?? oldData.jd_original_filename;
          if (prevO && prevJd && String(prevO) === String(prevJd)) {
            // Legacy: «gốc» trùng path template cũ (đã bị thay bằng file_vn mới) — trỏ lại bản VN mới
            job.jdOriginalFile = job.jdFile;
            job.jdOriginalFilename = buildJdDownloadFilename(job.jobCode, job.title, '.pdf');
          } else if (prevO) {
            job.jdOriginalFile = prevO;
            job.jdOriginalFilename = prevOrigName ?? null;
          } else {
            job.jdOriginalFile = null;
            job.jdOriginalFilename = null;
          }
        }
        const beforeOrig = oldData.jdOriginalFile ?? oldData.jd_original_file;
        const beforeOrigName = oldData.jdOriginalFilename ?? oldData.jd_original_filename;
        const jdPersist =
          uploadedOriginal ||
          job.jdFile != null ||
          job.jdFileEn != null ||
          job.jdFileJp != null ||
          job.jdOriginalFile !== beforeOrig ||
          job.jdOriginalFilename !== beforeOrigName;
        if (jdPersist) {
          await job.save();
          await job.reload({ include: [{ model: JobCategory, as: 'category', required: false }, { model: Company, as: 'company', required: false }, { model: JobRecruitingCompany, as: 'recruitingCompany', required: false, include: [{ model: JobRecruitingCompanyService, as: 'services', required: false }, { model: JobRecruitingCompanyBusinessSector, as: 'businessSectors', required: false }] }] });
        }

        // Log action
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'Job',
          action: 'edit',
          ip: req.ip || req.connection.remoteAddress,
          before: oldData,
          after: job.toJSON(),
          description: `Cập nhật việc làm: ${job.title} (${job.jobCode})`
        });

        await bumpJobListCacheVersion();

        res.json({
          success: true,
          message: 'Cập nhật việc làm thành công',
          data: { job }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete job (soft delete)
   * DELETE /api/admin/jobs/:id
   */
  deleteJob: async (req, res, next) => {
    try {
      const { id } = req.params;

      const job = await Job.findByPk(id, {
        include: [
          {
            model: JobApplication,
            as: 'applications',
            required: false
          }
        ]
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy việc làm'
        });
      }

      // Check if job has applications
      if (job.applications && job.applications.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa việc làm có ứng viên đã ứng tuyển. Vui lòng đóng việc làm trước.'
        });
      }

      // Store old data for log
      const oldData = job.toJSON();

      // Soft delete
      await job.destroy();

      await bumpJobListCacheVersion();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Job',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa việc làm: ${job.title} (${job.jobCode})`
      });

      res.json({
        success: true,
        message: 'Xóa việc làm thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggle job pinned status
   * PATCH /api/admin/jobs/:id/toggle-pinned
   */
  togglePinned: async (req, res, next) => {
    try {
      const { id } = req.params;

      const job = await Job.findByPk(id);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy việc làm'
        });
      }

      const oldData = job.toJSON();

      job.isPinned = !job.isPinned;
      await job.save();

      await bumpJobListCacheVersion();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Job',
        action: job.isPinned ? 'pin' : 'unpin',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: job.toJSON(),
        description: `${job.isPinned ? 'Ghim' : 'Bỏ ghim'} việc làm: ${job.title} (${job.jobCode})`
      });

      res.json({
        success: true,
        message: `${job.isPinned ? 'Ghim' : 'Bỏ ghim'} việc làm thành công`,
        data: { job }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggle job hot status
   * PATCH /api/admin/jobs/:id/toggle-hot
   */
  toggleHot: async (req, res, next) => {
    try {
      const { id } = req.params;

      const job = await Job.findByPk(id);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy việc làm'
        });
      }

      const oldData = job.toJSON();

      job.isHot = !job.isHot;
      await job.save();

      await bumpJobListCacheVersion();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Job',
        action: job.isHot ? 'set_hot' : 'unset_hot',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: job.toJSON(),
        description: `${job.isHot ? 'Đánh dấu' : 'Bỏ đánh dấu'} việc làm hot: ${job.title} (${job.jobCode})`
      });

      res.json({
        success: true,
        message: `${job.isHot ? 'Đánh dấu' : 'Bỏ đánh dấu'} việc làm hot thành công`,
        data: { job }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update job status
   * PATCH /api/admin/jobs/:id/status
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

      const job = await Job.findByPk(id);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy việc làm'
        });
      }

      const oldData = job.toJSON();

      job.status = parseInt(status);
      await job.save();

      await bumpJobListCacheVersion();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Job',
        action: 'update_status',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: job.toJSON(),
        description: `Cập nhật trạng thái việc làm: ${job.title} (${job.jobCode}) - Status: ${status}`
      });

      res.json({
        success: true,
        message: 'Cập nhật trạng thái việc làm thành công',
        data: { job }
      });
    } catch (error) {
      next(error);
    }
  }
};


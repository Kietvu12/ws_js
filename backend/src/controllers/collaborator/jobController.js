import {
  Job,
  JobCategory,
  Company,
  JobValue,
  Type,
  Value,
  SearchHistory,
  JobCampaign,
  Campaign,
  JobPickupId,
  Requirement,
  WorkingLocation,
  WorkingLocationDetail,
  SalaryRange,
  SalaryRangeDetail,
  OvertimeAllowanceDetail,
  SmokingPolicy,
  SmokingPolicyDetail,
  WorkingHourDetail,
  CompanyBusinessField,
  CompanyOffice,
  Benefit,
  JobRecruitingCompany,
  JobRecruitingCompanyService,
  JobRecruitingCompanyBusinessSector
} from '../../models/index.js';
import path from 'path';
import { isS3Key, getSignedUrlForFile, makeDownloadDisposition } from '../../services/s3Service.js';
import { buildJdDownloadFilename } from '../../utils/jdDownloadFilename.js';
import { executeJobListQuery, executeJobListInIdsQuery, MAX_JOB_LIST_LIMIT } from '../../services/jobListQueryService.js';

/**
 * Job Management Controller (CTV)
 * CTV có thể xem danh sách job, lọc, lưu yêu thích và lịch sử tìm kiếm
 */
export const jobController = {
  /**
   * Get list of jobs (with filters)
   * GET /api/ctv/jobs
   */
  getJobs: async (req, res, next) => {
    try {
      const {
        limit = 10,
        cursor,
        saveSearch = false,
        search,
        status,
        jobCategoryId,
        jobCategoryIds,
        companyId,
        isPinned,
        isHot,
        deadlineFrom,
        deadlineTo,
        minSalary,
        maxSalary,
        workingLocation,
        location,
        locations,
        sectorNames,
        recruitmentType,
        sortBy,
        sortOrder
      } = req.query;

      const { plainRows, nextCursor, hasMore } = await executeJobListQuery({
        mode: 'ctv',
        reqQuery: req.query,
        cursorToken: cursor || null,
        limitRaw: limit
      });

      const { attachCampaignCommissionToJobs } = await import('../../utils/campaignCommissionHelper.js');
      const jobsWithFavorite = attachCampaignCommissionToJobs(
        plainRows.map((job) => {
          const jobData = { ...job, isFavorite: false };
          return jobData;
        }),
        false,
        1
      );

      if (req.collaborator && (saveSearch === 'true' || saveSearch === '1')) {
        const filters = {
          search,
          status,
          jobCategoryId,
          jobCategoryIds,
          companyId,
          isPinned,
          isHot,
          deadlineFrom,
          deadlineTo,
          minSalary,
          maxSalary,
          workingLocation,
          location,
          locations,
          sectorNames,
          recruitmentType,
          sortBy,
          sortOrder,
          _listCursor: { hasMore, returned: plainRows.length }
        };

        if (search || Object.keys(filters).some((key) => filters[key] !== undefined && key !== 'search' && key !== '_listCursor')) {
          await SearchHistory.create({
            collaboratorId: req.collaborator.id,
            keyword: search || null,
            filters,
            resultCount: plainRows.length + (hasMore ? 1 : 0)
          });
        }
      }

      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_JOB_LIST_LIMIT);
      res.json({
        success: true,
        data: {
          jobs: jobsWithFavorite,
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
   * Lấy URL xem/tải file JD hoặc required CV form (S3 signed URL hoặc URL tĩnh)
   * GET /api/ctv/jobs/:id/view-url?fileType=jdFile|jdFileEn|jdFileJp|jdOriginalFile|requiredCvForm&purpose=view|download
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
        const disposition =
          purpose === 'download'
            ? makeDownloadDisposition(desiredFilename || path.basename(filePath).replace(/^[a-f0-9-]+_/i, '') || 'download')
            : null;
        const url = await getSignedUrlForFile(filePath, purpose, disposition);
        if (url) return res.json({ success: true, data: { url } });
        return res.status(503).json({
          success: false,
          message: 'File lưu trên S3. Vui lòng cấu hình AWS S3 trong .env.'
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
   * Get job by ID
   * GET /api/ctv/jobs/:id
   */
  getJobById: async (req, res, next) => {
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
            required: false,
            include: [
              {
                model: CompanyBusinessField,
                as: 'businessFields',
                required: false,
                attributes: ['id', 'content']
              },
              {
                model: CompanyOffice,
                as: 'offices',
                required: false,
                attributes: ['id', 'address', 'isHeadOffice']
              }
            ]
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
            model: JobValue,
            as: 'jobValues',
            required: false,
            include: [
              {
                model: Type,
                as: 'type',
                required: false,
                attributes: ['id', 'typename']
              },
              {
                model: Value,
                as: 'valueRef',
                required: false,
                attributes: ['id', 'valuename', 'valuenameEn', 'valuenameJp']
              }
            ]
          },
          {
            model: JobCampaign,
            as: 'jobCampaigns',
            required: false,
            attributes: ['id', 'campaignId', 'jobId'],
            paranoid: true,
            include: [
              {
                model: Campaign,
                as: 'campaign',
                required: false,
                attributes: ['id', 'name', 'percent']
              }
            ]
          },
          {
            model: Requirement,
            as: 'requirements',
            required: false,
            attributes: ['id', 'content', 'contentEn', 'contentJp', 'type', 'status']
          },
          {
            model: WorkingLocationDetail,
            as: 'workingLocationDetails',
            required: false,
            attributes: ['id', 'content', 'contentEn', 'contentJp']
          },
          {
            model: SalaryRange,
            as: 'salaryRanges',
            required: false,
            attributes: ['id', 'salaryRange', 'salaryRangeEn', 'salaryRangeJp', 'type']
          },
          {
            model: SalaryRangeDetail,
            as: 'salaryRangeDetails',
            required: false,
            attributes: ['id', 'content', 'contentEn', 'contentJp']
          },
          {
            model: OvertimeAllowanceDetail,
            as: 'overtimeAllowanceDetails',
            required: false,
            attributes: ['id', 'content']
          },
          {
            model: SmokingPolicyDetail,
            as: 'smokingPolicyDetails',
            required: false,
            attributes: ['id', 'content']
          },
          {
            model: WorkingHourDetail,
            as: 'workingHourDetails',
            required: false,
            attributes: ['id', 'content']
          },
          {
            model: Benefit,
            as: 'benefits',
            required: false,
            attributes: ['id', 'content', 'contentEn', 'contentJp']
          },
          {
            model: SmokingPolicy,
            as: 'smokingPolicies',
            required: false,
            attributes: ['id', 'allow']
          }
        ]
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy việc làm'
        });
      }

      // Check if job is published
      if (job.status !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Việc làm này chưa được công bố'
        });
      }

      const jobData = job.toJSON();
      jobData.isFavorite = false;
      const { attachCampaignCommission } = await import('../../utils/campaignCommissionHelper.js');
      const jobWithComputedCommission = attachCampaignCommission(jobData, false, 1);

      // Tăng views count
      await job.increment('viewsCount');

      res.json({
        success: true,
        data: { job: jobWithComputedCommission }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get jobs by campaign ID
   * GET /api/ctv/jobs/by-campaign/:campaignId
   */
  getJobsByCampaign: async (req, res, next) => {
    try {
      const { campaignId } = req.params;
      const { cursor, limit = 10 } = req.query;

      const jobCampaigns = await JobCampaign.findAll({
        where: { campaignId: parseInt(campaignId, 10) },
        attributes: ['jobId'],
        paranoid: true
      });

      const jobIds = jobCampaigns.map((jc) => jc.jobId);

      if (jobIds.length === 0) {
        return res.json({
          success: true,
          data: {
            jobs: [],
            pagination: { limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_JOB_LIST_LIMIT), nextCursor: null, hasMore: false }
          }
        });
      }

      const { plainRows, nextCursor, hasMore } = await executeJobListInIdsQuery({
        jobIds,
        reqQuery: req.query,
        cursorToken: cursor || null,
        limitRaw: limit,
        status: 1
      });

      const { attachCampaignCommissionToJobs } = await import('../../utils/campaignCommissionHelper.js');
      const jobsWithFavorite = attachCampaignCommissionToJobs(
        plainRows.map((job) => ({ ...job, isFavorite: false })),
        false,
        1
      );

      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_JOB_LIST_LIMIT);
      res.json({
        success: true,
        data: {
          jobs: jobsWithFavorite,
          pagination: { limit: limitNum, nextCursor, hasMore }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get jobs by job pickup ID
   * GET /api/ctv/jobs/by-job-pickup/:jobPickupId
   */
  getJobsByJobPickup: async (req, res, next) => {
    try {
      const { jobPickupId } = req.params;
      const { cursor, limit = 10 } = req.query;

      const jobPickupIds = await JobPickupId.findAll({
        where: { jobPickupId: parseInt(jobPickupId, 10) },
        attributes: ['jobId'],
        paranoid: true
      });

      const jobIds = jobPickupIds.map((jpi) => jpi.jobId);

      if (jobIds.length === 0) {
        return res.json({
          success: true,
          data: {
            jobs: [],
            pagination: { limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_JOB_LIST_LIMIT), nextCursor: null, hasMore: false }
          }
        });
      }

      const { plainRows, nextCursor, hasMore } = await executeJobListInIdsQuery({
        jobIds,
        reqQuery: req.query,
        cursorToken: cursor || null,
        limitRaw: limit,
        status: 1
      });

      const { attachCampaignCommissionToJobs } = await import('../../utils/campaignCommissionHelper.js');
      const jobsWithFavorite = attachCampaignCommissionToJobs(
        plainRows.map((job) => ({ ...job, isFavorite: false })),
        false,
        1
      );

      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_JOB_LIST_LIMIT);
      res.json({
        success: true,
        data: {
          jobs: jobsWithFavorite,
          pagination: { limit: limitNum, nextCursor, hasMore }
        }
      });
    } catch (error) {
      console.error('[Backend] Error in getJobsByJobPickup:', error);
      next(error);
    }
  }
};


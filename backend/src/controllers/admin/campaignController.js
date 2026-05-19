import path from 'path';
import fs from 'fs/promises';
import {
  Campaign,
  CampaignApplication,
  Job,
  Collaborator,
  JobCampaign,
  ActionLog
} from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import config from '../../config/index.js';
import {
  uploadBufferToS3,
  getSignedUrlForFile,
  s3Enabled,
  buildCampaignCoverKey,
  deleteFileFromS3,
  isS3Key
} from '../../services/s3Service.js';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'startDate': 'start_date',
    'endDate': 'end_date'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Campaign Management Controller (Admin)
 */
export const campaignController = {
  /**
   * Get list of campaigns
   * GET /api/admin/campaigns
   */
  getCampaigns: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo,
        sortBy = 'id',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by name or description
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by start date
      if (startDateFrom || startDateTo) {
        where.start_date = {};
        if (startDateFrom) {
          where.start_date[Op.gte] = new Date(startDateFrom);
        }
        if (startDateTo) {
          where.start_date[Op.lte] = new Date(startDateTo);
        }
      }

      // Filter by end date
      if (endDateFrom || endDateTo) {
        where.end_date = {};
        if (endDateFrom) {
          where.end_date[Op.gte] = new Date(endDateFrom);
        }
        if (endDateTo) {
          where.end_date[Op.lte] = new Date(endDateTo);
        }
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'name', 'startDate', 'endDate', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const { count, rows } = await Campaign.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      // Get applications count for each campaign
      const campaignIds = rows.map(c => c.id);
      if (campaignIds.length > 0) {
        const applicationsCounts = await sequelize.query(
          `SELECT campaign_id, COUNT(*) as count 
           FROM campaign_applications 
           WHERE campaign_id IN (${campaignIds.join(',')})
           AND deleted_at IS NULL
           GROUP BY campaign_id`,
          { type: sequelize.QueryTypes.SELECT }
        );

        const countMap = {};
        applicationsCounts.forEach(item => {
          countMap[item.campaign_id] = parseInt(item.count);
        });

        rows.forEach(campaign => {
          campaign.dataValues.applicationsCount = countMap[campaign.id] || 0;
        });
      } else {
        rows.forEach(campaign => {
          campaign.dataValues.applicationsCount = 0;
        });
      }

      res.json({
        success: true,
        data: {
          campaigns: rows,
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
   * Get campaign by ID
   * GET /api/admin/campaigns/:id
   */
  getCampaignById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findByPk(id, {
        include: [
          {
            model: CampaignApplication,
            as: 'applications',
            required: false,
            include: [
              {
                model: Collaborator,
                as: 'collaborator',
                required: false,
                attributes: ['id', 'name', 'email', 'code']
              },
              {
                model: Job,
                as: 'job',
                required: false,
                attributes: ['id', 'jobCode', 'title']
              }
            ]
          }
        ]
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chiến dịch'
        });
      }

      res.json({
        success: true,
        data: { campaign }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new campaign
   * POST /api/admin/campaigns
   */
  createCampaign: async (req, res, next) => {
    try {
      const {
        name,
        nameEn,
        nameJp,
        description,
        descriptionEn,
        descriptionJp,
        startDate,
        endDate,
        maxCv = 0,
        percent = 0,
        status = 0,
        jobIds = []
      } = req.body;

      // Validate required fields
      if (!name || !description || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Tên, mô tả, ngày bắt đầu và ngày kết thúc là bắt buộc'
        });
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'Ngày kết thúc phải sau ngày bắt đầu'
        });
      }

      // Use transaction for campaign and job associations
      const transaction = await sequelize.transaction();

      try {
        const campaign = await Campaign.create({
          name: name || '',
          nameEn: nameEn || null,
          nameJp: nameJp || null,
          description: description || '',
          descriptionEn: descriptionEn || null,
          descriptionJp: descriptionJp || null,
          startDate: start,
          endDate: end,
          maxCv,
          percent,
          status
        }, { transaction });

        // Create job-campaign associations if jobIds provided
        if (jobIds && jobIds.length > 0) {
          // Validate that all jobIds exist
          const jobs = await Job.findAll({
            where: { id: { [Op.in]: jobIds } },
            transaction
          });

          if (jobs.length !== jobIds.length) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Một số công việc không tồn tại'
            });
          }

          // Create JobCampaign records
          await JobCampaign.bulkCreate(
            jobIds.map(jobId => ({
              campaignId: campaign.id,
              jobId: parseInt(jobId)
            })),
            { transaction }
          );
        }

        await transaction.commit();

        // Reload with relations
        await campaign.reload({
          include: [
            {
              model: JobCampaign,
              as: 'jobCampaigns',
              required: false,
              include: [
                {
                  model: Job,
                  as: 'job',
                  required: false,
                  attributes: ['id', 'title', 'jobCode']
                }
              ]
            }
          ]
        });

        // Log action
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'Campaign',
          action: 'create',
          ip: req.ip || req.connection.remoteAddress,
          after: campaign.toJSON(),
          description: `Tạo mới chiến dịch: ${campaign.name}`
        });

        res.status(201).json({
          success: true,
          message: 'Tạo chiến dịch thành công',
          data: { campaign }
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
   * Update campaign
   * PUT /api/admin/campaigns/:id
   */
  updateCampaign: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      const { jobIds } = updateData;
      delete updateData.jobIds; // Remove jobIds from updateData to avoid setting it on campaign

      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chiến dịch'
        });
      }

      const oldData = campaign.toJSON();

      // Validate dates if being changed
      const startDate = updateData.startDate ? new Date(updateData.startDate) : campaign.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : campaign.endDate;
      
      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'Ngày kết thúc phải sau ngày bắt đầu'
        });
      }

      // Use transaction for campaign and job associations
      const transaction = await sequelize.transaction();

      try {
        // Update fields
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined) {
            if (key === 'startDate' || key === 'endDate') {
              campaign[key] = new Date(updateData[key]);
            } else {
              campaign[key] = updateData[key];
            }
          }
        });

        await campaign.save({ transaction });

        // Update job-campaign associations if jobIds provided
        if (jobIds !== undefined) {
          // Delete existing associations
          await JobCampaign.destroy({
            where: { campaignId: campaign.id },
            transaction
          });

          // Create new associations if jobIds provided
          if (jobIds && jobIds.length > 0) {
            // Validate that all jobIds exist
            const jobs = await Job.findAll({
              where: { id: { [Op.in]: jobIds } },
              transaction
            });

            if (jobs.length !== jobIds.length) {
              await transaction.rollback();
              return res.status(400).json({
                success: false,
                message: 'Một số công việc không tồn tại'
              });
            }

            // Create JobCampaign records
            await JobCampaign.bulkCreate(
              jobIds.map(jobId => ({
                campaignId: campaign.id,
                jobId: parseInt(jobId)
              })),
              { transaction }
            );
          }
        }

        await transaction.commit();

        // Reload with relations
        await campaign.reload({
          include: [
            {
              model: JobCampaign,
              as: 'jobCampaigns',
              required: false,
              include: [
                {
                  model: Job,
                  as: 'job',
                  required: false,
                  attributes: ['id', 'title', 'jobCode']
                }
              ]
            }
          ]
        });

        // Log action
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'Campaign',
          action: 'edit',
          ip: req.ip || req.connection.remoteAddress,
          before: oldData,
          after: campaign.toJSON(),
          description: `Cập nhật chiến dịch: ${campaign.name}`
        });

        res.json({
          success: true,
          message: 'Cập nhật chiến dịch thành công',
          data: { campaign }
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
   * Update campaign status
   * PATCH /api/admin/campaigns/:id/status
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

      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chiến dịch'
        });
      }

      const oldData = campaign.toJSON();

      campaign.status = parseInt(status);
      await campaign.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Campaign',
        action: 'update_status',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: campaign.toJSON(),
        description: `Cập nhật trạng thái chiến dịch: ${campaign.name} - Status: ${status}`
      });

      res.json({
        success: true,
        message: 'Cập nhật trạng thái chiến dịch thành công',
        data: { campaign }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload ảnh cover chiến dịch — S3: campaign/{id}/... hoặc local uploads/campaign/...
   * POST /api/admin/campaigns/:id/upload-cover
   */
  uploadCover: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
      }
      const { id } = req.params;
      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy chiến dịch' });
      }

      const oldKey = campaign.coverUrl;
      let url;
      let stored;

      if (s3Enabled()) {
        const key = buildCampaignCoverKey(id, req.file.originalname);
        await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
        if (oldKey && isS3Key(oldKey) && oldKey !== key) {
          try {
            await deleteFileFromS3(oldKey);
          } catch {
            /* best-effort */
          }
        }
        campaign.coverUrl = key;
        await campaign.save();
        url = await getSignedUrlForFile(key, 'view');
        if (!url) url = key;
        stored = key;
      } else {
        const uploadDir = path.join(process.cwd(), config.upload.dir, 'campaign', String(id));
        await fs.mkdir(uploadDir, { recursive: true });
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, req.file.buffer);
        const publicPath = `/uploads/campaign/${id}/${filename}`;
        campaign.coverUrl = publicPath;
        await campaign.save();
        url = publicPath;
        stored = publicPath;
      }

      res.json({
        success: true,
        message: 'Đã tải ảnh cover',
        data: {
          campaign,
          url,
          key: stored
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete campaign (hard delete) + cascade delete job_campaigns
   * DELETE /api/admin/campaigns/:id
   */
  deleteCampaign: async (req, res, next) => {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findByPk(id, { paranoid: false });
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chiến dịch'
        });
      }

      const oldData = campaign.toJSON();

      await JobCampaign.destroy({
        where: { campaignId: id },
        force: true
      });

      await campaign.destroy({ force: true });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Campaign',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa chiến dịch: ${campaign.name}`
      });

      res.json({
        success: true,
        message: 'Xóa chiến dịch thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


import path from 'path';
import fs from 'fs/promises';
import { Job, JobPickup, JobPickupId } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import config from '../../config/index.js';
import {
  uploadBufferToS3,
  getSignedUrlForFile,
  s3Enabled,
  buildJobPickupCoverKey,
  deleteFileFromS3,
  isS3Key
} from '../../services/s3Service.js';

const mapOrderField = (fieldName) => {
  const fieldMap = {
    createdAt: 'created_at',
    created_at: 'created_at',
    updatedAt: 'updated_at',
    updated_at: 'updated_at',
    nameEn: 'name_en',
    name_en: 'name_en',
    nameJp: 'name_jp',
    name_jp: 'name_jp'
  };
  return fieldMap[fieldName] || fieldName;
};

const attachJobsCount = async (rows) => {
  const pickupIds = rows.map((p) => p.id);
  let jobsCountMap = {};
  if (pickupIds.length === 0) return jobsCountMap;

  const [results] = await sequelize.query(
    `SELECT id_job_pickups, COUNT(*) as cnt
     FROM job_pickups_id
     WHERE id_job_pickups IN (:pickupIds) AND deleted_at IS NULL
     GROUP BY id_job_pickups`,
    { replacements: { pickupIds } }
  );

  const list = Array.isArray(results) ? results : [results].filter(Boolean);
  list.forEach((item) => {
    if (item && item.id_job_pickups != null) {
      jobsCountMap[item.id_job_pickups] = parseInt(String(item.cnt), 10) || 0;
    }
  });
  return jobsCountMap;
};

/**
 * Admin — job_pickups & job_pickups_id (gán job vào pick-up)
 */
export const jobPickupController = {
  getJobPickups: async (req, res, next) => {
    try {
      const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
      const offset = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
      const where = {};

      if (search && String(search).trim()) {
        const q = `%${String(search).trim()}%`;
        where[Op.or] = [
          { name: { [Op.like]: q } },
          { nameEn: { [Op.like]: q } },
          { nameJp: { [Op.like]: q } }
        ];
      }

      const allowedSortFields = [
        'id',
        'createdAt',
        'created_at',
        'updatedAt',
        'updated_at',
        'name',
        'nameEn',
        'name_en',
        'nameJp',
        'name_jp'
      ];
      const sortField = allowedSortFields.includes(String(sortBy)) ? String(sortBy) : 'created_at';
      const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await JobPickup.findAndCountAll({
        where,
        limit: parseInt(String(limit), 10),
        offset,
        order: orderClause
      });

      const jobsCountMap = await attachJobsCount(rows);
      const pickups = rows.map((pickup) => {
        const j = pickup.toJSON();
        j.jobsCount = jobsCountMap[pickup.id] || 0;
        return j;
      });

      res.json({
        success: true,
        data: {
          pickups,
          pagination: {
            total: count,
            page: parseInt(String(page), 10),
            limit: parseInt(String(limit), 10),
            totalPages: Math.ceil(count / parseInt(String(limit), 10))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  getJobPickupById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const pickup = await JobPickup.findByPk(id);
      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job pick-up' });
      }
      const jobsCount = await JobPickupId.count({ where: { jobPickupId: id } });
      const data = pickup.toJSON();
      data.jobsCount = jobsCount;
      res.json({ success: true, data: { pickup: data } });
    } catch (error) {
      next(error);
    }
  },

  createJobPickup: async (req, res, next) => {
    try {
      const { name, nameEn, nameJp } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Tên (name) là bắt buộc' });
      }
      const row = await JobPickup.create({
        name: String(name).trim(),
        nameEn: nameEn != null && String(nameEn).trim() ? String(nameEn).trim() : null,
        nameJp: nameJp != null && String(nameJp).trim() ? String(nameJp).trim() : null
      });
      res.status(201).json({ success: true, message: 'Tạo job pick-up thành công', data: { pickup: row } });
    } catch (error) {
      next(error);
    }
  },

  updateJobPickup: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, nameEn, nameJp } = req.body;
      const pickup = await JobPickup.findByPk(id);
      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job pick-up' });
      }
      if (name !== undefined) {
        if (!name || !String(name).trim()) {
          return res.status(400).json({ success: false, message: 'Tên (name) là bắt buộc' });
        }
        pickup.name = String(name).trim();
      }
      if (nameEn !== undefined) {
        pickup.nameEn = nameEn != null && String(nameEn).trim() ? String(nameEn).trim() : null;
      }
      if (nameJp !== undefined) {
        pickup.nameJp = nameJp != null && String(nameJp).trim() ? String(nameJp).trim() : null;
      }
      await pickup.save();
      res.json({ success: true, message: 'Cập nhật job pick-up thành công', data: { pickup: pickup } });
    } catch (error) {
      next(error);
    }
  },

  deleteJobPickup: async (req, res, next) => {
    try {
      const { id } = req.params;
      const pickup = await JobPickup.findByPk(id);
      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job pick-up' });
      }
      await JobPickupId.destroy({ where: { jobPickupId: id } });
      await pickup.destroy();
      res.json({ success: true, message: 'Đã xóa job pick-up' });
    } catch (error) {
      next(error);
    }
  },

  getJobsInPickup: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const limitN = Math.min(100, parseInt(String(limit), 10) || 20);
      const pageN = parseInt(String(page), 10) || 1;
      const offset = (pageN - 1) * limitN;

      const pickup = await JobPickup.findByPk(id);
      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job pick-up' });
      }

      const { count, rows } = await JobPickupId.findAndCountAll({
        where: { jobPickupId: id },
        limit: limitN,
        offset,
        order: [['id', 'DESC']],
        include: [
          {
            model: Job,
            as: 'job',
            required: true,
            attributes: ['id', 'jobCode', 'title', 'titleEn', 'titleJp', 'slug', 'status', 'createdAt', 'updatedAt']
          }
        ]
      });

      const mappings = rows.map((row) => {
        const o = row.toJSON();
        return { id: o.id, job: o.job };
      });

      res.json({
        success: true,
        data: {
          pickup: { id: pickup.id, name: pickup.name, nameEn: pickup.nameEn, nameJp: pickup.nameJp },
          mappings,
          pagination: {
            total: count,
            page: pageN,
            limit: limitN,
            totalPages: Math.ceil(count / limitN) || 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  addJobToPickup: async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const rawJobIds = body.jobIds;

      if (Array.isArray(rawJobIds) && rawJobIds.length > 0) {
        const jobIds = [
          ...new Set(
            rawJobIds
              .map((x) => parseInt(String(x), 10))
              .filter((n) => !Number.isNaN(n) && n >= 1)
          )
        ];
        if (jobIds.length === 0) {
          return res.status(400).json({ success: false, message: 'jobIds không hợp lệ' });
        }
        if (jobIds.length > 100) {
          return res.status(400).json({ success: false, message: 'Tối đa 100 job mỗi lần' });
        }

        const pickup = await JobPickup.findByPk(id);
        if (!pickup) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy job pick-up' });
        }

        const createdMappings = [];
        const skipped = [];
        for (const jobId of jobIds) {
          const job = await Job.findByPk(jobId);
          if (!job) {
            skipped.push({ jobId, message: 'Không tìm thấy job' });
            continue;
          }
          const [mapping, created] = await JobPickupId.findOrCreate({
            where: { jobPickupId: id, jobId },
            defaults: { jobPickupId: id, jobId }
          });
          if (created) {
            createdMappings.push(mapping.toJSON());
          } else {
            skipped.push({ jobId, message: 'Job đã nằm trong pick-up này' });
          }
        }

        const added = createdMappings.length;
        return res.json({
          success: true,
          message:
            added > 0
              ? `Đã gắn ${added} job vào pick-up`
              : 'Không có job nào được gắn mới (đã tồn tại hoặc không tìm thấy)',
          data: { added, skipped, mappings: createdMappings }
        });
      }

      const rawJobId = body.jobId ?? body.id_job;
      if (rawJobId == null || rawJobId === '') {
        return res.status(400).json({ success: false, message: 'Thiếu jobId' });
      }
      const jobId = parseInt(String(rawJobId), 10);
      if (Number.isNaN(jobId) || jobId < 1) {
        return res.status(400).json({ success: false, message: 'jobId không hợp lệ' });
      }

      const pickup = await JobPickup.findByPk(id);
      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job pick-up' });
      }

      const job = await Job.findByPk(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job' });
      }

      const [mapping, created] = await JobPickupId.findOrCreate({
        where: { jobPickupId: id, jobId },
        defaults: { jobPickupId: id, jobId }
      });

      if (!created) {
        return res.status(400).json({ success: false, message: 'Job đã nằm trong pick-up này' });
      }

      res.status(201).json({
        success: true,
        message: 'Đã gắn job vào pick-up',
        data: { mapping: mapping.toJSON() }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload ảnh cover job pick-up — S3: job-pickups/{id}/... hoặc local uploads/job-pickups/...
   * POST /api/admin/job-pickups/:id/upload-cover
   */
  uploadCover: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
      }
      const { id } = req.params;
      const pickup = await JobPickup.findByPk(id);
      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job pick-up' });
      }

      const oldKey = pickup.coverUrl;
      let url;
      let stored;

      if (s3Enabled()) {
        const key = buildJobPickupCoverKey(id, req.file.originalname);
        await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
        if (oldKey && isS3Key(oldKey) && oldKey !== key) {
          try {
            await deleteFileFromS3(oldKey);
          } catch {
            /* best-effort */
          }
        }
        pickup.coverUrl = key;
        await pickup.save();
        url = await getSignedUrlForFile(key, 'view');
        if (!url) url = key;
        stored = key;
      } else {
        const uploadDir = path.join(process.cwd(), config.upload.dir, 'job-pickups', String(id));
        await fs.mkdir(uploadDir, { recursive: true });
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, req.file.buffer);
        const publicPath = `/uploads/job-pickups/${id}/${filename}`;
        pickup.coverUrl = publicPath;
        await pickup.save();
        url = publicPath;
        stored = publicPath;
      }

      res.json({
        success: true,
        message: 'Đã tải ảnh cover',
        data: {
          pickup,
          url,
          key: stored
        }
      });
    } catch (error) {
      next(error);
    }
  },

  removeJobFromPickup: async (req, res, next) => {
    try {
      const { id, jobId: jobIdParam } = req.params;
      const jobId = parseInt(String(jobIdParam), 10);
      if (Number.isNaN(jobId) || jobId < 1) {
        return res.status(400).json({ success: false, message: 'jobId không hợp lệ' });
      }
      const pickup = await JobPickup.findByPk(id);
      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job pick-up' });
      }

      const deleted = await JobPickupId.destroy({
        where: { jobPickupId: id, jobId }
      });

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi gán' });
      }

      res.json({ success: true, message: 'Đã gỡ job khỏi pick-up' });
    } catch (error) {
      next(error);
    }
  }
};

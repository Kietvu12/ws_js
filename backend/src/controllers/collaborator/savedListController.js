import {
  CollaboratorSavedList,
  CollaboratorSavedListJob,
  Job
} from '../../models/index.js';

const mapOrderField = (fieldName) => {
  const fieldMap = { createdAt: 'created_at', updatedAt: 'updated_at' };
  return fieldMap[fieldName] || fieldName;
};

const ensureListOwnedByCollaborator = async (listId, collaboratorId) => {
  const list = await CollaboratorSavedList.findOne({
    where: { id: parseInt(listId), collaboratorId }
  });
  if (!list) return null;
  return list;
};

/**
 * Playlist / danh sách việc làm đã lưu (collaborator_saved_lists + collaborator_saved_list_jobs)
 */
export const savedListController = {
  /**
   * GET /api/ctv/saved-lists
   */
  getList: async (req, res, next) => {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const allowedSort = ['id', 'createdAt', 'updatedAt', 'name'];
      const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
      const order = [[mapOrderField(sortField), sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];

      const { count, rows } = await CollaboratorSavedList.findAndCountAll({
        where: { collaboratorId: req.collaborator.id },
        limit: parseInt(limit),
        offset,
        order
      });

      res.json({
        success: true,
        data: {
          items: rows,
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
   * GET /api/ctv/saved-lists/:listId
   */
  getById: async (req, res, next) => {
    try {
      const list = await ensureListOwnedByCollaborator(req.params.listId, req.collaborator.id);
      if (!list) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy danh sách' });
      }
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/ctv/saved-lists
   * Body: { name }
   */
  create: async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Tên danh sách là bắt buộc' });
      }
      const list = await CollaboratorSavedList.create({
        collaboratorId: req.collaborator.id,
        name: name.trim()
      });
      res.status(201).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/ctv/saved-lists/:listId
   * Body: { name? }
   */
  update: async (req, res, next) => {
    try {
      const list = await ensureListOwnedByCollaborator(req.params.listId, req.collaborator.id);
      if (!list) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy danh sách' });
      }
      const { name } = req.body;
      if (name !== undefined) list.name = typeof name === 'string' ? name.trim() : list.name;
      await list.save();
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/ctv/saved-lists/:listId
   */
  remove: async (req, res, next) => {
    try {
      const list = await ensureListOwnedByCollaborator(req.params.listId, req.collaborator.id);
      if (!list) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy danh sách' });
      }
      await list.destroy();
      res.json({ success: true, message: 'Đã xóa danh sách' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/ctv/saved-lists/:listId/jobs
   * Danh sách job trong playlist (có include Job)
   */
  getJobs: async (req, res, next) => {
    try {
      const list = await ensureListOwnedByCollaborator(req.params.listId, req.collaborator.id);
      if (!list) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy danh sách' });
      }
      const entries = await CollaboratorSavedListJob.findAll({
        where: { savedListId: list.id },
        include: [{ model: Job, as: 'job', attributes: ['id', 'title', 'jobCode', 'deadline'] }],
        order: [['sortOrder', 'ASC'], ['id', 'ASC']]
      });
      res.json({ success: true, data: entries });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/ctv/saved-lists/:listId/jobs
   * Body: { jobId, sortOrder? }
   */
  addJob: async (req, res, next) => {
    try {
      const list = await ensureListOwnedByCollaborator(req.params.listId, req.collaborator.id);
      if (!list) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy danh sách' });
      }
      const { jobId, sortOrder } = req.body;
      if (!jobId) {
        return res.status(400).json({ success: false, message: 'jobId là bắt buộc' });
      }
      const job = await Job.findByPk(parseInt(jobId));
      if (!job) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy job' });
      }
      const nextOrder = sortOrder != null ? parseInt(sortOrder) : await CollaboratorSavedListJob.max('sortOrder', { where: { savedListId: list.id } }).then((m) => (m ?? -1) + 1);
      const [entry] = await CollaboratorSavedListJob.findOrCreate({
        where: { savedListId: list.id, jobId: parseInt(jobId) },
        defaults: { sortOrder: nextOrder }
      });
      if (!entry.isNewRecord) {
        return res.json({ success: true, data: entry, message: 'Job đã có trong danh sách' });
      }
      if (sortOrder != null) {
        entry.sortOrder = nextOrder;
        await entry.save();
      }
      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/ctv/saved-lists/:listId/jobs/:jobId
   */
  removeJob: async (req, res, next) => {
    try {
      const list = await ensureListOwnedByCollaborator(req.params.listId, req.collaborator.id);
      if (!list) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy danh sách' });
      }
      const jobId = parseInt(req.params.jobId);
      const entry = await CollaboratorSavedListJob.findOne({
        where: { savedListId: list.id, jobId }
      });
      if (!entry) {
        return res.status(404).json({ success: false, message: 'Job không có trong danh sách' });
      }
      await entry.destroy();
      res.json({ success: true, message: 'Đã xóa job khỏi danh sách' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/ctv/saved-lists/:listId/jobs/reorder
   * Body: { jobIds: number[] } — thứ tự mới (id của job)
   */
  reorderJobs: async (req, res, next) => {
    try {
      const list = await ensureListOwnedByCollaborator(req.params.listId, req.collaborator.id);
      if (!list) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy danh sách' });
      }
      const { jobIds } = req.body;
      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ success: false, message: 'jobIds (mảng) là bắt buộc' });
      }
      const entries = await CollaboratorSavedListJob.findAll({
        where: { savedListId: list.id, jobId: jobIds }
      });
      const byJobId = Object.fromEntries(entries.map((e) => [e.jobId, e]));
      for (let i = 0; i < jobIds.length; i++) {
        const e = byJobId[parseInt(jobIds[i])];
        if (e && e.sortOrder !== i) {
          e.sortOrder = i;
          await e.save();
        }
      }
      const updated = await CollaboratorSavedListJob.findAll({
        where: { savedListId: list.id },
        include: [{ model: Job, as: 'job', attributes: ['id', 'title', 'jobCode', 'deadline'] }],
        order: [['sortOrder', 'ASC'], ['id', 'ASC']]
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
};

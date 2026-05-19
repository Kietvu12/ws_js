import { CollaboratorSavedSearchCriteria } from '../../models/index.js';

const mapOrderField = (fieldName) => {
  const fieldMap = { createdAt: 'created_at', updatedAt: 'updated_at' };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Tiêu chí tìm kiếm đã lưu (collaborator_saved_search_criteria)
 */
export const savedSearchCriteriaController = {
  /**
   * GET /api/ctv/saved-search-criteria
   * Danh sách tiêu chí đã lưu của CTV
   */
  getList: async (req, res, next) => {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const allowedSort = ['id', 'createdAt', 'updatedAt', 'name'];
      const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
      const order = [[mapOrderField(sortField), sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];

      const { count, rows } = await CollaboratorSavedSearchCriteria.findAndCountAll({
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
   * GET /api/ctv/saved-search-criteria/:id
   */
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await CollaboratorSavedSearchCriteria.findOne({
        where: { id: parseInt(id), collaboratorId: req.collaborator.id }
      });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tiêu chí đã lưu' });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/ctv/saved-search-criteria
   * Body: { name, filters }
   */
  create: async (req, res, next) => {
    try {
      const { name, filters } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Tên tiêu chí là bắt buộc' });
      }
      if (!filters || typeof filters !== 'object') {
        return res.status(400).json({ success: false, message: 'filters (object) là bắt buộc' });
      }

      const item = await CollaboratorSavedSearchCriteria.create({
        collaboratorId: req.collaborator.id,
        name: name.trim(),
        filters
      });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/ctv/saved-search-criteria/:id
   * Body: { name?, filters? }
   */
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, filters } = req.body;
      const item = await CollaboratorSavedSearchCriteria.findOne({
        where: { id: parseInt(id), collaboratorId: req.collaborator.id }
      });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tiêu chí đã lưu' });
      }
      if (name !== undefined) item.name = typeof name === 'string' ? name.trim() : item.name;
      if (filters !== undefined && typeof filters === 'object') item.filters = filters;
      await item.save();
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/ctv/saved-search-criteria/:id
   */
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await CollaboratorSavedSearchCriteria.findOne({
        where: { id: parseInt(id), collaboratorId: req.collaborator.id }
      });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tiêu chí đã lưu' });
      }
      await item.destroy();
      res.json({ success: true, message: 'Đã xóa tiêu chí đã lưu' });
    } catch (error) {
      next(error);
    }
  }
};

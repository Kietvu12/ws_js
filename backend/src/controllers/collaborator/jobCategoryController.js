import { JobCategory } from '../../models/index.js';
import { Op } from 'sequelize';

/**
 * Job Category Controller (CTV)
 * CTV có thể xem danh sách job categories (chỉ đọc)
 */
export const ctvJobCategoryController = {
  /**
   * Get list of job categories (CTV)
   * GET /api/ctv/job-categories
   */
  getJobCategories: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 100, // Mặc định lấy nhiều để hiển thị đầy đủ
        search,
        status = 1, // Mặc định chỉ lấy categories active
        parentId,
        sortBy = 'order',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Chỉ lấy categories active
      if (status !== undefined) {
        where.status = parseInt(status);
      } else {
        where.status = 1;
      }

      // Search by name or slug
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { slug: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by parent
      if (parentId !== undefined) {
        if (parentId === 'null' || parentId === '0' || parentId === null) {
          where.parentId = null;
        } else {
          where.parentId = parseInt(parentId);
        }
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'name', 'order', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'order';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Map field names
      const fieldMap = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      };
      const dbSortField = fieldMap[sortField] || sortField;

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const { count, rows } = await JobCategory.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: orderClause,
        attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug', 'parentId', 'order', 'status'],
        paranoid: true // Chỉ lấy categories chưa bị soft-delete
      });

      res.json({
        success: true,
        data: {
          categories: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('[Backend] Error in getJobCategories (CTV):', error);
      next(error);
    }
  },

  /**
   * Get job category tree (hierarchical structure) (CTV)
   * GET /api/ctv/job-categories/tree
   */
  getJobCategoryTree: async (req, res, next) => {
    try {
      const { status = 1 } = req.query;
      const where = {
        status: parseInt(status)
      };

      // Get all categories
      const allCategories = await JobCategory.findAll({
        where,
        attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug', 'parentId', 'order', 'status'],
        order: [['order', 'ASC'], ['id', 'ASC']],
        paranoid: true
      });

      // Build tree structure
      const categoryMap = {};
      const rootCategories = [];

      // First pass: create map
      allCategories.forEach(category => {
        categoryMap[category.id] = {
          ...category.toJSON(),
          children: []
        };
      });

      // Second pass: build tree
      allCategories.forEach(category => {
        const categoryData = categoryMap[category.id];
        if (category.parentId) {
          if (categoryMap[category.parentId]) {
            categoryMap[category.parentId].children.push(categoryData);
          }
        } else {
          rootCategories.push(categoryData);
        }
      });

      res.json({
        success: true,
        data: { tree: rootCategories }
      });
    } catch (error) {
      console.error('[Backend] Error in getJobCategoryTree (CTV):', error);
      next(error);
    }
  }
};


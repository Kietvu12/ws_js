import { Category, Post, ActionLog } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'sortOrder': 'sort_order'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Category Management Controller (Admin)
 */
export const categoryController = {
  /**
   * Get list of categories
   * GET /api/admin/categories
   */
  getCategories: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        showInDashboard,
        sortBy = 'sortOrder',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by name or slug
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { slug: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by isActive
      if (isActive !== undefined) {
        where.isActive = isActive === 'true' || isActive === '1' || isActive === 1;
      }

      // Filter by showInDashboard
      if (showInDashboard !== undefined) {
        where.showInDashboard = showInDashboard === 'true' || showInDashboard === '1' || showInDashboard === 1;
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'name', 'slug', 'sortOrder', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'sortOrder';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const { count, rows } = await Category.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      // Get posts count for each category
      const categoryIds = rows.map(c => c.id.toString());
      if (categoryIds.length > 0) {
        const postsCounts = await sequelize.query(
          `SELECT category_id, COUNT(*) as count 
           FROM posts 
           WHERE category_id IN (${categoryIds.map(id => `'${id}'`).join(',')})
           AND deleted_at IS NULL
           GROUP BY category_id`,
          { type: sequelize.QueryTypes.SELECT }
        );

        const countMap = {};
        postsCounts.forEach(item => {
          countMap[item.category_id] = parseInt(item.count);
        });

        rows.forEach(category => {
          category.dataValues.postsCount = countMap[category.id.toString()] || 0;
        });
      } else {
        rows.forEach(category => {
          category.dataValues.postsCount = 0;
        });
      }

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
      next(error);
    }
  },

  /**
   * Get all categories (for dropdowns)
   * GET /api/admin/categories/all
   */
  getAllCategories: async (req, res, next) => {
    try {
      const { isActive } = req.query;

      const where = {};
      if (isActive !== undefined) {
        where.isActive = isActive === 'true' || isActive === '1' || isActive === 1;
      }

      const categories = await Category.findAll({
        where,
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      });

      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get category by ID
   * GET /api/admin/categories/:id
   */
  getCategoryById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (category) {
        // Get posts count manually (category_id is string, not foreign key)
        const postsCount = await Post.count({
          where: { categoryId: category.id.toString() }
        });
        category.dataValues.postsCount = postsCount;
      }

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy danh mục'
        });
      }

      res.json({
        success: true,
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new category
   * POST /api/admin/categories
   */
  createCategory: async (req, res, next) => {
    try {
      const {
        name,
        slug,
        description,
        color = '#007bff',
        isActive = true,
        sortOrder = 0,
        showInDashboard = false
      } = req.body;

      // Validate required fields
      if (!name || !slug) {
        return res.status(400).json({
          success: false,
          message: 'Tên và slug là bắt buộc'
        });
      }

      // Check if slug already exists
      const existingCategory = await Category.findOne({ where: { slug } });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'Slug đã tồn tại'
        });
      }

      const category = await Category.create({
        name,
        slug,
        description,
        color,
        isActive,
        sortOrder,
        showInDashboard
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Category',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: category.toJSON(),
        description: `Tạo mới danh mục: ${category.name}`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo danh mục thành công',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update category
   * PUT /api/admin/categories/:id
   */
  updateCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const category = await Category.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy danh mục'
        });
      }

      const oldData = category.toJSON();

      // Check if new slug already exists (excluding current category)
      if (updateData.slug && updateData.slug !== category.slug) {
        const existingCategory = await Category.findOne({
          where: { slug: updateData.slug, id: { [Op.ne]: id } }
        });
        if (existingCategory) {
          return res.status(409).json({
            success: false,
            message: 'Slug đã tồn tại'
          });
        }
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          category[key] = updateData[key];
        }
      });

      await category.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Category',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: category.toJSON(),
        description: `Cập nhật danh mục: ${category.name}`
      });

      res.json({
        success: true,
        message: 'Cập nhật danh mục thành công',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete category (soft delete)
   * DELETE /api/admin/categories/:id
   */
  deleteCategory: async (req, res, next) => {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy danh mục'
        });
      }

      // Check if category has posts (category_id is string, not foreign key)
      const postsCount = await Post.count({
        where: { categoryId: category.id.toString() }
      });

      if (postsCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa danh mục có bài viết. Vui lòng xóa hoặc chuyển bài viết trước.'
        });
      }

      const oldData = category.toJSON();

      // Soft delete
      await category.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Category',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa danh mục: ${category.name}`
      });

      res.json({
        success: true,
        message: 'Xóa danh mục thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


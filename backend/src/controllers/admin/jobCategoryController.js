import { JobCategory, Job, ActionLog } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Job Category Management Controller (Admin)
 */
export const jobCategoryController = {
  /**
   * Get list of job categories
   * GET /api/admin/job-categories
   */
  getJobCategories: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        parentId,
        sortBy = 'id',
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

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by parent
      if (parentId !== undefined) {
        if (parentId === 'null' || parentId === '0') {
          where.parentId = null;
        } else {
          where.parentId = parseInt(parentId);
        }
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'name', 'order', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const { count, rows } = await JobCategory.findAndCountAll({
        where,
        include: [
          {
            model: JobCategory,
            as: 'parent',
            required: false,
            attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug']
          },
          {
            model: JobCategory,
            as: 'children',
            required: false,
            attributes: ['id', 'name', 'nameEn', 'nameJp', 'slug', 'order']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      // Get jobs count for each category
      const categoryIds = rows.map(c => c.id);
      if (categoryIds.length > 0) {
        const jobsCounts = await sequelize.query(
          `SELECT job_category_id, COUNT(*) as count 
           FROM jobs 
           WHERE job_category_id IN (${categoryIds.join(',')})
           AND deleted_at IS NULL
           GROUP BY job_category_id`,
          { type: sequelize.QueryTypes.SELECT }
        );

        const countMap = {};
        jobsCounts.forEach(item => {
          countMap[item.job_category_id] = parseInt(item.count);
        });

        rows.forEach(category => {
          category.dataValues.jobsCount = countMap[category.id] || 0;
        });
      } else {
        rows.forEach(category => {
          category.dataValues.jobsCount = 0;
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
   * Get job category tree (hierarchical structure)
   * GET /api/admin/job-categories/tree
   */
  getJobCategoryTree: async (req, res, next) => {
    try {
      const { status } = req.query;
      const where = {};

      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Get all categories
      const allCategories = await JobCategory.findAll({
        where,
        include: [
          {
            model: JobCategory,
            as: 'parent',
            required: false,
            attributes: ['id', 'name', 'slug']
          }
        ],
        order: [['order', 'ASC'], ['id', 'ASC']]
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
      next(error);
    }
  },

  /**
   * Get job category by ID
   * GET /api/admin/job-categories/:id
   */
  getJobCategoryById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const category = await JobCategory.findByPk(id, {
        include: [
          {
            model: JobCategory,
            as: 'parent',
            required: false,
            attributes: ['id', 'name', 'slug', 'description']
          },
          {
            model: JobCategory,
            as: 'children',
            required: false,
            attributes: ['id', 'name', 'slug', 'order', 'status']
          },
          {
            model: Job,
            as: 'jobs',
            required: false,
            attributes: ['id', 'title', 'jobCode', 'status'],
            limit: 10
          }
        ]
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy danh mục việc làm'
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
   * Create new job category
   * POST /api/admin/job-categories
   */
  createJobCategory: async (req, res, next) => {
    try {
      const {
        name,
        nameEn,
        nameJp,
        slug,
        description,
        descriptionEn,
        descriptionJp,
        parentId,
        order = 0,
        status = 1
      } = req.body;

      // Validate required fields
      if (!name || !slug) {
        return res.status(400).json({
          success: false,
          message: 'Tên và slug là bắt buộc'
        });
      }

      // Check if slug already exists
      const existingCategory = await JobCategory.findOne({ where: { slug } });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'Slug đã tồn tại'
        });
      }

      // Validate parent if provided
      if (parentId) {
        const parent = await JobCategory.findByPk(parentId);
        if (!parent) {
          return res.status(404).json({
            success: false,
            message: 'Danh mục cha không tồn tại'
          });
        }
      }

      // Create category
      const category = await JobCategory.create({
        name,
        nameEn: nameEn || null,
        nameJp: nameJp || null,
        slug,
        description,
        descriptionEn: descriptionEn || null,
        descriptionJp: descriptionJp || null,
        parentId: parentId || null,
        order,
        status
      });

      // Reload with relations
      await category.reload({
        include: [
          {
            model: JobCategory,
            as: 'parent',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'JobCategory',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: category.toJSON(),
        description: `Tạo mới danh mục việc làm: ${category.name} (${category.slug})`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo danh mục việc làm thành công',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update job category
   * PUT /api/admin/job-categories/:id
   */
  updateJobCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        name,
        nameEn,
        nameJp,
        slug,
        description,
        descriptionEn,
        descriptionJp,
        parentId,
        order,
        status
      } = req.body;

      const category = await JobCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy danh mục việc làm'
        });
      }

      // Store old data for log
      const oldData = category.toJSON();

      // Update fields
      if (name !== undefined) category.name = name;
      if (nameEn !== undefined) category.nameEn = nameEn || null;
      if (nameJp !== undefined) category.nameJp = nameJp || null;
      if (slug !== undefined) {
        // Check if slug is already taken by another category
        const existingCategory = await JobCategory.findOne({
          where: { slug, id: { [Op.ne]: id } }
        });
        if (existingCategory) {
          return res.status(409).json({
            success: false,
            message: 'Slug đã tồn tại'
          });
        }
        category.slug = slug;
      }
      if (description !== undefined) category.description = description;
      if (descriptionEn !== undefined) category.descriptionEn = descriptionEn || null;
      if (descriptionJp !== undefined) category.descriptionJp = descriptionJp || null;
      if (order !== undefined) category.order = order;
      if (status !== undefined) category.status = status;

      // Validate parent if provided
      if (parentId !== undefined) {
        if (parentId === null || parentId === 0) {
          category.parentId = null;
        } else {
          // Prevent self-reference
          if (parseInt(parentId) === parseInt(id)) {
            return res.status(400).json({
              success: false,
              message: 'Không thể đặt danh mục cha là chính nó'
            });
          }
          // Check if parent exists
          const parent = await JobCategory.findByPk(parentId);
          if (!parent) {
            return res.status(404).json({
              success: false,
              message: 'Danh mục cha không tồn tại'
            });
          }
          category.parentId = parentId;
        }
      }

      await category.save();

      // Reload with relations
      await category.reload({
        include: [
          {
            model: JobCategory,
            as: 'parent',
            required: false
          },
          {
            model: JobCategory,
            as: 'children',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'JobCategory',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: category.toJSON(),
        description: `Cập nhật danh mục việc làm: ${category.name} (${category.slug})`
      });

      res.json({
        success: true,
        message: 'Cập nhật danh mục việc làm thành công',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete job category (soft delete)
   * DELETE /api/admin/job-categories/:id
   */
  deleteJobCategory: async (req, res, next) => {
    try {
      const { id } = req.params;

      const category = await JobCategory.findByPk(id, {
        include: [
          {
            model: JobCategory,
            as: 'children',
            required: false
          },
          {
            model: Job,
            as: 'jobs',
            required: false
          }
        ]
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy danh mục việc làm'
        });
      }

      // Check if category has children
      if (category.children && category.children.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa danh mục có danh mục con. Vui lòng xóa hoặc chuyển danh mục con trước.'
        });
      }

      // Check if category has jobs
      if (category.jobs && category.jobs.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa danh mục có việc làm. Vui lòng xóa hoặc chuyển việc làm trước.'
        });
      }

      // Store old data for log
      const oldData = category.toJSON();

      // Soft delete
      await category.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'JobCategory',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa danh mục việc làm: ${category.name} (${category.slug})`
      });

      res.json({
        success: true,
        message: 'Xóa danh mục việc làm thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


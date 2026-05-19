import { Type, Value, JobValue, ActionLog } from '../../models/index.js';
import { Op } from 'sequelize';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'id': 'id'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Type Management Controller (Admin)
 * Quản lý loại setting (JLPT, Experience, Specialization, Qualification)
 */
export const typeController = {
  /**
   * Get list of types
   * GET /api/admin/types
   */
  getTypes: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'id',
        sortOrder = 'ASC',
        includeValues = false
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by typename
      if (search) {
        where.typename = { [Op.like]: `%${search}%` };
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'typename', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const includeOptions = [];
      if (includeValues === 'true' || includeValues === '1') {
        includeOptions.push({
          model: Value,
          as: 'values',
          required: false,
          attributes: ['id', 'valuename', 'createdAt', 'updatedAt']
        });
      }

      const { count, rows } = await Type.findAndCountAll({
        where,
        include: includeOptions,
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      res.json({
        success: true,
        data: {
          types: rows,
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
   * Get all types (for dropdowns)
   * GET /api/admin/types/all
   */
  getAllTypes: async (req, res, next) => {
    try {
      const { includeValues = false } = req.query;

      const includeOptions = [];
      if (includeValues === 'true' || includeValues === '1') {
        includeOptions.push({
          model: Value,
          as: 'values',
          required: false,
          attributes: ['id', 'valuename'],
          order: [['valuename', 'ASC']]
        });
      }

      const types = await Type.findAll({
        include: includeOptions,
        order: [['typename', 'ASC']]
      });

      res.json({
        success: true,
        data: { types }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get type by ID
   * GET /api/admin/types/:id
   */
  getTypeById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const type = await Type.findByPk(id, {
        include: [
          {
            model: Value,
            as: 'values',
            required: false,
            order: [['valuename', 'ASC']]
          }
        ]
      });

      if (!type) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy loại setting'
        });
      }

      res.json({
        success: true,
        data: { type }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new type
   * POST /api/admin/types
   */
  createType: async (req, res, next) => {
    try {
      const { typename, cvField, typenameEn, typenameJp } = req.body;

      if (!typename) {
        return res.status(400).json({
          success: false,
          message: 'Tên loại setting là bắt buộc'
        });
      }

      // Validate cvField if provided
      if (cvField) {
        const validCvFields = ['jlptLevel', 'experienceYears', 'specialization', 'qualification'];
        if (!validCvFields.includes(cvField)) {
          return res.status(400).json({
            success: false,
            message: `cvField không hợp lệ. Chỉ chấp nhận: ${validCvFields.join(', ')}`
          });
        }
      }

      // Check if typename already exists
      const existingType = await Type.findOne({ where: { typename } });
      if (existingType) {
        return res.status(409).json({
          success: false,
          message: 'Tên loại setting đã tồn tại'
        });
      }

      const type = await Type.create({
        typename,
        cvField: cvField || null,
        typenameEn: typenameEn || null,
        typenameJp: typenameJp || null
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Type',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: type.toJSON(),
        description: `Tạo mới loại setting: ${type.typename}`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo loại setting thành công',
        data: { type }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update type
   * PUT /api/admin/types/:id
   */
  updateType: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { typename, cvField, typenameEn, typenameJp } = req.body;

      const type = await Type.findByPk(id);
      if (!type) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy loại setting'
        });
      }

      const oldData = type.toJSON();

      // Check if new typename already exists (excluding current type)
      if (typename && typename !== type.typename) {
        const existingType = await Type.findOne({
          where: { typename, id: { [Op.ne]: id } }
        });
        if (existingType) {
          return res.status(409).json({
            success: false,
            message: 'Tên loại setting đã tồn tại'
          });
        }
      }

      // Validate cvField if provided
      if (cvField !== undefined) {
        if (cvField) {
          const validCvFields = ['jlptLevel', 'experienceYears', 'specialization', 'qualification'];
          if (!validCvFields.includes(cvField)) {
            return res.status(400).json({
              success: false,
              message: `cvField không hợp lệ. Chỉ chấp nhận: ${validCvFields.join(', ')}`
            });
          }
        }
        type.cvField = cvField || null;
      }

      if (typename !== undefined) {
        type.typename = typename;
      }
      if (typenameEn !== undefined) {
        type.typenameEn = typenameEn || null;
      }
      if (typenameJp !== undefined) {
        type.typenameJp = typenameJp || null;
      }

      await type.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Type',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: type.toJSON(),
        description: `Cập nhật loại setting: ${type.typename}`
      });

      res.json({
        success: true,
        message: 'Cập nhật loại setting thành công',
        data: { type }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete type (soft delete)
   * DELETE /api/admin/types/:id
   */
  deleteType: async (req, res, next) => {
    try {
      const { id } = req.params;

      const type = await Type.findByPk(id, {
        include: [
          {
            model: Value,
            as: 'values',
            required: false
          }
        ]
      });

      if (!type) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy loại setting'
        });
      }

      const oldData = type.toJSON();

      const childValueRows = await Value.findAll({
        where: { typeId: id },
        attributes: ['id'],
        paranoid: false
      });
      const valueIds = childValueRows.map((v) => v.id);
      const jobValueOr = [{ typeId: id }];
      if (valueIds.length > 0) {
        jobValueOr.push({ valueId: { [Op.in]: valueIds } });
      }
      await JobValue.destroy({ where: { [Op.or]: jobValueOr } });

      // Soft delete all values of this type so they no longer appear in UI
      await Value.destroy({
        where: { typeId: id }
      });

      // Soft delete
      await type.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Type',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa loại setting: ${type.typename}`
      });

      res.json({
        success: true,
        message: 'Xóa loại setting thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


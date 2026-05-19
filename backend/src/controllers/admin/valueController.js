import { Value, Type, JobValue, ActionLog } from '../../models/index.js';
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
 * Value Management Controller (Admin)
 * Quản lý giá trị của type (N1, N2, N3 cho JLPT; 1年, 2年 cho Experience)
 */
export const valueController = {
  /**
   * Get list of values
   * GET /api/admin/values
   */
  getValues: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        typeId,
        sortBy = 'id',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by valuename
      if (search) {
        where.valuename = { [Op.like]: `%${search}%` };
      }

      // Filter by type
      if (typeId) {
        where.typeId = parseInt(typeId);
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'valuename', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const { count, rows } = await Value.findAndCountAll({
        where,
        include: [
          {
            model: Type,
            as: 'type',
            required: false,
            attributes: ['id', 'typename']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      res.json({
        success: true,
        data: {
          values: rows,
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
   * Get all values by type
   * GET /api/admin/values/by-type/:typeId
   */
  getValuesByType: async (req, res, next) => {
    try {
      const { typeId } = req.params;

      const type = await Type.findByPk(typeId);
      if (!type) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy loại setting'
        });
      }

      const values = await Value.findAll({
        where: { typeId: parseInt(typeId) },
        include: [
          {
            model: Type,
            as: 'type',
            required: false,
            attributes: ['id', 'typename']
          }
        ],
        order: [['valuename', 'ASC']]
      });

      res.json({
        success: true,
        data: { values }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get value by ID
   * GET /api/admin/values/:id
   */
  getValueById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const value = await Value.findByPk(id, {
        include: [
          {
            model: Type,
            as: 'type',
            required: false
          }
        ]
      });

      if (!value) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giá trị'
        });
      }

      res.json({
        success: true,
        data: { value }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new value
   * POST /api/admin/values
   */
  createValue: async (req, res, next) => {
    try {
      const { typeId, valuename, comparisonOperator, comparisonValue, comparisonValueEnd, valuenameEn, valuenameJp } = req.body;

      if (!typeId || !valuename) {
        return res.status(400).json({
          success: false,
          message: 'Loại setting và tên giá trị là bắt buộc'
        });
      }

      // Validate comparison operator if provided
      if (comparisonOperator) {
        const validOperators = ['>=', '<=', '>', '<', '=', 'between'];
        if (!validOperators.includes(comparisonOperator)) {
          return res.status(400).json({
            success: false,
            message: `Toán tử so sánh không hợp lệ. Chỉ chấp nhận: ${validOperators.join(', ')}`
          });
        }
        if (!comparisonValue || !comparisonValue.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Giá trị so sánh là bắt buộc khi có toán tử so sánh'
          });
        }
        if (comparisonOperator === 'between' && (!comparisonValueEnd || !comparisonValueEnd.trim())) {
          return res.status(400).json({
            success: false,
            message: 'Giá trị kết thúc là bắt buộc cho toán tử "between"'
          });
        }
      }

      // Check if type exists
      const type = await Type.findByPk(typeId);
      if (!type) {
        return res.status(404).json({
          success: false,
          message: 'Loại setting không tồn tại'
        });
      }

      // Check if valuename already exists for this type
      const existingValue = await Value.findOne({
        where: { typeId, valuename }
      });
      if (existingValue) {
        return res.status(409).json({
          success: false,
          message: 'Tên giá trị đã tồn tại cho loại setting này'
        });
      }

      const valueData = {
        typeId,
        valuename,
        comparisonOperator: comparisonOperator || null,
        comparisonValue: comparisonValue ? comparisonValue.trim() : null,
        comparisonValueEnd: (comparisonOperator === 'between' && comparisonValueEnd) ? comparisonValueEnd.trim() : null,
        valuenameEn: valuenameEn || null,
        valuenameJp: valuenameJp || null
      };

      const value = await Value.create(valueData);

      // Reload with type
      await value.reload({
        include: [
          {
            model: Type,
            as: 'type',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Value',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: value.toJSON(),
        description: `Tạo mới giá trị: ${value.valuename} (${type.typename})`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo giá trị thành công',
        data: { value }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update value
   * PUT /api/admin/values/:id
   */
  updateValue: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { typeId, valuename, comparisonOperator, comparisonValue, comparisonValueEnd, valuenameEn, valuenameJp } = req.body;

      const value = await Value.findByPk(id);
      if (!value) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giá trị'
        });
      }

      const oldData = value.toJSON();

      // Validate comparison operator if provided
      if (comparisonOperator !== undefined) {
        if (comparisonOperator) {
          const validOperators = ['>=', '<=', '>', '<', '=', 'between'];
          if (!validOperators.includes(comparisonOperator)) {
            return res.status(400).json({
              success: false,
              message: `Toán tử so sánh không hợp lệ. Chỉ chấp nhận: ${validOperators.join(', ')}`
            });
          }
          if (!comparisonValue || !comparisonValue.trim()) {
            return res.status(400).json({
              success: false,
              message: 'Giá trị so sánh là bắt buộc khi có toán tử so sánh'
            });
          }
          if (comparisonOperator === 'between' && (!comparisonValueEnd || !comparisonValueEnd.trim())) {
            return res.status(400).json({
              success: false,
              message: 'Giá trị kết thúc là bắt buộc cho toán tử "between"'
            });
          }
        }
      }

      // Check if type exists (if typeId is being changed)
      if (typeId && typeId !== value.typeId) {
        const type = await Type.findByPk(typeId);
        if (!type) {
          return res.status(404).json({
            success: false,
            message: 'Loại setting không tồn tại'
          });
        }
      }

      // Check if new valuename already exists for this type
      if (valuename && valuename !== value.valuename) {
        const finalTypeId = typeId || value.typeId;
        const existingValue = await Value.findOne({
          where: { typeId: finalTypeId, valuename, id: { [Op.ne]: id } }
        });
        if (existingValue) {
          return res.status(409).json({
            success: false,
            message: 'Tên giá trị đã tồn tại cho loại setting này'
          });
        }
      }

      if (typeId !== undefined) {
        value.typeId = parseInt(typeId);
      }
      if (valuename !== undefined) {
        value.valuename = valuename;
      }
      if (comparisonOperator !== undefined) {
        value.comparisonOperator = comparisonOperator || null;
      }
      if (comparisonValue !== undefined) {
        value.comparisonValue = comparisonValue ? comparisonValue.trim() : null;
      }
      if (comparisonValueEnd !== undefined) {
        value.comparisonValueEnd = (value.comparisonOperator === 'between' && comparisonValueEnd) ? comparisonValueEnd.trim() : null;
      }
      if (valuenameEn !== undefined) {
        value.valuenameEn = valuenameEn || null;
      }
      if (valuenameJp !== undefined) {
        value.valuenameJp = valuenameJp || null;
      }

      await value.save();

      // Reload with type
      await value.reload({
        include: [
          {
            model: Type,
            as: 'type',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Value',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: value.toJSON(),
        description: `Cập nhật giá trị: ${value.valuename}`
      });

      res.json({
        success: true,
        message: 'Cập nhật giá trị thành công',
        data: { value }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete value (soft delete)
   * DELETE /api/admin/values/:id
   */
  deleteValue: async (req, res, next) => {
    try {
      const { id } = req.params;

      const value = await Value.findByPk(id, {
        include: [
          {
            model: Type,
            as: 'type',
            required: false
          }
        ]
      });

      if (!value) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giá trị'
        });
      }

      const oldData = value.toJSON();

      // Remove job_values rows pointing at this value (paranoid soft-delete)
      await JobValue.destroy({ where: { valueId: id } });

      // Soft delete
      await value.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Value',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa giá trị: ${value.valuename}`
      });

      res.json({
        success: true,
        message: 'Xóa giá trị thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


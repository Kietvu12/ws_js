import { CollaboratorAssignment, Admin, ActionLog, CVStorage, Collaborator } from '../../models/index.js';
import { Op } from 'sequelize';

/**
 * Collaborator Assignment = Phân công hồ sơ ứng viên (CV) cho AdminBackOffice
 * Super Admin giao cv_storage_id cho AdminBackOffice phụ trách, không còn giao CTV.
 */
export const collaboratorAssignmentController = {
  /**
   * Get list of assignments (phân công hồ sơ)
   * GET /api/admin/collaborator-assignments
   */
  getAssignments: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        adminId,
        cvStorageId,
        status,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};
      const admin = req.admin;

      if (admin.role === 2) {
        where.adminId = admin.id;
      }

      if (admin.role === 1 && adminId) {
        where.adminId = parseInt(adminId);
      }

      if (cvStorageId) {
        where.cvStorageId = parseInt(cvStorageId);
      }

      if (status !== undefined) {
        where.status = parseInt(status);
      }

      let cvWhere = {};
      if (search) {
        cvWhere[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await CollaboratorAssignment.findAndCountAll({
        where,
        include: [
          {
            model: CVStorage,
            as: 'cvStorage',
            required: true,
            where: cvWhere,
            attributes: ['id', 'code', 'name', 'email', 'phone', 'furigana', 'status']
          },
          {
            model: Admin,
            as: 'admin',
            required: true,
            attributes: ['id', 'name', 'email', 'role']
          },
          {
            model: Admin,
            as: 'assignedByAdmin',
            required: false,
            attributes: ['id', 'name', 'email']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]]
      });

      res.json({
        success: true,
        data: {
          assignments: rows,
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
   * Get unassigned CV storages (hồ sơ chưa được giao)
   * GET /api/admin/collaborator-assignments/unassigned
   */
  getUnassignedCvStorages: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        collaboratorId,
        collaborator_id,
        cvAdminId,
        adminId,
        cv_admin_id
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Chuẩn hóa tham số filter để tránh lệch tên giữa FE/BE
      const collaboratorFilterId = collaboratorId || collaborator_id;
      const cvAdminFilterId = cvAdminId || adminId || cv_admin_id;

      // Chỉ lấy CV của 1 CTV cụ thể nếu được truyền
      if (collaboratorFilterId) {
        where.collaboratorId = parseInt(collaboratorFilterId);
      }

      // Chỉ lấy CV thuộc 1 Admin phụ trách cụ thể nếu được truyền
      if (cvAdminFilterId) {
        where.adminId = parseInt(cvAdminFilterId);
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } }
        ];
      }

      const assignedCvStorageIds = await CollaboratorAssignment.findAll({
        where: { status: 1 },
        attributes: ['cvStorageId'],
        raw: true
      }).then(rows => rows.map(row => row.cvStorageId));

      if (assignedCvStorageIds.length > 0) {
        where.id = { [Op.notIn]: assignedCvStorageIds };
      }

      const { count, rows } = await CVStorage.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'code', 'name', 'email', 'phone', 'furigana', 'status', 'created_at']
      });

      res.json({
        success: true,
        data: {
          cvStorages: rows,
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
   * Get assignment by ID
   * GET /api/admin/collaborator-assignments/:id
   */
  getAssignmentById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const admin = req.admin;

      const assignment = await CollaboratorAssignment.findByPk(id, {
        include: [
          {
            model: CVStorage,
            as: 'cvStorage',
            required: true
          },
          {
            model: Admin,
            as: 'admin',
            required: true
          },
          {
            model: Admin,
            as: 'assignedByAdmin',
            required: false
          }
        ]
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phân công'
        });
      }

      if (admin.role === 2 && assignment.adminId !== admin.id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem phân công này'
        });
      }

      res.json({
        success: true,
        data: { assignment }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create assignment (Super Admin only) - giao hồ sơ cho AdminBackOffice
   * POST /api/admin/collaborator-assignments
   */
  createAssignment: async (req, res, next) => {
    try {
      const admin = req.admin;

      if (admin.role !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Super Admin mới được phân công hồ sơ'
        });
      }

      const { cvStorageId, adminId, notes } = req.body;

      if (!cvStorageId || !adminId) {
        return res.status(400).json({
          success: false,
          message: 'CV Storage ID và Admin ID là bắt buộc'
        });
      }

      const parsedCvStorageId = parseInt(cvStorageId);
      const parsedAdminId = parseInt(adminId);

      if (isNaN(parsedCvStorageId) || isNaN(parsedAdminId)) {
        return res.status(400).json({
          success: false,
          message: 'CV Storage ID và Admin ID phải là số hợp lệ'
        });
      }

      const assignedAdmin = await Admin.findByPk(parsedAdminId);
      if (!assignedAdmin || assignedAdmin.role !== 2) {
        return res.status(400).json({
          success: false,
          message: 'AdminBackOffice không tồn tại hoặc không hợp lệ'
        });
      }

      const cvStorage = await CVStorage.findByPk(parsedCvStorageId);
      if (!cvStorage) {
        return res.status(404).json({
          success: false,
          message: 'Hồ sơ ứng viên không tồn tại'
        });
      }

      const existingActiveAssignment = await CollaboratorAssignment.findOne({
        where: {
          cvStorageId: parsedCvStorageId,
          status: 1
        }
      });

      if (existingActiveAssignment && existingActiveAssignment.adminId !== parsedAdminId) {
        return res.status(409).json({
          success: false,
          message: 'Hồ sơ đã được giao cho AdminBackOffice khác',
          data: { existingAssignment: existingActiveAssignment }
        });
      }

      const existingAssignment = await CollaboratorAssignment.findOne({
        where: {
          cvStorageId: parsedCvStorageId,
          adminId: parsedAdminId
        },
        paranoid: false
      });

      let assignment;
      if (existingAssignment) {
        await existingAssignment.update({
          assignedBy: admin.id,
          notes: notes || existingAssignment.notes,
          status: 1,
          deletedAt: null
        });
        assignment = existingAssignment;
      } else {
        try {
          assignment = await CollaboratorAssignment.create({
            cvStorageId: parsedCvStorageId,
            adminId: parsedAdminId,
            assignedBy: admin.id,
            notes: notes || null,
            status: 1
          });
        } catch (createError) {
          if (createError.name === 'SequelizeUniqueConstraintError') {
            const conflictAssignment = await CollaboratorAssignment.findOne({
              where: {
                cvStorageId: parsedCvStorageId,
                adminId: parsedAdminId
              },
              paranoid: false
            });
            if (conflictAssignment) {
              await conflictAssignment.update({
                assignedBy: admin.id,
                notes: notes || conflictAssignment.notes,
                status: 1,
                deletedAt: null
              });
              assignment = conflictAssignment;
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }

      await assignment.reload({
        include: [
          { model: CVStorage, as: 'cvStorage', required: true },
          { model: Admin, as: 'admin', required: true },
          { model: Admin, as: 'assignedByAdmin', required: false }
        ]
      });

      await ActionLog.create({
        adminId: admin.id,
        object: 'CollaboratorAssignment',
        action: 'create',
        description: `Phân công hồ sơ ${cvStorage.name || cvStorage.code} cho AdminBackOffice ${assignedAdmin.name}`,
        before: null,
        after: assignment.toJSON()
      });

      res.status(201).json({
        success: true,
        message: 'Phân công hồ sơ thành công',
        data: { assignment }
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        return res.status(400).json({
          success: false,
          message: `Lỗi validation: ${messages}`,
          errors: error.errors
        });
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Hồ sơ đã được giao cho AdminBackOffice này rồi',
          error: error.message
        });
      }
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Hồ sơ hoặc Admin không tồn tại',
          error: error.message
        });
      }
      next(error);
    }
  },

  /**
   * Bulk assign CV storages
   * POST /api/admin/collaborator-assignments/bulk
   */
  bulkAssign: async (req, res, next) => {
    try {
      const admin = req.admin;

      if (admin.role !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Super Admin mới được phân công hồ sơ'
        });
      }

      const { cvStorageIds, adminId, notes } = req.body;

      if (!cvStorageIds || !Array.isArray(cvStorageIds) || cvStorageIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách CV Storage IDs là bắt buộc'
        });
      }

      if (!adminId) {
        return res.status(400).json({
          success: false,
          message: 'Admin ID là bắt buộc'
        });
      }

      const assignedAdmin = await Admin.findByPk(adminId);
      if (!assignedAdmin || assignedAdmin.role !== 2) {
        return res.status(400).json({
          success: false,
          message: 'AdminBackOffice không tồn tại hoặc không hợp lệ'
        });
      }

      const cvStorages = await CVStorage.findAll({
        where: { id: { [Op.in]: cvStorageIds } }
      });

      if (cvStorages.length !== cvStorageIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Một số hồ sơ không tồn tại'
        });
      }

      const existingAssignments = await CollaboratorAssignment.findAll({
        where: {
          cvStorageId: { [Op.in]: cvStorageIds },
          status: 1
        }
      });

      const alreadyAssignedIds = existingAssignments.map(a => a.cvStorageId);
      const newCvStorageIds = cvStorageIds.filter(id => !alreadyAssignedIds.includes(parseInt(id)));

      if (newCvStorageIds.length === 0) {
        return res.status(409).json({
          success: false,
          message: 'Tất cả hồ sơ đã được phân công',
          data: { existingAssignments }
        });
      }

      const assignments = await CollaboratorAssignment.bulkCreate(
        newCvStorageIds.map(cvStorageId => ({
          cvStorageId: parseInt(cvStorageId),
          adminId,
          assignedBy: admin.id,
          notes,
          status: 1
        }))
      );

      await ActionLog.create({
        adminId: admin.id,
        object: 'CollaboratorAssignment',
        action: 'create',
        description: `Phân công hàng loạt ${newCvStorageIds.length} hồ sơ cho AdminBackOffice ${assignedAdmin.name}`,
        before: null,
        after: assignments.map(a => a.toJSON())
      });

      res.status(201).json({
        success: true,
        message: `Phân công thành công ${newCvStorageIds.length} hồ sơ`,
        data: {
          assignments,
          skipped: alreadyAssignedIds.length,
          skippedIds: alreadyAssignedIds
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update assignment
   * PUT /api/admin/collaborator-assignments/:id
   */
  updateAssignment: async (req, res, next) => {
    try {
      const admin = req.admin;
      const { id } = req.params;
      const { adminId, notes } = req.body;

      if (admin.role !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Super Admin mới được cập nhật phân công'
        });
      }

      const assignment = await CollaboratorAssignment.findByPk(id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phân công'
        });
      }

      const dataBefore = assignment.toJSON();

      if (adminId && adminId !== assignment.adminId) {
        const newAdmin = await Admin.findByPk(adminId);
        if (!newAdmin || newAdmin.role !== 2) {
          return res.status(400).json({
            success: false,
            message: 'AdminBackOffice không tồn tại hoặc không hợp lệ'
          });
        }
        assignment.adminId = adminId;
        assignment.assignedBy = admin.id;
      }

      if (notes !== undefined) {
        assignment.notes = notes;
      }

      await assignment.save();

      await assignment.reload({
        include: [
          { model: CVStorage, as: 'cvStorage', required: true },
          { model: Admin, as: 'admin', required: true },
          { model: Admin, as: 'assignedByAdmin', required: false }
        ]
      });

      await ActionLog.create({
        adminId: admin.id,
        object: 'CollaboratorAssignment',
        action: 'update',
        description: 'Cập nhật phân công hồ sơ',
        before: dataBefore,
        after: assignment.toJSON()
      });

      res.json({
        success: true,
        message: 'Cập nhật phân công thành công',
        data: { assignment }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete assignment (unassign)
   * DELETE /api/admin/collaborator-assignments/:id
   */
  deleteAssignment: async (req, res, next) => {
    try {
      const admin = req.admin;
      const { id } = req.params;

      if (admin.role !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Super Admin mới được hủy phân công'
        });
      }

      const assignment = await CollaboratorAssignment.findByPk(id, {
        include: [
          { model: CVStorage, as: 'cvStorage', required: true },
          { model: Admin, as: 'admin', required: true }
        ]
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phân công'
        });
      }

      const dataBefore = assignment.toJSON();
      await assignment.destroy();

      await ActionLog.create({
        adminId: admin.id,
        object: 'CollaboratorAssignment',
        action: 'delete',
        description: `Hủy phân công hồ sơ ${assignment.cvStorage?.name || assignment.cvStorage?.code} khỏi AdminBackOffice ${assignment.admin?.name}`,
        before: dataBefore,
        after: null
      });

      res.json({
        success: true,
        message: 'Hủy phân công thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get my assigned CVs (AdminBackOffice)
   * GET /api/admin/collaborator-assignments/my-assigned
   */
  getMyAssignedCvStorages: async (req, res, next) => {
    try {
      const admin = req.admin;
      const {
        page = 1,
        limit = 10,
        search,
        status
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = { adminId: admin.id };

      if (status !== undefined) {
        where.status = parseInt(status);
      }

      let cvWhere = {};
      if (search) {
        cvWhere[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await CollaboratorAssignment.findAndCountAll({
        where,
        include: [
          {
            model: CVStorage,
            as: 'cvStorage',
            required: true,
            where: cvWhere,
            include: [{ model: Collaborator, as: 'collaborator', required: false, attributes: ['id', 'name', 'email', 'code', 'status'] }]
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          assignments: rows,
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
   * Get assignment history
   * GET /api/admin/collaborator-assignments/history
   */
  getAssignmentHistory: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        cvStorageId,
        adminId,
        assignedBy
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      if (cvStorageId) {
        where.cvStorageId = parseInt(cvStorageId);
      }
      if (adminId) {
        where.adminId = parseInt(adminId);
      }
      if (assignedBy) {
        where.assignedBy = parseInt(assignedBy);
      }

      const { count, rows } = await CollaboratorAssignment.findAndCountAll({
        where,
        include: [
          {
            model: CVStorage,
            as: 'cvStorage',
            required: true,
            attributes: ['id', 'code', 'name', 'email']
          },
          {
            model: Admin,
            as: 'admin',
            required: true,
            attributes: ['id', 'name', 'email']
          },
          {
            model: Admin,
            as: 'assignedByAdmin',
            required: true,
            attributes: ['id', 'name', 'email']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']],
        paranoid: false
      });

      res.json({
        success: true,
        data: {
          history: rows,
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
   * Get statistics for assigned CVs
   * GET /api/admin/collaborator-assignments/statistics
   */
  getStatistics: async (req, res, next) => {
    try {
      const admin = req.admin;
      const { cvStorageId, adminId: queryAdminId } = req.query;

      let where = {};
      if (admin.role === 2) {
        where.adminId = admin.id;
      } else if (queryAdminId) {
        where.adminId = parseInt(queryAdminId);
      }

      where.status = 1;

      let assignments = await CollaboratorAssignment.findAll({
        where,
        include: [
          {
            model: CVStorage,
            as: 'cvStorage',
            required: true
          }
        ]
      });

      if (cvStorageId) {
        const cid = parseInt(cvStorageId);
        assignments = assignments.filter(a => a.cvStorageId === cid);
      }

      const statistics = assignments.map(assignment => ({
        assignmentId: assignment.id,
        cvStorageId: assignment.cvStorageId,
        cvStorage: assignment.cvStorage
      }));

      res.json({
        success: true,
        data: { statistics }
      });
    } catch (error) {
      next(error);
    }
  }
};

import { Group, Admin, ActionLog, CollaboratorAssignment, JobApplication, CVStorage, sequelize } from '../../models/index.js';
import { Op } from 'sequelize';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'approvedAt': 'approved_at'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Group Management Controller
 */
export const groupController = {
  /**
   * Get list of groups
   * GET /api/admin/groups
   */
  getGroups: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by name or code
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
          { referralCode: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      const { count, rows } = await Group.findAndCountAll({
        where,
        include: [{
          model: Admin,
          as: 'admins',
          required: false,
          attributes: ['id', 'name', 'email']
        }],
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          groups: rows,
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
   * Get group by ID
   * GET /api/admin/groups/:id
   */
  getGroupById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const group = await Group.findByPk(id, {
        include: [{
          model: Admin,
          as: 'admins',
          required: false,
          attributes: ['id', 'name', 'email', 'role', 'isActive', 'status']
        }]
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      res.json({
        success: true,
        data: { group }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new group
   * POST /api/admin/groups
   */
  createGroup: async (req, res, next) => {
    try {
      const {
        name,
        code,
        referralCode,
        description,
        status = 1
      } = req.body;

      // Validate required fields
      if (!name || !code || !referralCode) {
        return res.status(400).json({
          success: false,
          message: 'Tên, mã nhóm và mã giới thiệu là bắt buộc'
        });
      }

      // Check if code already exists
      const existingGroup = await Group.findOne({ where: { code } });
      if (existingGroup) {
        return res.status(409).json({
          success: false,
          message: 'Mã nhóm đã tồn tại'
        });
      }

      // Check if referralCode already exists
      const existingReferralCode = await Group.findOne({ where: { referralCode } });
      if (existingReferralCode) {
        return res.status(409).json({
          success: false,
          message: 'Mã giới thiệu đã tồn tại'
        });
      }

      // Create group
      const group = await Group.create({
        name,
        code,
        referralCode,
        description,
        status
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Group',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: group.toJSON(),
        description: `Tạo mới nhóm quyền: ${group.name} (${group.code})`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo nhóm quyền thành công',
        data: { group }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update group
   * PUT /api/admin/groups/:id
   */
  updateGroup: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        name,
        code,
        referralCode,
        description,
        status
      } = req.body;

      const group = await Group.findByPk(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      // Store old data for log
      const oldData = group.toJSON();

      // Update fields
      if (name !== undefined) group.name = name;
      if (code !== undefined) {
        // Check if code is already taken by another group
        const existingGroup = await Group.findOne({
          where: { code, id: { [Op.ne]: id } }
        });
        if (existingGroup) {
          return res.status(409).json({
            success: false,
            message: 'Mã nhóm đã tồn tại'
          });
        }
        group.code = code;
      }
      if (referralCode !== undefined) {
        // Check if referralCode is already taken by another group
        const existingReferralCode = await Group.findOne({
          where: { referralCode, id: { [Op.ne]: id } }
        });
        if (existingReferralCode) {
          return res.status(409).json({
            success: false,
            message: 'Mã giới thiệu đã tồn tại'
          });
        }
        group.referralCode = referralCode;
      }
      if (description !== undefined) group.description = description;
      if (status !== undefined) group.status = status;

      await group.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Group',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: group.toJSON(),
        description: `Cập nhật nhóm quyền: ${group.name} (${group.code})`
      });

      res.json({
        success: true,
        message: 'Cập nhật nhóm quyền thành công',
        data: { group }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete group (soft delete)
   * DELETE /api/admin/groups/:id
   */
  deleteGroup: async (req, res, next) => {
    try {
      const { id } = req.params;

      const group = await Group.findByPk(id, {
        include: [{
          model: Admin,
          as: 'admins',
          required: false
        }]
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      // Check if group has admins
      if (group.admins && group.admins.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa nhóm quyền đang có admin. Vui lòng chuyển admin sang nhóm khác trước.'
        });
      }

      // Store old data for log
      const oldData = group.toJSON();

      // Soft delete
      await group.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Group',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa nhóm quyền: ${group.name} (${group.code})`
      });

      res.json({
        success: true,
        message: 'Xóa nhóm quyền thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all groups (for dropdown/select)
   * GET /api/admin/groups/all
   */
  getAllGroups: async (req, res, next) => {
    try {
      const groups = await Group.findAll({
        where: {
          status: 1
          // deletedAt không cần thêm vì model đã có paranoid: true, Sequelize tự động filter
        },
        attributes: ['id', 'name', 'code', 'referralCode'],
        order: [['name', 'ASC']]
      });

      res.json({
        success: true,
        data: { groups }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Assign admin to group
   * PUT /api/admin/groups/:id/assign-admin
   */
  assignAdminToGroup: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { adminId } = req.body;

      if (!adminId) {
        return res.status(400).json({
          success: false,
          message: 'ID admin là bắt buộc'
        });
      }

      const group = await Group.findByPk(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      const admin = await Admin.findByPk(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy admin'
        });
      }

      // Store old data for log
      const oldGroupId = admin.groupId;

      // Update admin's group
      admin.groupId = parseInt(id);
      await admin.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Group',
        action: 'assign_admin',
        ip: req.ip || req.connection.remoteAddress,
        before: { adminId: admin.id, groupId: oldGroupId },
        after: { adminId: admin.id, groupId: parseInt(id) },
        description: `Gán admin ${admin.name} vào nhóm ${group.name}`
      });

      res.json({
        success: true,
        message: 'Gán admin vào nhóm thành công',
        data: { admin, group }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk assign admins to group
   * PUT /api/admin/groups/:id/bulk-assign-admins
   */
  bulkAssignAdminsToGroup: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { adminIds } = req.body;

      if (!adminIds || !Array.isArray(adminIds) || adminIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách ID admin là bắt buộc'
        });
      }

      const group = await Group.findByPk(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      // Update all admins
      const updatedAdmins = [];
      for (const adminId of adminIds) {
        const admin = await Admin.findByPk(adminId);
        if (admin) {
          const oldGroupId = admin.groupId;
          admin.groupId = parseInt(id);
          await admin.save();
          updatedAdmins.push({ admin, oldGroupId });
        }
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Group',
        action: 'bulk_assign_admins',
        ip: req.ip || req.connection.remoteAddress,
        after: { groupId: parseInt(id), adminIds },
        description: `Gán ${updatedAdmins.length} admin vào nhóm ${group.name}`
      });

      res.json({
        success: true,
        message: `Đã gán ${updatedAdmins.length} admin vào nhóm thành công`,
        data: { count: updatedAdmins.length, group }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Remove admin from group
   * PUT /api/admin/groups/:id/remove-admin
   */
  removeAdminFromGroup: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { adminId } = req.body;

      if (!adminId) {
        return res.status(400).json({
          success: false,
          message: 'ID admin là bắt buộc'
        });
      }

      const group = await Group.findByPk(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      const admin = await Admin.findByPk(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy admin'
        });
      }

      if (admin.groupId !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Admin không thuộc nhóm này'
        });
      }

      // Store old data for log
      const oldGroupId = admin.groupId;

      // Remove admin from group
      admin.groupId = null;
      await admin.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Group',
        action: 'remove_admin',
        ip: req.ip || req.connection.remoteAddress,
        before: { adminId: admin.id, groupId: oldGroupId },
        after: { adminId: admin.id, groupId: null },
        description: `Gỡ admin ${admin.name} khỏi nhóm ${group.name}`
      });

      res.json({
        success: true,
        message: 'Gỡ admin khỏi nhóm thành công',
        data: { admin }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get group statistics
   * GET /api/admin/groups/:id/statistics
   */
  getGroupStatistics: async (req, res, next) => {
    try {
      const { id } = req.params;

      const group = await Group.findByPk(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      // Count admins in group
      const adminCount = await Admin.count({
        where: { groupId: parseInt(id), status: 1 }
      });

      // Count active/inactive admins
      const activeAdminCount = await Admin.count({
        where: { groupId: parseInt(id), status: 1, isActive: true }
      });
      const inactiveAdminCount = adminCount - activeAdminCount;

      // Count collaborators assigned to admins in this group
      const adminsInGroup = await Admin.findAll({
        where: { groupId: parseInt(id) },
        attributes: ['id']
      });
      const adminIds = adminsInGroup.map(a => a.id);

      let collaboratorCount = 0;
      if (adminIds.length > 0) {
        collaboratorCount = await CollaboratorAssignment.count({
          where: {
            adminId: { [Op.in]: adminIds },
            status: 1
          },
          distinct: true,
          col: 'collaborator_id'
        });
      }

      // Count job applications handled by group
      let jobApplicationCount = 0;
      if (adminIds.length > 0) {
        jobApplicationCount = await JobApplication.count({
          where: {
            [Op.or]: [
              { adminId: { [Op.in]: adminIds } },
              { adminResponsibleId: { [Op.in]: adminIds } }
            ]
          }
        });
      }

      // Count CVs managed by group
      let cvCount = 0;
      if (adminIds.length > 0) {
        // CVs belong to collaborators assigned to admins in group
        const assignedCollaborators = await CollaboratorAssignment.findAll({
          where: {
            adminId: { [Op.in]: adminIds },
            status: 1
          },
          attributes: ['collaboratorId'],
          distinct: true
        });
        const collaboratorIds = assignedCollaborators.map(a => a.collaboratorId);
        
        if (collaboratorIds.length > 0) {
          cvCount = await CVStorage.count({
            where: {
              collaboratorId: { [Op.in]: collaboratorIds }
            }
          });
        }
      }

      res.json({
        success: true,
        data: {
          statistics: {
            adminCount,
            activeAdminCount,
            inactiveAdminCount,
            collaboratorCount,
            jobApplicationCount,
            cvCount
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get group activity history
   * GET /api/admin/groups/:id/history
   */
  getGroupHistory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const group = await Group.findByPk(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get action logs related to this group
      // Search in description for group name or actions related to group
      const { count, rows } = await ActionLog.findAndCountAll({
        where: {
          object: 'Group',
          [Op.or]: [
            { description: { [Op.like]: `%nhóm ${group.name}%` } },
            { description: { [Op.like]: `%${group.code}%` } },
            { description: { [Op.like]: `%Group%` } }
          ]
        },
        include: [{
          model: Admin,
          as: 'admin',
          required: false,
          attributes: ['id', 'name', 'email']
        }],
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
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
   * Get my group (for Admin CA Team - role = 3)
   * GET /api/admin/groups/my-group
   */
  getMyGroup: async (req, res, next) => {
    try {
      const admin = req.admin;

      if (!admin.groupId) {
        return res.status(404).json({
          success: false,
          message: 'Bạn chưa được gán vào nhóm nào'
        });
      }

      const group = await Group.findByPk(admin.groupId, {
        include: [{
          model: Admin,
          as: 'admins',
          required: false,
          where: { status: 1 },
          attributes: ['id', 'name', 'email', 'role', 'isActive', 'status']
        }]
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      res.json({
        success: true,
        data: { group }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get my group statistics (for Admin CA Team - role = 3)
   * GET /api/admin/groups/my-group/statistics
   */
  getMyGroupStatistics: async (req, res, next) => {
    try {
      const admin = req.admin;

      if (!admin.groupId) {
        return res.status(404).json({
          success: false,
          message: 'Bạn chưa được gán vào nhóm nào'
        });
      }

      const group = await Group.findByPk(admin.groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhóm quyền'
        });
      }

      // Get all admins in group
      const adminsInGroup = await Admin.findAll({
        where: { groupId: admin.groupId, status: 1 },
        attributes: ['id']
      });
      const adminIds = adminsInGroup.map(a => a.id);

      // Count collaborators assigned to group
      let collaboratorCount = 0;
      if (adminIds.length > 0) {
        collaboratorCount = await CollaboratorAssignment.count({
          where: {
            adminId: { [Op.in]: adminIds },
            status: 1
          },
          distinct: true,
          col: 'collaborator_id'
        });
      }

      // Count job applications handled by group
      let jobApplicationCount = 0;
      if (adminIds.length > 0) {
        jobApplicationCount = await JobApplication.count({
          where: {
            [Op.or]: [
              { adminId: { [Op.in]: adminIds } },
              { adminResponsibleId: { [Op.in]: adminIds } }
            ]
          }
        });
      }

      // Count CVs managed by group
      let cvCount = 0;
      if (adminIds.length > 0) {
        const assignedCollaborators = await CollaboratorAssignment.findAll({
          where: {
            adminId: { [Op.in]: adminIds },
            status: 1
          },
          attributes: ['collaboratorId'],
          distinct: true
        });
        const collaboratorIds = assignedCollaborators.map(a => a.collaboratorId);
        
        if (collaboratorIds.length > 0) {
          cvCount = await CVStorage.count({
            where: {
              collaboratorId: { [Op.in]: collaboratorIds }
            }
          });
        }
      }

      // Personal statistics
      const myCollaboratorCount = await CollaboratorAssignment.count({
        where: {
          adminId: admin.id,
          status: 1
        },
        distinct: true,
        col: 'collaborator_id'
      });

      const myJobApplicationCount = await JobApplication.count({
        where: {
          [Op.or]: [
            { adminId: admin.id },
            { adminResponsibleId: admin.id }
          ]
        }
      });

      res.json({
        success: true,
        data: {
          groupStatistics: {
            collaboratorCount,
            jobApplicationCount,
            cvCount
          },
          personalStatistics: {
            collaboratorCount: myCollaboratorCount,
            jobApplicationCount: myJobApplicationCount
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
};


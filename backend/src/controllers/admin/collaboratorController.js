import { Collaborator, RankLevel, Group, ActionLog } from '../../models/index.js';
import { hashPassword } from '../../utils/password.js';
import { Op, col } from 'sequelize';
import sequelize from '../../config/database.js';
import { getSignedUrlForFile, isS3Key } from '../../services/s3Service.js';

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
 * Collaborator Management Controller (Admin)
 */
export const collaboratorController = {
  /**
   * Get list of collaborators
   * GET /api/admin/collaborators
   */
  getCollaborators: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        rankLevelId,
        groupId,
        sortBy = 'id',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by name, email, code, or phone
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by rank level
      if (rankLevelId) {
        where.rankLevelId = parseInt(rankLevelId);
      }

      // Filter by group
      if (groupId) {
        where.groupId = parseInt(groupId);
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'createdAt', 'updatedAt', 'points', 'approvedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause - always add id as secondary sort for consistency
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']); // Secondary sort by id ascending
      }

      const { count, rows } = await Collaborator.findAndCountAll({
        where,
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false,
            attributes: ['id', 'name', 'percent', 'pointsRequired']
          },
          {
            model: Group,
            as: 'group',
            required: false,
            attributes: ['id', 'name', 'code']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      // Get applications count for each collaborator
      const collaboratorIds = rows.map(c => c.id);
      if (collaboratorIds.length > 0) {
        const applicationsCounts = await sequelize.query(
          `SELECT collaborator_id, COUNT(*) as count 
           FROM job_applications 
           WHERE collaborator_id IN (${collaboratorIds.join(',')})
           AND deleted_at IS NULL
           GROUP BY collaborator_id`,
          { type: sequelize.QueryTypes.SELECT }
        );

        const countMap = {};
        applicationsCounts.forEach(item => {
          countMap[item.collaborator_id] = parseInt(item.count);
        });

        // Add applicationsCount to each collaborator
        rows.forEach(collaborator => {
          collaborator.dataValues.applicationsCount = countMap[collaborator.id] || 0;
        });
      } else {
        rows.forEach(collaborator => {
          collaborator.dataValues.applicationsCount = 0;
        });
      }

      res.json({
        success: true,
        data: {
          collaborators: rows,
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
   * Get collaborator by ID
   * GET /api/admin/collaborators/:id
   */
  getCollaboratorById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const collaborator = await Collaborator.findByPk(id, {
        attributes: { exclude: ['password', 'rememberToken'] },
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false,
            attributes: ['id', 'name', 'percent', 'pointsRequired', 'description']
          },
          {
            model: Group,
            as: 'group',
            required: false,
            attributes: ['id', 'name', 'code', 'referralCode']
          }
        ]
      });

      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CTV'
        });
      }

      const collaboratorData = collaborator.toJSON();
      delete collaboratorData.password;
      delete collaboratorData.rememberToken;
      if (collaboratorData.businessLicense && typeof collaboratorData.businessLicense === 'string' && collaboratorData.businessLicense.trim()) {
        collaboratorData.businessLicenseUrl = await getSignedUrlForFile(collaboratorData.businessLicense, 'view');
      }

      res.json({
        success: true,
        data: { collaborator: collaboratorData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Danh sách cấp rank (dropdown admin)
   * GET /api/admin/collaborators/rank-levels
   */
  getRankLevels: async (req, res, next) => {
    try {
      const rows = await RankLevel.findAll({
        where: { isActive: true },
        order: [['id', 'ASC']],
        attributes: ['id', 'name', 'percent', 'pointsRequired']
      });
      res.json({
        success: true,
        data: { rankLevels: rows.map((r) => r.toJSON()) }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new collaborator
   * POST /api/admin/collaborators
   */
  createCollaborator: async (req, res, next) => {
    try {
      const {
        name,
        code,
        email,
        password,
        phone,
        country,
        postCode,
        address,
        organizationType = 'individual',
        companyName,
        taxCode,
        website,
        businessAddress,
        businessLicense,
        avatar,
        birthday,
        gender,
        facebook,
        zalo,
        bankName,
        bankAccount,
        bankAccountName,
        bankBranch,
        organizationLink,
        rankLevelId,
        description,
        groupId,
        status = 1,
        points = 0
      } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Tên, email và mật khẩu là bắt buộc'
        });
      }

      // Check if email already exists
      const existingCollaborator = await Collaborator.findOne({ where: { email } });
      if (existingCollaborator) {
        return res.status(409).json({
          success: false,
          message: 'Email đã tồn tại'
        });
      }

      // Check if code already exists (if provided)
      if (code) {
        const existingCode = await Collaborator.findOne({ where: { code } });
        if (existingCode) {
          return res.status(409).json({
            success: false,
            message: 'Mã CTV đã tồn tại'
          });
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create collaborator — login CTV kiểm tra approvedAt (collaboratorAuthController.login)
      const approvedAt = Number(status) === 1 ? new Date() : null;

      const resolvedRankLevelId =
        rankLevelId != null && rankLevelId !== '' ? rankLevelId : 1;

      const collaborator = await Collaborator.create({
        name,
        code,
        email,
        password: hashedPassword,
        phone,
        country,
        postCode,
        address,
        organizationType,
        companyName,
        taxCode,
        website,
        businessAddress,
        businessLicense,
        avatar,
        birthday,
        gender,
        facebook,
        zalo,
        bankName,
        bankAccount,
        bankAccountName,
        bankBranch,
        organizationLink,
        rankLevelId: resolvedRankLevelId,
        description,
        groupId,
        status,
        points,
        approvedAt
      });

      // Reload with relations
      await collaborator.reload({
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false
          },
          {
            model: Group,
            as: 'group',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Collaborator',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: collaborator.toJSON(),
        description: `Tạo mới CTV: ${collaborator.name} (${collaborator.email})`
      });

      const collaboratorData = collaborator.toJSON();
      delete collaboratorData.password;
      delete collaboratorData.rememberToken;

      res.status(201).json({
        success: true,
        message: 'Tạo CTV thành công',
        data: { collaborator: collaboratorData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update collaborator
   * PUT /api/admin/collaborators/:id
   */
  updateCollaborator: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        name,
        code,
        email,
        password,
        phone,
        country,
        postCode,
        address,
        organizationType,
        companyName,
        taxCode,
        website,
        businessAddress,
        businessLicense,
        avatar,
        birthday,
        gender,
        facebook,
        zalo,
        bankName,
        bankAccount,
        bankAccountName,
        bankBranch,
        organizationLink,
        rankLevelId,
        description,
        groupId,
        status,
        points
      } = req.body;

      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CTV'
        });
      }

      // Store old data for log
      const oldData = collaborator.toJSON();

      // Update fields
      if (name !== undefined) collaborator.name = name;
      if (code !== undefined) {
        // Check if code is already taken by another collaborator
        const existingCode = await Collaborator.findOne({
          where: { code, id: { [Op.ne]: id } }
        });
        if (existingCode) {
          return res.status(409).json({
            success: false,
            message: 'Mã CTV đã tồn tại'
          });
        }
        collaborator.code = code;
      }
      if (email !== undefined) {
        // Check if email is already taken by another collaborator
        const existingEmail = await Collaborator.findOne({
          where: { email, id: { [Op.ne]: id } }
        });
        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message: 'Email đã tồn tại'
          });
        }
        collaborator.email = email;
      }
      if (password !== undefined) {
        collaborator.password = await hashPassword(password);
      }
      if (phone !== undefined) collaborator.phone = phone;
      if (country !== undefined) collaborator.country = country;
      if (postCode !== undefined) collaborator.postCode = postCode;
      if (address !== undefined) collaborator.address = address;
      if (organizationType !== undefined) {
        collaborator.organizationType = organizationType === 'business' ? 'company' : organizationType;
      }
      if (companyName !== undefined) collaborator.companyName = companyName;
      if (taxCode !== undefined) collaborator.taxCode = taxCode;
      if (website !== undefined) collaborator.website = website;
      if (businessAddress !== undefined) collaborator.businessAddress = businessAddress;
      if (businessLicense !== undefined) collaborator.businessLicense = businessLicense;
      if (avatar !== undefined) collaborator.avatar = avatar;
      if (birthday !== undefined) collaborator.birthday = birthday;
      if (gender !== undefined) collaborator.gender = gender;
      if (facebook !== undefined) collaborator.facebook = facebook;
      if (zalo !== undefined) collaborator.zalo = zalo;
      if (bankName !== undefined) collaborator.bankName = bankName;
      if (bankAccount !== undefined) collaborator.bankAccount = bankAccount;
      if (bankAccountName !== undefined) collaborator.bankAccountName = bankAccountName;
      if (bankBranch !== undefined) collaborator.bankBranch = bankBranch;
      if (organizationLink !== undefined) collaborator.organizationLink = organizationLink;
      if (rankLevelId !== undefined) collaborator.rankLevelId = rankLevelId;
      if (description !== undefined) collaborator.description = description;
      if (groupId !== undefined) collaborator.groupId = groupId;
      if (status !== undefined) collaborator.status = status;
      if (points !== undefined) collaborator.points = points;

      await collaborator.save();

      // Reload with relations
      await collaborator.reload({
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false
          },
          {
            model: Group,
            as: 'group',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Collaborator',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: collaborator.toJSON(),
        description: `Cập nhật CTV: ${collaborator.name} (${collaborator.email})`
      });

      const collaboratorData = collaborator.toJSON();
      delete collaboratorData.password;
      delete collaboratorData.rememberToken;

      res.json({
        success: true,
        message: 'Cập nhật CTV thành công',
        data: { collaborator: collaboratorData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete collaborator (soft delete)
   * DELETE /api/admin/collaborators/:id
   */
  deleteCollaborator: async (req, res, next) => {
    try {
      const { id } = req.params;

      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CTV'
        });
      }

      // Store old data for log
      const oldData = collaborator.toJSON();

      // Soft delete
      await collaborator.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Collaborator',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa CTV: ${collaborator.name} (${collaborator.email})`
      });

      res.json({
        success: true,
        message: 'Xóa CTV thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Approve collaborator
   * POST /api/admin/collaborators/:id/approve
   */
  approveCollaborator: async (req, res, next) => {
    try {
      const { id } = req.params;

      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CTV'
        });
      }

      const oldData = collaborator.toJSON();

      // Approve collaborator
      collaborator.approvedAt = new Date();
      collaborator.status = 1;
      await collaborator.save();

      // Reload with relations
      await collaborator.reload({
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false
          },
          {
            model: Group,
            as: 'group',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Collaborator',
        action: 'approve',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: collaborator.toJSON(),
        description: `Duyệt CTV: ${collaborator.name} (${collaborator.email})`
      });

      const collaboratorData = collaborator.toJSON();
      delete collaboratorData.password;
      delete collaboratorData.rememberToken;

      res.json({
        success: true,
        message: 'Duyệt CTV thành công',
        data: { collaborator: collaboratorData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Phê duyệt hàng loạt CTV
   * POST /api/admin/collaborators/approve-bulk
   * body: { ids: number[] }
   */
  approveCollaboratorsBulk: async (req, res, next) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ids phải là mảng không rỗng'
        });
      }

      const collaborators = await Collaborator.findAll({
        where: { id: ids }
      });

      const approved = [];
      const notFound = ids.filter(id => !collaborators.find(c => c.id === id));

      for (const collaborator of collaborators) {
        const oldData = collaborator.toJSON();
        collaborator.approvedAt = new Date();
        collaborator.status = 1;
        await collaborator.save();
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'Collaborator',
          action: 'approve',
          ip: req.ip || req.connection.remoteAddress,
          before: oldData,
          after: collaborator.toJSON(),
          description: `Duyệt CTV: ${collaborator.name} (${collaborator.email})`
        });
        const data = collaborator.toJSON();
        delete data.password;
        delete data.rememberToken;
        approved.push(data);
      }

      res.json({
        success: true,
        message: `Đã phê duyệt ${approved.length} CTV${notFound.length ? `. Không tìm thấy: ${notFound.length}` : ''}`,
        data: {
          approved,
          approvedCount: approved.length,
          notFoundIds: notFound
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reject collaborator
   * POST /api/admin/collaborators/:id/reject
   */
  rejectCollaborator: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CTV'
        });
      }

      const oldData = collaborator.toJSON();

      // Reject collaborator
      collaborator.approvedAt = null;
      collaborator.status = 0;
      await collaborator.save();

      // Reload with relations
      await collaborator.reload({
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false
          },
          {
            model: Group,
            as: 'group',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Collaborator',
        action: 'reject',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: collaborator.toJSON(),
        description: `Từ chối CTV: ${collaborator.name} (${collaborator.email})${reason ? ` - Lý do: ${reason}` : ''}`
      });

      const collaboratorData = collaborator.toJSON();
      delete collaboratorData.password;
      delete collaboratorData.rememberToken;

      res.json({
        success: true,
        message: 'Từ chối CTV thành công',
        data: { collaborator: collaboratorData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggle collaborator status
   * PATCH /api/admin/collaborators/:id/toggle-status
   */
  toggleStatus: async (req, res, next) => {
    try {
      const { id } = req.params;

      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CTV'
        });
      }

      const oldData = collaborator.toJSON();

      // Toggle status
      collaborator.status = collaborator.status === 1 ? 0 : 1;
      await collaborator.save();

      // Reload with relations
      await collaborator.reload({
        include: [
          {
            model: RankLevel,
            as: 'rankLevel',
            required: false
          },
          {
            model: Group,
            as: 'group',
            required: false
          }
        ]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Collaborator',
        action: collaborator.status === 1 ? 'activate' : 'deactivate',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: collaborator.toJSON(),
        description: `${collaborator.status === 1 ? 'Kích hoạt' : 'Vô hiệu hóa'} CTV: ${collaborator.name} (${collaborator.email})`
      });

      const collaboratorData = collaborator.toJSON();
      delete collaboratorData.password;
      delete collaboratorData.rememberToken;

      res.json({
        success: true,
        message: `${collaborator.status === 1 ? 'Kích hoạt' : 'Vô hiệu hóa'} CTV thành công`,
        data: { collaborator: collaboratorData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reset collaborator password
   * POST /api/admin/collaborators/:id/reset-password
   */
  resetPassword: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới là bắt buộc'
        });
      }

      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy CTV'
        });
      }

      // Hash new password
      collaborator.password = await hashPassword(newPassword);
      await collaborator.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Collaborator',
        action: 'reset_password',
        ip: req.ip || req.connection.remoteAddress,
        description: `Đặt lại mật khẩu cho CTV: ${collaborator.name} (${collaborator.email})`
      });

      res.json({
        success: true,
        message: 'Đặt lại mật khẩu thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


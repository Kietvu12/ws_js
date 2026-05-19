import { Admin, Group, ActionLog } from '../../models/index.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { generateToken } from '../../utils/jwt.js';
import { Op } from 'sequelize';
import crypto from 'crypto';
import emailService from '../../services/emailService.js';

const PASSWORD_RESET_EXPIRES_MINUTES = 30;
const ADMIN_FRONTEND_URL = (
  process.env.ADMIN_FRONTEND_URL ||
  process.env.ADMIN_WEB_URL ||
  'https://admin.ws-jobshare.com'
).replace(/\/+$/, '');
function buildAdminResetUrl(token) {
  return `${ADMIN_FRONTEND_URL}/reset-password?userType=admin&token=${encodeURIComponent(token)}`;
}

/**
 * Admin Authentication & Management Controller
 */
export const adminController = {
  /**
   * Login admin
   * POST /api/admin/auth/login
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email và mật khẩu là bắt buộc'
        });
      }

      // Find admin by email
      const admin = await Admin.findOne({
        where: { email },
        include: [{
          model: Group,
          as: 'group',
          required: false
        }]
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không đúng'
        });
      }

      // Check if admin is active
      // Super Admin (role = 1) can always login regardless of isActive/status
      // Other admins need to be active
      if (admin.role !== 1) {
        // Check isActive (boolean) and status (1 = active)
        const isActive = admin.isActive === true || admin.isActive === 1;
        const isStatusActive = admin.status === 1;
        
        if (!isActive || !isStatusActive) {
          console.log(`[Admin Login] Account inactive - isActive: ${admin.isActive}, status: ${admin.status}, role: ${admin.role}`);
          return res.status(403).json({
            success: false,
            message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.'
          });
        }
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, admin.password);
      if (!isPasswordValid) {
        console.log(`[Admin Login] Invalid password for email: ${email}, role: ${admin.role}`);
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không đúng'
        });
      }

      // Generate JWT token
      const token = generateToken({
        id: admin.id,
        email: admin.email,
        role: admin.role
      });

      // Log login action (don't fail login if logging fails)
      try {
        await ActionLog.create({
          adminId: admin.id,
          object: 'Admin',
          action: 'login',
          ip: req.ip || req.connection.remoteAddress,
          description: `Admin ${admin.name} đã đăng nhập`
        });
      } catch (logError) {
        console.error('[Admin Login] Failed to log action:', logError);
        // Don't fail login if logging fails
      }

      // Return admin data (without password)
      const adminData = admin.toJSON();
      delete adminData.password;
      delete adminData.rememberToken;

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          admin: adminData,
          token
        }
      });
    } catch (error) {
      console.error('[Admin Login] Error:', error);
      next(error);
    }
  },

  /**
   * Logout admin
   * POST /api/admin/auth/logout
   */
  logout: async (req, res, next) => {
    try {
      // Log logout action
      if (req.admin) {
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'Admin',
          action: 'logout',
          ip: req.ip || req.connection.remoteAddress,
          description: `Admin ${req.admin.name} đã đăng xuất`
        });
      }

      res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current admin profile
   * GET /api/admin/auth/me
   */
  getProfile: async (req, res, next) => {
    try {
      const admin = await Admin.findByPk(req.admin.id, {
        attributes: { exclude: ['password', 'rememberToken'] },
        include: [{
          model: Group,
          as: 'group',
          required: false
        }]
      });

      res.json({
        success: true,
        data: { admin }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get list of admins
   * GET /api/admin/admins
   */
  getAdmins: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        status,
        groupId
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by name or email
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by role
      if (role) {
        where.role = parseInt(role);
      }

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by group
      if (groupId) {
        where.groupId = parseInt(groupId);
      }

      const { count, rows } = await Admin.findAndCountAll({
        where,
        attributes: { exclude: ['password', 'rememberToken'] },
        include: [{
          model: Group,
          as: 'group',
          required: false
        }],
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          admins: rows,
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
   * Get admin by ID
   * GET /api/admin/admins/:id
   */
  getAdminById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const admin = await Admin.findByPk(id, {
        attributes: { exclude: ['password', 'rememberToken'] },
        include: [{
          model: Group,
          as: 'group',
          required: false
        }]
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy admin'
        });
      }

      res.json({
        success: true,
        data: { admin }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new admin
   * POST /api/admin/admins
   */
  createAdmin: async (req, res, next) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        avatar,
        role,
        groupId,
        isActive = true
      } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Tên, email và mật khẩu là bắt buộc'
        });
      }

      // Check if email already exists
      const existingAdmin = await Admin.findOne({ where: { email } });
      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: 'Email đã tồn tại'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create admin
      const admin = await Admin.create({
        name,
        email,
        password: hashedPassword,
        phone,
        avatar,
        role: role || 1,
        groupId,
        isActive,
        status: isActive ? 1 : 0
      });

      // Reload with group
      await admin.reload({
        include: [{
          model: Group,
          as: 'group',
          required: false
        }]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Admin',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: admin.toJSON(),
        description: `Tạo mới admin: ${admin.name} (${admin.email})`
      });

      const adminData = admin.toJSON();
      delete adminData.password;
      delete adminData.rememberToken;

      res.status(201).json({
        success: true,
        message: 'Tạo admin thành công',
        data: { admin: adminData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update admin
   * PUT /api/admin/admins/:id
   */
  updateAdmin: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        password,
        phone,
        avatar,
        role,
        groupId,
        isActive,
        status
      } = req.body;

      const admin = await Admin.findByPk(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy admin'
        });
      }

      // Store old data for log
      const oldData = admin.toJSON();

      // Update fields
      if (name !== undefined) admin.name = name;
      if (email !== undefined) {
        // Check if email is already taken by another admin
        const existingAdmin = await Admin.findOne({
          where: { email, id: { [Op.ne]: id } }
        });
        if (existingAdmin) {
          return res.status(409).json({
            success: false,
            message: 'Email đã tồn tại'
          });
        }
        admin.email = email;
      }
      if (phone !== undefined) admin.phone = phone;
      if (avatar !== undefined) admin.avatar = avatar;
      if (role !== undefined) admin.role = role;
      if (groupId !== undefined) admin.groupId = groupId;
      if (isActive !== undefined) {
        admin.isActive = isActive;
        admin.status = isActive ? 1 : 0;
      }
      if (status !== undefined) admin.status = status;

      // Update password if provided
      if (password) {
        admin.password = await hashPassword(password);
      }

      await admin.save();

      // Reload with group
      await admin.reload({
        include: [{
          model: Group,
          as: 'group',
          required: false
        }]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Admin',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: admin.toJSON(),
        description: `Cập nhật admin: ${admin.name} (${admin.email})`
      });

      const adminData = admin.toJSON();
      delete adminData.password;
      delete adminData.rememberToken;

      res.json({
        success: true,
        message: 'Cập nhật admin thành công',
        data: { admin: adminData }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete admin (soft delete)
   * DELETE /api/admin/admins/:id
   */
  deleteAdmin: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (parseInt(id) === req.admin.id) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể xóa tài khoản của chính mình'
        });
      }

      const admin = await Admin.findByPk(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy admin'
        });
      }

      // Store old data for log
      const oldData = admin.toJSON();

      // Soft delete
      await admin.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Admin',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa admin: ${admin.name} (${admin.email})`
      });

      res.json({
        success: true,
        message: 'Xóa admin thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Forgot password – gửi email reset link cho admin
   * POST /api/admin/auth/forgot-password
   */
  forgotPassword: async (req, res, next) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email là bắt buộc' });
      }

      const admin = await Admin.findOne({ where: { email } });
      if (!admin) {
        return res.json({ success: true, message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.' });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000;
      const payload = `${expiresAt}.${rawToken}`;
      const tokenHash = crypto.createHash('sha256').update(payload).digest('hex');

      admin.rememberToken = tokenHash;
      await admin.save();

      const resetUrl = buildAdminResetUrl(payload);
      const subject = '[WS Job Share] パスワードリセット / Password Reset / Đặt lại mật khẩu';
      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.55;">
          <p>パスワードリセットのリクエストを受け付けました。<br/>以下のリンクよりパスワードを再設定してください（有効期限: ${PASSWORD_RESET_EXPIRES_MINUTES}分）:<br/>
            <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
          </p>
          <p style="margin: 14px 0;">========================================</p>
          <p>We received a request to reset your password.<br/>Click the link below to set a new password (expires in ${PASSWORD_RESET_EXPIRES_MINUTES} minutes):<br/>
            <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
          </p>
          <p style="margin: 14px 0;">========================================</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu của bạn.<br/>Vui lòng nhấn vào liên kết dưới đây để đặt mật khẩu mới (hết hạn sau ${PASSWORD_RESET_EXPIRES_MINUTES} phút):<br/>
            <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
          </p>
          <p style="margin: 16px 0 0;">このメールに心当たりがない場合は無視してください。</p>
          <p style="margin: 16px 0 0; font-weight: 700;">Workstation JobShare</p>
        </div>
      `;

      try {
        await emailService.sendEmail({ to: admin.email, subject, html });
      } catch (emailError) {
        console.error('[admin forgotPassword] Send email failed:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.'
        });
      }

      return res.json({ success: true, message: 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reset admin password
   * POST /api/admin/auth/reset-password
   */
  resetPassword: async (req, res, next) => {
    try {
      const token = String(req.body.token || '').trim();
      const newPassword = String(req.body.password || '');

      if (!token) {
        return res.status(400).json({ success: false, message: 'Token không hợp lệ' });
      }
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' });
      }

      const dotIdx = token.indexOf('.');
      if (dotIdx === -1) {
        return res.status(400).json({ success: false, message: 'Token không hợp lệ' });
      }

      const expiresAt = parseInt(token.substring(0, dotIdx), 10);
      if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
        return res.status(400).json({ success: false, message: 'Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.' });
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const admin = await Admin.findOne({ where: { rememberToken: tokenHash } });
      if (!admin) {
        return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã được sử dụng' });
      }

      admin.password = await hashPassword(newPassword);
      admin.rememberToken = null;
      await admin.save();

      return res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggle admin active status
   * PATCH /api/admin/admins/:id/toggle-status
   */
  toggleStatus: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Prevent self-deactivation
      if (parseInt(id) === req.admin.id) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể vô hiệu hóa tài khoản của chính mình'
        });
      }

      const admin = await Admin.findByPk(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy admin'
        });
      }

      const oldData = admin.toJSON();

      // Toggle status
      admin.isActive = !admin.isActive;
      admin.status = admin.isActive ? 1 : 0;
      await admin.save();

      // Reload with group
      await admin.reload({
        include: [{
          model: Group,
          as: 'group',
          required: false
        }]
      });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Admin',
        action: admin.isActive ? 'activate' : 'deactivate',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: admin.toJSON(),
        description: `${admin.isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} admin: ${admin.name} (${admin.email})`
      });

      const adminData = admin.toJSON();
      delete adminData.password;
      delete adminData.rememberToken;

      res.json({
        success: true,
        message: `${admin.isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} admin thành công`,
        data: { admin: adminData }
      });
    } catch (error) {
      next(error);
    }
  }
};


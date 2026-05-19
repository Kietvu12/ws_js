import { Applicant } from '../../models/index.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { generateToken } from '../../utils/jwt.js';
import crypto from 'crypto';
import emailService from '../../services/emailService.js';

const PASSWORD_RESET_EXPIRES_MINUTES = 30;
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.WEB_URL || 'http://localhost:5173').replace(/\/+$/, '');

export const applicantAuthController = {
  register: async (req, res, next) => {
    try {
      const { name, email, password, phone } = req.body || {};

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Tên, email và mật khẩu là bắt buộc'
        });
      }

      if (String(password).length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải có ít nhất 8 ký tự'
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = await Applicant.findOne({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }

      const applicant = await Applicant.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password: await hashPassword(String(password)),
        phone: phone ? String(phone).trim() : null,
        status: 1
      });

      const token = generateToken({
        id: applicant.id,
        email: applicant.email,
        role: 'APPLICANT'
      });

      const payload = applicant.toJSON();
      delete payload.password;
      delete payload.rememberToken;

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản ứng viên thành công',
        data: {
          applicant: payload,
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email và mật khẩu là bắt buộc'
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const applicant = await Applicant.findOne({ where: { email: normalizedEmail } });
      if (!applicant || !applicant.password) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không đúng'
        });
      }

      if (applicant.status !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị vô hiệu hóa'
        });
      }

      const isValid = await comparePassword(String(password), applicant.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không đúng'
        });
      }

      const token = generateToken({
        id: applicant.id,
        email: applicant.email,
        role: 'APPLICANT'
      });

      const payload = applicant.toJSON();
      delete payload.password;
      delete payload.rememberToken;

      return res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          applicant: payload,
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  getMe: async (req, res, next) => {
    try {
      const applicant = await Applicant.findByPk(req.applicant.id);
      if (!applicant) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản ứng viên'
        });
      }

      const payload = applicant.toJSON();
      delete payload.password;
      delete payload.rememberToken;

      return res.json({
        success: true,
        data: { applicant: payload }
      });
    } catch (error) {
      next(error);
    }
  },

  forgotPassword: async (req, res, next) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email là bắt buộc' });
      }

      const applicant = await Applicant.findOne({ where: { email } });
      if (!applicant) {
        return res.json({ success: true, message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.' });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000;
      const payload = `${expiresAt}.${rawToken}`;
      const tokenHash = crypto.createHash('sha256').update(payload).digest('hex');

      applicant.rememberToken = tokenHash;
      await applicant.save();

      const resetUrl = `${FRONTEND_URL}/candidate/reset-password?token=${encodeURIComponent(payload)}`;

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
        const emailResult = await emailService.sendEmail({ to: applicant.email, subject, html });
        console.log('[applicant forgotPassword] Email sent successfully to:', applicant.email, emailResult);
      } catch (emailError) {
        console.error('[applicant forgotPassword] Send email failed:', emailError);
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
      const applicant = await Applicant.findOne({ where: { rememberToken: tokenHash } });
      if (!applicant) {
        return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã được sử dụng' });
      }

      applicant.password = await hashPassword(newPassword);
      applicant.rememberToken = null;
      await applicant.save();

      return res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.' });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req, res, next) => {
    try {
      return res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });
    } catch (error) {
      next(error);
    }
  }
};


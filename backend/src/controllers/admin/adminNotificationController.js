import { CollaboratorNotification, Job } from '../../models/index.js';
import { collaboratorNotificationService } from '../../services/collaboratorNotificationService.js';

/** DB chưa chạy migration thêm cột admin_id → Sequelize/MySQL lỗi 1054 */
function isMissingAdminNotificationsAdminColumn(err) {
  const e = err?.parent || err?.original || err;
  if (e?.errno === 1054 || e?.code === 'ER_BAD_FIELD_ERROR') return true;
  const m = String(e?.sqlMessage || err?.message || '');
  return /Unknown column ['`]?admin_id['`]?/i.test(m) || /Unknown column ['`]?collaborator_notifications\.admin_id/i.test(m);
}

export const adminNotificationController = {
  getNotifications: async (req, res, next) => {
    try {
      const adminId = req.admin.id;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
      const offset = (page - 1) * limit;

      const { count, rows } = await CollaboratorNotification.findAndCountAll({
        where: { adminId },
        include: [
          {
            model: Job,
            as: 'job',
            required: false,
            attributes: ['id', 'jobCode', 'title', 'slug']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      res.json({
        success: true,
        data: {
          notifications: rows,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      if (isMissingAdminNotificationsAdminColumn(error)) {
        return res.json({
          success: true,
          data: {
            notifications: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
          }
        });
      }
      next(error);
    }
  },

  getUnreadCount: async (req, res, next) => {
    try {
      const adminId = req.admin.id;
      const count = await CollaboratorNotification.count({
        where: { adminId, isRead: false }
      });
      res.json({ success: true, data: { count } });
    } catch (error) {
      if (isMissingAdminNotificationsAdminColumn(error)) {
        return res.json({ success: true, data: { count: 0 } });
      }
      next(error);
    }
  },

  markRead: async (req, res, next) => {
    try {
      const adminId = req.admin.id;
      const notificationId = parseInt(req.params.id, 10);

      const notification = await CollaboratorNotification.findOne({
        where: { id: notificationId, adminId }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông báo'
        });
      }

      notification.isRead = true;
      await notification.save();

      res.json({
        success: true,
        message: 'Đã đánh dấu đã đọc',
        data: { notification }
      });
    } catch (error) {
      if (isMissingAdminNotificationsAdminColumn(error)) {
        return res.status(404).json({
          success: false,
          message: 'Chưa hỗ trợ thông báo admin — chạy migration collaborator_notifications (admin_id)'
        });
      }
      next(error);
    }
  },

  markAllRead: async (req, res, next) => {
    try {
      const adminId = req.admin.id;
      await CollaboratorNotification.update(
        { isRead: true },
        { where: { adminId, isRead: false } }
      );

      res.json({
        success: true,
        message: 'Đã đánh dấu tất cả thông báo là đã đọc'
      });
    } catch (error) {
      if (isMissingAdminNotificationsAdminColumn(error)) {
        return res.json({ success: true, message: 'OK (schema chưa có admin_id)' });
      }
      next(error);
    }
  },

  stream: async (req, res, next) => {
    try {
      const adminId = req.admin.id;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      collaboratorNotificationService.subscribeAdmin(adminId, res);
      res.write('event: connected\n');
      res.write(`data: ${JSON.stringify({ connected: true, adminId })}\n\n`);

      const keepAliveTimer = setInterval(() => {
        res.write('event: ping\n');
        res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      }, 25000);

      req.on('close', () => {
        clearInterval(keepAliveTimer);
        collaboratorNotificationService.unsubscribeAdmin(adminId, res);
      });
    } catch (error) {
      next(error);
    }
  }
};

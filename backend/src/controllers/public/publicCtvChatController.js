import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../config/database.js';
import {
  Admin,
  PublicCtvChatMessage,
  PublicCtvChatSession
} from '../../models/index.js';
import { collaboratorNotificationService } from '../../services/collaboratorNotificationService.js';
import { publicCtvChatSseService } from '../../services/publicCtvChatSseService.js';
import { emitRealtime } from '../../services/realtimeHub.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const serializeMessage = (m) => ({
  id: m.id,
  sessionId: m.sessionId,
  senderType: m.senderType,
  adminId: m.adminId,
  body: m.body,
  createdAt: m.createdAt || m.created_at
});

const labelFromCollaborator = (c) => {
  if (!c) return null;
  const parts = [c.name, c.code ? `(${c.code})` : ''].filter(Boolean);
  const s = parts.join(' ').trim();
  return s ? s.slice(0, 255) : null;
};

const serializeSessionPublic = (s) => ({
  sessionToken: s.sessionToken,
  sessionId: s.id,
  visitorLabel: s.visitorLabel,
  isRegistered: !!s.collaboratorId,
  collaboratorId: s.collaboratorId || null
});

export const publicCtvChatController = {
  /** POST /api/public/ctv-chat/sessions — Bearer CTV (optional): gắn / tái sử dụng phiên đã đăng ký */
  ensureSession: async (req, res, next) => {
    try {
      const rawToken = req.body?.sessionToken;
      const visitorLabel =
        typeof req.body?.visitorLabel === 'string'
          ? req.body.visitorLabel.trim().slice(0, 255)
          : null;

      const collab = req.collaborator;

      if (collab) {
        const existingForCollab = await PublicCtvChatSession.findOne({
          where: { collaboratorId: collab.id },
          order: sequelize.literal('`PublicCtvChatSession`.`updated_at` DESC')
        });
        if (existingForCollab) {
          const vl = visitorLabel || labelFromCollaborator(collab);
          if (vl && existingForCollab.visitorLabel !== vl) {
            existingForCollab.visitorLabel = vl;
            await existingForCollab.save();
          }
          return res.json({ success: true, data: serializeSessionPublic(existingForCollab) });
        }

        if (rawToken && typeof rawToken === 'string' && UUID_RE.test(rawToken.trim())) {
          const anon = await PublicCtvChatSession.findOne({
            where: { sessionToken: rawToken.trim() }
          });
          if (anon) {
            if (anon.collaboratorId && anon.collaboratorId !== collab.id) {
              return res.status(403).json({
                success: false,
                message: 'Phiên chat đã gắn tài khoản khác'
              });
            }
            if (!anon.collaboratorId) {
              anon.collaboratorId = collab.id;
              anon.visitorLabel = visitorLabel || labelFromCollaborator(collab) || anon.visitorLabel;
              await anon.save();
              return res.json({ success: true, data: serializeSessionPublic(anon) });
            }
            // Token trỏ đúng phiên đã gắn chính CTV này (trùng findOne phía trên trong DB bình thường;
            // vẫn return ở đây để không rơi xuống create → lỗi UNIQUE collaborator_id).
            if (anon.collaboratorId === collab.id) {
              const vl = visitorLabel || labelFromCollaborator(collab);
              if (vl && anon.visitorLabel !== vl) {
                anon.visitorLabel = vl;
                await anon.save();
              }
              return res.json({ success: true, data: serializeSessionPublic(anon) });
            }
          }
        }

        const sessionToken = uuidv4();
        try {
          const row = await PublicCtvChatSession.create({
            sessionToken,
            visitorLabel: visitorLabel || labelFromCollaborator(collab),
            collaboratorId: collab.id,
            status: 'open'
          });
          return res.json({ success: true, data: serializeSessionPublic(row) });
        } catch (err) {
          const dup =
            err?.name === 'SequelizeUniqueConstraintError' ||
            err?.parent?.code === 'ER_DUP_ENTRY';
          if (dup) {
            const existing = await PublicCtvChatSession.findOne({
              where: { collaboratorId: collab.id },
              order: sequelize.literal('`PublicCtvChatSession`.`updated_at` DESC')
            });
            if (existing) {
              return res.json({ success: true, data: serializeSessionPublic(existing) });
            }
          }
          throw err;
        }
      }

      if (rawToken && typeof rawToken === 'string' && UUID_RE.test(rawToken.trim())) {
        const existing = await PublicCtvChatSession.findOne({
          where: { sessionToken: rawToken.trim() }
        });
        if (existing) {
          if (visitorLabel && visitorLabel !== existing.visitorLabel) {
            existing.visitorLabel = visitorLabel;
            await existing.save();
          }
          return res.json({
            success: true,
            data: serializeSessionPublic(existing)
          });
        }
      }

      const sessionToken = uuidv4();
      const row = await PublicCtvChatSession.create({
        sessionToken,
        visitorLabel,
        status: 'open'
      });

      res.json({
        success: true,
        data: serializeSessionPublic(row)
      });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/public/ctv-chat/messages?sessionToken= */
  getMessages: async (req, res, next) => {
    try {
      const sessionToken = String(req.query.sessionToken || '').trim();
      if (!UUID_RE.test(sessionToken)) {
        return res.status(400).json({ success: false, message: 'sessionToken không hợp lệ' });
      }
      const session = await PublicCtvChatSession.findOne({ where: { sessionToken } });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }
      const messages = await PublicCtvChatMessage.findAll({
        where: { sessionId: session.id },
        // Phải dùng alias model (PublicCtvChatMessage), không dùng tên bảng trong ORDER BY — MySQL báo lỗi cột.
        order: sequelize.literal('`PublicCtvChatMessage`.`created_at` ASC'),
        include: [{ model: Admin, as: 'admin', attributes: ['id', 'name'], required: false }]
      });
      res.json({
        success: true,
        data: { messages: messages.map(serializeMessage) }
      });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/public/ctv-chat/messages */
  postMessage: async (req, res, next) => {
    try {
      const sessionToken = String(req.body?.sessionToken || '').trim();
      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      if (!UUID_RE.test(sessionToken)) {
        return res.status(400).json({ success: false, message: 'sessionToken không hợp lệ' });
      }
      if (!body) {
        return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });
      }

      const session = await PublicCtvChatSession.findOne({ where: { sessionToken } });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }

      const priorVisitorCount = await PublicCtvChatMessage.count({
        where: { sessionId: session.id, senderType: 'visitor' }
      });

      const msg = await PublicCtvChatMessage.create({
        sessionId: session.id,
        senderType: 'visitor',
        adminId: null,
        body: body.slice(0, 8000)
      });

      const now = new Date();
      session.lastMessageAt = now;
      session.lastVisitorMessageAt = now;
      await session.save();

      const messagePayload = serializeMessage(msg);
      const payload = { type: 'message', message: messagePayload };
      publicCtvChatSseService.emitToSession(session.id, payload);
      const inboxPayload = {
        type: 'message',
        sessionId: session.id,
        sessionToken: session.sessionToken,
        visitorLabel: session.visitorLabel,
        collaboratorId: session.collaboratorId || null,
        isRegistered: !!session.collaboratorId,
        message: messagePayload,
        hasUnread: true
      };
      publicCtvChatSseService.emitToAdminInbox(inboxPayload);
      emitRealtime('admin-public-ctv-chat', inboxPayload, 'admin-inbox');

      if (priorVisitorCount === 0) {
        await collaboratorNotificationService.notifyAdminsPublicCtvLandingChat({
          visitorLabel: session.visitorLabel,
          preview: body,
          sessionId: session.id
        });
      }

      res.json({ success: true, data: { message: messagePayload } });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/public/ctv-chat/stream?sessionToken= (SSE) */
  stream: async (req, res, next) => {
    try {
      const sessionToken = String(req.query.sessionToken || '').trim();
      if (!UUID_RE.test(sessionToken)) {
        return res.status(400).json({ success: false, message: 'sessionToken không hợp lệ' });
      }
      const session = await PublicCtvChatSession.findOne({ where: { sessionToken } });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      publicCtvChatSseService.subscribeSession(session.id, res);
      res.write('event: connected\n');
      res.write(`data: ${JSON.stringify({ connected: true, sessionId: session.id })}\n\n`);

      const keepAliveTimer = setInterval(() => {
        res.write('event: ping\n');
        res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      }, 25000);

      req.on('close', () => {
        clearInterval(keepAliveTimer);
        publicCtvChatSseService.unsubscribeSession(session.id, res);
      });
    } catch (error) {
      next(error);
    }
  }
};

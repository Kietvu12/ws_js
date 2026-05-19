import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../config/database.js';
import {
  Admin,
  PublicCandidateChatMessage,
  PublicCandidateChatSession
} from '../../models/index.js';
import { collaboratorNotificationService } from '../../services/collaboratorNotificationService.js';
import { publicCandidateChatSseService } from '../../services/publicCandidateChatSseService.js';
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

export const publicCandidateChatController = {
  ensureSession: async (req, res, next) => {
    try {
      const rawToken = req.body?.sessionToken;
      const visitorLabel =
        typeof req.body?.visitorLabel === 'string'
          ? req.body.visitorLabel.trim().slice(0, 255)
          : null;
      const applicantId = req.body?.applicantId ? parseInt(req.body.applicantId, 10) : null;

      if (applicantId && !Number.isNaN(applicantId)) {
        const existing = await PublicCandidateChatSession.findOne({
          where: { applicantId }
        });
        if (existing) {
          let changed = false;
          if (visitorLabel && visitorLabel !== existing.visitorLabel) {
            existing.visitorLabel = visitorLabel;
            changed = true;
          }
          if (changed) await existing.save();
          return res.json({
            success: true,
            data: {
              sessionToken: existing.sessionToken,
              sessionId: existing.id,
              visitorLabel: existing.visitorLabel
            }
          });
        }
      }

      if (rawToken && typeof rawToken === 'string' && UUID_RE.test(rawToken.trim())) {
        const existing = await PublicCandidateChatSession.findOne({
          where: { sessionToken: rawToken.trim() }
        });
        if (existing) {
          let changed = false;
          if (visitorLabel && visitorLabel !== existing.visitorLabel) {
            existing.visitorLabel = visitorLabel;
            changed = true;
          }
          if (applicantId && !Number.isNaN(applicantId) && !existing.applicantId) {
            existing.applicantId = applicantId;
            changed = true;
          }
          if (changed) await existing.save();
          return res.json({
            success: true,
            data: {
              sessionToken: existing.sessionToken,
              sessionId: existing.id,
              visitorLabel: existing.visitorLabel
            }
          });
        }
      }

      const sessionToken = uuidv4();
      const row = await PublicCandidateChatSession.create({
        sessionToken,
        visitorLabel,
        applicantId: applicantId && !Number.isNaN(applicantId) ? applicantId : null,
        status: 'open'
      });

      res.json({
        success: true,
        data: {
          sessionToken: row.sessionToken,
          sessionId: row.id,
          visitorLabel: row.visitorLabel
        }
      });
    } catch (error) {
      next(error);
    }
  },

  getMessages: async (req, res, next) => {
    try {
      const sessionToken = String(req.query.sessionToken || '').trim();
      if (!UUID_RE.test(sessionToken)) {
        return res.status(400).json({ success: false, message: 'sessionToken không hợp lệ' });
      }
      const session = await PublicCandidateChatSession.findOne({ where: { sessionToken } });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }
      const messages = await PublicCandidateChatMessage.findAll({
        where: { sessionId: session.id },
        order: sequelize.literal('`PublicCandidateChatMessage`.`created_at` ASC'),
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

      const session = await PublicCandidateChatSession.findOne({ where: { sessionToken } });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }

      const priorVisitorCount = await PublicCandidateChatMessage.count({
        where: { sessionId: session.id, senderType: 'visitor' }
      });

      const msg = await PublicCandidateChatMessage.create({
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
      const inboxPayload = {
        type: 'message',
        sessionId: session.id,
        sessionToken: session.sessionToken,
        visitorLabel: session.visitorLabel,
        message: messagePayload,
        hasUnread: true
      };
      publicCandidateChatSseService.emitToSession(session.id, payload);
      publicCandidateChatSseService.emitToAdminInbox(inboxPayload);
      emitRealtime('admin-public-candidate-chat', inboxPayload, 'admin-inbox');

      if (priorVisitorCount === 0) {
        await collaboratorNotificationService.notifyAdminsPublicCandidateLandingChat({
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

  stream: async (req, res, next) => {
    try {
      const sessionToken = String(req.query.sessionToken || '').trim();
      if (!UUID_RE.test(sessionToken)) {
        return res.status(400).json({ success: false, message: 'sessionToken không hợp lệ' });
      }
      const session = await PublicCandidateChatSession.findOne({ where: { sessionToken } });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      publicCandidateChatSseService.subscribeSession(session.id, res);
      res.write('event: connected\n');
      res.write(`data: ${JSON.stringify({ connected: true, sessionId: session.id })}\n\n`);

      const keepAliveTimer = setInterval(() => {
        res.write('event: ping\n');
        res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      }, 25000);

      req.on('close', () => {
        clearInterval(keepAliveTimer);
        publicCandidateChatSseService.unsubscribeSession(session.id, res);
      });
    } catch (error) {
      next(error);
    }
  }
};

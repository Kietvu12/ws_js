import sequelize from '../../config/database.js';
import { Admin, Applicant, PublicCandidateChatMessage, PublicCandidateChatSession } from '../../models/index.js';
import { publicCandidateChatSseService } from '../../services/publicCandidateChatSseService.js';
import { emitRealtime } from '../../services/realtimeHub.js';

const serializeMessage = (m) => ({
  id: m.id,
  sessionId: m.sessionId,
  senderType: m.senderType,
  adminId: m.adminId,
  body: m.body,
  createdAt: m.createdAt || m.created_at
});

export const adminPublicCandidateChatController = {
  listSessions: async (req, res, next) => {
    try {
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10), 1), 100);
      const offset = (page - 1) * limit;

      const { count, rows } = await PublicCandidateChatSession.findAndCountAll({
        order: sequelize.literal('`PublicCandidateChatSession`.`updated_at` DESC'),
        limit,
        offset,
        include: [
          {
            model: Applicant,
            as: 'applicant',
            attributes: ['id', 'name', 'email', 'phone'],
            required: false
          }
        ]
      });

      res.json({
        success: true,
        data: {
          sessions: rows.map((s) => {
            const a = s.applicant;
            return {
              id: s.id,
              sessionToken: s.sessionToken,
              visitorLabel: s.visitorLabel,
              applicantId: s.applicantId || null,
              isRegistered: !!s.applicantId,
              applicantName: a?.name || null,
              applicantEmail: a?.email || null,
              applicantPhone: a?.phone || null,
              status: s.status,
              lastMessageAt: s.lastMessageAt,
              lastVisitorMessageAt: s.lastVisitorMessageAt,
              adminLastSeenAt: s.adminLastSeenAt,
              hasUnread: !!(s.lastVisitorMessageAt && (!s.adminLastSeenAt || new Date(s.lastVisitorMessageAt).getTime() > new Date(s.adminLastSeenAt).getTime())),
              updatedAt: s.updatedAt || s.updated_at,
              createdAt: s.createdAt || s.created_at
            };
          }),
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  getMessages: async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      if (Number.isNaN(sessionId)) {
        return res.status(400).json({ success: false, message: 'sessionId không hợp lệ' });
      }
      const session = await PublicCandidateChatSession.findByPk(sessionId, {
        include: [
          {
            model: Applicant,
            as: 'applicant',
            attributes: ['id', 'name', 'email', 'phone'],
            required: false
          }
        ]
      });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }
      const messages = await PublicCandidateChatMessage.findAll({
        where: { sessionId },
        order: sequelize.literal('`PublicCandidateChatMessage`.`created_at` ASC'),
        include: [{ model: Admin, as: 'admin', attributes: ['id', 'name'], required: false }]
      });
      const applicant = session.applicant;
      const now = new Date();
      if (session.lastVisitorMessageAt && (!session.adminLastSeenAt || new Date(session.lastVisitorMessageAt).getTime() > new Date(session.adminLastSeenAt).getTime())) {
        session.adminLastSeenAt = now;
        await session.save();
        emitRealtime('admin-public-candidate-chat-read', { sessionId, adminLastSeenAt: now }, 'admin-inbox');
      }
      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            sessionToken: session.sessionToken,
            visitorLabel: session.visitorLabel,
            applicantId: session.applicantId || null,
            isRegistered: !!session.applicantId,
            applicantName: applicant?.name || null,
            applicantEmail: applicant?.email || null,
            applicantPhone: applicant?.phone || null,
            status: session.status,
            lastMessageAt: session.lastMessageAt,
            lastVisitorMessageAt: session.lastVisitorMessageAt,
            adminLastSeenAt: session.adminLastSeenAt,
            hasUnread: !!(session.lastVisitorMessageAt && (!session.adminLastSeenAt || new Date(session.lastVisitorMessageAt).getTime() > new Date(session.adminLastSeenAt).getTime()))
          },
          messages: messages.map(serializeMessage)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  postMessage: async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      if (Number.isNaN(sessionId)) {
        return res.status(400).json({ success: false, message: 'sessionId không hợp lệ' });
      }
      if (!body) {
        return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });
      }

      const session = await PublicCandidateChatSession.findByPk(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }

      const adminId = req.admin.id;
      const msg = await PublicCandidateChatMessage.create({
        sessionId: session.id,
        senderType: 'admin',
        adminId,
        body: body.slice(0, 8000)
      });

      const now = new Date();
      session.lastMessageAt = now;
      session.lastVisitorMessageAt = now;
      session.adminLastSeenAt = now;
      await session.save();

      const messagePayload = serializeMessage(msg);
      const payload = { type: 'message', message: messagePayload };
      publicCandidateChatSseService.emitToSession(session.id, payload);
      const inboxPayload = {
        type: 'message',
        sessionId: session.id,
        sessionToken: session.sessionToken,
        visitorLabel: session.visitorLabel,
        applicantId: session.applicantId || null,
        isRegistered: !!session.applicantId,
        message: messagePayload,
        hasUnread: true
      };
      publicCandidateChatSseService.emitToAdminInbox(inboxPayload);
      emitRealtime('admin-public-candidate-chat', inboxPayload, 'admin-inbox');

      res.json({ success: true, data: { message: messagePayload } });
    } catch (error) {
      next(error);
    }
  },

  inboxStream: async (req, res, next) => {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      publicCandidateChatSseService.subscribeAdminInbox(res);
      res.write('event: connected\n');
      res.write(`data: ${JSON.stringify({ connected: true, adminId: req.admin.id })}\n\n`);

      const keepAliveTimer = setInterval(() => {
        res.write('event: ping\n');
        res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      }, 25000);

      req.on('close', () => {
        clearInterval(keepAliveTimer);
        publicCandidateChatSseService.unsubscribeAdminInbox(res);
      });
    } catch (error) {
      next(error);
    }
  }
};

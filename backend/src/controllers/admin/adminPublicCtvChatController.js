import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../config/database.js';
import { Admin, Collaborator, PublicCtvChatMessage, PublicCtvChatSession } from '../../models/index.js';
import { publicCtvChatSseService } from '../../services/publicCtvChatSseService.js';
import { emitRealtime } from '../../services/realtimeHub.js';

const serializeMessage = (m) => ({
  id: m.id,
  sessionId: m.sessionId,
  senderType: m.senderType,
  adminId: m.adminId,
  body: m.body,
  createdAt: m.createdAt || m.created_at
});

const hasUnread = (session) => !!(session?.lastVisitorMessageAt && (!session?.adminLastSeenAt || new Date(session.lastVisitorMessageAt).getTime() > new Date(session.adminLastSeenAt).getTime()));
const serializeSession = (s, c = null) => ({
  id: s.id,
  sessionToken: s.sessionToken,
  visitorLabel: s.visitorLabel,
  collaboratorId: s.collaboratorId || null,
  isRegistered: !!s.collaboratorId,
  collaboratorName: c?.name || null,
  collaboratorCode: c?.code || null,
  collaboratorEmail: c?.email || null,
  status: s.status,
  lastMessageAt: s.lastMessageAt,
  lastVisitorMessageAt: s.lastVisitorMessageAt,
  adminLastSeenAt: s.adminLastSeenAt,
  hasUnread: hasUnread(s),
  updatedAt: s.updatedAt || s.updated_at,
  createdAt: s.createdAt || s.created_at
});

export const adminPublicCtvChatController = {
  /** GET /api/admin/public-ctv-chat/sessions */
  listSessions: async (req, res, next) => {
    try {
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10), 1), 100);
      const offset = (page - 1) * limit;

      const { count, rows } = await PublicCtvChatSession.findAndCountAll({
        order: sequelize.literal('`PublicCtvChatSession`.`updated_at` DESC'),
        limit,
        offset,
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            attributes: ['id', 'name', 'code', 'email'],
            required: false
          }
        ]
      });

      res.json({
        success: true,
        data: {
          sessions: rows.map((s) => {
            const c = s.collaborator;
            return {
              id: s.id,
              sessionToken: s.sessionToken,
              visitorLabel: s.visitorLabel,
              collaboratorId: s.collaboratorId || null,
              isRegistered: !!s.collaboratorId,
              collaboratorName: c?.name || null,
              collaboratorCode: c?.code || null,
              collaboratorEmail: c?.email || null,
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

  /** GET /api/admin/public-ctv-chat/sessions/:sessionId/messages */
  getMessages: async (req, res, next) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      if (Number.isNaN(sessionId)) {
        return res.status(400).json({ success: false, message: 'sessionId không hợp lệ' });
      }
      const session = await PublicCtvChatSession.findByPk(sessionId, {
        include: [
          {
            model: Collaborator,
            as: 'collaborator',
            attributes: ['id', 'name', 'code', 'email'],
            required: false
          }
        ]
      });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }
      const messages = await PublicCtvChatMessage.findAll({
        where: { sessionId },
        order: sequelize.literal('`PublicCtvChatMessage`.`created_at` ASC'),
        include: [{ model: Admin, as: 'admin', attributes: ['id', 'name'], required: false }]
      });
      const collab = session.collaborator;
      const now = new Date();
      if (session.lastVisitorMessageAt && (!session.adminLastSeenAt || new Date(session.lastVisitorMessageAt).getTime() > new Date(session.adminLastSeenAt).getTime())) {
        session.adminLastSeenAt = now;
        await session.save();
        emitRealtime('admin-public-ctv-chat-read', { sessionId, adminLastSeenAt: now }, 'admin-inbox');
      }

      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            sessionToken: session.sessionToken,
            visitorLabel: session.visitorLabel,
            collaboratorId: session.collaboratorId || null,
            isRegistered: !!session.collaboratorId,
            collaboratorName: collab?.name || null,
            collaboratorCode: collab?.code || null,
            collaboratorEmail: collab?.email || null,
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

  /** POST /api/admin/public-ctv-chat/sessions/:sessionId/messages */
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

      const session = await PublicCtvChatSession.findByPk(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
      }

      const adminId = req.admin.id;
      const msg = await PublicCtvChatMessage.create({
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

      res.json({ success: true, data: { message: messagePayload } });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/admin/public-ctv-chat/search-collaborators?q=... */
  searchCollaborators: async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 1) {
        return res.json({ success: true, data: { collaborators: [] } });
      }
      const like = `%${q}%`;
      const collaborators = await Collaborator.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: like } },
            { code: { [Op.like]: like } },
            { email: { [Op.like]: like } },
            { phone: { [Op.like]: like } }
          ]
        },
        attributes: ['id', 'name', 'code', 'email', 'phone'],
        limit: 20,
        order: [['name', 'ASC']]
      });
      res.json({
        success: true,
        data: {
          collaborators: collaborators.map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            email: c.email,
            phone: c.phone
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/admin/public-ctv-chat/sessions — tạo/lấy phiên chat cho CTV */
  createSession: async (req, res, next) => {
    try {
      const collaboratorId = parseInt(req.body?.collaboratorId, 10);
      if (!collaboratorId || Number.isNaN(collaboratorId)) {
        return res.status(400).json({ success: false, message: 'collaboratorId không hợp lệ' });
      }
      const collab = await Collaborator.findByPk(collaboratorId, {
        attributes: ['id', 'name', 'code', 'email']
      });
      if (!collab) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy CTV' });
      }

      let session = await PublicCtvChatSession.findOne({
        where: { collaboratorId },
        order: sequelize.literal('`PublicCtvChatSession`.`updated_at` DESC')
      });

      if (!session) {
        const labelParts = [collab.name, collab.code ? `(${collab.code})` : ''].filter(Boolean);
        session = await PublicCtvChatSession.create({
          sessionToken: uuidv4(),
          visitorLabel: labelParts.join(' ').trim().slice(0, 255) || null,
          collaboratorId,
          status: 'open'
        });
      }

      const sessionPayload = {
        type: 'session-created',
        sessionId: session.id,
        sessionToken: session.sessionToken,
        visitorLabel: session.visitorLabel,
        collaboratorId: session.collaboratorId,
        isRegistered: true,
        collaboratorName: collab.name,
        collaboratorCode: collab.code,
        collaboratorEmail: collab.email,
        status: session.status,
        lastMessageAt: session.lastMessageAt,
        hasUnread: !!(session.lastVisitorMessageAt && (!session.adminLastSeenAt || new Date(session.lastVisitorMessageAt).getTime() > new Date(session.adminLastSeenAt).getTime()))
      };
      publicCtvChatSseService.emitToAdminInbox(sessionPayload);
      emitRealtime('admin-public-ctv-chat', sessionPayload, 'admin-inbox');

      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            sessionToken: session.sessionToken,
            visitorLabel: session.visitorLabel,
            collaboratorId: session.collaboratorId,
            isRegistered: true,
            collaboratorName: collab.name,
            collaboratorCode: collab.code,
            collaboratorEmail: collab.email,
            status: session.status,
            lastMessageAt: session.lastMessageAt,
            updatedAt: session.updatedAt || session.updated_at,
            createdAt: session.createdAt || session.created_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/admin/public-ctv-chat/inbox-stream (SSE) — dùng ?token=JWT */
  inboxStream: async (req, res, next) => {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      publicCtvChatSseService.subscribeAdminInbox(res);
      res.write('event: connected\n');
      res.write(`data: ${JSON.stringify({ connected: true, adminId: req.admin.id })}\n\n`);

      const keepAliveTimer = setInterval(() => {
        res.write('event: ping\n');
        res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      }, 25000);

      req.on('close', () => {
        clearInterval(keepAliveTimer);
        publicCtvChatSseService.unsubscribeAdminInbox(res);
      });
    } catch (error) {
      next(error);
    }
  }
};

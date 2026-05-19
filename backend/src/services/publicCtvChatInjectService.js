import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.js';
import {
  Collaborator,
  PublicCtvChatMessage,
  PublicCtvChatSession
} from '../models/index.js';
import { publicCtvChatSseService } from './publicCtvChatSseService.js';

const serializeMessage = (m) => ({
  id: m.id,
  sessionId: m.sessionId,
  senderType: m.senderType,
  adminId: m.adminId,
  body: m.body,
  createdAt: m.createdAt || m.created_at
});

async function ensureCollaboratorSession(collaboratorId) {
  const id = Number(collaboratorId);
  if (!id || Number.isNaN(id)) return null;

  let session = await PublicCtvChatSession.findOne({
    where: { collaboratorId: id },
    order: sequelize.literal('`PublicCtvChatSession`.`updated_at` DESC')
  });
  if (session) return session;

  const collab = await Collaborator.findByPk(id, {
    attributes: ['id', 'name', 'code']
  });
  const labelParts = [collab?.name, collab?.code ? `(${collab.code})` : ''].filter(Boolean);
  const visitorLabel = labelParts.join(' ').trim().slice(0, 255) || null;

  session = await PublicCtvChatSession.create({
    sessionToken: uuidv4(),
    visitorLabel,
    collaboratorId: id,
    status: 'open'
  });
  return session;
}

async function emitAfterCreate(session, messagePayload) {
  const payload = { type: 'message', message: messagePayload };
  publicCtvChatSseService.emitToSession(session.id, payload);
  publicCtvChatSseService.emitToAdminInbox({
    type: 'message',
    sessionId: session.id,
    sessionToken: session.sessionToken,
    visitorLabel: session.visitorLabel,
    collaboratorId: session.collaboratorId || null,
    isRegistered: !!session.collaboratorId,
    message: messagePayload
  });
}

/**
 * Tin từ admin (hoặc hệ thống thay admin) — hiển thị bên trái trong widget CTV.
 */
export async function injectAdminMessageForCollaborator({
  collaboratorId,
  body,
  adminId = null
}) {
  if (!collaboratorId || typeof body !== 'string' || !body.trim()) return null;
  const session = await ensureCollaboratorSession(collaboratorId);
  if (!session) return null;

  const msg = await PublicCtvChatMessage.create({
    sessionId: session.id,
    senderType: 'admin',
    adminId: adminId || null,
    body: body.trim().slice(0, 8000)
  });
  session.lastMessageAt = new Date();
  await session.save();

  const messagePayload = serializeMessage(msg);
  await emitAfterCreate(session, messagePayload);
  return msg;
}

/**
 * Tin hệ thống phía CTV (ví dụ xác nhận đã gửi duyệt) — hiển thị như tin visitor.
 */
export async function injectVisitorMessageForCollaborator({ collaboratorId, body }) {
  if (!collaboratorId || typeof body !== 'string' || !body.trim()) return null;
  const session = await ensureCollaboratorSession(collaboratorId);
  if (!session) return null;

  const msg = await PublicCtvChatMessage.create({
    sessionId: session.id,
    senderType: 'visitor',
    adminId: null,
    body: body.trim().slice(0, 8000)
  });
  session.lastMessageAt = new Date();
  await session.save();

  const messagePayload = serializeMessage(msg);
  await emitAfterCreate(session, messagePayload);
  return msg;
}

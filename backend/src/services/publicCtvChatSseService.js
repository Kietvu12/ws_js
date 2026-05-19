/**
 * SSE fan-out cho chat landing CTV (khách) và inbox admin.
 */

const writeSse = (res, eventName, data) => {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const sessionStreams = new Map(); // sessionId (number) -> Set<express.Response>
const adminInboxStreams = new Set();

export const publicCtvChatSseService = {
  subscribeSession(sessionId, res) {
    const key = Number(sessionId);
    if (!sessionStreams.has(key)) sessionStreams.set(key, new Set());
    sessionStreams.get(key).add(res);
  },

  unsubscribeSession(sessionId, res) {
    const key = Number(sessionId);
    const set = sessionStreams.get(key);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) sessionStreams.delete(key);
  },

  subscribeAdminInbox(res) {
    adminInboxStreams.add(res);
  },

  unsubscribeAdminInbox(res) {
    adminInboxStreams.delete(res);
  },

  emitToSession(sessionId, payload) {
    const set = sessionStreams.get(Number(sessionId));
    if (!set) return;
    for (const res of set) {
      try {
        writeSse(res, 'chat', payload);
      } catch {
        // ignore broken pipe
      }
    }
  },

  emitToAdminInbox(payload) {
    for (const res of adminInboxStreams) {
      try {
        writeSse(res, 'chat', payload);
      } catch {
        // ignore
      }
    }
  }
};

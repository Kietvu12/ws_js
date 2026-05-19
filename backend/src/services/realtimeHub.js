import { Server } from 'socket.io';

let io = null;

export function initRealtimeHub(httpServer, corsOptions = {}) {
  if (io) return io;
  io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    socket.on('join-admin-inbox', () => {
      socket.join('admin-inbox');
    });

    socket.on('join-ctv-chat', (sessionId) => {
      if (sessionId != null) socket.join(`ctv-chat:${Number(sessionId)}`);
    });

    socket.on('join-candidate-chat', (sessionId) => {
      if (sessionId != null) socket.join(`candidate-chat:${Number(sessionId)}`);
    });
  });

  return io;
}

export function getRealtimeHub() {
  return io;
}

export function emitRealtime(eventName, payload, room) {
  if (!io) return;
  if (room) io.to(room).emit(eventName, payload);
  else io.emit(eventName, payload);
}

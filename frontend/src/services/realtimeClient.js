import { io } from 'socket.io-client';

let socket = null;

export function getRealtimeClient() {
  if (socket) return socket;
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const url = base.replace(/\/api\/?$/, '');
  socket = io(url || window.location.origin, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    withCredentials: true
  });
  return socket;
}

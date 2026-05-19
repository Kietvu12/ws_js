/**
 * UUID v4 for client-only ids. Uses Web Crypto when available; otherwise RFC4122-style fallback
 * (older browsers, insecure origins, some embedded WebViews lack crypto.randomUUID).
 */
export function randomUUID() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

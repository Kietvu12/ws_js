let _client = null;
let _disabled = false;

/** Optional Redis: without REDIS_URL, caching is disabled. */
export async function getRedis() {
  if (_disabled) return null;
  if (_client) return _client;
  const url = (process.env.REDIS_URL || '').trim();
  if (!url) {
    _disabled = true;
    return null;
  }
  try {
    const { default: Redis } = await import('ioredis');
    _client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false
    });
    _client.on('error', (e) => {
      console.warn('[redis]', e.message);
    });
    return _client;
  } catch (e) {
    console.warn('[redis] init failed:', e.message);
    _disabled = true;
    return null;
  }
}

export async function closeRedis() {
  if (_client) {
    await _client.quit().catch(() => {});
    _client = null;
  }
}

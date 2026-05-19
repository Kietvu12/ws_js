import crypto from 'crypto';
import { getRedis } from './redisClient.js';

const CACHE_PREFIX = 'joblist';
/** Bump when list API semantics change (invalidates old Redis entries without manual INCR). */
const JOB_LIST_CACHE_REV = 5;

function cacheTtlSec() {
  const n = parseInt(process.env.JOB_LIST_CACHE_TTL_SEC || '45', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 300) : 45;
}

async function cacheVersion(redis) {
  const v = await redis.get(`${CACHE_PREFIX}:ver`);
  return v != null ? String(v) : '0';
}

export async function bumpJobListCacheVersion() {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.incr(`${CACHE_PREFIX}:ver`);
  } catch (e) {
    console.warn('[jobListCache] bump failed:', e.message);
  }
}

function stableHash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify([JOB_LIST_CACHE_REV, obj])).digest('hex').slice(0, 40);
}

export async function getJobListCached(cachePayload) {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const ver = await cacheVersion(redis);
    const key = `${CACHE_PREFIX}:${ver}:${stableHash(cachePayload)}`;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[jobListCache] get failed:', e.message);
    return null;
  }
}

export async function setJobListCached(cachePayload, value) {
  const redis = await getRedis();
  if (!redis) return;
  try {
    const ver = await cacheVersion(redis);
    const key = `${CACHE_PREFIX}:${ver}:${stableHash(cachePayload)}`;
    const ttl = cacheTtlSec();
    const json = JSON.stringify(value);
    const maxBytes = parseInt(process.env.JOB_LIST_CACHE_MAX_BYTES || '1048576', 10);
    if (Buffer.byteLength(json, 'utf8') > maxBytes) return;
    await redis.setex(key, ttl, json);
  } catch (e) {
    console.warn('[jobListCache] set failed:', e.message);
  }
}

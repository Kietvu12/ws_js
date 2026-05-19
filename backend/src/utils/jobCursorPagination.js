import crypto from 'crypto';

const CURSOR_VERSION = 1;

/**
 * Cursor key-value: sortField (model attribute), id, v (primary sort value — string | number | null)
 */
export function encodeJobCursor({ sortField, sortOrder, id, primaryValue, isPinned }) {
  const payload = {
    v: CURSOR_VERSION,
    sf: sortField,
    so: sortOrder === 'ASC' ? 'ASC' : 'DESC',
    id: String(id),
    pv:
      primaryValue instanceof Date
        ? primaryValue.toISOString()
        : primaryValue === null || primaryValue === undefined
          ? null
          : primaryValue
  };
  if (isPinned === 0 || isPinned === 1) {
    payload.ip = isPinned;
  }
  const json = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', process.env.JOB_CURSOR_HMAC_SECRET || process.env.JWT_SECRET || 'job-cursor').update(json).digest('hex').slice(0, 16);
  return Buffer.from(JSON.stringify({ ...payload, sig }), 'utf8').toString('base64url');
}

export function decodeJobCursor(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const raw = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const { sig, ...payload } = raw;
    const json = JSON.stringify(payload);
    const expect = crypto.createHmac('sha256', process.env.JOB_CURSOR_HMAC_SECRET || process.env.JWT_SECRET || 'job-cursor').update(json).digest('hex').slice(0, 16);
    if (sig !== expect) return null;
    if (payload.v !== CURSOR_VERSION) return null;
    const id = BigInt(payload.id);
    return {
      sortField: payload.sf,
      sortOrder: payload.so === 'ASC' ? 'ASC' : 'DESC',
      id: Number(id),
      primaryValue: payload.pv,
      isPinned: payload.ip === 0 || payload.ip === 1 ? payload.ip : undefined
    };
  } catch {
    return null;
  }
}

/** Primary sort column value from a Sequelize row. */
export function primaryValueFromRow(row, sortField) {
  if (sortField === 'id') return row.id;
  const v = row[sortField];
  if (v instanceof Date) return v;
  return v;
}

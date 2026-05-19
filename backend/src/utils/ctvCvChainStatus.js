/**
 * Quy tắc gán status cho chuỗi hồ sơ CTV (cùng collaborator; nhóm ứng viên theo OR email/SĐT — xem groupRowsByCtvEmailOrPhoneUnion):
 * - Sắp xếp theo created_at tăng dần (cùng thời điểm thì id tăng dần).
 * - Bản tạo trước "chặn" bản sau trong 6 tháng kể từ ngày tạo của bản trước.
 *
 * Hằng số thời gian (6 tháng) khớp OVERDUE_MONTHS trong cvDuplicateChecker.js
 */
import {
  CV_STATUS_DUPLICATE,
  CV_STATUS_NEW,
  CV_STATUS_OVERDUE_6_MONTHS,
} from '../constants/cvStatus.js';
import { normalizeCvEmail, normalizeCvPhone } from './cvIdentityNormalize.js';

/** ~6 tháng (183 ngày), đồng bộ logic "quá hạn" */
export const CHAIN_SIX_MONTH_MS = 183 * 24 * 60 * 60 * 1000;

/** Coi là chưa có cập nhật thực sự nếu updated_at ≈ created_at */
export const CREATED_UPDATED_EQUAL_MS = 2000;

export const normalizePhoneForChain = normalizeCvPhone;
export const normalizeEmailForChain = normalizeCvEmail;

export function groupKeyCtvCv(collaboratorId, email, phone) {
  const e = normalizeCvEmail(email != null ? String(email) : '');
  const p = normalizeCvPhone(phone != null ? String(phone) : '');
  if (!collaboratorId || !e || !p) return null;
  return `${collaboratorId}|${e}|${p}`;
}

/** Khóa legacy AND: cùng email và cùng SĐT (chỉ dùng --group-by global-and / ctv-and) */
export function groupKeyGlobalCv(email, phone) {
  const e = normalizeCvEmail(email != null ? String(email) : '');
  const p = normalizeCvPhone(phone != null ? String(phone) : '');
  if (!e || !p) return null;
  return `${e}|${p}`;
}

class UnionFind {
  constructor(n) {
    this.p = Array.from({ length: n }, (_, i) => i);
  }

  find(i) {
    if (this.p[i] !== i) this.p[i] = this.find(this.p[i]);
    return this.p[i];
  }

  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.p[rb] = ra;
  }
}

function unionIndexLists(uf, indices) {
  if (indices.length < 2) return;
  for (let k = 1; k < indices.length; k++) uf.union(indices[0], indices[k]);
}

/**
 * Gom nhóm liên thông: hai hồ sơ cùng nhóm nếu cùng email (đã chuẩn) HOẶC cùng phone (đã chuẩn),
 * kể cả qua trung gian (A–B cùng email, B–C cùng phone → A,B,C một nhóm).
 * Khớp quy tắc trùng: OR email hoặc SĐT (liên thông). Khác `groupKeyGlobalCv` (AND — chỉ mode legacy).
 *
 * @param {Array<{ email?: string|null, phone?: string|null }>} rows
 * @returns {Array<Array<Record<string, unknown>>>}
 */
export function groupRowsByEmailOrPhoneUnion(rows) {
  const n = rows.length;
  if (n === 0) return [];

  const uf = new UnionFind(n);
  const emailToIndices = new Map();
  const phoneToIndices = new Map();

  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const e = normalizeCvEmail(r.email);
    const p = normalizeCvPhone(r.phone);
    if (e) {
      if (!emailToIndices.has(e)) emailToIndices.set(e, []);
      emailToIndices.get(e).push(i);
    }
    if (p) {
      if (!phoneToIndices.has(p)) phoneToIndices.set(p, []);
      phoneToIndices.get(p).push(i);
    }
  }

  for (const indices of emailToIndices.values()) unionIndexLists(uf, indices);
  for (const indices of phoneToIndices.values()) unionIndexLists(uf, indices);

  const rootToMembers = new Map();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!rootToMembers.has(root)) rootToMembers.set(root, []);
    rootToMembers.get(root).push(rows[i]);
  }
  return [...rootToMembers.values()];
}

/**
 * Giống `groupRowsByEmailOrPhoneUnion` nhưng chỉ nối cạnh trong cùng `collaborator_id` (mode --group-by ctv).
 *
 * @param {Array<{ collaboratorId?: number|null, email?: string|null, phone?: string|null }>} rows
 */
export function groupRowsByCtvEmailOrPhoneUnion(rows) {
  const byCtv = new Map();
  for (const r of rows) {
    if (r.collaboratorId == null) continue;
    const k = String(r.collaboratorId);
    if (!byCtv.has(k)) byCtv.set(k, []);
    byCtv.get(k).push(r);
  }
  const out = [];
  for (const list of byCtv.values()) {
    out.push(...groupRowsByEmailOrPhoneUnion(list));
  }
  return out;
}

export function msSince(isoDate) {
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Date.now() - t;
}

/**
 * Dùng cho so sánh "cập nhật gần đây": tránh updated_at null / 1970 / nhỏ hơn created_at
 * (khiến msSince(updated) ~ 50 năm → nhầm quá hạn dù hồ sơ mới tạo).
 */
export function effectiveUpdatedAt(createdAt, updatedAt) {
  const c = new Date(createdAt).getTime();
  if (Number.isNaN(c)) return createdAt;
  if (updatedAt == null || updatedAt === '') return createdAt;
  const u = new Date(updatedAt).getTime();
  if (Number.isNaN(u)) return createdAt;
  // Epoch / zero date do import hoặc lỗi DB
  if (u < 86400000) return createdAt;
  if (u < c) return createdAt;
  return updatedAt;
}

export function isNoRealUpdate(createdAt, updatedAt) {
  const eff = effectiveUpdatedAt(createdAt, updatedAt);
  const c = new Date(createdAt).getTime();
  const u = new Date(eff).getTime();
  if (Number.isNaN(c)) return true;
  if (Number.isNaN(u)) return true;
  return Math.abs(u - c) < CREATED_UPDATED_EQUAL_MS;
}

/**
 * @param {Array<{ id: number, created_at?: Date, updated_at?: Date, createdAt?: Date, updatedAt?: Date }>} rows
 *        Đã sắp xếp created ASC, id ASC. Sequelize dùng createdAt/updatedAt hoặc snake_case từ raw.
 * @returns {Array<{ id: number, status: number, duplicateWithCvId: number|null, isDuplicate: boolean }>}
 */
export function computeChainStatuses(rows) {
  const sorted = [...rows].sort((a, b) => {
    const ca = new Date(a.created_at ?? a.createdAt).getTime();
    const cb = new Date(b.created_at ?? b.createdAt).getTime();
    if (ca !== cb) return ca - cb;
    return Number(a.id) - Number(b.id);
  });

  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const created = row.created_at ?? row.createdAt;
    const updated = row.updated_at ?? row.updatedAt;
    const effUpdated = effectiveUpdatedAt(created, updated);

    let status;
    let duplicateWithCvId = null;

    if (i === 0) {
      status = msSince(created) > CHAIN_SIX_MONTH_MS ? CV_STATUS_OVERDUE_6_MONTHS : CV_STATUS_NEW;
    } else {
      const prev = sorted[i - 1];
      const prevCreated = prev.created_at ?? prev.createdAt;

      if (msSince(prevCreated) <= CHAIN_SIX_MONTH_MS) {
        status = CV_STATUS_DUPLICATE;
        duplicateWithCvId = prev.id;
      } else {
        if (isNoRealUpdate(created, updated)) {
          status = CV_STATUS_DUPLICATE;
          duplicateWithCvId = prev.id;
        } else if (msSince(effUpdated) <= CHAIN_SIX_MONTH_MS) {
          status = CV_STATUS_NEW;
        } else if (msSince(created) <= CHAIN_SIX_MONTH_MS) {
          // Hồ sơ tạo chưa đủ 6 tháng: không thể "quá hạn 6 tháng" vì lỗi updated_at
          status = CV_STATUS_NEW;
        } else {
          status = CV_STATUS_OVERDUE_6_MONTHS;
        }
      }
    }

    // An toàn chung: trạng thái 4 chỉ khi chính hồ sơ đó tồn tại > 6 tháng (kể từ ngày tạo)
    if (status === CV_STATUS_OVERDUE_6_MONTHS && msSince(created) <= CHAIN_SIX_MONTH_MS) {
      status = CV_STATUS_NEW;
      duplicateWithCvId = null;
    }

    const isDuplicate = status === CV_STATUS_DUPLICATE;
    if (!isDuplicate) duplicateWithCvId = null;

    out.push({
      id: row.id,
      status,
      duplicateWithCvId,
      isDuplicate,
    });
  }

  return out;
}

/**
 * Trong cùng một nhóm trùng (đã xác định trước): bản có `created_at` sớm nhất (tie-break `id`) = hợp lệ,
 * các bản sau = trùng, `duplicateWithCvId` trỏ về bản hợp lệ.
 *
 * @param {Array<{ id: number, created_at?: Date, createdAt?: Date }>} rows — không cần sort trước
 * @returns {Array<{ id: number, status: number, duplicateWithCvId: number|null, isDuplicate: boolean }>}
 */
export function computeOldestWinsDuplicateStatuses(rows) {
  const sorted = [...rows].sort((a, b) => {
    const ca = new Date(a.created_at ?? a.createdAt).getTime();
    const cb = new Date(b.created_at ?? b.createdAt).getTime();
    if (ca !== cb) return ca - cb;
    return Number(a.id) - Number(b.id);
  });

  if (sorted.length === 0) return [];

  const canonicalId = sorted[0].id;
  return sorted.map((row, i) => {
    if (i === 0) {
      return {
        id: row.id,
        status: CV_STATUS_NEW,
        duplicateWithCvId: null,
        isDuplicate: false,
      };
    }
    return {
      id: row.id,
      status: CV_STATUS_DUPLICATE,
      duplicateWithCvId: canonicalId,
      isDuplicate: true,
    };
  });
}

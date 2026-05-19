import { JobCategory } from '../models/index.js';

/**
 * @param {Record<string, unknown>|undefined} body
 * @returns {undefined|number|null} undefined = omit; null = clear DB; number = set FK
 */
export function parseJobCategoryIdFromBody(body) {
  if (!body || (!('jobCategoryId' in body) && !('job_category_id' in body))) {
    return undefined;
  }
  const v = body.jobCategoryId ?? body.job_category_id;
  if (v === '' || v === null) return null;
  const n = parseInt(String(v), 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export async function jobCategoryIdExists(id) {
  if (id == null) return true;
  const row = await JobCategory.findByPk(id);
  return !!row;
}

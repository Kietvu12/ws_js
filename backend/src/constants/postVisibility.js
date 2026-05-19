/**
 * Bitmask for posts.visibility_mask (where the published post appears).
 * 1 = CTV agent home / information feed (authenticated)
 * 2 = public collaborator landing (blog + home news block)
 * 4 = public candidate landing (blog + home news block)
 */
export const POST_VISIBILITY_AGENT_HOME = 1;
export const POST_VISIBILITY_PUBLIC_CTV = 2;
export const POST_VISIBILITY_PUBLIC_CANDIDATE = 4;
export const POST_VISIBILITY_ALL =
  POST_VISIBILITY_AGENT_HOME | POST_VISIBILITY_PUBLIC_CTV | POST_VISIBILITY_PUBLIC_CANDIDATE;

/**
 * @param {unknown} raw
 * @returns {number} 0–7
 */
export function normalizePostVisibilityMask(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > 7) return POST_VISIBILITY_ALL;
  return n;
}

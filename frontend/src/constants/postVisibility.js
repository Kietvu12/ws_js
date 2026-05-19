/** Match backend/src/constants/postVisibility.js */
export const POST_VISIBILITY_AGENT_HOME = 1;
export const POST_VISIBILITY_PUBLIC_CTV = 2;
export const POST_VISIBILITY_PUBLIC_CANDIDATE = 4;
export const POST_VISIBILITY_ALL =
  POST_VISIBILITY_AGENT_HOME | POST_VISIBILITY_PUBLIC_CTV | POST_VISIBILITY_PUBLIC_CANDIDATE;

export function toggleVisibilityMask(mask, bit, on) {
  const m = Number(mask) || 0;
  const b = Number(bit);
  if (on) return m | b;
  return m & ~b;
}

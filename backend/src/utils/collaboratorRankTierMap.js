/**
 * Hệ rank CŨ: `rank_levels.id` 1–26 — mỗi level có `percent` = 24 + id (25% … 50%).
 * Hệ rank MỚI: 4 mức id 1–4 — Silver 25%, Gold 30%, Platinum 40%, Diamond 50%.
 *
 * `collaborators.rank_level_id` trỏ tới `rank_levels.id`. Sau migration 4-tier,
 * chỉ còn id 1–4 với tên/percent mới; logic map dưới đây khớp với
 * `schema/migrations/20260407_rank_levels_four_tiers.sql` (map theo % rank cũ).
 */

export const TIER_IDS = {
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
  DIAMOND: 4,
};

/** @param {number|null|undefined} legacyRankLevelId id cũ 1–26 */
export function legacyRankLevelPercent(legacyRankLevelId) {
  if (legacyRankLevelId == null) return null;
  const n = Number(legacyRankLevelId);
  if (!Number.isFinite(n) || n < 1 || n > 26) return null;
  return 24 + n;
}

/**
 * Map id rank cũ (1–26) → id tier mới (1–4), cùng quy tắc với SQL migration.
 * @param {number|null|undefined} legacyRankLevelId
 * @returns {1|2|3|4|null}
 */
export function mapLegacyRankLevelIdToTierId(legacyRankLevelId) {
  const p = legacyRankLevelPercent(legacyRankLevelId);
  if (p == null) return null;
  if (p <= 27) return TIER_IDS.SILVER;
  if (p <= 35) return TIER_IDS.GOLD;
  if (p <= 45) return TIER_IDS.PLATINUM;
  return TIER_IDS.DIAMOND;
}

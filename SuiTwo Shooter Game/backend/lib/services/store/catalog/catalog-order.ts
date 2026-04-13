// ==========================================
// Catalog display order (game + admin)
// Single source of truth for the order items appear in store/admin.
// ==========================================

/** Canonical order of catalog item IDs for display (store, admin, etc.). */
export const CATALOG_ITEM_ORDER: readonly string[] = [
  'extra_lives',
  'force_field',
  'orb_level',
  'coin_tractor_beam',
  'slow_time',
  'destroy_all',
  'boss_kill_shot',
] as const;

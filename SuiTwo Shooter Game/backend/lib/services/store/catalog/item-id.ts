// ==========================================
// Provision item ID helpers
// Canonicalize provision item IDs to dynamic snake_case keys.
// ==========================================

const ITEM_TYPE_BY_DYNAMIC: Record<string, number> = {
  extra_lives: 0,
  force_field: 1,
  orb_level: 2,
  slow_time: 3,
  destroy_all: 4,
  boss_kill_shot: 5,
  coin_tractor_beam: 6,
};

function normalizeRaw(rawId: string): string {
  return rawId
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_+/, '')
    .toLowerCase();
}

export function toDynamicProvisionKey(rawId: string): string {
  return normalizeRaw(rawId);
}

export function resolveProvisionItemType(rawId: string): number | undefined {
  const dynamic = toDynamicProvisionKey(rawId);
  return ITEM_TYPE_BY_DYNAMIC[dynamic];
}

export function isStartProvisionItem(rawId: string): boolean {
  const dynamic = toDynamicProvisionKey(rawId);
  return dynamic === 'orb_level' || dynamic === 'extra_lives' || dynamic === 'force_field';
}

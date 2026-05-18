/**
 * Provision inventory row shape (matches game backend admin-inventory-item.ts).
 * Leveled SKUs: { itemId, level, quantity }. Non-leveled: { itemId, quantity } only.
 */

const LEVELED_PROVISION_IDS = new Set([
  'extra_lives',
  'force_field',
  'orb_level',
  'slow_time',
  'coin_tractor_beam',
]);

function normalizeId(raw) {
  return String(raw || '')
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_+/, '')
    .toLowerCase();
}

export function isLeveledProvisionItem(itemId) {
  return LEVELED_PROVISION_IDS.has(normalizeId(itemId));
}

/** Omit `level` for non-leveled items (and keep it for `random` placeholder). */
export function serializeProvisionItem(item) {
  const key = normalizeId(item.itemId);
  if (key === 'random' || isLeveledProvisionItem(item.itemId)) {
    return item;
  }
  const { level: _level, ...rest } = item;
  return rest;
}

export function rewardItemForProvision(itemId, quantity, level) {
  return serializeProvisionItem({
    itemId,
    quantity,
    ...(level != null ? { level } : {}),
  });
}

if (typeof window !== 'undefined') {
  window.ProvisionInventoryItem = {
    isLeveledProvisionItem,
    serializeProvisionItem,
    rewardItemForProvision,
  };
}

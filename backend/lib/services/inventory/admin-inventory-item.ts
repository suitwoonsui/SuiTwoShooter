// Admin inventory item shape: leveled SKUs include `level`; non-leveled omit it.
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

const LEVELED_PROVISION_KEYS = new Set([
  'extra_lives',
  'force_field',
  'orb_level',
  'slow_time',
  'coin_tractor_beam',
]);

/** Inventory / reward row: leveled SKUs include `level`; non-leveled omit it. */
export type AdminInventoryItemInput = {
  itemId: string;
  quantity: number;
  level?: number;
};

/** @deprecated Alias — same shape as {@link AdminInventoryItemInput}. */
export type ProvisionInventoryItem = AdminInventoryItemInput;

export function isLeveledProvisionItem(itemId: string): boolean {
  return LEVELED_PROVISION_KEYS.has(toDynamicProvisionKey(itemId));
}

/** Reservoir / UI row key (e.g. extra_lives_2 vs destroy_all). */
export function inventoryRowKey(itemId: string, level?: number): string {
  const id = toDynamicProvisionKey(itemId);
  return level != null && level > 0 ? `${id}_${level}` : id;
}

export function parseInventoryRowKey(key: string): { itemId: string; level?: number } {
  const m = /^(.+)_([0-9]+)$/.exec(key);
  if (m) {
    const itemId = m[1];
    const level = parseInt(m[2], 10);
    if (!isLeveledProvisionItem(itemId)) {
      return { itemId: key };
    }
    return { itemId, level };
  }
  return { itemId: key };
}

/** Strip `level` from non-leveled items before sending to admin APIs. */
export function serializeAdminInventoryItem(item: AdminInventoryItemInput): AdminInventoryItemInput {
  const key = toDynamicProvisionKey(item.itemId);
  if (key === 'random' || isLeveledProvisionItem(item.itemId)) {
    return item;
  }
  const { level: _level, ...rest } = item;
  return rest;
}

export function rewardItemForProvision(
  itemId: string,
  quantity: number,
  level?: number,
): AdminInventoryItemInput {
  return serializeAdminInventoryItem({ itemId, quantity, ...(level != null ? { level } : {}) });
}

export function validateAdminInventoryItem(item: AdminInventoryItemInput): void {
  if (!item.itemId?.trim()) {
    throw new Error('Each item must have itemId and quantity.');
  }
  if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
    throw new Error('Quantity must be greater than 0.');
  }
  const key = toDynamicProvisionKey(item.itemId);
  if (key === 'random') {
    if (item.level == null || !Number.isFinite(Number(item.level)) || Number(item.level) < 1) {
      throw new Error('level is required for random reward placeholder.');
    }
    return;
  }
  if (isLeveledProvisionItem(item.itemId)) {
    if (item.level == null || !Number.isFinite(Number(item.level)) || Number(item.level) < 1) {
      throw new Error(`level is required for leveled item "${item.itemId}".`);
    }
    return;
  }
  if (item.level != null) {
    throw new Error(`level must not be set for non-leveled item "${item.itemId}".`);
  }
}

/** Platform TerminalService still resolves single-level items with level 1 internally. */
export function normalizeAdminInventoryItemForPlatform(
  item: AdminInventoryItemInput,
): { itemId: string; level: number; quantity: number } {
  validateAdminInventoryItem(item);
  if (isLeveledProvisionItem(item.itemId)) {
    return { itemId: item.itemId, level: Number(item.level), quantity: Number(item.quantity) };
  }
  return { itemId: item.itemId, level: 1, quantity: Number(item.quantity) };
}

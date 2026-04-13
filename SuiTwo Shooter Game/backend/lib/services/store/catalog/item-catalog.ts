// Compatibility export surface expected by legacy API routes.
export type { StoreItem, ItemLevel, ProvisionsCatalog } from '@/lib/services/store/catalog/provisions';
export { CATALOG_ITEM_ORDER } from '@/lib/services/store/catalog/catalog-order';

// Legacy constant name used by older store routes.
// This is only a seed/default catalog; live catalog is platform-backed.
export { DEFAULT_PROVISIONS_SEED as ITEM_CATALOG, calculateTotalUSD, getItemPrice } from '@/lib/services/store/catalog/provisions';

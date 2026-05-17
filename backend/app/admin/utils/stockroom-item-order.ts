import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

const STANDALONE_ITEM_KEYS = new Set(['credits', 'tickets']);

function itemKeyFromOfferId(rawOfferId: string): string | null {
  const s = String(rawOfferId || '').trim();
  if (!s) return null;
  const base = s.replace(/:l\d+$/, '');
  const key = toDynamicProvisionKey(base);
  if (!key) return null;
  if (STANDALONE_ITEM_KEYS.has(key)) return null;
  return key;
}

export function deriveItemOrderFromOfferOrder(offerOrder: unknown): string[] | null {
  if (!Array.isArray(offerOrder) || offerOrder.length === 0) return null;
  const seen = new Set<string>();
  const derived: string[] = [];
  for (const raw of offerOrder) {
    const key = itemKeyFromOfferId(String(raw ?? ''));
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      derived.push(key);
    }
  }
  return derived.length ? derived : null;
}

export type SortableItem = { id: string };

export function sortItemsByStockroomOrder<T extends SortableItem>(items: T[], orderKeys: string[] | null): T[] {
  const base = [...items];
  const order = Array.isArray(orderKeys) && orderKeys.length ? orderKeys : null;
  if (!order) {
    base.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return base;
  }
  const idx = new Map<string, number>();
  order.forEach((k, i) => {
    if (!idx.has(k)) idx.set(k, i);
  });
  base.sort((a, b) => {
    const ai = idx.get(toDynamicProvisionKey(String(a.id))) ?? Number.POSITIVE_INFINITY;
    const bi = idx.get(toDynamicProvisionKey(String(b.id))) ?? Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return String(a.id).localeCompare(String(b.id));
  });
  return base;
}


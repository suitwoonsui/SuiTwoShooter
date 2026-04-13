// ==========================================
// Stockroom sell prices (game checkout totals)
// Intended flow: Provisions (definitions) → Stockroom (prices / bundles) → Terminal (API surface).
// Store listing uses GET api/terminal/store-catalog (merged). This module hits GET api/stockroom/offers
// for cart totals so purchase does not double-fetch the full merged catalog.
// ==========================================

import { callPlatformBackend } from '@/lib/services/platform/client/platform-client';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

/** Raw Stockroom offers map from `GET api/stockroom/offers` (for callers that batch-read once). */
export async function fetchStockroomOffersMap(): Promise<{
  success: boolean;
  offers?: Record<string, Record<string, unknown>>;
  error?: string;
}> {
  return callPlatformBackend<{
    success: boolean;
    offers?: Record<string, Record<string, unknown>>;
    error?: string;
  }>('api/stockroom/offers', { method: 'GET' });
}

function offerUsdCents(offer: Record<string, unknown> | undefined): number | null {
  if (!offer) return null;
  const raw = offer.priceUsdCents ?? offer.price_usd_cents;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function resolveStockroomOfferId(
  offers: Record<string, Record<string, unknown>>,
  itemId: string,
  level: number
): string | null {
  // 1) Direct offer id (used by bundle offers and standalone sku ids like credits/tickets)
  if (offers[itemId]) return itemId;
  // 2) Canonical leveled provisions key
  const canonicalLeveled = `${toDynamicProvisionKey(itemId)}:l${level}`;
  if (offers[canonicalLeveled]) return canonicalLeveled;
  // 3) Raw leveled key fallback
  const rawLeveled = `${itemId}:l${level}`;
  if (offers[rawLeveled]) return rawLeveled;
  return null;
}

/** USD sell price for one item level from a Stockroom offer map (`GET api/stockroom/offers`), or null if SKU missing. */
export function getStockroomUsdPriceForLevel(
  offers: Record<string, Record<string, unknown>>,
  itemId: string,
  level: number
): number | null {
  const key = resolveStockroomOfferId(offers, itemId, level);
  if (!key) return null;
  const cents = offerUsdCents(offers[key]);
  if (cents === null) return null;
  return cents / 100;
}

/** Cart total in USD when frontend supplies Stockroom offerIds directly. */
export async function calculateTotalUSDFromStockroomOffers(
  lines: Array<{ offerId: string; redeemCount: number }>
): Promise<{ success: boolean; totalUSD?: number; error?: string }> {
  const response = await callPlatformBackend<{
    success: boolean;
    offers?: Record<string, Record<string, unknown>>;
    error?: string;
  }>('api/stockroom/offers', { method: 'GET' });

  if (!response.success || !response.offers) {
    return {
      success: false,
      error: response.error || 'Failed to load Stockroom prices.',
    };
  }

  const { offers } = response;
  let totalUSD = 0;

  for (const line of lines) {
    const offerId = String(line?.offerId ?? '').trim();
    const redeemCount = typeof line?.redeemCount === 'number' ? line.redeemCount : Number(line?.redeemCount ?? 0);
    const qty = Number.isFinite(redeemCount) ? Math.max(1, Math.min(100, Math.floor(redeemCount))) : 0;
    if (!offerId) return { success: false, error: 'Cart line missing offerId' };
    if (qty < 1) return { success: false, error: `Invalid redeemCount for offer ${offerId}` };

    const cents = offerUsdCents(offers[offerId]);
    if (cents === null) {
      return {
        success: false,
        error: `No Stockroom price for offer "${offerId}". Ensure the offer exists and is priced in Stockroom.`,
      };
    }
    if (cents < 0) return { success: false, error: `Invalid Stockroom price for "${offerId}"` };
    totalUSD += (cents / 100) * qty;
  }

  return { success: true, totalUSD };
}

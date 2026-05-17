import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformSetStockroomOffer } from '@/lib/services/platform/app-config/platform-app-config';
import { getProvisions } from '@/lib/services/store/catalog/provisions';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';
import { notifyPublicStoreCatalogChanged } from '@/lib/cache/public-nonuser-data-cache';

type BundleItem = {
  itemId: string;
  level?: number;
  quantity: number;
};

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = await getRequestBody<{
    adminWalletAddress?: string;
    bundleId: string;
    bundleName: string;
    bundleDescription?: string;
    priceUsdCents: number;
    items: BundleItem[];
    /** Bundle vs sum-of-components discount, 0–100. Stored in offer `additionalData.discountPct` for storefront display. */
    bundleDiscountPct?: number;
    /** When false, bundle is saved inactive (purchase disabled). Default true. */
    active?: boolean;
  }>(request);

  if (!hasApiKey) {
    const adminWallet = getAdminWalletService();
    const expected = adminWallet.getAddress().toLowerCase();
    const provided = body.adminWalletAddress?.toLowerCase();
    if (!provided || provided !== expected) {
      throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
    }
  }

  if (!body.bundleId || !body.bundleId.trim()) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'bundleId is required.');
  }
  if (!body.bundleName || !body.bundleName.trim()) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'bundleName is required.');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'items must contain at least one bundle item.');
  }
  if (typeof body.priceUsdCents !== 'number' || body.priceUsdCents < 0) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'priceUsdCents must be a non-negative number.');
  }

  const normalizedItems = body.items
    .filter((i) => i?.itemId && i.itemId.trim())
    .map((i) => ({
      itemId: i.itemId.trim(),
      level: typeof i.level === 'number' && Number.isFinite(i.level) ? Math.max(0, Math.floor(i.level)) : 0,
      quantity: Math.max(1, Math.floor(Number(i.quantity || 1))),
    }));

  if (normalizedItems.length === 0) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'No valid bundle items found.');
  }

  // Merge duplicates to keep bundle payload canonical.
  const mergedItemsMap = new Map<string, { itemId: string; level: number; quantity: number }>();
  for (const item of normalizedItems) {
    const key = `${item.itemId}::${item.level}`;
    const prev = mergedItemsMap.get(key);
    mergedItemsMap.set(key, {
      itemId: item.itemId,
      level: item.level,
      quantity: (prev?.quantity ?? 0) + item.quantity,
    });
  }
  const mergedItems = Array.from(mergedItemsMap.values());

  // Validate that all bundle items already exist in Provisions catalog.
  const provisions = await getProvisions();
  const missingItems = mergedItems
    .map((i) => i.itemId)
    .filter((itemId) => !provisions[itemId]);
  if (missingItems.length > 0) {
    throw new PlatformError(
      PlatformErrorCode.INVALID_INPUT,
      `Bundle contains item(s) not found in Provisions: ${missingItems.join(', ')}. Initialize/create those items first.`
    );
  }

  const bundleLines = mergedItems.map((i) => ({
    balanceKey: i.level > 0 ? `${toDynamicProvisionKey(i.itemId)}:l${i.level}` : toDynamicProvisionKey(i.itemId),
    amount: i.quantity,
  }));

  const active = body.active === undefined || body.active === null ? true : Boolean(body.active);

  const additionalPayload: Record<string, unknown> = {
    name: body.bundleName.trim(),
    kind: 'item_bundle',
    bundleItems: mergedItems,
  };
  if (typeof body.bundleDiscountPct === 'number' && Number.isFinite(body.bundleDiscountPct)) {
    additionalPayload.discountPct = Math.max(0, Math.min(100, Math.round(body.bundleDiscountPct)));
  }

  const result = await platformSetStockroomOffer({
    offerId: body.bundleId.trim(),
    offerType: 1,
    amount: 1,
    priceUsdCents: Math.round(body.priceUsdCents),
    description: body.bundleDescription?.trim() || body.bundleName.trim(),
    additionalData: JSON.stringify(additionalPayload),
    maxSupply: 0,
    provisionItemKey: '',
    active,
    bundleLines,
  });

  if (!result.success) {
    throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to set bundle offer.');
  }

  await notifyPublicStoreCatalogChanged({ reason: 'stockroom:bundle-offer' });

  return {
    success: true,
    message: `Bundle offer "${body.bundleName}" saved.`,
    digest: result.digest,
  };
});


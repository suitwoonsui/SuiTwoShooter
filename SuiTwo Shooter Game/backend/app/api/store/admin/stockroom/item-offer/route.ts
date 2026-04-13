import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformSetStockroomItemListing } from '@/lib/services/platform/app-config/platform-app-config';
import { getProvisions } from '@/lib/services/store/catalog/provisions';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = await getRequestBody<{
    adminWalletAddress?: string;
    itemId: string;
    level?: number;
    priceUsdCents: number;
    amount?: number;
    name?: string;
    description?: string;
    balanceKey?: string;
  }>(request);

  if (!hasApiKey) {
    const adminWallet = getAdminWalletService();
    const expected = adminWallet.getAddress().toLowerCase();
    const provided = body.adminWalletAddress?.toLowerCase();
    if (!provided || provided !== expected) {
      throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
    }
  }

  if (!body.itemId || !body.itemId.trim()) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'itemId is required.');
  }
  /**
   * Stockroom listing level:
   * - For standalone items like credits/tickets (no Provisions levels), omit `level` to write the **base** listing (level=0 in API; encoded as None on-chain).
   * - For per-level items, pass `level` explicitly (>=1).
   */
  const rawLevel = body.level;
  if (typeof body.priceUsdCents !== 'number' || body.priceUsdCents < 0) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'priceUsdCents must be a non-negative number.');
  }
  const amount = typeof body.amount === 'number' && body.amount > 0 ? Math.floor(body.amount) : 1;
  const itemId = body.itemId.trim();
  const dynamicKey = toDynamicProvisionKey(itemId);

  // Enforce that Stockroom listings can only be created for items that exist in Provisions.
  // This prevents accidental creation of balance keys like `orb:l1` when the real item id is `orb_level`.
  const provisions = await getProvisions();
  if (!provisions || typeof provisions !== 'object' || !provisions[dynamicKey]) {
    throw new PlatformError(
      PlatformErrorCode.INVALID_INPUT,
      `Unknown itemId "${itemId}". Initialize Provisions first (expected provision id: "${dynamicKey}").`
    );
  }
  const level =
    typeof rawLevel === 'number' && Number.isFinite(rawLevel)
      ? Math.max(0, Math.floor(rawLevel))
      : dynamicKey === 'credits' || dynamicKey === 'tickets'
        ? undefined
        : 1;
  const balanceKeyFromBody = typeof body.balanceKey === 'string' ? body.balanceKey.trim() : '';
  const balanceKey =
    balanceKeyFromBody ||
    (dynamicKey === 'credits'
      ? 'credits'
      : level === undefined
        ? dynamicKey
        : `${dynamicKey}:l${level}`);

  const result = await platformSetStockroomItemListing({
    itemKey: dynamicKey,
    ...(level !== undefined ? { level } : {}),
    priceUsdCents: Math.round(body.priceUsdCents),
    description: body.description || (level === undefined ? `${itemId}` : `${itemId} (L${level})`),
    balanceKey,
    creditAmount: amount,
    maxSupply: 0,
    active: true,
    additionalData: JSON.stringify({ name: body.name || itemId, ...(level !== undefined ? { level } : {}), rawItemId: itemId }),
  });

  if (!result.success) {
    throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to set stockroom offer.');
  }

  return {
    success: true,
    message: level === undefined
      ? `Item listing updated for "${itemId}" (base / no level).`
      : `Item listing updated for "${itemId}" level ${level}.`,
    digest: result.digest,
  };
});


import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformRemoveStockroomItemListing } from '@/lib/services/platform/app-config/platform-app-config';
import { notifyPublicStoreCatalogChanged } from '@/lib/cache/public-nonuser-data-cache';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = await getRequestBody<{
    adminWalletAddress?: string;
    itemKey: string;
    /** Optional: omit for base (no-level) listing. */
    level?: number;
  }>(request);

  if (!hasApiKey) {
    const adminWallet = getAdminWalletService();
    const expected = adminWallet.getAddress().toLowerCase();
    const provided = body.adminWalletAddress?.toLowerCase();
    if (!provided || provided !== expected) {
      throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
    }
  }

  if (!body.itemKey?.trim()) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'itemKey is required.');
  }
  const level =
    typeof body.level === 'number' && Number.isFinite(body.level)
      ? Math.max(1, Math.floor(body.level))
      : undefined;

  const result = await platformRemoveStockroomItemListing({
    itemKey: body.itemKey.trim(),
    ...(level !== undefined ? { level } : {}),
  });

  if (!result.success) {
    throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to remove item listing.');
  }

  await notifyPublicStoreCatalogChanged({ reason: 'stockroom:remove-item-listing' });

  return {
    success: true,
    message:
      level === undefined
        ? `Item listing ${body.itemKey.trim()} (base / no level) removed.`
        : `Item listing ${body.itemKey.trim()} L${level} removed.`,
    digest: result.digest,
  };
});

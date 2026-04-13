import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformSetStockroomItemListingActive } from '@/lib/services/platform/app-config/platform-app-config';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = await getRequestBody<{
    adminWalletAddress?: string;
    itemKey: string;
    level: number;
    active: boolean;
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
  const level = typeof body.level === 'number' ? Math.max(1, Math.floor(body.level)) : 1;
  if (typeof body.active !== 'boolean') {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'active must be a boolean.');
  }

  const result = await platformSetStockroomItemListingActive({
    itemKey: body.itemKey.trim(),
    level,
    active: body.active,
  });

  if (!result.success) {
    throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to set item listing active.');
  }

  return {
    success: true,
    message: `Item listing ${body.itemKey.trim()} L${level} ${body.active ? 'activated' : 'deactivated'}.`,
    digest: result.digest,
  };
});

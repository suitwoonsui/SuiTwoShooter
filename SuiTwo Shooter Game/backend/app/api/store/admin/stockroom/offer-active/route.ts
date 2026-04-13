import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformSetStockroomOfferActive } from '@/lib/services/platform/app-config/platform-app-config';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = await getRequestBody<{
    adminWalletAddress?: string;
    offerId: string;
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

  if (!body.offerId?.trim()) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'offerId is required.');
  }
  if (typeof body.active !== 'boolean') {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'active must be a boolean.');
  }

  const result = await platformSetStockroomOfferActive({
    offerId: body.offerId.trim(),
    active: body.active,
  });

  if (!result.success) {
    throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to set offer active.');
  }

  return {
    success: true,
    message: `Offer "${body.offerId.trim()}" ${body.active ? 'activated' : 'deactivated'}.`,
    digest: result.digest,
  };
});

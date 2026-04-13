import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformRemoveStockroomOffer } from '@/lib/services/platform/app-config/platform-app-config';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = await getRequestBody<{
    adminWalletAddress?: string;
    offerId: string;
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

  const result = await platformRemoveStockroomOffer(body.offerId.trim());

  if (!result.success) {
    throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to remove offer.');
  }

  return {
    success: true,
    message: `Offer "${body.offerId.trim()}" removed from Stockroom.`,
    digest: result.digest,
  };
});

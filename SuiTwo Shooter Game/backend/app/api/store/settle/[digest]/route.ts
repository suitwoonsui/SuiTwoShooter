// ==========================================
// Store Settlement API Route (game backend)
// Proxies to platform backend /api/store/settle/[digest]
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getDigestParam } from '@/lib/api/api-handler';
import { platformStoreClient } from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, context: { params: Promise<{ digest: string }> }) => {
    const digest = await getDigestParam(context.params);

    const gameAdmin = getAdminWalletService();
    const recipient = gameAdmin.getAddress();
    PlatformLogger.info('Settling store purchase (proxying to platform)', { digest, recipient });

    const result = await platformStoreClient.settlePurchase(digest, {
      method: 'POST',
      body: JSON.stringify({ recipient }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!result.success) {
      PlatformLogger.warn('Store settle proxy failed', { digest, error: result.error });
      throw new Error(result.error || 'Failed to settle purchase');
    }

    PlatformLogger.info('Store settle proxy result', {
      digest,
      settled: result.settled,
      settleDigest: result.settleDigest,
      recipient: result.recipient,
      platformAddress: result.platformAddress,
      settlement: result.settlement,
      message: result.message,
    });
    return result;
  }
);


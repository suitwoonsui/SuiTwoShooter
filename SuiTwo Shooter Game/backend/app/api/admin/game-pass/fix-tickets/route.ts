// ==========================================
// Game admin: Fix ticket count (proxies to platform API)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformGamePassClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await getRequestBody<{
    playerAddress: string;
    correctCount: number;
    contract?: 'new' | 'old';
    adminWalletAddress?: string;
    ecosystemId?: string;
  }>(request);
  const expected = getAdminWalletService().getAddress().toLowerCase();
  const provided = body.adminWalletAddress?.toLowerCase();
  if (!provided || provided !== expected) {
    throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
  }
  const result = await platformGamePassClient.fixTickets(
    body.playerAddress,
    body.correctCount,
    body.contract,
    buildPlatformCallOptions(request, body)
  );
  if (!result.success) {
    throw new Error(result.error || 'Failed to fix ticket count');
  }
  return {
    success: true,
    digest: result.digest,
    playerAddress: body.playerAddress,
    correctCount: body.correctCount,
  };
});

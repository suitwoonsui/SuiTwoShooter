// ==========================================
// Game-pass migrate proxy (game admin only)
// GET: list wallets; POST: migrate. Requires X-Admin-Wallet.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { callPlatformBackend, getEcosystemIdFromRequest, getEcosystemIdFromEnv } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function verifyGameAdmin(request: NextRequest): void {
  const h = request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '';
  const expected = getAdminWalletService().getAddress().toLowerCase();
  if (!h || h.toLowerCase() !== expected) {
    throw new Error('Unauthorized. X-Admin-Wallet must match the game admin.');
  }
}

export const GET = withApiHandler(async (request: NextRequest) => {
  verifyGameAdmin(request);
  const { searchParams } = new URL(request.url);
  const ecosystemId = searchParams.get('ecosystemId')?.trim() || getEcosystemIdFromEnv();
  const q = searchParams.toString();
  return callPlatformBackend(`api/game-pass/migrate${q ? `?${q}` : ''}`, {
    method: 'GET',
    ecosystemId,
  });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  verifyGameAdmin(request);
  const body = await getRequestBody<{ playerAddress: string; oldPackageId?: string; oldGamePassSystemId?: string; ecosystemId?: string }>(request);
  const ecosystemId = body.ecosystemId?.trim() || getEcosystemIdFromRequest(request, body) || getEcosystemIdFromEnv();
  return callPlatformBackend('api/game-pass/migrate', {
    method: 'POST',
    body: JSON.stringify(body),
    ecosystemId,
  });
});

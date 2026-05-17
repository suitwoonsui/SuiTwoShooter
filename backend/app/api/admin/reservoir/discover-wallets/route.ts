// ==========================================
// Game-pass: Discover wallets (game admin only). Uses platform Reservoir API.
// Paginated: pass offset/limit to fetch one page of addresses; no full list in memory.
// Requires X-Admin-Wallet header.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformGamePassClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 500;

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const h = request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '';
  const expected = getAdminWalletService().getAddress().toLowerCase();
  if (!h || h.toLowerCase() !== expected) {
    throw new Error('Unauthorized. X-Admin-Wallet must match the game admin.');
  }

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );

  const result = await platformGamePassClient.listPlayers({
    ...buildPlatformCallOptions(request),
    offset,
    limit,
  });

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to discover wallets');
  }

  const players = result.players ?? [];
  const wallets = players.map((p) => p.address).filter(Boolean);
  const totalCount = result.totalCount ?? 0;

  return {
    success: true,
    wallets,
    count: wallets.length,
    totalCount,
  };
});

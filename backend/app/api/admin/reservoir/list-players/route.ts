// ==========================================
// Game-pass: List players (game admin only). Uses platform Reservoir API.
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

  const platformOptions = buildPlatformCallOptions(request);
  const result = await platformGamePassClient.listPlayers({
    ...platformOptions,
    offset,
    limit,
  });

  if (!result.success) {
    return { success: true, players: [], totalCount: result.totalCount ?? 0 };
  }

  const players = (result.players ?? []).map((p) => ({
    address: p.address,
    gamesRemaining: p.gamesRemaining ?? 0,
    isActive: p.isActive ?? false,
    packType: p.packType,
    ticketCount: p.ticketCount,
  }));

  return {
    success: true,
    players,
    totalCount: result.totalCount ?? 0,
  };
});

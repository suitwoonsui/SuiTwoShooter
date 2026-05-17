// ==========================================
// Admin API - Clear (reset) player Wake stats
// ==========================================
// Resets the per-wallet Wake aggregate stats (cumulative + bests) back to zero.
// Requires X-Admin-Wallet header matching the configured game admin wallet.
//
// NOTE: Wake update is idempotent by sessionId; we generate a unique admin sessionId here.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  buildPlatformCallOptions,
  callPlatformBackend,
  invalidatePlayerStatsCacheForAddress,
  platformTxClient,
} from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const h = (request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '').trim();
  const adminWallet = getAdminWalletService();
  const expected = adminWallet.getAddress().toLowerCase();
  if (!h || h.toLowerCase() !== expected) {
    throw new Error('Unauthorized. X-Admin-Wallet must match the game admin.');
  }

  const body = await getRequestBody<{ address: string }>(request);
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  if (!address || !address.startsWith('0x')) {
    throw new Error('address is required and must be a valid 0x address');
  }

  // Clear to the "empty stats" shape the game expects.
  const stats = {
    totalGames: 0,
    bestScore: 0,
    bestDistance: 0,
    bestCoins: 0,
    bestBossesDefeated: 0,
    bestEnemiesDefeated: 0,
    bestCoinStreak: 0,
    totalScore: 0,
    totalDistance: 0,
    totalCoins: 0,
    totalBossesDefeated: 0,
    totalEnemiesDefeated: 0,
    totalCoinStreak: 0,
    firstGameDate: 0,
    lastGameDate: 0,
  };

  const sessionId = `admin_clear_stats_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const platformOptions = buildPlatformCallOptions(request, undefined, {
    // Hydroscope update builds a tx that must be signed by the CorridorCap owner / gas payer.
    senderAddress: adminWallet.getAddress(),
  });

  const res = await callPlatformBackend<{
    success: boolean;
    updated?: boolean;
    transactionBytesBase64?: string;
    error?: string;
  }>('api/hydroscope/update', {
    method: 'POST',
    body: JSON.stringify({
      address,
      stats,
      sessionId,
      senderAddress: adminWallet.getAddress(),
      // Critical: totals/bests normally use OP_ADD/OP_MAX; force OP_SET so we can reset them to 0.
      forceSetAllStats: true,
    }),
    ...platformOptions,
  });

  if (!res?.success) {
    return {
      success: false,
      error: res?.error || 'Failed to clear player stats on platform',
    };
  }

  // If platform returned a build-only tx, sign and execute it now (same pattern as /api/scores/submit).
  if (res.transactionBytesBase64) {
    const signed = await adminWallet
      .getKeypair()
      .signTransaction(Buffer.from(res.transactionBytesBase64, 'base64'));
    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64: res.transactionBytesBase64, signature: signed.signature },
      platformOptions
    );
    if (!execRes.success) {
      return {
        success: false,
        error: execRes.error || 'Failed to execute clear-stats transaction',
      };
    }
  }

  // Clear local cache so /api/stats reads are fresh.
  invalidatePlayerStatsCacheForAddress(address);

  // Verify by reading stats back from platform (Wake aggregate).
  const verify = await callPlatformBackend<{ success: boolean; stats?: Record<string, unknown>; error?: string }>(
    `api/hydroscope/${encodeURIComponent(address)}`,
    { method: 'GET', ...platformOptions }
  ).catch(() => null);

  return {
    success: true,
    address,
    updated: res.updated ?? true,
    sessionId,
    message: 'Player stats reset to 0.',
    verify: verify && verify.success ? verify.stats : undefined,
  };
});


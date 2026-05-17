// ==========================================
// Admin API — Rebuild player Wake stats from on-chain game rows
// ==========================================
// Fetches `GameResultSubmitted` events for the wallet (platform game-results),
// aggregates totals / bests / first-last dates, then writes via Hydroscope
// with `forceSetAllStats` (same reset semantics as clear-player).
// Requires X-Admin-Wallet matching the configured game admin wallet.
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

type GameResultRow = {
  score?: number;
  distance?: number;
  coins?: number;
  bossesDefeated?: number;
  enemiesDefeated?: number;
  longestCoinStreak?: number;
  timestamp?: number;
  playerName?: string;
};

function toNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function aggregateFromGameRows(rows: GameResultRow[]): {
  stats: Record<string, number | string>;
  reconcileTruncated: boolean;
  gameRowsUsed: number;
  reconcile?: { scannedEvents?: number; pages?: number; note?: string };
} {
  if (!rows.length) {
    return {
      stats: {
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
      },
      reconcileTruncated: false,
      gameRowsUsed: 0,
    };
  }

  let totalScore = 0;
  let totalDistance = 0;
  let totalCoins = 0;
  let totalBossesDefeated = 0;
  let totalEnemiesDefeated = 0;
  let totalCoinStreak = 0;
  let bestScore = 0;
  let bestDistance = 0;
  let bestCoins = 0;
  let bestBossesDefeated = 0;
  let bestEnemiesDefeated = 0;
  let bestCoinStreak = 0;
  let firstGameDate = Number.POSITIVE_INFINITY;
  let lastGameDate = 0;
  let latestName = '';
  let latestTs = -1;

  for (const r of rows) {
    const score = toNum(r.score);
    const distance = toNum(r.distance);
    const coins = toNum(r.coins);
    const bossesDefeated = toNum(r.bossesDefeated);
    const enemiesDefeated = toNum(r.enemiesDefeated);
    const longestCoinStreak = toNum(r.longestCoinStreak);
    const ts = toNum(r.timestamp);

    totalScore += score;
    totalDistance += distance;
    totalCoins += coins;
    totalBossesDefeated += bossesDefeated;
    totalEnemiesDefeated += enemiesDefeated;
    totalCoinStreak += longestCoinStreak;

    bestScore = Math.max(bestScore, score);
    bestDistance = Math.max(bestDistance, distance);
    bestCoins = Math.max(bestCoins, coins);
    bestBossesDefeated = Math.max(bestBossesDefeated, bossesDefeated);
    bestEnemiesDefeated = Math.max(bestEnemiesDefeated, enemiesDefeated);
    bestCoinStreak = Math.max(bestCoinStreak, longestCoinStreak);

    if (ts > 0) {
      firstGameDate = Math.min(firstGameDate, ts);
      lastGameDate = Math.max(lastGameDate, ts);
      if (ts >= latestTs) {
        latestTs = ts;
        const nm = typeof r.playerName === 'string' ? r.playerName.trim() : '';
        if (nm) latestName = nm;
      }
    }
  }

  const stats: Record<string, number | string> = {
    totalGames: rows.length,
    bestScore,
    bestDistance,
    bestCoins,
    bestBossesDefeated,
    bestEnemiesDefeated,
    bestCoinStreak,
    totalScore,
    totalDistance,
    totalCoins,
    totalBossesDefeated,
    totalEnemiesDefeated,
    totalCoinStreak,
    firstGameDate: Number.isFinite(firstGameDate) ? firstGameDate : 0,
    lastGameDate,
  };
  if (latestName) stats.playerName = latestName;

  return {
    stats,
    reconcileTruncated: false,
    gameRowsUsed: rows.length,
  };
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const h = (request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '').trim();
  const adminWallet = getAdminWalletService();
  const expected = adminWallet.getAddress().toLowerCase();
  if (!h || h.toLowerCase() !== expected) {
    throw new Error('Unauthorized. X-Admin-Wallet must match the game admin.');
  }

  const body = await getRequestBody<{ address: string; maxPages?: number }>(request);
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  if (!address || !address.startsWith('0x')) {
    throw new Error('address is required and must be a valid 0x address');
  }

  const maxPagesRaw = body?.maxPages;
  const maxPages =
    typeof maxPagesRaw === 'number' && Number.isFinite(maxPagesRaw)
      ? Math.min(Math.max(Math.floor(maxPagesRaw), 1), 100)
      : 80;

  const platformOptions = buildPlatformCallOptions(request, undefined, {
    senderAddress: adminWallet.getAddress(),
  });

  const qs = new URLSearchParams();
  qs.set('player', address);
  qs.set('limit', '200');
  qs.set('maxPages', String(maxPages));

  const gr = await callPlatformBackend<{
    success?: boolean;
    leaderboard?: GameResultRow[];
    reconcile?: { scannedEvents?: number; pages?: number; truncated?: boolean; note?: string };
    error?: string;
  }>(`api/hydroscope/game-results?${qs.toString()}`, {
    method: 'GET',
    ...platformOptions,
  });

  if (!gr || gr.success === false) {
    return {
      success: false,
      error: gr?.error || 'Failed to load game results from platform',
    };
  }

  const rows = Array.isArray(gr.leaderboard) ? gr.leaderboard : [];
  const reconcileTruncated = Boolean(gr.reconcile?.truncated);
  const aggregated = aggregateFromGameRows(rows);
  aggregated.reconcileTruncated = reconcileTruncated;
  aggregated.reconcile = {
    scannedEvents: gr.reconcile?.scannedEvents,
    pages: gr.reconcile?.pages,
    ...(reconcileTruncated && gr.reconcile?.note ? { note: gr.reconcile.note } : {}),
  };

  const sessionId = `admin_fix_stats_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const res = await callPlatformBackend<{
    success: boolean;
    updated?: boolean;
    transactionBytesBase64?: string;
    error?: string;
  }>('api/hydroscope/update', {
    method: 'POST',
    body: JSON.stringify({
      address,
      stats: aggregated.stats,
      sessionId,
      senderAddress: adminWallet.getAddress(),
      forceSetAllStats: true,
    }),
    ...platformOptions,
  });

  if (!res?.success) {
    return {
      success: false,
      error: res?.error || 'Failed to write rebuilt stats on platform',
      reconcile: aggregated.reconcile,
      reconcileTruncated,
      gameRowsUsed: aggregated.gameRowsUsed,
    };
  }

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
        error: execRes.error || 'Failed to execute fix-stats transaction',
        reconcile: aggregated.reconcile,
        reconcileTruncated,
        gameRowsUsed: aggregated.gameRowsUsed,
      };
    }
  }

  invalidatePlayerStatsCacheForAddress(address);

  const verify = await callPlatformBackend<{ success: boolean; stats?: Record<string, unknown>; error?: string }>(
    `api/hydroscope/${encodeURIComponent(address)}`,
    { method: 'GET', ...platformOptions }
  ).catch(() => null);

  return {
    success: true,
    address,
    updated: res.updated ?? true,
    sessionId,
    message: reconcileTruncated
      ? 'Stats rebuilt from scanned game events. Scan hit maxPages — older games may be missing; totals may be incomplete.'
      : 'Stats rebuilt from on-chain game results.',
    statsWritten: aggregated.stats,
    gameRowsUsed: aggregated.gameRowsUsed,
    reconcileTruncated,
    reconcile: aggregated.reconcile,
    verify: verify && verify.success ? verify.stats : undefined,
  };
});

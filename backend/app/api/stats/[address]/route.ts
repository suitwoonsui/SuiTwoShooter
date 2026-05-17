// ==========================================
// Stats API Route
// Platform only; no legacy chain path. Fail clearly when platform is missing or platform call fails.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import {
  platformGameScoreClient,
  platformStatsClient,
  callPlatformBackend,
  buildPlatformCallOptions,
  invalidatePlayerStatsCacheForAddress,
} from '@/lib/services/platform/client/platform-client';

// Handle CORS preflight
export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/stats/[address]
 * Stats via platform only. Requires PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID.
 */
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);
    const reqId =
      request.headers.get('x-request-id') ||
      request.headers.get('X-Request-Id') ||
      request.headers.get('x-correlation-id') ||
      null;
    const addrShort = address && address.startsWith('0x') ? `${address.slice(0, 10)}…${address.slice(-6)}` : address;

    const reservedKeywords = ['overview', 'status'];
    if (reservedKeywords.includes(address.toLowerCase())) {
      throw new Error(`Invalid address: "${address}" is a reserved keyword. Use /api/stats/${address} instead.`);
    }

    const refresh = request.nextUrl.searchParams.has('_refresh');
    if (refresh) {
      invalidatePlayerStatsCacheForAddress(address);
    }

    const platformOptions = buildPlatformCallOptions(request, undefined);
    const reconcileFromEvents = request.nextUrl.searchParams.get('_reconcile') === 'events';
    PlatformLogger.info('[STATS API] request', {
      requestId: reqId ?? undefined,
      address: addrShort,
      refresh,
      reconcileFromEvents,
    });
    const chainData = await platformGameScoreClient.getPlayerStats(address, platformOptions);
    if (chainData.success && (chainData.totalGames != null || chainData.bestScore != null)) {
      PlatformLogger.debug('Stats from platform (chain)', { address });

      // Wake aggregate stats are the canonical cumulative values.
      // The Wake events feed is a separate append-only stream and should only be used for reconciliation/debugging.
      if (!reconcileFromEvents) {
        PlatformLogger.info('[STATS API] resolved (wake aggregate)', {
          requestId: reqId ?? undefined,
          address: addrShort,
          totalGames: chainData.totalGames ?? 0,
          totals: {
            totalScore: chainData.totalScore ?? 0,
            totalDistance: chainData.totalDistance ?? 0,
            totalCoins: chainData.totalCoins ?? 0,
            totalBossesDefeated: chainData.totalBossesDefeated ?? 0,
            totalEnemiesDefeated: chainData.totalEnemiesDefeated ?? 0,
            totalCoinStreak: chainData.totalCoinStreak ?? 0,
          },
        });
        return {
          success: true,
          hasStats: chainData.hasStats ?? false,
          totalGames: chainData.totalGames ?? 0,
          bestScore: chainData.bestScore ?? 0,
          bestDistance: chainData.bestDistance ?? 0,
          bestCoins: chainData.bestCoins ?? 0,
          bestBossesDefeated: chainData.bestBossesDefeated ?? 0,
          bestEnemiesDefeated: chainData.bestEnemiesDefeated ?? 0,
          bestCoinStreak: chainData.bestCoinStreak ?? 0,
          totalScore: chainData.totalScore ?? 0,
          totalDistance: chainData.totalDistance ?? 0,
          totalCoins: chainData.totalCoins ?? 0,
          totalBossesDefeated: chainData.totalBossesDefeated ?? 0,
          totalEnemiesDefeated: chainData.totalEnemiesDefeated ?? 0,
          totalCoinStreak: chainData.totalCoinStreak ?? 0,
          firstGameDate: chainData.firstGameDate ?? 0,
          lastGameDate: chainData.lastGameDate ?? 0,
          totalsSource: 'wake_aggregate',
        };
      }

      // Debug reconciliation mode: derive totals from wake events and return them alongside a note.
      let derived:
        | (Awaited<ReturnType<typeof buildDerivedFromGameResults>> & { ok: true })
        | { ok: false; reason: string } = { ok: false, reason: 'not-attempted' };
      try {
        derived = await buildDerivedFromGameResults(address, chainData.totalGames ?? 0, platformOptions);
      } catch (e) {
        derived = { ok: false, reason: e instanceof Error ? e.message : String(e) };
      }
      PlatformLogger.info('[STATS API] resolved (reconcile=events)', {
        requestId: reqId ?? undefined,
        address: addrShort,
        totalGames: chainData.totalGames ?? 0,
        eventsOk: derived.ok,
        note: derived.ok ? derived.note : derived.reason,
        gamesUsed: derived.ok ? derived.gamesUsed : undefined,
      });
      return {
        success: true,
        hasStats: chainData.hasStats ?? false,
        totalGames: chainData.totalGames ?? 0,
        bestScore: derived.ok ? derived.bestScore : (chainData.bestScore ?? 0),
        bestDistance: derived.ok ? derived.bestDistance : (chainData.bestDistance ?? 0),
        bestCoins: derived.ok ? derived.bestCoins : (chainData.bestCoins ?? 0),
        bestBossesDefeated: derived.ok ? derived.bestBossesDefeated : (chainData.bestBossesDefeated ?? 0),
        bestEnemiesDefeated: derived.ok ? derived.bestEnemiesDefeated : (chainData.bestEnemiesDefeated ?? 0),
        bestCoinStreak: derived.ok ? derived.bestCoinStreak : (chainData.bestCoinStreak ?? 0),
        totalScore: derived.ok ? derived.totalScore : (chainData.totalScore ?? 0),
        totalDistance: derived.ok ? derived.totalDistance : (chainData.totalDistance ?? 0),
        totalCoins: derived.ok ? derived.totalCoins : (chainData.totalCoins ?? 0),
        totalBossesDefeated: derived.ok ? derived.totalBossesDefeated : (chainData.totalBossesDefeated ?? 0),
        totalEnemiesDefeated: derived.ok ? derived.totalEnemiesDefeated : (chainData.totalEnemiesDefeated ?? 0),
        totalCoinStreak: derived.ok ? derived.totalCoinStreak : (chainData.totalCoinStreak ?? 0),
        firstGameDate: chainData.firstGameDate ?? 0,
        lastGameDate: chainData.lastGameDate ?? 0,
        totalsSource: derived.ok ? derived.source : 'wake_aggregate',
        totalsDerivationError: derived.ok ? derived.note : derived.reason,
        totalsGamesUsed: derived.ok ? derived.gamesUsed : undefined,
      };
    }

    const platformData = await callPlatformBackend<{
      success: boolean;
      hasStats?: boolean;
      totalGames?: number;
      bestScore?: number;
      bestDistance?: number;
      bestCoins?: number;
      bestBossesDefeated?: number;
      bestEnemiesDefeated?: number;
      bestCoinStreak?: number;
      totalScore?: number;
      totalDistance?: number;
      totalCoins?: number;
      totalBossesDefeated?: number;
      totalEnemiesDefeated?: number;
      totalCoinStreak?: number;
      firstGameDate?: number;
      lastGameDate?: number;
    }>(`api/stats/${address}`, { method: 'GET' });

    if (!platformData?.success) {
      throw new PlatformError(
        PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
        (platformData as { error?: string })?.error ?? 'Stats unavailable from platform.'
      );
    }

    PlatformLogger.debug('Stats from platform (stored)', { address });
    return {
      success: true,
      hasStats: platformData.hasStats ?? false,
      totalGames: platformData.totalGames ?? 0,
      bestScore: platformData.bestScore ?? 0,
      bestDistance: platformData.bestDistance ?? 0,
      bestCoins: platformData.bestCoins ?? 0,
      bestBossesDefeated: platformData.bestBossesDefeated ?? 0,
      bestEnemiesDefeated: platformData.bestEnemiesDefeated ?? 0,
      bestCoinStreak: platformData.bestCoinStreak ?? 0,
      totalScore: platformData.totalScore ?? 0,
      totalDistance: platformData.totalDistance ?? 0,
      totalCoins: platformData.totalCoins ?? 0,
      totalBossesDefeated: platformData.totalBossesDefeated ?? 0,
      totalEnemiesDefeated: platformData.totalEnemiesDefeated ?? 0,
      totalCoinStreak: platformData.totalCoinStreak ?? 0,
      firstGameDate: platformData.firstGameDate ?? 0,
      lastGameDate: platformData.lastGameDate ?? 0,
    };
  }
);

// Legacy internal chain path removed — platform only so failures are visible.

async function buildDerivedFromGameResults(
  address: string,
  expectedTotalGames: number,
  platformOptions: Parameters<typeof platformStatsClient.getGameResults>[1]
): Promise<
  | ({
      ok: true;
      /** 'wake_events' when we have enough rows, otherwise 'wake_events_partial'. */
      source: 'wake_events' | 'wake_events_partial';
      /** Count of per-game rows used for aggregation. */
      gamesUsed: number;
      /** Human note (only set for partial derivation). */
      note?: string;
      totalScore: number;
      totalDistance: number;
      totalCoins: number;
      totalBossesDefeated: number;
      totalEnemiesDefeated: number;
      totalCoinStreak: number;
      bestScore: number;
      bestDistance: number;
      bestCoins: number;
      bestBossesDefeated: number;
      bestEnemiesDefeated: number;
      bestCoinStreak: number;
    })
  | { ok: false; reason: string }
> {
  if (!expectedTotalGames || expectedTotalGames <= 0) {
    return { ok: false, reason: 'no-games' };
  }
  if (expectedTotalGames > 200) {
    return { ok: false, reason: 'too-many-games-for-derivation' };
  }

  const res = await platformStatsClient.getGameResults(200, platformOptions);
  if (!res.success || !Array.isArray(res.leaderboard)) {
    return { ok: false, reason: res.error || 'wake-events-unavailable' };
  }

  // Filter to this player only.
  const rows = res.leaderboard.filter(
    (r) => (r.playerAddress || r.walletAddress || '').toLowerCase() === address.toLowerCase()
  );
  if (rows.length <= 0) return { ok: false, reason: 'no-rows-for-player' };

  // Deduplicate by sessionId when present (defensive against retries / duplicates).
  const seenSession = new Set<string>();
  const uniq = rows.filter((r) => {
    const sid = typeof (r as any).sessionId === 'string' ? String((r as any).sessionId) : '';
    if (!sid) return true;
    if (seenSession.has(sid)) return false;
    seenSession.add(sid);
    return true;
  });

  // Use the most recent N rows so we align with totalGames for small accounts.
  // (Wake feed is ordered desc globally, not per-player; but the player’s rows in this slice are still recent.)
  const slice = uniq.slice(0, expectedTotalGames);
  const partial = slice.length !== expectedTotalGames;
  // If we have at least one row, prefer returning partial derived totals over falling back to a possibly-corrupted aggregate.
  if (slice.length === 0) {
    return { ok: false, reason: `insufficient-rows: got 0, expected ${expectedTotalGames}` };
  }
  PlatformLogger.info('[STATS API] derived from wake events', {
    address: address && address.startsWith('0x') ? `${address.slice(0, 10)}…${address.slice(-6)}` : address,
    expectedTotalGames,
    rowsFound: rows.length,
    rowsAfterDedup: uniq.length,
    rowsUsed: slice.length,
    // Session IDs are bytes in the Wake event; keep logs short and avoid dumping raw arrays.
    sample: slice.slice(0, 3).map((r) => ({
      score: Number(r.score) || 0,
      coins: Number(r.coins) || 0,
      enemiesDefeated: Number(r.enemiesDefeated) || 0,
      bossesDefeated: Number(r.bossesDefeated) || 0,
      timestamp: Number(r.timestamp) || 0,
      hasSessionId: (r as any).sessionId != null,
    })),
  });

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

  for (const r of slice) {
    const score = Number(r.score) || 0;
    const distance = Number(r.distance) || 0;
    const coins = Number(r.coins) || 0;
    const bossesDefeated = Number(r.bossesDefeated) || 0;
    const enemiesDefeated = Number(r.enemiesDefeated) || 0;
    const longestCoinStreak = Number(r.longestCoinStreak) || 0;

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
  }

  return {
    ok: true,
    source: partial ? 'wake_events_partial' : 'wake_events',
    gamesUsed: slice.length,
    note: partial ? `derived from ${slice.length} wake event(s); expected ${expectedTotalGames} (aggregate may include older runs without events)` : undefined,
    totalScore,
    totalDistance,
    totalCoins,
    totalBossesDefeated,
    totalEnemiesDefeated,
    totalCoinStreak,
    bestScore,
    bestDistance,
    bestCoins,
    bestBossesDefeated,
    bestEnemiesDefeated,
    bestCoinStreak,
  };
}
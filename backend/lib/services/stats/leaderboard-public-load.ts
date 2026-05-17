// ==========================================
// GET /api/leaderboard payload — shared for route, public cache, menu bootstrap.
// ==========================================

import { getConfig } from '@/config/config';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { platformStatsClient } from '@/lib/services/platform/client/platform-client';

function generateMockLeaderboard(count: number) {
  const mockData = [];
  const names = [
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Eve',
    'Frank',
    'Grace',
    'Henry',
    'Ivy',
    'Jack',
    'Kate',
    'Liam',
    'Mia',
    'Noah',
    'Olivia',
    'Paul',
    'Quinn',
    'Ruby',
    'Sam',
    'Tina',
  ];
  const addresses = [
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    '0x1111111111111111111111111111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333333333333333333333333333',
    '0x4444444444444444444444444444444444444444444444444444444444444444',
    '0x5555555555555555555555555555555555555555555555555555555555555555',
    '0x6666666666666666666666666666666666666666666666666666666666666666',
  ];

  for (let i = 0; i < count; i++) {
    const baseScore = 50000 - i * 200;
    const variance = Math.floor(Math.random() * 1000) - 500;
    const score = Math.max(100, baseScore + variance);

    const distance = Math.floor(500 + Math.random() * 2000);
    const coins = Math.floor(20 + Math.random() * 80);
    const bossesDefeated = Math.floor(1 + Math.random() * 4);
    const enemiesDefeated = Math.floor(30 + Math.random() * 100);
    const longestCoinStreak = Math.floor(5 + Math.random() * 20);

    const nameIndex = i % names.length;
    const addressIndex = i % addresses.length;
    const baseAddress = addresses[addressIndex];
    const addressSuffix = i.toString(16).padStart(2, '0');
    const walletAddress = baseAddress.slice(0, -2) + addressSuffix;

    mockData.push({
      walletAddress,
      playerAddress: walletAddress,
      playerName:
        Math.random() > 0.3
          ? names[nameIndex] + (i > names.length ? ` ${Math.floor(i / names.length) + 1}` : '')
          : '',
      score,
      distance,
      coins,
      bossesDefeated,
      enemiesDefeated,
      longestCoinStreak,
      timestamp: Date.now() - i * 60000,
    });
  }

  return mockData;
}

export async function loadLeaderboardApiResponse(params: {
  limit: number;
  useMock: boolean;
}): Promise<Record<string, unknown>> {
  const { limit, useMock } = params;

  if (useMock) {
    PlatformLogger.info('Using mock leaderboard data', { limit });
    const leaderboard = generateMockLeaderboard(limit);
    const connectionInfo = { network: 'testnet', chainId: 'mock' };
    return {
      success: true,
      leaderboard,
      count: leaderboard.length,
      limit,
      network: connectionInfo.network,
      chainId: connectionInfo.chainId,
      mock: true,
    };
  }

  try {
    // Per-game leaderboard: every run is a row (Wake GameResultSubmitted events).
    // Falls back to legacy per-wallet aggregated leaderboard only if the feed is unavailable.
    const platformRes = await platformStatsClient.getGameResults(limit);
    PlatformLogger.debug('[LEADERBOARD][LOAD] platformStatsClient.getGameResults result', {
      success: platformRes?.success,
      source: (platformRes as any)?.source ?? undefined,
      count: Array.isArray((platformRes as any)?.leaderboard) ? (platformRes as any).leaderboard.length : undefined,
      hasByStat: Boolean((platformRes as any)?.byStat),
      error: (platformRes as any)?.error ?? undefined,
    });
    const byStat =
      platformRes && typeof platformRes === 'object' && 'byStat' in platformRes
        ? (platformRes as { byStat?: unknown }).byStat
        : undefined;
    const byStatObj =
      byStat && typeof byStat === 'object' && !Array.isArray(byStat)
        ? (byStat as Record<string, unknown>)
        : null;
    const bestScoreList =
      byStatObj && Array.isArray(byStatObj.bestScore) ? (byStatObj.bestScore as unknown[]) : null;

    if (platformRes?.success && byStatObj && bestScoreList) {
      const leaderboard = bestScoreList as any[];
      PlatformLogger.debug('Leaderboard from platform stats (byStat)', { count: leaderboard.length });
      const connectionInfo = { network: getConfig().sui?.network ?? 'mainnet', chainId: 'platform' };
      return {
        success: true,
        leaderboard,
        byStat: byStatObj,
        count: leaderboard.length,
        limit,
        network: connectionInfo.network,
        chainId: connectionInfo.chainId,
        source: 'platform',
        mock: false,
      };
    }

    if (platformRes?.success && Array.isArray(platformRes.leaderboard)) {
      const leaderboard = platformRes.leaderboard as any[];
      PlatformLogger.debug('Leaderboard from Wake game results feed', { count: leaderboard.length });
      const connectionInfo = { network: getConfig().sui?.network ?? 'mainnet', chainId: 'wake_events' };
      return {
        success: true,
        leaderboard,
        count: leaderboard.length,
        limit,
        network: connectionInfo.network,
        chainId: connectionInfo.chainId,
        source: platformRes.source || 'wake_events',
        mock: false,
      };
    }
  } catch (e) {
    PlatformLogger.warn('Platform leaderboard failed', { error: String(e) });
  }

  const connectionInfo = { network: getConfig().sui?.network ?? 'mainnet', chainId: 'platform' };
  return {
    success: true,
    leaderboard: [],
    count: 0,
    limit,
    network: connectionInfo.network,
    chainId: connectionInfo.chainId,
    source: 'platform',
    error: 'Leaderboard temporarily unavailable. Please try again later.',
    mock: false,
  };
}

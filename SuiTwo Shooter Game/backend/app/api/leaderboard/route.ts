import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler } from '@/lib/api/api-handler';
import { getOrLoadLeaderboardResponse } from '@/lib/cache/public-nonuser-data-cache';

export const GET = withApiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const mockParam = searchParams.get('mock');
  const useMock = mockParam === 'true' || process.env.USE_MOCK_LEADERBOARD === 'true';
  const forceRefresh = searchParams.get('_refresh') === '1' || searchParams.get('_refresh') === 'true';

  const limit = Math.min(Math.max(parseInt(limitParam || '100', 10), 1), 1000);

  if (useMock) {
    PlatformLogger.info('Using mock leaderboard data', { limit });
  }

  return getOrLoadLeaderboardResponse({ limit, useMock }, { forceRefresh });
});

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

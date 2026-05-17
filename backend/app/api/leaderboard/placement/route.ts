import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getOrLoadLeaderboardResponse } from '@/lib/cache/public-nonuser-data-cache';

function normalizeAddr(v: string): string {
  return String(v || '').trim().toLowerCase();
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const addressParam = searchParams.get('address') || '';
  const address = normalizeAddr(addressParam);
  const mockParam = searchParams.get('mock');
  const useMock = mockParam === 'true' || process.env.USE_MOCK_LEADERBOARD === 'true';
  const forceRefresh = searchParams.get('_refresh') === '1' || searchParams.get('_refresh') === 'true';

  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '200', 10), 1), 200);

  if (!address) {
    return {
      success: false,
      error: 'address is required',
    };
  }

  const lb = await getOrLoadLeaderboardResponse({ limit, useMock }, { forceRefresh });
  const list = Array.isArray((lb as any)?.leaderboard) ? ((lb as any).leaderboard as any[]) : [];

  let foundIndex = -1;
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const rowAddr = normalizeAddr(row?.playerAddress || row?.walletAddress || row?.address || '');
    if (rowAddr && rowAddr === address) {
      foundIndex = i;
      break;
    }
  }

  const entry = foundIndex >= 0 ? list[foundIndex] : null;
  return {
    success: true,
    address,
    found: foundIndex >= 0,
    rank: foundIndex >= 0 ? foundIndex + 1 : null,
    entry,
    scope: `top_${limit}`,
    limit,
    source: (lb as any)?.source,
    mock: useMock,
  };
});

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}


// ==========================================
// Admin API - Discover Wallets with Stats
// ==========================================
// Platform-only: no direct chain. Use platform admin for discovery.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { buildPlatformCallOptions, callPlatformBackend } from '@/lib/services/platform/client/platform-client';
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received GET request to /api/admin/stats/discover-wallets');

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get('limit');
    const limit = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : 1000;

    const platformOptions = buildPlatformCallOptions(request, undefined);
    // Ask platform hydroscope leaderboard to include scanned wallet list.
    const res = await callPlatformBackend<{
      success: boolean;
      wallets?: string[];
      walletsCount?: number;
      error?: string;
    }>(`api/hydroscope/leaderboard?limit=1&includeAddresses=1`, { method: 'GET', ...platformOptions });

    if (!res?.success) {
      return {
        success: false,
        wallets: [],
        count: 0,
        error: res?.error || 'Failed to discover wallets from platform stats',
      };
    }

    const wallets = Array.isArray(res.wallets) ? res.wallets : [];
    const capped = wallets.slice(0, Math.min(Math.max(Math.floor(limit), 1), 5000));
    return {
      success: true,
      wallets: capped,
      count: capped.length,
      message: `Discovered ${capped.length} wallet(s) with Wake stats (via platform hydroscope).`,
    };
  }
);

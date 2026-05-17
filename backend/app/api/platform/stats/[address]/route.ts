// ==========================================
// Platform Stats API Proxy
// GET /api/platform/stats/[address] → platform api/stats/[address]
// Multi-ecosystem: X-Ecosystem-Id, ?ecosystemId= (default suitwo).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { platformStatsClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/platform/stats/[address]
 * Proxy to platform backend. Pass ecosystemId from request.
 */
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);
    const result = await platformStatsClient.getStats(address, buildPlatformCallOptions(request));

    if (!result.success) {
      throw new Error(result.error || 'Failed to get stats from platform');
    }

    return {
      success: true,
      address: result.address ?? address,
      ecosystemId: result.ecosystemId,
      stats: result.stats ?? {},
    };
  }
);

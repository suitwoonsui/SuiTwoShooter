// ==========================================
// Platform Stats Update API Proxy
// POST /api/platform/stats/update → platform api/stats/update
// Multi-ecosystem: X-Ecosystem-Id, ?ecosystemId=, body.ecosystemId (default suitwo).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { platformStatsClient } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/platform/stats/update
 * Proxy to platform backend. Uses APP_ID and ECOSYSTEM_ID from env (generated keys) so only this backend can identify the app.
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      address: string;
      stats: Record<string, unknown>;
    }>(request);

    const result = await platformStatsClient.updateStats(
      { address: body.address, stats: body.stats }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to update stats on platform');
    }

    return {
      success: true,
      address: result.address ?? body.address,
      ecosystemId: result.ecosystemId,
    };
  }
);

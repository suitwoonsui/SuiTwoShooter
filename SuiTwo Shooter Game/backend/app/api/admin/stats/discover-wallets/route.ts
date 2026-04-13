// ==========================================
// Admin API - Discover Wallets with Stats
// ==========================================
// Platform-only: no direct chain. Use platform admin for discovery.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received GET request to /api/admin/stats/discover-wallets');
    return {
      success: true,
      wallets: [],
      count: 0,
      message: 'Stats are on platform. Use platform admin for discovery.',
    };
  }
);

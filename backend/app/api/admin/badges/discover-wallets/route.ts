// ==========================================
// Admin API - Discover Wallets with Badges
// ==========================================
// Platform-only: no direct chain. Returns empty list (platform does not expose list wallets with badge).

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received GET request to /api/admin/badges/discover-wallets');
    return {
      success: true,
      wallets: [],
      count: 0,
      message: 'Badges are on platform. Use platform NFT APIs or per-address has-badge to check wallets.',
    };
  }
);


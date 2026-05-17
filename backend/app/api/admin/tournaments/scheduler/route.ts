// ==========================================
// Admin API: Tournament Scheduler (deprecated)
// ==========================================
// The game scheduler was removed. Distribution and move-to-past are handled by the platform (Tide).
// This endpoint remains for backwards compatibility and returns a minimal status.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async () => {
    return {
      success: true,
      scheduler: {
        isReady: true,
        scheduledCount: 0,
        scheduledTournamentIds: [],
        note: 'Game scheduler removed. Platform Tide handles distribution and move-to-past.',
      },
    };
  }
);

export const POST = withApiHandler(
  async () => {
    return {
      success: true,
      message: 'No-op. Platform Tide handles distribution and move-to-past.',
      scheduler: {
        isReady: true,
        scheduledCount: 0,
        scheduledTournamentIds: [],
      },
    };
  }
);

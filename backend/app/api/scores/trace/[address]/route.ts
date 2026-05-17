// ==========================================
// Score Submission Trace API Route
// Uses Aqueduct Platform only; no legacy chain path.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { platformGameScoreClient } from '@/lib/services/platform/client/platform-client';

/**
 * GET /api/scores/trace/[address]
 * Trace score submissions for a player via platform. Requires PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID.
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ address: string }> }) => {
    const { address } = await params;
    PlatformValidators.validateAddress(address);

    const platformResult = await platformGameScoreClient.trace(address);
    return {
      success: true,
      playerAddress: platformResult.playerAddress,
      regularGameScores: platformResult.regularGameScores ?? [],
      tournamentScores: platformResult.tournamentScores ?? [],
      summary: platformResult.summary ?? {
        totalRegularScores: 0,
        totalTournamentScores: 0,
        latestRegularScore: null,
        latestTournamentScore: null,
      },
      message: platformResult.message,
    };
  },
  { logRequest: true }
);

// Legacy internal chain path removed — platform only so failures are visible.


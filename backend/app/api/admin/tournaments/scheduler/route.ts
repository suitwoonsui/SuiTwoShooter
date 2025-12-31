// ==========================================
// Admin API: Tournament Scheduler Status & Control
// ==========================================
// Endpoint to check scheduler status and manually trigger checks

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { TournamentScheduler } from '@/lib/services/tournament-scheduler';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Wallet',
    },
  });
}

// GET - Check scheduler status
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const status = TournamentScheduler.getStatus();
    const isReady = TournamentScheduler.isReady();

    BadgeLogger.info('⏰ [SCHEDULER API] Status check', {
      isReady,
      ...status,
    });

    return {
      success: true,
      scheduler: {
        isReady,
        scheduledCount: status.scheduledCount,
        scheduledTournamentIds: status.tournamentIds,
      },
    };
  }
);

// POST - Manually trigger check for new tournaments
export const POST = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('⏰ [SCHEDULER API] Manual check triggered');

    // Initialize if not ready
    if (!TournamentScheduler.isReady()) {
      await TournamentScheduler.initialize();
    } else {
      // Just run a check for new tournaments
      await TournamentScheduler.checkForNewTournaments();
    }

    const status = TournamentScheduler.getStatus();

    return {
      success: true,
      message: 'Scheduler check complete',
      scheduler: {
        isReady: TournamentScheduler.isReady(),
        scheduledCount: status.scheduledCount,
        scheduledTournamentIds: status.tournamentIds,
      },
    };
  }
);

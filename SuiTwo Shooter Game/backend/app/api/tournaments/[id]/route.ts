// ==========================================
// Tournament API Route - Get specific tournament
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../base/backend/lib/cors';
import { getTournamentService } from '../../../../../../../backend/lib/sui/tournament-service';
import { withApiHandler } from '../../../../../../../base/backend/lib/api/api-handler';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Await params (Next.js 15 requirement)
    const { id } = await params;
    
    const tournamentService = getTournamentService();
    const result = await tournamentService.getTournament(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Tournament not found',
      };
    }

    return {
      success: true,
      tournament: result.tournament,
    };
  }
);


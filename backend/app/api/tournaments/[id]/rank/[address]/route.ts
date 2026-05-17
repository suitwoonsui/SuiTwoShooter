// ==========================================
// Tournament Player Rank API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; address: string }> }
) {
  try {
    const resolvedParams = await params;
    const tournamentService = getTournamentService();
    const result = await tournamentService.getPlayerRank(
      resolvedParams.id,
      resolvedParams.address
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to get player rank',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rank: result.rank,
      value: result.value,
      totalParticipants: result.totalParticipants,
    });
  } catch (error) {
    console.error('Error getting player rank:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


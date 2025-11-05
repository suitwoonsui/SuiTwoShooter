import { NextRequest, NextResponse } from 'next/server';
import { suiService } from '@/lib/sui/suiService';

/**
 * GET /api/leaderboard
 * Get leaderboard from blockchain events
 * 
 * Queries ScoreSubmitted events from the smart contract and returns
 * top scores sorted by score (descending).
 * 
 * Query params:
 * - limit: Number of scores to return (default: 100, max: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(
      Math.max(parseInt(limitParam || '100', 10), 1), // At least 1
      1000 // Max 1000
    );

    const leaderboard = await suiService.queryEvents(limit);

    return NextResponse.json({
      leaderboard,
      count: leaderboard.length,
      limit,
    });
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        leaderboard: [],
        count: 0
      },
      { status: 500 }
    );
  }
}


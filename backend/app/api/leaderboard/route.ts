import { NextRequest, NextResponse } from 'next/server';
import { suiService } from '@/lib/sui/suiService';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

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

    const corsHeaders = getCorsHeaders(request);
    
    // Get network info for verification
    const connectionInfo = await suiService.testConnection();
    
    return NextResponse.json({
      leaderboard,
      count: leaderboard.length,
      limit,
      network: connectionInfo.network, // Include network info for verification
      chainId: connectionInfo.chainId, // Include chain ID for verification
    }, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error);
    const corsHeaders = getCorsHeaders(request);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        leaderboard: [],
        count: 0
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}


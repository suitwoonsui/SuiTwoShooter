import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /
 * Root endpoint - API information
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'SuiTwo Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      tokens: '/api/tokens/balance/[address]',
      scores: '/api/scores/verify',
      leaderboard: '/api/leaderboard'
    }
  });
}


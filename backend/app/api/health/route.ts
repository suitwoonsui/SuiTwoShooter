import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/health
 * Health check endpoint for Render free tier keep-alive
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'suitwo-backend'
  });
}


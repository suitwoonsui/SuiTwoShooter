import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';

/**
 * GET /api/health
 * Health check endpoint for Render free tier keep-alive
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    return {
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'suitwo-backend'
    };
  }
);


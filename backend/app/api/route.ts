import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';

/**
 * GET /
 * Root endpoint - API information
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    return {
      success: true,
      message: 'SuiTwo Backend API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        tokens: '/api/tokens/balance/[address]',
        scores: '/api/scores/verify',
        leaderboard: '/api/leaderboard',
        store: {
          items: '/api/store/items',
          inventory: '/api/store/inventory/[address]',
          purchase: '/api/store/purchase',
          transaction: '/api/store/transaction/[digest]',
          consume: '/api/store/consume'
        }
      }
    };
  }
);


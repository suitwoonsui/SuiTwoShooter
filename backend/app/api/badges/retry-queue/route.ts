// ==========================================
// Badge Retry Queue API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeRetryQueue } from '@/lib/sui/badge-retry-queue';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';

/**
 * GET /api/badges/retry-queue
 * Get retry queue status
 * 
 * Returns:
 * {
 *   success: boolean,
 *   queue: {
 *     totalEntries: number,
 *     entries: Array<{
 *       playerAddress: string,
 *       sessionId: string,
 *       attempts: number,
 *       nextRetry: number,
 *       error?: string
 *     }>
 *   }
 * }
 * 
 * DELETE /api/badges/retry-queue
 * Clear retry queue (admin only)
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const retryQueue = getBadgeRetryQueue();
    const status = retryQueue.getQueueStatus();

    return {
      success: true,
      queue: status,
    };
  }
);

export const DELETE = withApiHandler(
  async (request: NextRequest) => {
    // TODO: Add admin authentication check
    const retryQueue = getBadgeRetryQueue();
    retryQueue.clearQueue();

    return {
      success: true,
      message: 'Retry queue cleared',
    };
  }
);


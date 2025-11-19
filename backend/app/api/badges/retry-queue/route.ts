// ==========================================
// Badge Retry Queue API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeRetryQueue } from '@/lib/sui/badge-retry-queue';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

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

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const retryQueue = getBadgeRetryQueue();
    const status = retryQueue.getQueueStatus();

    return NextResponse.json(
      {
        success: true,
        queue: status,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error getting retry queue status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get retry queue status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // TODO: Add admin authentication check
    const retryQueue = getBadgeRetryQueue();
    retryQueue.clearQueue();

    return NextResponse.json(
      {
        success: true,
        message: 'Retry queue cleared',
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error clearing retry queue:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear retry queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


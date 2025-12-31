// ==========================================
// Badge Reconciliation API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeReconciliation } from '@/lib/sui/badge-reconciliation';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

/**
 * POST /api/badges/reconcile
 * Manually trigger reconciliation for a specific player
 * 
 * Request body:
 * {
 *   playerAddress: string  // Player's wallet address
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   updated: boolean,
 *   error?: string
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{ playerAddress: string }>(request);
    const playerAddress = body.playerAddress;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    // Validate address format
    BadgeValidators.validateAddress(playerAddress);

    BadgeLogger.info('Reconciliation request received', { playerAddress });

    const reconciliation = getBadgeReconciliation();
    const result = await reconciliation.reconcilePlayer(playerAddress);

    return result;
  }
);


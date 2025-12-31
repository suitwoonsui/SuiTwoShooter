// ==========================================
// Badge Update API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

/**
 * POST /api/badges/update
 * Check if badge tier should be updated and build transaction if needed
 * 
 * Request body:
 * {
 *   playerAddress: string,  // Player's wallet address
 *   sessionId: string        // Session ID from game completion (for idempotency)
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   tierUpgraded: boolean,
 *   newTier?: number,
 *   transactionData?: {
 *     packageId: string,
 *     module: string,
 *     function: string,
 *     arguments: any[],
 *     badgeId: string,
 *     imageData: string (base64 encoded)
 *   },
 *   error?: string
 * }
 * 
 * Note: Frontend must sign and execute transaction if tierUpgraded is true
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{ playerAddress: string; sessionId: string }>(request);
    const { playerAddress, sessionId } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!sessionId) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_SESSION_ID,
        'sessionId is required'
      );
    }

    // Validate address format
    BadgeValidators.validateAddress(playerAddress);

    BadgeLogger.info('Badge update check request received', {
      playerAddress,
      sessionId,
    });

    const badgeService = getBadgeService();
    
    // Check and build update transaction
    const result = await badgeService.checkAndBuildBadgeUpdate(
      playerAddress,
      sessionId
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to check badge update');
    }

    // If tier didn't upgrade, return early
    if (!result.tierUpgraded) {
      return {
        success: true,
        tierUpgraded: false,
      };
    }

    // Tier upgraded - return transaction data
    const transactionData = result.transactionData!;
    // imageDataObjectId is already in arguments, imageData is optional (for reference)
    const imageDataBase64 = transactionData.imageData 
      ? Buffer.from(transactionData.imageData).toString('base64')
      : undefined;

    return {
      success: true,
      tierUpgraded: true,
      newTier: result.newTier,
      transactionData: {
        ...transactionData,
        ...(imageDataBase64 && { imageData: imageDataBase64 }), // Include if available
      },
    };
  }
);


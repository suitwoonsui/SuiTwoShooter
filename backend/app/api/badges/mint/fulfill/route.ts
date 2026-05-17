// ==========================================
// Badge mint — step 2: after optional game fee payment confirms, build Shipyard mint (player signs).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';
import {
  assertChannelPaymentDigestConfirmed,
  getBadgeMintGameFeeUsdCents,
} from '@/lib/services/badge/payment/badge-game-fee';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      paymentDigest?: string;
      sessionId?: string;
    }>(request);

    const playerAddress = body?.playerAddress?.trim() ?? '';
    if (!playerAddress.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required and must be a valid Sui address (0x...)'
      );
    }
    PlatformValidators.validateAddress(playerAddress);

    const feeUsdCents = await getBadgeMintGameFeeUsdCents();
    if (feeUsdCents > 0) {
      const digest = body?.paymentDigest?.trim();
      if (!digest) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'paymentDigest is required when badge minting fee is configured (complete POST .../badges/mint/purchase first)'
        );
      }
      await assertChannelPaymentDigestConfirmed(digest, request);
    }

    const badgeService = getBadgeService();
    const already = await badgeService.hasBadge(playerAddress);
    if (already) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'Player already has a badge');
    }

    PlatformLogger.info('Badge mint fulfill: building Shipyard mint tx', { playerAddress, hadFee: feeUsdCents > 0 });
    const result = await badgeService.buildMintBadgeTransaction(playerAddress, body?.sessionId);

    if (!result.success || !result.transaction) {
      return {
        success: false,
        error: result.error ?? 'Failed to build mint transaction',
        message: result.error,
      };
    }

    return {
      success: true,
      transaction: result.transaction,
    };
  },
  { logRequest: true }
);

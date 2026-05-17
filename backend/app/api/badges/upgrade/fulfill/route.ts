// ==========================================
// Badge upgrade — step 2: after optional game fee payment, build Shipyard upgrade (player signs).
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
  getBadgeUpgradeGameFeeUsdCents,
} from '@/lib/services/badge/payment/badge-game-fee';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      badgeId: string;
      newTier: number;
      sessionId?: string;
      paymentDigest?: string;
    }>(request);

    const playerAddress = body?.playerAddress?.trim() ?? '';
    if (!playerAddress.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required and must be a valid Sui address (0x...)'
      );
    }
    PlatformValidators.validateAddress(playerAddress);

    const badgeId = body?.badgeId?.trim() ?? '';
    if (!badgeId.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'badgeId is required and must be a valid object ID (0x...)'
      );
    }

    if (body?.newTier === undefined || body?.newTier === null) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'newTier is required');
    }
    const newTier = Number(body.newTier);
    if (!Number.isFinite(newTier)) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'newTier must be a number');
    }

    const feeUsdCents = await getBadgeUpgradeGameFeeUsdCents();
    if (feeUsdCents > 0) {
      const digest = body?.paymentDigest?.trim();
      if (!digest) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'paymentDigest is required when badge upgrade fee is configured (complete POST .../badges/upgrade/purchase first)'
        );
      }
      await assertChannelPaymentDigestConfirmed(digest, request);
    }

    PlatformLogger.info('Badge upgrade fulfill: building Shipyard upgrade tx', {
      playerAddress,
      badgeId,
      newTier,
      hadFee: feeUsdCents > 0,
    });

    const badgeService = getBadgeService();
    const result = await badgeService.buildUpgradeBadgeTransaction(
      playerAddress,
      badgeId,
      newTier,
      body?.sessionId ?? ''
    );

    if (!result.success || !result.transaction) {
      return {
        success: false,
        error: result.error ?? 'Failed to build upgrade transaction',
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

// ==========================================
// Badge mint — step 1: build Channel payment (player → game admin) when Helm minting fee > 0.
// If fee is 0, returns requiresPayment: false; client calls POST .../mint/fulfill without paymentDigest.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import {
  buildBadgeGameFeePurchaseTransaction,
  getBadgeMintGameFeeUsdCents,
} from '@/lib/services/badge/payment/badge-game-fee';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      paymentToken?: string;
      prices?: { sui?: number; mews?: number; usdc?: number };
      pricesTimestamp?: number;
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
    if (feeUsdCents <= 0) {
      PlatformLogger.info('Badge mint purchase: no game fee configured; skip payment step', { playerAddress });
      return {
        success: true,
        requiresPayment: false,
        feeUsdCents: 0,
        playerAddress,
      };
    }

    const paymentToken = (body?.paymentToken || 'SUI').toUpperCase();
    if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'paymentToken must be SUI, MEWS, or USDC when minting fee is configured'
      );
    }

    const built = await buildBadgeGameFeePurchaseTransaction({
      playerAddress,
      paymentToken: paymentToken as 'SUI' | 'MEWS' | 'USDC',
      feeUsdCents,
      prices: body?.prices,
      pricesTimestamp: body?.pricesTimestamp,
    });

    if (!built.success) {
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        'error' in built ? built.error : 'Failed to build payment transaction'
      );
    }
    if (!built.requiresPayment) {
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        'Expected channel-payment transaction when minting fee is configured'
      );
    }

    PlatformLogger.info('Badge mint purchase: built channel-payment to game admin', {
      playerAddress,
      feeUsdCents,
      paymentToken: built.paymentToken,
    });

    return {
      success: true,
      requiresPayment: true,
      transaction: built.transaction,
      gasEstimate: built.gasEstimate,
      feeUsdCents: built.feeUsdCents,
      totalUSD: built.totalUSD,
      totalToken: built.totalToken,
      totalTokenDisplay: built.totalTokenDisplay,
      paymentToken: built.paymentToken,
      playerAddress: built.playerAddress,
    };
  },
  { logRequest: true }
);

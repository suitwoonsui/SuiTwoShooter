// ==========================================
// Game Pass Purchase Single Game API Route
// Builds unsigned pay-per-game transaction for frontend to sign
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getGamePassService } from '@/lib/sui/game-pass-service';
import { priceConverter } from '@/lib/services/price-converter';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getDiscounts } from '@/lib/sui/badge-service/badge-utilities';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// Pay-per-game base price
const PAY_PER_GAME_PRICE = 0.10; // $0.10

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      paymentToken: string;
      badgeDiscount?: number; // Optional discount percentage from frontend (for validation)
    }>(request);
    const { playerAddress, paymentToken, badgeDiscount } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!paymentToken || !['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'paymentToken must be SUI, MEWS, or USDC'
      );
    }

    // Validate player address format
    BadgeValidators.validateAddress(playerAddress);

    BadgeLogger.info('Building purchase single game transaction', {
      playerAddress,
      paymentToken,
    });

    // Calculate base price (USD)
    const basePriceUSD = PAY_PER_GAME_PRICE;

    // Get badge discount
    let appliedDiscount = 0;
    if (badgeDiscount !== undefined && badgeDiscount > 0) {
      const badgeService = getBadgeService();
      const badge = await badgeService.getBadge(playerAddress);
      
      if (badge && badge.tier > 0) {
        const actualDiscounts = getDiscounts(badge.tier);
        const actualStoreDiscount = actualDiscounts.store;
        
        if (Math.abs(badgeDiscount - actualStoreDiscount) > 0.01) {
          BadgeLogger.warn('Badge discount mismatch', {
            playerAddress,
            frontendDiscount: badgeDiscount,
            backendDiscount: actualStoreDiscount,
            tier: badge.tier,
          });
          appliedDiscount = actualStoreDiscount;
        } else {
          appliedDiscount = badgeDiscount;
        }
        
        if (appliedDiscount > 0) {
          BadgeLogger.info('Badge discount applied', {
            playerAddress,
            tier: badge.tier,
            discount: appliedDiscount,
            originalTotal: basePriceUSD,
          });
        }
      } else {
        BadgeLogger.warn('Frontend sent discount but player has no badge', {
          playerAddress,
          frontendDiscount: badgeDiscount,
        });
      }
    }

    // Calculate final price (with discount if applicable)
    const finalPriceUSD = appliedDiscount > 0
      ? basePriceUSD * (1 - appliedDiscount / 100)
      : basePriceUSD;

    // Convert USD to token amount
    const conversionResult = await priceConverter.convertUSDToToken(
      finalPriceUSD,
      paymentToken as 'SUI' | 'MEWS' | 'USDC'
    );

    if (!conversionResult.success || !conversionResult.tokenAmount) {
      throw new BadgeError(
        BadgeErrorCode.BLOCKCHAIN_QUERY_FAILED,
        conversionResult.error || 'Failed to convert USD to token amount'
      );
    }

    // Convert final price to USD cents for event tracking
    const pricePaidUsdCents = Math.round(finalPriceUSD * 100);

    // Build purchase transaction
    const gamePassService = getGamePassService();
    const transactionResult = await gamePassService.buildPurchaseSingleGameTransaction(
      playerAddress,
      paymentToken as 'SUI' | 'MEWS' | 'USDC',
      conversionResult.tokenAmount,
      pricePaidUsdCents
    );

    if (!transactionResult.success || !transactionResult.transaction) {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        transactionResult.error || 'Failed to build transaction'
      );
    }

    BadgeLogger.info('Purchase single game transaction built successfully', {
      playerAddress,
      totalUSD: finalPriceUSD.toFixed(2),
      originalTotalUSD: basePriceUSD.toFixed(2),
      discount: appliedDiscount,
      totalToken: conversionResult.tokenAmount,
    });

    return {
      success: true,
      transaction: transactionResult.transaction,
      gasEstimate: transactionResult.gasEstimate,
      totalUSD: finalPriceUSD.toFixed(2),
      originalTotalUSD: basePriceUSD.toFixed(2),
      discountApplied: appliedDiscount,
      totalToken: conversionResult.tokenAmount,
      paymentToken,
      gamesIncluded: 1,
      playerAddress,
    };
  },
  {
    logRequest: true,
  }
);


// ==========================================
// Game Pass Purchase Pack API Route
// Builds unsigned purchase transaction for frontend to sign
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

// Base pack prices (in USD)
// Base price: $0.10 per game
// Discounts scale from 9.1% (Starter) to 15% (Mega)
const PACK_PRICES = {
  1: { price: 1.00, games: 11 },      // Starter: $1.00 (11 games @ 9.1% off = $1.10 value)
  2: { price: 5.00, games: 56 },      // Regular: $5.00 (56 games @ 11% off = $5.60 value)
  3: { price: 10.00, games: 115 },    // Value: $10.00 (115 games @ 13% off = $11.50 value)
  4: { price: 20.00, games: 235 },    // Mega: $20.00 (235 games @ 15% off = $23.50 value)
};

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      packType: number; // 1=Starter, 2=Regular, 3=Value, 4=Mega
      quantity?: number; // Optional: number of packs to purchase (default: 1)
      paymentToken: string;
      badgeDiscount?: number; // Optional discount percentage from frontend (for validation)
    }>(request);
    const { playerAddress, packType, quantity = 1, paymentToken, badgeDiscount } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!packType || packType < 1 || packType > 4) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'packType must be 1-4 (Starter, Regular, Value, Mega)'
      );
    }

    if (!paymentToken || !['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'paymentToken must be SUI, MEWS, or USDC'
      );
    }

    if (quantity < 1 || quantity > 10) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'quantity must be between 1 and 10'
      );
    }

    // Validate player address format
    BadgeValidators.validateAddress(playerAddress);

    BadgeLogger.info('Building purchase pack transaction', {
      playerAddress,
      packType,
      quantity,
      paymentToken,
    });

    // Get pack info
    const packInfo = PACK_PRICES[packType as keyof typeof PACK_PRICES];
    if (!packInfo) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `Invalid pack type: ${packType}`
      );
    }

    // Calculate base price (USD)
    const basePriceUSD = packInfo.price * quantity;

    // Get badge discount
    let appliedDiscount = 0;
    if (badgeDiscount !== undefined && badgeDiscount > 0) {
      // Verify the player actually has a badge with this discount
      const badgeService = getBadgeService();
      const badge = await badgeService.getBadge(playerAddress);
      
      if (badge && badge.tier > 0) {
        // Get the actual discount for this tier
        const actualDiscounts = getDiscounts(badge.tier);
        const actualStoreDiscount = actualDiscounts.store;
        
        // Validate that the frontend discount matches the backend calculation
        if (Math.abs(badgeDiscount - actualStoreDiscount) > 0.01) {
          BadgeLogger.warn('Badge discount mismatch', {
            playerAddress,
            frontendDiscount: badgeDiscount,
            backendDiscount: actualStoreDiscount,
            tier: badge.tier,
          });
          // Use the backend-calculated discount for security
          appliedDiscount = actualStoreDiscount;
        } else {
          appliedDiscount = badgeDiscount;
        }
        
        // Apply discount to total USD
        if (appliedDiscount > 0) {
          const discountMultiplier = 1 - (appliedDiscount / 100);
          const discountedPriceUSD = basePriceUSD * discountMultiplier;
          
          BadgeLogger.info('Badge discount applied', {
            playerAddress,
            tier: badge.tier,
            discount: appliedDiscount,
            originalTotal: basePriceUSD,
            discountedTotal: discountedPriceUSD,
          });
        }
      } else {
        // Player doesn't have a badge, but frontend sent a discount - ignore it
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
    // Note: For multiple packs, we'll call the function multiple times or batch them
    // For now, we'll handle single pack purchases (quantity = 1)
    // Multiple packs can be handled by calling this endpoint multiple times or batching
    const gamePassService = getGamePassService();
    const transactionResult = await gamePassService.buildPurchasePackTransaction(
      playerAddress,
      packType,
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

    BadgeLogger.info('Purchase pack transaction built successfully', {
      playerAddress,
      packType,
      quantity,
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
      packType,
      quantity,
      gamesIncluded: packInfo.games * quantity,
      playerAddress,
    };
  },
  {
    logRequest: true,
  }
);


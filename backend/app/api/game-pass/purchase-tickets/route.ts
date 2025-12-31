// ==========================================
// Game Pass Purchase Tournament Tickets API Route
// Builds unsigned tournament ticket purchase transaction for frontend to sign
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

// Base ticket price (in USD)
const BASE_TICKET_PRICE = 1.00; // $1.00 per ticket

// Ticket bundle discounts
// Note: Prices are now $1, $5, $10, $20
// Quantities: 1, 6, 12, 25 tickets respectively
const TICKET_BUNDLES = {
  1: { discount: 0 },      // Single ticket: $1.00, no discount
  6: { discount: 0 },       // 6 tickets: $5.00, no discount
  12: { discount: 0 },      // 12 tickets: $10.00, no discount
  25: { discount: 0 },      // 25 tickets: $20.00, no discount
};

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      quantity: number;
      paymentToken: 'SUI' | 'MEWS' | 'USDC';
      badgeDiscount?: number;
    }>(request);

    const { playerAddress, quantity, paymentToken, badgeDiscount } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!quantity || quantity < 1 || quantity > 100) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'quantity must be between 1 and 100'
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

    BadgeLogger.info('Building tournament ticket purchase transaction', {
      playerAddress,
      quantity,
      paymentToken,
      badgeDiscount,
    });

    // Calculate price based on quantity (fixed prices: $1, $5, $10, $20)
    let basePriceUSD = 0;
    let bundleDiscount = 0;
    
    if (quantity === 1) {
      basePriceUSD = 1.00;
      bundleDiscount = TICKET_BUNDLES[1].discount;
    } else if (quantity === 6) {
      basePriceUSD = 5.00;
      bundleDiscount = TICKET_BUNDLES[6].discount;
    } else if (quantity === 12) {
      basePriceUSD = 10.00;
      bundleDiscount = TICKET_BUNDLES[12].discount;
    } else if (quantity === 25) {
      basePriceUSD = 20.00;
      bundleDiscount = TICKET_BUNDLES[25].discount;
    } else {
      // Fallback: calculate from base price for any other quantity
      basePriceUSD = BASE_TICKET_PRICE * quantity;
    }

    // Apply bundle discount (currently all are 0, but kept for future flexibility)
    const priceAfterBundleDiscount = basePriceUSD * (1 - bundleDiscount / 100);

    // Get badge discount
    let appliedBadgeDiscount = 0;
    if (badgeDiscount !== undefined && badgeDiscount > 0) {
      // Verify the player actually has a badge with this discount
      const badgeService = getBadgeService();
      const badge = await badgeService.getBadge(playerAddress);
      
      if (badge && badge.tier > 0) {
        // Get the actual discount for this tier
        const actualDiscounts = getDiscounts(badge.tier);
        const actualGameplayDiscount = actualDiscounts.gameplay; // Tickets use gameplay discount
        
        // Validate that the frontend discount matches the backend calculation
        if (Math.abs(badgeDiscount - actualGameplayDiscount) > 0.01) {
          BadgeLogger.warn('Badge discount mismatch', {
            playerAddress,
            frontendDiscount: badgeDiscount,
            backendDiscount: actualGameplayDiscount,
            tier: badge.tier,
          });
          // Use the backend-calculated discount for security
          appliedBadgeDiscount = actualGameplayDiscount;
        } else {
          appliedBadgeDiscount = badgeDiscount;
        }
        
        // Apply badge discount to total USD
        if (appliedBadgeDiscount > 0) {
          const discountMultiplier = 1 - (appliedBadgeDiscount / 100);
          const discountedPriceUSD = priceAfterBundleDiscount * discountMultiplier;
          
          BadgeLogger.info('Badge discount applied to tickets', {
            playerAddress,
            tier: badge.tier,
            discount: appliedBadgeDiscount,
            originalTotal: priceAfterBundleDiscount,
            discountedTotal: discountedPriceUSD,
          });
        }
      } else {
        // Player doesn't have a badge, but frontend sent a discount - ignore it
        BadgeLogger.warn('Frontend sent badge discount but player has no badge', {
          playerAddress,
        });
      }
    }

    // Final price after all discounts
    const finalPriceUSD = priceAfterBundleDiscount * (1 - appliedBadgeDiscount / 100);
    const finalPriceUSDCents = Math.round(finalPriceUSD * 100);
    const valuePerTicketUSDCents = Math.round((finalPriceUSD / quantity) * 100);

    // Convert USD to token amount
    const tokenAmount = await priceConverter.convertUSDToToken(
      finalPriceUSD,
      paymentToken as 'SUI' | 'MEWS' | 'USDC'
    );

    if (!tokenAmount.success || !tokenAmount.tokenAmount) {
      throw new BadgeError(
        BadgeErrorCode.BLOCKCHAIN_QUERY_FAILED,
        tokenAmount.error || 'Failed to convert USD to token amount'
      );
    }

    // Build transaction
    const gamePassService = getGamePassService();
    const result = await gamePassService.buildPurchaseTicketsTransaction(
      playerAddress,
      quantity,
      paymentToken,
      tokenAmount.tokenAmount,
      finalPriceUSDCents,
      valuePerTicketUSDCents
    );

    if (!result.success || !result.transaction) {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        result.error || 'Failed to build purchase transaction'
      );
    }

    BadgeLogger.info('Tournament ticket purchase transaction built successfully', {
      playerAddress,
      quantity,
      paymentToken,
      totalUSD: finalPriceUSD,
      totalToken: tokenAmount.tokenAmount,
    });

    return {
      success: true,
      transaction: result.transaction,
      gasEstimate: result.gasEstimate,
      totalUSD: finalPriceUSD,
      originalTotalUSD: basePriceUSD,
      bundleDiscount: bundleDiscount,
      badgeDiscount: appliedBadgeDiscount,
      totalToken: tokenAmount.tokenAmount,
      paymentToken: paymentToken,
      quantity: quantity,
      valuePerTicketUSDCents: valuePerTicketUSDCents,
    };
  },
  {
    logRequest: true,
  }
);


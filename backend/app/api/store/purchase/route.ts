// ==========================================
// Store Purchase API Route
// Builds unsigned purchase transaction for frontend to sign
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { storeService } from '@/lib/sui/store-service';
import { priceConverter } from '@/lib/services/price-converter';
import { calculateTotalUSD } from '@/lib/services/item-catalog';
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

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      items: Array<{ itemId: string; level: number; quantity: number }>;
      paymentToken: string;
      badgeDiscount?: number; // Optional discount percentage from frontend (for validation)
    }>(request);
    const { playerAddress, items, paymentToken, badgeDiscount } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'items array is required and must not be empty'
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

    // Validate items structure
    for (const item of items) {
      if (!item.itemId || typeof item.itemId !== 'string') {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'Each item must have a valid itemId'
        );
      }

      if (!item.level || typeof item.level !== 'number' || item.level < 1 || item.level > 3) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'Each item must have a valid level (1-3)'
        );
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'Each item must have a valid quantity (>= 1)'
        );
      }

      // Validate reasonable quantities (prevent abuse)
      if (item.quantity > 100) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'Quantity per item cannot exceed 100'
        );
      }
    }

    BadgeLogger.info('Building purchase transaction', {
      playerAddress,
      itemCount: items.length,
      paymentToken,
    });

    // Calculate total USD price using shared catalog
    const priceResult = calculateTotalUSD(items);
    if (!priceResult.success || priceResult.totalUSD === undefined) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        priceResult.error || 'Failed to calculate total price'
      );
    }
    let totalUSD = priceResult.totalUSD;
    
    // Verify and apply badge discount if provided
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
          totalUSD = totalUSD * discountMultiplier;
          BadgeLogger.info('Badge discount applied', {
            playerAddress,
            tier: badge.tier,
            discount: appliedDiscount,
            originalTotal: priceResult.totalUSD,
            discountedTotal: totalUSD,
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

    // Convert USD to token amount
    // Type assertion is safe here because we validated paymentToken above
    const conversionResult = await priceConverter.convertUSDToToken(
      totalUSD,
      paymentToken as 'SUI' | 'MEWS' | 'USDC'
    );

    if (!conversionResult.success || !conversionResult.tokenAmount) {
      throw new BadgeError(
        BadgeErrorCode.BLOCKCHAIN_QUERY_FAILED,
        conversionResult.error || 'Failed to convert USD to token amount'
      );
    }

    // Build purchase transaction
    // Type assertion is safe here because we validated paymentToken above
    const transactionResult = await storeService.buildPurchaseTransaction(
      playerAddress,
      items,
      paymentToken as 'SUI' | 'MEWS' | 'USDC',
      conversionResult.tokenAmount
    );

    if (!transactionResult.success || !transactionResult.transaction) {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        transactionResult.error || 'Failed to build transaction'
      );
    }

    BadgeLogger.info('Purchase transaction built successfully', {
      playerAddress,
      totalUSD: totalUSD.toFixed(2),
      originalTotalUSD: priceResult.totalUSD.toFixed(2),
      discount: appliedDiscount,
      totalToken: conversionResult.tokenAmount,
    });

    return {
      success: true,
      transaction: transactionResult.transaction,
      gasEstimate: transactionResult.gasEstimate,
      totalUSD: totalUSD.toFixed(2),
      originalTotalUSD: priceResult.totalUSD.toFixed(2),
      discountApplied: appliedDiscount,
      totalToken: conversionResult.tokenAmount,
      paymentToken,
      items,
      playerAddress,
    };
  },
  {
    logRequest: true,
  }
);


// ==========================================
// Store Merge API Route
// Builds unsigned merge transaction for frontend to sign
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../base/backend/lib/cors';
import { storeService } from '../../../../../../../backend/lib/sui/store-service';
import { priceConverter } from '../../../../../../../backend/lib/services/price-converter';
import { BadgeError, BadgeErrorCode } from '../../../../../../../base/backend/lib/sui/badge-errors';
import { BadgeValidators } from '../../../../../../../backend/lib/sui/badge-validators';
import { BadgeLogger } from '../../../../../../../base/backend/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '../../../../../../../base/backend/lib/api/api-handler';
import { getBadgeService } from '../../../../../../../backend/lib/sui/badge-service';
import { getDiscounts } from '../../../../../../../backend/lib/sui/badge-service/badge-utilities';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      itemType: string;
      sourceLevel: number;
      targetLevel: number;
      paymentToken: string;
      isHyperMerge?: boolean;
      badgeDiscount?: number; // Optional discount percentage from frontend (for validation)
    }>(request);
    const { playerAddress, itemType, sourceLevel, targetLevel, paymentToken, isHyperMerge = false, badgeDiscount } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!itemType) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'itemType is required'
      );
    }

    if (!sourceLevel || sourceLevel < 1 || sourceLevel > 2) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'sourceLevel must be 1 or 2'
      );
    }

    if (!targetLevel || targetLevel < 2 || targetLevel > 3) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'targetLevel must be 2 or 3'
      );
    }

    // Validate merge path
    if (!((sourceLevel === 1 && targetLevel === 2) || 
          (sourceLevel === 2 && targetLevel === 3) || 
          (sourceLevel === 1 && targetLevel === 3 && isHyperMerge))) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Invalid merge path. Must be L1→L2, L2→L3, or L1→L3 (hyper merge)'
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

    BadgeLogger.info('Building merge transaction', {
      playerAddress,
      itemType,
      sourceLevel,
      targetLevel,
      isHyperMerge,
      paymentToken,
    });

    // Calculate merge fee in USD
    const mergeFees: Record<string, number> = {
      '1-2': 0.25,  // Level 1 → Level 2: $0.25
      '2-3': 0.50,  // Level 2 → Level 3: $0.50
      '1-3': 1.50,  // Level 1 → Level 3 (hyper merge): $1.50
    };

    const mergeKey = isHyperMerge ? '1-3' : `${sourceLevel}-${targetLevel}`;
    const baseFeeUsd = mergeFees[mergeKey] || 0;

    if (baseFeeUsd === 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Invalid merge path for fee calculation'
      );
    }

    // Get badge discount
    let actualBadgeDiscount = 0;
    try {
      const badgeService = getBadgeService();
      const badgeData = await badgeService.getBadge(playerAddress);
      
      if (badgeData && badgeData.badgeId && badgeData.tier) {
        const discounts = getDiscounts(badgeData.tier);
        actualBadgeDiscount = discounts.store || 0; // Use store discount for merge fees
      }
    } catch (error) {
      BadgeLogger.warn('Error getting badge discount for merge', error);
      // Continue with 0% discount if badge check fails
    }

    // Apply badge discount
    const discountedFeeUsd = baseFeeUsd * (1 - actualBadgeDiscount / 100);

    // Validate frontend-provided discount matches backend calculation
    if (badgeDiscount !== undefined && Math.abs(badgeDiscount - actualBadgeDiscount) > 0.1) {
      BadgeLogger.warn('Badge discount mismatch', {
        frontend: badgeDiscount,
        backend: actualBadgeDiscount,
      });
      // Use backend calculation (more trustworthy)
    }

    // Convert USD to token
    const tokenType = paymentToken.toUpperCase() as 'SUI' | 'MEWS' | 'USDC';
    const priceResult = await priceConverter.convertUSDToToken(
      discountedFeeUsd,
      tokenType
    );

    if (!priceResult.success || !priceResult.tokenAmount) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        priceResult.error || 'Failed to convert merge fee to token amount'
      );
    }

    // tokenAmount is already in smallest units (with decimals applied)
    // e.g., for SUI: "25000000" = 0.025 SUI (with 9 decimals)
    const totalTokenAmount = priceResult.tokenAmount;

    // Calculate human-readable amount for logging
    const tokenDecimals = tokenType === 'SUI' ? 9 : (tokenType === 'USDC' ? 6 : (tokenType === 'MEWS' ? (process.env.SUI_NETWORK === 'testnet' ? 9 : 6) : 9));
    const humanReadableAmount = parseFloat(totalTokenAmount) / Math.pow(10, tokenDecimals);

    BadgeLogger.info('Merge fee calculated', {
      baseFeeUsd,
      discountedFeeUsd,
      badgeDiscount: actualBadgeDiscount,
      tokenAmount: humanReadableAmount,
      totalTokenAmount,
      paymentToken,
    });

    // Build merge transaction
    const result = await storeService.buildMergeTransaction(
      playerAddress,
      itemType,
      sourceLevel,
      targetLevel,
      paymentToken as 'SUI' | 'MEWS' | 'USDC',
      totalTokenAmount,
      isHyperMerge
    );

    if (!result.success) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        result.error || 'Failed to build merge transaction'
      );
    }

    return {
      success: true,
      transaction: result.transaction,
      gasEstimate: result.gasEstimate,
      feeUsd: discountedFeeUsd,
      feeInToken: humanReadableAmount,
      badgeDiscount: actualBadgeDiscount,
    };
  }
);


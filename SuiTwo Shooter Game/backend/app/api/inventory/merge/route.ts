// ==========================================
// Inventory Merge API Route
// Builds unsigned merge transaction for frontend to sign
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { priceConverter } from '@/lib/services/payments/converter/price-converter';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';
import { getDiscounts } from '@/lib/services/badge/utilities/badge-utilities';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { buildBatchViaChannel } from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { resolveProvisionItemType } from '@/lib/services/store/catalog/item-id';

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
      badgeDiscount?: number;
      ecosystemId?: string;
    }>(request);
    const { playerAddress, itemType, sourceLevel, targetLevel, paymentToken, isHyperMerge = false, badgeDiscount } = body;

    if (!playerAddress) throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'playerAddress is required');
    if (!itemType) throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'itemType is required');
    if (!sourceLevel || sourceLevel < 1 || sourceLevel > 2) throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'sourceLevel must be 1 or 2');
    if (!targetLevel || targetLevel < 2 || targetLevel > 3) throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'targetLevel must be 2 or 3');
    if (!((sourceLevel === 1 && targetLevel === 2) || (sourceLevel === 2 && targetLevel === 3) || (sourceLevel === 1 && targetLevel === 3 && isHyperMerge))) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Invalid merge path. Must be L1->L2, L2->L3, or L1->L3 (hyper merge)');
    }
    if (!paymentToken || !['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'paymentToken must be SUI, MEWS, or USDC');
    }

    PlatformValidators.validateAddress(playerAddress);

    PlatformLogger.info('Building inventory merge transaction', {
      playerAddress,
      itemType,
      sourceLevel,
      targetLevel,
      isHyperMerge,
      paymentToken,
    });

    const mergeFees: Record<string, number> = {
      '1-2': 0.25,
      '2-3': 0.50,
      '1-3': 1.50,
    };
    const mergeKey = isHyperMerge ? '1-3' : `${sourceLevel}-${targetLevel}`;
    const baseFeeUsd = mergeFees[mergeKey] || 0;
    if (baseFeeUsd === 0) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Invalid merge path for fee calculation');
    }

    let actualBadgeDiscount = 0;
    try {
      const badgeService = getBadgeService();
      const badgeData = await badgeService.getBadge(playerAddress);
      const gameConfigRes = await getGameConfigService().getConfig();
      const badgeConfig = gameConfigRes.config?.badgeConfig;
      if (
        badgeData &&
        badgeData.badgeId &&
        typeof badgeData.tier === 'number' &&
        Number.isFinite(badgeData.tier) &&
        badgeData.tier >= 0
      ) {
        const discounts = getDiscounts(badgeData.tier, badgeConfig);
        actualBadgeDiscount = discounts.store || 0;
      }
    } catch (error) {
      PlatformLogger.warn('Error getting badge discount for inventory merge', error);
    }

    const discountedFeeUsd = baseFeeUsd * (1 - actualBadgeDiscount / 100);
    if (badgeDiscount !== undefined && Math.abs(badgeDiscount - actualBadgeDiscount) > 0.1) {
      PlatformLogger.warn('Badge discount mismatch', { frontend: badgeDiscount, backend: actualBadgeDiscount });
    }

    const tokenType = paymentToken.toUpperCase() as 'SUI' | 'MEWS' | 'USDC';
    const priceResult = await priceConverter.convertUSDToToken(discountedFeeUsd, tokenType);
    if (!priceResult.success || !priceResult.tokenAmount) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, priceResult.error || 'Failed to convert merge fee to token amount');
    }

    const totalTokenAmount = priceResult.tokenAmount;
    const tokenDecimals = tokenType === 'SUI' ? 9 : (tokenType === 'USDC' ? 6 : (tokenType === 'MEWS' ? (process.env.SUI_NETWORK === 'testnet' ? 9 : 6) : 9));
    const humanReadableAmount = parseFloat(totalTokenAmount) / Math.pow(10, tokenDecimals);

    const contractItemType = resolveProvisionItemType(itemType);
    if (contractItemType === undefined) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, `Invalid item type: ${itemType}`);
    }

    const adminWallet = getAdminWalletService();
    const adminAddress = adminWallet.getAddress();

    const buildResult = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'inventory-merge',
            params: {
              playerAddress,
              itemType: contractItemType,
              sourceLevel,
              targetLevel,
              paymentToken: paymentToken as 'SUI' | 'MEWS' | 'USDC',
              totalTokenAmount,
              isHyperMerge,
              adminAddress,
            },
          },
        ],
      },
      undefined
    );

    if (!buildResult.success || !buildResult.transactions?.[0]) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        buildResult.errors?.[0] ?? buildResult.error ?? 'Failed to build merge transaction'
      );
    }

    return {
      success: true,
      transaction: buildResult.transactions[0],
      gasEstimate: buildResult.gasEstimateMist != null ? String(buildResult.gasEstimateMist) : undefined,
      feeUsd: discountedFeeUsd,
      feeInToken: humanReadableAmount,
      badgeDiscount: actualBadgeDiscount,
    };
  }
);


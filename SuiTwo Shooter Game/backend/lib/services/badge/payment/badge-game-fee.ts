// ==========================================
// Badge game fee — Channel channel-payment to game admin (same pattern as store purchase).
// Platform Shipyard mint/upgrade runs in a follow-up step after payment is confirmed.
// ==========================================

import type { NextRequest } from 'next/server';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { getMEWSDecimals, priceConverter } from '@/lib/services/payments/converter/price-converter';
import {
  buildBatchViaChannel,
  buildPlatformCallOptions,
  platformStoreClient,
} from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';

export async function getBadgeMintGameFeeUsdCents(): Promise<number> {
  const res = await getGameConfigService().getConfig();
  const c = res.config?.badgeConfig?.mintingFeeUsdCents;
  return typeof c === 'number' && c > 0 ? Math.floor(c) : 0;
}

export async function getBadgeUpgradeGameFeeUsdCents(): Promise<number> {
  const res = await getGameConfigService().getConfig();
  const c = res.config?.badgeConfig?.upgradeFeeUsdCents;
  return typeof c === 'number' && c > 0 ? Math.floor(c) : 0;
}

export async function assertChannelPaymentDigestConfirmed(
  paymentDigest: string,
  request?: NextRequest
): Promise<void> {
  const opts = request ? buildPlatformCallOptions(request) : undefined;
  const payStatus = await platformStoreClient.getTransactionStatus(paymentDigest, opts);
  if (!payStatus.success) {
    throw new PlatformError(
      PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
      payStatus.error || 'Failed to verify payment transaction status'
    );
  }
  if (!payStatus.exists) {
    throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, 'Payment transaction digest not found on chain');
  }
  if (!payStatus.confirmed) {
    throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, 'Payment transaction not yet confirmed');
  }
}

export type BadgeGameFeePurchaseResult =
  | {
      success: true;
      requiresPayment: true;
      transaction: string;
      gasEstimate?: string;
      feeUsdCents: number;
      totalUSD: string;
      totalToken: string;
      totalTokenDisplay: string;
      paymentToken: 'SUI' | 'MEWS' | 'USDC';
      playerAddress: string;
    }
  | {
      success: true;
      requiresPayment: false;
      feeUsdCents: number;
      playerAddress: string;
    }
  | { success: false; error: string };

/**
 * Build unsigned Channel `channel-payment` from player to game admin for a USD-cent game fee.
 * Mirrors store purchase conversion logic.
 */
export async function buildBadgeGameFeePurchaseTransaction(params: {
  playerAddress: string;
  paymentToken: 'SUI' | 'MEWS' | 'USDC';
  feeUsdCents: number;
  prices?: { sui?: number; mews?: number; usdc?: number };
  pricesTimestamp?: number;
}): Promise<BadgeGameFeePurchaseResult> {
  const { playerAddress, paymentToken, feeUsdCents, prices: frontendPrices, pricesTimestamp } = params;
  if (!playerAddress?.startsWith('0x')) {
    return { success: false, error: 'playerAddress is required and must be a valid Sui address (0x...)' };
  }
  if (feeUsdCents <= 0) {
    return { success: false, error: 'feeUsdCents must be positive when building a payment transaction' };
  }

  const totalUSD = feeUsdCents / 100;

  let conversionResult: { success: boolean; tokenAmount?: string; error?: string };

  if (frontendPrices && pricesTimestamp) {
    const priceAge = Date.now() - pricesTimestamp;
    const maxPriceAge = 5 * 60 * 1000;
    if (priceAge < maxPriceAge && frontendPrices[paymentToken.toLowerCase() as 'sui' | 'mews' | 'usdc']) {
      const tokenPrice = frontendPrices[paymentToken.toLowerCase() as 'sui' | 'mews' | 'usdc']!;
      const tokenDecimals =
        paymentToken === 'SUI' ? 9 : paymentToken === 'USDC' ? 6 : getMEWSDecimals();
      const humanReadableTokenAmount = totalUSD / tokenPrice;
      const tokenAmount = humanReadableTokenAmount * Math.pow(10, tokenDecimals);
      const tokenAmountRounded = Math.round(tokenAmount);
      conversionResult = { success: true, tokenAmount: tokenAmountRounded.toString() };
    } else {
      conversionResult = await priceConverter.convertUSDToToken(totalUSD, paymentToken);
    }
  } else {
    conversionResult = await priceConverter.convertUSDToToken(totalUSD, paymentToken);
  }

  if (!conversionResult.success || !conversionResult.tokenAmount) {
    return {
      success: false,
      error: conversionResult.error || 'Failed to convert USD to token amount',
    };
  }

  const tokenDecimals =
    paymentToken === 'SUI' ? 9 : paymentToken === 'USDC' ? 6 : getMEWSDecimals();
  const humanReadableAmount = parseFloat(conversionResult.tokenAmount) / Math.pow(10, tokenDecimals);
  const totalTokenDisplay = paymentToken === 'USDC' ? humanReadableAmount.toFixed(2) : humanReadableAmount.toFixed(6);

  const adminAddress = getAdminWalletService().getAddress();
  const buildResult = await buildBatchViaChannel(
    {
      operations: [
        {
          operationId: 'channel-payment',
          params: {
            senderAddress: playerAddress,
            recipientAddress: adminAddress,
            tokenType: paymentToken,
            amount: conversionResult.tokenAmount,
          },
        },
      ],
    },
    undefined
  );

  if (!buildResult.success || !buildResult.transactions?.[0]) {
    return {
      success: false,
      error: buildResult.errors?.[0] ?? buildResult.error ?? 'Failed to build badge fee payment transaction',
    };
  }

  return {
    success: true,
    requiresPayment: true,
    transaction: buildResult.transactions[0],
    gasEstimate: buildResult.gasEstimateMist != null ? String(buildResult.gasEstimateMist) : undefined,
    feeUsdCents,
    totalUSD: totalUSD.toFixed(2),
    totalToken: conversionResult.tokenAmount,
    totalTokenDisplay,
    paymentToken,
    playerAddress,
  };
}

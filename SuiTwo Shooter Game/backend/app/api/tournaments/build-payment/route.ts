// ==========================================
// Build Tournament Creation Payment (Player-Signed)
// Builds an unsigned Channel PTB where the player pays the game admin wallet
// for: creation fee + starting ante + custom reward cost (if any).
// Supports SUI, MEWS, USDC (same as store flows).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { calculateRewardCost, calculateTotalPayment, TournamentRewardConfig } from '@/lib/services/tournament/cost/reward-cost-calculator';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { buildBatchViaChannel, buildPlatformCallOptions, platformTournamentClient } from '@/lib/services/platform/client/platform-client';
import { getMEWSDecimals, priceConverter } from '@/lib/services/payments/converter/price-converter';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const buildPaymentBreakdown = (
      gameAdminTournamentCreationFeeUSDCents: number,
      startingAnteUSDCents: number,
      rewardCostUSDCents: number,
      totalUSDCents: number,
      platformEventFeeUSDCents: number | null,
      vaultCreationFeeUSDCents: number | null
    ) => ({
      platformTournamentEventCreationFee: {
        usdCents: platformEventFeeUSDCents,
        description:
          'Estimated platform tournament event creation protocol fee (from platform tournament fee lookup).',
      },
      platformVaultCreationFee: {
        usdCents: vaultCreationFeeUSDCents,
        description:
          'Estimated platform vault creation protocol fee (from platform vault fee lookup).',
      },
      gameAdminTournamentCreationFee: {
        usdCents: gameAdminTournamentCreationFeeUSDCents,
        description:
          'Game admin tournament creation fee (app/business fee) charged to the player.',
      },
      playerTotalPaymentFee: {
        usdCents: totalUSDCents,
        description:
          'Total amount the player pays in this build-payment flow (game admin fee + starting ante + reward config cost).',
      },
      // Backward-compatible keys (prefer explicit keys above)
      platformEventFee: {
        usdCents: platformEventFeeUSDCents,
        description:
          'Estimated platform event creation protocol fee (from platform tournament fee lookup).',
      },
      vaultCreationFee: {
        usdCents: vaultCreationFeeUSDCents,
        description:
          'Estimated platform vault creation protocol fee (from platform vault fee lookup).',
      },
      gameAdminFee: {
        usdCents: gameAdminTournamentCreationFeeUSDCents,
        description:
          'Game admin tournament creation fee (app/business fee) charged to the player.',
      },
      playerPaymentFee: {
        usdCents: totalUSDCents,
        description:
          'Total amount the player pays in this build-payment flow (game admin fee + starting ante + reward config cost).',
      },
      gameCreationFee: {
        usdCents: gameAdminTournamentCreationFeeUSDCents,
        description: 'Game/app tournament creation fee (business fee), not the platform protocol fee.',
      },
      startingAnte: {
        usdCents: startingAnteUSDCents,
        description: 'Starting ante that seeds the tournament prize pool.',
      },
      rewardConfigCost: {
        usdCents: rewardCostUSDCents,
        description: 'Additional cost from custom reward configuration.',
      },
    });

    const toRawByUsd = (
      usdCents: number,
      token: 'SUI' | 'MEWS' | 'USDC',
      prices: { sui: number; mews: number; usdc: number }
    ): string => {
      const usd = Math.max(0, usdCents) / 100;
      const tokenPrice = token === 'SUI' ? prices.sui : token === 'MEWS' ? prices.mews : prices.usdc;
      if (!(tokenPrice > 0)) throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, `Invalid ${token} price`);
      const decimals = token === 'SUI' ? 9 : token === 'MEWS' ? getMEWSDecimals() : 6;
      return Math.round((usd / tokenPrice) * Math.pow(10, decimals)).toString();
    };

    const body = await getRequestBody<{
      playerAddress: string;
      paymentToken: 'SUI' | 'MEWS' | 'USDC';
      startingAnteUSDCents: number;
      rewardConfig: TournamentRewardConfig | null;
      badgeDiscount?: number;
    }>(request);

    const { playerAddress, paymentToken, startingAnteUSDCents, rewardConfig, badgeDiscount } = body;

    // Basic validation
    if (!playerAddress) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'playerAddress is required');
    }
    PlatformValidators.validateAddress(playerAddress);

    if (!paymentToken || !['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'paymentToken must be SUI, MEWS, or USDC'
      );
    }

    if (startingAnteUSDCents === undefined || typeof startingAnteUSDCents !== 'number' || startingAnteUSDCents < 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'startingAnteUSDCents must be a non-negative number'
      );
    }

    // Validate rewardConfig if provided (reuse calculate-reward-cost rules)
    if (rewardConfig) {
      if (!rewardConfig.rewardDepth || rewardConfig.rewardDepth < 1 || rewardConfig.rewardDepth > 255) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'rewardDepth must be between 1 and 255'
        );
      }
      if (!rewardConfig.poolDepth || rewardConfig.poolDepth < 1 || rewardConfig.poolDepth > 255) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'poolDepth must be between 1 and 255'
        );
      }
      const poolDist = rewardConfig.poolDistribution ?? [];
      const poolSum = poolDist.reduce((sum, pct) => sum + pct, 0);
      if (Math.abs(poolSum - 100) > 0.01) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'poolDistribution must sum to 100'
        );
      }
    }

    PlatformLogger.info('🏆 [BUILD PAYMENT] Building player payment for tournament creation', {
      playerAddress,
      paymentToken,
      startingAnteUSDCents,
      hasRewardConfig: !!rewardConfig,
    });

    // 1) Compute reward cost (custom rewards only; default rewards = 0)
    const rewardCostResult = await calculateRewardCost(
      rewardConfig,
      playerAddress,
      badgeDiscount
    );

    // 2) Resolve creation fee (USD or token mode) using one price snapshot.
    const pricesResult = await priceConverter.getTokenPrices();
    if (!pricesResult.success || !pricesResult.prices) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        pricesResult.error || 'Failed to get token prices for payment quote'
      );
    }
    const prices = pricesResult.prices;
    const quoteTimestamp = pricesResult.timestamp ?? Date.now();
    const mistToUsdCents = (mist: number): number => Math.round((mist / 1_000_000_000) * prices.sui * 100);

    // 2a) Fetch platform protocol fees (event + vault) and estimate USD cents.
    let platformEventFeeUSDCents: number | null = null;
    let vaultCreationFeeUSDCents: number | null = null;
    try {
      const [tournamentFeeRes, vaultFeeRes] = await Promise.all([
        platformTournamentClient.getTournamentFee(buildPlatformCallOptions(request)),
        platformTournamentClient.getVaultFee(buildPlatformCallOptions(request)),
      ]);
      if (tournamentFeeRes.success && typeof tournamentFeeRes.tournamentCreationFeeMist === 'number') {
        platformEventFeeUSDCents = mistToUsdCents(tournamentFeeRes.tournamentCreationFeeMist);
      }
      if (vaultFeeRes.success && typeof vaultFeeRes.vaultCreationFeeMist === 'number') {
        vaultCreationFeeUSDCents = mistToUsdCents(vaultFeeRes.vaultCreationFeeMist);
      }
    } catch (error) {
      PlatformLogger.warn('🏆 [BUILD PAYMENT] Unable to fetch platform fee estimates', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const gameConfigResult = await getGameConfigService().getConfig();
    const cfg = gameConfigResult.success ? gameConfigResult.config : undefined;
    let gameAdminTournamentCreationFeeUSDCents: number | null = null;
    let creationFeeModeUsed: 'usd' | 'token' = 'usd';
    let creationFeeTokenUsed: 'SUI' | 'MEWS' | 'USDC' | undefined;
    let creationFeeTokenAmountUsed: number | undefined;
    if (cfg) {
      if (
        (cfg.tournamentCreationFeeToken === 'SUI' || cfg.tournamentCreationFeeToken === 'MEWS' || cfg.tournamentCreationFeeToken === 'USDC') &&
        typeof cfg.tournamentCreationFeeTokenAmount === 'number' &&
        cfg.tournamentCreationFeeTokenAmount >= 0
      ) {
        creationFeeModeUsed = 'token';
        creationFeeTokenUsed = cfg.tournamentCreationFeeToken;
        creationFeeTokenAmountUsed = cfg.tournamentCreationFeeTokenAmount;
        const feePrice =
          creationFeeTokenUsed === 'SUI' ? prices.sui : creationFeeTokenUsed === 'MEWS' ? prices.mews : prices.usdc;
        gameAdminTournamentCreationFeeUSDCents = Math.round(creationFeeTokenAmountUsed * feePrice * 100);
      } else if (typeof cfg.tournamentCreationFeeUsdCents === 'number' && cfg.tournamentCreationFeeUsdCents >= 0) {
        gameAdminTournamentCreationFeeUSDCents = Math.round(cfg.tournamentCreationFeeUsdCents);
      }
    }

    if (gameAdminTournamentCreationFeeUSDCents == null) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Tournament creation fee is not configured. Set tournamentCreationFeeUsdCents or tournamentCreationFeeToken + tournamentCreationFeeTokenAmount in game config.'
      );
    }

    // 3) Compute total payment in USD cents: creation fee + ante + reward cost
    const totalPayment = calculateTotalPayment(
      startingAnteUSDCents,
      rewardCostResult.totalCostUSDCents,
      gameAdminTournamentCreationFeeUSDCents
    );

    const { creationFeeUSDCents, rewardCostUSDCents, totalUSDCents, totalUSD } = totalPayment;

    PlatformLogger.info('🏆 [BUILD PAYMENT] Total payment calculated', {
      creationFeeUSDCents,
      startingAnteUSDCents,
      rewardCostUSDCents,
      totalUSDCents,
      totalUSD,
      paymentToken,
    });

    if (totalUSDCents <= 0) {
      return {
        success: true,
        // No payment needed (free tournament) – nothing to sign
        requiresPayment: false,
        payment: {
          creationFeeUSDCents,
          startingAnteUSDCents,
          rewardCostUSDCents,
          totalUSDCents,
          totalUSD,
        },
        paymentBreakdown: buildPaymentBreakdown(
          creationFeeUSDCents,
          startingAnteUSDCents,
          rewardCostUSDCents,
          totalUSDCents,
          platformEventFeeUSDCents,
          vaultCreationFeeUSDCents
        ),
      };
    }

    // 4) Convert USD cents to payment token using the same quote snapshot.
    const totalTokenAmountRaw = toRawByUsd(totalUSDCents, paymentToken, prices);

    // 5) Build Channel PTB: player pays game admin (Channel is the payment service; SUI only for gas)
    const adminWallet = getAdminWalletService();
    const adminAddress = adminWallet.getAddress();
    const opts = buildPlatformCallOptions();

    const buildRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'channel-payment',
            params: {
              senderAddress: playerAddress,
              recipientAddress: adminAddress,
              tokenType: paymentToken,
              amount: totalTokenAmountRaw,
            },
          },
        ],
      },
      opts
    );

    if (!buildRes.success || !buildRes.transactions?.length) {
      const err = buildRes.error || buildRes.errors?.[0] || 'Failed to build player payment transaction';
      PlatformLogger.error('🏆 [BUILD PAYMENT] Channel build failed', { error: err });
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, err);
    }

    const transactionBytesBase64 = buildRes.transactions[0];

    return {
      success: true,
      requiresPayment: true,
      transactionBytesBase64,
      paymentToken,
      payment: {
        creationFeeUSDCents,
        startingAnteUSDCents,
        rewardCostUSDCents,
        totalUSDCents,
        totalUSD,
      },
      paymentBreakdown: buildPaymentBreakdown(
        creationFeeUSDCents,
        startingAnteUSDCents,
        rewardCostUSDCents,
        totalUSDCents,
        platformEventFeeUSDCents,
        vaultCreationFeeUSDCents
      ),
      quote: {
        timestamp: quoteTimestamp,
        creationFeeModeUsed,
        ...(creationFeeTokenUsed ? { creationFeeTokenUsed } : {}),
        ...(creationFeeTokenAmountUsed != null ? { creationFeeTokenAmountUsed } : {}),
        prices: {
          SUI: prices.sui,
          MEWS: prices.mews,
          USDC: prices.usdc,
        },
      },
      totalTokenAmountRaw,
    };
  }
);


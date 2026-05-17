// ==========================================
// Store Purchase API Route
// Builds unsigned *payment* transaction for frontend to sign.
// Fulfillment is included in the same player-signed cart PTB (supply commit + reservoir grants); see Channel op store-cart-purchase.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { priceConverter } from '@/lib/services/payments/converter/price-converter';
import { calculateTotalUSDFromStockroomOffers } from '@/lib/services/store/stockroom-pricing';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';
import { getDiscounts } from '@/lib/services/badge/utilities/badge-utilities';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { getMEWSDecimals } from '@/lib/services/payments/converter/price-converter';
import { buildBatchViaChannel } from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';
import { callPlatformBackend, buildPlatformCallOptions, getCorridorCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Purchase API route called', {
      timestamp: new Date().toISOString(),
    });
    
    const body = await getRequestBody<{
      playerAddress: string;
      lines: Array<{ offerId: string; redeemCount: number }>;
      paymentToken: string;
      badgeDiscount?: number; // Optional discount percentage from frontend (for validation)
      prices?: { sui?: number; mews?: number; usdc?: number }; // Prices used by frontend (for consistency)
      pricesTimestamp?: number; // Timestamp of prices (for validation)
    }>(request);
    const { playerAddress, lines, paymentToken, badgeDiscount, prices: frontendPrices, pricesTimestamp } = body;
    
    PlatformLogger.info('Purchase request received', {
      playerAddress,
      lineCount: Array.isArray(lines) ? lines.length : 0,
      paymentToken,
      frontendBadgeDiscount: badgeDiscount,
    });

    // Validate required fields
    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    const hasLines = Array.isArray(lines) && lines.length > 0;
    if (!hasLines) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'lines[] is required and must not be empty'
      );
    }

    if (!paymentToken || !['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'paymentToken must be SUI, MEWS, or USDC'
      );
    }

    // Validate player address format
    PlatformValidators.validateAddress(playerAddress);

    // Validate offerId-based lines (MVP)
    if (hasLines) {
      for (const line of lines) {
        const offerId = typeof line?.offerId === 'string' ? line.offerId.trim() : '';
        const redeemCount = typeof line?.redeemCount === 'number' ? line.redeemCount : Number(line?.redeemCount ?? 0);
        if (!offerId) {
          throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Each cart line must have a valid offerId');
        }
        if (!Number.isFinite(redeemCount) || redeemCount < 1) {
          throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Each cart line must have redeemCount >= 1');
        }
        if (redeemCount > 100) {
          throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'redeemCount per offer cannot exceed 100');
        }
      }
    }

    PlatformLogger.info('Building purchase transaction', {
      playerAddress,
      lineCount: lines.length,
      paymentToken,
    });

    // Total USD from Stockroom SKUs (admin → Stockroom), not Provisions catalog usdPrice
    const priceResult = await calculateTotalUSDFromStockroomOffers(lines);
    if (!priceResult.success || priceResult.totalUSD === undefined) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        priceResult.error || 'Failed to calculate total price'
      );
    }
    let totalUSD = priceResult.totalUSD;
    
    // Verify and apply badge discount
    // Use same logic as merge route: call getBadge() directly and check for badgeId AND tier
    // This is more reliable than checking hasBadge() first, which may have parsing issues
    let appliedDiscount = 0;
    try {
      const badgeService = getBadgeService();
      const badgeData = await badgeService.getBadge(playerAddress);
      
      PlatformLogger.info('🔍 [PURCHASE] Badge data retrieved', {
        playerAddress,
        badgeExists: !!badgeData,
        badgeId: badgeData?.badgeId,
        badgeTier: badgeData?.tier,
        frontendSentDiscount: badgeDiscount,
      });
      
      // Tier 0 is valid (truthy check incorrectly skipped tier 0)
      if (
        badgeData &&
        badgeData.badgeId &&
        typeof badgeData.tier === 'number' &&
        Number.isFinite(badgeData.tier) &&
        badgeData.tier >= 0
      ) {
        const gameConfigRes = await getGameConfigService().getConfig();
        const badgeConfig = gameConfigRes.config?.badgeConfig;
        const actualDiscounts = getDiscounts(badgeData.tier, badgeConfig);
        const actualStoreDiscount = actualDiscounts.store || 0;
        
        // Always use backend-calculated discount for security (ignore frontend value)
        appliedDiscount = actualStoreDiscount;
        
        // Log if frontend sent a different value
        if (badgeDiscount !== undefined && Math.abs(badgeDiscount - actualStoreDiscount) > 0.01) {
          PlatformLogger.warn('Badge discount mismatch - using backend value', {
            playerAddress,
            frontendDiscount: badgeDiscount,
            backendDiscount: actualStoreDiscount,
            tier: badgeData.tier,
          });
        }
        
        // Apply discount to total USD
        if (appliedDiscount > 0) {
          const discountMultiplier = 1 - (appliedDiscount / 100);
          totalUSD = totalUSD * discountMultiplier;
          PlatformLogger.info('✅ [PURCHASE] Badge discount applied', {
            playerAddress,
            tier: badgeData.tier,
            discount: appliedDiscount,
            originalTotal: priceResult.totalUSD,
            discountedTotal: totalUSD,
          });
        } else {
          PlatformLogger.info('✅ [PURCHASE] Badge found but no discount for tier', {
            playerAddress,
            tier: badgeData.tier,
            storeDiscount: actualStoreDiscount,
          });
        }
      } else {
        PlatformLogger.info('✅ [PURCHASE] No valid badge found - no discount applied', {
          playerAddress,
          badgeExists: !!badgeData,
          hasBadgeId: !!badgeData?.badgeId,
          hasTier: badgeData?.tier !== undefined && badgeData?.tier !== null,
        });
        appliedDiscount = 0;
      }
    } catch (error) {
      PlatformLogger.warn('Error getting badge discount for purchase', error);
      // Continue with 0% discount if badge check fails
      appliedDiscount = 0;
    }

    // Convert USD to token amount
    // Use frontend prices if provided and recent (within 5 minutes) to ensure consistency
    // Otherwise fetch fresh prices from backend
    let conversionResult: { success: boolean; tokenAmount?: string; error?: string };
    
    if (frontendPrices && pricesTimestamp) {
      const priceAge = Date.now() - pricesTimestamp;
      const maxPriceAge = 5 * 60 * 1000; // 5 minutes (same as cache duration)
      
      // Use frontend prices if they're recent (within cache window)
      if (priceAge < maxPriceAge && frontendPrices[paymentToken.toLowerCase() as 'sui' | 'mews' | 'usdc']) {
        const tokenPrice = frontendPrices[paymentToken.toLowerCase() as 'sui' | 'mews' | 'usdc']!;
        
        // Simple calculation: USD / MEWS price = MEWS amount
        // Then convert to raw units with correct decimals
        const tokenType = paymentToken.toUpperCase() as 'SUI' | 'MEWS' | 'USDC';
        const tokenDecimals = tokenType === 'SUI' ? 9 : (tokenType === 'USDC' ? 6 : (tokenType === 'MEWS' ? getMEWSDecimals() : 9));
        
        // Calculate: USD amount / token price = token amount (in human-readable units)
        const humanReadableTokenAmount = totalUSD / tokenPrice;
        // Convert to raw units: multiply by 10^decimals
        const tokenAmount = humanReadableTokenAmount * Math.pow(10, tokenDecimals);
        const tokenAmountRounded = Math.round(tokenAmount);
        
        PlatformLogger.info('✅ [PURCHASE] Simple price calculation', {
          paymentToken,
          tokenPrice,
          totalUSD,
          rawCalculation: totalUSD / tokenPrice,
          humanReadableAmount: humanReadableTokenAmount.toFixed(6),
          rawAmount: tokenAmountRounded.toString(),
          tokenDecimals,
          calculation: `${totalUSD} / ${tokenPrice} = ${humanReadableTokenAmount.toFixed(6)} ${tokenType}`,
          priceSource: 'frontend',
          priceAge: `${Math.round(priceAge / 1000)}s`,
        });
        
        conversionResult = {
          success: true,
          tokenAmount: tokenAmountRounded.toString(),
        };
      } else {
        // Frontend prices are stale or missing, fetch fresh from backend
        PlatformLogger.info('⚠️ [PURCHASE] Frontend prices stale or missing, fetching fresh prices', {
          priceAge: priceAge ? `${Math.round(priceAge / 1000)}s` : 'N/A',
          hasPrice: !!frontendPrices?.[paymentToken.toLowerCase() as 'sui' | 'mews' | 'usdc'],
        });
        
        conversionResult = await priceConverter.convertUSDToToken(
          totalUSD,
          paymentToken as 'SUI' | 'MEWS' | 'USDC'
        );
      }
    } else {
      // No frontend prices provided, fetch from backend
      conversionResult = await priceConverter.convertUSDToToken(
        totalUSD,
        paymentToken as 'SUI' | 'MEWS' | 'USDC'
      );
    }

    if (!conversionResult.success || !conversionResult.tokenAmount) {
      throw new PlatformError(
        PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
        conversionResult.error || 'Failed to convert USD to token amount'
      );
    }

    // Calculate human-readable amount for display (matches wallet confirmation)
    const tokenType = paymentToken.toUpperCase() as 'SUI' | 'MEWS' | 'USDC';
    const tokenDecimals = tokenType === 'SUI' ? 9 : (tokenType === 'USDC' ? 6 : (tokenType === 'MEWS' ? getMEWSDecimals() : 9));
    
    // Convert raw amount back to human-readable for verification
    const humanReadableAmount = parseFloat(conversionResult.tokenAmount) / Math.pow(10, tokenDecimals);
    
    // Format based on token type
    let totalTokenDisplay: string;
    if (tokenType === 'USDC') {
      totalTokenDisplay = humanReadableAmount.toFixed(2);
    } else {
      totalTokenDisplay = humanReadableAmount.toFixed(6);
    }
    
    PlatformLogger.info('✅ [PURCHASE] Final amount for wallet', {
      paymentToken: tokenType,
      rawAmount: conversionResult.tokenAmount,
      humanReadable: humanReadableAmount.toFixed(6),
      displayAmount: totalTokenDisplay,
      tokenDecimals,
      expectedWalletDisplay: `${totalTokenDisplay} ${tokenType}`, // This should match wallet confirmation
    });

    // Get admin address for payment recipient (game admin wallet)
    // Prefer explicit recipient address env var so payment routing is not coupled to the admin signer key.
    // This also prevents accidental "pay yourself" transactions when GAME_WALLET_PRIVATE_KEY is misconfigured.
    const envRecipient =
      (process.env.STORE_PAYMENT_RECIPIENT_ADDRESS || process.env.GAME_PAYMENT_RECIPIENT_ADDRESS || process.env.GAME_ADMIN_ADDRESS || '').trim();
    const adminWallet = getAdminWalletService();
    const adminAddress = envRecipient && envRecipient.startsWith('0x') ? envRecipient : adminWallet.getAddress();

    if (adminAddress.toLowerCase() === playerAddress.toLowerCase()) {
      PlatformLogger.error('Invalid store payment recipient: recipient equals player', {
        playerAddress,
        recipientAddress: adminAddress,
        usedEnvRecipient: !!envRecipient,
        note: 'Store payment must be sent to a separate admin wallet address. Check STORE_PAYMENT_RECIPIENT_ADDRESS or GAME_WALLET_PRIVATE_KEY.',
      });
      throw new PlatformError(
        PlatformErrorCode.CONFIG_INVALID,
        'Store payment recipient address is misconfigured (recipient equals player). Set STORE_PAYMENT_RECIPIENT_ADDRESS (recommended) or fix GAME_WALLET_PRIVATE_KEY.'
      );
    }

    // Build a single player-signed cart purchase PTB via platform Channel:
    // split payment across lines + Stockroom paid checkout (`purchase_*_paid`) in one transaction.
    const corridorCap = getCorridorCapabilityObjectIdFromEnv();
    if (!corridorCap?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_INVALID,
        'CORRIDOR_CAPABILITY_OBJECT_ID (or _TESTNET/_MAINNET) is required for paid checkout.'
      );
    }

    const cartLines: Array<{ offerId: string; redeemCount: number }> =
      lines.map((l) => ({ offerId: String(l.offerId).trim(), redeemCount: Number(l.redeemCount) }));

    PlatformLogger.info('Building single-transaction cart purchase via Channel', {
      playerAddress,
      paymentToken,
      totalTokenAmount: conversionResult.tokenAmount,
      cartLineCount: cartLines.length,
    });

    const buildResult = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'store-cart-purchase',
            params: {
              senderAddress: playerAddress,
              // Admin address no longer needed: Reservoir transfers payment to `ReservoirSystem.admin` inside the paid purchase.
              tokenType: paymentToken as 'SUI' | 'MEWS' | 'USDC',
              amount: conversionResult.tokenAmount,
              corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv(),
              playerAddress,
              lines: cartLines,
            },
          },
        ],
      },
      buildPlatformCallOptions(request)
    );

    if (!buildResult.success || !buildResult.transactions?.[0]) {
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        buildResult.errors?.[0] ?? buildResult.error ?? 'Failed to build purchase transaction'
      );
    }

    const transaction = buildResult.transactions[0];
    const gasEstimate = buildResult.gasEstimateMist != null ? String(buildResult.gasEstimateMist) : undefined;

    PlatformLogger.info('Store cart purchase transaction built successfully', {
      playerAddress,
      totalUSD: totalUSD.toFixed(2),
      originalTotalUSD: priceResult.totalUSD.toFixed(2),
      discount: appliedDiscount,
      totalToken: conversionResult.tokenAmount,
      totalTokenDisplay,
    });

    return {
      success: true,
      // Backward-compatible field name used by the existing frontend store flow.
      // This is a single cart PTB: payment + stockroom redeem + reservoir grant.
      transaction,
      gasEstimate,
      totalUSD: totalUSD.toFixed(2),
      originalTotalUSD: priceResult.totalUSD.toFixed(2),
      discountApplied: appliedDiscount,
      totalToken: conversionResult.tokenAmount,
      totalTokenDisplay, // Human-readable formatted amount (matches wallet confirmation)
      paymentToken,
      lines: cartLines,
      playerAddress,
    };
  },
  {
    logRequest: true,
  }
);



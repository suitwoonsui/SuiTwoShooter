// ==========================================
// Get Payment Coin API Route
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';

/**
 * GET /api/badges/payment-coin?address={address}&requiredAmount={amount}
 * Get a SUI coin ID for payment
 * 
 * Query parameters:
 * - address: Player's wallet address
 * - requiredAmount: Required amount in MIST (1 SUI = 1,000,000,000 MIST)
 * 
 * Returns:
 * {
 *   success: boolean,
 *   coinId?: string,
 *   needsMerge?: boolean,
 *   error?: string
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const requiredAmountParam = searchParams.get('requiredAmount');

    // Validate required fields
    if (!address) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'address query parameter is required'
      );
    }

    if (!requiredAmountParam) {
      throw new Error('requiredAmount query parameter is required');
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Invalid address format. Must be a valid Sui address (0x followed by 64 hex characters)'
      );
    }

    const requiredAmountMist = BigInt(requiredAmountParam);

    BadgeLogger.info('Payment coin request', {
      address,
      requiredAmountMist: requiredAmountMist.toString(),
    });

    // Get Sui client
    const config = getConfig();
    const client = new SuiClient({ url: getFullnodeUrl(config.sui.network) });

    // Get all SUI coins
    const coins = await client.getCoins({
      owner: address,
      coinType: '0x2::sui::SUI',
    });

    if (!coins.data || coins.data.length === 0) {
      return {
        success: false,
        error: 'No SUI coins found in wallet',
      };
    }

    // Calculate total balance
    let totalBalance = BigInt(0);
    coins.data.forEach(coin => {
      totalBalance += BigInt(coin.balance);
    });

    // Check if balance is sufficient
    if (totalBalance < requiredAmountMist) {
      const requiredSui = Number(requiredAmountMist) / 1_000_000_000;
      return {
        success: false,
        error: `Insufficient SUI balance. Required: ${requiredSui} SUI`,
      };
    }

    // Prefer smaller coins that are just enough (to avoid using large coins unnecessarily)
    // Sort coins by balance (smallest first) and find the smallest coin with sufficient balance
    const sortedCoins = [...coins.data].sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      if (balanceA < balanceB) return -1;
      if (balanceA > balanceB) return 1;
      return 0;
    });

    // Find the smallest coin with sufficient balance
    const sufficientCoin = sortedCoins.find(coin => BigInt(coin.balance) >= requiredAmountMist);
    if (sufficientCoin) {
      return {
        success: true,
        coinId: sufficientCoin.coinObjectId,
      };
    }

    // Otherwise, we need to merge coins
    // For now, we'll use the first coin and let the transaction handle merging
    return {
      success: true,
      coinId: coins.data[0].coinObjectId,
      needsMerge: true,
    };
  }
);


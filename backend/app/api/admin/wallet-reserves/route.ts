// ==========================================
// Admin Wallet Reserves API Route
// ==========================================
// Returns all token balances for the admin wallet
// Used by the admin dashboard to monitor reserves

import { NextRequest } from 'next/server';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { getConfig } from '@/config/config';
import { withApiHandler } from '@/lib/api/api-handler';

// Minimum reserve thresholds (in raw token units)
const MIN_SUI_RESERVE = 1_000_000_000; // 1 SUI (9 decimals)
const MIN_MEWS_RESERVE = 100_000_000_000; // 100 MEWS (9 decimals, adjust as needed)
const MIN_USDC_RESERVE = 10_000_000; // 10 USDC (6 decimals)

export interface WalletReserve {
  token: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  isLow: boolean;
  minReserve: string;
  minReserveFormatted: string;
}

export interface WalletReservesResponse {
  success: boolean;
  address: string;
  reserves: WalletReserve[];
  hasWarnings: boolean;
  timestamp: string;
}

/**
 * GET /api/admin/wallet-reserves
 * Get admin wallet token reserves
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const adminWallet = getAdminWalletService();
    const config = getConfig();
    const address = adminWallet.getAddress();
    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    const reserves: WalletReserve[] = [];
    let hasWarnings = false;

    // Get SUI balance
    try {
      const suiCoins = await client.getCoins({
        owner: address,
        coinType: '0x2::sui::SUI',
      });
      const suiBalance = suiCoins.data.reduce(
        (sum, coin) => sum + BigInt(coin.balance),
        BigInt(0)
      );
      const isLow = suiBalance < BigInt(MIN_SUI_RESERVE);
      if (isLow) hasWarnings = true;

      reserves.push({
        token: 'SUI',
        balance: suiBalance.toString(),
        balanceFormatted: formatBalance(suiBalance, 9),
        decimals: 9,
        isLow,
        minReserve: MIN_SUI_RESERVE.toString(),
        minReserveFormatted: formatBalance(BigInt(MIN_SUI_RESERVE), 9),
      });
    } catch (error) {
      reserves.push({
        token: 'SUI',
        balance: '0',
        balanceFormatted: '0',
        decimals: 9,
        isLow: true,
        minReserve: MIN_SUI_RESERVE.toString(),
        minReserveFormatted: formatBalance(BigInt(MIN_SUI_RESERVE), 9),
      });
      hasWarnings = true;
    }

    // Get MEWS balance
    const mewsTokenTypeId = config.token.mewsTokenTypeId;
    if (mewsTokenTypeId) {
      try {
        const mewsCoins = await client.getCoins({
          owner: address,
          coinType: mewsTokenTypeId,
        });
        const mewsBalance = mewsCoins.data.reduce(
          (sum, coin) => sum + BigInt(coin.balance),
          BigInt(0)
        );
        const isLow = mewsBalance < BigInt(MIN_MEWS_RESERVE);
        if (isLow) hasWarnings = true;

        reserves.push({
          token: 'MEWS',
          balance: mewsBalance.toString(),
          balanceFormatted: formatBalance(mewsBalance, 9),
          decimals: 9,
          isLow,
          minReserve: MIN_MEWS_RESERVE.toString(),
          minReserveFormatted: formatBalance(BigInt(MIN_MEWS_RESERVE), 9),
        });
      } catch (error) {
        reserves.push({
          token: 'MEWS',
          balance: '0',
          balanceFormatted: '0',
          decimals: 9,
          isLow: true,
          minReserve: MIN_MEWS_RESERVE.toString(),
          minReserveFormatted: formatBalance(BigInt(MIN_MEWS_RESERVE), 9),
        });
        hasWarnings = true;
      }
    } else {
      reserves.push({
        token: 'MEWS',
        balance: '0',
        balanceFormatted: 'Not configured',
        decimals: 9,
        isLow: true,
        minReserve: MIN_MEWS_RESERVE.toString(),
        minReserveFormatted: formatBalance(BigInt(MIN_MEWS_RESERVE), 9),
      });
      hasWarnings = true;
    }

    // Get USDC balance
    const usdcTokenTypeId = config.token.usdcTokenTypeId;
    if (usdcTokenTypeId) {
      try {
        const usdcCoins = await client.getCoins({
          owner: address,
          coinType: usdcTokenTypeId,
        });
        const usdcBalance = usdcCoins.data.reduce(
          (sum, coin) => sum + BigInt(coin.balance),
          BigInt(0)
        );
        const isLow = usdcBalance < BigInt(MIN_USDC_RESERVE);
        if (isLow) hasWarnings = true;

        reserves.push({
          token: 'USDC',
          balance: usdcBalance.toString(),
          balanceFormatted: formatBalance(usdcBalance, 6),
          decimals: 6,
          isLow,
          minReserve: MIN_USDC_RESERVE.toString(),
          minReserveFormatted: formatBalance(BigInt(MIN_USDC_RESERVE), 6),
        });
      } catch (error) {
        reserves.push({
          token: 'USDC',
          balance: '0',
          balanceFormatted: '0',
          decimals: 6,
          isLow: true,
          minReserve: MIN_USDC_RESERVE.toString(),
          minReserveFormatted: formatBalance(BigInt(MIN_USDC_RESERVE), 6),
        });
        hasWarnings = true;
      }
    } else {
      reserves.push({
        token: 'USDC',
        balance: '0',
        balanceFormatted: 'Not configured',
        decimals: 6,
        isLow: false, // USDC is optional
        minReserve: MIN_USDC_RESERVE.toString(),
        minReserveFormatted: formatBalance(BigInt(MIN_USDC_RESERVE), 6),
      });
    }

    return {
      success: true,
      address,
      reserves,
      hasWarnings,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Format balance with decimals for display
 */
function formatBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const remainder = balance % divisor;
  
  // Format with up to 4 decimal places
  const decimalStr = remainder.toString().padStart(decimals, '0').slice(0, 4);
  const trimmedDecimal = decimalStr.replace(/0+$/, '');
  
  if (trimmedDecimal) {
    return `${whole.toLocaleString()}.${trimmedDecimal}`;
  }
  return whole.toLocaleString();
}

// Add OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Wallet',
    },
  });
}

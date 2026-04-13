// ==========================================
// Admin Wallet Reserves API Route (Game)
// ==========================================
// Returns token balances for the game admin wallet.
// - With X-Admin-Wallet header: verifies match, returns reserves (browser flow).
// - Without header: uses address from GAME_WALLET_PRIVATE_KEY (build, CI, monitoring).

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight, getCorsHeaders } from '@/lib/cors';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  callPlatformSonarBatch,
  type PlatformSonarBatchItemResult,
} from '@/lib/services/platform/client/platform-client';
import { withApiHandler } from '@/lib/api/api-handler';

// Minimum reserve thresholds (in raw token units)
const MIN_SUI_RESERVE = 1_000_000_000; // 1 SUI (9 decimals)
const MIN_MEWS_RESERVE = 100_000_000_000; // 100 MEWS (9 decimals)
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

function formatBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const remainder = balance % divisor;
  const decimalStr = remainder.toString().padStart(decimals, '0').slice(0, 4);
  const trimmedDecimal = decimalStr.replace(/0+$/, '');
  if (trimmedDecimal) {
    return `${whole.toLocaleString()}.${trimmedDecimal}`;
  }
  return whole.toLocaleString();
}

/**
 * GET /api/admin/wallet-reserves
 * Get reserves for the game admin wallet.
 * - With X-Admin-Wallet header: verifies it matches the configured admin, returns reserves.
 * - Without header: uses admin address from GAME_WALLET_PRIVATE_KEY (for build, CI, monitoring).
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const adminWallet = getAdminWalletService();
    const expectedAdmin = adminWallet.getAddress().toLowerCase();

    const headerAddress =
      (request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '').trim();

    // Use header if provided and valid; otherwise fall back to env-derived admin (no browser needed)
    let address: string;
    if (headerAddress && typeof headerAddress === 'string' && headerAddress.length >= 10) {
      if (headerAddress.toLowerCase() !== expectedAdmin) {
        return new NextResponse(
          JSON.stringify({ success: false, error: 'X-Admin-Wallet must match the game admin address' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) } }
        );
      }
      address = headerAddress.toLowerCase();
    } else {
      // No header: use admin from GAME_WALLET_PRIVATE_KEY (build, CI, monitoring, same-origin)
      if (!expectedAdmin || expectedAdmin.length < 10) {
        return new NextResponse(
          JSON.stringify({ success: false, error: 'Game admin wallet not configured (GAME_WALLET_PRIVATE_KEY)' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) } }
        );
      }
      address = expectedAdmin;
    }

    const config = getConfig();

    const reserves: WalletReserve[] = [];
    let hasWarnings = false;

    const mewsTokenTypeId = config.token.mewsTokenTypeId;
    const usdcTokenTypeId = config.token.usdcTokenTypeId;

    const coinOps: Array<{ id: string; method: string; params: Record<string, unknown> }> = [
      {
        id: 'sui',
        method: 'getCoins',
        params: { owner: address, coinType: '0x2::sui::SUI', limit: 50 },
      },
    ];
    if (mewsTokenTypeId) {
      coinOps.push({
        id: 'mews',
        method: 'getCoins',
        params: { owner: address, coinType: mewsTokenTypeId, limit: 50 },
      });
    }
    if (usdcTokenTypeId) {
      coinOps.push({
        id: 'usdc',
        method: 'getCoins',
        params: { owner: address, coinType: usdcTokenTypeId, limit: 50 },
      });
    }

    type CoinPage = { data?: Array<{ balance: string }> };
    const sumCoinBalances = (page: CoinPage | null | undefined): bigint => {
      const rows = page?.data ?? [];
      return rows.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    };

    let batchById = new Map<string, PlatformSonarBatchItemResult>();
    try {
      const batch = await callPlatformSonarBatch(coinOps);
      if (batch.success) {
        batchById = new Map(batch.results.map((r) => [r.id, r]));
      }
    } catch {
      batchById = new Map();
    }

    const pushFromGetCoins = (
      token: string,
      opId: string,
      decimals: number,
      minReserve: number,
      notConfigured?: boolean
    ) => {
      if (notConfigured) {
        reserves.push({
          token,
          balance: '0',
          balanceFormatted: 'Not configured',
          decimals,
          isLow: token !== 'USDC',
          minReserve: minReserve.toString(),
          minReserveFormatted: formatBalance(BigInt(minReserve), decimals),
        });
        if (token === 'MEWS') hasWarnings = true;
        return;
      }
      const row = batchById.get(opId);
      try {
        if (!row || !row.success) throw new Error(row && !row.success ? row.error : 'missing');
        const bal = sumCoinBalances(row.data as CoinPage);
        const isLow = bal < BigInt(minReserve);
        if (isLow) hasWarnings = true;
        reserves.push({
          token,
          balance: bal.toString(),
          balanceFormatted: formatBalance(bal, decimals),
          decimals,
          isLow,
          minReserve: minReserve.toString(),
          minReserveFormatted: formatBalance(BigInt(minReserve), decimals),
        });
      } catch {
        reserves.push({
          token,
          balance: '0',
          balanceFormatted: '0',
          decimals,
          isLow: true,
          minReserve: minReserve.toString(),
          minReserveFormatted: formatBalance(BigInt(minReserve), decimals),
        });
        hasWarnings = true;
      }
    };

    pushFromGetCoins('SUI', 'sui', 9, MIN_SUI_RESERVE, false);
    pushFromGetCoins('MEWS', 'mews', 9, MIN_MEWS_RESERVE, !mewsTokenTypeId);

    if (!usdcTokenTypeId) {
      reserves.push({
        token: 'USDC',
        balance: '0',
        balanceFormatted: 'Not configured',
        decimals: 6,
        isLow: false,
        minReserve: MIN_USDC_RESERVE.toString(),
        minReserveFormatted: formatBalance(BigInt(MIN_USDC_RESERVE), 6),
      });
    } else {
      pushFromGetCoins('USDC', 'usdc', 6, MIN_USDC_RESERVE, false);
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

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

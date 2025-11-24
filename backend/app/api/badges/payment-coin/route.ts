// ==========================================
// Get Payment Coin API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';

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

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const requiredAmountParam = searchParams.get('requiredAmount');

    // Validate required fields
    if (!address) {
      return NextResponse.json(
        { 
          success: false,
          error: 'address query parameter is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!requiredAmountParam) {
      return NextResponse.json(
        { 
          success: false,
          error: 'requiredAmount query parameter is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid address format. Must be a valid Sui address (0x followed by 64 hex characters)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const requiredAmountMist = BigInt(requiredAmountParam);

    console.log(`📥 Payment coin request for address: ${address}, required: ${requiredAmountMist} MIST`);

    // Get Sui client
    const config = getConfig();
    const client = new SuiClient({ url: getFullnodeUrl(config.sui.network) });

    // Get all SUI coins
    const coins = await client.getCoins({
      owner: address,
      coinType: '0x2::sui::SUI',
    });

    if (!coins.data || coins.data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No SUI coins found in wallet',
        },
        { headers: corsHeaders }
      );
    }

    // Calculate total balance
    let totalBalance = BigInt(0);
    coins.data.forEach(coin => {
      totalBalance += BigInt(coin.balance);
    });

    // Check if balance is sufficient
    if (totalBalance < requiredAmountMist) {
      const requiredSui = Number(requiredAmountMist) / 1_000_000_000;
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient SUI balance. Required: ${requiredSui} SUI`,
        },
        { headers: corsHeaders }
      );
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
      return NextResponse.json(
        {
          success: true,
          coinId: sufficientCoin.coinObjectId,
        },
        { headers: corsHeaders }
      );
    }

    // Otherwise, we need to merge coins
    // For now, we'll use the first coin and let the transaction handle merging
    return NextResponse.json(
      {
        success: true,
        coinId: coins.data[0].coinObjectId,
        needsMerge: true,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error getting payment coin:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get payment coin',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


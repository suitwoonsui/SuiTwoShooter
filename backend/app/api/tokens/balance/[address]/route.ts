import { NextRequest, NextResponse } from 'next/server';
import { suiService } from '@/lib/sui/suiService';

/**
 * GET /api/tokens/balance/[address]
 * Get token balance for a wallet address
 * Used for token gatekeeping (check if user has minimum $Mews balance)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Validate address format (basic check)
    if (!address.startsWith('0x') || address.length < 10) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const balance = await suiService.getTokenBalance(address);

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Error in token balance endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


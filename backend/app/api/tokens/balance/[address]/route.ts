import { NextRequest, NextResponse } from 'next/server';
import { suiService } from '@/lib/sui/suiService';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * GET /api/tokens/balance/[address]
 * Get token balance for a wallet address
 * Used for token gatekeeping (check if user has minimum $Mews balance)
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate address format (basic check)
    if (!address.startsWith('0x') || address.length < 10) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400, headers: corsHeaders }
      );
    }

    const balance = await suiService.getTokenBalance(address);

    return NextResponse.json(balance, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in token balance endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


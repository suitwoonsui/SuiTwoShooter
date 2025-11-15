// ==========================================
// Store Transaction Status API Route
// Checks transaction status on blockchain
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { storeService } from '@/lib/sui/store-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ digest: string }> }
) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const { digest } = await params;

    // Validate digest format (Sui transaction digests are base58 strings)
    if (!digest || typeof digest !== 'string' || digest.length < 40) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid transaction digest format',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔍 [TRANSACTION] Checking status for ${digest}`);

    // Verify transaction
    const result = await storeService.verifyTransaction(digest);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to verify transaction',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        digest,
        exists: result.exists,
        confirmed: result.confirmed,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in transaction status endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


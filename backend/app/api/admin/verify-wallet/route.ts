import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';

/**
 * GET /api/admin/verify-wallet
 * 
 * Returns the admin wallet address for verification
 * Frontend can check if connected wallet matches admin wallet
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const adminWallet = getAdminWalletService();
    const adminAddress = adminWallet.getAddress();

    return NextResponse.json(
      {
        success: true,
        adminAddress: adminAddress,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ [ADMIN VERIFY] Error getting admin address:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get admin address',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


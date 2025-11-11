// ==========================================
// Admin Wallet Health Check API Route
// ==========================================

import { NextResponse } from 'next/server';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';

/**
 * GET /api/admin/health
 * Check admin wallet status and balance
 */
export async function GET() {
  try {
    const adminWallet = getAdminWalletService();
    const balance = await adminWallet.checkBalance();
    const address = adminWallet.getAddress();

    return NextResponse.json({
      success: true,
      adminWallet: {
        address,
        balance: balance.balance,
        balanceInSUI: balance.balanceInSUI,
        hasEnough: balance.hasEnough,
        status: balance.hasEnough ? 'healthy' : 'low_balance'
      },
      message: balance.hasEnough 
        ? 'Admin wallet is healthy and ready for transactions'
        : 'Warning: Admin wallet balance is low. Please fund the wallet with testnet SUI.'
    });
  } catch (error) {
    console.error('❌ Error checking admin wallet health:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check admin wallet health',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


// ==========================================
// Admin Wallet Health Check API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { withApiHandler } from '@/lib/api/api-handler';

/**
 * GET /api/admin/health
 * Check admin wallet status and balance
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const adminWallet = getAdminWalletService();
    const balance = await adminWallet.checkBalance();
    const address = adminWallet.getAddress();

    return {
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
    };
  }
);


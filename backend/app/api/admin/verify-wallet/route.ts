import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { withApiHandler } from '@/lib/api/api-handler';

/**
 * GET /api/admin/verify-wallet
 * 
 * Returns the admin wallet address for verification
 * Frontend can check if connected wallet matches admin wallet
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const adminWallet = getAdminWalletService();
    const adminAddress = adminWallet.getAddress();

    return {
      success: true,
      adminAddress: adminAddress,
    };
  }
);


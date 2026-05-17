import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { withApiHandler } from '@/lib/api/api-handler';

/**
 * GET /api/admin/verify-wallet
 * 
 * Returns the game admin wallet address for verification
 * Frontend can check if connected wallet matches game admin wallet
 * 
 * Note: This is separate from platform backend's admin wallet.
 * Game backend uses GAME_WALLET_PRIVATE_KEY for game-specific operations.
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    try {
      const adminWallet = getAdminWalletService();
      const adminAddress = adminWallet.getAddress();

      return {
        success: true,
        adminAddress: adminAddress,
      };
    } catch (error) {
      // If admin wallet is not initialized (lazy loading), return error
      // This can happen if GAME_WALLET_PRIVATE_KEY is not set
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        adminAddress: null,
      };
    }
  }
);

// ==========================================
// Inventory admin proxy: Add items (game admin only)
// Same pattern as game-pass admin: verifies game admin, then calls platform with API key.
// Multi-ecosystem: X-Ecosystem-Id, ?ecosystemId=, body.ecosystemId (default suitwo).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformInventoryClient, getEcosystemIdFromRequest } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/admin/inventory/add-items
 * Proxy to platform backend. Verifies admin wallet, passes ecosystemId for multi-ecosystem support.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await getRequestBody<{
    playerAddress: string;
    items: Array<{ itemId: string; level: number; quantity: number }>;
    adminWalletAddress?: string;
    ecosystemId?: string;
  }>(request);

  const expected = getAdminWalletService().getAddress().toLowerCase();
  const provided = body.adminWalletAddress?.toLowerCase();
  if (!provided || provided !== expected) {
    throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
  }

  const ecosystemId = getEcosystemIdFromRequest(request, body);
  const adminWallet = getAdminWalletService();

  return platformInventoryClient.adminAddItems(
    {
      playerAddress: body.playerAddress,
      items: body.items,
    },
    {
      ecosystemId: ecosystemId || undefined,
      // So platform can accept via verifyApiKeyOrPlatformAdmin when same wallet as platform
      headers: { 'X-Admin-Wallet': adminWallet.getAddress() },
    }
  );
});

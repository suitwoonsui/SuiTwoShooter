// ==========================================
// Inventory admin proxy: Add items (game admin only)
// Same pattern as game-pass admin: verifies game admin, then calls platform with API key.
// Multi-ecosystem: X-Ecosystem-Id, ?ecosystemId=, body.ecosystemId (default suitwo).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  buildBatchViaChannel,
  platformTxClient,
  buildPlatformCallOptions,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';

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

  const adminWallet = getAdminWalletService();
  const expected = adminWallet.getAddress().toLowerCase();
  const provided = body.adminWalletAddress?.toLowerCase();
  if (!provided || provided !== expected) {
    throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
  }

  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  if (!corridorAdminCapId?.startsWith('0x')) {
    throw new Error('Add inventory items requires CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.');
  }

  const platformOptions = buildPlatformCallOptions(request, body, { adminWalletAddress: adminWallet.getAddress() });

  const build = await buildBatchViaChannel(
    {
      operations: [{
        operationId: 'inventory-add-items',
        params: {
          playerAddress: body.playerAddress,
          items: body.items,
          senderAddress: adminWallet.getAddress(),
          corridorAdminCapId: corridorAdminCapId,
        },
      }],
    },
    platformOptions
  );

  if (!build.success || !build.transactions?.length) {
    throw new Error(build.errors?.[0] ?? build.error ?? 'Channel build failed');
  }

  const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
  const execResult = await platformTxClient.executeSigned(
    { transactionBytesBase64: build.transactions[0], signature: signed.signature },
    platformOptions
  );
  if (!execResult.success) throw new Error(execResult.error || 'Transaction failed');

  return {
    success: true,
    digest: execResult.digest,
    playerAddress: body.playerAddress,
    items: body.items,
  };
});

// ==========================================
// Game-pass proxy: Set credits (game admin only)
// Build via Channel when corridor cap set; else platform returns unsigned tx; game signs and submits.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  buildBatchViaChannel,
  platformTxClient,
  platformGamePassClient,
  buildPlatformCallOptions,
  getCorridorCapabilityObjectIdFromEnv,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await getRequestBody<{ playerAddress: string; amount: number; adminWalletAddress?: string; ecosystemId?: string }>(request);
  const adminWallet = getAdminWalletService();
  const expected = adminWallet.getAddress().toLowerCase();
  const provided = (body.adminWalletAddress && body.adminWalletAddress.toLowerCase()) || expected;
  if (provided !== expected) {
    throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
  }
  const platformOptions = buildPlatformCallOptions(request, body, { adminWalletAddress: adminWallet.getAddress() });
  const corridorCap = getCorridorCapabilityObjectIdFromEnv();
  const corridorAdminCap = getCorridorAdminCapabilityObjectIdFromEnv();
  if (!corridorCap?.startsWith('0x')) {
    throw new Error('Set credits requires Channel. Set CORRIDOR_CAPABILITY_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.');
  }
  if (!corridorAdminCap?.startsWith('0x')) {
    throw new Error('Set credits requires CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.');
  }
  const build = await buildBatchViaChannel(
    {
      operations: [{
        operationId: 'reservoir-admin-set-balance',
        params: {
          playerAddress: body.playerAddress,
          amount: body.amount,
          balanceKey: 'credits',
          corridorCapabilityObjectId: corridorCap,
          corridorAdminCapabilityObjectId: corridorAdminCap,
          gameWalletAddress: adminWallet.getAddress(),
        },
      }],
    },
    platformOptions
  );
  if (!build.success || !build.transactions?.length) {
    throw new Error(build.errors?.[0] ?? build.error ?? 'Channel build failed');
  }
  const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
  const result = await platformTxClient.executeSigned(
    { transactionBytesBase64: build.transactions[0], signature: signed.signature },
    platformOptions
  );
  if (!result.success) throw new Error(result.error || 'Transaction failed');
  let gamesRemaining = body.amount;
  try {
    const status = await platformGamePassClient.getGamePassStatus(body.playerAddress, platformOptions);
    if (status.success && typeof status.gamesRemaining === 'number') gamesRemaining = status.gamesRemaining;
  } catch {
    /* non-fatal */
  }
  return { success: true, digest: result.digest, gamesRemaining };
});

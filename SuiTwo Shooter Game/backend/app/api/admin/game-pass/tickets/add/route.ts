// ==========================================
// Game admin: Add tournament tickets. Build via Channel when corridor cap set; else platform API.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { buildBatchViaChannel, platformTxClient, platformGamePassClient, buildPlatformCallOptions, getCorridorCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await getRequestBody<{
    playerAddress: string;
    quantity: number;
    valuePerTicketUsdCents?: number;
    adminWalletAddress?: string;
    ecosystemId?: string;
  }>(request);
  const adminWallet = getAdminWalletService();
  const expected = adminWallet.getAddress().toLowerCase();
  const provided = body.adminWalletAddress?.toLowerCase();
  if (!provided || provided !== expected) {
    throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
  }
  const platformOptions = buildPlatformCallOptions(request, body, { adminWalletAddress: adminWallet.getAddress() });
  const corridorCap = getCorridorCapabilityObjectIdFromEnv();
  if (!corridorCap?.startsWith('0x')) {
    throw new Error('Add tickets requires Channel. Set CORRIDOR_CAPABILITY_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.');
  }
  const build = await buildBatchViaChannel(
    {
      operations: [{
        operationId: 'reservoir-admin-add-items',
        params: {
          playerAddress: body.playerAddress,
          quantity: body.quantity,
          valuePerTicketUsdCents: body.valuePerTicketUsdCents ?? 0,
          corridorCapabilityObjectId: corridorCap,
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
  const execResult = await platformTxClient.executeSigned(
    { transactionBytesBase64: build.transactions[0], signature: signed.signature },
    platformOptions
  );
  if (!execResult.success) throw new Error(execResult.error || 'Transaction failed');
  let ticketCountAfter: number | undefined;
  try {
    const status = await platformGamePassClient.getGamePassStatus(body.playerAddress, { ...platformOptions, contract: 'new' });
    if (status.success && status.ticketCount != null) ticketCountAfter = status.ticketCount;
  } catch {
    /* non-fatal */
  }
  return {
    success: true,
    digest: execResult.digest,
    playerAddress: body.playerAddress,
    quantity: body.quantity,
    valuePerTicketUsdCents: body.valuePerTicketUsdCents ?? 0,
    ticketCountAfter,
  };
});

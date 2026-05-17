// ==========================================
// Game Pass Consume Credit API Route
// Uses Channel batch (reservoir-consume-balance). Body: playerAddress, amount? (default 1), balanceKey (required).
// For credit + items in one tx use POST /api/game-pass/start-game instead.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import {
  buildBatchViaChannel,
  platformTxClient,
  buildPlatformCallOptions,
  getCorridorCapabilityObjectIdFromEnv,
  invalidatePlayerGamePassCacheForAddress,
} from '@/lib/services/platform/client/platform-client';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      amount?: number;
      balanceKey: string;
      ecosystemId?: string;
    }>(request);
    const { playerAddress, balanceKey } = body;
    const amount = typeof body.amount === 'number' && body.amount > 0 ? body.amount : 1;
    const appId = getConfig().server?.appId ?? '';

    if (!playerAddress) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'playerAddress is required');
    }
    if (!balanceKey || typeof balanceKey !== 'string' || balanceKey.trim() === '') {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'balanceKey is required (app-defined balance type to consume)');
    }

    PlatformValidators.validateAddress(playerAddress);

    const corridorCap = getCorridorCapabilityObjectIdFromEnv();
    if (!corridorCap?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_INVALID,
        'CORRIDOR_CAPABILITY_OBJECT_ID (or _TESTNET/_MAINNET) is required.'
      );
    }
    const adminWallet = getAdminWalletService();
    const gameWalletAddress = adminWallet.getAddress();
    const platformOptions = buildPlatformCallOptions(request, body);

    // Use Channel batch (same path as store/rewards)
    const batchRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'reservoir-consume-balance',
            params: {
              playerAddress: playerAddress.trim(),
              amount,
              balanceKey: balanceKey.trim(),
              corridorCapabilityObjectId: corridorCap,
              gameWalletAddress,
            },
          },
        ],
      },
      platformOptions
    );

    if (!batchRes.success || !batchRes.transactions?.length) {
      const err = batchRes.errors?.[0] ?? batchRes.error ?? 'Batch build failed';
      PlatformLogger.error('Consume balance failed (channel batch)', { playerAddress, appId, error: err });
      throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, err);
    }

    const txBase64 = batchRes.transactions[0];
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(txBase64!, 'base64'));
    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64: txBase64!, signature: signed.signature },
      platformOptions
    );

    if (!execRes.success) {
      PlatformLogger.error('Consume balance execute failed', { playerAddress, appId, error: execRes.error });
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        execRes.error ?? 'Failed to execute consume transaction'
      );
    }

    PlatformLogger.info('Balance consumed via channel batch', { playerAddress, appId, digest: execRes.digest });

    invalidatePlayerGamePassCacheForAddress(playerAddress.trim());

    return {
      success: true,
      digest: execRes.digest,
      balance: 0,
      playerAddress: playerAddress.trim(),
      appId,
    };
  },
  { logRequest: true }
);

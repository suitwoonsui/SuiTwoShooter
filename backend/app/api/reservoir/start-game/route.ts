// ==========================================
// Start Game — consume 1 credit + optional items in one atomic tx via Channel batch.
// POST /api/game-pass/start-game
// Body: playerAddress, items? [{ itemId, level, quantity }]. Uses reservoir-consume-balance-and-items.
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
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      items?: Array<{ itemId: string; level: number; quantity: number }>;
      ecosystemId?: string;
    }>(request);
    const { playerAddress, items = [] } = body;

    if (!playerAddress?.trim()) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'playerAddress is required');
    }
    PlatformValidators.validateAddress(playerAddress.trim());

    const platformOptions = buildPlatformCallOptions(request, body);
    const corridorCap = getCorridorCapabilityObjectIdFromEnv();
    if (!corridorCap?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_INVALID,
        'CORRIDOR_CAPABILITY_OBJECT_ID (or _TESTNET/_MAINNET) is required for start-game.'
      );
    }
    const adminWallet = getAdminWalletService();
    const gameWalletAddress = adminWallet.getAddress();

    const platformItems =
      Array.isArray(items) && items.length > 0
        ? items.map((item) => ({
            itemKey: toDynamicProvisionKey(item.itemId),
            level: item.level,
            quantity: item.quantity,
          }))
        : [];

    // Use Channel batch: one operation = one atomic tx (credit + items)
    const batchRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'reservoir-consume-balance-and-items',
            params: {
              playerAddress: playerAddress.trim(),
              amount: 1,
              balanceKey: 'credits',
              items: platformItems,
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
      PlatformLogger.error('Start game: channel batch failed', { playerAddress, error: err });
      throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, err);
    }

    const txBase64 = batchRes.transactions[0];
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(txBase64!, 'base64'));
    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64: txBase64!, signature: signed.signature },
      platformOptions
    );

    if (!execRes.success) {
      PlatformLogger.error('Start game: execute failed', { playerAddress, error: execRes.error });
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        execRes.error ?? 'Failed to execute start-game transaction'
      );
    }

    PlatformLogger.info('Start game: credit and items consumed via channel batch', {
      playerAddress,
      digest: execRes.digest,
      itemCount: platformItems.length,
    });

    invalidatePlayerGamePassCacheForAddress(playerAddress.trim());

    return {
      success: true,
      digest: execRes.digest,
      playerAddress: playerAddress.trim(),
      message: 'Credit and items consumed. Game started.',
    };
  },
  { logRequest: true }
);

// ==========================================
// Inventory Consume API Route
// Consumes items from player inventory (admin wallet signs).
// Build via Channel batch (reservoir-consume-items), sign and submit via Channel.
// Inventory is separated from Store: use this for mid-game consumables (e.g. slow_time, destroy_all).
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
} from '@/lib/services/platform/client/platform-client';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received POST request to /api/inventory/consume');

    const body = await getRequestBody<{
      playerAddress: string;
      items: Array<{ itemId: string; level: number; quantity: number }>;
      ecosystemId?: string;
    }>(request);
    PlatformLogger.debug('Request body', { body });

    const { playerAddress, items } = body;

    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'items array is required and must not be empty'
      );
    }

    PlatformValidators.validateAddress(playerAddress);

    const config = getConfig();
    const appId = config.server.appId;

    for (const item of items) {
      if (!item.itemId || typeof item.itemId !== 'string') {
        throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Each item must have a valid itemId');
      }
      if (typeof item.level !== 'number' || item.level < 1 || item.level > 3) {
        throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Each item must have level 1-3');
      }
      if (typeof item.quantity !== 'number' || item.quantity < 1) {
        throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Each item must have quantity >= 1');
      }
    }

    const platformItems = items.map((item) => ({
      itemKey: toDynamicProvisionKey(item.itemId),
      level: item.level,
      quantity: item.quantity,
    }));

    const corridorCap = getCorridorCapabilityObjectIdFromEnv();
    const adminWallet = getAdminWalletService();
    const senderAddress = adminWallet.getAddress();
    const platformOptions = buildPlatformCallOptions(request, body);

    PlatformLogger.info('Consuming items via Channel batch (reservoir-consume-items)', {
      playerAddress,
      itemCount: platformItems.length,
    });

    const batchRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'reservoir-consume-items',
            params: {
              playerAddress,
              items: platformItems,
              senderAddress,
              corridorCapabilityObjectId: corridorCap,
            },
          },
        ],
      },
      platformOptions
    );

    if (!batchRes.success || !batchRes.transactions?.length) {
      const err = batchRes.errors?.join('; ') || batchRes.error || 'Failed to build consume transaction';
      throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, err);
    }

    const txBase64 = batchRes.transactions[0];
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(txBase64, 'base64'));
    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64: txBase64, signature: signed.signature },
      platformOptions
    );

    if (!execRes.success) {
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        execRes.error || 'Failed to consume items'
      );
    }

    PlatformLogger.info('Items consumed successfully', {
      playerAddress,
      appId,
      digest: execRes.digest,
      itemCount: items.length,
    });

    return {
      success: true,
      digest: execRes.digest,
      playerAddress,
      items,
      appId,
      gasPaidBy: 'admin_wallet',
      message: 'Items consumed successfully. Admin wallet paid gas fees.',
    };
  },
  { logRequest: true }
);

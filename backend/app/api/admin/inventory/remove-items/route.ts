// ==========================================
// Inventory admin: Remove items (consume) — game admin only
// Platform build → game signs and submits (AppCapability path).
// Multi-ecosystem: X-Ecosystem-Id, ?ecosystemId=, body.ecosystemId (default suitwo).
// ==========================================

import { NextRequest } from 'next/server';
import { buildBatchViaChannel, platformTxClient, buildPlatformCallOptions, getCorridorCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';
import { handleCorsPreflight } from '@/lib/cors';
import { assertGameAdminServerConfigured } from '@/lib/auth';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';
import {
  type AdminInventoryItemInput,
  normalizeAdminInventoryItemForPlatform,
  validateAdminInventoryItem,
} from '@/lib/services/inventory/admin-inventory-item';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/admin/inventory/remove-items
 * Removes (consumes) items from a player's inventory. Verifies admin wallet, gets unsigned tx from platform, signs and submits.
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    assertGameAdminServerConfigured();

    const body = await getRequestBody<{
      playerAddress: string;
      items: AdminInventoryItemInput[];
      adminWalletAddress: string;
      ecosystemId?: string;
    }>(request);
    const { playerAddress, items, adminWalletAddress } = body;

    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      PlatformLogger.warn('Remove items: wallet verification failed', {
        expected: expectedAdminAddress,
        provided: providedAdminAddress || 'none',
      });
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed. Please connect the correct admin wallet.'
      );
    }

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Invalid playerAddress. Must be a valid Sui address.'
      );
    }
    PlatformValidators.validateAddress(playerAddress);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Invalid items. Must be a non-empty array.'
      );
    }

    const mappedItems: Array<{ itemKey: string; level: number; quantity: number }> = [];
    for (const item of items) {
      try {
        validateAdminInventoryItem(item);
      } catch (e) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          e instanceof Error ? e.message : 'Invalid item'
        );
      }
      const normalized = normalizeAdminInventoryItemForPlatform(item);
      mappedItems.push({
        itemKey: toDynamicProvisionKey(normalized.itemId),
        level: normalized.level,
        quantity: normalized.quantity,
      });
    }

    PlatformLogger.info('Remove items: building consume tx via Channel', {
      playerAddress,
      itemCount: mappedItems.length,
    });

    const platformOptions = buildPlatformCallOptions(request, body);
    const corridorCap = getCorridorCapabilityObjectIdFromEnv();
    const build = await buildBatchViaChannel(
      {
        operations: [{
          operationId: 'store-consume',
          params: {
            playerAddress,
            items: mappedItems,
            senderAddress: adminWallet.getAddress(),
            ...(corridorCap?.startsWith('0x') && { corridorCapabilityObjectId: corridorCap }),
          },
        }],
      },
      platformOptions
    );

    if (!build.success || !build.transactions?.length) {
      throw new Error(build.error || build.errors?.[0] || 'Failed to build consume transaction');
    }

    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned({
      transactionBytesBase64: build.transactions[0],
      signature: signed.signature,
    }, platformOptions);

    if (!result.success) {
      throw new Error(result.error || 'Transaction failed');
    }

    PlatformLogger.info('Items removed (consumed) successfully', {
      playerAddress,
      itemCount: mappedItems.length,
      digest: result.digest,
    });

    return {
      success: true,
      digest: result.digest,
      message: `Successfully removed ${mappedItems.length} item(s) from inventory`,
    };
  }
);

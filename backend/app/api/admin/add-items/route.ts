import { NextRequest } from 'next/server';
import { buildBatchViaChannel, platformTxClient, getCorridorAdminCapabilityObjectIdFromEnv, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { handleCorsPreflight } from '@/lib/cors';
import { assertGameAdminServerConfigured } from '@/lib/auth';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import {
  type AdminInventoryItemInput,
  normalizeAdminInventoryItemForPlatform,
  validateAdminInventoryItem,
} from '@/lib/services/inventory/admin-inventory-item';

/**
 * POST /api/admin/add-items
 * 
 * Server-side proxy for admin add items
 * Uses platform API key from environment server-side (browser does not send a key)
 * This allows a web UI to work without exposing the API key
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

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

    // Verify admin wallet address matches
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      PlatformLogger.warn('Wallet verification failed', {
        expected: expectedAdminAddress,
        provided: providedAdminAddress || 'none',
      });
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed. Please connect the correct admin wallet.'
      );
    }

    PlatformLogger.info('Admin wallet verified', { adminAddress: providedAdminAddress });

    // Validate request
    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Invalid playerAddress. Must be a valid Sui address.'
      );
    }

    PlatformValidators.validateAddress(playerAddress);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid items. Must be a non-empty array.');
    }

    for (const item of items) {
      validateAdminInventoryItem(item);
    }
    const platformItems = items.map(normalizeAdminInventoryItemForPlatform);

    PlatformLogger.info('Server-side request to add items', {
      playerAddress,
      items: platformItems,
    });

    const platformOptions = buildPlatformCallOptions(request, body);
    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET) required for add-items via Channel.'
      );
    }
    const build = await buildBatchViaChannel(
      {
        operations: [{
          operationId: 'inventory-add-items',
          params: {
            playerAddress,
            items: platformItems,
            senderAddress: adminWallet.getAddress(),
            corridorAdminCapId,
          },
        }],
      },
      platformOptions
    );

    if (!build.success || !build.transactions?.length) {
      throw new Error(build.error || build.errors?.[0] || 'Failed to build add-items transaction');
    }

    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned({
      transactionBytesBase64: build.transactions[0],
      signature: signed.signature,
    }, platformOptions);

    if (!result.success) {
      throw new Error(result.error || 'Transaction failed');
    }

    PlatformLogger.info('Items added successfully', {
      playerAddress,
      itemCount: items.length,
      digest: result.digest,
    });

    return {
      success: true,
      digest: result.digest,
      message: `Successfully added ${items.length} item(s) to inventory`,
    };
  }
);


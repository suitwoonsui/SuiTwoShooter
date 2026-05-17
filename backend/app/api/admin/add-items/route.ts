import { NextRequest } from 'next/server';
import { buildBatchViaChannel, platformTxClient, getCorridorAdminCapabilityObjectIdFromEnv, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { handleCorsPreflight } from '@/lib/cors';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';

/**
 * POST /api/admin/add-items
 * 
 * Server-side proxy for admin add items
 * Automatically uses API_KEY from environment (no need to send it from browser)
 * This allows a web UI to work without exposing the API key
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Verify API key is configured (server-side check)
    const config = getConfig();
    if (!config.security.apiKey || config.security.apiKey === '') {
      throw new Error('API_KEY not configured on server. Please set API_KEY in backend/.env.local');
    }

    const body = await getRequestBody<{ 
      playerAddress: string; 
      items: Array<{ itemId: string; level: number; quantity: number }>; 
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

    // Validate each item
    for (const item of items) {
      if (!item.itemId || !item.level || !item.quantity) {
        throw new Error('Each item must have itemId, level, and quantity.');
      }
      if (item.quantity <= 0) {
        throw new Error('Quantity must be greater than 0.');
      }
    }

    PlatformLogger.info('Server-side request to add items', {
      playerAddress,
      items,
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
            items,
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


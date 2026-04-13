// ==========================================
// POST /api/store/admin/register-catalog
// Registers the game's item keys (catalog) with the platform Terminal store via Channel.
// Build via Channel; this backend signs and submits. Call once per app (or when adding new keys).
// ==========================================

import { NextRequest } from 'next/server';
import { buildBatchViaChannel, platformTxClient, buildPlatformCallOptions, getCorridorAdminCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';
import { handleCorsPreflight } from '@/lib/cors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { verifyApiKey } from '@/lib/auth';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    if (!verifyApiKey(request)) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Valid API key required (Authorization: Bearer <API_KEY> or X-API-Key: <API_KEY>).'
      );
    }

    const body = await getRequestBody<{
      itemKeys: string[];
      ecosystemId?: string;
    }>(request);

    const { itemKeys } = body;

    if (!itemKeys || !Array.isArray(itemKeys) || itemKeys.length === 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'itemKeys is required: non-empty array of strings (e.g. item IDs or "itemId_level" from your catalog).'
      );
    }

    for (const k of itemKeys) {
      if (typeof k !== 'string' || !k.trim()) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'Each item key must be a non-empty string.'
        );
      }
    }

    const adminWallet = getAdminWalletService();
    const senderAddress = adminWallet.getAddress();
    PlatformValidators.validateAddress(senderAddress);

    PlatformLogger.info('Registering catalog with platform store via Channel', {
      itemKeyCount: itemKeys.length,
      senderAddress,
    });

    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET) required for register-catalog via Channel.'
      );
    }

    const platformOptions = buildPlatformCallOptions(request, body, {
      headers: { 'X-Admin-Wallet': senderAddress },
    });
    const build = await buildBatchViaChannel(
      {
        operations: [{
          operationId: 'inventory-register-item-keys',
          params: {
            itemKeys: itemKeys.map((k) => k.trim()),
            senderAddress,
            corridorAdminCapId,
          },
        }],
      },
      platformOptions
    );

    if (!build.success || !build.transactions?.length) {
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        build.error || build.errors?.[0] || 'Failed to build register_item_keys transaction'
      );
    }

    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned({
      transactionBytesBase64: build.transactions[0],
      signature: signed.signature,
    }, platformOptions);

    if (!result.success) {
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        result.error ?? 'Transaction failed'
      );
    }

    PlatformLogger.info('Catalog registered with platform store', {
      digest: result.digest,
      itemKeyCount: itemKeys.length,
    });

    return {
      success: true,
      digest: result.digest!,
      message: `Registered ${itemKeys.length} item key(s) with the platform store.`,
    };
  }
);

// ==========================================
// Store Catalog Item Level Management API
// Delete individual item levels
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { clearProvisionsCache } from '@/lib/services/store/catalog/provisions';
import { getProvisionsService } from '@/lib/services/store/catalog/provisions-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { buildBatchViaChannel, buildPlatformCallOptions, getCatalogBuildOverrides } from '@/lib/services/platform/client/platform-client';

function toDynamicProvisionKey(rawId: string): string {
  return rawId
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .toLowerCase();
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * DELETE /api/store/admin/catalog/[itemId]/levels/[level]
 * 
 * Remove a specific level from an item
 * 
 * SECURITY: Protected with API key authentication
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ itemId: string; level: string }> }
) {
  const params = await context.params;
  return withApiHandler(
    async (request: NextRequest) => {
      // Require admin authentication - check API key OR admin wallet
      const hasApiKey = verifyApiKey(request);

      if (!hasApiKey) {
        const adminWallet = getAdminWalletService();
        const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
        const providedAdminAddress = request.headers.get('X-Admin-Wallet')?.toLowerCase();

        if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
          throw new PlatformError(
            PlatformErrorCode.UNAUTHORIZED,
            'Unauthorized. Valid API key or admin wallet address required.'
          );
        }
      }

      const adminId = getAdminIdentifier(request);
      const itemId = params.itemId;
      const normalizedItemId = toDynamicProvisionKey(itemId);
      const level = parseInt(params.level, 10);

      if (!itemId) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'itemId is required'
        );
      }

      if (isNaN(level) || level < 1 || level > 3) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'level must be a number between 1 and 3'
        );
      }

      PlatformLogger.info('Admin catalog level deletion request', {
        adminId,
        itemId,
        normalizedItemId,
        level,
      });

      const adminWallet = getAdminWalletService();
      const body = await request.json().catch(() => ({}));

      try {
        const platformOptions = buildPlatformCallOptions(request, body);
        const catalogOverrides = getCatalogBuildOverrides();
        const build = await buildBatchViaChannel(
          {
            operations: [{
              operationId: 'catalog-remove-level',
              params: {
                itemId: normalizedItemId,
                level,
                catalogSender: adminWallet.getAddress(),
                corridorAdminCapId: catalogOverrides.catalogAdminCapId,
                ...(catalogOverrides.catalogPackageId && { catalogPackageId: catalogOverrides.catalogPackageId }),
                ...(catalogOverrides.catalogRegistryId && { catalogRegistryId: catalogOverrides.catalogRegistryId }),
              },
            }],
          },
          platformOptions
        );
        if (!build.success || !build.transactions?.length) {
          throw new Error(build.error || build.errors?.[0] || 'Failed to build remove level transaction');
        }
        const txBytes = Buffer.from(build.transactions[0], 'base64');
        const signed = await adminWallet.getKeypair().signTransaction(txBytes);
        const sig = typeof signed === 'object' && signed !== null && 'signature' in signed ? (signed as { signature: string }).signature : String(signed);
        const { platformTxClient } = await import('@/lib/services/platform/client/platform-client');
        const result = await platformTxClient.executeSigned({ transactionBytesBase64: build.transactions[0], signature: sig }, platformOptions);
        if (!result.success) throw new Error(result.error || 'Transaction failed');
        getProvisionsService().clearCache();
        clearProvisionsCache();

        PlatformLogger.info('Level removed successfully', {
          adminId,
          itemId: normalizedItemId,
          level,
          digest: result.digest,
        });

        return {
          success: true,
          message: `Level ${level} removed from ${normalizedItemId} successfully.`,
          digest: result.digest,
        };
      } catch (error) {
        PlatformLogger.error('Failed to remove level on blockchain', {
          adminId,
          itemId,
          level,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        throw new PlatformError(
          PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
          `Failed to remove level on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  )(request, context);
}

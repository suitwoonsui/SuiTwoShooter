// ==========================================
// Store Catalog Management API
// Admin-only endpoints for managing provisions (Terminal item definitions: metadata / levels). Sell prices: Stockroom only.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getProvisions, StoreItem, ItemLevel, clearProvisionsCache } from '@/lib/services/store/catalog/provisions';
import { getProvisionsService } from '@/lib/services/store/catalog/provisions-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { buildBatchViaChannel, platformTxClient, buildPlatformCallOptions, getCatalogBuildOverrides, getEcosystemIdFromRequest } from '@/lib/services/platform/client/platform-client';
import { notifyPublicStoreCatalogChanged } from '@/lib/cache/public-nonuser-data-cache';

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
 * GET /api/store/admin/catalog
 * 
 * Get the current provisions catalog
 * 
 * SECURITY: Read-only endpoint - no authentication required
 * The catalog is public information and doesn't expose sensitive data
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    // This is a read-only endpoint, so we don't require authentication
    // The catalog is public information (item definitions; storefront USD comes from Stockroom).
    PlatformLogger.info('Catalog fetch request');

    // Get catalog from blockchain (no fallback - returns empty if not initialized)
    const catalog = await getProvisions();
    const itemCount = Object.keys(catalog).length;

    return {
      success: true,
      catalog,
      isEmpty: itemCount === 0,
      itemCount,
    };
  }
);

/**
 * POST /api/store/admin/catalog
 * 
 * Create a new item in the catalog
 * 
 * SECURITY: Protected with API key authentication
 * 
 * Request body:
 * {
 *   itemId: string,
 *   name: string,
 *   description: string,
 *   category: 'defensive' | 'offensive' | 'tactical' | 'utility',
 *   icon: string,
 *   levels: Array<{
 *     level: number,
 *     effect?: string,
 *     description?: string
 *   }>,
 *   active?: boolean (default: true)
 * }
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Require admin authentication - check API key OR admin wallet
    const hasApiKey = verifyApiKey(request);
    
    const body = await getRequestBody<{
      itemId: string;
      name: string;
      description: string;
      category: 'defensive' | 'offensive' | 'tactical' | 'utility';
      icon: string;
      levels?: Array<{
        level: number;
        effect?: string;
        description?: string;
      }>;
      active?: boolean;
      adminWalletAddress?: string;
      ecosystemId?: string;
      appId?: string;
    }>(request);

    // If no API key, verify admin wallet address
    if (!hasApiKey) {
      const adminWallet = getAdminWalletService();
      const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
      const providedAdminAddress = body.adminWalletAddress?.toLowerCase();

      if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
        throw new PlatformError(
          PlatformErrorCode.UNAUTHORIZED,
          'Unauthorized. Valid API key or admin wallet address required.'
        );
      }
    }

    const adminId = getAdminIdentifier(request);
    const normalizedItemId = toDynamicProvisionKey(body.itemId);

    // Validate input
    if (!body.itemId) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'itemId is required'
      );
    }

    if (!body.name || !body.description || !body.category || !body.icon) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'name, description, category, and icon are required'
      );
    }

    // Levels are optional for non-leveled items (single purchase).
    if (body.levels != null && !Array.isArray(body.levels)) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'levels must be an array when provided');
    }

    PlatformLogger.info('Admin catalog create request', {
      adminId,
      itemId: body.itemId,
      normalizedItemId,
    });

    const adminWallet = getAdminWalletService();
    const adminAddress = adminWallet.getAddress();

    const transactions: string[] = [];
    const digests: string[] = [];

    const platformOptions = buildPlatformCallOptions(request, body);
    const catalogOverrides = getCatalogBuildOverrides();
    try {
      // Step 1: Build and execute item definition via Channel (dry-run gas)
      const build1 = await buildBatchViaChannel(
        {
          operations: [{
            operationId: 'catalog-set-definition',
            params: {
              itemId: normalizedItemId,
              name: body.name,
              description: body.description,
              category: body.category,
              icon: body.icon,
              active: body.active !== false,
              catalogSender: adminAddress,
              corridorAdminCapId: catalogOverrides.catalogAdminCapId,
              ...(catalogOverrides.catalogPackageId && { catalogPackageId: catalogOverrides.catalogPackageId }),
              ...(catalogOverrides.catalogRegistryId && { catalogRegistryId: catalogOverrides.catalogRegistryId }),
            },
          }],
        },
        platformOptions
      );
      if (!build1.success || !build1.transactions?.length) {
        throw new Error(build1.error || build1.errors?.[0] || 'Failed to build item definition transaction');
      }
      const tx1Bytes = Buffer.from(build1.transactions[0], 'base64');
      const signed1 = await adminWallet.getKeypair().signTransaction(tx1Bytes);
      const sig1 = typeof signed1 === 'object' && signed1 !== null && 'signature' in signed1 ? (signed1 as { signature: string }).signature : String(signed1);
      const result1 = await platformTxClient.executeSigned({ transactionBytesBase64: build1.transactions[0], signature: sig1 }, platformOptions);
      if (!result1.success) throw new Error(result1.error || 'Transaction failed');
      transactions.push(`item_definition_${normalizedItemId}`);
      if (result1.digest) digests.push(result1.digest);
      PlatformLogger.info(`Item definition created: ${normalizedItemId}`, { digest: result1.digest });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Add all levels via Channel (if provided)
      for (const levelData of (body.levels ?? [])) {
        const build2 = await buildBatchViaChannel(
          {
            operations: [{
              operationId: 'catalog-set-level',
              params: {
                itemId: normalizedItemId,
                level: levelData.level,
                effect: levelData.effect || '',
                description: levelData.description || '',
                catalogSender: adminAddress,
                corridorAdminCapId: catalogOverrides.catalogAdminCapId,
                ...(catalogOverrides.catalogPackageId && { catalogPackageId: catalogOverrides.catalogPackageId }),
                ...(catalogOverrides.catalogRegistryId && { catalogRegistryId: catalogOverrides.catalogRegistryId }),
              },
            }],
          },
          platformOptions
        );
        if (!build2.success || !build2.transactions?.length) {
          throw new Error(build2.error || build2.errors?.[0] || `Failed to build level ${levelData.level} transaction`);
        }
        const tx2Bytes = Buffer.from(build2.transactions[0], 'base64');
        const signed2 = await adminWallet.getKeypair().signTransaction(tx2Bytes);
        const sig2 = typeof signed2 === 'object' && signed2 !== null && 'signature' in signed2 ? (signed2 as { signature: string }).signature : String(signed2);
        const result2 = await platformTxClient.executeSigned({ transactionBytesBase64: build2.transactions[0], signature: sig2 }, platformOptions);
        if (!result2.success) throw new Error(result2.error || 'Transaction failed');
        transactions.push(`level_${levelData.level}_${normalizedItemId}`);
        if (result2.digest) digests.push(result2.digest);
        PlatformLogger.info(`Level ${levelData.level} added for ${normalizedItemId}`, { digest: result2.digest });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      getProvisionsService().clearCache();
      clearProvisionsCache();
      await notifyPublicStoreCatalogChanged({ reason: 'admin:catalog:create-item' });

      PlatformLogger.info('Catalog item created', {
        adminId,
        itemId: normalizedItemId,
        transactions: transactions.length,
      });

      return {
        success: true,
        message: `Item created successfully. ${transactions.length} transaction${transactions.length > 1 ? 's' : ''} executed.`,
        digests,
      };

    } catch (error) {
      PlatformLogger.error('Failed to create item on blockchain', {
        adminId,
        itemId: body.itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new PlatformError(
        PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
        `Failed to create item on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * PUT /api/store/admin/catalog
 * 
 * Update the provisions catalog (metadata and level text; sell prices are Stockroom-only)
 * 
 * SECURITY: Protected with API key authentication
 * 
 * Request body:
 * {
 *   itemId: string,
 *   updates: {
 *     name?: string,
 *     description?: string,
 *     category?: 'defensive' | 'offensive' | 'tactical' | 'utility',
 *     icon?: string,
 *     active?: boolean,
 *     levels?: Array<{
 *       level: number,
 *       usdPrice?: number,
 *       effect?: string,
 *       description?: string
 *     }>
 *   }
 * }
 */
export const PUT = withApiHandler(
  async (request: NextRequest) => {
    // Require admin authentication - check API key OR admin wallet
    const hasApiKey = verifyApiKey(request);
    
    const body = await getRequestBody<{
      itemId: string;
      updates: Partial<StoreItem>;
      adminWalletAddress?: string;
      ecosystemId?: string;
      appId?: string;
    }>(request);

    // If no API key, verify admin wallet address
    if (!hasApiKey) {
      const adminWallet = getAdminWalletService();
      const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
      const providedAdminAddress = body.adminWalletAddress?.toLowerCase();

      if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
        throw new PlatformError(
          PlatformErrorCode.UNAUTHORIZED,
          'Unauthorized. Valid API key or admin wallet address required.'
        );
      }
    }

    const adminId = getAdminIdentifier(request);
    const normalizedItemId = toDynamicProvisionKey(body.itemId);

    // Validate input
    if (!body.itemId) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'itemId is required'
      );
    }

    if (!body.updates || Object.keys(body.updates).length === 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'updates object is required and must not be empty'
      );
    }

    PlatformLogger.info('Admin catalog update request', {
      adminId,
      itemId: body.itemId,
      normalizedItemId,
      updates: Object.keys(body.updates),
    });

    const adminWallet = getAdminWalletService();
    const ecosystemId = getEcosystemIdFromRequest(request, body);
    const adminAddress = adminWallet.getAddress();

    const transactions: string[] = [];
    const digests: string[] = [];

    const platformOptions = buildPlatformCallOptions(request, body, { ecosystemId });
    try {
      if (body.updates.name !== undefined ||
          body.updates.description !== undefined ||
          body.updates.category !== undefined ||
          body.updates.icon !== undefined) {
        const currentCatalog = await getProvisions();
        const currentItem = currentCatalog[normalizedItemId];
        const catalogOverrides = getCatalogBuildOverrides();
        const build = await buildBatchViaChannel(
          {
            operations: [{
              operationId: 'catalog-set-definition',
              params: {
                itemId: normalizedItemId,
                name: body.updates.name ?? currentItem?.name ?? '',
                description: body.updates.description ?? currentItem?.description ?? '',
                category: body.updates.category ?? currentItem?.category ?? 'defensive',
                icon: body.updates.icon ?? currentItem?.icon ?? '',
                active: true,
                catalogSender: adminAddress,
                corridorAdminCapId: catalogOverrides.catalogAdminCapId,
                ...(catalogOverrides.catalogPackageId && { catalogPackageId: catalogOverrides.catalogPackageId }),
                ...(catalogOverrides.catalogRegistryId && { catalogRegistryId: catalogOverrides.catalogRegistryId }),
              },
            }],
          },
          platformOptions
        );
        if (!build.success || !build.transactions?.length) {
          throw new Error(build.error || build.errors?.[0] || 'Failed to build item definition transaction');
        }
        const txBytes = Buffer.from(build.transactions[0], 'base64');
        const signed = await adminWallet.getKeypair().signTransaction(txBytes);
        const sig = typeof signed === 'object' && signed !== null && 'signature' in signed ? (signed as { signature: string }).signature : String(signed);
        const result = await platformTxClient.executeSigned({ transactionBytesBase64: build.transactions[0], signature: sig }, platformOptions);
        if (!result.success) throw new Error(result.error || 'Transaction failed');
        transactions.push(`item_definition_${normalizedItemId}`);
        if (result.digest) digests.push(result.digest);
        PlatformLogger.info(`Item definition updated: ${normalizedItemId}`, { digest: result.digest });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (body.updates.levels && Array.isArray(body.updates.levels) && body.updates.levels.length > 0) {
        const catalogOverridesUpdate = getCatalogBuildOverrides();
        for (const levelData of body.updates.levels) {
          const build = await buildBatchViaChannel(
            {
              operations: [{
                operationId: 'catalog-set-level',
                params: {
                  itemId: normalizedItemId,
                  level: levelData.level,
                  effect: levelData.effect || '',
                  description: levelData.description || '',
                  catalogSender: adminAddress,
                  corridorAdminCapId: catalogOverridesUpdate.catalogAdminCapId,
                  ...(catalogOverridesUpdate.catalogPackageId && { catalogPackageId: catalogOverridesUpdate.catalogPackageId }),
                  ...(catalogOverridesUpdate.catalogRegistryId && { catalogRegistryId: catalogOverridesUpdate.catalogRegistryId }),
                },
              }],
            },
            platformOptions
          );
          if (!build.success || !build.transactions?.length) {
            throw new Error(build.error || build.errors?.[0] || `Failed to build level ${levelData.level} transaction`);
          }
          const txBytes = Buffer.from(build.transactions[0], 'base64');
          const signed = await adminWallet.getKeypair().signTransaction(txBytes);
          const sig = typeof signed === 'object' && signed !== null && 'signature' in signed ? (signed as { signature: string }).signature : String(signed);
          const result = await platformTxClient.executeSigned({ transactionBytesBase64: build.transactions[0], signature: sig }, platformOptions);
          if (!result.success) throw new Error(result.error || 'Transaction failed');
          transactions.push(`level_${levelData.level}_${normalizedItemId}`);
          if (result.digest) digests.push(result.digest);
          PlatformLogger.info(`Level ${levelData.level} updated for ${normalizedItemId}`, { digest: result.digest });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      getProvisionsService().clearCache();
      clearProvisionsCache();
      await notifyPublicStoreCatalogChanged({ reason: 'admin:catalog:update-item' });

      PlatformLogger.info('Catalog update completed', {
        adminId,
        itemId: normalizedItemId,
        transactions: transactions.length,
      });

      return {
        success: true,
        message: `Catalog updated successfully. ${transactions.length} transaction${transactions.length > 1 ? 's' : ''} executed.`,
        digests,
      };

    } catch (error) {
      PlatformLogger.error('Failed to update catalog on blockchain', {
        adminId,
        itemId: body.itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new PlatformError(
        PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
        `Failed to update catalog on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

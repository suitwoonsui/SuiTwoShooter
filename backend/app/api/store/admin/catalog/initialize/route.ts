// ==========================================
// Store Catalog Initialization API
// Initialize provisions (Terminal item definitions) on blockchain from DEFAULT_PROVISIONS_SEED.
// Uses Corridor only: platform builds catalog tx with CorridorAdminCap; game signs and submits.
// Set CORRIDOR_ADMIN_CAP_OBJECT_ID_* in game backend config/contracts.<network>.json (platform validates cap matches ecosystem/app).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getProvisions, clearProvisionsCache, DEFAULT_PROVISIONS_SEED } from '@/lib/services/store/catalog/provisions';
import { getProvisionsService } from '@/lib/services/store/catalog/provisions-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { buildBatchViaChannel, platformTxClient, buildPlatformCallOptions, getCatalogBuildOverrides } from '@/lib/services/platform/client/platform-client';
import { notifyPublicStoreCatalogChanged } from '@/lib/cache/public-nonuser-data-cache';

function toDynamicProvisionKey(rawId: string): string {
  // Contract accepts [a-z0-9_] keys only; fallback IDs are legacy camelCase.
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
 * POST /api/store/admin/catalog/initialize
 * 
 * Initialize Provisions (store catalog) on blockchain from the default seed catalog
 * This will add all items from DEFAULT_PROVISIONS_SEED to the blockchain
 * 
 * SECURITY: Protected with API key authentication
 * 
 * Request body:
 * {
 *   adminWalletAddress?: string; // Optional admin wallet for verification
 *   skipExisting?: boolean; // Skip items that already exist on-chain (default: true)
 *   includeLevels?: boolean; // Include level metadata writes (default: true)
 * }
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Require admin authentication - check API key OR admin wallet
    const hasApiKey = verifyApiKey(request);
    
    const body = await getRequestBody<{
      adminWalletAddress?: string;
      skipExisting?: boolean;
      includeLevels?: boolean;
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
    const skipExisting = body.skipExisting !== false; // Default to true
    // Keep level metadata by default; migration removes pricing authority, not level structure.
    const includeLevels = body.includeLevels !== false;
    PlatformLogger.info('Admin catalog initialization request', {
      adminId,
      skipExisting,
      includeLevels,
    });

    const catalogService = getProvisionsService();
    const adminWallet = getAdminWalletService();

    const transactions: string[] = [];
    const digests: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ itemId: string; error: string }> = [];

    try {
      const catalogResult = await catalogService.getCatalog();
      const blockchainCatalog = catalogResult.success && catalogResult.catalog ? catalogResult.catalog : {};

      const itemsToInitialize: Array<{
        itemId: string;
        name: string;
        description: string;
        category: 'defensive' | 'offensive' | 'tactical' | 'utility';
        icon: string;
        levels: Array<{ level: number; effect: string; description: string }>;
      }> = [];

      for (const [legacyItemId, item] of Object.entries(DEFAULT_PROVISIONS_SEED)) {
        const itemId = toDynamicProvisionKey(legacyItemId);
        if (skipExisting && blockchainCatalog[itemId]) {
          PlatformLogger.info(`Skipping ${legacyItemId} (${itemId}) - already exists on blockchain`);
          skipped.push(legacyItemId);
          continue;
        }
        itemsToInitialize.push({
          itemId,
          name: item.name,
          description: item.description,
          category: item.category,
          icon: item.icon,
          levels: includeLevels
            ? (item.levels ?? []).map((level) => ({
                level: level.level,
                effect: level.effect || '',
                description: level.description || '',
              }))
            : [],
        });
      }

      if (itemsToInitialize.length === 0) {
        return {
          success: true,
          message: 'All items already initialized on blockchain.',
          totalItems: Object.keys(DEFAULT_PROVISIONS_SEED).length,
          successful: 0,
          skipped: skipped.length,
          errors: 0,
          skippedItems: skipped.length > 0 ? skipped : undefined,
          transactions: [],
          digests: [],
        };
      }

      // Build via Aqueduct Channel (dry-run gas), then game signs and submits.
      const platformOptions = buildPlatformCallOptions(request, body);
      const catalogOverrides = getCatalogBuildOverrides();
      if (!catalogOverrides.catalogAdminCapId?.trim()?.startsWith('0x')) {
        throw new PlatformError(
          PlatformErrorCode.CONFIG_MISSING,
          'Game contract config missing CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (required for catalog build; Move expects CorridorAdminCap). Set it in config/contracts.<network>.json.'
        );
      }
      const build = await buildBatchViaChannel(
        {
          operations: [
            {
              operationId: 'catalog-batched-init',
              params: {
                items: itemsToInitialize,
                catalogSender: adminWallet.getAddress(),
                corridorAdminCapId: catalogOverrides.catalogAdminCapId,
                // Large batched tx; avoid execute-time InsufficientGas (default may be too low).
                gasBudgetMist: 800_000_000,
                ...(catalogOverrides.catalogPackageId && { catalogPackageId: catalogOverrides.catalogPackageId }),
                ...(catalogOverrides.catalogRegistryId && { catalogRegistryId: catalogOverrides.catalogRegistryId }),
              },
            },
          ],
        },
        platformOptions
      );
      if (!build.success || !build.transactions?.length) {
        const msg = build.error || build.errors?.[0] || 'Failed to build batched transaction';
        if (msg.includes('not configured') || msg.includes('PROVISIONS') || msg.includes('catalogAdminCapId') || msg.includes('CorridorAdminCap') || msg.includes('AppAdminCap')) {
          throw new PlatformError(
            PlatformErrorCode.CONFIG_MISSING,
            'Game: set CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (recommended) or CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET in game backend config/contracts.<network>.json for catalog build. Platform: set PROVISIONS_REGISTRY_ID_TESTNET (and optionally PROVISIONS_PACKAGE_ID_TESTNET) in Aqueduct Platform/backend/config/contracts.<network>.json for the shared registry.'
          );
        }
        throw new Error(msg);
      }
      const transactionBase64 = build.transactions[0];
      const levelOperationCount = includeLevels
        ? itemsToInitialize.reduce((sum, item) => sum + item.levels.length, 0)
        : 0;
      const operationCount = itemsToInitialize.length + levelOperationCount;
      const txBytes = Buffer.from(transactionBase64, 'base64');
      const signed = await adminWallet.getKeypair().signTransaction(txBytes);
      const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
        ? (signed as { signature: string }).signature
        : String(signed);
      const result = await platformTxClient.executeSigned(
        { transactionBytesBase64: transactionBase64, signature },
        platformOptions
      );
      if (!result.success) {
        throw new Error(`Batched transaction failed: ${result.error || 'Unknown error'}`);
      }
      if (result.digest) digests.push(result.digest);

      for (const item of itemsToInitialize) {
        transactions.push(`item_definition_${item.itemId}`);
        if (includeLevels) {
          for (const level of item.levels) {
            transactions.push(`level_${level.level}_${item.itemId}`);
          }
        }
      }

      PlatformLogger.info('✅ Batched initialization completed successfully', {
        digest: result.digest,
        itemCount: itemsToInitialize.length,
        operationCount,
      });

      catalogService.clearCache();
      clearProvisionsCache();
      await notifyPublicStoreCatalogChanged({ reason: 'admin:catalog:initialize' });

      PlatformLogger.info('Catalog initialization completed', {
        adminId,
        totalItems: Object.keys(DEFAULT_PROVISIONS_SEED).length,
        successful: transactions.length,
        skipped: skipped.length,
        errors: errors.length,
      });

      return {
        success: true,
        message: includeLevels
          ? `Catalog initialization completed. ${itemsToInitialize.length} item${itemsToInitialize.length > 1 ? 's' : ''} initialized with definitions and level metadata in 1 batched transaction. Set sell prices in Admin → Stockroom.`
          : `Catalog initialization completed. ${itemsToInitialize.length} item${itemsToInitialize.length > 1 ? 's' : ''} definitions initialized in 1 batched transaction (no level writes).`,
        totalItems: Object.keys(DEFAULT_PROVISIONS_SEED).length,
        successful: itemsToInitialize.length,
        skipped: skipped.length,
        errors: errors.length,
        skippedItems: skipped.length > 0 ? skipped : undefined,
        errorDetails: errors.length > 0 ? errors : undefined,
        transactions,
        digests,
        batched: true,
        operationCount,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      PlatformLogger.error('Failed to initialize catalog on blockchain', {
        adminId,
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // "Object X is owned by account address A, but given owner/signer address is B" = wrong wallet signed
      const signerMismatch = typeof message === 'string' &&
        message.includes('owned by account address') &&
        message.includes('but given owner/signer address is');
      const hintSigner = signerMismatch
        ? ' The CorridorAdminCap is owned by one address but the transaction was signed by another. Set GAME_WALLET_PRIVATE_KEY in the game backend .env to the private key of the address that owns CORRIDOR_ADMIN_CAP_OBJECT_ID (the cap owner), not the signer that was used. After a new platform deploy, the new cap is minted to a specific wallet—use that wallet’s key.'
        : '';

      // TypeMismatch on arg 0 = wrong cap type (CorridorCap vs CorridorAdminCap or old package cap)
      const isTypeMismatchArg0 =
        typeof message === 'string' &&
        message.includes('TypeMismatch') &&
        (message.includes('arg_idx: 0') || message.includes('arg_idx: 0,'));

      const hintType = isTypeMismatchArg0
        ? ' Catalog build requires CorridorAdminCap (CORRIDOR_ADMIN_CAP_OBJECT_ID_*). Ensure it is not set to CorridorCap and that the cap was minted with the current platform package.'
        : '';

      throw new PlatformError(
        PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
        `Failed to initialize catalog on blockchain: ${message}${hintSigner}${hintType}`
      );
    }
  }
);

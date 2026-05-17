// ==========================================
// Store Catalog Item Management API
// Delete/Deactivate individual items
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { clearProvisionsCache } from '@/lib/services/store/catalog/provisions';
import { getProvisionsService } from '@/lib/services/store/catalog/provisions-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { buildBatchViaChannel, buildPlatformCallOptions, getCatalogBuildOverrides } from '@/lib/services/platform/client/platform-client';
import { getProvisions } from '@/lib/services/store/catalog/provisions';
import { callPlatformBackend } from '@/lib/services/platform/client/platform-client';
import { platformRemoveStockroomItemListing, platformRemoveStockroomOffer } from '@/lib/services/platform/app-config/platform-app-config';
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
 * DELETE /api/store/admin/catalog/[itemId]
 * 
 * Deactivate an item (soft delete - sets active to false)
 * 
 * SECURITY: Protected with API key authentication
 * 
 * Request body (optional):
 * {
 *   adminWalletAddress?: string;
 *   permanent?: boolean; // If true, also removes all levels (not implemented yet)
 * }
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  const params = await context.params;
  return withApiHandler(
    async (request: NextRequest) => {
      // Require admin authentication - check API key OR admin wallet
      const hasApiKey = verifyApiKey(request);
      
      const body = (await getRequestBody<{
        adminWalletAddress?: string;
        permanent?: boolean;
      }>(request).catch(() => ({}))) as { adminWalletAddress?: string; permanent?: boolean }; // Optional body

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
      const itemId = params.itemId;
      const normalizedItemId = toDynamicProvisionKey(itemId);

      if (!itemId) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'itemId is required'
        );
      }

      PlatformLogger.info('Admin catalog item deletion request', {
        adminId,
        itemId,
        normalizedItemId,
        permanent: body.permanent || false,
      });

      const adminWallet = getAdminWalletService();

      try {
        const platformOptions = buildPlatformCallOptions(request, body);
        const catalogOverrides = getCatalogBuildOverrides();

        // Snapshot existing levels before deactivation so we can cascade-remove Stockroom rows.
        let existingLevels: number[] = [];
        try {
          const catalog = await getProvisions();
          const item = catalog?.[normalizedItemId] as any;
          const levels = Array.isArray(item?.levels) ? item.levels : [];
          existingLevels = levels
            .map((l: any) => Number(l?.level))
            .filter((n: number) => Number.isFinite(n) && n > 0 && n <= 255)
            .map((n: number) => Math.trunc(n));
        } catch {
          existingLevels = [];
        }

        const build = await buildBatchViaChannel(
          {
            operations: [{
              operationId: 'catalog-set-status',
              params: {
                itemId: normalizedItemId,
                active: false,
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
          throw new Error(build.error || build.errors?.[0] || 'Failed to build deactivate transaction');
        }
        const txBytes = Buffer.from(build.transactions[0], 'base64');
        const signed = await adminWallet.getKeypair().signTransaction(txBytes);
        const sig = typeof signed === 'object' && signed !== null && 'signature' in signed ? (signed as { signature: string }).signature : String(signed);
        const { platformTxClient } = await import('@/lib/services/platform/client/platform-client');
        const result = await platformTxClient.executeSigned({ transactionBytesBase64: build.transactions[0], signature: sig }, platformOptions);
        if (!result.success) throw new Error(result.error || 'Transaction failed');
        getProvisionsService().clearCache();
        clearProvisionsCache();

        // Cascade delete Stockroom data for this item so the store SKU map doesn't retain ghost rows.
        const stockroomDigests: string[] = [];
        const stockroomErrors: string[] = [];

        // 1) Remove base (no-level) listing.
        try {
          const r = await platformRemoveStockroomItemListing({ itemKey: normalizedItemId });
          if (r.success && r.digest) stockroomDigests.push(r.digest);
          if (!r.success) stockroomErrors.push(r.error || 'Failed to remove base item listing');
        } catch (e: unknown) {
          stockroomErrors.push(e instanceof Error ? e.message : String(e));
        }

        // 2) Remove any known leveled listings (from catalog snapshot).
        for (const lvl of existingLevels) {
          try {
            const r = await platformRemoveStockroomItemListing({ itemKey: normalizedItemId, level: lvl });
            if (r.success && r.digest) stockroomDigests.push(r.digest);
            if (!r.success) stockroomErrors.push(r.error || `Failed to remove item listing L${lvl}`);
          } catch (e: unknown) {
            stockroomErrors.push(e instanceof Error ? e.message : String(e));
          }
        }

        // 3) Remove any bundle offers that reference this item (best-effort).
        try {
          const stockRes = await callPlatformBackend<{ success: boolean; offers?: Record<string, any> }>('api/stockroom/offers', { method: 'GET' });
          if (stockRes.success && stockRes.offers) {
            for (const [offerId, def] of Object.entries(stockRes.offers)) {
              const listingSource = String((def as any)?.listingSource ?? (def as any)?.listing_source ?? 'offer').toLowerCase();
              if (listingSource !== 'offer') continue;

              const provisionKey = String((def as any)?.provisionItemKey ?? (def as any)?.provision_item_key ?? '').trim().toLowerCase();
              const bundleLines = Array.isArray((def as any)?.bundleLines) ? (def as any).bundleLines : [];
              const bundleRefs = bundleLines.some((l: any) => {
                const bk = String(l?.balanceKey ?? l?.balance_key ?? '').trim().toLowerCase();
                return bk === normalizedItemId || bk.startsWith(`${normalizedItemId}:l`);
              });

              if (provisionKey === normalizedItemId || bundleRefs) {
                try {
                  const r = await platformRemoveStockroomOffer(String(offerId));
                  if (r.success && r.digest) stockroomDigests.push(r.digest);
                  if (!r.success) stockroomErrors.push(r.error || `Failed to remove offer ${offerId}`);
                } catch (e: unknown) {
                  stockroomErrors.push(e instanceof Error ? e.message : String(e));
                }
              }
            }
          }
        } catch (e: unknown) {
          stockroomErrors.push(e instanceof Error ? e.message : String(e));
        }

        PlatformLogger.info('Item deactivated successfully', {
          adminId,
          itemId: normalizedItemId,
          digest: result.digest,
        });

        await notifyPublicStoreCatalogChanged({ reason: 'admin:catalog:deactivate-item' });

        return {
          success: true,
          message: `Item ${normalizedItemId} deactivated successfully. Stockroom rows removed: ${stockroomDigests.length}.`,
          digest: result.digest,
          stockroom: {
            digests: stockroomDigests,
            errors: stockroomErrors.length ? stockroomErrors : undefined,
          },
        };

      } catch (error) {
        PlatformLogger.error('Failed to deactivate item on blockchain', {
          adminId,
          itemId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        throw new PlatformError(
          PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
          `Failed to deactivate item on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  )(request, context);
}

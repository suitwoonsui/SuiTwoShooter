// ==========================================
// Game Config Admin API - Initialize credits (Corridor only): Provisions catalog + **item listing** for credits.
// Priced credits live in Stockroom item listings (catalog key with optional level), same as the Stockroom admin item columns.
// Bundle SKUs remain separate (`offers` with offer_type = 1). Admin "Initialize (defaults)" for credits hits this route.
// ==========================================
// POST: catalog-set-definition `credits`, then default **base** item listing (no level → balance_key `credits`).

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getCorridorAdminCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';
import {
  isPlatformAppConfigEnabled,
  platformRemoveStockroomItemListing,
  platformRemoveStockroomOffer,
  platformSetStockroomOffer,
  platformSetStockroomItemListing,
} from '@/lib/services/platform/app-config/platform-app-config';
import {
  buildBatchViaChannel,
  buildPlatformCallOptions,
  getCatalogBuildOverrides,
  platformTxClient,
} from '@/lib/services/platform/client/platform-client';
import { clearProvisionsCache } from '@/lib/services/store/catalog/provisions';
import { getProvisionsService } from '@/lib/services/store/catalog/provisions-service';
import { notifyPublicStoreCatalogChanged } from '@/lib/cache/public-nonuser-data-cache';

const DEFAULT_CREDIT_PACK_BUNDLES: Array<{ legacyPackType: number; credits: number; priceUsdCents: number }> = [
  // Matches game purchase fallback packs (packType 1-4). packType 0 is the base `credits` item listing.
  { legacyPackType: 1, credits: 11, priceUsdCents: 100 },
  { legacyPackType: 2, credits: 60, priceUsdCents: 500 },
  { legacyPackType: 3, credits: 125, priceUsdCents: 1000 },
  { legacyPackType: 4, credits: 275, priceUsdCents: 2000 },
];

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const hasApiKey = verifyApiKey(request);
    const body = (await getRequestBody<{
      adminWalletAddress?: string;
    }>(request).catch(() => ({}))) as {
      adminWalletAddress?: string;
    };

    if (!hasApiKey) {
      const adminWallet = getAdminWalletService();
      const expected = adminWallet.getAddress().toLowerCase();
      const provided = body.adminWalletAddress?.toLowerCase();
      if (!provided || provided !== expected) {
        throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
      }
    }

    if (!isPlatformAppConfigEnabled()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Credits initialization uses Corridor only (platform Helm). Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }
    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Credits initialization requires CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (or CORRIDOR_ADMIN_CAP_OBJECT_ID_MAINNET) in game backend config/contracts.<network>.json. Ecosystem app registries must be set on platform.'
      );
    }

    const adminWallet = getAdminWalletService();
    const platformOptions = buildPlatformCallOptions(request, body);
    const catalogOverrides = getCatalogBuildOverrides();
    const build = await buildBatchViaChannel(
      {
        operations: [{
          operationId: 'catalog-set-definition',
          params: {
            itemId: 'credits',
            name: 'Credits',
            description: 'Standalone credit item for stockroom pricing.',
            category: 'utility',
            icon: '🎮',
            active: true,
            catalogSender: adminWallet.getAddress(),
            corridorAdminCapId,
            ...(catalogOverrides.catalogPackageId && { catalogPackageId: catalogOverrides.catalogPackageId }),
            ...(catalogOverrides.catalogRegistryId && { catalogRegistryId: catalogOverrides.catalogRegistryId }),
          },
        }],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.length) {
      throw new PlatformError(
        PlatformErrorCode.UNKNOWN_ERROR,
        build.error || build.errors?.[0] || 'Failed to build credits item initialization transaction'
      );
    }
    const txBytes = Buffer.from(build.transactions[0], 'base64');
    const signed = await adminWallet.getKeypair().signTransaction(txBytes);
    const signature =
      typeof signed === 'object' && signed !== null && 'signature' in signed
        ? (signed as { signature: string }).signature
        : String(signed);
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature },
      platformOptions
    );
    if (!result.success) {
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to initialize credits item');
    }

    // Credits base listing (no level): balance_key must be `credits`.
    // Also remove legacy credits level-1 listing (mapped to `pack:0`) if it exists.
    const listingResult = await platformSetStockroomItemListing({
      itemKey: 'credits',
      priceUsdCents: 10,
      description: 'Pay-per-game - Purchase one credit',
      balanceKey: 'credits',
      creditAmount: 1,
      maxSupply: 0,
      active: true,
      additionalData: JSON.stringify({ name: 'Single Game', legacyPackType: 0 }),
    });
    if (!listingResult.success) {
      throw new PlatformError(
        PlatformErrorCode.UNKNOWN_ERROR,
        listingResult.error || 'Failed to set credits item listing (Stockroom item SKU)'
      );
    }

    const legacyRemoval = await platformRemoveStockroomItemListing({ itemKey: 'credits', level: 1 }).catch(() => ({ success: false } as const));
    const oldPackRemoval = await platformRemoveStockroomOffer('credit_pack_400').catch(() => ({ success: false } as const));

    // Credit packs are bundles: offer_type = 1 with bundleLines that reference `credits` quantity.
    // IDs are lowercase to keep downstream usage consistent.
    const packDigests: string[] = [];
    for (const pack of DEFAULT_CREDIT_PACK_BUNDLES) {
      const offerId = `credit_pack_${pack.credits}`;
      const name = `${pack.credits} Credits`;
      const description = `${pack.credits} Credits`;
      const offerRes = await platformSetStockroomOffer({
        offerId,
        offerType: 1,
        amount: 1,
        priceUsdCents: Math.max(0, Math.round(pack.priceUsdCents)),
        description,
        active: true,
        additionalData: JSON.stringify({ name, legacyPackType: pack.legacyPackType }),
        bundleLines: [{ balanceKey: 'credits', amount: Math.max(1, Math.floor(pack.credits)) }],
      });
      if (!offerRes.success) {
        throw new PlatformError(
          PlatformErrorCode.UNKNOWN_ERROR,
          offerRes.error || `Failed to set credits pack bundle offer (${offerId})`
        );
      }
      if (offerRes.digest) packDigests.push(offerRes.digest);
    }

    getProvisionsService().clearCache();
    clearProvisionsCache();
    await notifyPublicStoreCatalogChanged({ reason: 'game-config:init-credits' });

    return {
      success: true,
      message:
        'Initialized Provisions: credits, plus default base item listing (reservoir balance `credits`). Removed legacy credits level-1 listing (`pack:0`) if present. Created default credit pack bundle offers (credits × N). Removed legacy credit_pack_400 bundle offer if present.',
      digests: [result.digest, listingResult.digest, legacyRemoval.success ? legacyRemoval.digest : null, oldPackRemoval.success ? oldPackRemoval.digest : null, ...packDigests].filter(Boolean) as string[],
    };
  }
);

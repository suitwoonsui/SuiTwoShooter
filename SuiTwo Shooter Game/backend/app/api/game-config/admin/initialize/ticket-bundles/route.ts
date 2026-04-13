// ==========================================
// Game Config Admin API - Initialize tickets (Corridor only): Provisions catalog + base `tickets` listing + multi-qty bundles.
// Single ticket = Stockroom item listing `tickets` (price on the SKU). Multi packs = `ticket_pack_*` bundle offers.
// ==========================================
// POST: catalog-set-definition `tickets`, base item listing, then ticket_pack_* for quantities > 1.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getCorridorAdminCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';
import {
  isPlatformAppConfigEnabled,
  platformSetStockroomItemListing,
  platformSetStockroomOffer,
} from '@/lib/services/platform/app-config/platform-app-config';
import {
  buildBatchViaChannel,
  buildPlatformCallOptions,
  getCatalogBuildOverrides,
  platformTxClient,
} from '@/lib/services/platform/client/platform-client';
import { clearProvisionsCache } from '@/lib/services/store/catalog/provisions';
import { getProvisionsService } from '@/lib/services/store/catalog/provisions-service';
import { SINGLE_TICKET_STOCKROOM, TICKET_BUNDLES } from '@/data/initialization-data';

const DEFAULT_TICKET_PACK_BUNDLES: Array<{ tickets: number; priceUsdCents: number; name: string; description: string }> =
  (TICKET_BUNDLES ?? []).map((b) => ({
    tickets: Math.max(1, Math.floor(Number(b.quantity) || 1)),
    priceUsdCents: Math.max(0, Math.round(Number(b.priceUsdCents) || 0)),
    name: typeof b.name === 'string' && b.name.trim() ? b.name.trim() : `Ticket Pack of ${b.quantity}`,
    description:
      typeof b.description === 'string' && b.description.trim() ? b.description.trim() : `${b.quantity} Tickets`,
  }));

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
        'Ticket bundles initialization uses Corridor only (platform Helm). Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }
    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Ticket bundles initialization requires CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json. Platform builds set_config tx; game signs.'
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
            itemId: 'tickets',
            name: 'Tickets',
            description: 'Standalone tickets item for stockroom pricing.',
            category: 'utility',
            icon: '🎟️',
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
        build.error || build.errors?.[0] || 'Failed to build ticket item initialization transaction'
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
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to initialize tickets item');
    }

    const baseListing = await platformSetStockroomItemListing({
      itemKey: 'tickets',
      priceUsdCents: Math.max(0, Math.round(SINGLE_TICKET_STOCKROOM.priceUsdCents)),
      description: SINGLE_TICKET_STOCKROOM.description,
      balanceKey: 'tickets',
      creditAmount: 1,
      maxSupply: 0,
      active: true,
      additionalData: JSON.stringify({ name: SINGLE_TICKET_STOCKROOM.name, kind: 'ticket_single' }),
    });
    if (!baseListing.success) {
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, baseListing.error || 'Failed to set single-ticket Stockroom listing');
    }

    // Ticket packs are bundles: offer_type = 1 with bundleLines that reference `tickets` quantity.
    // IDs are lowercase to keep downstream usage consistent.
    const packDigests: string[] = [];
    for (const pack of DEFAULT_TICKET_PACK_BUNDLES) {
      if (pack.tickets <= 1) continue;
      const offerId = `ticket_pack_${pack.tickets}`;
      const name = pack.name;
      const description = pack.description;
      const offerRes = await platformSetStockroomOffer({
        offerId,
        offerType: 1,
        amount: 1,
        priceUsdCents: Math.max(0, Math.round(pack.priceUsdCents)),
        description,
        active: true,
        additionalData: JSON.stringify({ name, kind: 'ticket_pack' }),
        bundleLines: [{ balanceKey: 'tickets', amount: Math.max(1, Math.floor(pack.tickets)) }],
      });
      if (!offerRes.success) {
        throw new PlatformError(
          PlatformErrorCode.UNKNOWN_ERROR,
          offerRes.error || `Failed to set ticket pack bundle offer (${offerId})`
        );
      }
      if (offerRes.digest) packDigests.push(offerRes.digest);
    }

    getProvisionsService().clearCache();
    clearProvisionsCache();

    return {
      success: true,
      message:
        'Initialized Provisions: tickets catalog, base single-ticket Stockroom listing (`tickets`), and multi-qty ticket_pack_* bundles.',
      digests: [result.digest, baseListing.digest, ...packDigests].filter(Boolean) as string[],
    };
  }
);

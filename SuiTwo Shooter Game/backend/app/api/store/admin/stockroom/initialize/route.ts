import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getCorridorAdminCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';
import { isPlatformAppConfigEnabled, platformSetStockroomItemListing } from '@/lib/services/platform/app-config/platform-app-config';
import { getProvisions } from '@/lib/services/store/catalog/provisions';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

const STANDALONE_ITEM_IDS = new Set(['credits', 'tickets']);
const NON_LEVELED_ITEM_IDS = new Set(['boss_kill_shot', 'destroy_all']);

// Default shooter-game store pricing (USD cents) for leveled Provisions items.
// Keys are dynamic provision ids (snake_case). Level index is 1-based.
const DEFAULT_PRICE_USD_CENTS_BY_ITEM: Record<string, Record<number, number>> = {
  // From legacy store catalog in Backup for reference (Badge implementation).
  extra_lives: { 1: 50, 2: 125, 3: 250 },
  force_field: { 1: 100, 2: 200, 3: 300 },
  orb_level: { 1: 75, 2: 150, 3: 225 },
  coin_tractor_beam: { 1: 100, 2: 150, 3: 200 },
  slow_time: { 1: 150, 2: 225, 3: 300 },
  destroy_all: { 1: 250 },
  boss_kill_shot: { 1: 375 },
};

function defaultPriceUsdCents(itemKey: string, level: number): number {
  const dyn = toDynamicProvisionKey(itemKey);
  const byLevel = DEFAULT_PRICE_USD_CENTS_BY_ITEM[dyn];
  const cents = byLevel?.[level];
  return typeof cents === 'number' && Number.isFinite(cents) && cents >= 0 ? Math.trunc(cents) : 0;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = (await getRequestBody<{
    adminWalletAddress?: string;
    includePricing?: boolean;
  }>(request).catch(() => ({}))) as {
    adminWalletAddress?: string;
    includePricing?: boolean;
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
      'Stockroom initialization uses Corridor only. Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_* in game backend config/contracts.<network>.json.'
    );
  }

  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  if (!corridorAdminCapId?.startsWith('0x')) {
    throw new PlatformError(
      PlatformErrorCode.CONFIG_MISSING,
      'Stockroom initialization requires CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_* in game backend config/contracts.<network>.json.'
    );
  }

  const includePricing = body.includePricing === true;
  const digests: string[] = [];
  const provisions = await getProvisions();
  if (!provisions || typeof provisions !== 'object') {
    throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, 'Failed to load Provisions catalog');
  }

  let totalCreated = 0;
  for (const [itemKey, item] of Object.entries(provisions as Record<string, any>)) {
    if (!itemKey || STANDALONE_ITEM_IDS.has(itemKey)) continue;
    const levels: number[] = Array.isArray(item?.levels)
      ? item.levels
          .map((l: any) => Number(l?.level))
          .filter((n: number) => Number.isFinite(n) && n > 0 && n <= 255)
      : [];
    const dynamicKey = toDynamicProvisionKey(itemKey);
    const isNonLeveled = NON_LEVELED_ITEM_IDS.has(dynamicKey);
    // Non-leveled items: initialize base listing (no level).
    if (isNonLeveled || levels.length === 0) {
      const priceUsdCents = includePricing ? defaultPriceUsdCents(dynamicKey, 1) : 0;
      const result = await platformSetStockroomItemListing({
        itemKey: dynamicKey,
        priceUsdCents,
        description: String(item?.description || itemKey),
        // Non-leveled items use base key (e.g. slow_time, boss_kill_shot).
        balanceKey: dynamicKey,
        creditAmount: 1,
        maxSupply: 0,
        active: true,
        additionalData: JSON.stringify({ kind: includePricing ? 'init_default_priced' : 'init_placeholder', itemKey: dynamicKey }),
      });
      if (!result.success) {
        PlatformLogger.error('Stockroom init set item listing failed', {
          itemKey: dynamicKey,
          error: result.error,
        });
        throw new PlatformError(
          PlatformErrorCode.UNKNOWN_ERROR,
          result.error || `Failed to set item listing for ${dynamicKey}`
        );
      }
      if (result.digest) digests.push(result.digest);
      totalCreated += 1;
      continue;
    }

    for (const level of levels) {
      // Game inventory/UI expects `itemId_level` keys (e.g. extra_lives_2).
      // This is the reservoir `balance_key` that gets credited on purchase.
      const balanceKey = `${dynamicKey}_${level}`;
      const priceUsdCents = includePricing ? defaultPriceUsdCents(dynamicKey, level) : 0;
      const result = await platformSetStockroomItemListing({
        itemKey: dynamicKey,
        level,
        priceUsdCents,
        description: `${String(item?.description || itemKey)} (L${level})`,
        balanceKey,
        creditAmount: 1,
        maxSupply: 0,
        active: true,
        additionalData: JSON.stringify({ kind: includePricing ? 'init_default_priced' : 'init_placeholder', itemKey: dynamicKey, level }),
      });
      if (!result.success) {
        PlatformLogger.error('Stockroom init set item listing failed', {
          itemKey: dynamicKey,
          level,
          error: result.error,
        });
        throw new PlatformError(
          PlatformErrorCode.UNKNOWN_ERROR,
          result.error || `Failed to set item listing for ${dynamicKey}:l${level}`
        );
      }
      if (result.digest) digests.push(result.digest);
      totalCreated += 1;
    }
  }

  return {
    success: true,
    message: `Initialized ${totalCreated} Stockroom item listings for leveled Provisions items (excludes credits/tickets).`,
    digests,
    totalOffers: totalCreated,
    includePricing,
  };
});


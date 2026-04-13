// ==========================================
// Game Config Admin API - Initialize default badge config (Aquifer + Helm)
// ==========================================
// POST: Set default badge discounts and thresholds in Aquifer (key badge_discounts_and_thresholds), minting fee in Helm (key badge_minting_fee). Corridor only.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getCorridorAdminCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';
import { isPlatformAppConfigEnabled, platformSetBadgeDiscountsThresholds, platformSetBadgeMintingFee } from '@/lib/services/platform/app-config/platform-app-config';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

const DEFAULT_STORE_DISCOUNTS = [0, 5, 10, 15, 20, 25];   // Standard, Common, Uncommon, Rare, Epic, Legendary (%)
const DEFAULT_GAMEPLAY_DISCOUNTS = [0, 0, 5, 10, 15, 20];
const DEFAULT_THRESHOLDS = [5, 15, 35, 75, 150];           // games required for Common, Uncommon, Rare, Epic, Legendary
const DEFAULT_MINTING_FEE_USD_CENTS = 10;

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const hasApiKey = verifyApiKey(request);
    const body = await getRequestBody<{ adminWalletAddress?: string }>(request).catch(() => ({})) as { adminWalletAddress?: string };

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
        'Badge config uses platform app-config (Corridor). Set PLATFORM_BACKEND_URL (or PLATFORM_APP_CONFIG_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }
    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Badge config initialization requires CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json. Platform uses it to build the set_config tx for the game to sign.'
      );
    }

    const aquiferResult = await platformSetBadgeDiscountsThresholds({
      storeDiscounts: DEFAULT_STORE_DISCOUNTS,
      gameplayDiscounts: DEFAULT_GAMEPLAY_DISCOUNTS,
      thresholds: DEFAULT_THRESHOLDS,
      version: 1,
    });
    if (!aquiferResult.success) {
      PlatformLogger.error('Badge config initialize (Aquifer) failed', { error: aquiferResult.error });
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, aquiferResult.error || 'Failed to set badge discounts/thresholds in Aquifer.');
    }

    const helmResult = await platformSetBadgeMintingFee(DEFAULT_MINTING_FEE_USD_CENTS);
    if (!helmResult.success) {
      PlatformLogger.error('Badge config initialize (Helm minting fee) failed', { error: helmResult.error });
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, helmResult.error || 'Failed to set badge minting fee in Helm.');
    }

    getGameConfigService().invalidateCache();
    PlatformLogger.info('Badge config initialized (Aquifer discounts/thresholds + Helm minting fee)', { digest: aquiferResult.digest });

    return {
      success: true,
      message: 'Initialized badge config on platform (Aquifer: discounts, thresholds; Helm: minting fee).',
      digest: aquiferResult.digest,
    };
  }
);

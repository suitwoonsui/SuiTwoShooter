// ==========================================
// Admin Default Sustain Config — Initialize on-chain (Sustain Rain)
// ==========================================
// Any app/game/utility with CorridorAdminCap sets its own default sustain config via batch op "default-sustain-config-set".
// Same config as GET/POST .../default-sustain-config (file) and tournament creation.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getConfig } from '@/config/config';
import {
  buildBatchViaChannel,
  platformTxClient,
  getAppIdFromEnv,
  buildPlatformCallOptions,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getSystemDefaultRewards } from '@/lib/services/tournament/rewards-config/default-rewards-config';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const hasApiKey = verifyApiKey(request);
    const body = (await getRequestBody<{ adminWalletAddress?: string; ecosystemId?: string }>(request).catch(
      () => ({} as { adminWalletAddress?: string; ecosystemId?: string })
    ));

    if (!hasApiKey) {
      const adminWallet = getAdminWalletService();
      const expected = adminWallet.getAddress().toLowerCase();
      const provided = body.adminWalletAddress?.toLowerCase();
      if (!provided || provided !== expected) {
        throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
      }
    }

    const config = getConfig();
    const appId = getAppIdFromEnv() || config.server.appId || '';
    if (!appId.trim()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'App ID not configured (APP_ID / GAME_APP_ID).'
      );
    }

    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId?.trim()?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Corridor admin cap required. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json so this app can set its own default sustain config (Sustain Rain).'
      );
    }

    const rewardConfig = getSystemDefaultRewards();
    const platformOptions = buildPlatformCallOptions(request, body, { corridorAdminCapabilityObjectId: corridorAdminCapId });

    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'default-sustain-config-set',
            params: {
              corridorAdminCapId,
              rewardConfig,
              senderAddress: getAdminWalletService().getAddress(),
            },
          },
        ],
      },
      platformOptions
    );

    if (!build.success || !build.transactions?.length) {
      const msg = build.error || build.errors?.[0] || 'Failed to build default sustain config transaction';
      PlatformLogger.error('Default sustain config initialize failed', { appId, error: msg });
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, msg);
    }

    const transactionBase64 = build.transactions[0];
    const txBytes = Buffer.from(transactionBase64, 'base64');
    const adminWallet = getAdminWalletService();
    const signed = await adminWallet.getKeypair().signTransaction(txBytes);
    const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
      ? (signed as { signature: string }).signature
      : String(signed);
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: transactionBase64, signature },
      platformOptions
    );

    if (!result.success) {
      PlatformLogger.error('Default sustain config transaction failed', { appId, error: result.error });
      throw new PlatformError(
        PlatformErrorCode.UNKNOWN_ERROR,
        result.error || 'Failed to set default sustain config on-chain'
      );
    }

    PlatformLogger.info('Default sustain config initialized on-chain', { appId, digest: result.digest });
    return {
      success: true,
      message: 'Default sustain configuration initialized on-chain.',
      digest: result.digest,
      config: rewardConfig,
      summary: {
        totalAdded: 1,
        totalSkipped: 0,
        successCount: 1,
        errorCount: 0,
      },
    };
  }
);

// ==========================================
// Admin Default Sustain Config (Sustain Rain)
// ==========================================
// GET: read from chain via platform (api/regatta/default-sustain-config). Returns null when not initialized.
// Initialize uses code defaults only ( .../initialize ). No file.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import {
  callPlatformBackend,
  buildBatchViaChannel,
  buildPlatformCallOptions,
  platformTxClient,
  getAppIdFromEnv,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';
import { getConfig } from '@/config/config';
import { verifyApiKey } from '@/lib/auth';
import { getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/** Normalize platform rewardConfig to our DefaultRewardConfig shape. */
function normalizeOnChainConfig(r: Record<string, unknown>): {
  rewardDepth: number;
  poolDepth: number;
  poolDistribution: number[];
  poolSource: number;
  itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
} {
  return {
    rewardDepth: typeof r.rewardDepth === 'number' ? r.rewardDepth : 10,
    poolDepth: typeof r.poolDepth === 'number' ? r.poolDepth : 3,
    poolDistribution: Array.isArray(r.poolDistribution) ? r.poolDistribution : [50, 30, 20],
    poolSource: typeof r.poolSource === 'number' ? r.poolSource : 0,
    itemRewards: r.itemRewards && typeof r.itemRewards === 'object'
      ? (r.itemRewards as Record<number, Array<{ itemId: string; level: number; quantity: number }>>)
      : {},
  };
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const config = getConfig();
    const appId = getAppIdFromEnv() || config.server.appId || '';
    if (!appId.trim()) {
      PlatformLogger.warn('⚙️ [DEFAULT SUSTAIN CONFIG] No app ID; cannot read from platform');
      return { success: true, config: null, source: 'chain', message: 'App ID not configured' };
    }
    try {
      const result = await callPlatformBackend<{
        success?: boolean;
        rewardConfig?: Record<string, unknown>;
        source?: string;
        error?: string;
      }>(`api/regatta/default-sustain-config?appId=${encodeURIComponent(appId)}`, { method: 'GET' });
      if (result?.success && result.rewardConfig && typeof result.rewardConfig === 'object') {
        const r = result.rewardConfig;
        const hasContent = typeof r.rewardDepth === 'number' ||
          (r.itemRewards && typeof r.itemRewards === 'object' && Object.keys(r.itemRewards).length > 0);
        if (hasContent && result.source === 'chain') {
          PlatformLogger.info('⚙️ [DEFAULT SUSTAIN CONFIG] Loaded default sustain config from chain');
          return { success: true, config: normalizeOnChainConfig(r), source: 'chain' };
        }
      }
      PlatformLogger.info('⚙️ [DEFAULT SUSTAIN CONFIG] No default sustain config on-chain yet');
      return { success: true, config: null, source: 'chain', message: 'Not initialized on-chain' };
    } catch (error) {
      PlatformLogger.warn('⚙️ [DEFAULT SUSTAIN CONFIG] Failed to load from platform', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: true, config: null, source: 'chain', message: 'Could not read from platform' };
    }
  }
);

type DefaultRewardConfigPayload = {
  rewardDepth?: number;
  poolDepth?: number;
  poolDistribution?: number[];
  poolSource?: number;
  itemRewards?: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
};

function normalizeIncomingConfig(input: DefaultRewardConfigPayload) {
  const rewardDepth = Number(input?.rewardDepth ?? 10);
  const poolDepth = Number(input?.poolDepth ?? 3);
  const poolDistribution = Array.isArray(input?.poolDistribution)
    ? input.poolDistribution.map((n) => Number(n ?? 0))
    : [50, 30, 20];
  const poolSource = Number(input?.poolSource ?? 0);

  const itemRewardsRaw = input?.itemRewards && typeof input.itemRewards === 'object'
    ? input.itemRewards
    : {};

  const itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>> = {};
  for (const [rankKey, list] of Object.entries(itemRewardsRaw)) {
    const rank = Number(rankKey);
    if (!Number.isFinite(rank) || rank <= 0) continue;
    if (!Array.isArray(list)) continue;
    itemRewards[rank] = list
      .filter((i) => i && typeof i === 'object')
      .map((i) => ({
        itemId: String(i.itemId ?? ''),
        level: Math.max(1, Number(i.level ?? 1)),
        quantity: Math.max(1, Number(i.quantity ?? 1)),
      }))
      .filter((i) => i.itemId.length > 0);
  }

  return {
    rewardDepth: Math.max(1, Math.min(255, rewardDepth)),
    poolDepth: Math.max(1, Math.min(255, poolDepth)),
    poolDistribution,
    poolSource,
    itemRewards,
  };
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const hasApiKey = verifyApiKey(request);
    const body = (await getRequestBody<{ adminWalletAddress?: string; config?: DefaultRewardConfigPayload }>(request).catch(
      () => ({} as { adminWalletAddress?: string; config?: DefaultRewardConfigPayload })
    ));

    if (!hasApiKey) {
      const adminWallet = getAdminWalletService();
      const expected = adminWallet.getAddress().toLowerCase();
      const provided = body.adminWalletAddress?.toLowerCase();
      if (!provided || provided !== expected) {
        throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
      }
    }

    if (!body.config || typeof body.config !== 'object') {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'config is required.');
    }

    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId?.trim()?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Corridor admin cap required. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (or _MAINNET) in config/contracts.<network>.json.'
      );
    }

    const rewardConfig = normalizeIncomingConfig(body.config);
    const platformOptions = buildPlatformCallOptions(request, body, {
      corridorAdminCapabilityObjectId: corridorAdminCapId,
    });

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
      throw new PlatformError(
        PlatformErrorCode.UNKNOWN_ERROR,
        result.error || 'Failed to save default sustain config on-chain'
      );
    }

    PlatformLogger.info('⚙️ [DEFAULT SUSTAIN CONFIG] Saved on-chain', { digest: result.digest });
    return {
      success: true,
      message: 'Default sustain configuration saved on-chain.',
      digest: result.digest,
      config: rewardConfig,
    };
  }
);

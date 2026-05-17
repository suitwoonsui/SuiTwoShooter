// ==========================================
// Admin: apply default credits/items from initialization-data to live milestone definitions.
// Does not change thresholds or milestoneIds. Writes merged blob to Aquifer (same as full initialize).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { MILESTONE_DEFINITIONS } from '@/data/initialization-data';
import {
  mergeDefaultMilestoneRewards,
  type MilestoneRow,
} from '@/lib/services/achievements/milestones/merge-default-milestone-rewards';
import {
  buildBatchViaChannel,
  platformTxClient,
  platformMilestonesClient,
  buildPlatformCallOptions,
  getCorridorCapabilityObjectIdFromEnv,
  getCorridorAdminCapabilityObjectIdFromEnv,
  getSonarClient,
  encodeDefinitionValue,
} from '@/lib/services/platform/client/platform-client';
import { getAchievementService } from '@/lib/services/achievements/core/achievement-service';

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

    const corridorCapId = getCorridorCapabilityObjectIdFromEnv();
    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorCapId?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Milestone definitions require Corridor. Set CORRIDOR_CAPABILITY_OBJECT_ID in game backend config/contracts.<network>.json.'
      );
    }
    if (!corridorAdminCapId?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Writes require CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID in game backend config/contracts.<network>.json.'
      );
    }

    const platformOptions = buildPlatformCallOptions(request, body, {
      corridorAdminCapabilityObjectId: corridorAdminCapId,
    });

    const defRes = await platformMilestonesClient.getDefinitions(platformOptions);
    const raw = defRes?.fullDefinitions ?? {};
    if (!defRes?.success || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length === 0) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_INVALID,
        'No milestone definitions loaded from platform. Run full Initialize (thresholds) first, then apply default rewards.'
      );
    }

    const merged = mergeDefaultMilestoneRewards(
      raw as Record<string, MilestoneRow[]>,
      MILESTONE_DEFINITIONS as Record<string, MilestoneRow[]>
    );

    const adminWallet = getAdminWalletService();
    const signerAddress = adminWallet.getAddress();
    try {
      const balance = (await getSonarClient().getBalance({ owner: signerAddress })) as { totalBalance?: string };
      const mist = balance?.totalBalance != null ? String(balance.totalBalance) : '0';
      PlatformLogger.info('Milestone initialize-rewards: signer balance (MIST)', { mist });
    } catch {
      /* optional */
    }

    const jsonString = JSON.stringify(merged);
    const value = encodeDefinitionValue(jsonString);
    PlatformLogger.info('Milestone initialize-rewards: writing merged definitions', {
      categoryCount: Object.keys(merged).length,
      key: 'milestone_definitions',
    });

    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'aquifer-set-definition',
            params: {
              key: 'milestone_definitions',
              value,
              corridorAdminCapabilityObjectId: corridorAdminCapId,
              senderAddress: signerAddress,
            },
          },
        ],
      },
      platformOptions
    );

    if (!build.success || !build.transactions?.length) {
      const msg = build.error || build.errors?.[0] || 'Failed to build aquifer-set-definition';
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, msg);
    }

    const transactionBase64 = build.transactions[0];
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
      throw new PlatformError(
        PlatformErrorCode.UNKNOWN_ERROR,
        result.error || 'Failed to sync merged milestone rewards to platform.'
      );
    }

    PlatformLogger.info('Milestone default rewards merged to platform', { digest: result.digest });

    try {
      getAchievementService().clearMilestoneDefinitionsCache();
    } catch {
      /* ignore */
    }

    return {
      success: true,
      message: 'Default credits and items applied to existing milestone tiers (thresholds and IDs unchanged).',
      digest: result.digest,
    };
  }
);

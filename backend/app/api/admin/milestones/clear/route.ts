// ==========================================
// Admin Milestone Clear API Route
// ==========================================
// POST: Remove all milestone definitions from platform Aquifer (re-initialization).
// Uses Channel aquifer-remove-definition for key "milestone_definitions". No game contract.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import {
  buildBatchViaChannel,
  platformTxClient,
  platformMilestonesClient,
  getCorridorAdminCapabilityObjectIdFromEnv,
  buildPlatformCallOptions,
} from '@/lib/services/platform/client/platform-client';

const MILESTONE_DEFINITIONS_KEY = 'milestone_definitions';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{ adminWalletAddress: string }>(request);
    const { adminWalletAddress } = body;

    const adminWallet = getAdminWalletService();
    const expectedAdmin = adminWallet.getAddress().toLowerCase();
    const providedAdmin = adminWalletAddress?.toLowerCase();

    if (!providedAdmin || providedAdmin !== expectedAdmin) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed.'
      );
    }

    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId || !corridorAdminCapId.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Milestone clear (platform Aquifer) requires CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_* in game backend config/contracts.<network>.json.'
      );
    }

    // List definitions from platform Aquifer; if milestone_definitions key is not present, nothing to clear.
    const listRes = await platformMilestonesClient.getDefinitions(buildPlatformCallOptions());
    if (!listRes.success) {
      throw new PlatformError(
        PlatformErrorCode.UNKNOWN_ERROR,
        listRes.error ?? 'Failed to list definitions from platform.'
      );
    }
    const hasKey = listRes.definitions?.some((d) => d.key === MILESTONE_DEFINITIONS_KEY) ?? false;
    if (!hasKey) {
      PlatformLogger.info('Milestone clear: no milestone_definitions key on platform; nothing to remove.');
      return { success: true, deleted: 0, errors: 0 };
    }

    const buildRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'aquifer-remove-definition',
            params: {
              key: MILESTONE_DEFINITIONS_KEY,
              corridorAdminCapabilityObjectId: corridorAdminCapId,
              adminWalletAddress: adminWallet.getAddress(),
            },
          },
        ],
      },
      buildPlatformCallOptions()
    );

    if (!buildRes.success || !buildRes.transactions?.length) {
      const err = buildRes.errors?.join('; ') ?? buildRes.error ?? 'Platform build failed';
      PlatformLogger.error('Milestone clear build failed', { error: err });
      throw new PlatformError(PlatformErrorCode.INTERNAL_ERROR, err);
    }

    const txBase64 = buildRes.transactions[0];
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(txBase64, 'base64'));
    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64: txBase64, signature: signed.signature },
      buildPlatformCallOptions()
    );

    if (!execRes.success) {
      PlatformLogger.error('Milestone clear execute failed', { error: execRes.error });
      throw new PlatformError(
        PlatformErrorCode.INTERNAL_ERROR,
        execRes.error ?? 'Failed to execute remove-definition transaction'
      );
    }

    PlatformLogger.info('Milestone definitions cleared via platform Aquifer', {
      key: MILESTONE_DEFINITIONS_KEY,
      digest: execRes.digest,
    });

    try {
      const { getAchievementService } = await import('@/lib/services/achievements/core/achievement-service');
      getAchievementService().clearMilestoneDefinitionsCache();
    } catch {
      // ignore
    }

    return { success: true, deleted: 1, errors: 0 };
  }
);

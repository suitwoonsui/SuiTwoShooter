// ==========================================
// Admin Milestone Initialize API Route (full document)
// ==========================================
// POST: Replace Aquifer milestone_definitions with structure-only defaults (categories, thresholds, milestoneIds;
// credits=0, items=[]). Does not apply reward payloads — use POST .../initialize-rewards to merge credits/items from code.
// Same pattern as default-sustain-config: Channel build, admin keypair sign, executeSigned.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { milestoneDefinitionsStructureOnly } from '@/data/initialization-data';
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
        'Milestone definitions (platform) require Corridor. Set CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json so the platform can associate definitions with your app.'
      );
    }
    if (!corridorAdminCapId?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Milestone definitions (platform) require CorridorAdminCap for writes. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }

    const platformOptions = buildPlatformCallOptions(request, body, {
      corridorAdminCapabilityObjectId: corridorAdminCapId,
    });
    const adminWallet = getAdminWalletService();
    const signerAddress = adminWallet.getAddress();
    let suiBalanceMist: string | undefined;
    let suiBalanceSUI: string | undefined;
    try {
      const balance = (await getSonarClient().getBalance({ owner: signerAddress })) as { totalBalance?: string };
      const mist = balance?.totalBalance != null ? String(balance.totalBalance) : '0';
      suiBalanceMist = mist;
      suiBalanceSUI = (Number(BigInt(mist)) / 1_000_000_000).toFixed(4);
    } catch {
      // non-fatal; log without balance
    }
    // This address pays gas on-chain. Compare with the wallet that has SUI; must match game backend .env (GAME_WALLET_PRIVATE_KEY or ADMIN_WALLET_PRIVATE_KEY).
    PlatformLogger.info('Milestone initialize: building tx for signer (gas payer). Ensure this address has SUI on-chain.', {
      signerAddressFull: signerAddress,
      ...(suiBalanceMist != null && { suiBalanceMist }),
      ...(suiBalanceSUI != null && { suiBalanceSUI: `${suiBalanceSUI} SUI` }),
    });
    const structurePayload = milestoneDefinitionsStructureOnly();
    const jsonString = JSON.stringify(structurePayload);
    const value = encodeDefinitionValue(jsonString);
    const categoryKeys = Object.keys(structurePayload);
    const totalMilestones = categoryKeys.reduce((sum, k) => sum + (structurePayload[k]?.length ?? 0), 0);
    const uncompressedBase64Len = Buffer.from(jsonString, 'utf8').toString('base64').length;
    const firstCategory = categoryKeys[0];
    const firstDef = firstCategory ? structurePayload[firstCategory]?.[0] : null;
    const payloadSnippet = jsonString.slice(0, 380);
    PlatformLogger.info('Milestone initialize (save): sending to platform', {
      key: 'milestone_definitions',
      valueLengthBase64: value.length,
      uncompressedBase64Length: uncompressedBase64Len,
      categoryCount: categoryKeys.length,
      totalMilestoneCount: totalMilestones,
      categories: categoryKeys,
      payloadHasMilestoneIds: firstDef?.milestoneId != null,
      sampleFirstDef: firstDef
        ? {
            category: firstCategory,
            milestoneId: firstDef.milestoneId,
            threshold: firstDef.threshold,
            credits: firstDef.credits,
            itemsLen: firstDef.items?.length ?? 0,
          }
        : undefined,
      payloadSnippet: payloadSnippet + (jsonString.length > 380 ? '...' : ''),
      whatIsInValue: 'Structure-only: milestoneId, threshold, credits=0, items=[]. Rewards: use initialize-rewards.',
      note: 'Platform will resolve (ecosystemId, appId) from corridor cap and build set_definition to Aquifer registry.',
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
      const msg = build.error || build.errors?.[0] || 'Failed to build milestone definitions transaction';
      PlatformLogger.error('Milestone initialize failed', { error: msg });
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
      const errStr = String(result.error || '');
      const isGas = errStr.includes('InsufficientGas') || errStr.toLowerCase().includes('insufficient gas');
      const isAppNotRegistered =
        errStr.includes('E_APP_NOT_REGISTERED') ||
        errStr.includes('APP_NOT_REGISTERED') ||
        /MoveAbort.*::1\b/.test(errStr) ||
        errStr.toLowerCase().includes('app not registered');
      PlatformLogger.error('Milestone definitions transaction failed', {
        error: result.error,
        signerAddress: isGas ? signerAddress : undefined,
        hint: isGas
          ? 'Ensure this address (game admin wallet) has sufficient SUI for gas on-chain.'
          : isAppNotRegistered
            ? 'The (ecosystem_id, app_id) for this cap is not registered on the Chart (EcosystemAppRegistry). Register the app via register_app_ecosystem_with_admin_cap on the same chart used by the platform (ECOSYSTEM_APP_REGISTRY_OBJECT_ID).'
            : undefined,
      });
      let message: string;
      if (isGas) {
        message = `InsufficientGas: The game admin wallet (${signerAddress}) does not have enough SUI for gas. Fund this address or ensure game backend .env uses the same key as the wallet you fund.`;
      } else if (isAppNotRegistered) {
        message =
          'App not registered on Chart: The game\'s (ecosystem_id, app_id) must be registered on the platform\'s EcosystemAppRegistry (Chart) before setting definitions. Ask the platform admin to call register_app_ecosystem_with_admin_cap for this app, or ensure your CorridorAdminCap was minted for the same chart.';
      } else {
        message = result.error || 'Failed to sync milestone definitions to platform.';
      }
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, message);
    }

    const categories = Object.keys(structurePayload);
    PlatformLogger.info('Milestone definitions synced to platform', { categories, digest: result.digest });

    let milestoneIdsOnChain: { withId: number; withoutId: number } | undefined;
    try {
      const defRes = await platformMilestonesClient.getDefinitions(platformOptions);
      const full = defRes?.fullDefinitions ?? {};
      let withId = 0;
      let withoutId = 0;
      for (const list of Object.values(full)) {
        if (Array.isArray(list)) {
          for (const m of list as { milestoneId?: number }[]) {
            if (m.milestoneId != null) withId++;
            else withoutId++;
          }
        }
      }
      milestoneIdsOnChain = { withId, withoutId };
      PlatformLogger.info('Milestone initialize: IDs on chain after write', {
        milestoneIdsOnChain,
        ...(withoutId > 0 && withId === 0 && { hint: 'RPC may be stale; refresh admin in a few seconds to see IDs.' }),
      });
    } catch (e) {
      PlatformLogger.warn('Milestone initialize: could not verify IDs on chain', { error: e instanceof Error ? e.message : String(e) });
    }

    try {
      getAchievementService().clearMilestoneDefinitionsCache();
    } catch {
      /* ignore if achievement service unavailable */
    }

    return {
      success: true,
      message:
        'Milestone structure (tiers + IDs) synced to platform. Credits and items were not set — run “Sync default rewards” or edit manually.',
      digest: result.digest,
      summary: {
        totalAdded: categories.length,
        totalSkipped: 0,
        successCount: 1,
        errorCount: 0,
        ...(milestoneIdsOnChain && { milestoneIdsOnChain }),
      },
    };
  }
);

// ==========================================
// Admin API: Distribute Tournament Rewards by Event (Tide callback)
// ==========================================
// Tide is the trigger; game asks platform to build distribution tx(s), signs, submits, then marks distributed.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { verifyApiKey } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  platformTxClient,
  platformEventsClient,
  buildPlatformCallOptions,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';

function parseMoveAbortFromMessage(msg: string): { module?: string; functionName?: string; instruction?: number; abortCode?: number; address?: string } | null {
  // Example fragment:
  // MoveAbort(MoveLocation { module: ModuleId { address: 9323..., name: Identifier("glacier") }, function: 7, instruction: 23, function_name: Some("release_glacier_vault_empty") }, 7) in command 0
  try {
    const address = msg.match(/module:\s*ModuleId\s*\{\s*address:\s*([0-9a-fA-F]+)\s*,/i)?.[1];
    const moduleName = msg.match(/name:\s*Identifier\(\"([^\"]+)\"\)/i)?.[1];
    const functionName = msg.match(/function_name:\s*Some\(\"([^\"]+)\"\)/i)?.[1];
    const instructionRaw = msg.match(/instruction:\s*(\d+)/i)?.[1];
    const abortCodeRaw = msg.match(/\}\s*,\s*(\d+)\)\s*in command/i)?.[1] ?? msg.match(/\}\s*,\s*(\d+)\)\s*$/i)?.[1];
    const instruction = instructionRaw ? Number(instructionRaw) : undefined;
    const abortCode = abortCodeRaw ? Number(abortCodeRaw) : undefined;
    if (!address && !moduleName && !functionName && instruction === undefined && abortCode === undefined) return null;
    return { address, module: moduleName, functionName, instruction, abortCode };
  } catch {
    return null;
  }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    if (!verifyApiKey(request)) {
      throw new Error('Unauthorized. Valid API key required (X-API-Key or Authorization: Bearer).');
    }

    const body = await getRequestBody<{
      eventObjectId: string;
      ecosystemId?: string;
      appId?: string;
      corridorCapabilityObjectId?: string;
      /** Platform-built transaction(s) to sign and submit. Required. */
      transactions?: Array<{ bytesBase64: string }>;
    }>(request);

    const eventObjectId = body?.eventObjectId?.trim();
    if (!eventObjectId) {
      throw new Error('eventObjectId is required');
    }

    const adminWallet = getAdminWalletService();
    let transactions = Array.isArray(body?.transactions) ? body.transactions.filter((t) => t?.bytesBase64) : [];

    if (transactions.length === 0) {
      // Pull build onto the game side (same pattern as other lifecycle callbacks).
      // Platform builds via sustain distribute-build (using corridor capability from env), game signs/submits.
      const senderAddress = adminWallet.getAddress();
      if (!senderAddress?.startsWith('0x')) {
        throw new Error('Game admin wallet address is required to build distribution txs.');
      }
      const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
      if (!corridorAdminCapId?.startsWith('0x')) {
        throw new Error(
          'Game corridor admin cap is required to build distribution txs. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_* (or CORRIDOR_ADMIN_CAP_OBJECT_ID) in game backend config/contracts.<network>.json.'
        );
      }

      const buildRes = await platformEventsClient.buildDistribution(
        eventObjectId,
        {
          ...buildPlatformCallOptions(),
          adminWalletAddress: senderAddress,
          corridorAdminCapId,
        }
      );
      if (!buildRes.success || !buildRes.transactions?.length) {
        throw new Error(buildRes.error ?? 'Failed to build distribution transactions via platform');
      }
      transactions = buildRes.transactions.map((bytesBase64) => ({ bytesBase64 }));
      PlatformLogger.info('🎁 [DISTRIBUTE-BY-EVENT] Built via platform sustain distribute-build, signing and submitting', {
        eventObjectId,
        txCount: transactions.length,
      });
    } else {
      PlatformLogger.info('🎁 [DISTRIBUTE-BY-EVENT] Tide callback: sign and submit (prebuilt txs)', {
        eventObjectId,
        txCount: transactions.length,
      });
    }

    try {
      const digests: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const { bytesBase64 } = transactions[i];
        PlatformLogger.info('🎁 [DISTRIBUTE-BY-EVENT] Submitting tx', {
          eventObjectId,
          txIndex: i + 1,
          txCount: transactions.length,
          bytesLen: bytesBase64?.length ?? 0,
        });
        try {
          const txBytes = Buffer.from(bytesBase64, 'base64');
          const signed = await adminWallet.getKeypair().signTransaction(txBytes);
          const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
            ? (signed as { signature: string }).signature
            : String(signed);
          const result = await platformTxClient.executeSigned({ transactionBytesBase64: bytesBase64, signature });
          if (result.success && result.digest) {
            PlatformLogger.info('🎁 [DISTRIBUTE-BY-EVENT] Tx success', {
              eventObjectId,
              txIndex: i + 1,
              digest: result.digest,
            });
            digests.push(result.digest);
          } else {
            const msg = result.error ?? 'Transaction did not succeed';
            PlatformLogger.error('🎁 [DISTRIBUTE-BY-EVENT] Tx failed (executeSigned)', {
              eventObjectId,
              txIndex: i + 1,
              digest: result.digest,
              error: msg,
              moveAbort: parseMoveAbortFromMessage(msg),
            });
            errors.push(`Tx ${i + 1}: ${msg}`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          PlatformLogger.error('🎁 [DISTRIBUTE-BY-EVENT] Tx failed (exception)', {
            eventObjectId,
            txIndex: i + 1,
            error: msg,
            moveAbort: parseMoveAbortFromMessage(msg),
          });
          errors.push(`Tx ${i + 1}: ${msg}`);
        }
      }

      if (errors.length > 0) {
        PlatformLogger.error('🎁 [DISTRIBUTE-BY-EVENT] Some transactions failed', {
          eventObjectId,
          errorCount: errors.length,
          errors,
        });
        const errMsg = `Sign/submit failed: ${errors.join('; ')}`;
        await platformEventsClient.reportDistributionFailed(eventObjectId, { error: errMsg }).catch(() => {});
        throw new Error(errMsg);
      }

      const markRes = await platformEventsClient.markRewardsDistributed(eventObjectId);
      if (!markRes.success) {
        await platformEventsClient.reportDistributionFailed(eventObjectId, { error: markRes.error ?? 'Failed to mark rewards distributed on platform' }).catch(() => {});
        throw new Error(markRes.error ?? 'Failed to mark rewards distributed on platform');
      }

      await platformEventsClient.reportDistributionComplete(eventObjectId, { digests }).catch(() => {});

      const tournamentResult = await getTournamentService().getTournament(eventObjectId);
      const tournamentId = tournamentResult.success && tournamentResult.tournament ? tournamentResult.tournament.tournamentId : undefined;

      return {
        success: true,
        eventObjectId,
        tournamentId,
        digests,
        message: `Signed and submitted ${digests.length} transaction(s); platform marked distributed.`,
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      await platformEventsClient.reportDistributionFailed(eventObjectId, { error: errMsg }).catch(() => {});
      throw e;
    }
  },
);

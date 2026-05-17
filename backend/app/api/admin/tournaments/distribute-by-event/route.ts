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
  getOldCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';

async function getAddressOwnerOfObject(objectId: string): Promise<string | null> {
  try {
    const res = await getAdminWalletService().getClient().getObject({ id: objectId, options: { showOwner: true } });
    const owner = res.data?.owner;
    if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
      const a = (owner as { AddressOwner?: string }).AddressOwner;
      return typeof a === 'string' && a.startsWith('0x') ? a : null;
    }
  } catch {
    // ignore — caller treats null as unknown / not usable
  }
  return null;
}

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
    let capUsedForBuild: 'current' | 'old' | 'prebuilt' = transactions.length > 0 ? 'prebuilt' : 'current';

    if (transactions.length === 0) {
      // Pull build onto the game side (same pattern as other lifecycle callbacks).
      // Platform builds via sustain distribute-build (using corridor capability from env), game signs/submits.
      const senderAddress = adminWallet.getAddress();
      if (!senderAddress?.startsWith('0x')) {
        throw new Error('Game admin wallet address is required to build distribution txs.');
      }
      const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
      const oldCorridorAdminCapId = getOldCorridorAdminCapabilityObjectIdFromEnv();

      const tryBuild = async (capId: string) => {
        const buildRes = await platformEventsClient.buildDistribution(eventObjectId, {
          ...buildPlatformCallOptions(),
          adminWalletAddress: senderAddress,
          corridorAdminCapId: capId,
        });
        return buildRes;
      };

      // Build with current cap first; if platform build fails with type mismatch, retry with old cap.
      const oldCapOkForSigner =
        oldCorridorAdminCapId?.startsWith('0x') && oldCorridorAdminCapId !== corridorAdminCapId
          ? (await getAddressOwnerOfObject(oldCorridorAdminCapId))?.toLowerCase() === senderAddress.toLowerCase()
          : false;
      if (oldCorridorAdminCapId?.startsWith('0x') && oldCorridorAdminCapId !== corridorAdminCapId && !oldCapOkForSigner) {
        PlatformLogger.warn('🎁 [DISTRIBUTE-BY-EVENT] OLD corridor admin cap is configured but not owned by game admin wallet; skipping OLD cap build attempts', {
          eventObjectId,
          senderAddress,
          oldCapPrefix: `${oldCorridorAdminCapId.slice(0, 10)}…`,
        });
      }

      if (!corridorAdminCapId?.startsWith('0x') && !oldCapOkForSigner) {
        throw new Error(
          'Game corridor admin cap is required to build distribution txs. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_* (or CORRIDOR_ADMIN_CAP_OBJECT_ID) in game backend config/contracts.<network>.json. If you only have an OLD cap configured, it must be owned by the game admin wallet (GAME_WALLET_PRIVATE_KEY / ADMIN_WALLET_PRIVATE_KEY) to be usable here.'
        );
      }

      const capsToTry = [
        corridorAdminCapId?.startsWith('0x') ? corridorAdminCapId : null,
        oldCapOkForSigner ? oldCorridorAdminCapId : null,
      ].filter((x): x is string => Boolean(x));

      let lastBuildError: string | undefined;
      for (const capId of capsToTry) {
        const buildRes = await tryBuild(capId);
        if (buildRes.success) {
          const txs = Array.isArray(buildRes.transactions) ? buildRes.transactions : [];
          transactions = txs.filter(Boolean).map((bytesBase64) => ({ bytesBase64 }));
          capUsedForBuild = capId === oldCorridorAdminCapId ? 'old' : 'current';
          PlatformLogger.info('🎁 [DISTRIBUTE-BY-EVENT] Built via platform sustain distribute-build', {
            eventObjectId,
            txCount: transactions.length,
            capUsedPrefix: `${capId.slice(0, 10)}…`,
            note: transactions.length === 0 ? 'No transactions required (nothing to distribute / vault already closed)' : undefined,
          });
          lastBuildError = undefined;
          break;
        }
        lastBuildError = buildRes.error ?? 'Failed to build distribution transactions via platform';
      }

      if (!lastBuildError && transactions.length === 0) {
        // Allowed: build succeeded but nothing to submit (e.g., vault already released + no rewards).
      } else if (transactions.length === 0) {
        throw new Error(lastBuildError ?? 'Failed to build distribution transactions via platform');
      }
    } else {
      PlatformLogger.info('🎁 [DISTRIBUTE-BY-EVENT] Tide callback: sign and submit (prebuilt txs)', {
        eventObjectId,
        txCount: transactions.length,
      });
    }

    // If executeSigned fails with a deterministic CorridorAdminCap type mismatch, retry once by rebuilding with the old cap.
    const runSubmit = async (txs: Array<{ bytesBase64: string }>) => {
      const digests: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < txs.length; i++) {
        const { bytesBase64 } = txs[i];
        PlatformLogger.info('🎁 [DISTRIBUTE-BY-EVENT] Submitting tx', {
          eventObjectId,
          txIndex: i + 1,
          txCount: txs.length,
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

      return { digests, errors };
    };

    try {
      let digests: string[] = [];
      let errors: string[] = [];
      if (transactions.length > 0) {
        const submitRes = await runSubmit(transactions);
        digests = submitRes.digests;
        errors = submitRes.errors;
      } else {
        PlatformLogger.info('🎁 [DISTRIBUTE-BY-EVENT] No transactions to submit; proceeding to mark distributed', { eventObjectId });
      }

      const typeMismatch = errors.some((e) => e.includes('TypeMismatch') || e.includes('kind: TypeMismatch'));
      const oldCap = getOldCorridorAdminCapabilityObjectIdFromEnv();

      const senderAddress = adminWallet.getAddress();
      const oldCapOwnedBySigner =
        oldCap?.startsWith('0x') ? (await getAddressOwnerOfObject(oldCap))?.toLowerCase() === senderAddress.toLowerCase() : false;

      if (typeMismatch && capUsedForBuild === 'current' && oldCap?.startsWith('0x') && oldCapOwnedBySigner) {
        PlatformLogger.warn('🎁 [DISTRIBUTE-BY-EVENT] TypeMismatch during submit; retrying with OLD corridor admin cap', {
          eventObjectId,
          oldCapPrefix: `${oldCap.slice(0, 10)}…`,
        });

        const rebuild = await platformEventsClient.buildDistribution(eventObjectId, {
          ...buildPlatformCallOptions(),
          adminWalletAddress: senderAddress,
          corridorAdminCapId: oldCap,
        });
        if (rebuild.success && rebuild.transactions?.length) {
          const rebuiltTxs = rebuild.transactions.map((bytesBase64) => ({ bytesBase64 }));
          capUsedForBuild = 'old';
          const retryRes = await runSubmit(rebuiltTxs);
          digests = retryRes.digests;
          errors = retryRes.errors;
        }
      } else if (typeMismatch && capUsedForBuild === 'current' && oldCap?.startsWith('0x') && !oldCapOwnedBySigner) {
        PlatformLogger.warn('🎁 [DISTRIBUTE-BY-EVENT] TypeMismatch during submit; configured OLD corridor admin cap is not owned by game admin wallet — not retrying with OLD cap', {
          eventObjectId,
          senderAddress,
          oldCapPrefix: `${oldCap.slice(0, 10)}…`,
        });
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

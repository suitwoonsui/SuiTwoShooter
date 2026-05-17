// ==========================================
// Admin API: Move Tournament to Past (Tide lifecycle callback)
// ==========================================
// Platform Tide sends { eventObjectId, ecosystemId, appId } only (no transactions).
// Game asks platform to build via channel (buildBatchViaChannel → platform builds tx), then game signs and submits.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { verifyApiKey } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  platformTxClient,
  platformEventsClient,
  buildBatchViaChannel,
  buildPlatformCallOptions,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';

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
      /** Optional: platform-built transaction(s). When omitted, game builds using its own corridor admin cap. */
      transactions?: Array<{ bytesBase64: string }>;
    }>(request);

    const eventObjectId = body?.eventObjectId?.trim();
    if (!eventObjectId) {
      throw new Error('eventObjectId is required');
    }

    let transactions = Array.isArray(body?.transactions) ? body.transactions.filter((t) => t?.bytesBase64) : [];

    if (transactions.length === 0) {
      const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
      if (!corridorAdminCapId?.startsWith('0x')) {
        throw new Error(
          'No transactions provided and game has no corridor admin cap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_* in game backend config/contracts.<network>.json.'
        );
      }
      const adminWallet = getAdminWalletService();
      const senderAddress = adminWallet.getAddress();
      if (!senderAddress?.startsWith('0x')) {
        throw new Error('Game admin wallet address is required to build move-to-past tx (cap holder signs and pays gas).');
      }
      const buildRes = await buildBatchViaChannel(
        {
          operations: [
            {
              operationId: 'station-move-event-to-past',
              params: { eventId: eventObjectId, corridorAdminCapId, senderAddress },
            },
          ],
        },
        buildPlatformCallOptions()
      );
      if (!buildRes.success || !buildRes.transactions?.length) {
        throw new Error(
          `Failed to build move-to-past tx: ${buildRes.errors?.join('; ') ?? buildRes.error ?? 'Unknown error'}`
        );
      }
      transactions = buildRes.transactions.map((bytesBase64) => ({ bytesBase64 }));
      PlatformLogger.info('📅 [MOVE-TO-PAST] Built via platform channel (game corridor admin cap), signing and submitting', {
        eventObjectId,
      });
    } else {
      PlatformLogger.info('📅 [MOVE-TO-PAST] Tide lifecycle callback: sign and submit', {
        eventObjectId,
        txCount: transactions.length,
      });
    }

    const adminWallet = getAdminWalletService();
    const digests: string[] = [];
    const errors: string[] = [];
    const senderAddress = adminWallet.getAddress();
    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();

    const shouldTreatAsNotReady = (msg: string): boolean => {
      // Station abort code 0 is E_EVENT_NOT_ACTIVE. For move-to-past, that usually means:
      // - event not ended/cancelled yet, OR
      // - grace period has not passed.
      return msg.includes('move_station_event_to_past_corridor') && msg.includes('}, 0) in command');
    };

    const maybeAutoEndThenMoveToPast = async (msg: string): Promise<{ handled: boolean; digest?: string; skipReason?: string; error?: string }> => {
      if (!shouldTreatAsNotReady(msg)) return { handled: false };
      if (!corridorAdminCapId?.startsWith('0x') || !senderAddress?.startsWith('0x')) {
        return { handled: false };
      }

      // Fetch event timings/status from platform so we can decide whether to skip (grace not passed) or repair (end then move-to-past).
      const evRes = await platformEventsClient.getEvent(eventObjectId, buildPlatformCallOptions());
      if (!evRes.success || !evRes.event) {
        return { handled: true, error: evRes.error || 'Failed to load event to evaluate move-to-past readiness' };
      }
      const ev: any = evRes.event as any;
      const endTime = Number(ev.endTime ?? 0);
      const gracePeriodMs = Number(ev.gracePeriodMs ?? 0);
      const now = Date.now();
      if (endTime > 0 && now <= endTime + gracePeriodMs) {
        // Not ready yet; treat as successful no-op to avoid Tide retry storms.
        return { handled: true, skipReason: 'Grace period has not passed yet; move-to-past skipped.' };
      }

      // If the event isn't ended/cancelled yet, end it first.
      const statusLabel = String(ev.statusLabel ?? '');
      const statusNum = Number(ev.status ?? NaN);
      const isEnded = statusLabel.toLowerCase() === 'ended' || statusNum === 2;
      const isCancelled = statusLabel.toLowerCase() === 'cancelled' || statusNum === 3;
      if (!isEnded && !isCancelled) {
        PlatformLogger.warn('📅 [MOVE-TO-PAST] Auto-repair: event not ended; ending event before move-to-past', {
          eventObjectId,
          statusLabel,
          statusNum,
        });
        const endBuild = await buildBatchViaChannel(
          {
            operations: [
              {
                operationId: 'station-end-event',
                params: { eventId: eventObjectId, corridorAdminCapId, senderAddress },
              },
            ],
          },
          buildPlatformCallOptions()
        );
        if (!endBuild.success || !endBuild.transactions?.[0]) {
          return { handled: true, error: endBuild.errors?.[0] ?? endBuild.error ?? 'Failed to build end-event tx' };
        }
        const endTx = endBuild.transactions[0];
        const endSigned = await adminWallet.getKeypair().signTransaction(Buffer.from(endTx, 'base64'));
        const endExec = await platformTxClient.executeSigned({ transactionBytesBase64: endTx, signature: endSigned.signature });
        if (!endExec.success) {
          return { handled: true, error: endExec.error ?? 'Failed to end event before move-to-past' };
        }
      }

      // Retry move-to-past after ensuring ENDED and grace has passed.
      const moveBuild = await buildBatchViaChannel(
        {
          operations: [
            {
              operationId: 'station-move-event-to-past',
              params: { eventId: eventObjectId, corridorAdminCapId, senderAddress },
            },
          ],
        },
        buildPlatformCallOptions()
      );
      if (!moveBuild.success || !moveBuild.transactions?.[0]) {
        return { handled: true, error: moveBuild.errors?.[0] ?? moveBuild.error ?? 'Failed to rebuild move-to-past tx after end' };
      }
      const moveTx = moveBuild.transactions[0];
      const moveSigned = await adminWallet.getKeypair().signTransaction(Buffer.from(moveTx, 'base64'));
      const moveExec = await platformTxClient.executeSigned({ transactionBytesBase64: moveTx, signature: moveSigned.signature });
      if (!moveExec.success || !moveExec.digest) {
        return { handled: true, error: moveExec.error ?? 'Retry move-to-past failed' };
      }
      return { handled: true, digest: moveExec.digest };
    };

    for (let i = 0; i < transactions.length; i++) {
      const { bytesBase64 } = transactions[i];
      try {
        const txBytes = Buffer.from(bytesBase64, 'base64');
        const signed = await adminWallet.getKeypair().signTransaction(txBytes);
        const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
          ? (signed as { signature: string }).signature
          : String(signed);
        const result = await platformTxClient.executeSigned({ transactionBytesBase64: bytesBase64, signature });
        if (result.success && result.digest) {
          digests.push(result.digest);
        } else {
          // Log full payload so Move abort details (module/function/abort code) are visible in server logs.
          PlatformLogger.error('📅 [MOVE-TO-PAST] executeSigned returned failure', {
            eventObjectId,
            txIndex: i,
            txCount: transactions.length,
            digest: (result as any)?.digest ?? null,
            error: (result as any)?.error ?? null,
            result,
          });
          const msg = (result as any)?.error ?? 'Transaction did not succeed';
          const repaired = await maybeAutoEndThenMoveToPast(msg);
          if (repaired.handled) {
            if (repaired.digest) {
              PlatformLogger.info('📅 [MOVE-TO-PAST] Auto-repair succeeded', { eventObjectId, digest: repaired.digest });
              digests.push(repaired.digest);
              continue;
            }
            if (repaired.skipReason) {
              PlatformLogger.info('📅 [MOVE-TO-PAST] Not ready; treating as success (skipped)', { eventObjectId, reason: repaired.skipReason });
              continue;
            }
            errors.push(repaired.error ?? msg);
          } else {
            errors.push(msg);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        PlatformLogger.error('📅 [MOVE-TO-PAST] executeSigned threw', {
          eventObjectId,
          txIndex: i,
          txCount: transactions.length,
          error: msg,
          stack: e instanceof Error ? e.stack : undefined,
        });
        errors.push(`Tx ${i + 1}: ${msg}`);
      }
    }

    if (errors.length > 0) {
      PlatformLogger.error('📅 [MOVE-TO-PAST] Some transactions failed', { eventObjectId, errors });
      throw new Error(`Sign/submit failed: ${errors.join('; ')}`);
    }

    return {
      success: true,
      eventObjectId,
      digests,
      message: `Signed and submitted ${digests.length} move-to-past transaction(s).`,
    };
  },
);

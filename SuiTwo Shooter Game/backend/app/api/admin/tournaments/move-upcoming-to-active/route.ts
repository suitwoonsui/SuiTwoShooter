// ==========================================
// Admin API: Move Tournament to Active at Start Time (Tide lifecycle callback)
// ==========================================
// Platform Tide sends { eventObjectId, ecosystemId, appId } only (no transactions).
// Game asks platform to build via channel (buildBatchViaChannel → platform builds tx), then game signs and submits.
// Events become active at their defined start time, not when a user enters.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { verifyApiKey } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  platformTxClient,
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
          'No transactions provided and game has no corridor admin cap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_* (or CORRIDOR_ADMIN_CAP_OBJECT_ID) in game backend config/contracts.<network>.json.'
        );
      }
      const adminWallet = getAdminWalletService();
      const senderAddress = adminWallet.getAddress();
      if (!senderAddress?.startsWith('0x')) {
        throw new Error('Game admin wallet address is required to build move-upcoming-to-active tx (cap holder signs and pays gas).');
      }
      const buildRes = await buildBatchViaChannel(
        {
          operations: [
            {
              operationId: 'station-move-upcoming-to-active',
              params: { eventId: eventObjectId, corridorAdminCapId, senderAddress },
            },
          ],
        },
        buildPlatformCallOptions()
      );
      if (!buildRes.success || !buildRes.transactions?.length) {
        throw new Error(
          `Failed to build move-upcoming-to-active tx: ${buildRes.errors?.join('; ') ?? buildRes.error ?? 'Unknown error'}`
        );
      }
      transactions = buildRes.transactions.map((bytesBase64) => ({ bytesBase64 }));
      PlatformLogger.info('⏰ [MOVE-UPCOMING-TO-ACTIVE] Built via platform channel (game corridor admin cap), signing and submitting', {
        eventObjectId,
      });
    } else {
      PlatformLogger.info('⏰ [MOVE-UPCOMING-TO-ACTIVE] Tide lifecycle callback: sign and submit (event active at start time)', {
        eventObjectId,
        txCount: transactions.length,
      });
    }

    const adminWallet = getAdminWalletService();
    const digests: string[] = [];
    const errors: string[] = [];

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
          errors.push(result.error ?? 'Transaction did not succeed');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Tx ${i + 1}: ${msg}`);
      }
    }

    if (errors.length > 0) {
      PlatformLogger.error('⏰ [MOVE-UPCOMING-TO-ACTIVE] Some transactions failed', { eventObjectId, errors });
      throw new Error(`Sign/submit failed: ${errors.join('; ')}`);
    }

    return {
      success: true,
      eventObjectId,
      digests,
      message: `Signed and submitted ${digests.length} move-upcoming-to-active transaction(s).`,
    };
  },
);

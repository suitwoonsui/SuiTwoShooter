// ==========================================
// Badge tx execute (proxy to platform) + Insignia sync
// POST /api/badges/tx/execute
// - Proxies to platform POST /api/channel/execute (same as /api/platform/tx/execute)
// - On success: resolves current badge tier and best-effort syncs Insignia `tier` for that player
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { platformTxClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';
import { ensureInsigniaTierMatchesBadge } from '@/lib/services/insignia/insignia-sync';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      transactionBytesBase64: string;
      signature: string;
      playerAddress: string;
      ecosystemId?: string;
    }>(request);

    const { transactionBytesBase64, signature } = body ?? {};
    const playerAddress = (body?.playerAddress || '').trim();
    if (!transactionBytesBase64 || typeof transactionBytesBase64 !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'transactionBytesBase64 is required');
    }
    if (!signature || typeof signature !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'signature is required');
    }
    if (!playerAddress.startsWith('0x')) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'playerAddress is required and must be a valid Sui address (0x...)');
    }
    PlatformValidators.validateAddress(playerAddress);

    const options = buildPlatformCallOptions(request, body);
    const exec = await platformTxClient.executeSigned({ transactionBytesBase64, signature }, options);
    if (!exec.success) return exec;

    // After the player tx succeeds, resolve badge tier and sync Insignia to match.
    // This makes Insignia updates coincide with badge transitions (mint/upgrade) when the client uses this endpoint.
    try {
      const badgeService = getBadgeService();
      const badgeRow = await badgeService.getBadge(playerAddress);
      const tier = badgeRow && Number.isFinite(badgeRow.tier) ? badgeRow.tier : null;
      if (tier !== null) {
        const repaired = await ensureInsigniaTierMatchesBadge(playerAddress, tier, options);
        PlatformLogger.info('Badge tx execute: insignia sync attempted', {
          playerAddress,
          tier,
          repaired: repaired.repaired === true,
        });
      } else {
        PlatformLogger.warn('Badge tx execute: could not resolve badge tier post-exec; skipping insignia sync', {
          playerAddress,
        });
      }
    } catch (e) {
      PlatformLogger.warn('Badge tx execute: insignia sync failed (non-fatal)', {
        playerAddress,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return exec;
  },
  { logRequest: true }
);


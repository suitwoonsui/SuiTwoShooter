// ==========================================
// Admin API - Discover Wallets with Milestone Claims
// ==========================================
// Discover wallets by listing Anchor claims (via platform Hydroscope).

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformAnchorClient } from '@/lib/services/platform/client/platform-client';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received GET request to /api/admin/milestones/discover-wallets');

    const serverAdminAddress = getAdminWalletService().getAddress();
    if (!serverAdminAddress?.startsWith('0x')) {
      throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Admin wallet not initialized');
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get('limit');
    const limit = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : 100;
    const debug = searchParams.get('debug') === '1';

    // Prefer the connected admin wallet (UI sends X-Admin-Wallet) as participant, since it may differ from the server-side admin wallet.
    const headerAdmin = (request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '').trim();
    const participants = Array.from(
      new Set(
        [headerAdmin, serverAdminAddress]
          .map((x) => x.trim())
          .filter((x) => x.startsWith('0x'))
      )
    );

    const allClaims: any[] = [];
    for (const participant of participants) {
      const res = await platformAnchorClient.listParticipantClaims(participant, { limit });
      if (!res.success) {
        PlatformLogger.warn('Failed to list Anchor claims for participant', {
          participantPrefix: participant.slice(0, 10) + '...',
          error: res.error,
        });
        continue;
      }
      allClaims.push(...(res.claims ?? []));
    }

    PlatformLogger.info('Milestones discover-wallets: claims fetched', {
      participants: participants.map((p) => p.slice(0, 10) + '...'),
      claimCount: allClaims.length,
    });

    const wallets = new Set<string>();
    const debugPreview: Array<{
      claimId?: number;
      claimType?: string;
      payloadKeys?: string[];
      extractedPlayerAddress?: string | null;
    }> = [];
    for (const c of allClaims) {
      // Prefer payloadJson when platform enriched it; otherwise payload may be a JSON string.
      const anyClaim = c as any;
      const claimType = typeof anyClaim.claimType === 'string' ? anyClaim.claimType : '';
      const isMilestoneLike =
        claimType.toUpperCase() === 'MILESTONE_COMPLETION' ||
        claimType.toUpperCase() === 'MILESTONE_CLAIM';
      if (!isMilestoneLike) continue;
      let payload: any = null;
      if (anyClaim.payloadJson && typeof anyClaim.payloadJson === 'object') payload = anyClaim.payloadJson;
      else if (anyClaim.payload && typeof anyClaim.payload === 'object') payload = anyClaim.payload;
      else if (typeof anyClaim.payload === 'string') {
        try {
          payload = JSON.parse(anyClaim.payload);
        } catch {
          payload = null;
        }
      }
      // Strict schema: payload must include playerAddress + milestoneId.
      const addr = payload && typeof payload === 'object' ? payload.playerAddress : undefined;
      const mid = payload && typeof payload === 'object' ? payload.milestoneId : undefined;
      const extracted = typeof addr === 'string' && addr.trim().startsWith('0x') ? addr.trim() : null;
      if (extracted && (typeof mid === 'string' || typeof mid === 'number')) wallets.add(extracted);
      if (debug && debugPreview.length < 10) {
        debugPreview.push({
          claimId: typeof anyClaim.claimId === 'number' ? anyClaim.claimId : undefined,
          claimType: claimType || undefined,
          payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : undefined,
          extractedPlayerAddress: extracted,
        });
      }
    }

    PlatformLogger.info('Milestones discover-wallets: extraction summary', {
      participants: participants.map((p) => p.slice(0, 10) + '...'),
      claimCount: allClaims.length,
      extractedWalletCount: wallets.size,
      preview: debugPreview.slice(0, 5),
    });

    return {
      success: true,
      wallets: Array.from(wallets),
      count: wallets.size,
      message: `Discovered ${wallets.size} wallet(s) with Anchor-submitted milestone claims (limit=${Math.min(Math.max(limit, 1), 100)}).`,
      ...(debug ? { debug: { participants, claimCount: allClaims.length, preview: debugPreview } } : {}),
    };
  }
);

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  buildBatchViaChannel,
  getCorridorAdminCapabilityObjectIdFromEnv,
  platformAnchorClient,
} from '@/lib/services/platform/client/platform-client';
import { signAndSubmitRewardTransactions } from '@/lib/services/rewards/executor/rewards-platform-executor';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

type ClaimLike = {
  claimId?: number;
  claimType?: string;
  participant?: string;
  payload?: unknown;
  payloadJson?: unknown;
};

function parsePayload(claim: ClaimLike): Record<string, unknown> | null {
  if (claim.payloadJson && typeof claim.payloadJson === 'object') return claim.payloadJson as Record<string, unknown>;
  if (claim.payload && typeof claim.payload === 'object') return claim.payload as Record<string, unknown>;
  if (typeof claim.payload === 'string') {
    try {
      const parsed = JSON.parse(claim.payload) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function isMilestoneClaimType(t?: string): boolean {
  const up = (t ?? '').toUpperCase();
  return up === 'MILESTONE_COMPLETION' || up === 'MILESTONE_CLAIM';
}

/**
 * POST /api/admin/milestones/purge-legacy-claims
 * Purges (revokes) Anchor milestone claims that do NOT match the strict schema:
 * - payload.playerAddress (0x...)
 * - payload.milestoneId (string/number)
 *
 * This is intentionally destructive. Use dryRun first.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const adminAddress = getAdminWalletService().getAddress();
  if (!adminAddress?.startsWith('0x')) {
    throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Admin wallet not initialized');
  }
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  if (!corridorAdminCapId?.trim().startsWith('0x')) {
    throw new PlatformError(
      PlatformErrorCode.CONFIG_MISSING,
      'CORRIDOR_ADMIN_CAP_OBJECT_ID_* is required to revoke Anchor claims.'
    );
  }

  const body = await getRequestBody<{
    dryRun?: boolean;
    limit?: number;
    participant?: string;
  }>(request).catch(() => ({} as any));

  const dryRun = body?.dryRun !== false; // default true
  const limit = typeof body?.limit === 'number' ? body.limit : 100;

  // Participant defaults to the admin wallet (claims submitter).
  const participant =
    typeof body?.participant === 'string' && body.participant.trim().startsWith('0x')
      ? body.participant.trim()
      : adminAddress;

  const res = await platformAnchorClient.listParticipantClaims(participant, { limit });
  if (!res.success) {
    throw new PlatformError(
      PlatformErrorCode.SERVICE_UNAVAILABLE,
      res.error ?? 'Failed to list Anchor claims for participant'
    );
  }

  const claims = (res.claims ?? []) as ClaimLike[];
  const legacy: Array<{ claimId: number; claimType?: string; reason: string; payloadKeys?: string[] }> = [];

  for (const c of claims) {
    if (!isMilestoneClaimType(c.claimType)) continue;
    const claimId = typeof c.claimId === 'number' ? c.claimId : NaN;
    if (!Number.isInteger(claimId) || claimId < 0) continue;

    const payload = parsePayload(c);
    const keys = payload ? Object.keys(payload) : undefined;
    const playerAddress = payload ? String(payload.playerAddress ?? '') : '';
    const milestoneId = payload ? (payload.milestoneId as unknown) : undefined;

    const okPlayer = playerAddress.startsWith('0x') && playerAddress.length >= 10;
    const okMilestone = typeof milestoneId === 'string' ? milestoneId !== '' : typeof milestoneId === 'number';
    if (okPlayer && okMilestone) continue;

    legacy.push({
      claimId,
      claimType: c.claimType,
      reason: !payload
        ? 'missing payload'
        : !okPlayer && !okMilestone
          ? 'missing playerAddress and milestoneId'
          : !okPlayer
            ? 'missing playerAddress'
            : 'missing milestoneId',
      payloadKeys: keys,
    });
  }

  PlatformLogger.warn('[ADMIN] purge-legacy-claims scan complete', {
    participantPrefix: participant.slice(0, 10) + '...',
    totalClaims: claims.length,
    legacyCount: legacy.length,
    dryRun,
  });

  if (dryRun || legacy.length === 0) {
    return {
      success: true,
      dryRun,
      participant,
      scanned: claims.length,
      legacyCount: legacy.length,
      legacy: legacy.slice(0, 50),
      message: dryRun
        ? `Dry run: would revoke ${legacy.length} legacy milestone claim(s).`
        : `No legacy milestone claims found.`,
    };
  }

  // Build + execute one revoke tx per claimId (simple and reliable).
  const txsToSubmit: Array<{ bytesBase64: string; type: 'credits'; recipientAddress: string }> = [];
  const errors: string[] = [];

  for (const x of legacy) {
    const buildRes = await buildBatchViaChannel({
      operations: [
        {
          operationId: 'anchor-revoke-claim',
          params: { claimId: x.claimId, corridorAdminCapabilityObjectId: corridorAdminCapId.trim() },
        },
      ],
    });
    if (!buildRes.success || !buildRes.transactions?.length) {
      errors.push(`claimId ${x.claimId}: build failed (${buildRes.errors?.join('; ') ?? buildRes.error ?? 'unknown'})`);
      continue;
    }
    txsToSubmit.push({
      bytesBase64: buildRes.transactions[0]!,
      type: 'credits',
      recipientAddress: participant,
    });
  }

  const execRes = await signAndSubmitRewardTransactions(txsToSubmit, { source: 'admin:purge-legacy-milestone-claims' });
  const revoked = execRes.digests.length;
  const allErrors = [...errors, ...execRes.errors];

  return {
    success: allErrors.length === 0,
    dryRun: false,
    participant,
    scanned: claims.length,
    legacyCount: legacy.length,
    revoked,
    digests: execRes.digests,
    errors: allErrors.length ? allErrors : undefined,
    message: `Revoked ${revoked} of ${legacy.length} legacy milestone claim(s).`,
  };
});


// ==========================================
// Admin API: Get/set per-tournament distribution overrides (optional)
// Override auto-distribute and/or grace period for this event.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformEventsClient } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

async function resolveTournamentObjectId(tournamentId: number): Promise<string> {
  const tournamentService = getTournamentService();
  const [activeTournaments, pastTournaments] = await Promise.all([
    tournamentService.getActiveTournaments(true),
    tournamentService.getPastTournaments(1000),
  ]);
  const tournament = [...activeTournaments, ...pastTournaments].find((t: any) => t.tournamentId === tournamentId);
  if (!tournament?.objectId) throw new Error('Tournament not found');
  return tournament.objectId;
}

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) throw new Error('Invalid tournament ID');
    const objectId = await resolveTournamentObjectId(tournamentId);
    const res = await platformEventsClient.getDistributionOverrides(objectId);
    if (!res.success) throw new Error(res.error ?? 'Failed to get overrides');
    return {
      success: true,
      tournamentId,
      override_auto_distribute: res.override_auto_distribute,
      override_grace_period_ms: res.override_grace_period_ms,
      override_grace_period_minutes:
        res.override_grace_period_ms != null ? Math.round(res.override_grace_period_ms / (60 * 1000)) : undefined,
    };
  }
);

export const PUT = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) throw new Error('Invalid tournament ID');
    type PutBody = {
      adminWalletAddress?: string;
      override_auto_distribute?: boolean;
      override_grace_period_ms?: number;
      override_grace_period_minutes?: number;
    };
    const body = (await getRequestBody<PutBody>(request).catch(() => ({}))) as PutBody;
    const adminWalletService = getAdminWalletService();
    const expectedAdmin = adminWalletService.getAddress().toLowerCase();
    const providedAdmin = body.adminWalletAddress?.toLowerCase();
    if (!providedAdmin || providedAdmin !== expectedAdmin) {
      throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
    }
    const objectId = await resolveTournamentObjectId(tournamentId);
    const payload: { override_auto_distribute?: boolean; override_grace_period_ms?: number } = {};
    if (typeof body.override_auto_distribute === 'boolean') payload.override_auto_distribute = body.override_auto_distribute;
    if (typeof body.override_grace_period_ms === 'number' && body.override_grace_period_ms >= 0) {
      payload.override_grace_period_ms = body.override_grace_period_ms;
    } else if (typeof body.override_grace_period_minutes === 'number' && body.override_grace_period_minutes >= 0) {
      payload.override_grace_period_ms = body.override_grace_period_minutes * 60 * 1000;
    }
    const res = await platformEventsClient.setDistributionOverrides(objectId, payload);
    if (!res.success) throw new Error(res.error ?? 'Failed to set overrides');
    return {
      success: true,
      tournamentId,
      override_auto_distribute: res.override_auto_distribute,
      override_grace_period_ms: res.override_grace_period_ms,
      override_grace_period_minutes:
        res.override_grace_period_ms != null ? Math.round(res.override_grace_period_ms / (60 * 1000)) : undefined,
    };
  }
);

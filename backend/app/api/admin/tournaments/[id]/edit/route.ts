// ==========================================
// Admin API: Edit Tournament
// All tx building via platform Channel (station-edit-event).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { assertGameAdminServerConfigured } from '@/lib/auth';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  buildBatchViaChannel,
  platformTxClient,
  platformEventsClient,
  getCorridorAdminCapabilityObjectIdFromEnv,
  buildPlatformCallOptions,
} from '@/lib/services/platform/client/platform-client';

const CATEGORY_LABELS: Record<number, string> = {
  0: 'totalCoins',
  1: 'longestStreak',
  2: 'highestScore',
  3: 'longestDistance',
  4: 'mostBosses',
  5: 'mostEnemies',
};

function categoryStringToU8(c: string): number {
  const map: Record<string, number> = {
    totalCoins: 0,
    longestStreak: 1,
    highestScore: 2,
    longestDistance: 3,
    mostBosses: 4,
    mostEnemies: 5,
  };
  return map[c] ?? 2;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    assertGameAdminServerConfigured();

    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }

    const body = await getRequestBody<{
      tournamentObjectId?: string;
      name?: string;
      startTime?: number;
      endTime?: number;
      entryFeeTickets?: number;
      category?: number;
      ticketValueUSDCents?: number;
      startingAnteUSDCents?: number;
      rewardToken?: string;
      rewardConfig?: Record<string, unknown>;
      competitionType?: string;
      participationMode?: 'individual' | 'team';
      vaultCoinTypeId?: string;
      additionalData?: Record<string, unknown>;
    }>(request);
    const {
      tournamentObjectId,
      name,
      startTime,
      endTime,
      entryFeeTickets,
      category,
      ticketValueUSDCents,
      startingAnteUSDCents,
      rewardToken,
      rewardConfig,
      competitionType,
      participationMode,
      vaultCoinTypeId,
      additionalData,
    } = body;

    if (!tournamentObjectId || !tournamentObjectId.startsWith('0x')) {
      throw new Error('tournamentObjectId is required and must be a valid object ID (0x...)');
    }

    const metadataFieldsUpdated = [
      entryFeeTickets !== undefined,
      category !== undefined,
      ticketValueUSDCents !== undefined,
      startingAnteUSDCents !== undefined,
      rewardToken !== undefined,
      rewardConfig !== undefined,
      competitionType !== undefined,
      participationMode !== undefined,
      vaultCoinTypeId !== undefined,
      additionalData !== undefined,
    ].some(Boolean);
    PlatformLogger.info('✏️ [ADMIN API] Tournament edit request (platform)', {
      tournamentId,
      tournamentObjectId,
      updates: {
        name: name ? 'updated' : 'unchanged',
        startTime: startTime ? 'updated' : 'unchanged',
        endTime: endTime ? 'updated' : 'unchanged',
        metadata: metadataFieldsUpdated ? 'updated' : 'unchanged',
      },
    });

    const tournamentService = getTournamentService();
    const activeTournaments = await tournamentService.getActiveTournaments(true);
    const pastTournaments = await tournamentService.getPastTournaments(1000);
    const allTournaments = [...activeTournaments, ...pastTournaments];

    const tournament = allTournaments.find(
      (t: { tournamentId: number }) => t.tournamentId === tournamentId
    );

    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    const currentTime = Date.now();
    if (currentTime >= tournament.startTime) {
      throw new Error('Cannot edit tournament that has already started');
    }

    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId || !corridorAdminCapId.startsWith('0x')) {
      throw new Error('CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) not configured. Required for platform edit.');
    }

    const hasName = name !== undefined && name !== null && name !== '';
    const hasStartTime = startTime != null && startTime > 0;
    const hasEndTime = endTime != null && endTime > 0;
    const hasMetadata = metadataFieldsUpdated;
    if (!hasName && !hasStartTime && !hasEndTime && !hasMetadata) {
      throw new Error(
        'No updates provided. Send at least one of: name, startTime, endTime, entryFeeTickets, category, ticketValueUSDCents, startingAnteUSDCents, rewardToken, rewardConfig, competitionType, participationMode, vaultCoinTypeId, additionalData'
      );
    }

    // Build full replacement metadata when any metadata field is edited. Fetch current event metadata from platform and merge body overrides so we preserve all fields (e.g. additionalData).
    let metadataJson: string | undefined;
    if (hasMetadata) {
      const eventRes = await platformEventsClient.getEvent(tournamentObjectId, buildPlatformCallOptions());
      if (!eventRes.success || !eventRes.event) {
        throw new Error(eventRes.error ?? 'Failed to load event metadata for edit');
      }
      const currentMeta = (eventRes.event.metadata && typeof eventRes.event.metadata === 'object')
        ? { ...eventRes.event.metadata }
        : {} as Record<string, unknown>;
      const t = tournament as {
        category?: string;
        entryFeeTickets?: number;
        ticketValueUSDCents?: number;
        startingAnteUSDCents?: number;
        rewardToken?: string;
        rewardConfig?: unknown;
        poolVaultCoinTypeId?: string;
      };
      const currentCategory = t.category ?? 'highestScore';
      const finalCategoryU8 = category !== undefined ? category : categoryStringToU8(currentCategory);
      const categoryLabel = CATEGORY_LABELS[finalCategoryU8] ?? 'highestScore';
      const meta: Record<string, unknown> = {
        ...currentMeta,
        category: finalCategoryU8,
        categoryLabel,
        entryFeeTickets: entryFeeTickets !== undefined ? entryFeeTickets : (currentMeta.entryFeeTickets ?? t.entryFeeTickets ?? 1),
        ticketValueUSDCents: ticketValueUSDCents !== undefined ? ticketValueUSDCents : (currentMeta.ticketValueUSDCents ?? t.ticketValueUSDCents ?? 100),
        startingAnteUSDCents: startingAnteUSDCents !== undefined ? startingAnteUSDCents : (currentMeta.startingAnteUSDCents ?? t.startingAnteUSDCents ?? 0),
        rewardToken: rewardToken !== undefined ? rewardToken : (currentMeta.rewardToken ?? t.rewardToken ?? 'MEWS'),
        rewardConfig: rewardConfig !== undefined ? rewardConfig : (currentMeta.rewardConfig ?? t.rewardConfig ?? {}),
        competitionType: competitionType !== undefined ? competitionType : (currentMeta.competitionType ?? 'all-vs-all'),
        participationMode: participationMode !== undefined ? participationMode : (currentMeta.participationMode ?? 'individual'),
      };
      if (vaultCoinTypeId !== undefined) meta.vaultCoinTypeId = vaultCoinTypeId;
      else if (currentMeta.vaultCoinTypeId != null || t.poolVaultCoinTypeId) meta.vaultCoinTypeId = currentMeta.vaultCoinTypeId ?? t.poolVaultCoinTypeId;
      if (additionalData !== undefined) meta.additionalData = additionalData;
      else if (currentMeta.additionalData != null) meta.additionalData = currentMeta.additionalData;
      metadataJson = JSON.stringify(meta);
    }

    const adminWalletService = getAdminWalletService();
    const buildRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'station-edit-event',
            params: {
              eventId: tournamentObjectId,
              corridorAdminCapId,
              senderAddress: adminWalletService.getAddress(),
              ...(hasName ? { name } : {}),
              ...(hasStartTime ? { startTime } : {}),
              ...(hasEndTime ? { endTime } : {}),
              ...(metadataJson ? { metadata: metadataJson } : {}),
            },
          },
        ],
      },
      buildPlatformCallOptions()
    );

    if (!buildRes.success || !buildRes.transactions?.length) {
      const err = buildRes.errors?.[0] ?? buildRes.error ?? 'Platform build failed';
      PlatformLogger.error('✏️ [ADMIN API] Edit build failed', { tournamentId, error: err });
      throw new Error(err);
    }

    const digests: string[] = [];
    for (const txBase64 of buildRes.transactions) {
      const signed = await adminWalletService.getKeypair().signTransaction(Buffer.from(txBase64, 'base64'));
      const execRes = await platformTxClient.executeSigned(
        { transactionBytesBase64: txBase64, signature: signed.signature },
        buildPlatformCallOptions()
      );
      if (!execRes.success) {
        throw new Error(execRes.error ?? 'Failed to execute edit transaction');
      }
      if (execRes.digest) digests.push(execRes.digest);
    }

    PlatformLogger.info('✏️ [ADMIN API] Tournament updated via platform', {
      tournamentId,
      tournamentObjectId,
      digests,
    });

    return {
      success: true,
      message: `Tournament ${tournamentId} updated successfully`,
      digests,
    };
  }
);

// ==========================================
// Tournament Score Submission API Route
// Admin wallet signs and pays gas fees
// Tournament games do NOT increment total_games
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody, type ApiHandlerContext } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { validateScoreData, type ScoreDataForValidation } from '@/lib/services/validation/score/score-validation';
import { computeScoreFromReplay } from '@/lib/services/validation/score/replay-scorer';
import type { ReplayPayload } from '@/lib/services/validation/score/replay-schema';
import { guardScoreSubmit, recordScoreSubmit } from '@/lib/services/validation/score/score-submit-guard';
import {
  buildBatchViaChannel,
  platformEventsClient,
  platformTxClient,
  buildPlatformCallOptions,
  getCorridorCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getTournamentGracePeriodMs } from '@/lib/services/tournament/tournament-settings';

/** Category string to u8 (0–5) for regatta submission. Matches platform/contract. */
const CATEGORY_TO_U8: Record<string, number> = {
  totalCoins: 0,
  longestStreak: 1,
  highestScore: 2,
  longestDistance: 3,
  mostBosses: 4,
  mostEnemies: 5,
};

/**
 * POST /api/tournaments/[id]/submit-score
 * Submit tournament game score - admin wallet signs and pays gas.
 * Score is computed from the replay; no trusted score payload from client.
 * Platform requires an Anchor session ID; obtain via POST /api/tournaments/create-anchor-session when starting the tournament.
 *
 * Request body:
 * {
 *   playerAddress: string,
 *   sessionId: number,      // Anchor session ID (≥ 0). Required.
 *   replay: { version, events },  // Required. Same event types as scores/submit.
 *   playerName?: string
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { params, requestContext }: ApiHandlerContext<{ id: string }>) => {
    const requestId = requestContext.requestId;
    const { id } = await params;
    const tournamentObjectId = id;
    const body = await getRequestBody<{
      playerAddress: string;
      sessionId: number;
      replay: ReplayPayload;
      playerName?: string;
    }>(request);
    const { playerAddress, sessionId, playerName = '', replay } = body;

    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!tournamentObjectId) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Tournament ID is required'
      );
    }

    if (!replay || !Array.isArray(replay.events)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'replay is required and must have an events array. See replay-schema for event types.'
      );
    }

    if (
      sessionId === undefined ||
      sessionId === null ||
      typeof sessionId !== 'number' ||
      Number.isNaN(sessionId) ||
      sessionId < 1
    ) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'sessionId is required and must be a positive Anchor session ID. Create a session when starting the tournament via POST /api/tournaments/create-anchor-session; if that fails, do not start the game.'
      );
    }

    PlatformValidators.validateAddress(playerAddress);

    let computed: ReturnType<typeof computeScoreFromReplay>;
    try {
      computed = computeScoreFromReplay(replay as ReplayPayload);
    } catch (e) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        e instanceof Error ? e.message : 'Replay computation failed'
      );
    }

    const dataForValidation: ScoreDataForValidation = {
      score: computed.score,
      distance: computed.distance,
      coins: computed.coins,
      bossesDefeated: computed.bossesDefeated,
      enemiesDefeated: computed.enemiesDefeated,
      longestCoinStreak: computed.longestCoinStreak,
      bossTiers: computed.bossTiers,
      enemyTypes: computed.enemyTypes,
      bossHits: computed.bossHits,
    };

    try {
      validateScoreData(dataForValidation);
    } catch (e) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        e instanceof Error ? e.message : 'Score validation failed'
      );
    }

    try {
      guardScoreSubmit(playerAddress, computed, replay);
    } catch (e) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        e instanceof Error ? e.message : 'Submission not allowed'
      );
    }

    const scoreData = {
      score: computed.score,
      distance: computed.distance,
      coins: computed.coins,
      bossesDefeated: computed.bossesDefeated,
      enemiesDefeated: computed.enemiesDefeated,
      longestCoinStreak: computed.longestCoinStreak,
    };

    PlatformLogger.info('🏆 [TOURNAMENT SCORE API] Tournament score submission request received (replay verified)', {
      requestId,
      sessionId,
      tournamentObjectId,
      playerAddress,
      playerName: playerName || '(not provided)',
      score: scoreData.score,
      distance: scoreData.distance,
      coins: scoreData.coins,
      replayEventCount: replay.events.length,
    });

    // Get tournament service
    const tournamentService = getTournamentService();

    // Get tournament details to validate and extract category
    const tournamentResult = await tournamentService.getTournament(tournamentObjectId);
    
    if (!tournamentResult.success || !tournamentResult.tournament) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        tournamentResult.error || 'Tournament not found'
      );
    }

    const tournament = tournamentResult.tournament;

    // Debug: Log the tournament name being read
    PlatformLogger.info('🏆 [TOURNAMENT SCORE API] Tournament name from blockchain', {
      requestId,
      sessionId,
      tournamentObjectId,
      tournamentId: tournament.tournamentId,
      tournamentName: tournament.name,
      nameLength: tournament.name.length,
    });

    // Validate tournament is active or within grace period (configurable via admin)
    const now = Date.now();
    const graceMs = await getTournamentGracePeriodMs();
    const gracePeriodEnd = tournament.endTime + graceMs;

    if (now > gracePeriodEnd) {
      // Grace period ended. Distribution is handled by Tide or admin (vault path only).
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Tournament has ended and grace period has expired. Score submission is no longer available.'
      );
    }

    // Validate player is a participant in THIS SPECIFIC tournament
    // This is crucial when multiple tournaments are active simultaneously
    // Use isPlayerParticipant for more accurate check (checks TournamentEntered events)
    PlatformLogger.info('🏆 [TOURNAMENT SCORE API] Verifying player participation in specific tournament', {
      requestId,
      sessionId,
      tournamentObjectId,
      tournamentId: tournament.tournamentId,
      tournamentName: tournament.name,
      playerAddress,
    });
    
    const participationCheck = await tournamentService.isPlayerParticipant(tournamentObjectId, playerAddress);
    
    if (!participationCheck.success) {
      PlatformLogger.error('🏆 [TOURNAMENT SCORE API] Failed to verify tournament participation', {
        requestId,
        sessionId,
        tournamentObjectId,
        tournamentId: tournament.tournamentId,
        playerAddress,
        error: participationCheck.error,
      });
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        participationCheck.error || 'Failed to verify tournament participation'
      );
    }

    if (!participationCheck.isParticipant) {
      const enteredTournaments = participationCheck.enteredTournamentIds || [];
      PlatformLogger.error('🏆 [TOURNAMENT SCORE API] Player is not a participant in this tournament', {
        requestId,
        sessionId,
        tournamentObjectId,
        tournamentId: tournament.tournamentId,
        tournamentName: tournament.name,
        playerAddress,
        enteredTournamentIds: enteredTournaments,
        message: `Player has entered tournaments: [${enteredTournaments.join(', ')}], but trying to submit to tournament ${tournament.tournamentId}`,
      });
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        `Player is not a participant in tournament "${tournament.name}" (ID: ${tournament.tournamentId}). ` +
        `Player has entered tournaments: [${enteredTournaments.join(', ')}]. ` +
        `Please enter this tournament first by consuming a tournament ticket.`
      );
    }

    PlatformLogger.info('✅ [TOURNAMENT SCORE API] Player verified as participant in correct tournament', {
      requestId,
      sessionId,
      tournamentObjectId,
      tournamentId: tournament.tournamentId,
      tournamentName: tournament.name,
      playerAddress,
      enteredTournamentIds: participationCheck.enteredTournamentIds,
    });

    // Player is a participant - get their current rank (if they've submitted a score)
    const playerRankResult = await tournamentService.getPlayerRank(tournamentObjectId, playerAddress);
    if (!playerRankResult.success) {
      PlatformLogger.warn('Failed to get player rank, but player is a participant', {
        tournamentObjectId,
        playerAddress,
        error: playerRankResult.error,
      });
      // Continue anyway - player is a participant, rank check is just for logging
    }

    // Extract category value from computed score
    const categoryValueMap: Record<typeof tournament.category, keyof typeof scoreData> = {
      'totalCoins': 'coins',
      'longestStreak': 'longestCoinStreak',
      'highestScore': 'score',
      'longestDistance': 'distance',
      'mostBosses': 'bossesDefeated',
      'mostEnemies': 'enemiesDefeated',
    };

    const categoryValue = scoreData[categoryValueMap[tournament.category]];

    const corridorCap = getCorridorCapabilityObjectIdFromEnv();
    const adminWallet = getAdminWalletService();
    const gasOwnerAddress = adminWallet.getAddress();
    const platformOptions = buildPlatformCallOptions(request, body);

    // Game-level semantics:
    // - Do NOT overwrite a player's tournament submission unless the category value is higher.
    // - Do NOT overwrite playerName once set.
    // - For all numeric stats, keep max(existing, new) so a later run can't decrease fields.
    const submissionsRes = await platformEventsClient.getSubmissions(
      tournamentObjectId,
      platformOptions
    );
    const existing = submissionsRes.success && Array.isArray(submissionsRes.submissions)
      ? submissionsRes.submissions.find(
          (s) => String(s.participant || '').toLowerCase() === playerAddress.toLowerCase()
        )
      : undefined;
    const existingData = (existing?.submissionData && typeof existing.submissionData === 'object')
      ? (existing.submissionData as Record<string, unknown>)
      : {};
    const existingValueRaw = existingData['value'];
    const existingCategoryValue = typeof existingValueRaw === 'number'
      ? existingValueRaw
      : Number(existingValueRaw ?? 0) || 0;
    const existingName = typeof existingData['playerName'] === 'string' ? String(existingData['playerName']) : '';

    if (existing && categoryValue <= existingCategoryValue) {
      PlatformLogger.info('🏆 [TOURNAMENT SCORE API] Skipping submit: not a new high score for this tournament', {
        requestId,
        sessionId,
        tournamentObjectId,
        playerAddress,
        tournamentCategory: tournament.category,
        existingCategoryValue,
        categoryValue,
      });
      return {
        success: true,
        digest: null,
        playerAddress,
        gasPaidBy: 'admin_wallet',
        message: 'Score not submitted (did not beat existing tournament high score).',
        tournamentId: tournament.tournamentId,
        tournamentName: tournament.name,
        category: tournament.category,
        categoryValue: existingCategoryValue,
      };
    }

    // Build tournament score tx via Channel batch (regatta-submit-score), then admin sign + execute via Channel
    const submission = {
      category: CATEGORY_TO_U8[tournament.category] ?? 2,
      value: categoryValue,
      score: Math.max(Number(existingData['score'] ?? 0) || 0, scoreData.score),
      distance: Math.max(Number(existingData['distance'] ?? 0) || 0, scoreData.distance),
      coins: Math.max(Number(existingData['coins'] ?? 0) || 0, scoreData.coins),
      bossesDefeated: Math.max(Number(existingData['bossesDefeated'] ?? 0) || 0, scoreData.bossesDefeated),
      enemiesDefeated: Math.max(Number(existingData['enemiesDefeated'] ?? 0) || 0, scoreData.enemiesDefeated),
      // Only set name once (first non-empty wins).
      playerName: (existingName && existingName.trim().length > 0) ? existingName : (playerName || ''),
    };
    PlatformLogger.info('🏆 [TOURNAMENT SCORE API] Channel batch build starting (regatta-submit-score)', {
      requestId,
      sessionId,
      operationId: 'regatta-submit-score',
      tournamentObjectId,
      playerAddress,
      category: tournament.category,
      categoryValue,
      claimType: 'tournament_score',
      corridorCapabilityPrefix: typeof corridorCap === 'string' ? corridorCap.slice(0, 14) : null,
      gasOwnerAddress: gasOwnerAddress,
    });

    const batchRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'regatta-submit-score',
            params: {
              eventObjectId: tournamentObjectId,
              sessionId,
              playerAddress,
              claimType: 'tournament_score',
              submission,
              corridorCapabilityObjectId: corridorCap,
              gasOwnerAddress,
            },
          },
        ],
      },
      platformOptions
    );

    if (!batchRes.success || !batchRes.transactions?.length) {
      const err = batchRes.errors?.join('; ') || batchRes.error || 'Failed to build tournament score transaction';
      PlatformLogger.error('🏆 [TOURNAMENT SCORE API] Channel batch build failed', {
        requestId,
        sessionId,
        tournamentObjectId,
        playerAddress,
        errors: batchRes.errors,
        error: err,
        gasEstimateMist: batchRes.gasEstimateMist ?? null,
      });
      throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, err);
    }

    const txBase64 = batchRes.transactions[0];
    PlatformLogger.info('🏆 [TOURNAMENT SCORE API] Channel batch build succeeded', {
      requestId,
      sessionId,
      tournamentObjectId,
      transactionBytesBase64Length: txBase64.length,
      gasEstimateMist: batchRes.gasEstimateMist ?? null,
    });

    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(txBase64, 'base64'));
    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64: txBase64, signature: signed.signature },
      {
        ...platformOptions,
        channelExecuteLogContext: {
          requestId,
          phase: 'tournament-submit-score',
          sessionId,
          tournamentObjectId,
          category: tournament.category,
        },
      }
    );

    if (!execRes.success) {
      const errStr = String(execRes.error ?? '');
      const errLower = errStr.toLowerCase();
      const looksLikeDynamicFieldAddAbort =
        errLower.includes('identifier("dynamic_field")') &&
        errLower.includes('function_name: some("add")') &&
        errLower.includes(' in command');
      PlatformLogger.error('🏆 [TOURNAMENT SCORE API] Channel execute failed', {
        requestId,
        sessionId,
        tournamentObjectId,
        playerAddress,
        errorLength: errStr.length,
        errorPrefix: errStr.slice(0, 800),
        looksLikeDynamicFieldAddAbort,
      });
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        execRes.error || 'Tournament score submission failed'
      );
    }

    recordScoreSubmit(playerAddress);

    PlatformLogger.info('🏆 [TOURNAMENT SCORE API] Tournament score submitted via Channel', {
      requestId,
      sessionId,
      tournamentObjectId,
      playerAddress,
      transactionDigest: execRes.digest,
      category: tournament.category,
      categoryValue,
    });

    // Note: Tournament games do NOT trigger badge operations
    // Tournament games do NOT increment total_games

    return {
      success: true,
      digest: execRes.digest,
      playerAddress,
      gasPaidBy: 'admin_wallet',
      message: 'Tournament score submitted successfully. Admin wallet paid gas fees.',
      tournamentId: tournament.tournamentId,
      tournamentName: tournament.name,
      category: tournament.category,
      categoryValue,
    };
  },
  {
    logRequest: true,
  }
);


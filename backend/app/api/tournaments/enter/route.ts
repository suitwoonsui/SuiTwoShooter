// ==========================================
// Tournament Entry API Route
// Executes tournament entry transaction with admin wallet (admin pays gas)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { platformGamePassClient, getEcosystemIdFromRequest, buildPlatformCallOptions, buildBatchViaChannel, platformTxClient, getCorridorCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';
import { withApiHandler, getRequestBody, type ApiHandlerContext } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { isStartProvisionItem, toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { requestContext }: ApiHandlerContext) => {
    const requestId = requestContext.requestId;
    const body = await getRequestBody<{
      playerAddress: string;
      tournamentObjectId: string;
      /** Anchor session ID (≥ 1). Required so we only consume a ticket when the player can submit scores. Obtain via POST /api/tournaments/create-anchor-session before calling enter. */
      anchorSessionId: number;
      /** Optional start items to consume atomically with tournament entry (orb_level, extra_lives, force_field). */
      items?: Array<{ itemId: string; level: number; quantity: number }>;
      ticketId?: number;  // Optional - will find a valid ticket if not provided
      ecosystemId?: string;
    }>(request);

    const { playerAddress, tournamentObjectId, anchorSessionId, ticketId, items = [] } = body;

    // Hard gate: never allow entry into ended tournaments (or too-early upcoming ones).
    // We do this server-side to prevent building an "enter" tx that would abort on-chain (and potentially waste UX / ticket ops).
    try {
      const tRes = await getTournamentService().getTournament(tournamentObjectId);
      if (!tRes.success || !tRes.tournament) {
        throw new PlatformError(PlatformErrorCode.INVALID_INPUT, tRes.error || 'Tournament not found');
      }
      const t = tRes.tournament;
      const now = Date.now();
      // Use chain-derived start/end times from platform; status is derived locally in tournament-service.
      if (now < Number(t.startTime)) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          `Tournament has not started yet. Starts at ${new Date(Number(t.startTime)).toLocaleString()}.`
        );
      }
      if (now > Number(t.endTime)) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          `Tournament has ended. Ended at ${new Date(Number(t.endTime)).toLocaleString()}.`
        );
      }
      if (t.status !== 'active') {
        // Defensive: should be active if now in [start,end], but keep explicit.
        throw new PlatformError(PlatformErrorCode.INVALID_INPUT, `Tournament is not active (status=${t.status}).`);
      }
    } catch (e) {
      // Preserve PlatformError messaging when possible
      if (e instanceof PlatformError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, msg || 'Tournament is not enterable.');
    }

    // Participant state: Station entry row exists once per player per tournament event.
    // For each tournament run, we still consume a ticket + start items atomically.
    // IMPORTANT: getPlayerRank returns rank=null until they submit a score — do NOT use rank for this check.
    let alreadyEntered = false;
    try {
      const participation = await getTournamentService().isPlayerParticipant(tournamentObjectId, playerAddress);
      if (participation.success && participation.isParticipant) {
        alreadyEntered = true;
      }
      if (participation.success && !participation.isParticipant) {
        PlatformLogger.info('Tournament entry: pre-check — not in Station entries; attempting chain enter', {
          requestId,
          tournamentObjectId,
          anchorSessionId,
          ticketIdProvided: ticketId != null,
          rawItemsCount: Array.isArray(items) ? items.length : 0,
        });
      }
    } catch (e) {
      PlatformLogger.warn('Tournament entry: failed to pre-check participation', {
        requestId,
        playerAddress,
        tournamentObjectId,
        anchorSessionId,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Validate required fields
    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    // Validate address format
    try {
      PlatformValidators.validateAddress(playerAddress);
    } catch (error) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Invalid player address format'
      );
    }

    if (!tournamentObjectId) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'tournamentObjectId is required'
      );
    }

    // Only consume a ticket when the player has a valid Anchor session for score submission
    if (
      anchorSessionId === undefined ||
      anchorSessionId === null ||
      typeof anchorSessionId !== 'number' ||
      Number.isNaN(anchorSessionId) ||
      anchorSessionId < 1
    ) {
      PlatformLogger.warn('Tournament entry rejected: invalid anchorSessionId', {
        requestId,
        playerAddressPrefix: typeof playerAddress === 'string' ? `${playerAddress.slice(0, 10)}...` : undefined,
        tournamentObjectIdPrefix: typeof tournamentObjectId === 'string' ? `${tournamentObjectId.slice(0, 10)}...` : undefined,
        anchorSessionId,
        anchorSessionIdType: typeof (anchorSessionId as any),
        hasTicketId: ticketId != null,
        itemsCount: Array.isArray(items) ? items.length : 0,
      });
      throw new PlatformError(
        PlatformErrorCode.INVALID_SESSION_ID,
        'anchorSessionId is required and must be ≥ 1. Create it via POST /api/tournaments/create-anchor-session before calling enter.'
      );
    }

    // Get app identifier from config for tracking
    const config = getConfig();
    const appId = config.server.appId;

    // Same tournament: we skip if Station already has an entry row (see idempotency above).
    // On-chain enter_station still upserts participant data if invoked without the skip.

    // If ticketId not provided, get available tickets from platform and choose highest value
    let ticketIdToUse = ticketId;
    const platformOptions = buildPlatformCallOptions(request);

    if (!ticketIdToUse || ticketIdToUse === 0) {
      PlatformLogger.info('No ticket ID provided, fetching available tickets from platform', {
        playerAddress,
      });

      const availableResult = await platformGamePassClient.getAvailableTicketUnits(playerAddress, platformOptions);

      if (!availableResult.success) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          availableResult.error || 'Failed to query available tickets'
        );
      }

      const tickets = availableResult.tickets ?? [];
      if (tickets.length === 0) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'No tournament tickets available. Please purchase tickets from the store.'
        );
      }

      // Sort by value descending and use the highest-value ticket
      const sorted = [...tickets].sort((a, b) => (b.valuePaidUsdCents ?? 0) - (a.valuePaidUsdCents ?? 0));
      ticketIdToUse = sorted[0].ticketId;

      PlatformLogger.info('Selected highest-value ticket from platform', {
        playerAddress,
        appId,
        selectedTicketId: ticketIdToUse,
        valuePaidUsdCents: sorted[0].valuePaidUsdCents,
        totalAvailable: tickets.length,
      });
    }

    // Build + execute one atomic tx: regatta enter (consumes ticket) + optional start-item consume.
    const corridorCap = getCorridorCapabilityObjectIdFromEnv();
    if (!corridorCap?.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_INVALID,
        'CORRIDOR_CAPABILITY_OBJECT_ID (or _TESTNET/_MAINNET) is required for tournament entry.'
      );
    }
    const adminWallet = getAdminWalletService();
    const gameWalletAddress = adminWallet.getAddress();

    // Only consume start items at game start. Other items are consumed when activated during gameplay.
    const platformItems = Array.isArray(items)
      ? items
          .filter((i) => i && typeof i.itemId === 'string' && isStartProvisionItem(i.itemId))
          .map((i) => ({ itemKey: toDynamicProvisionKey(i.itemId), level: i.level, quantity: i.quantity }))
          .filter((i) => Number.isInteger(i.level) && i.level > 0 && Number.isInteger(i.quantity) && i.quantity > 0)
      : [];

    PlatformLogger.info('Entering tournament (atomic: ticket + start items)', {
      requestId,
      playerAddress,
      appId,
      tournamentObjectId,
      anchorSessionId,
      ticketId: ticketIdToUse,
      startItemCount: platformItems.length,
    });

    const ecosystemId = getEcosystemIdFromRequest(request, body);
    PlatformLogger.info('Tournament entry: Channel batch build starting', {
      requestId,
      operationId: alreadyEntered ? 'regatta-consume-ticket-and-items' : 'regatta-enter-and-consume-items',
      ecosystemIdFromRequest: ecosystemId || null,
      tournamentObjectId,
      anchorSessionId,
      ticketId: ticketIdToUse,
      startItems: platformItems.map((i) => ({ itemKey: i.itemKey, level: i.level, quantity: i.quantity })),
      corridorCapabilityPrefix: corridorCap.slice(0, 14),
      gameWalletAddress: gameWalletAddress,
    });

    const batchRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: alreadyEntered ? 'regatta-consume-ticket-and-items' : 'regatta-enter-and-consume-items',
            params: {
              playerAddress,
              ticketId: ticketIdToUse,
              corridorCapabilityObjectId: corridorCap,
              gameWalletAddress,
              items: platformItems,
              gasOwnerAddress: gameWalletAddress,
              ...(alreadyEntered ? {} : { eventObjectId: tournamentObjectId }),
            },
          },
        ],
      },
      { ...platformOptions, ecosystemId }
    );

    if (!batchRes.success || !batchRes.transactions?.length) {
      const err = batchRes.errors?.[0] ?? batchRes.error ?? 'Batch build failed';
      PlatformLogger.error('Tournament entry build failed', {
        requestId,
        playerAddress,
        appId,
        tournamentObjectId,
        anchorSessionId,
        errors: batchRes.errors,
        error: err,
        gasEstimateMist: batchRes.gasEstimateMist ?? null,
      });
      throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, err);
    }

    const txBase64 = batchRes.transactions[0]!;
    PlatformLogger.info('Tournament entry: Channel batch build succeeded', {
      requestId,
      transactionBytesBase64Length: txBase64.length,
      gasEstimateMist: batchRes.gasEstimateMist ?? null,
    });

    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(txBase64, 'base64'));
    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64: txBase64, signature: signed.signature },
      {
        ...platformOptions,
        ecosystemId,
        channelExecuteLogContext: {
          requestId,
          phase: 'tournament-enter',
          anchorSessionId,
          tournamentObjectId,
          ticketId: ticketIdToUse,
          startItemCount: platformItems.length,
        },
      }
    );

    if (!execRes.success) {
      const err = execRes.error ?? 'Failed to enter tournament';
      const errLower = String(err).toLowerCase();
      const isDynamicFieldDuplicateAdd =
        errLower.includes('identifier("dynamic_field")') &&
        errLower.includes('function_name: some("add")') &&
        errLower.includes(' in command 0');
      const isReservoirBalanceConsumeMissing =
        errLower.includes('identifier("reservoir")') &&
        errLower.includes('function_name: some("consume_balance")') &&
        errLower.includes('}, 3)') &&
        errLower.includes('command 1');

      // Idempotency safety net: if the tx aborts while adding a dynamic field key, it *may* be a duplicate-entry.
      // However, other dynamic_field::add aborts are possible. Verify participation before returning success.
      if (isDynamicFieldDuplicateAdd) {
        PlatformLogger.warn('Tournament entry aborted due to dynamic_field::add; verifying participant state', {
          requestId,
          anchorSessionId,
          playerAddress,
          appId,
          tournamentObjectId,
          ticketId: ticketIdToUse,
          errorLength: err.length,
          errorPrefix: err.slice(0, 600),
        });
        try {
          const participation = await getTournamentService().isPlayerParticipant(tournamentObjectId, playerAddress);
          if (participation.success && participation.isParticipant) {
            PlatformLogger.info('Tournament entry: participant row exists after dynamic_field::add abort (treat as idempotent success)', {
              requestId,
              anchorSessionId,
              playerAddress,
              appId,
              tournamentObjectId,
            });
            return {
              success: true,
              alreadyEntered: true,
              tournamentObjectId,
              playerAddress,
              message: 'Player already entered this tournament; duplicate add aborted on-chain but entry is present.',
            };
          }
          PlatformLogger.error('Tournament entry dynamic_field abort but player not entered', {
            requestId,
            anchorSessionId,
            playerAddress,
            appId,
            tournamentObjectId,
            errorLength: err.length,
            errorPrefix: err.slice(0, 600),
          });
        } catch (e) {
          PlatformLogger.warn('Tournament entry: failed to verify participation after dynamic_field abort', {
            requestId,
            anchorSessionId,
            playerAddress,
            appId,
            tournamentObjectId,
            error: e instanceof Error ? e.message : String(e),
            originalErrorLength: err.length,
            originalErrorPrefix: err.slice(0, 400),
          });
        }
        throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, err);
      }

      // If optional start-item consumption fails due to missing reservoir balance entry,
      // fall back to ticket-only entry (no items) so the player can still enter the tournament.
      if (platformItems.length > 0 && isReservoirBalanceConsumeMissing) {
        PlatformLogger.warn('Tournament entry failed during item consume; retrying ticket-only entry', {
          requestId,
          anchorSessionId,
          playerAddress,
          appId,
          tournamentObjectId,
          ticketId: ticketIdToUse,
          startItemCount: platformItems.length,
          errorLength: err.length,
          errorPrefix: err.slice(0, 600),
        });

        const retryBatch = await buildBatchViaChannel(
          {
            operations: [
              {
                operationId: 'regatta-enter-and-consume-items',
                params: {
                  eventObjectId: tournamentObjectId,
                  playerAddress,
                  ticketId: ticketIdToUse,
                  corridorCapabilityObjectId: corridorCap,
                  gameWalletAddress,
                  items: [],
                  gasOwnerAddress: gameWalletAddress,
                },
              },
            ],
          },
          { ...platformOptions, ecosystemId }
        );

        if (!retryBatch.success || !retryBatch.transactions?.length) {
          const retryErr = retryBatch.errors?.[0] ?? retryBatch.error ?? 'Batch build failed (retry)';
          PlatformLogger.error('Tournament entry retry build failed', {
            requestId,
            anchorSessionId,
            playerAddress,
            appId,
            tournamentObjectId,
            errors: retryBatch.errors,
            error: retryErr,
          });
          throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, retryErr);
        }

        const retryTxBase64 = retryBatch.transactions[0]!;
        PlatformLogger.info('Tournament entry: retry batch build succeeded (ticket only)', {
          requestId,
          transactionBytesBase64Length: retryTxBase64.length,
        });

        const retrySigned = await adminWallet.getKeypair().signTransaction(Buffer.from(retryTxBase64, 'base64'));
        const retryExec = await platformTxClient.executeSigned(
          { transactionBytesBase64: retryTxBase64, signature: retrySigned.signature },
          {
            ...platformOptions,
            ecosystemId,
            channelExecuteLogContext: {
              requestId,
              phase: 'tournament-enter-retry',
              anchorSessionId,
              tournamentObjectId,
              ticketId: ticketIdToUse,
              startItemCount: 0,
            },
          }
        );
        if (!retryExec.success) {
          PlatformLogger.error('Tournament entry retry execute failed', {
            requestId,
            anchorSessionId,
            playerAddress,
            appId,
            tournamentObjectId,
            errorLength: String(retryExec.error ?? '').length,
            errorPrefix: String(retryExec.error ?? '').slice(0, 600),
          });
          throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, retryExec.error ?? 'Failed to enter tournament (retry)');
        }

        PlatformLogger.info('Tournament entry successful (ticket only; items skipped)', {
          requestId,
          anchorSessionId,
          playerAddress,
          appId,
          tournamentObjectId,
          transactionDigest: retryExec.digest,
        });

        return {
          success: true,
          transactionDigest: retryExec.digest,
          appId,
          itemsSkipped: true,
        };
      }

      PlatformLogger.error('Tournament entry execute failed', {
        requestId,
        anchorSessionId,
        playerAddress,
        appId,
        tournamentObjectId,
        errorLength: err.length,
        errorPrefix: err.slice(0, 600),
      });
      throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, err);
    }

    PlatformLogger.info('Tournament run start successful (ticket + start items consumed)', {
      requestId,
      anchorSessionId,
      playerAddress,
      appId,
      tournamentObjectId,
      transactionDigest: execRes.digest,
    });

    return {
      success: true,
      transactionDigest: execRes.digest,
      appId, // Return app identifier for tracking
      alreadyEntered,
    };
  }
);



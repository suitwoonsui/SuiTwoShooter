// ==========================================
// Score Submission Trace API Route
// Traces all score submissions for a player
// Shows both regular game scores and tournament scores
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../../base/backend/lib/cors';
import { withApiHandler } from '../../../../../../../../base/backend/lib/api/api-handler';
import { getTournamentService } from '../../../../../../../../backend/lib/sui/tournament-service';
import { BadgeValidators } from '../../../../../../../../backend/lib/sui/badge-validators';
import { BadgeLogger } from '../../../../../../../../base/backend/lib/sui/badge-logger';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '../../../../../../../../base/backend/config/config';

/**
 * GET /api/scores/trace/[address]
 * Trace all score submissions for a player
 * 
 * Returns:
 * - Regular game scores (GameSession objects + ScoreSubmitted events)
 * - Tournament scores (TournamentScoreUpdated events)
 * - Transaction digests for verification
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ address: string }> }) => {
    const { address } = await params;
    const playerAddress = address;

    // Validate player address format
    BadgeValidators.validateAddress(playerAddress);

    const config = getConfig();
    const client = new SuiClient({ url: getFullnodeUrl(config.sui.network) });
    // Extract package ID from gameScore contract address (format: packageId::module::type)
    const packageId = config.contracts.gameScore?.split('::')[0] || '';

    BadgeLogger.info('🔍 [SCORE TRACE] Tracing score submissions', {
      playerAddress,
      packageId,
      network: config.sui.network,
    });

    const results = {
      playerAddress,
      regularGameScores: [] as any[],
      tournamentScores: [] as any[],
      summary: {
        totalRegularScores: 0,
        totalTournamentScores: 0,
        latestRegularScore: null as any,
        latestTournamentScore: null as any,
      },
    };

    try {
      // ==========================================
      // 1. QUERY REGULAR GAME SCORES
      // ==========================================
      
      // 1a. Query GameSession objects owned by player
      BadgeLogger.debug('🔍 [SCORE TRACE] Querying GameSession objects', { playerAddress });
      const gameSessionType = `${packageId}::score_submission::GameSession`;
      
      try {
        const ownedObjects = await client.getOwnedObjects({
          owner: playerAddress,
          filter: {
            StructType: gameSessionType,
          },
          options: {
            showContent: true,
            showType: true,
          },
        });

        BadgeLogger.debug('🔍 [SCORE TRACE] Found GameSession objects', {
          count: ownedObjects.data.length,
        });

        for (const obj of ownedObjects.data) {
          if (obj.data?.content && 'fields' in obj.data.content) {
            const fields = obj.data.content.fields as any;
            const gameSession = {
              type: 'regular_game',
              objectId: obj.data.objectId,
              transactionDigest: obj.data.previousTransaction,
              score: Number(fields.score || 0),
              distance: Number(fields.distance || 0),
              coins: Number(fields.coins || 0),
              bossesDefeated: Number(fields.bosses_defeated || 0),
              enemiesDefeated: Number(fields.enemies_defeated || 0),
              longestCoinStreak: Number(fields.longest_coin_streak || 0),
              timestamp: Number(fields.timestamp || 0),
              sessionId: fields.session_id ? (Array.isArray(fields.session_id) ? new TextDecoder().decode(new Uint8Array(fields.session_id)) : fields.session_id) : '',
              playerName: fields.player_name ? (Array.isArray(fields.player_name) ? new TextDecoder().decode(new Uint8Array(fields.player_name)) : fields.player_name) : '',
            };
            results.regularGameScores.push(gameSession);
          }
        }
      } catch (error) {
        BadgeLogger.warn('Error querying GameSession objects', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // 1b. Query ScoreSubmitted events
      BadgeLogger.debug('🔍 [SCORE TRACE] Querying ScoreSubmitted events', { playerAddress });
      try {
        const scoreEvents = await client.queryEvents({
          query: {
            MoveModule: {
              package: packageId,
              module: 'score_submission',
            },
          },
          limit: 1000,
          order: 'descending',
        });

        // Filter for this player's events
        for (const event of scoreEvents.data) {
          if (event.type?.includes('ScoreSubmitted')) {
            const eventData = event.parsedJson as any;
            if (eventData.player && (eventData.player as string).toLowerCase() === playerAddress.toLowerCase()) {
              // Check if we already have this as a GameSession object
              const sessionId = Array.isArray(eventData.session_id) 
                ? new TextDecoder().decode(new Uint8Array(eventData.session_id))
                : eventData.session_id || '';
              
              const existing = results.regularGameScores.find(
                s => s.sessionId === sessionId || s.transactionDigest === event.id.txDigest
              );

              if (!existing) {
                // Add as event-only entry (GameSession object might not exist or be queryable)
                results.regularGameScores.push({
                  type: 'regular_game',
                  source: 'event_only',
                  transactionDigest: event.id.txDigest,
                  score: Number(eventData.score || 0),
                  distance: Number(eventData.distance || 0),
                  coins: Number(eventData.coins || 0),
                  bossesDefeated: Number(eventData.bosses_defeated || 0),
                  enemiesDefeated: Number(eventData.enemies_defeated || 0),
                  longestCoinStreak: Number(eventData.longest_coin_streak || 0),
                  timestamp: Number(eventData.timestamp || 0),
                  sessionId,
                  playerName: eventData.player_name ? (Array.isArray(eventData.player_name) ? new TextDecoder().decode(new Uint8Array(eventData.player_name)) : eventData.player_name) : '',
                });
              } else {
                // Update existing entry with event transaction digest if missing
                if (!existing.transactionDigest) {
                  existing.transactionDigest = event.id.txDigest;
                }
              }
            }
          }
        }
      } catch (error) {
        BadgeLogger.warn('Error querying ScoreSubmitted events', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // ==========================================
      // 2. QUERY TOURNAMENT SCORES
      // ==========================================
      
      BadgeLogger.debug('🔍 [SCORE TRACE] Querying TournamentScoreUpdated events', { playerAddress });
      const tournamentService = getTournamentService();
      
      try {
        const tournamentEvents = await client.queryEvents({
          query: {
            MoveModule: {
              package: packageId,
              module: 'tournaments',
            },
          },
          limit: 1000,
          order: 'descending',
        });

        // Filter for this player's tournament score events
        for (const event of tournamentEvents.data) {
          if (event.type?.includes('TournamentScoreUpdated')) {
            const eventData = event.parsedJson as any;
            const eventPlayer = typeof eventData.player === 'string' 
              ? eventData.player 
              : Array.isArray(eventData.player) 
                ? String(eventData.player[0] || '')
                : '';
            
            if (eventPlayer.toLowerCase() === playerAddress.toLowerCase()) {
              // Extract tournament_id
              let tournamentId = 0;
              if (typeof eventData.tournament_id === 'number') {
                tournamentId = eventData.tournament_id;
              } else if (Array.isArray(eventData.tournament_id)) {
                const bytes = eventData.tournament_id;
                tournamentId = bytes.length > 0 ? bytes[0] : 0;
                for (let i = 1; i < Math.min(bytes.length, 8); i++) {
                  tournamentId += bytes[i] * Math.pow(256, i);
                }
              } else {
                tournamentId = Number(eventData.tournament_id || 0);
              }

              // Extract value (category value)
              let value = 0;
              if (typeof eventData.value === 'number') {
                value = eventData.value;
              } else if (Array.isArray(eventData.value)) {
                const bytes = eventData.value;
                value = bytes.length > 0 ? bytes[0] : 0;
                for (let i = 1; i < Math.min(bytes.length, 8); i++) {
                  value += bytes[i] * Math.pow(256, i);
                }
              } else {
                value = Number(eventData.value || 0);
              }

              // Try to get tournament details
              let tournamentName = `Tournament ${tournamentId}`;
              let tournamentObjectId = null;
              
              try {
                // Get active tournaments and find the one matching this tournament_id
                const activeTournaments = await tournamentService.getActiveTournaments();
                const tournament = activeTournaments.find(t => t.tournamentId === tournamentId);
                if (tournament) {
                  tournamentName = tournament.name;
                  tournamentObjectId = tournament.objectId;
                }
              } catch (error) {
                // Ignore errors getting tournament details
              }

              results.tournamentScores.push({
                type: 'tournament',
                transactionDigest: event.id.txDigest,
                tournamentId,
                tournamentName,
                tournamentObjectId,
                player: eventPlayer,
                categoryValue: value,
                timestamp: Number(eventData.timestamp || event.id.txDigest ? 0 : Date.now()),
                fullEventData: eventData,
              });
            }
          }
        }
      } catch (error) {
        BadgeLogger.warn('Error querying TournamentScoreUpdated events', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // ==========================================
      // 3. SORT AND SUMMARIZE
      // ==========================================
      
      // Sort by timestamp (newest first)
      results.regularGameScores.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      results.tournamentScores.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      results.summary.totalRegularScores = results.regularGameScores.length;
      results.summary.totalTournamentScores = results.tournamentScores.length;
      results.summary.latestRegularScore = results.regularGameScores[0] || null;
      results.summary.latestTournamentScore = results.tournamentScores[0] || null;

      BadgeLogger.info('✅ [SCORE TRACE] Score trace completed', {
        playerAddress,
        regularScores: results.summary.totalRegularScores,
        tournamentScores: results.summary.totalTournamentScores,
      });

      return {
        success: true,
        ...results,
      };
    } catch (error) {
      BadgeLogger.error('Error tracing score submissions', {
        playerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
  {
    logRequest: true,
  }
);


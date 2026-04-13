// ==========================================
// Tournament Score Submission API Route
// Admin wallet signs and pays gas fees
// Tournament games do NOT increment total_games
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../../base/backend/lib/cors';
import { withApiHandler, getRequestBody } from '../../../../../../../../base/backend/lib/api/api-handler';
import { getTournamentService } from '../../../../../../../../backend/lib/sui/tournament-service';
import { BadgeError, BadgeErrorCode } from '../../../../../../../../base/backend/lib/sui/badge-errors';
import { BadgeValidators } from '../../../../../../../../backend/lib/sui/badge-validators';
import { BadgeLogger } from '../../../../../../../../base/backend/lib/sui/badge-logger';

/**
 * POST /api/tournaments/[id]/submit-score
 * Submit tournament game score - admin wallet signs and pays gas
 * 
 * Request body:
 * {
 *   playerAddress: string,  // User's wallet address
 *   scoreData: {
 *     score: number,
 *     distance: number,
 *     coins: number,
 *     bossesDefeated: number,
 *     enemiesDefeated: number,
 *     longestCoinStreak: number
 *   }
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const tournamentObjectId = id;
    const body = await getRequestBody<{
      playerAddress: string;
      playerName?: string;  // Optional player name (for leaderboard display)
      scoreData: {
        score: number;
        distance: number;
        coins: number;
        bossesDefeated: number;
        enemiesDefeated: number;
        longestCoinStreak: number;
      };
    }>(request);
    const { playerAddress, playerName = '', scoreData } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!tournamentObjectId) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Tournament ID is required'
      );
    }

    if (!scoreData) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'scoreData is required'
      );
    }

    // Validate player address format
    BadgeValidators.validateAddress(playerAddress);

    // Validate score data structure
    const requiredFields: Array<keyof typeof scoreData> = ['score', 'distance', 'coins', 'bossesDefeated', 'enemiesDefeated', 'longestCoinStreak'];
    for (const field of requiredFields) {
      if (scoreData[field] === undefined || scoreData[field] === null) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          `Missing required field: ${field}`
        );
      }
      
      // Validate numeric types
      if (typeof scoreData[field] !== 'number' || isNaN(scoreData[field])) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          `Invalid ${field}: must be a number`
        );
      }
      
      // Validate non-negative
      if (scoreData[field] < 0) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          `Invalid ${field}: must be non-negative`
        );
      }
    }

    BadgeLogger.info('🏆 [TOURNAMENT SCORE API] Tournament score submission request received', {
      tournamentObjectId,
      playerAddress,
      playerName: playerName || '(not provided)',
      score: scoreData.score,
      distance: scoreData.distance,
      coins: scoreData.coins,
      bossesDefeated: scoreData.bossesDefeated,
      enemiesDefeated: scoreData.enemiesDefeated,
      longestCoinStreak: scoreData.longestCoinStreak,
      fullScoreData: scoreData,
    });

    // Get tournament service
    const tournamentService = getTournamentService();

    // Get tournament details to validate and extract category
    const tournamentResult = await tournamentService.getTournament(tournamentObjectId);
    
    if (!tournamentResult.success || !tournamentResult.tournament) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        tournamentResult.error || 'Tournament not found'
      );
    }

    const tournament = tournamentResult.tournament;

    // Debug: Log the tournament name being read
    BadgeLogger.info('🏆 [TOURNAMENT SCORE API] Tournament name from blockchain', {
      tournamentObjectId,
      tournamentId: tournament.tournamentId,
      tournamentName: tournament.name,
      nameLength: tournament.name.length,
    });

    // Validate tournament is active or within grace period (1 hour)
    const now = Date.now();
    const gracePeriodEnd = tournament.endTime + (60 * 60 * 1000); // 1 hour in milliseconds
    
    if (now > gracePeriodEnd) {
      // Grace period has ended - trigger automatic reward distribution if needed
      // This happens when the first score submission attempt occurs after grace period ends
      if (!tournament.rewardsDistributed) {
        BadgeLogger.info('🎁 [TOURNAMENT SCORE API] Grace period ended, triggering automatic reward distribution', {
          tournamentId: tournament.tournamentId,
          tournamentName: tournament.name,
          endTime: tournament.endTime,
          gracePeriodEnd,
          currentTime: now,
        });

        // Trigger reward distribution asynchronously (don't block the error response)
        // Use Promise.resolve().then() to run in background without blocking
        Promise.resolve().then(async () => {
          try {
            // Re-check tournament status to avoid race conditions
            const recheckResult = await tournamentService.getTournament(tournamentObjectId);
            if (!recheckResult.success || !recheckResult.tournament) {
              BadgeLogger.warn('🎁 [TOURNAMENT SCORE API] Failed to re-check tournament for distribution', {
                tournamentId: tournament.tournamentId,
                error: recheckResult.error,
              });
              return;
            }

            const recheckTournament = recheckResult.tournament;
            
            // Double-check rewards haven't been distributed (prevent duplicates)
            if (recheckTournament.rewardsDistributed) {
              BadgeLogger.info('🎁 [TOURNAMENT SCORE API] Rewards already distributed, skipping', {
                tournamentId: tournament.tournamentId,
              });
              return;
            }

            const { getRewardsService } = await import('../../../../../../../../backend/lib/sui/rewards-service');
            const rewardsService = getRewardsService();

            // Get leaderboard (top 10)
            const leaderboardResult = await tournamentService.getTournamentLeaderboard(
              tournamentObjectId,
              10
            );

            if (leaderboardResult.success && leaderboardResult.leaderboard && leaderboardResult.leaderboard.length > 0) {
              // Calculate rewards
              const distributions = await rewardsService.calculateTournamentRewards(
                recheckTournament.prizePoolUSDCents,
                leaderboardResult.leaderboard.map((entry, index) => ({
                  rank: index + 1,
                  playerAddress: entry.playerAddress,
                  playerName: entry.playerName,
                  value: entry.value,
                }))
              );

              // Distribute rewards
              const distributionResult = await rewardsService.distributeTournamentRewards(
                recheckTournament.tournamentId,
                distributions
              );

              if (distributionResult.success) {
                BadgeLogger.info('🎁 [TOURNAMENT SCORE API] Automatic reward distribution completed', {
                  tournamentId: recheckTournament.tournamentId,
                  distributionCount: distributions.length,
                  digest: distributionResult.digest,
                });

                // CRITICAL: Update distribution status on contract to prevent duplicate distributions
                try {
                  const { getConfig } = await import('../../../../../../../../base/backend/config/config');
                  const { getAdminWalletService } = await import('../../../../../../../../backend/lib/sui/admin-wallet-service');
                  const { executeTransactionWithFinalization } = await import('../../../../../../../../backend/lib/sui/transaction-helpers');
                  
                  const config = getConfig();
                  const packageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;
                  const adminCapId = config.contracts.tournamentAdminCap;
                  
                  if (!packageId || !adminCapId || !tournamentObjectId) {
                    BadgeLogger.error('🎁 [TOURNAMENT SCORE API] Cannot update distribution status - missing config', {
                      tournamentId: recheckTournament.tournamentId,
                      hasPackageId: !!packageId,
                      hasAdminCap: !!adminCapId,
                      hasObjectId: !!tournamentObjectId,
                    });
                    throw new Error('Missing required configuration for status update');
                  }

                  const { Transaction } = await import('@mysten/sui/transactions');
                  const adminWallet = getAdminWalletService();
                  const client = config.sui.network === 'testnet'
                    ? adminWallet.getTestnetClient()
                    : adminWallet.getMainnetClient();
                  
                  const txb = new Transaction();
                  txb.setSender(adminWallet.getAddress());
                  
                  // Set distribution status to 1 (distributed)
                  txb.moveCall({
                    target: `${packageId}::tournaments::admin_set_distribution_status`,
                    arguments: [
                      txb.object(tournamentObjectId),
                      txb.object(adminCapId),
                      txb.pure.u8(1), // 1 = distributed
                    ],
                  });
                  
                  txb.setGasBudget(config.sui.gasBudget || 10_000_000);
                  
                  const statusResult = await executeTransactionWithFinalization(
                    client,
                    adminWallet.getKeypair(),
                    txb,
                    {
                      logger: {
                        info: (msg, data) => BadgeLogger.info(`🎁 [TOURNAMENT SCORE API] ${msg}`, data),
                        warn: (msg, data) => BadgeLogger.warn(`🎁 [TOURNAMENT SCORE API] ${msg}`, data),
                        error: (msg, data) => BadgeLogger.error(`🎁 [TOURNAMENT SCORE API] ${msg}`, data),
                      },
                    }
                  );
                  
                  // Verify the transaction actually succeeded
                  if (statusResult.effects?.status?.status === 'success') {
                    BadgeLogger.info('🎁 [TOURNAMENT SCORE API] Distribution status updated on contract successfully', {
                      tournamentId: recheckTournament.tournamentId,
                      status: 1,
                      digest: statusResult.digest,
                    });

                    // Move tournament to past table after successful reward distribution
                    try {
                      const { getTournamentService } = await import('../../../../../../../../backend/lib/sui/tournament-service');
                      const tournamentService = getTournamentService();
                      const moveResult = await tournamentService.moveTournamentToPast(recheckTournament.tournamentId);
                      if (moveResult.success) {
                        BadgeLogger.info('🎁 [TOURNAMENT SCORE API] Tournament moved to past table', {
                          tournamentId: recheckTournament.tournamentId,
                        });
                      } else {
                        // Non-critical - log but don't fail
                        BadgeLogger.warn('🎁 [TOURNAMENT SCORE API] Failed to move tournament to past (non-critical)', {
                          tournamentId: recheckTournament.tournamentId,
                          error: moveResult.error,
                        });
                      }
                    } catch (moveError) {
                      // Non-critical - log but don't fail
                      BadgeLogger.warn('🎁 [TOURNAMENT SCORE API] Error moving tournament to past (non-critical)', {
                        tournamentId: recheckTournament.tournamentId,
                        error: moveError instanceof Error ? moveError.message : 'Unknown error',
                      });
                    }
                  } else {
                    const errorMsg = statusResult.effects?.status?.error || 'Transaction did not succeed';
                    BadgeLogger.error('🎁 [TOURNAMENT SCORE API] Distribution status update transaction failed', {
                      tournamentId: recheckTournament.tournamentId,
                      error: errorMsg,
                      effects: statusResult.effects,
                    });
                    // Don't throw here - this is background processing, just log the error
                  }
                } catch (statusError) {
                  BadgeLogger.error('🎁 [TOURNAMENT SCORE API] CRITICAL: Failed to update distribution status - this may allow duplicate distributions', {
                    tournamentId: recheckTournament.tournamentId,
                    error: statusError instanceof Error ? statusError.message : 'Unknown error',
                    stack: statusError instanceof Error ? statusError.stack : undefined,
                  });
                  // Don't throw here - this is background processing, but log the critical error
                }
              } else {
                BadgeLogger.error('🎁 [TOURNAMENT SCORE API] Automatic reward distribution failed', {
                  tournamentId: recheckTournament.tournamentId,
                  error: distributionResult.error,
                });
              }
            } else {
              BadgeLogger.warn('🎁 [TOURNAMENT SCORE API] No leaderboard entries for automatic distribution', {
                tournamentId: recheckTournament.tournamentId,
                error: leaderboardResult.error,
              });
            }
          } catch (error) {
            BadgeLogger.error('🎁 [TOURNAMENT SCORE API] Error in automatic reward distribution', {
              tournamentId: tournament.tournamentId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }).catch((error) => {
          // Catch any unhandled errors in the promise chain
          BadgeLogger.error('🎁 [TOURNAMENT SCORE API] Unhandled error in reward distribution promise', {
            tournamentId: tournament.tournamentId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });
      }

      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Tournament has ended and grace period has expired. Score submission is no longer available.'
      );
    }

    // Validate player is a participant in THIS SPECIFIC tournament
    // This is crucial when multiple tournaments are active simultaneously
    // Use isPlayerParticipant for more accurate check (checks TournamentEntered events)
    BadgeLogger.info('🏆 [TOURNAMENT SCORE API] Verifying player participation in specific tournament', {
      tournamentObjectId,
      tournamentId: tournament.tournamentId,
      tournamentName: tournament.name,
      playerAddress,
    });
    
    const participationCheck = await tournamentService.isPlayerParticipant(tournamentObjectId, playerAddress);
    
    if (!participationCheck.success) {
      BadgeLogger.error('🏆 [TOURNAMENT SCORE API] Failed to verify tournament participation', {
        tournamentObjectId,
        tournamentId: tournament.tournamentId,
        playerAddress,
        error: participationCheck.error,
      });
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        participationCheck.error || 'Failed to verify tournament participation'
      );
    }

    if (!participationCheck.isParticipant) {
      const enteredTournaments = participationCheck.enteredTournamentIds || [];
      BadgeLogger.error('🏆 [TOURNAMENT SCORE API] Player is not a participant in this tournament', {
        tournamentObjectId,
        tournamentId: tournament.tournamentId,
        tournamentName: tournament.name,
        playerAddress,
        enteredTournamentIds: enteredTournaments,
        message: `Player has entered tournaments: [${enteredTournaments.join(', ')}], but trying to submit to tournament ${tournament.tournamentId}`,
      });
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `Player is not a participant in tournament "${tournament.name}" (ID: ${tournament.tournamentId}). ` +
        `Player has entered tournaments: [${enteredTournaments.join(', ')}]. ` +
        `Please enter this tournament first by consuming a tournament ticket.`
      );
    }

    BadgeLogger.info('✅ [TOURNAMENT SCORE API] Player verified as participant in correct tournament', {
      tournamentObjectId,
      tournamentId: tournament.tournamentId,
      tournamentName: tournament.name,
      playerAddress,
      enteredTournamentIds: participationCheck.enteredTournamentIds,
    });

    // Player is a participant - get their current rank (if they've submitted a score)
    const playerRankResult = await tournamentService.getPlayerRank(tournamentObjectId, playerAddress);
    if (!playerRankResult.success) {
      BadgeLogger.warn('Failed to get player rank, but player is a participant', {
        tournamentObjectId,
        playerAddress,
        error: playerRankResult.error,
      });
      // Continue anyway - player is a participant, rank check is just for logging
    }

    // Extract category value from scoreData
    const categoryValueMap: Record<typeof tournament.category, keyof typeof scoreData> = {
      'totalCoins': 'coins',
      'longestStreak': 'longestCoinStreak',
      'highestScore': 'score',
      'longestDistance': 'distance',
      'mostBosses': 'bossesDefeated',
      'mostEnemies': 'enemiesDefeated',
    };

    const categoryValue = scoreData[categoryValueMap[tournament.category]];

    // Update tournament score (admin wallet executes transaction)
    BadgeLogger.info('🏆 [TOURNAMENT SCORE API] Calling updateTournamentScore', {
      tournamentObjectId,
      playerAddress,
      playerName: playerName || '(not provided)',
      category: tournament.category,
      categoryValue,
      scoreData,
    });
    
    const result = await tournamentService.updateTournamentScore(
      tournamentObjectId,
      playerAddress,
      playerName || '',  // Pass player name (empty string if not provided)
      tournament.category,
      categoryValue,
      scoreData
    );

    if (!result.success) {
      BadgeLogger.error('🏆 [TOURNAMENT SCORE API] updateTournamentScore failed', {
        tournamentObjectId,
        playerAddress,
        error: result.error,
      });
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        result.error || 'Tournament score submission failed'
      );
    }
    
    BadgeLogger.info('🏆 [TOURNAMENT SCORE API] updateTournamentScore succeeded', {
      tournamentObjectId,
      playerAddress,
      transactionDigest: result.digest,
      category: tournament.category,
      categoryValue,
    });

    // Note: Tournament games do NOT trigger badge operations
    // Tournament games do NOT increment total_games

    return {
      success: true,
      digest: result.digest,
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


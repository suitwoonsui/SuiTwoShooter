// ==========================================
// Creator Reward Service
// Handles calculation and distribution of creator rewards
// ==========================================

import { getTournamentService, Tournament } from '../sui/tournament-service';
import { BadgeLogger } from '../sui/badge-logger';
import { priceConverter } from './price-converter';
import { getAdminWalletService } from '../sui/admin-wallet-service';
import { getConfig } from '../../config/config';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Constants
 */
const CREATION_FEE_USD_CENTS = 500;  // $5.00 creation fee
const BOOST_PERCENTAGE = 0.50;       // 50% until creation fee covered
const STANDARD_PERCENTAGE = 0.20;    // 20% after creation fee covered

/**
 * Creator reward calculation result
 */
export interface CreatorRewardCalculation {
  totalEntryFeesUSDCents: number;
  creationFeeUSDCents: number;
  creatorRewardUSDCents: number;
  creatorRewardUSD: number;
  isBoostPhase: boolean;  // true if still in boost phase (50%), false if standard (20%)
  breakEvenEntries: number; // Number of entries needed to break even (typically 10)
}

/**
 * CreatorRewardService - Handles creator reward calculations and queries
 */
export class CreatorRewardService {
  /**
   * Calculate creator reward using boost system
   * 50% until creation fee ($5.00) is covered, then 20% of remaining
   * 
   * This matches the contract's calculate_creator_reward function
   * 
   * @param totalEntryFeesUSDCents - Total entry fees in USD cents (prize pool - starting ante)
   * @param creationFeeUSDCents - Creation fee paid (typically $5.00 = 500 cents)
   * @returns Creator reward calculation
   */
  static calculateCreatorReward(
    totalEntryFeesUSDCents: number,
    creationFeeUSDCents: number = CREATION_FEE_USD_CENTS
  ): CreatorRewardCalculation {
    // Calculate boost reward (50% of entry fees)
    const boostReward = Math.round(totalEntryFeesUSDCents * BOOST_PERCENTAGE);
    
    let creatorRewardUSDCents: number;
    let isBoostPhase: boolean;
    
    if (boostReward <= creationFeeUSDCents) {
      // Still in boost phase (50% until $5.00 earned)
      creatorRewardUSDCents = boostReward;
      isBoostPhase = true;
    } else {
      // Boost phase complete, now 20% of remaining
      const boostThreshold = Math.round(creationFeeUSDCents / BOOST_PERCENTAGE); // $10.00
      const remainingFees = totalEntryFeesUSDCents - boostThreshold;
      const remainingReward = Math.round(remainingFees * STANDARD_PERCENTAGE);
      creatorRewardUSDCents = creationFeeUSDCents + remainingReward;
      isBoostPhase = false;
    }
    
    // Calculate break-even point (entries needed to cover creation fee)
    // At 50% reward, need: creationFee / 0.50 = 2 × creationFee in entry fees
    // If entry fee is $1.00 (100 cents), need: (2 × creationFee) / 100 entries
    const breakEvenEntryFees = Math.round(creationFeeUSDCents / BOOST_PERCENTAGE);
    const breakEvenEntries = Math.ceil(breakEvenEntryFees / 100); // Assuming $1.00 per entry
    
    return {
      totalEntryFeesUSDCents,
      creationFeeUSDCents,
      creatorRewardUSDCents,
      creatorRewardUSD: creatorRewardUSDCents / 100,
      isBoostPhase,
      breakEvenEntries,
    };
  }

  /**
   * Calculate creator reward for a tournament
   * Reads tournament data and calculates reward
   * 
   * @param tournament - Tournament object
   * @returns Creator reward calculation (or null if not user-created)
   */
  static calculateCreatorRewardForTournament(
    tournament: Tournament
  ): CreatorRewardCalculation | null {
    // Only calculate for user-created tournaments
    if (!tournament.createdBy || !tournament.creationFeePaid || tournament.creationFeePaid === 0) {
      return null; // Admin-created tournament, no creator reward
    }

    // Calculate total entry fees (prize pool - starting ante)
    const startingAnteUSDCents = tournament.startingAnteUSDCents || 0;
    const totalEntryFeesUSDCents = tournament.prizePoolUSDCents - startingAnteUSDCents;

    // If no entry fees yet, return zero reward
    if (totalEntryFeesUSDCents <= 0) {
      return {
        totalEntryFeesUSDCents: 0,
        creationFeeUSDCents: tournament.creationFeePaid,
        creatorRewardUSDCents: 0,
        creatorRewardUSD: 0,
        isBoostPhase: true,
        breakEvenEntries: 10, // Default assumption
      };
    }

    return this.calculateCreatorReward(totalEntryFeesUSDCents, tournament.creationFeePaid);
  }

  /**
   * Get creator reward status for a tournament
   * 
   * @param tournamentObjectId - Tournament object ID
   * @returns Creator reward status
   */
  static async getCreatorRewardStatus(
    tournamentObjectId: string
  ): Promise<{
    success: boolean;
    tournamentId?: number;
    createdBy?: string;
    creatorRewardUSDCents?: number;
    creatorRewardUSD?: number;
    paid?: boolean;
    calculation?: CreatorRewardCalculation;
    error?: string;
  }> {
    try {
      const tournamentService = getTournamentService();
      const tournamentResult = await tournamentService.getTournament(tournamentObjectId);

      if (!tournamentResult.success || !tournamentResult.tournament) {
        return {
          success: false,
          error: tournamentResult.error || 'Tournament not found',
        };
      }

      const tournament = tournamentResult.tournament;

      // Check if tournament has creator
      if (!tournament.createdBy || !tournament.creationFeePaid || tournament.creationFeePaid === 0) {
        return {
          success: true,
          tournamentId: tournament.tournamentId,
          createdBy: undefined,
          creatorRewardUSDCents: 0,
          creatorRewardUSD: 0,
          paid: false,
        };
      }

      // Calculate current creator reward
      const calculation = this.calculateCreatorRewardForTournament(tournament);

      return {
        success: true,
        tournamentId: tournament.tournamentId,
        createdBy: tournament.createdBy,
        creatorRewardUSDCents: tournament.creatorRewardUSDCents || calculation?.creatorRewardUSDCents || 0,
        creatorRewardUSD: (tournament.creatorRewardUSDCents || calculation?.creatorRewardUSDCents || 0) / 100,
        paid: tournament.creatorRewardPaid || false,
        calculation: calculation || undefined,
      };
    } catch (error) {
      BadgeLogger.error('Error getting creator reward status', {
        tournamentObjectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all tournaments created by a user
   * 
   * @param creatorAddress - Creator's wallet address
   * @returns List of tournaments created by user
   */
  static async getTournamentsByCreator(
    creatorAddress: string
  ): Promise<{
    success: boolean;
    tournaments?: Array<{
      tournamentId: number;
      name: string;
      objectId: string;
      status: 'upcoming' | 'active' | 'ended';
      prizePoolUSDCents: number;
      participants: number;
      creatorRewardUSDCents: number;
      creatorRewardUSD: number;
      paid: boolean;
      endedAt?: number;
      calculation?: CreatorRewardCalculation;
    }>;
    totalRewardsUSDCents?: number;
    totalRewardsUSD?: number;
    error?: string;
  }> {
    try {
      const tournamentService = getTournamentService();
      
      // Get all tournaments (active and past)
      const [activeTournaments, pastTournaments] = await Promise.all([
        tournamentService.getActiveTournaments(),
        tournamentService.getPastTournaments(100), // Get last 100 past tournaments
      ]);

      // Filter for tournaments created by this user
      const allTournaments = [...activeTournaments, ...pastTournaments];
      const creatorTournaments = allTournaments.filter(
        t => t.createdBy?.toLowerCase() === creatorAddress.toLowerCase()
      );

      // Enrich with creator reward data
      const enrichedTournaments = await Promise.all(
        creatorTournaments.map(async (tournament) => {
          const calculation = this.calculateCreatorRewardForTournament(tournament);
          
          return {
            tournamentId: tournament.tournamentId,
            name: tournament.name,
            objectId: tournament.objectId,
            status: tournament.status,
            prizePoolUSDCents: tournament.prizePoolUSDCents,
            participants: tournament.participants,
            creatorRewardUSDCents: tournament.creatorRewardUSDCents || calculation?.creatorRewardUSDCents || 0,
            creatorRewardUSD: (tournament.creatorRewardUSDCents || calculation?.creatorRewardUSDCents || 0) / 100,
            paid: tournament.creatorRewardPaid || false,
            endedAt: tournament.status === 'ended' ? tournament.endTime : undefined,
            calculation: calculation || undefined,
          };
        })
      );

      // Calculate total rewards
      const totalRewardsUSDCents = enrichedTournaments.reduce(
        (sum, t) => sum + t.creatorRewardUSDCents,
        0
      );

      return {
        success: true,
        tournaments: enrichedTournaments,
        totalRewardsUSDCents,
        totalRewardsUSD: totalRewardsUSDCents / 100,
      };
    } catch (error) {
      BadgeLogger.error('Error getting tournaments by creator', {
        creatorAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Distribute creator reward to tournament creator
   * Mints MEWS tokens and transfers to creator address
   * 
   * @param tournamentObjectId - Tournament object ID
   * @returns Distribution result with transaction digest
   */
  static async distributeCreatorReward(
    tournamentObjectId: string
  ): Promise<{
    success: boolean;
    tournamentId?: number;
    creatorAddress?: string;
    creatorRewardUSDCents?: number;
    creatorRewardUSD?: number;
    mewsAmount?: string;
    transactionDigest?: string;
    error?: string;
  }> {
    try {
      const tournamentService = getTournamentService();
      const tournamentResult = await tournamentService.getTournament(tournamentObjectId);

      if (!tournamentResult.success || !tournamentResult.tournament) {
        return {
          success: false,
          error: tournamentResult.error || 'Tournament not found',
        };
      }

      const tournament = tournamentResult.tournament;

      // Check if tournament has creator
      if (!tournament.createdBy || !tournament.creationFeePaid || tournament.creationFeePaid === 0) {
        return {
          success: false,
          error: 'Tournament was not created by a user (no creator reward)',
        };
      }

      // Check if creator reward has already been paid
      if (tournament.creatorRewardPaid) {
        return {
          success: false,
          error: 'Creator reward has already been paid',
        };
      }

      // Check if tournament has ended
      const now = Date.now();
      if (now <= tournament.endTime) {
        return {
          success: false,
          error: 'Tournament has not ended yet',
        };
      }

      // Get creator reward amount (from contract or calculate)
      let creatorRewardUSDCents = tournament.creatorRewardUSDCents || 0;
      
      // If not set in contract, calculate it
      if (creatorRewardUSDCents === 0) {
        const calculation = this.calculateCreatorRewardForTournament(tournament);
        if (!calculation) {
          return {
            success: false,
            error: 'Failed to calculate creator reward',
          };
        }
        creatorRewardUSDCents = calculation.creatorRewardUSDCents;
      }

      // If no reward, return success (nothing to pay)
      if (creatorRewardUSDCents === 0) {
        BadgeLogger.info('🏆 [CREATOR REWARD] No creator reward to distribute', {
          tournamentId: tournament.tournamentId,
          creatorAddress: tournament.createdBy,
        });
        return {
          success: true,
          tournamentId: tournament.tournamentId,
          creatorAddress: tournament.createdBy,
          creatorRewardUSDCents: 0,
          creatorRewardUSD: 0,
          mewsAmount: '0',
        };
      }

      const creatorRewardUSD = creatorRewardUSDCents / 100;

      BadgeLogger.info('🏆 [CREATOR REWARD] Distributing creator reward', {
        tournamentId: tournament.tournamentId,
        creatorAddress: tournament.createdBy,
        creatorRewardUSDCents,
        creatorRewardUSD,
      });

      // Convert USD to MEWS tokens
      const tokenConversion = await priceConverter.convertUSDToToken(creatorRewardUSD, 'MEWS');
      
      if (!tokenConversion.success || !tokenConversion.tokenAmount) {
        BadgeLogger.error('🏆 [CREATOR REWARD] Failed to convert USD to MEWS', {
          tournamentId: tournament.tournamentId,
          creatorRewardUSD,
          error: tokenConversion.error,
        });
        return {
          success: false,
          error: tokenConversion.error || 'Failed to convert USD to MEWS tokens',
        };
      }

      const mewsAmount = tokenConversion.tokenAmount;

      // Transfer MEWS tokens to creator from admin wallet
      const transferResult = await this.transferMewsTokens(tournament.createdBy, mewsAmount);

      if (!transferResult.success || !transferResult.digest) {
        BadgeLogger.error('🏆 [CREATOR REWARD] Failed to transfer MEWS tokens', {
          tournamentId: tournament.tournamentId,
          creatorAddress: tournament.createdBy,
          mewsAmount,
          error: transferResult.error,
        });
        return {
          success: false,
          error: transferResult.error || 'Failed to transfer MEWS tokens',
        };
      }

      BadgeLogger.info('🏆 [CREATOR REWARD] Creator reward distributed successfully', {
        tournamentId: tournament.tournamentId,
        creatorAddress: tournament.createdBy,
        creatorRewardUSDCents,
        creatorRewardUSD,
        mewsAmount,
        transactionDigest: transferResult.digest,
      });

      // TODO: Mark creator reward as paid in contract (need contract function)
      // For now, we'll track it off-chain or add a contract function later

      return {
        success: true,
        tournamentId: tournament.tournamentId,
        creatorAddress: tournament.createdBy,
        creatorRewardUSDCents,
        creatorRewardUSD,
        mewsAmount,
        transactionDigest: transferResult.digest,
      };
    } catch (error) {
      BadgeLogger.error('🏆 [CREATOR REWARD] Error distributing creator reward', {
        tournamentObjectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Transfer MEWS tokens from admin wallet to a recipient address
   * 
   * @param recipientAddress - Address to receive tokens
   * @param amountRaw - Token amount in raw units (with decimals, as string)
   * @returns Transfer result with transaction digest
   */
  private static async transferMewsTokens(
    recipientAddress: string,
    amountRaw: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      const config = getConfig();
      const mewsTokenTypeId = config.token.mewsTokenTypeId;

      if (!mewsTokenTypeId) {
        return {
          success: false,
          error: 'MEWS token type ID not configured',
        };
      }

      const adminWallet = getAdminWalletService();
      const client = config.sui.network === 'testnet'
        ? adminWallet.getTestnetClient()
        : adminWallet.getMainnetClient();

      // Get admin's MEWS coins
      const coins = await client.getCoins({
        owner: adminWallet.getAddress(),
        coinType: mewsTokenTypeId,
      });

      if (!coins.data || coins.data.length === 0) {
        return {
          success: false,
          error: 'No MEWS tokens found in admin wallet',
        };
      }

      const amountBigInt = BigInt(amountRaw);

      // Check total balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      if (totalBalance < amountBigInt) {
        return {
          success: false,
          error: `Insufficient MEWS balance: need ${amountBigInt}, have ${totalBalance}`,
        };
      }

      const txb = new Transaction();

      // Add coin objects and merge if needed
      const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
      let sourceCoin = coinObjects[0];
      if (coinObjects.length > 1) {
        txb.mergeCoins(sourceCoin, coinObjects.slice(1));
      }

      // Split and transfer
      const splitCoin = txb.splitCoins(sourceCoin, [amountBigInt]);
      txb.transferObjects([splitCoin], recipientAddress);

      txb.setSender(adminWallet.getAddress());
      txb.setGasBudget(config.sui.gasBudget);

      const transactionBytes = await txb.build({ client });

      const result = await client.signAndExecuteTransaction({
        signer: adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const errorMessage = result.effects?.status?.error || 'Unknown transaction error';
        BadgeLogger.error('🏆 [CREATOR REWARD] Token transfer transaction failed', {
          recipientAddress,
          amountRaw,
          error: errorMessage,
        });
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      BadgeLogger.error('🏆 [CREATOR REWARD] Error transferring MEWS tokens', {
        recipientAddress,
        amountRaw,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export convenience functions
export function calculateCreatorReward(
  totalEntryFeesUSDCents: number,
  creationFeeUSDCents?: number
): CreatorRewardCalculation {
  return CreatorRewardService.calculateCreatorReward(totalEntryFeesUSDCents, creationFeeUSDCents);
}

export function calculateCreatorRewardForTournament(
  tournament: Tournament
): CreatorRewardCalculation | null {
  return CreatorRewardService.calculateCreatorRewardForTournament(tournament);
}

export async function getCreatorRewardStatus(tournamentObjectId: string) {
  return CreatorRewardService.getCreatorRewardStatus(tournamentObjectId);
}

export async function getTournamentsByCreator(creatorAddress: string) {
  return CreatorRewardService.getTournamentsByCreator(creatorAddress);
}

export async function distributeCreatorReward(tournamentObjectId: string) {
  return CreatorRewardService.distributeCreatorReward(tournamentObjectId);
}


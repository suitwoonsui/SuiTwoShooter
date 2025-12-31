// ==========================================
// Admin Tournament Creation API Route
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getTournamentService } from '@/lib/sui/tournament-service';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { TournamentRewardConfig } from '@/lib/services/reward-cost-calculator';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      name: string;
      category: 'totalCoins' | 'longestStreak' | 'highestScore' | 'longestDistance' | 'mostBosses' | 'mostEnemies';
      startTime: number;  // Unix timestamp (milliseconds)
      endTime: number;    // Unix timestamp (milliseconds)
      entryFeeTickets: number;   // Number of tournament tickets required (typically 1)
      adminWalletAddress: string;  // For verification
      startingAnteUSDCents?: number;  // Optional starting ante in USD cents (default: 0)
      startingAnteToken?: 'SUI' | 'MEWS' | 'USDC';  // Optional token type for starting ante (for reference)
      rewardConfig?: TournamentRewardConfig | null;  // Optional custom reward configuration
    }>(request);

    const { name, category, startTime, endTime, entryFeeTickets, adminWalletAddress, startingAnteUSDCents, startingAnteToken, rewardConfig } = body;
    
    // Debug: Log the received name
    console.log('API received tournament name:', name);

    // Verify admin wallet address matches
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      throw new BadgeError(
        BadgeErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed. Please connect the correct admin wallet.'
      );
    }

    // Validate required fields
    if (!name || name.trim() === '') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Tournament name is required'
      );
    }

    if (!category || !['totalCoins', 'longestStreak', 'highestScore', 'longestDistance', 'mostBosses', 'mostEnemies'].includes(category)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Valid tournament category is required'
      );
    }

    if (!startTime || startTime <= 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Start time is required and must be a valid timestamp'
      );
    }

    if (!endTime || endTime <= startTime) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'End time is required and must be after start time'
      );
    }

    if (entryFeeTickets === undefined || entryFeeTickets < 1) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Entry fee tickets must be at least 1'
      );
    }

    // Validate optional fields
    if (startingAnteUSDCents !== undefined && startingAnteUSDCents < 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Starting ante must be non-negative'
      );
    }

    // Create tournament
    const tournamentService = getTournamentService();
    const result = await tournamentService.createTournament({
      name: name.trim(),
      category,
      startTime,
      endTime,
      entryFeeTickets,
      startingAnteUSDCents: startingAnteUSDCents ?? 0,
      rewardToken: startingAnteToken || 'MEWS', // Use starting ante token as reward token
      rewardConfig: rewardConfig ?? null,
    });

    if (!result.success) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        result.error || 'Failed to create tournament'
      );
    }

    return {
      success: true,
      tournament: result.tournament,
      message: 'Tournament created successfully',
    };
  }
);


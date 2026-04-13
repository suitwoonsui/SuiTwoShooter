// ==========================================
// Admin Tournament Creation API Route
// Admin-created tournaments only: admin pays gas/vault/tournament fees and optional ante; admin signs vault create (Glacier). User-created tournaments (user pays) use a separate flow and are not handled here.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { TournamentRewardConfig } from '@/lib/services/tournament/cost/reward-cost-calculator';

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
      adminWalletAddress?: string;  // Optional - kept for backward compatibility, but verification now happens in platform backend
      /** Value per ticket in USD cents. Required by platform; default 100. */
      ticketValueUSDCents?: number;
      /** Competition type (e.g. 'all-vs-all'). Required by platform; default 'all-vs-all'. */
      competitionType?: string;
      /** 'individual' or 'team'. Required by platform; default 'individual'. */
      participationMode?: 'individual' | 'team';
      startingAnteUSDCents?: number;  // Optional starting ante in USD cents (default: 0)
      startingAnteToken?: 'SUI' | 'MEWS' | 'USDC';  // Optional token type for starting ante (for reference)
      /** Optional: raw token amount to deposit into pool vault at create (e.g. MIST for SUI). When set, vault is funded. */
      startingAnteAmountRaw?: string;
      rewardConfig?: TournamentRewardConfig | null;  // Optional custom reward configuration
      ecosystemId?: string;
    }>(request);

    const { name, category, startTime, endTime, entryFeeTickets, adminWalletAddress, ticketValueUSDCents, competitionType, participationMode, startingAnteUSDCents, startingAnteToken, startingAnteAmountRaw, rewardConfig } = body;
    
    // Debug: Log the received name
    console.log('API received tournament name:', name);

    // Note: Admin wallet verification is now handled by platform backend via API key authentication
    // The adminWalletAddress parameter is kept for backward compatibility but is not verified here

    // Validate required fields
    if (!name || name.trim() === '') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Tournament name is required'
      );
    }

    if (!category || !['totalCoins', 'longestStreak', 'highestScore', 'longestDistance', 'mostBosses', 'mostEnemies'].includes(category)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Valid tournament category is required'
      );
    }

    if (!startTime || startTime <= 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Start time is required and must be a valid timestamp'
      );
    }

    if (!endTime || endTime <= startTime) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'End time is required and must be after start time'
      );
    }

    if (entryFeeTickets === undefined || entryFeeTickets < 1) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Entry fee tickets must be at least 1'
      );
    }

    // Validate optional fields
    if (startingAnteUSDCents !== undefined && startingAnteUSDCents < 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Starting ante must be non-negative'
      );
    }

    // Create tournament (admin-created flow; identity from corridor cap).
    const tournamentService = getTournamentService();
    const result = await tournamentService.createTournament({
      name: name.trim(),
      category,
      startTime,
      endTime,
      entryFeeTickets,
      ticketValueUSDCents: ticketValueUSDCents ?? 100,
      competitionType: competitionType?.trim() || 'all-vs-all',
      participationMode: participationMode === 'team' ? 'team' : 'individual',
      startingAnteUSDCents: startingAnteUSDCents ?? 0,
      startingAnteAmountRaw: startingAnteAmountRaw?.trim() || undefined,
      rewardToken: startingAnteToken || 'MEWS',
      rewardConfig: rewardConfig ?? null,
    });

    if (!result.success) {
      const isDefaultRewardsNotSet = result.error?.includes('Default rewards have not been set on-chain') === true;
      const isInsufficientBalance = result.error?.toLowerCase().includes('insufficient') === true;
      const code = isDefaultRewardsNotSet
        ? PlatformErrorCode.CONFIG_MISSING
        : isInsufficientBalance
          ? PlatformErrorCode.INSUFFICIENT_BALANCE
          : PlatformErrorCode.TRANSACTION_FAILED;
      const message = result.error || 'Failed to create tournament';
      console.error('[ADMIN TOURNAMENTS CREATE] Tournament create failed', {
        name: body.name,
        code,
        error: message,
      });
      throw new PlatformError(code, message);
    }

    return {
      success: true,
      tournament: result.tournament,
      message: 'Tournament created successfully',
    };
  }
);


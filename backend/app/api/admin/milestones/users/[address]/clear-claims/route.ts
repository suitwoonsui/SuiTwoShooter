// ==========================================
// Admin clear all milestone claims for a user (platform Channel anchor-revoke-claim per claim)
// ==========================================
// POST: Unclaim all claimed milestones for a user. Uses getClaimedMilestoneIds then unclaimMilestoneById for each.

import { NextRequest } from 'next/server';
import { getAchievementService } from '@/lib/services/achievements/core/achievement-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import type { ApiHandlerContext } from '@/lib/api/api-handler';

export const POST = withApiHandler(
  async (
    request: NextRequest,
    context: ApiHandlerContext<{ address: string }>
  ) => {
    const address = await getAddressParam(context.params);

    if (!address?.trim()) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'Player address is required'
      );
    }

    const adminAddress = getAdminWalletService().getAddress();
    if (!adminAddress) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Admin wallet not initialized'
      );
    }

    const achievementService = getAchievementService();
    const claimedIdsResult = await achievementService.getClaimedMilestoneIds(address.trim());

    if (!claimedIdsResult.success || !claimedIdsResult.claimedIds?.length) {
      return {
        success: true,
        message: `No claims found for ${address}.`,
        clearedCount: 0,
        totalCount: 0,
      };
    }

    const claimedIds = claimedIdsResult.claimedIds;
    let clearedCount = 0;
    const errors: string[] = [];

    for (const milestoneId of claimedIds) {
      try {
        const result = await achievementService.unclaimMilestoneById(address.trim(), milestoneId);
        if (result.success) {
          clearedCount++;
        } else {
          errors.push(`Failed to unclaim milestone ${milestoneId}: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        errors.push(`Error unclaiming milestone ${milestoneId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    achievementService.clearClaimedMilestonesCache(address.trim());

    if (errors.length > 0) {
      PlatformLogger.warn('Some claims could not be cleared', {
        address,
        clearedCount,
        totalCount: claimedIds.length,
        errors,
      });
    }

    return {
      success: true,
      message: `Cleared ${clearedCount} of ${claimedIds.length} claim(s) for ${address}.`,
      clearedCount,
      totalCount: claimedIds.length,
      ...(errors.length > 0 ? { errors } : {}),
    };
  }
);

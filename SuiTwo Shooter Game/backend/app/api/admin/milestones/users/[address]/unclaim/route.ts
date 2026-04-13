// ==========================================
// Admin unclaim single milestone (platform Channel anchor-revoke-claim)
// ==========================================
// POST: Unclaim one milestone for a user. Uses getAchievementService().unclaimMilestoneById → Channel anchor-revoke-claim.

import { NextRequest } from 'next/server';
import { getAchievementService } from '@/lib/services/achievements/core/achievement-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { withApiHandler, getRequestBody, getAddressParam } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import type { ApiHandlerContext } from '@/lib/api/api-handler';

export const POST = withApiHandler(
  async (
    request: NextRequest,
    context: ApiHandlerContext<{ address: string }>
  ) => {
    const address = await getAddressParam(context.params);
    const body = await getRequestBody<{ milestoneId: number }>(request);
    const { milestoneId } = body;

    if (!address?.trim()) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'Player address is required'
      );
    }

    if (milestoneId === undefined || milestoneId === null) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'Milestone ID is required'
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
    const result = await achievementService.unclaimMilestoneById(address.trim(), Number(milestoneId));

    if (!result.success) {
      throw new PlatformError(
        PlatformErrorCode.INTERNAL_ERROR,
        result.error || 'Failed to unclaim milestone'
      );
    }

    return {
      success: true,
      message: `Milestone ${milestoneId} unclaimed for ${address}.`,
    };
  }
);

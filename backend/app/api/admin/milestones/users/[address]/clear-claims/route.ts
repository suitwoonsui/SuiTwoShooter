import { NextRequest, NextResponse } from 'next/server';
import { getAchievementService } from '@/lib/sui/achievement-service';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// POST: Clear all claims for a user (admin-only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Player address is required' },
        { status: 400 }
      );
    }

    // Verify admin wallet is initialized
    const adminWallet = getAdminWalletService();
    const adminAddress = adminWallet.getAddress();
    if (!adminAddress) {
      return NextResponse.json(
        { success: false, error: 'Admin wallet not initialized' },
        { status: 401 }
      );
    }

    const achievementService = getAchievementService();
    
    // Get all claimed milestone IDs for this user
    const claimedIdsResult = await achievementService.getClaimedMilestoneIds(address);
    
    if (!claimedIdsResult.success || !claimedIdsResult.claimedIds || claimedIdsResult.claimedIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No claims found for ${address}.`,
        clearedCount: 0,
      });
    }

    const claimedIds = claimedIdsResult.claimedIds;
    let clearedCount = 0;
    const errors: string[] = [];

    // Unclaim each milestone ID using the new method
    for (const milestoneId of claimedIds) {
      try {
        const result = await achievementService.unclaimMilestoneById(address, milestoneId);
        if (result.success) {
          clearedCount++;
        } else {
          errors.push(`Failed to unclaim milestone ${milestoneId}: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        errors.push(`Error unclaiming milestone ${milestoneId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Clear cache
    achievementService.clearClaimedMilestonesCache(address);

    if (errors.length > 0) {
      BadgeLogger.warn('Some claims could not be cleared', {
        address,
        clearedCount,
        totalCount: claimedIds.length,
        errors,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} of ${claimedIds.length} claim(s) for ${address}.`,
      clearedCount,
      totalCount: claimedIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    BadgeLogger.error('Error in POST /api/admin/milestones/users/[address]/clear-claims', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


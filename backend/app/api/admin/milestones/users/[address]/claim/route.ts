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

// POST: Manually claim a milestone for a user (admin-only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const body = await request.json();
    const { milestoneId, category, threshold } = body;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Player address is required' },
        { status: 400 }
      );
    }

    // Verify admin wallet is initialized (it's always initialized if service exists)
    const adminWallet = getAdminWalletService();
    const adminAddress = adminWallet.getAddress();
    if (!adminAddress) {
      return NextResponse.json(
        { success: false, error: 'Admin wallet not initialized' },
        { status: 401 }
      );
    }

    const achievementService = getAchievementService();
    
    // Prefer milestoneId if provided (stable tracking)
    let result;
    if (milestoneId !== undefined && milestoneId !== null) {
      // Use milestoneId for stable tracking
      result = await achievementService.claimMilestoneById(
        address,
        Number(milestoneId)
      );
    } else if (category !== undefined && threshold !== undefined) {
      // Fallback to category/threshold for backward compatibility
      const categoryMap: Record<number, string> = {
        1: 'gamesPlayed',
        2: 'bossesPerGame',
        3: 'bossesCumulative',
        4: 'scorePerGame',
        5: 'scoreCumulative',
        6: 'distancePerGame',
        7: 'distanceCumulative',
        8: 'coinsPerGame',
        9: 'coinsCumulative',
        10: 'enemiesPerGame',
        11: 'enemiesCumulative',
        12: 'coinStreak',
      };

      const categoryName = categoryMap[Number(category)];
      if (!categoryName) {
        return NextResponse.json(
          { success: false, error: `Invalid category code: ${category}` },
          { status: 400 }
        );
      }

      result = await achievementService.claimSingleMilestone(
        address,
        categoryName,
        Number(threshold)
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Either milestoneId or category and threshold are required' },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to claim milestone' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Milestone claimed for ${address}.`,
      rewardsDistributed: result.rewardsDistributed,
      rewardsError: result.rewardsError,
    });
  } catch (error) {
    BadgeLogger.error('Error in POST /api/admin/milestones/users/[address]/claim', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


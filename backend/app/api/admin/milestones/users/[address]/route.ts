import { NextRequest, NextResponse } from 'next/server';
import { getAchievementService } from '@/lib/sui/achievement-service';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// GET: Get user milestone data (stats, claimed, eligible)
export async function GET(
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
    
    // Check for cache clear parameter
    const url = new URL(request.url);
    const clearCache = url.searchParams.get('clearCache') === 'true';
    
    if (clearCache) {
      // Clear the milestone definitions cache to force fresh fetch
      (achievementService as any).milestoneDefinitionsCache = null;
      (achievementService as any).cacheTimestamp = 0;
      BadgeLogger.info('Milestone definitions cache cleared for user data fetch');
    }
    
    const result = await achievementService.getUserMilestoneData(address);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to get user milestone data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: result.stats,
      claimed: result.claimed,
      eligible: result.eligible,
    });
  } catch (error) {
    BadgeLogger.error('Error in GET /api/admin/milestones/users/[address]', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


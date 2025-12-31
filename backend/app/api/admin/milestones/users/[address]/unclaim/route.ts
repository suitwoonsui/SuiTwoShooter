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

// POST: Unclaim a milestone for a user (admin-only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const body = await request.json();
    const { milestoneId } = body;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Player address is required' },
        { status: 400 }
      );
    }

    if (milestoneId === undefined || milestoneId === null) {
      return NextResponse.json(
        { success: false, error: 'Milestone ID is required' },
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
    const result = await achievementService.unclaimMilestoneById(address, Number(milestoneId));
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to unclaim milestone' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Milestone ${milestoneId} unclaimed for ${address}.`,
    });
  } catch (error) {
    BadgeLogger.error('Error in POST /api/admin/milestones/users/[address]/unclaim', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


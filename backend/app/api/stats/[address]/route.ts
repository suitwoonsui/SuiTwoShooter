import { NextRequest, NextResponse } from 'next/server';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * OPTIONS /api/stats/[address]
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/stats/[address]
 * Get player statistics from the blockchain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { address } = await params;

    if (!address || address === 'undefined' || address === 'null') {
      return NextResponse.json(
        { success: false, error: 'Player address is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate address format (basic check)
    if (!address.startsWith('0x') || address.length < 20) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📊 [STATS API] Fetching stats for address: ${address}`);
    
    const adminWallet = getAdminWalletService();
    const stats = await adminWallet.getPlayerStats(address);

    console.log(`📊 [STATS API] Stats result:`, {
      success: stats.success,
      hasStats: stats.hasStats,
      totalGames: stats.totalGames,
      bestScore: stats.bestScore,
      error: stats.error,
    });

    if (!stats.success) {
      return NextResponse.json(
        { success: false, error: stats.error || 'Failed to fetch player stats' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      hasStats: stats.hasStats || false,
      totalGames: stats.totalGames || 0,
      bestScore: stats.bestScore || 0,
      bestDistance: stats.bestDistance || 0,
      bestCoins: stats.bestCoins || 0,
      bestBossesDefeated: stats.bestBossesDefeated || 0,
      bestEnemiesDefeated: stats.bestEnemiesDefeated || 0,
      bestCoinStreak: stats.bestCoinStreak || 0,
      // Include other stats if needed
      totalScore: stats.totalScore || 0,
      totalDistance: stats.totalDistance || 0,
      totalCoins: stats.totalCoins || 0,
      firstGameDate: stats.firstGameDate || 0,
      lastGameDate: stats.lastGameDate || 0,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ Error fetching player stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


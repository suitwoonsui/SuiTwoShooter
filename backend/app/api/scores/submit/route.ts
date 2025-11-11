// ==========================================
// Score Submission API Route
// Admin wallet signs and pays gas fees
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * POST /api/scores/submit
 * Submit game score - admin wallet signs and pays gas
 * 
 * Request body:
 * {
 *   playerAddress: string,  // User's wallet address (from connected wallet)
 *   playerName?: string,    // Optional player name (empty string if skipped)
 *   sessionId?: string,     // Unique session ID for duplicate prevention
 *   scoreData: {
 *     score: number,
 *     distance: number,
 *     coins: number,
 *     bossesDefeated: number,
 *     enemiesDefeated: number,
 *     longestCoinStreak: number
 *   }
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    const { playerAddress, playerName, sessionId, scoreData } = body;

    // Validate required fields
    if (!playerAddress) {
      return NextResponse.json(
        { error: 'playerAddress is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!scoreData) {
      return NextResponse.json(
        { error: 'scoreData is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate player address format
    if (!playerAddress.startsWith('0x') || playerAddress.length !== 66) {
      return NextResponse.json(
        { error: 'Invalid player address format. Must be a valid Sui address (0x followed by 64 hex characters)' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate score data structure
    const requiredFields = ['score', 'distance', 'coins', 'bossesDefeated', 'enemiesDefeated', 'longestCoinStreak'];
    for (const field of requiredFields) {
      if (scoreData[field] === undefined || scoreData[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Validate numeric types
      if (typeof scoreData[field] !== 'number' || isNaN(scoreData[field])) {
        return NextResponse.json(
          { error: `Invalid ${field}: must be a number` },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Validate non-negative
      if (scoreData[field] < 0) {
        return NextResponse.json(
          { error: `Invalid ${field}: must be non-negative` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    console.log(`📥 Score submission request received:`);
    console.log(`   Player: ${playerAddress}`);
    console.log(`   Score: ${scoreData.score}`);
    console.log(`   Distance: ${scoreData.distance}`);

    // Get admin wallet service
    const adminWallet = getAdminWalletService();

    // Admin wallet submits score on behalf of player
    const result = await adminWallet.submitScoreForPlayer(
      playerAddress,
      scoreData,
      playerName || '',  // Player name (empty if skipped)
      sessionId || null  // Session ID (null if not provided)
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        digest: result.digest,
        playerAddress,
        gasPaidBy: 'admin_wallet',
        message: 'Score submitted successfully. Admin wallet paid gas fees.'
      }, { headers: corsHeaders });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Score submission failed' 
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('❌ Error in score submission endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


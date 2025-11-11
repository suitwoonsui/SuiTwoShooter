// ==========================================
// Verify Score Submission on Blockchain
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/scores/verify/[digest]
 * Verify a score submission transaction on the blockchain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ digest: string }> }
) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const { digest } = await params;

    if (!digest) {
      return NextResponse.json(
        { error: 'Transaction digest is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Sui client for testnet
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });

    // Get transaction details
    const tx = await client.getTransactionBlock({
      digest,
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
        showObjectChanges: true,
      },
    });

    // Extract GameSession object and ScoreSubmitted event
    const gameSession = tx.objectChanges?.find(
      (change: any) => change.type === 'created' && change.objectType?.includes('GameSession')
    );

    const scoreEvent = tx.events?.find(
      (event: any) => event.type?.includes('ScoreSubmitted')
    );

    if (!gameSession && !scoreEvent) {
      return NextResponse.json(
        { 
          error: 'No game session data found in transaction',
          transaction: tx
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Parse event data if available
    let eventData = null;
    if (scoreEvent && scoreEvent.parsedJson) {
      eventData = scoreEvent.parsedJson;
    }

    // Helper function to decode byte arrays (vector<u8> from Move)
    const decodeBytes = (bytes: any): string => {
      if (!bytes) return '';
      if (typeof bytes === 'string') return bytes;
      if (Array.isArray(bytes)) {
        // Convert array of numbers to Uint8Array and decode
        const uint8Array = new Uint8Array(bytes);
        return new TextDecoder().decode(uint8Array);
      }
      return '';
    };

    return NextResponse.json({
      success: true,
      transaction: {
        digest,
        status: tx.effects?.status?.status,
        timestamp: tx.timestampMs,
      },
      gameSession: gameSession ? {
        objectId: gameSession.objectId,
        objectType: gameSession.objectType,
      } : null,
      event: eventData ? {
        player: eventData.player,
        score: eventData.score,
        distance: eventData.distance,
        coins: eventData.coins,
        bossesDefeated: eventData.bosses_defeated,
        enemiesDefeated: eventData.enemies_defeated,
        longestCoinStreak: eventData.longest_coin_streak,
        playerName: decodeBytes(eventData.player_name), // Decoded from bytes
        sessionId: decodeBytes(eventData.session_id),   // Decoded from bytes
        timestamp: eventData.timestamp,
        // Also include raw bytes for reference
        raw: {
          player_name_bytes: eventData.player_name,
          session_id_bytes: eventData.session_id,
        },
      } : null,
      explorerUrl: `https://suiexplorer.com/txblock/${digest}?network=testnet`,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Error verifying transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


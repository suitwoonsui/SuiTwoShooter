// ==========================================
// Verify Score Submission on Blockchain
// ==========================================

import { NextRequest } from 'next/server';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { handleCorsPreflight } from '../../../../../../base/backend/lib/cors';
import { withApiHandler, getDigestParam } from '../../../../../../base/backend/lib/api/api-handler';

// Type guard for created object changes
// SuiObjectChange is a union type, we need to check for the 'created' variant
function isCreatedObjectChange(change: unknown): boolean {
  if (typeof change !== 'object' || change === null) {
    return false;
  }
  
  const obj = change as Record<string, unknown>;
  
  return (
    obj.type === 'created' &&
    typeof obj.objectId === 'string' &&
    typeof obj.objectType === 'string'
  );
}

// Helper to safely access created object change properties
function getCreatedObjectChange(change: unknown): { objectId: string; objectType: string } | null {
  if (!isCreatedObjectChange(change)) {
    return null;
  }
  
  const obj = change as { objectId: string; objectType: string };
  return {
    objectId: obj.objectId,
    objectType: obj.objectType,
  };
}

// Type for score submitted event data
type ScoreSubmittedEventData = {
  player: string;
  score: number;
  distance: number;
  coins: number;
  bosses_defeated: number;
  enemies_defeated: number;
  longest_coin_streak: number;
  player_name: string | number[];
  session_id: string | number[];
  timestamp: number;
  [key: string]: unknown;
};

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/scores/verify/[digest]
 * Verify a score submission transaction on the blockchain
 */
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ digest: string }> }
  ) => {
    const digest = await getDigestParam(context.params);

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
    const gameSessionChangeRaw = tx.objectChanges?.find(
      (change) => 
        isCreatedObjectChange(change) && 
        (change as { objectType: string }).objectType.includes('GameSession')
    );
    
    const gameSessionChange = gameSessionChangeRaw ? getCreatedObjectChange(gameSessionChangeRaw) : null;

    const scoreEvent = tx.events?.find(
      (event: any) => event.type?.includes('ScoreSubmitted')
    );

    if (!gameSessionChange && !scoreEvent) {
      throw new Error('No game session data found in transaction');
    }

    // Parse event data if available
    let eventData: ScoreSubmittedEventData | null = null;
    if (scoreEvent && scoreEvent.parsedJson) {
      eventData = scoreEvent.parsedJson as ScoreSubmittedEventData;
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

    return {
      success: true,
      transaction: {
        digest,
        status: tx.effects?.status?.status,
        timestamp: tx.timestampMs,
      },
      gameSession: gameSessionChange ? {
        objectId: gameSessionChange.objectId,
        objectType: gameSessionChange.objectType,
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
    };
  }
);


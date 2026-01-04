import { NextRequest } from 'next/server';
import { suiService } from '../../../../base/backend/lib/sui/suiService';
import { handleCorsPreflight } from '../../../../base/backend/lib/cors';
import { BadgeLogger } from '../../../../base/backend/lib/sui/badge-logger';
import { withApiHandler } from '../../../../base/backend/lib/api/api-handler';

/**
 * Generate mock leaderboard data for testing
 */
function generateMockLeaderboard(count: number) {
  const mockData = [];
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Ruby', 'Sam', 'Tina'];
  const addresses = [
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    '0x1111111111111111111111111111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333333333333333333333333333',
    '0x4444444444444444444444444444444444444444444444444444444444444444',
    '0x5555555555555555555555555555555555555555555555555555555555555555',
    '0x6666666666666666666666666666666666666666666666666666666666666666',
  ];
  
  for (let i = 0; i < count; i++) {
    const baseScore = 50000 - (i * 200); // Decreasing scores
    const variance = Math.floor(Math.random() * 1000) - 500; // Random variance
    const score = Math.max(100, baseScore + variance);
    
    const distance = Math.floor(500 + Math.random() * 2000);
    const coins = Math.floor(20 + Math.random() * 80);
    const bossesDefeated = Math.floor(1 + Math.random() * 4);
    const enemiesDefeated = Math.floor(30 + Math.random() * 100);
    const longestCoinStreak = Math.floor(5 + Math.random() * 20);
    
    const nameIndex = i % names.length;
    const addressIndex = i % addresses.length;
    const baseAddress = addresses[addressIndex];
    // Modify address slightly to make each unique
    const addressSuffix = i.toString(16).padStart(2, '0');
    const walletAddress = baseAddress.slice(0, -2) + addressSuffix;
    
    mockData.push({
      walletAddress,
      playerAddress: walletAddress,
      playerName: Math.random() > 0.3 ? names[nameIndex] + (i > names.length ? ` ${Math.floor(i / names.length) + 1}` : '') : '', // 70% have names
      score,
      distance,
      coins,
      bossesDefeated,
      enemiesDefeated,
      longestCoinStreak,
      timestamp: Date.now() - (i * 60000), // Staggered timestamps
    });
  }
  
  return mockData;
}

/**
 * GET /api/leaderboard
 * Get leaderboard from blockchain events
 * 
 * Queries ScoreSubmitted events from the smart contract and returns
 * top scores sorted by score (descending).
 * 
 * Query params:
 * - limit: Number of scores to return (default: 100, max: 1000)
 * - mock: Set to 'true' to return mock data for testing (default: false)
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const mockParam = searchParams.get('mock');
    const useMock = mockParam === 'true' || process.env.USE_MOCK_LEADERBOARD === 'true';
    
    const limit = Math.min(
      Math.max(parseInt(limitParam || '100', 10), 1), // At least 1
      1000 // Max 1000
    );

    let leaderboard;
    if (useMock) {
      BadgeLogger.info('Using mock leaderboard data', { limit });
      leaderboard = generateMockLeaderboard(limit);
    } else {
      // Query both events and StatisticsRegistry
      // Events contain all individual score submissions (what we want for leaderboard)
      // Registry contains best scores per player (used as fallback for migrated stats without events)
      const [eventScores, registryScores] = await Promise.all([
        suiService.queryEvents(limit * 2), // Get more from events to merge
        suiService.queryStatisticsRegistry(limit * 2), // Get more from registry to merge
      ]);

      BadgeLogger.info('Fetched leaderboard data', {
        eventCount: eventScores.length,
        registryCount: registryScores.length,
      });

      // Use all event scores (individual game submissions) as the primary source
      // These represent actual game sessions with timestamps
      const allScores = [...eventScores];

      // For players who have stats in registry but no events (migrated stats),
      // add their best score as a single entry
      const playersWithEvents = new Set(eventScores.map(s => s.walletAddress));
      for (const registryScore of registryScores) {
        if (!playersWithEvents.has(registryScore.walletAddress)) {
          // This player has migrated stats but no events, add their best score
          allScores.push(registryScore);
        }
      }

      // Sort all scores by score (descending) and limit
      leaderboard = allScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      BadgeLogger.info('Merged leaderboard data', {
        finalCount: leaderboard.length,
        totalScores: allScores.length,
        eventScores: eventScores.length,
        registryOnlyScores: registryScores.filter(s => !playersWithEvents.has(s.walletAddress)).length,
      });
    }
    
    // Get network info for verification (skip if using mock data)
    let connectionInfo;
    if (!useMock) {
      connectionInfo = await suiService.testConnection();
    } else {
      connectionInfo = { network: 'testnet', chainId: 'mock' };
    }
    
    return {
      success: true,
      leaderboard,
      count: leaderboard.length,
      limit,
      network: connectionInfo.network, // Include network info for verification
      chainId: connectionInfo.chainId, // Include chain ID for verification
      mock: useMock, // Indicate if mock data is being used
    };
  }
);

/**
 * Handle CORS preflight (OPTIONS) request
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}


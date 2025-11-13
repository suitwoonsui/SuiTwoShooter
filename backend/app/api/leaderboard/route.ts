import { NextRequest, NextResponse } from 'next/server';
import { suiService } from '@/lib/sui/suiService';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

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
export async function GET(request: NextRequest) {
  try {
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
      console.log(`🧪 [LEADERBOARD] Using mock data (${limit} entries)`);
      leaderboard = generateMockLeaderboard(limit);
    } else {
      leaderboard = await suiService.queryEvents(limit);
    }

    const corsHeaders = getCorsHeaders(request);
    
    // Get network info for verification (skip if using mock data)
    let connectionInfo;
    if (!useMock) {
      connectionInfo = await suiService.testConnection();
    } else {
      connectionInfo = { network: 'testnet', chainId: 'mock' };
    }
    
    return NextResponse.json({
      leaderboard,
      count: leaderboard.length,
      limit,
      network: connectionInfo.network, // Include network info for verification
      chainId: connectionInfo.chainId, // Include chain ID for verification
      mock: useMock, // Indicate if mock data is being used
    }, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error);
    const corsHeaders = getCorsHeaders(request);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        leaderboard: [],
        count: 0
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}


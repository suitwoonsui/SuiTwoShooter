// ==========================================
// Store Items API Route
// Returns item catalog with current token prices
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { priceConverter } from '@/lib/services/price-converter';

// Item catalog (matches frontend structure)
// In production, this could be loaded from a database or config file
const ITEM_CATALOG = {
  extraLives: {
    id: 'extraLives',
    name: 'Extra Lives',
    description: 'Start with additional lives beyond the default 3',
    category: 'defensive',
    icon: '❤️',
    levels: [
      { level: 1, usdPrice: 0.50, effect: '+1 life', description: 'Start with 4 total lives (3 base + 1 purchased)' },
      { level: 2, usdPrice: 1.25, effect: '+2 lives', description: 'Start with 5 total lives (3 base + 2 purchased)' },
      { level: 3, usdPrice: 2.50, effect: '+3 lives', description: 'Start with 6 total lives (3 base + 3 purchased)' },
    ],
  },
  forceField: {
    id: 'forceField',
    name: 'Force Field Start',
    description: 'Begin the game with an active force field at a specified level',
    category: 'defensive',
    icon: '🛡️',
    levels: [
      { level: 1, usdPrice: 1.00, effect: 'Level 1 force field', description: 'Start with Level 1 force field active (normally requires 5 coin streak)' },
      { level: 2, usdPrice: 2.00, effect: 'Level 2 force field', description: 'Start with Level 2 force field active (normally requires 12 coin streak)' },
      { level: 3, usdPrice: 3.00, effect: 'Level 3 force field', description: 'Start with Level 3 force field active (normally requires 30 coin streak)' },
    ],
  },
  orbLevel: {
    id: 'orbLevel',
    name: 'Orb Level Start',
    description: 'Begin the game with a higher magic orb level',
    category: 'offensive',
    icon: '🔮',
    levels: [
      { level: 1, usdPrice: 0.75, effect: 'Start at Level 2', description: 'Begin at Orb Level 2 (skip initial grind)' },
      { level: 2, usdPrice: 1.50, effect: 'Start at Level 3', description: 'Begin at Orb Level 3 (stronger starting power)' },
      { level: 3, usdPrice: 2.25, effect: 'Start at Level 4', description: 'Begin at Orb Level 4 (very strong starting power)' },
    ],
  },
  coinTractorBeam: {
    id: 'coinTractorBeam',
    name: 'Coin Tractor Beam',
    description: 'Pull all coins on screen toward the player automatically',
    category: 'utility',
    icon: '🧲',
    levels: [
      { level: 1, usdPrice: 1.00, effect: '4 seconds, 30% range', description: 'Pull coins from 30% of screen range for 4 seconds' },
      { level: 2, usdPrice: 1.50, effect: '6 seconds, 60% range', description: 'Pull coins from 60% of screen range for 6 seconds' },
      { level: 3, usdPrice: 2.00, effect: '8 seconds, 90% range', description: 'Pull coins from 90% of screen range for 8 seconds' },
    ],
  },
  slowTime: {
    id: 'slowTime',
    name: 'Slow Time Power',
    description: 'Activate a power that slows game speed for a short duration',
    category: 'tactical',
    icon: '⏱️',
    levels: [
      { level: 1, usdPrice: 1.50, effect: '4 seconds duration', description: 'Slow time for 4 seconds (50% speed reduction)' },
      { level: 2, usdPrice: 2.25, effect: '6 seconds duration', description: 'Slow time for 6 seconds (50% speed reduction)' },
      { level: 3, usdPrice: 3.00, effect: '8 seconds duration', description: 'Slow time for 8 seconds (50% speed reduction)' },
    ],
  },
  destroyAll: {
    id: 'destroyAll',
    name: 'Destroy All Enemies',
    description: 'Launch seeking missiles that automatically destroy all enemies on screen',
    category: 'tactical',
    icon: '💥',
    levels: [
      { level: 1, usdPrice: 2.50, effect: 'Clear all enemies', description: 'Instantly destroy all enemies on screen (one-time use per game)' },
    ],
  },
  bossKillShot: {
    id: 'bossKillShot',
    name: 'Boss Kill Shot',
    description: 'Instant kill the current boss with a powerful screen-wide attack',
    category: 'tactical',
    icon: '🎯',
    levels: [
      { level: 1, usdPrice: 3.75, effect: 'Instant boss kill', description: 'Instantly defeat any boss regardless of remaining HP (one-time use per game)' },
    ],
  },
};

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // Get current token prices
    const pricesResult = await priceConverter.getTokenPrices();
    
    if (!pricesResult.success || !pricesResult.prices) {
      return NextResponse.json(
        {
          success: false,
          error: pricesResult.error || 'Failed to fetch token prices',
          message: 'Unable to retrieve current prices. Please try again later.',
        },
        { status: 503, headers: corsHeaders }
      );
    }

    const prices = pricesResult.prices;

    // Convert all items with token prices
    const items = Object.values(ITEM_CATALOG).map((item) => {
      const levels = item.levels.map((level) => {
        // Convert USD price to token amounts
        const suiAmount = (level.usdPrice / prices.sui) * 1_000_000_000; // 9 decimals
        const mewsAmount = (level.usdPrice / prices.mews) * 1_000_000_000; // 9 decimals
        const usdcAmount = (level.usdPrice / prices.usdc) * 1_000_000; // 6 decimals

        return {
          ...level,
          prices: {
            sui: {
              amount: Math.round(suiAmount).toString(),
              display: (suiAmount / 1_000_000_000).toFixed(6),
            },
            mews: {
              amount: Math.round(mewsAmount).toString(),
              display: (mewsAmount / 1_000_000_000).toFixed(6),
            },
            usdc: {
              amount: Math.round(usdcAmount).toString(),
              display: (usdcAmount / 1_000_000).toFixed(2),
            },
          },
        };
      });

      return {
        ...item,
        levels,
      };
    });

    return NextResponse.json(
      {
        success: true,
        items,
        prices: {
          sui: prices.sui,
          mews: prices.mews,
          usdc: prices.usdc,
        },
        timestamp: pricesResult.timestamp,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in store items endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}


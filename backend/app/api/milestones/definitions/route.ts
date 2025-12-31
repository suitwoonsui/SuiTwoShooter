// ==========================================
// Public Milestone Definitions API Route
// ==========================================
// GET: Get all milestone definitions (public, no auth required)

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAchievementService } from '@/lib/sui/achievement-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// GET: List all milestone definitions (public)
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const achievementService = getAchievementService();
    
    // Check for cache clear parameter
    const url = new URL(request.url);
    const clearCache = url.searchParams.get('clearCache') === 'true';
    
    if (clearCache) {
      // Clear the cache to force fresh fetch
      (achievementService as any).milestoneDefinitionsCache = null;
      (achievementService as any).cacheTimestamp = 0;
      BadgeLogger.info('Milestone definitions cache cleared (public API)');
    }
    
    // Get milestone definitions (from on-chain or fallback)
    const definitions = await achievementService.getMilestoneDefinitions();
    
    // Transform to a format that's easier for frontend to consume
    // Extract just the thresholds for each category (for backward compatibility)
    const simplifiedDefinitions: Record<string, number[]> = {};
    
    for (const [category, milestoneList] of Object.entries(definitions)) {
      simplifiedDefinitions[category] = milestoneList
        .sort((a, b) => a.threshold - b.threshold) // Ensure sorted by threshold
        .map(m => m.threshold);
    }
    
    // Return plain object so withApiHandler can add CORS headers
    return {
      success: true,
      definitions: simplifiedDefinitions,
      fullDefinitions: definitions, // Include full definitions with credits and items
      cacheCleared: clearCache,
    };
  }
);

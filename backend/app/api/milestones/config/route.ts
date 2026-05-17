// ==========================================
// Milestone Config API Route
// Returns platform-specific milestone configuration (categories, item types)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { verifyApiKey } from '@/lib/auth';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAppIdFromEnv, platformMilestonesClient } from '@/lib/services/platform/client/platform-client';
import { getConfig } from '@/config/config';

function humanizeCategoryKey(key: string): string {
  if (!key || typeof key !== 'string') return key;
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// GET: Return platform-specific milestone configuration. Categories from chain (Aquifer definitions).
export const GET = withApiHandler(
  async (request: NextRequest) => {
    if (!verifyApiKey(request)) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Valid API key required.'
      );
    }

    const appId = getAppIdFromEnv() || getConfig().server.appId || '';
    let categories: Array<{ key: string; label: string; code: number }> = [];
    try {
      const res = await platformMilestonesClient.getDefinitions();
      const full = res?.fullDefinitions ?? {};
      if (typeof full === 'object' && !Array.isArray(full)) {
        const keys = Object.keys(full).sort();
        categories = keys.map((key, i) => ({ key, label: humanizeCategoryKey(key), code: i + 1 }));
      }
    } catch {
      // Non-fatal: return empty categories; client can still use itemTypes
    }

    return {
      success: true,
      platformId: appId,
      platformName: 'Shooter Game',
      categories,
      itemTypes: [
        { id: 'orb_level', label: 'Orb Level', code: 0 },
        { id: 'force_field', label: 'Force Field', code: 1 },
        { id: 'extra_lives', label: 'Extra Lives', code: 2 },
        { id: 'slow_time', label: 'Slow Time', code: 3 },
        { id: 'coin_tractor_beam', label: 'Coin Tractor Beam', code: 4 },
        { id: 'destroy_all', label: 'Destroy All', code: 5 },
        { id: 'boss_kill_shot', label: 'Boss Kill Shot', code: 6 },
      ],
    };
  }
);

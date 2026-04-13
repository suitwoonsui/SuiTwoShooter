// ==========================================
// Admin Milestone Management API Route
// ==========================================
// When ECOSYSTEM_ID/APP_ID set: GET and POST use platform; Initialize syncs to platform then on-chain.
// When not set: use on-chain only.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { platformMilestonesClient, buildPlatformCallOptions, getCorridorAdminCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';
import { MILESTONE_DEFINITIONS } from '@/data/initialization-data';
import { ensureMilestoneIds, type MilestoneRowLike } from '@/lib/services/achievements/milestones/ensure-milestone-ids';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// GET: List all milestone definitions (platform only)
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const url = new URL(request.url);
    const clearCache = url.searchParams.get('clearCache') === 'true';
    const platformRes = await platformMilestonesClient.getDefinitions();
    const rawDefs = platformRes?.definitions;
    const defKeys = Array.isArray(rawDefs) ? rawDefs.map((d: { key?: string }) => d?.key).filter(Boolean) : [];
    const fullKeys = platformRes?.fullDefinitions && typeof platformRes.fullDefinitions === 'object' ? Object.keys(platformRes.fullDefinitions) : [];
    PlatformLogger.info('Milestones GET (get): platform result', {
      success: platformRes?.success,
      result: { rawDefinitionCount: Array.isArray(rawDefs) ? rawDefs.length : 0, rawKeys: defKeys, fullDefinitionCategoryCount: fullKeys.length, categoryKeys: fullKeys },
    });
    if (platformRes?.success && (platformRes.fullDefinitions || platformRes.definitions)) {
      const raw = platformRes.fullDefinitions ?? (platformRes.definitions as any);
      const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      const definitions = ensureMilestoneIds(base as Record<string, MilestoneRowLike[]>, MILESTONE_DEFINITIONS);
      const isEmpty = Object.keys(definitions).length === 0;
      return {
        success: true,
        definitions,
        cacheCleared: clearCache,
        ...(isEmpty && {
          configMissing: false,
          message: 'No definitions on chain for this app yet. Use Initialize to write definitions to platform Aquifer, then click Refresh after the transaction finalizes.',
        }),
      };
    }
    return {
      success: false,
      error: platformRes?.error || 'Milestone definitions temporarily unavailable.',
    };
  }
);

// POST: Add a new milestone definition. Send optional `definitions` (full merged) to avoid an extra GET.
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      category: string;
      milestoneLevel?: number; // Optional - will be auto-calculated if not provided
      threshold: number;
      credits: number;
      items: Array<{ itemId: string; level: number; quantity: number }>;
      adminWalletAddress: string;
      /** When set, use this as the full definitions (client already has it); avoids extra GET. */
      definitions?: Record<string, Array<{ milestoneId?: number; threshold: number; credits: number; items?: Array<{ itemId: string; level: number; quantity: number }> }>>;
    }>(request);

    const { category, milestoneLevel: providedLevel, threshold, credits, items, adminWalletAddress, definitions: bodyDefs } = body;

    // Verify admin wallet address
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed.'
      );
    }

    // Validate inputs
    if (!category || threshold <= 0 || credits < 0) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_INVALID,
        'Invalid input: category, threshold (>0), and credits (>=0) are required.'
      );
    }

    const rawExisting = (typeof bodyDefs === 'object' && bodyDefs !== null && !Array.isArray(bodyDefs)
      ? bodyDefs
      : (await platformMilestonesClient.getDefinitions())?.fullDefinitions ?? {}) as Record<string, MilestoneRowLike[]>;
    const existing = ensureMilestoneIds(rawExisting, MILESTONE_DEFINITIONS) as Record<
      string,
      Array<{ milestoneId?: number; threshold: number; credits: number; items: Array<{ itemId: string; level: number; quantity: number }> }>
    >;
    const categoryDefinitions = existing[category] || [];
    // Allocate a stable, globally-unique milestoneId for the new milestone (append-only).
    let maxId = 0;
    for (const list of Object.values(existing)) {
      if (!Array.isArray(list)) continue;
      for (const m of list) {
        const mid = (m as { milestoneId?: number }).milestoneId;
        if (typeof mid === 'number' && Number.isFinite(mid)) maxId = Math.max(maxId, mid);
      }
    }
    const newDef = { milestoneId: maxId + 1, threshold, credits, items: items || [] };
    const merged = [...categoryDefinitions, newDef].sort((a, b) => a.threshold - b.threshold);
    const updated = { ...existing, [category]: merged };
    const platformOptions = buildPlatformCallOptions(request, body, {
      corridorAdminCapabilityObjectId: getCorridorAdminCapabilityObjectIdFromEnv(),
    });
    const setRes = await platformMilestonesClient.setDefinitions(updated, platformOptions);
    if (!setRes?.success) {
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, setRes?.error || 'Failed to update milestone definitions on platform.');
    }
    return {
      success: true,
      message: `Milestone added to category ${category} (platform).`,
      definitions: updated,
    };
  }
);

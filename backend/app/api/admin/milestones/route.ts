// ==========================================
// Admin Milestone Management API Route
// ==========================================
// GET: List all milestone definitions
// POST: Add a new milestone definition

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAchievementService } from '@/lib/sui/achievement-service';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { getLevelForNewMilestone } from '@/lib/sui/milestone-level-manager';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// GET: List all milestone definitions
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
      BadgeLogger.info('Milestone definitions cache cleared');
    }
    
    // Get milestone definitions (from on-chain or fallback)
    const definitions = await achievementService.getMilestoneDefinitions();
    
    return NextResponse.json({
      success: true,
      definitions,
      cacheCleared: clearCache,
    });
  }
);

// POST: Add a new milestone definition
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      category: string;
      milestoneLevel?: number; // Optional - will be auto-calculated if not provided
      threshold: number;
      credits: number;
      items: Array<{ itemId: string; level: number; quantity: number }>;
      adminWalletAddress: string;
    }>(request);

    const { category, milestoneLevel: providedLevel, threshold, credits, items, adminWalletAddress } = body;

    // Verify admin wallet address
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      throw new BadgeError(
        BadgeErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed.'
      );
    }

    // Validate inputs
    if (!category || threshold <= 0 || credits < 0) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_INVALID,
        'Invalid input: category, threshold (>0), and credits (>=0) are required.'
      );
    }

    // Get existing definitions to calculate proper level
    const achievementService = getAchievementService();
    const existingDefinitions = await achievementService.getMilestoneDefinitions();
    const categoryDefinitions = existingDefinitions[category] || [];

    // Auto-calculate level based on threshold position if not provided
    let milestoneLevel: number;
    if (providedLevel !== undefined && providedLevel > 0) {
      // Use provided level (for backward compatibility or manual override)
      milestoneLevel = providedLevel;
      BadgeLogger.info('Using provided milestone level', { category, milestoneLevel, threshold });
    } else {
      // Auto-calculate level based on threshold order
      milestoneLevel = getLevelForNewMilestone(threshold, categoryDefinitions);
      BadgeLogger.info('Auto-calculated milestone level', { category, milestoneLevel, threshold });
    }

    // Map category name to code
    const categoryCodes: Record<string, number> = {
      gamesPlayed: 1,
      bossesPerGame: 2,
      bossesCumulative: 3,
      scorePerGame: 4,
      scoreCumulative: 5,
      distancePerGame: 6,
      distanceCumulative: 7,
      coinsPerGame: 8,
      coinsCumulative: 9,
      enemiesPerGame: 10,
      enemiesCumulative: 11,
      coinStreak: 12,
    };

    const categoryCode = categoryCodes[category];
    if (!categoryCode) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_INVALID,
        `Invalid category: ${category}. Must be one of: ${Object.keys(categoryCodes).join(', ')}`
      );
    }

    // Map item IDs to u8
    const itemIdToU8 = (itemId: string): number => {
      const itemIdMap: Record<string, number> = {
        'orbLevel': 0,
        'forceField': 1,
        'extraLives': 2,
        'slowTime': 3,
        'coinTractorBeam': 4,
        'destroyAll': 5,
        'bossKillShot': 6,
      };
      const value = itemIdMap[itemId];
      if (value === undefined) {
        throw new BadgeError(
          BadgeErrorCode.CONFIG_INVALID,
          `Invalid item ID: ${itemId}`
        );
      }
      return value;
    };

    // Get config
    const config = getConfig();
    const packageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;
    const registryId = config.contracts.achievementRegistry;
    const adminCapId = config.contracts.achievementAdminCap;

    if (!packageId || !registryId || !adminCapId) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'Achievement system contract not configured'
      );
    }

    // Build transaction
    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    const txb = new Transaction();
    
    // Convert items to parallel vectors (like tournament contract)
    const itemIds: number[] = [];
    const itemLevels: number[] = [];
    const itemQuantities: bigint[] = [];
    
    for (const item of items) {
      itemIds.push(itemIdToU8(item.itemId));
      itemLevels.push(item.level);
      itemQuantities.push(BigInt(item.quantity));
    }

    txb.moveCall({
      target: `${packageId}::achievement_system::add_milestone_definition_entry`,
      arguments: [
        txb.object(adminCapId),
        txb.object(registryId),
        txb.pure.u8(categoryCode),
        txb.pure.u8(milestoneLevel),
        txb.pure.u64(threshold),
        txb.pure.u64(credits),
        txb.pure('vector<u8>', itemIds),
        txb.pure('vector<u8>', itemLevels),
        txb.pure('vector<u64>', itemQuantities),
        txb.object('0x6'), // Clock
      ],
    });

    txb.setSender(adminWallet.getAddress());
    txb.setGasBudget(config.sui.gasBudget);

    // Execute transaction
    const transactionBytes = await txb.build({ client });
    const result = await client.signAndExecuteTransaction({
      signer: adminWallet.getKeypair(),
      transaction: transactionBytes,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        `Transaction failed: ${result.effects?.status?.error || 'Unknown error'}`
      );
    }

    BadgeLogger.info('Milestone definition added', {
      category,
      milestoneLevel,
      threshold,
      credits,
      itemCount: items.length,
      digest: result.digest,
    });

    // Clear cache to force refresh
    (achievementService as any).milestoneDefinitionsCache = null;

    return NextResponse.json({
      success: true,
      digest: result.digest,
      milestone: {
        category,
        milestoneLevel,
        threshold,
        credits,
        items,
      },
    });
  }
);

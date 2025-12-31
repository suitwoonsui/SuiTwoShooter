// ==========================================
// Admin Milestone Update/Delete API Route
// ==========================================
// PUT: Update a milestone definition
// DELETE: Delete a milestone definition

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
import { 
  getLevelForUpdatedMilestone, 
  wouldThresholdChangeRequireReorganization,
  getReorganizationPlan 
} from '@/lib/sui/milestone-level-manager';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// PUT: Update a milestone definition
export const PUT = withApiHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ category: string; level: string }> }
  ) => {
    const body = await getRequestBody<{
      threshold?: number;
      credits?: number;
      items?: Array<{ itemId: string; level: number; quantity: number }>;
      adminWalletAddress: string;
    }>(request);

    const { threshold, credits, items, adminWalletAddress } = body;
    const resolvedParams = await params;
    const category = resolvedParams.category;
    const milestoneLevel = parseInt(resolvedParams.level, 10);

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

    // Validate milestone level
    if (isNaN(milestoneLevel) || milestoneLevel <= 0) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_INVALID,
        'Invalid milestone level'
      );
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
        `Invalid category: ${category}`
      );
    }

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

    // Check if threshold is being updated and if reorganization is needed
    if (threshold !== undefined) {
      const achievementService = getAchievementService();
      const existingDefinitions = await achievementService.getMilestoneDefinitions();
      const categoryDefinitions = existingDefinitions[category] || [];
      
      // Find current milestone to get old threshold
      const currentMilestone = categoryDefinitions.find(d => d.level === milestoneLevel);
      
      if (currentMilestone) {
        const oldThreshold = currentMilestone.threshold;
        
        // Check if reorganization would be needed
        const needsReorganization = wouldThresholdChangeRequireReorganization(
          milestoneLevel,
          oldThreshold,
          threshold,
          categoryDefinitions
        );
        
        if (needsReorganization) {
          const newLevel = getLevelForUpdatedMilestone(threshold, milestoneLevel, categoryDefinitions);
          const reorganizationPlan = getReorganizationPlan(categoryDefinitions);
          
          BadgeLogger.warn('Threshold change would require level reorganization', {
            category,
            oldLevel: milestoneLevel,
            newLevel,
            oldThreshold,
            newThreshold: threshold,
            reorganizationPlan: reorganizationPlan.map(p => ({
              oldLevel: p.oldLevel,
              newLevel: p.newLevel,
              threshold: p.threshold,
            })),
          });
          
          // For now, return an error indicating reorganization is needed
          // TODO: Implement automatic reorganization with claimed_milestones migration
          throw new BadgeError(
            BadgeErrorCode.CONFIG_INVALID,
            `Updating threshold from ${oldThreshold} to ${threshold} would require reorganizing levels ` +
            `(level ${milestoneLevel} → level ${newLevel}). ` +
            `Level reorganization is not yet implemented. ` +
            `Please use the reorganization endpoint or adjust the threshold to maintain level order.`
          );
        }
      }
    }

    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    // Map item IDs to u8 (helper function)
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

    // Build transaction
    const txb = new Transaction();
    
    // If all fields are provided, use update_milestone_definition_entry
    // Otherwise, use individual update functions
    if (threshold !== undefined && credits !== undefined && items) {
      // Convert items to parallel vectors
      const itemIds: number[] = [];
      const itemLevels: number[] = [];
      const itemQuantities: bigint[] = [];
      
      for (const item of items) {
        itemIds.push(itemIdToU8(item.itemId));
        itemLevels.push(item.level);
        itemQuantities.push(BigInt(item.quantity));
      }
      
      txb.moveCall({
        target: `${packageId}::achievement_system::update_milestone_definition_entry`,
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
    } else if (threshold !== undefined) {
      // Update only threshold
      txb.moveCall({
        target: `${packageId}::achievement_system::update_milestone_threshold`,
        arguments: [
          txb.object(adminCapId),
          txb.object(registryId),
          txb.pure.u8(categoryCode),
          txb.pure.u8(milestoneLevel),
          txb.pure.u64(threshold),
          txb.object('0x6'), // Clock
        ],
      });
    } else if (credits !== undefined) {
      // Update only credits
      txb.moveCall({
        target: `${packageId}::achievement_system::update_milestone_credits`,
        arguments: [
          txb.object(adminCapId),
          txb.object(registryId),
          txb.pure.u8(categoryCode),
          txb.pure.u8(milestoneLevel),
          txb.pure.u64(credits),
          txb.object('0x6'), // Clock
        ],
      });
    } else if (items) {
      // Update only items - this requires update_milestone_definition with existing threshold/credits
      // We need to fetch current values first, or require them in the request
      throw new BadgeError(
        BadgeErrorCode.CONFIG_INVALID,
        'To update items, you must also provide threshold and credits, or use the full update endpoint'
      );
    } else {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_INVALID,
        'At least one field (threshold, credits, items) must be provided'
      );
    }

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

    BadgeLogger.info('Milestone definition updated', {
      category,
      milestoneLevel,
      threshold,
      credits,
      itemCount: items?.length,
      digest: result.digest,
    });

    // Clear cache
    const achievementService = getAchievementService();
    (achievementService as any).milestoneDefinitionsCache = null;

    return NextResponse.json({
      success: true,
      digest: result.digest,
    });
  }
);

// DELETE: Delete a milestone definition
export const DELETE = withApiHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ category: string; level: string }> }
  ) => {
    // Get admin wallet address from query params or body
    const url = new URL(request.url);
    const adminWalletAddress = url.searchParams.get('adminWalletAddress') || 
      (await request.json().catch(() => ({}))).adminWalletAddress;
    const resolvedParams = await params;
    const category = resolvedParams.category;
    const milestoneLevel = parseInt(resolvedParams.level, 10);

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

    // Validate milestone level
    if (isNaN(milestoneLevel) || milestoneLevel <= 0) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_INVALID,
        'Invalid milestone level'
      );
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
        `Invalid category: ${category}`
      );
    }

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

    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    // Build transaction
    const txb = new Transaction();
    
    txb.moveCall({
      target: `${packageId}::achievement_system::delete_milestone_definition`,
      arguments: [
        txb.object(adminCapId),
        txb.object(registryId),
        txb.pure.u8(categoryCode),
        txb.pure.u8(milestoneLevel),
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

    BadgeLogger.info('Milestone definition deleted', {
      category,
      milestoneLevel,
      digest: result.digest,
    });

    // Clear cache
    const achievementService = getAchievementService();
    (achievementService as any).milestoneDefinitionsCache = null;

    return NextResponse.json({
      success: true,
      digest: result.digest,
    });
  }
);

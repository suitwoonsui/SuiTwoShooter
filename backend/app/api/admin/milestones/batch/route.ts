// ==========================================
// Admin Milestone Batch Operations API Route
// ==========================================
// POST: Execute multiple milestone operations in a single transaction

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

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// POST: Execute batch of milestone operations
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      updates?: Array<{
        category: string;
        level: number;
        threshold: number;
        credits: number;
        items: Array<{ itemId: string; level: number; quantity: number }>;
      }>;
      additions?: Array<{
        category: string;
        milestoneLevel: number;
        threshold: number;
        credits: number;
        items: Array<{ itemId: string; level: number; quantity: number }>;
      }>;
      deletions?: Array<{
        category: string;
        level: number;
      }>;
      adminWalletAddress: string;
    }>(request);

    const { updates = [], additions = [], deletions = [], adminWalletAddress } = body;

    // Log what we're about to process for debugging
    BadgeLogger.info('Processing batch operations', {
      deletions: deletions.map(d => `${d.category} level ${d.level}`),
      updates: updates.map(u => `${u.category} level ${u.level}`),
      additions: additions.map(a => `${a.category} level ${a.milestoneLevel}`),
    });

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

    // Validate that we have at least one operation
    if (updates.length === 0 && additions.length === 0 && deletions.length === 0) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_INVALID,
        'At least one operation (update, addition, or deletion) must be provided'
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
    const packageId = (config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore)?.trim();
    const registryId = config.contracts.achievementRegistry?.trim();
    const adminCapId = config.contracts.achievementAdminCap?.trim();

    if (!packageId || !registryId || !adminCapId || packageId === '' || registryId === '' || adminCapId === '') {
      const missing = [];
      if (!packageId || packageId === '') missing.push('packageId');
      if (!registryId || registryId === '') missing.push('registryId');
      if (!adminCapId || adminCapId === '') missing.push('adminCapId');
      
      BadgeLogger.error('Achievement system contract configuration missing', {
        packageId: packageId || 'MISSING',
        registryId: registryId || 'MISSING',
        adminCapId: adminCapId || 'MISSING',
        network: config.sui.network,
        gameScoreContract: config.contracts.gameScore || 'MISSING',
        missingFields: missing,
      });
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        `Achievement system contract not configured. Missing: ${missing.join(', ')}. Network: ${config.sui.network}`
      );
    }

    // Build transaction
    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    const txb = new Transaction();
    txb.setSender(adminWallet.getAddress());
    
    // Calculate gas budget based on number of operations
    const totalOperations = deletions.length + updates.length + additions.length;
    const gasMultiplier = Math.min(Math.max(2, Math.ceil(totalOperations / 2)), 10);
    txb.setGasBudget(config.sui.gasBudget * gasMultiplier);

    // Process deletions first (highest to lowest level to avoid conflicts)
    const deletionsByCategory: Record<string, number[]> = {};
    for (const deletion of deletions) {
      if (!deletionsByCategory[deletion.category]) {
        deletionsByCategory[deletion.category] = [];
      }
      deletionsByCategory[deletion.category].push(deletion.level);
    }

    for (const [category, levels] of Object.entries(deletionsByCategory)) {
      const categoryCode = categoryCodes[category];
      if (!categoryCode) {
        throw new BadgeError(
          BadgeErrorCode.CONFIG_INVALID,
          `Invalid category: ${category}`
        );
      }

      // Sort from highest to lowest
      const sortedLevels = levels.sort((a, b) => b - a);
      
      for (const level of sortedLevels) {
        txb.moveCall({
          target: `${packageId}::achievement_system::delete_milestone_definition`,
          arguments: [
            txb.object(adminCapId),
            txb.object(registryId),
            txb.pure.u8(categoryCode),
            txb.pure.u8(level),
            txb.object('0x6'), // Clock
          ],
        });
      }
    }

    // Process updates
    // Note: Updates happen AFTER deletions, so we need to check if the milestone
    // is being deleted in the same batch - if so, skip the update
    const deletedLevels = new Set<string>();
    for (const deletion of deletions) {
      deletedLevels.add(`${deletion.category}:${deletion.level}`);
    }

    for (const update of updates) {
      // Skip update if this level is being deleted in the same batch
      if (deletedLevels.has(`${update.category}:${update.level}`)) {
        BadgeLogger.warn('Skipping update for milestone being deleted', {
          category: update.category,
          level: update.level,
        });
        continue;
      }

      const categoryCode = categoryCodes[update.category];
      if (!categoryCode) {
        throw new BadgeError(
          BadgeErrorCode.CONFIG_INVALID,
          `Invalid category: ${update.category}`
        );
      }

      // Convert items to parallel vectors
      const itemIds: number[] = [];
      const itemLevels: number[] = [];
      const itemQuantities: bigint[] = [];
      
      for (const item of update.items) {
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
          txb.pure.u8(update.level),
          txb.pure.u64(update.threshold),
          txb.pure.u64(update.credits),
          txb.pure('vector<u8>', itemIds),
          txb.pure('vector<u8>', itemLevels),
          txb.pure('vector<u64>', itemQuantities),
          txb.object('0x6'), // Clock
        ],
      });
    }

    // Process additions
    for (const addition of additions) {
      const categoryCode = categoryCodes[addition.category];
      if (!categoryCode) {
        throw new BadgeError(
          BadgeErrorCode.CONFIG_INVALID,
          `Invalid category: ${addition.category}`
        );
      }

      // Convert items to parallel vectors
      const itemIds: number[] = [];
      const itemLevels: number[] = [];
      const itemQuantities: bigint[] = [];
      
      for (const item of addition.items) {
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
          txb.pure.u8(addition.milestoneLevel),
          txb.pure.u64(addition.threshold),
          txb.pure.u64(addition.credits),
          txb.pure('vector<u8>', itemIds),
          txb.pure('vector<u8>', itemLevels),
          txb.pure('vector<u64>', itemQuantities),
          txb.object('0x6'), // Clock
        ],
      });
    }

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
      const errorMessage = result.effects?.status?.error || 'Unknown error';
      
      // Parse MoveAbort errors to provide more helpful messages
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('MoveAbort')) {
        if (errorMessage.includes('delete_milestone_definition') && errorMessage.includes(', 1)')) {
          userFriendlyError = 'One or more milestones to delete do not exist. They may have already been deleted. Please refresh the milestone list and try again.';
        } else if (errorMessage.includes('add_milestone_definition') && errorMessage.includes(', 6)')) {
          userFriendlyError = 'One or more milestones already exist at the specified level. Please use update instead of add, or choose a different level.';
        } else if (errorMessage.includes(', 1)')) {
          userFriendlyError = 'Milestone not found. It may have already been deleted or never existed.';
        } else if (errorMessage.includes(', 6)')) {
          userFriendlyError = 'Milestone already exists at this level. Use update instead.';
        }
      }
      
      BadgeLogger.error('Batch transaction failed', {
        error: errorMessage,
        userFriendlyError,
        deletions: deletions.length,
        updates: updates.length,
        additions: additions.length,
      });
      
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        userFriendlyError
      );
    }

    BadgeLogger.info('Milestone batch operations completed', {
      deletions: deletions.length,
      updates: updates.length,
      additions: additions.length,
      totalOperations,
      digest: result.digest,
    });

    // Clear cache to force refresh
    const achievementService = getAchievementService();
    (achievementService as any).milestoneDefinitionsCache = null;

    return NextResponse.json({
      success: true,
      digest: result.digest,
      operations: {
        deletions: deletions.length,
        updates: updates.length,
        additions: additions.length,
        total: totalOperations,
      },
    });
  }
);

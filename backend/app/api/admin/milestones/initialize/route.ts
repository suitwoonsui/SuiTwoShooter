// ==========================================
// Admin Milestone Initialize API Route
// ==========================================
// POST: Initialize milestone definitions (factory default)
// Sets up hardcoded milestone definitions on-chain (not a migration from old contract)

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { executeTransactionWithFinalization } from '@/lib/sui/transaction-helpers';
import { getAchievementService } from '@/lib/sui/achievement-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// POST: Initialize milestone definitions (factory default)
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      adminWalletAddress: string;
      force?: boolean; // Force initialization even if milestones exist
    }>(request);

    const { adminWalletAddress, force = false } = body;

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

    const config = getConfig();
    const client = new SuiClient({ url: getFullnodeUrl(config.sui.network) });
    
    const packageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;
    const registryId = config.contracts.achievementRegistry;
    const adminCapId = config.contracts.achievementAdminCap;

    if (!packageId || !registryId || !adminCapId) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'Missing required contract configuration'
      );
    }

    // Get hardcoded milestone definitions (factory defaults)
    // Access the private fallback definitions from the service
    const achievementService = getAchievementService();
    const definitions = (achievementService as any).milestoneDefinitionsFallback;
    
    if (!definitions || Object.keys(definitions).length === 0) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'No factory default milestone definitions available. Please configure milestones manually or run migration from old contract.'
      );
    }

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

    const itemIdToU8 = (itemId: string): number => {
      const map: Record<string, number> = {
        orbLevel: 0,
        forceField: 1,
        extraLives: 2,
        slowTime: 3,
        coinTractorBeam: 4,
        destroyAll: 5,
        bossKillShot: 6,
      };
      return map[itemId] ?? 0;
    };

    const results: Array<{
      category: string;
      success: boolean;
      added: number;
      skipped: number;
      digest?: string;
      error?: string;
    }> = [];

    // Process each category
    for (const [categoryName, categoryDefinitions] of Object.entries(definitions)) {
      const categoryDefs = categoryDefinitions as Array<{ threshold: number; credits: number; items: Array<{ itemId: string; level: number; quantity: number }> }>;
      const categoryCode = categoryCodes[categoryName];
      if (!categoryCode) {
        BadgeLogger.warn(`Unknown category: ${categoryName}, skipping`);
        continue;
      }

      try {
        // Check existing milestones for this category
        const existingLevels = new Set<number>();
        
        try {
          const txb = new Transaction();
          txb.setSender(adminWallet.getAddress());
          txb.moveCall({
            target: `${packageId}::achievement_system::get_all_milestone_levels_for_category`,
            arguments: [
              txb.object(registryId),
              txb.pure.u8(categoryCode),
            ],
          });

          const existingResult = await client.devInspectTransactionBlock({
            sender: adminWallet.getAddress(),
            transactionBlock: txb,
          });

          if (existingResult.results && existingResult.results[0] && 'returnValues' in existingResult.results[0]) {
            const returnValues = existingResult.results[0].returnValues;
            if (returnValues && returnValues.length > 0) {
              const val = returnValues[0];
              let byteArray: number[] | null = null;

              if (Array.isArray(val)) {
                if (val.length === 2 && Array.isArray(val[0])) {
                  byteArray = val[0] as number[];
                } else if (typeof val[0] === 'string') {
                  byteArray = Array.from(Buffer.from(val[0], 'base64'));
                }
              }

              if (byteArray && byteArray.length > 0) {
                const length = byteArray[0];
                for (let i = 1; i <= length && i < byteArray.length; i++) {
                  existingLevels.add(byteArray[i]);
                }
              }
            }
          }
          
          BadgeLogger.debug('Existing milestone levels check', {
            category: categoryName,
            existingLevels: Array.from(existingLevels),
            existingCount: existingLevels.size,
          });
        } catch (checkError) {
          // If check fails, log but continue - we'll try to add all milestones
          // This handles cases where the registry is empty or the function doesn't exist yet
          BadgeLogger.warn('Failed to check existing milestones, will attempt to add all', {
            category: categoryName,
            error: checkError instanceof Error ? checkError.message : 'Unknown error',
          });
        }

        // Prepare milestones to add
        const milestonesToAdd: Array<{
          level: number;
          threshold: number;
          credits: number;
          items: Array<{ itemId: string; level: number; quantity: number }>;
        }> = [];

        for (let i = 0; i < categoryDefs.length; i++) {
          const def = categoryDefs[i];
          const milestoneLevel = i + 1; // Factory defaults use sequential levels starting at 1

          if (!force && existingLevels.has(milestoneLevel)) {
            continue; // Skip existing milestones
          }

          milestonesToAdd.push({
            level: milestoneLevel,
            threshold: def.threshold,
            credits: def.credits,
            items: def.items,
          });
        }

        if (milestonesToAdd.length === 0) {
          results.push({
            category: categoryName,
            success: true,
            added: 0,
            skipped: categoryDefs.length,
          });
          continue;
        }

        // Build transaction to add all milestones for this category
        const batchTxb = new Transaction();
        batchTxb.setSender(adminWallet.getAddress());

        for (const milestone of milestonesToAdd) {
          const itemIds: number[] = [];
          const itemLevels: number[] = [];
          const itemQuantities: bigint[] = [];

          for (const item of milestone.items) {
            itemIds.push(itemIdToU8(item.itemId));
            itemLevels.push(item.level);
            itemQuantities.push(BigInt(item.quantity));
          }

          batchTxb.moveCall({
            target: `${packageId}::achievement_system::add_milestone_definition_entry`,
            arguments: [
              batchTxb.object(adminCapId),
              batchTxb.object(registryId),
              batchTxb.pure.u8(categoryCode),
              batchTxb.pure.u8(milestone.level),
              batchTxb.pure.u64(milestone.threshold),
              batchTxb.pure.u64(milestone.credits),
              batchTxb.pure('vector<u8>', itemIds),
              batchTxb.pure('vector<u8>', itemLevels),
              batchTxb.pure('vector<u64>', itemQuantities),
              batchTxb.object('0x6'), // Clock
            ],
          });
        }

        // Calculate gas budget based on number of milestones being added
        // Each milestone operation requires significant gas, so multiply based on count
        // For batch operations, we need more gas - use a higher multiplier
        // Base: 2x for small batches, up to 20x for large batches (max 200M MIST = 0.2 SUI)
        const gasMultiplier = Math.min(Math.max(3, Math.ceil(milestonesToAdd.length * 1.5)), 20);
        const gasBudget = config.sui.gasBudget * gasMultiplier;
        batchTxb.setGasBudget(gasBudget);
        
        BadgeLogger.debug('Setting gas budget for milestone initialization', {
          category: categoryName,
          milestonesCount: milestonesToAdd.length,
          gasMultiplier,
          gasBudget,
          baseGasBudget: config.sui.gasBudget,
        });

        // Execute transaction
        const result = await executeTransactionWithFinalization(
          client,
          adminWallet.getKeypair(),
          batchTxb,
          {
            logger: {
              info: (msg, data) => BadgeLogger.info(msg, data),
              warn: (msg, data) => BadgeLogger.warn(msg, data),
              error: (msg, data) => BadgeLogger.error(msg, data),
            },
          }
        );

        // Clear cache
        (achievementService as any).milestoneDefinitionsCache = null;

        results.push({
          category: categoryName,
          success: true,
          added: milestonesToAdd.length,
          skipped: categoryDefs.length - milestonesToAdd.length,
          digest: result.digest,
        });

        BadgeLogger.info('Milestone initialization batch completed', {
          category: categoryName,
          added: milestonesToAdd.length,
          skipped: categoryDefs.length - milestonesToAdd.length,
          digest: result.digest,
        });

        // Small delay between categories
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        BadgeLogger.error('Milestone initialization failed for category', {
          category: categoryName,
          error: errorMsg,
        });

        results.push({
          category: categoryName,
          success: false,
          added: 0,
          skipped: 0,
          error: errorMsg,
        });
      }
    }

    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: errorCount === 0,
      message: errorCount === 0 
        ? `Successfully initialized ${totalAdded} milestone definitions (${totalSkipped} already existed)`
        : `Initialization completed with ${errorCount} error(s)`,
      summary: {
        totalCategories: results.length,
        successCount,
        errorCount,
        totalAdded,
        totalSkipped,
      },
      results,
    });
  }
);


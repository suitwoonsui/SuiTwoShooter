// ==========================================
// Admin Milestone Clear API Route
// ==========================================
// POST: Clear all milestone definitions from the blockchain
// Optionally clear only a specific category

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
import { getAchievementService, MilestoneDefinition } from '@/lib/sui/achievement-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// POST: Clear all milestones (or all in a specific category)
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody(request);
    const { category, adminWalletAddress } = body as { category?: string; adminWalletAddress?: string };

    BadgeLogger.info('Received request to clear milestones', { category });

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
    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    const packageId = config.contracts.gameScore;
    const registryId = config.contracts.achievementRegistry;
    const adminCapId = config.contracts.achievementAdminCap;

    if (!packageId || !registryId || !adminCapId) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'Achievement system contract not configured'
      );
    }

    // Filter by category if specified
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

    // Get all categories to check
    const categoriesToCheck = category 
      ? [category] 
      : Object.keys(categoryCodes);

    // Collect all milestones that actually exist on-chain
    const milestonesToDelete: Array<{ category: string; categoryCode: number; level: number }> = [];
    
    BadgeLogger.info('Querying blockchain for existing milestones', {
      categoriesToCheck: categoriesToCheck.length,
    });

    for (const catName of categoriesToCheck) {
      const categoryCode = categoryCodes[catName];
      if (categoryCode === undefined) {
        BadgeLogger.warn(`Unknown category: ${catName}, skipping`);
        continue;
      }

      try {
        // Get all milestone levels for this category from on-chain
        const levelsTxb = new Transaction();
        levelsTxb.setSender(adminWallet.getAddress());
        levelsTxb.moveCall({
          target: `${packageId}::achievement_system::get_all_milestone_levels_for_category`,
          arguments: [
            levelsTxb.object(registryId),
            levelsTxb.pure.u8(categoryCode),
          ],
        });

        const levelsResult = await client.devInspectTransactionBlock({
          sender: adminWallet.getAddress(),
          transactionBlock: levelsTxb,
        });

        const milestoneLevels: number[] = [];
        if (levelsResult.results && levelsResult.results[0] && 'returnValues' in levelsResult.results[0]) {
          const returnValues = levelsResult.results[0].returnValues;
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
                milestoneLevels.push(byteArray[i]);
              }
            }
          }
        }

        BadgeLogger.debug(`Found ${milestoneLevels.length} milestones on-chain for ${catName}`, {
          category: catName,
          levels: milestoneLevels,
        });

        // Add each level to deletion list
        for (const level of milestoneLevels) {
          milestonesToDelete.push({
            category: catName,
            categoryCode,
            level,
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        BadgeLogger.warn(`Failed to query milestones for category ${catName}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with other categories
      }
    }

    if (milestonesToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No milestones found to clear',
        deleted: 0,
      });
    }

    BadgeLogger.info('Preparing to delete milestones', {
      total: milestonesToDelete.length,
      byCategory: milestonesToDelete.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });

    // Delete milestones in batches (to avoid gas issues)
    const BATCH_SIZE = 10;
    const results: Array<{ category: string; level: number; success: boolean; error?: string }> = [];
    let totalDeleted = 0;

    for (let i = 0; i < milestonesToDelete.length; i += BATCH_SIZE) {
      const batch = milestonesToDelete.slice(i, i + BATCH_SIZE);
      
      try {
        // Fetch fresh object versions before building transaction
        const adminCapObject = await client.getObject({
          id: adminCapId,
          options: { showPreviousTransaction: false },
        });
        
        if (adminCapObject.error || !adminCapObject.data) {
          throw new Error(`Failed to fetch admin capability object: ${adminCapObject.error?.code || 'Unknown error'}`);
        }

        const registryObject = await client.getObject({
          id: registryId,
          options: { showPreviousTransaction: false },
        });
        
        if (registryObject.error || !registryObject.data) {
          throw new Error(`Failed to fetch registry object: ${registryObject.error?.code || 'Unknown error'}`);
        }

        const batchTxb = new Transaction();
        batchTxb.setSender(adminWallet.getAddress());

        // Use fresh object versions
        const freshAdminCapId = adminCapObject.data.objectId;
        const freshRegistryId = registryObject.data.objectId;

        for (const milestone of batch) {
          batchTxb.moveCall({
            target: `${packageId}::achievement_system::delete_milestone_definition`,
            arguments: [
              batchTxb.object(freshAdminCapId),
              batchTxb.object(freshRegistryId),
              batchTxb.pure.u8(milestone.categoryCode),
              batchTxb.pure.u8(milestone.level),
              batchTxb.object('0x6'), // Clock
            ],
          });
        }

        // Calculate gas budget based on batch size
        const gasMultiplier = Math.min(Math.max(2, Math.ceil(batch.length / 2)), 10);
        const gasBudget = config.sui.gasBudget * gasMultiplier;
        batchTxb.setGasBudget(gasBudget);

        BadgeLogger.debug('Deleting milestone batch', {
          batchSize: batch.length,
          gasBudget,
          milestones: batch.map(m => `${m.category}:${m.level}`),
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

        // Mark all in batch as successful
        for (const milestone of batch) {
          results.push({
            category: milestone.category,
            level: milestone.level,
            success: true,
          });
          totalDeleted++;
        }

        BadgeLogger.info('Milestone deletion batch completed', {
          batchSize: batch.length,
          digest: result.digest,
          totalDeleted,
          remaining: milestonesToDelete.length - totalDeleted,
        });

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < milestonesToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a "milestone not found" error - if so, try deleting individually
        const isMilestoneNotFound = errorMsg.includes('MoveAbort') && errorMsg.includes(', 1)');
        
        if (isMilestoneNotFound && batch.length > 1) {
          // Try deleting individually to find which ones don't exist
          BadgeLogger.warn('Batch deletion failed with milestone not found, trying individually', {
            batchSize: batch.length,
          });
          
          for (const milestone of batch) {
            try {
              // Fetch fresh object versions for each individual deletion
              const adminCapObj = await client.getObject({
                id: adminCapId,
                options: { showPreviousTransaction: false },
              });
              
              const registryObj = await client.getObject({
                id: registryId,
                options: { showPreviousTransaction: false },
              });
              
              if (adminCapObj.error || !adminCapObj.data || registryObj.error || !registryObj.data) {
                throw new Error('Failed to fetch object versions');
              }

              const singleTxb = new Transaction();
              singleTxb.setSender(adminWallet.getAddress());
              singleTxb.moveCall({
                target: `${packageId}::achievement_system::delete_milestone_definition`,
                arguments: [
                  singleTxb.object(adminCapObj.data.objectId),
                  singleTxb.object(registryObj.data.objectId),
                  singleTxb.pure.u8(milestone.categoryCode),
                  singleTxb.pure.u8(milestone.level),
                  singleTxb.object('0x6'), // Clock
                ],
              });
              singleTxb.setGasBudget(config.sui.gasBudget * 2);

              const singleResult = await executeTransactionWithFinalization(
                client,
                adminWallet.getKeypair(),
                singleTxb,
                {
                  logger: {
                    info: (msg, data) => BadgeLogger.info(msg, data),
                    warn: (msg, data) => BadgeLogger.warn(msg, data),
                    error: (msg, data) => BadgeLogger.error(msg, data),
                  },
                }
              );

              results.push({
                category: milestone.category,
                level: milestone.level,
                success: true,
              });
              totalDeleted++;
            } catch (individualError) {
              const individualErrorMsg = individualError instanceof Error ? individualError.message : 'Unknown error';
              const isNotFound = individualErrorMsg.includes('MoveAbort') && individualErrorMsg.includes(', 1)');
              
              results.push({
                category: milestone.category,
                level: milestone.level,
                success: false,
                error: isNotFound ? 'Milestone does not exist on-chain' : individualErrorMsg,
              });
            }
          }
        } else {
          BadgeLogger.error('Milestone deletion batch failed', {
            batchSize: batch.length,
            error: errorMsg,
          });

          // Mark all in batch as failed
          for (const milestone of batch) {
            results.push({
              category: milestone.category,
              level: milestone.level,
              success: false,
              error: errorMsg,
            });
          }
        }
      }
    }

    // Clear cache
    const achievementService = getAchievementService();
    (achievementService as any).milestoneDefinitionsCache = null;

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: errorCount === 0,
      message: errorCount === 0
        ? `Successfully cleared ${totalDeleted} milestone definition(s)`
        : `Cleared ${totalDeleted} milestone(s) with ${errorCount} error(s)`,
      deleted: totalDeleted,
      errors: errorCount,
      results,
    });
  }
);


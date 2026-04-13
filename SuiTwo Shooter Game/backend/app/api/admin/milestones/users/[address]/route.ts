// ==========================================
// Admin Milestone User Data API Route
// ==========================================
// GET: Get user milestone data (stats, claimed, eligible)
// Supports both new and old contracts via ?contract=old query parameter

import { NextRequest } from 'next/server';
import { getAchievementService } from '@/lib/services/achievements/core/achievement-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getConfig } from '@/config/config';
import { buildPlatformCallOptions, getSonarClient } from '@/lib/services/platform/client/platform-client';
import {
  MigrationApiUnavailableError,
  migrationApiReadOldPlayerClaimedMilestones,
} from '@/lib/services/migration/migration-api-client';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// GET: Get user milestone data (stats, claimed, eligible)
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);
    
    if (!address) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'Player address is required'
      );
    }

    // Verify admin wallet is initialized
    const adminAddress = getAdminWalletService().getAddress();
    if (!adminAddress) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Admin wallet not initialized'
      );
    }

    // Get contract selection from query params (default: 'new')
    const { searchParams } = new URL(request.url);
    let contractSelection = searchParams.get('contract') || 'new';
    const clearCache = searchParams.get('clearCache') === 'true';

    // For 'both', default to 'new' for now (can be enhanced later to merge data)
    if (contractSelection === 'both') {
      contractSelection = 'new';
    }

    PlatformLogger.info('Fetching user milestone data', { 
      address, 
      contractSelection 
    });

    const config = getConfig();

    // Handle old contract
    if (contractSelection === 'old') {
      const oldPackageId = config.contracts.oldAchievementPackageId;
      const oldRegistryId = config.contracts.oldAchievementRegistryId;

      if (!oldPackageId || !oldRegistryId) {
        throw new PlatformError(
          PlatformErrorCode.CONFIG_MISSING,
          'Old contract addresses not configured. Please set OLD_ACHIEVEMENT_PACKAGE_ID and OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID in environment variables.'
        );
      }

      try {
        // 1. Get stats from old contract (similar to stats route)
        const network = config.sui.network;
        const rpcUrl = network === 'testnet'
          ? getFullnodeUrl('testnet')
          : network === 'mainnet'
          ? getFullnodeUrl('mainnet')
          : config.sui.rpcUrl;
        const client = new SuiClient({ url: rpcUrl });
        const readClient = getSonarClient();

        // Get old stats
        const oldStatsPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 
                                   process.env.OLD_GAME_SCORE_CONTRACT || 
                                   oldPackageId;
        const oldStatsRegistryId = config.contracts.oldStatisticsRegistryId;

        let stats: any = {
          totalGames: 0,
          bestScore: 0,
          bestDistance: 0,
          bestCoins: 0,
          bestBossesDefeated: 0,
          bestEnemiesDefeated: 0,
          bestCoinStreak: 0,
          totalScore: 0,
          totalDistance: 0,
          totalCoins: 0,
          totalBossesDefeated: 0,
          totalEnemiesDefeated: 0,
        };

        if (oldStatsPackageId && oldStatsRegistryId && oldStatsRegistryId !== '' && oldStatsRegistryId !== '0x...') {
          try {
            const txb = new Transaction();
            txb.setSender(adminAddress);
            txb.moveCall({
              target: `${oldStatsPackageId}::score_submission::get_player_stats`,
              arguments: [
                txb.object(oldStatsRegistryId),
                txb.pure.address(address),
              ],
            });

            const result = await readClient.devInspectTransactionBlock({
              sender: adminAddress,
              transactionBlock: txb,
            }) as { results?: Array<{ returnValues?: unknown[] }> };

            if (result.results && result.results[0] && result.results[0].returnValues) {
              const returnValues = result.results[0].returnValues;
              
              const parseU64FromBytes = (byteArray: number[]): number => {
                if (!Array.isArray(byteArray) || byteArray.length !== 8) return 0;
                let value = 0;
                for (let i = 0; i < 8; i++) {
                  value += byteArray[i] * Math.pow(256, i);
                }
                return value;
              };

              const parseU64 = (val: any): number => {
                if (Array.isArray(val) && Array.isArray(val[0])) {
                  return parseU64FromBytes(val[0] as number[]);
                }
                return 0;
              };

              if (returnValues.length >= 16) {
                const hasStatsByteArray = Array.isArray(returnValues[0]) && Array.isArray(returnValues[0][0]) 
                  ? returnValues[0][0] 
                  : [];
                const hasStats = Array.isArray(hasStatsByteArray) && hasStatsByteArray.length > 0 && hasStatsByteArray[0] === 1;

                if (hasStats) {
                  stats = {
                    totalGames: parseU64(returnValues[1]),
                    bestScore: parseU64(returnValues[2]),
                    bestDistance: parseU64(returnValues[3]),
                    bestCoins: parseU64(returnValues[4]),
                    bestBossesDefeated: parseU64(returnValues[5]),
                    bestEnemiesDefeated: parseU64(returnValues[6]),
                    bestCoinStreak: parseU64(returnValues[7]),
                    totalScore: parseU64(returnValues[8]),
                    totalDistance: parseU64(returnValues[9]),
                    totalCoins: parseU64(returnValues[10]),
                    totalBossesDefeated: parseU64(returnValues[11]),
                    totalEnemiesDefeated: parseU64(returnValues[12]),
                  };
                }
              }
            }
          } catch (error) {
            PlatformLogger.warn('Error fetching old stats', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // 2. Get milestone definitions from new contract (needed for both claimed mapping and eligible calculation)
        const achievementService = getAchievementService();
        const definitions = await achievementService.getMilestoneDefinitions();

        // 3. Get claimed milestones from old contract (via platform API)
        let claimedResult;
        try {
          claimedResult = await migrationApiReadOldPlayerClaimedMilestones({
            oldPackageId,
            oldRegistryId,
            playerAddress: address,
          });
        } catch (err) {
          if (err instanceof MigrationApiUnavailableError) {
            throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
          }
          throw err;
        }

        // Category number to name mapping
        const CATEGORY_NAMES: Record<number, string> = {
          1: 'gamesPlayed',
          2: 'bossesPerGame',
          3: 'bossesCumulative',
          4: 'scorePerGame',
          5: 'scoreCumulative',
          6: 'distancePerGame',
          7: 'distanceCumulative',
          8: 'coinsPerGame',
          9: 'coinsCumulative',
          10: 'enemiesPerGame',
          11: 'enemiesCumulative',
          12: 'coinStreak',
        };

        let claimed: number[] = [];
        if (claimedResult.success && claimedResult.claimed) {
          // Find the player's claimed milestones
          const playerClaimed = claimedResult.claimed.find(c => 
            c.player.toLowerCase() === address.toLowerCase()
          );

          if (playerClaimed && playerClaimed.categories) {
            // For old contract, we can't map to milestone IDs directly
            // But we can try to find matching milestones by category + level
            // Try to map old contract claims to milestone IDs
            const mappedClaimedIds: number[] = [];
            for (const [categoryNumStr, levels] of Object.entries(playerClaimed.categories)) {
              const categoryNum = Number(categoryNumStr);
              const categoryName = CATEGORY_NAMES[categoryNum];
              
              if (categoryName && definitions[categoryName]) {
                const categoryDefs = definitions[categoryName];
                const levelsArray = Array.isArray(levels) ? levels : [];
                
                // For each claimed level, try to find matching milestone by level number
                for (const level of levelsArray) {
                  // Find milestone by level (old contract uses 1-based level numbers)
                  const milestone = categoryDefs.find(d => d.level === level);
                  if (milestone && milestone.milestoneId !== undefined && milestone.milestoneId !== null) {
                    mappedClaimedIds.push(milestone.milestoneId);
                  }
                }
              }
            }
            
            claimed = mappedClaimedIds;
            PlatformLogger.info('Found claimed milestones in old contract', {
              address,
              categories: Object.keys(playerClaimed.categories).length,
              totalLevels: Object.values(playerClaimed.categories).reduce((sum, levels) => sum + (Array.isArray(levels) ? levels.length : 0), 0),
              mappedToMilestoneIds: mappedClaimedIds.length,
            });
          }
        }

        // 4. Calculate eligible milestones using stats and definitions from new contract
        
        // Map stats to match the format expected by checkCategory
        const statsForEligible = {
          totalGames: stats.totalGames,
          bestBossesDefeated: stats.bestBossesDefeated,
          totalBossesDefeated: stats.totalBossesDefeated,
          bestScore: stats.bestScore,
          totalScore: stats.totalScore,
          bestDistance: stats.bestDistance,
          totalDistance: stats.totalDistance,
          bestCoins: stats.bestCoins,
          totalCoins: stats.totalCoins,
          bestEnemiesDefeated: stats.bestEnemiesDefeated,
          totalEnemiesDefeated: stats.totalEnemiesDefeated,
          bestCoinStreak: stats.bestCoinStreak,
        };

        // Calculate eligible milestones using the same logic as getEligibleAchievements
        const eligible: any[] = [];
        
        // Helper function to check a category (similar to checkCategory in achievement-service)
        const checkCategoryForOld = (
          category: string,
          currentValue: number,
          claimedIds: number[],
          definitions: Record<string, any[]>
        ): any[] => {
          const categoryDefinitions = definitions[category];
          if (!categoryDefinitions) {
            return [];
          }

          const eligibleForCategory: any[] = [];
          const claimedIdsSet = new Set(claimedIds);

          for (const definition of categoryDefinitions) {
            const reached = currentValue >= definition.threshold;
            const hasMilestoneId = definition.milestoneId !== undefined && definition.milestoneId !== null;
            const isClaimed = hasMilestoneId && definition.milestoneId !== undefined
              ? claimedIdsSet.has(definition.milestoneId)
              : false;

            if (reached && !isClaimed) {
              eligibleForCategory.push({
                category,
                threshold: definition.threshold,
                credits: definition.credits,
                items: definition.items || [],
                milestoneId: definition.milestoneId,
              });
            }
          }

          return eligibleForCategory;
        };

        // Check each category
        eligible.push(...checkCategoryForOld('gamesPlayed', statsForEligible.totalGames, claimed, definitions));
        eligible.push(...checkCategoryForOld('bossesPerGame', statsForEligible.bestBossesDefeated, claimed, definitions));
        eligible.push(...checkCategoryForOld('bossesCumulative', statsForEligible.totalBossesDefeated, claimed, definitions));
        eligible.push(...checkCategoryForOld('scorePerGame', statsForEligible.bestScore, claimed, definitions));
        eligible.push(...checkCategoryForOld('scoreCumulative', statsForEligible.totalScore, claimed, definitions));
        eligible.push(...checkCategoryForOld('distancePerGame', statsForEligible.bestDistance, claimed, definitions));
        eligible.push(...checkCategoryForOld('distanceCumulative', statsForEligible.totalDistance, claimed, definitions));
        eligible.push(...checkCategoryForOld('coinsPerGame', statsForEligible.bestCoins, claimed, definitions));
        eligible.push(...checkCategoryForOld('coinsCumulative', statsForEligible.totalCoins, claimed, definitions));
        eligible.push(...checkCategoryForOld('enemiesPerGame', statsForEligible.bestEnemiesDefeated, claimed, definitions));
        eligible.push(...checkCategoryForOld('enemiesCumulative', statsForEligible.totalEnemiesDefeated, claimed, definitions));
        eligible.push(...checkCategoryForOld('coinStreak', statsForEligible.bestCoinStreak, claimed, definitions));

        PlatformLogger.info('Successfully loaded old contract milestone data', {
          address,
          hasStats: stats.totalGames > 0 || stats.bestScore > 0,
          claimedCount: claimed.length,
          eligibleCount: eligible.length,
        });

        return {
          success: true,
          stats,
          claimed,
          eligible,
        };
      } catch (error) {
        PlatformLogger.error('Error fetching old contract milestone data', {
          address,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new PlatformError(
          PlatformErrorCode.INTERNAL_ERROR,
          `Failed to get user milestone data from old contract: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Handle new contract (default)
    const achievementService = getAchievementService();
    
    if (clearCache) {
      achievementService.clearMilestoneDefinitionsCache();
      PlatformLogger.info('Milestone definitions public cache cleared for user data fetch');
    }
    
    const platformOptions = buildPlatformCallOptions(request, undefined);
    const result = await achievementService.getUserMilestoneData(address, platformOptions);

    if (!result.success) {
      throw new PlatformError(
        PlatformErrorCode.INTERNAL_ERROR,
        result.error || 'Failed to get user milestone data'
      );
    }

    return {
      success: true,
      stats: result.stats,
      claimed: result.claimed,
      eligible: result.eligible,
    };
  }
);

// ==========================================
// Migration Script: Add milestone_id to Existing Milestones
// ==========================================
// This script adds stable milestone_id to all existing milestones

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '../config/config';
import { getAdminWalletService } from '../lib/sui/admin-wallet-service';
import { BadgeLogger } from '../lib/sui/badge-logger';

const CATEGORY_CODES: Record<string, number> = {
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

interface MilestoneInfo {
  category: number;
  categoryName: string;
  level: number;
  threshold: number;
  milestoneId: number;
}

async function addMilestoneIds() {
  const config = getConfig();
  const adminWallet = getAdminWalletService();
  
  const packageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;
  const registryId = config.contracts.achievementRegistry;
  const adminCapId = config.contracts.achievementAdminCap;

  if (!packageId || !registryId || !adminCapId) {
    throw new Error('Achievement system contract not configured');
  }

  const client = config.sui.network === 'testnet'
    ? adminWallet.getTestnetClient()
    : adminWallet.getMainnetClient();

  BadgeLogger.info('Starting milestone ID migration', {
    packageId,
    registryId,
    network: config.sui.network,
  });

  // Step 1: Get all existing milestones
  const milestones: MilestoneInfo[] = [];
  let nextId = 1;

  for (const [categoryName, categoryCode] of Object.entries(CATEGORY_CODES)) {
    BadgeLogger.info(`Fetching milestones for category: ${categoryName}`, { categoryCode });

    // Get all milestone levels for this category
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

    if (levelsResult.results && levelsResult.results[0] && 'returnValues' in levelsResult.results[0]) {
      const returnValues = levelsResult.results[0].returnValues;
      if (returnValues && returnValues.length > 0) {
        const val = returnValues[0];
        let byteArray: number[] | null = null;

        // Parse vector<u8> return value
        if (Array.isArray(val)) {
          if (val.length === 2 && typeof val[0] === 'string') {
            // [base64String, "type"]
            try {
              const buffer = Buffer.from(val[0], 'base64');
              byteArray = Array.from(buffer);
            } catch (e) {
              BadgeLogger.warn(`Failed to parse base64 for ${categoryName}`, { error: e });
            }
          } else if (val.length > 0 && typeof val[0] === 'number') {
            byteArray = val as number[];
          }
        }

        if (byteArray && byteArray.length > 0) {
          const length = byteArray[0];
          const levels: number[] = [];
          
          for (let i = 0; i < length && i < byteArray.length - 1; i++) {
            const level = byteArray[1 + i];
            if (level > 0) {
              levels.push(level);
            }
          }

          BadgeLogger.info(`Found ${levels.length} milestones for ${categoryName}`, { levels });

          // Get threshold for each level
          for (const level of levels) {
            const defTxb = new Transaction();
            defTxb.setSender(adminWallet.getAddress());
            defTxb.moveCall({
              target: `${packageId}::achievement_system::get_milestone_definition_full`,
              arguments: [
                defTxb.object(registryId),
                defTxb.pure.u8(categoryCode),
                defTxb.pure.u8(level),
              ],
            });

            const defResult = await client.devInspectTransactionBlock({
              sender: adminWallet.getAddress(),
              transactionBlock: defTxb,
            });

            if (defResult.results && defResult.results[0] && 'returnValues' in defResult.results[0]) {
              const returnValues = defResult.results[0].returnValues;
              if (returnValues && returnValues.length >= 4) {
                // Parse (exists: bool, threshold: u64, credits: u64, items: vector<ItemReward>)
                const existsBytes = returnValues[0][0] as number[] | string;
                const exists = Array.isArray(existsBytes) && existsBytes.length > 0 && existsBytes[0] === 1;

                if (exists) {
                  // Parse threshold (u64 - 8 bytes)
                  const thresholdBytes = returnValues[1];
                  let threshold = 0;
                  if (Array.isArray(thresholdBytes)) {
                    if (thresholdBytes.length === 2 && typeof thresholdBytes[0] === 'string') {
                      const buffer = Buffer.from(thresholdBytes[0], 'base64');
                      threshold = buffer.readBigUInt64LE(0);
                    }
                  }

                  milestones.push({
                    category: categoryCode,
                    categoryName,
                    level,
                    threshold: Number(threshold),
                    milestoneId: nextId++,
                  });

                  BadgeLogger.debug(`Added milestone`, {
                    categoryName,
                    level,
                    threshold: Number(threshold),
                    milestoneId: nextId - 1,
                  });
                }
              }
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    }
  }

  BadgeLogger.info(`Found ${milestones.length} total milestones to migrate`);

  // Step 2: Sort by category and threshold for consistent ID assignment
  milestones.sort((a, b) => {
    if (a.category !== b.category) return a.category - b.category;
    return a.threshold - b.threshold;
  });

  // Reassign IDs in sorted order
  milestones.forEach((milestone, index) => {
    milestone.milestoneId = index + 1;
  });

  // Step 3: Update each milestone with its ID
  BadgeLogger.info('Updating milestones with IDs...');

  for (const milestone of milestones) {
    try {
      const txb = new Transaction();
      txb.setSender(adminWallet.getAddress());
      txb.moveCall({
        target: `${packageId}::achievement_system::update_milestone_id`,
        arguments: [
          txb.object(adminCapId),
          txb.object(registryId),
          txb.pure.u8(milestone.category),
          txb.pure.u8(milestone.level),
          txb.pure.u64(milestone.milestoneId),
          txb.object('0x6'), // Clock
        ],
      });

      txb.setGasBudget(config.sui.gasBudget);

      const transactionBytes = await txb.build({ client });
      const result = await client.signAndExecuteTransaction({
        signer: adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        BadgeLogger.info(`Updated milestone with ID`, {
          category: milestone.categoryName,
          level: milestone.level,
          threshold: milestone.threshold,
          milestoneId: milestone.milestoneId,
          digest: result.digest,
        });
      } else {
        BadgeLogger.error(`Failed to update milestone`, {
          category: milestone.categoryName,
          level: milestone.level,
          error: result.effects?.status?.error,
        });
      }

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      BadgeLogger.error(`Error updating milestone`, {
        category: milestone.categoryName,
        level: milestone.level,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  BadgeLogger.info('Milestone ID migration completed', {
    totalMilestones: milestones.length,
    milestonesByCategory: milestones.reduce((acc, m) => {
      acc[m.categoryName] = (acc[m.categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });
}

// Run migration
addMilestoneIds()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

// ==========================================
// Milestone Definitions Migration Script
// ==========================================
// Deploys hardcoded milestone definitions from AchievementService to on-chain
// This script reads the current hardcoded definitions and adds them to the AchievementRegistry

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables FIRST, before any other imports
// Try multiple possible paths for .env.local
const possiblePaths = [
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../.env.local'),
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`📁 Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  Could not find .env.local file, trying default dotenv behavior...');
  dotenv.config(); // Try default .env file
}

// Set dummy values for config validation if not present (not needed for migration)
// Must be set before importing modules that use config
if (!process.env.MEWS_TOKEN_TYPE_ID) {
  process.env.MEWS_TOKEN_TYPE_ID = '0x0';
}
if (!process.env.MIN_TOKEN_BALANCE) {
  process.env.MIN_TOKEN_BALANCE = '0';
}

// Now import other modules (after env vars are set)
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { bech32 } from 'bech32';

// Known stuck transaction digests
const STUCK_TRANSACTIONS = [
  'EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A',
  'H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc',
];

// Milestone definitions (copied from AchievementService)
interface MilestoneDefinition {
  threshold: number;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
}

const milestoneDefinitions: Record<string, MilestoneDefinition[]> = {
  gamesPlayed: [
    { threshold: 5, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 15, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 35, credits: 3, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
    { threshold: 75, credits: 5, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
    { threshold: 150, credits: 10, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
    { threshold: 300, credits: 15, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
    { threshold: 500, credits: 20, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }, { itemId: 'coinTractorBeam', level: 3, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
  ],
  bossesPerGame: [
    { threshold: 2, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 4, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
    { threshold: 6, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
    { threshold: 8, credits: 3, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }] },
    { threshold: 10, credits: 5, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
    { threshold: 12, credits: 8, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
  ],
  bossesCumulative: [
    { threshold: 5, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }] },
    { threshold: 10, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 25, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 50, credits: 3, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }] },
    { threshold: 100, credits: 5, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
    { threshold: 200, credits: 8, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
    { threshold: 500, credits: 10, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
  ],
  scorePerGame: [
    { threshold: 10000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 25000, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
    { threshold: 50000, credits: 1, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
    { threshold: 100000, credits: 2, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 150000, credits: 3, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 200000, credits: 5, items: [{ itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
  ],
  scoreCumulative: [
    { threshold: 50000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 100000, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 250000, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 500000, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 1000000, credits: 3, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 2500000, credits: 5, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }] },
    { threshold: 5000000, credits: 10, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
  ],
  distancePerGame: [
    { threshold: 5000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 10000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
    { threshold: 15000, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
    { threshold: 25000, credits: 2, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 40000, credits: 3, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 60000, credits: 5, items: [{ itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
  ],
  distanceCumulative: [
    { threshold: 25000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 50000, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 100000, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 250000, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 500000, credits: 3, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 1000000, credits: 5, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }] },
    { threshold: 2500000, credits: 10, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
  ],
  coinsPerGame: [
    { threshold: 25, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }] },
    { threshold: 50, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
    { threshold: 75, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
    { threshold: 100, credits: 2, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 125, credits: 3, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 150, credits: 5, items: [{ itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'coinTractorBeam', level: 3, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }] },
  ],
  coinsCumulative: [
    { threshold: 250, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }] },
    { threshold: 500, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
    { threshold: 1000, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
    { threshold: 2500, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 5000, credits: 2, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 10000, credits: 3, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 25000, credits: 10, items: [{ itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'coinTractorBeam', level: 3, quantity: 1 }, { itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }] },
  ],
  enemiesPerGame: [
    { threshold: 25, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 50, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
    { threshold: 100, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
    { threshold: 250, credits: 2, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 400, credits: 3, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }] },
    { threshold: 500, credits: 5, items: [{ itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }] },
  ],
  enemiesCumulative: [
    { threshold: 100, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 250, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 500, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 1000, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
    { threshold: 2500, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
    { threshold: 5000, credits: 3, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
    { threshold: 10000, credits: 5, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }] },
  ],
  coinStreak: [
    { threshold: 10, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }] },
    { threshold: 20, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
    { threshold: 30, credits: 1, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
    { threshold: 40, credits: 2, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 2, quantity: 1 }] },
    { threshold: 50, credits: 3, items: [{ itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'coinTractorBeam', level: 3, quantity: 1 }] },
  ],
};

// Category code mapping
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

// Item ID to u8 mapping
function itemIdToU8(itemId: string): number {
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
    throw new Error(`Unknown item ID: ${itemId}`);
  }
  return value;
}

/**
 * Add multiple milestone definitions for a category in a single batch transaction
 */
async function addMilestoneDefinitionsBatch(
  client: SuiClient,
  packageId: string,
  registryId: string,
  adminCapId: string,
  category: number,
  definitions: Array<{
    milestoneLevel: number;
    threshold: number;
    credits: number;
    items: Array<{ itemId: string; level: number; quantity: number }>;
  }>,
  adminKeypair: Ed25519Keypair
): Promise<{ success: boolean; digest?: string; error?: string; added?: number }> {
  try {
    const txb = new Transaction();
    
    // Build the move call using entry function with parallel vectors
    const moveCallTarget = `${packageId}::achievement_system::add_milestone_definition_entry`;
    
    let addedCount = 0;
    
    // Add each milestone definition as a separate move call in the same transaction
    for (const definition of definitions) {
      // Convert items to parallel vectors
      const itemIds: number[] = [];
      const itemLevels: number[] = [];
      const itemQuantities: bigint[] = [];
      
      for (const item of definition.items) {
        itemIds.push(itemIdToU8(item.itemId));
        itemLevels.push(item.level);
        itemQuantities.push(BigInt(item.quantity));
      }
      
      txb.moveCall({
        target: moveCallTarget,
        arguments: [
          txb.object(adminCapId),           // admin_cap: &AdminCapability
          txb.object(registryId),            // registry: &mut AchievementRegistry
          txb.pure.u8(category),             // category: u8
          txb.pure.u8(definition.milestoneLevel),      // milestone_level: u8
          txb.pure.u64(definition.threshold),           // threshold: u64
          txb.pure.u64(definition.credits),             // credits: u64
          txb.pure('vector<u8>', itemIds),  // item_ids: vector<u8>
          txb.pure('vector<u8>', itemLevels), // item_levels: vector<u8>
          txb.pure('vector<u64>', itemQuantities), // item_quantities: vector<u64>
          txb.object('0x6'),                 // clock: &Clock
        ],
      });
      
      addedCount++;
    }
    
    txb.setSender(adminKeypair.toSuiAddress());
    // Increase gas budget for batch (100M per milestone, with some overhead)
    // Cap at reasonable maximum to avoid issues
    const gasBudget = Math.min(100_000_000 * Math.max(addedCount, 1) + 50_000_000, 1_000_000_000);
    txb.setGasBudget(gasBudget);
    
    // Select an unlocked gas coin to avoid "already locked" errors
    // This is similar to what tournament-scheduler does
    try {
      const coins = await client.getCoins({
        owner: adminKeypair.toSuiAddress(),
        coinType: '0x2::sui::SUI',
      });
      
      if (coins.data && coins.data.length > 0) {
        console.log(`   💰 Found ${coins.data.length} gas coin(s) in admin wallet`);
        
        // Sort coins by version (ascending) to prefer coins with lower version numbers
        // New coins from faucet have lower versions and are less likely to be locked
        const sortedCoins = [...coins.data].sort((a, b) => {
          return parseInt(a.version) - parseInt(b.version);
        });
        
        // Known locked coins (from previous runs and current errors)
        // Note: These may not actually be locked anymore (transactions pruned), but we'll avoid them to be safe
        const lockedCoinIds = new Set([
          '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a', // Original locked coin
          '0x059b1843b59dd50f48aa1f810a51624e1b41b57c7ab9bc6f65ffb1d4397f6c31', // Previously locked
          '0x5046c7a1f5858f08d45c2f122fd520fb7b2fc81ce3855e5ddce53296d6ddd949', // Previously locked
        ]);
        
        // Filter out known locked coins
        const availableCoins = sortedCoins.filter(coin => !lockedCoinIds.has(coin.coinObjectId));
        
        // If no coins available after filtering, try all coins (maybe they're unlocked now)
        const coinsToUse = availableCoins.length > 0 ? availableCoins : sortedCoins;
        
        console.log(`   💰 After filtering locked coins: ${coinsToUse.length} available coin(s)`);
        
        if (coinsToUse.length > 0) {
          // Log all available coins for debugging
          coinsToUse.forEach(coin => {
            const balanceSui = (BigInt(coin.balance) / BigInt(1_000_000_000)).toString();
            const isLocked = lockedCoinIds.has(coin.coinObjectId);
            console.log(`      - Coin ${coin.coinObjectId.substring(0, 10)}...: ${balanceSui} SUI (version: ${coin.version})${isLocked ? ' [LOCKED - filtered]' : ''}`);
          });
        }
        
        // Select a coin with sufficient balance (need at least 0.1 SUI for gas)
        // Prefer coins with higher balance first, and prefer newer coins (higher version) to avoid stale locks
        const minBalance = 100_000_000; // 0.1 SUI
        const coinsWithBalance = coinsToUse.filter(coin => BigInt(coin.balance) >= BigInt(minBalance));
        // Sort by: 1) balance descending, 2) version descending (newer coins first)
        coinsWithBalance.sort((a, b) => {
          const balanceA = BigInt(a.balance);
          const balanceB = BigInt(b.balance);
          if (balanceA !== balanceB) {
            return balanceA > balanceB ? -1 : 1;
          }
          // If balance is same, prefer newer coin (higher version)
          const versionA = parseInt(a.version);
          const versionB = parseInt(b.version);
          return versionB - versionA; // Descending (newer first)
        });
        const selectedCoin = coinsWithBalance[0];
        
        if (selectedCoin) {
          const balanceSui = (BigInt(selectedCoin.balance) / BigInt(1_000_000_000)).toString();
          console.log(`   💰 Using gas coin: ${selectedCoin.coinObjectId.substring(0, 10)}... (${balanceSui} SUI, version: ${selectedCoin.version})`);
          // Use the selected coin as gas
          txb.setGasPayment([{
            objectId: selectedCoin.coinObjectId,
            version: selectedCoin.version,
            digest: selectedCoin.digest,
          }]);
        } else {
          console.error(`   ❌ No unlocked coin with sufficient balance (>= 0.1 SUI) found.`);
          console.error(`   💡 Solution: Wait for pending transactions to complete, or add more SUI to admin wallet.`);
          console.error(`   💡 Locked transactions: EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A, H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc`);
          // Don't proceed - this will fail anyway
          return {
            success: false,
            error: 'No unlocked gas coins available. Please wait for pending transactions to complete or add more SUI to admin wallet.',
          };
        }
      } else {
        console.error(`   ❌ No gas coins found in admin wallet!`);
        return {
          success: false,
          error: 'No SUI coins available in admin wallet for gas. Please add SUI to the admin wallet.',
        };
      }
    } catch (coinError) {
      // If coin selection fails, continue without it (SDK will auto-select)
      console.warn(`   ⚠️  Could not select specific gas coin: ${coinError instanceof Error ? coinError.message : 'Unknown error'}`);
    }
    
    // Retry logic for lock errors (similar to store-service)
    let retries = 3;
    let result: any = null;
    let lastError: any = null;
    
    while (retries > 0) {
      try {
        const transactionBytes = await txb.build({ client });
        result = await client.signAndExecuteTransaction({
          signer: adminKeypair,
          transaction: transactionBytes,
          options: {
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
        
        if (result.effects?.status?.status === 'success') {
          break; // Success!
        }
        
        const errorMsg = result.effects?.status?.error || 'Unknown error';
        
        // Check if it's an "already locked" error - retry with backoff
        if (errorMsg.includes('already locked') && retries > 1) {
          const waitTime = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
          console.log(`   ⚠️  Coin locked, waiting ${waitTime}ms before retry (${retries - 1} attempts remaining)...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Refresh coin selection before retry
          const freshCoins = await client.getCoins({
            owner: adminKeypair.toSuiAddress(),
            coinType: '0x2::sui::SUI',
          });
          
          if (freshCoins.data && freshCoins.data.length > 0) {
            const sortedCoins = [...freshCoins.data].sort((a, b) => {
              return parseInt(a.version) - parseInt(b.version);
            });
            const lockedCoinIds = new Set([
              '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a',
              '0x059b1843b59dd50f48aa1f810a51624e1b41b57c7ab9bc6f65ffb1d4397f6c31',
              '0x5046c7a1f5858f08d45c2f122fd520fb7b2fc81ce3855e5ddce53296d6ddd949',
            ]);
            const availableCoins = sortedCoins.filter(coin => !lockedCoinIds.has(coin.coinObjectId));
            const coinsToUse = availableCoins.length > 0 ? availableCoins : sortedCoins;
            const minBalance = 100_000_000;
            const coinsWithBalance = coinsToUse.filter(coin => BigInt(coin.balance) >= BigInt(minBalance));
            coinsWithBalance.sort((a, b) => {
              const balanceA = BigInt(a.balance);
              const balanceB = BigInt(b.balance);
              if (balanceA > balanceB) return -1;
              if (balanceA < balanceB) return 1;
              return 0;
            });
            const selectedCoin = coinsWithBalance[0];
            
            if (selectedCoin) {
              // Rebuild transaction with fresh coin
              txb.setGasPayment([{
                objectId: selectedCoin.coinObjectId,
                version: selectedCoin.version,
                digest: selectedCoin.digest,
              }]);
              console.log(`   💰 Retrying with fresh coin: ${selectedCoin.coinObjectId.substring(0, 10)}...`);
            }
          }
          
          retries--;
          continue;
        }
        
        // Other error or out of retries
        lastError = errorMsg;
        break;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a lock error in the exception
        if (errorMsg.includes('already locked') && retries > 1) {
          const waitTime = Math.pow(2, 3 - retries) * 1000;
          console.log(`   ⚠️  Lock error in exception, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries--;
          continue;
        }
        
        lastError = errorMsg;
        break;
      }
    }
    
    if (!result || result.effects?.status?.status !== 'success') {
      const errorMsg = lastError || result?.effects?.status?.error || 'Unknown error';
      
      if (errorMsg.includes('already locked')) {
        // Check if AdminCap is locked (this blocks all transactions)
        if (errorMsg.includes(adminCapId)) {
          return {
            success: false,
            error: `Transaction failed: AdminCap is locked by pending transaction.\n   ⚠️  AdminCap (${adminCapId.substring(0, 10)}...) is locked.\n   💡 Solution: Wait for pending transactions to complete, or check transaction status:\n      - EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A\n   💡 You can check transaction status on Sui Explorer or wait a few minutes.`,
          };
        }
        return {
          success: false,
          error: `Transaction failed after ${3 - retries} retries: ${errorMsg}\n   ⚠️  Coin is still locked after retries.\n   💡 Solution: Wait a few minutes for the network to clear, or add more SUI to create new gas coins.`,
        };
      }
      
      return {
        success: false,
        error: `Transaction failed: ${errorMsg}`,
      };
    }
    
    // CRITICAL: Wait for transaction to be finalized - FAIL HARD if it doesn't
    // This prevents the next transaction from using a still-locked coin
    try {
      console.log(`   ⏳ Waiting for transaction ${result.digest} to finalize...`);
      await client.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
        },
        timeout: 60_000, // 60 second timeout
      });
      console.log(`   ✅ Transaction ${result.digest} finalized`);
      
      // Verify transaction actually succeeded
      const txStatus = await client.getTransactionBlock({
        digest: result.digest,
        options: { showEffects: true },
      });
      
      if (txStatus.effects?.status?.status !== 'success') {
        throw new Error(`Transaction ${result.digest} did not succeed: ${txStatus.effects?.status?.error || 'Unknown error'}`);
      }
    } catch (waitError) {
      // This is a CRITICAL error - don't continue to next transaction!
      const errorMsg = waitError instanceof Error ? waitError.message : 'Unknown error';
      return {
        success: false,
        error: `Transaction ${result.digest} did not finalize: ${errorMsg}\n   ⚠️  CRITICAL: Cannot proceed to next transaction as coin may still be locked.\n   💡 Solution: Wait for transaction to finalize, then re-run migration.`,
      };
    }
    
    return {
      success: true,
      digest: result.digest,
      added: addedCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create admin keypair from private key
 */
function createAdminKeypair(): Ed25519Keypair {
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.GAME_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Missing ADMIN_WALLET_PRIVATE_KEY or GAME_WALLET_PRIVATE_KEY environment variable');
  }
  
  // Handle bech32 format (suiprivkey1...) or hex format
  let keyBytes: Uint8Array;
  if (privateKey.startsWith('suiprivkey1')) {
    // Decode bech32 format
    try {
      const decoded = bech32.decode(privateKey);
      const bytes = bech32.fromWords(decoded.words);
      // Sui Ed25519 private keys are 32 bytes
      // Bech32 may include a version byte (33 bytes), so slice it off if present
      if (bytes.length === 33) {
        keyBytes = new Uint8Array(bytes.slice(1));
      } else if (bytes.length === 32) {
        keyBytes = new Uint8Array(bytes);
      } else {
        throw new Error(`Invalid private key length after bech32 decode. Expected 32 or 33 bytes, got ${bytes.length}`);
      }
    } catch (error) {
      throw new Error(`Failed to decode bech32 private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Hex format
    let hexKey = privateKey.trim();
    if (hexKey.startsWith('0x') || hexKey.startsWith('0X')) {
      hexKey = hexKey.slice(2);
    }
    if (hexKey.length !== 64) {
      throw new Error(`Invalid hex private key length. Expected 64 characters, got ${hexKey.length}`);
    }
    keyBytes = fromHEX(hexKey);
  }
  
  return Ed25519Keypair.fromSecretKey(keyBytes);
}

/**
 * Check which milestone levels already exist for a category
 */
async function getExistingMilestoneLevels(
  client: SuiClient,
  packageId: string,
  registryId: string,
  category: number,
  senderAddress: string
): Promise<Set<number>> {
  try {
    const txb = new Transaction();
    txb.setSender(senderAddress);
    txb.moveCall({
      target: `${packageId}::achievement_system::get_all_milestone_levels_for_category`,
      arguments: [
        txb.object(registryId),
        txb.pure.u8(category),
      ],
    });

    const result = await client.devInspectTransactionBlock({
      sender: senderAddress,
      transactionBlock: txb,
    });

    // Parse milestone levels
    const existingLevels = new Set<number>();
    if (result.results && result.results[0] && 'returnValues' in result.results[0]) {
      const returnValues = result.results[0].returnValues;
      if (returnValues && returnValues.length > 0) {
        const val = returnValues[0];
        let bytes: string;
        let type: string;
        
        if (Array.isArray(val) && val.length === 2) {
          const [bytesVal, typeVal] = val as unknown[];
          if (typeof bytesVal === 'string' && typeof typeVal === 'string') {
            bytes = bytesVal;
            type = typeVal;
          } else {
            return existingLevels;
          }
        } else if (typeof val === 'string') {
          bytes = val;
          type = 'vector<u8>';
        } else {
          return existingLevels;
        }
        
        if (type === 'vector<u8>') {
          const buffer = Buffer.from(bytes, 'base64');
          const length = buffer.readUInt8(0);
          for (let i = 0; i < length; i++) {
            existingLevels.add(buffer.readUInt8(1 + i));
          }
        }
      }
    }
    
    return existingLevels;
  } catch (error) {
    console.warn(`   ⚠️  Could not check existing milestones for category ${category}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Return empty set on error - we'll try to add anyway and let the contract reject duplicates
    return new Set<number>();
  }
}

/**
 * Check status of stuck transactions and attempt to unlock coins
 */
async function checkAndUnlockCoins(client: SuiClient, adminKeypair: Ed25519Keypair): Promise<boolean> {
  console.log('🔍 Checking stuck transactions...\n');
  
  const lockedCoinId = '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a';
  
  // Check transaction statuses
  for (const txDigest of STUCK_TRANSACTIONS) {
    try {
      const txStatus = await client.getTransactionBlock({
        digest: txDigest,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      
      console.log(`   📋 Transaction ${txDigest.substring(0, 10)}...`);
      console.log(`      Status: ${txStatus.effects?.status?.status || 'unknown'}`);
      if (txStatus.effects?.status?.error) {
        console.log(`      Error: ${txStatus.effects.status.error}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch transaction ${txDigest}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Try to get fresh coin state
  try {
    const coinObject = await client.getObject({
      id: lockedCoinId,
      options: {
        showContent: true,
        showOwner: true,
        showPreviousTransaction: true,
      },
    });
    
    if (coinObject.error) {
      console.log(`   ❌ Coin not found or error: ${coinObject.error.code}`);
      return false;
    }
    
    console.log(`   💰 Locked coin state:`);
    console.log(`      Object ID: ${coinObject.data?.objectId}`);
    console.log(`      Version: ${coinObject.data?.version}`);
    console.log(`      Previous TX: ${coinObject.data?.previousTransaction}`);
    console.log(`      Owner: ${JSON.stringify(coinObject.data?.owner)}`);
    
    // Check if we can split the coin to create a new unlocked coin
    if (coinObject.data?.data && 'fields' in coinObject.data.data) {
      const balance = (coinObject.data.data as any).fields?.balance || '0';
      const balanceBigInt = BigInt(balance);
      const balanceSui = balanceBigInt / BigInt(1_000_000_000);
      
      console.log(`      Balance: ${balanceSui.toString()} SUI`);
      
      // If coin has enough balance, try to split it to create a new unlocked coin
      if (balanceBigInt >= BigInt(200_000_000)) { // At least 0.2 SUI to split
        console.log(`   🔧 Attempting to split coin to create unlocked coin...`);
        
        try {
          const txb = new Transaction();
          const coin = txb.object(lockedCoinId);
          // Split 0.1 SUI to create a new coin
          const splitCoin = txb.splitCoins(coin, [100_000_000n]); // 0.1 SUI
          txb.transferObjects([splitCoin], adminKeypair.toSuiAddress());
          
          txb.setSender(adminKeypair.toSuiAddress());
          txb.setGasBudget(50_000_000);
          
          // Try to use the coin itself as gas (might work if it's not actually locked)
          try {
            const transactionBytes = await txb.build({ client });
            const result = await client.signAndExecuteTransaction({
              signer: adminKeypair,
              transaction: transactionBytes,
              options: {
                showEffects: true,
              },
            });
            
            if (result.effects?.status?.status === 'success') {
              console.log(`   ✅ Successfully split coin! New transaction: ${result.digest}`);
              console.log(`   ⏳ Waiting for transaction to finalize...`);
              await client.waitForTransaction({
                digest: result.digest,
                options: { showEffects: true },
              });
              console.log(`   ✅ Coin split complete! You should now have an unlocked coin.\n`);
              return true;
            } else {
              console.log(`   ❌ Split transaction failed: ${result.effects?.status?.error || 'Unknown error'}`);
            }
          } catch (splitError) {
            console.log(`   ❌ Could not split coin: ${splitError instanceof Error ? splitError.message : 'Unknown error'}`);
            console.log(`   💡 This confirms the coin is still locked.`);
          }
        } catch (buildError) {
          console.log(`   ❌ Could not build split transaction: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`);
        }
      } else {
        console.log(`   ⚠️  Coin balance too low to split (need at least 0.2 SUI)`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error checking coin: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log(`\n   💡 Recommendations:`);
  console.log(`      1. Request SUI from faucet to get fresh unlocked coins`);
  console.log(`      2. Transfer SUI from another wallet to create new coins`);
  console.log(`      3. Wait for an epoch change (may unlock stuck transactions)`);
  console.log(`      4. Check Sui Explorer for transaction status\n`);
  
  return false;
}

/**
 * Check for concurrent execution and create lock file
 */
function checkConcurrentExecution(): void {
  const lockFile = path.join(__dirname, '.migration-lock');
  
  if (fs.existsSync(lockFile)) {
    const lockTime = fs.statSync(lockFile).mtime;
    const age = Date.now() - lockTime.getTime();
    const ageMinutes = Math.floor(age / (60 * 1000));
    
    if (age < 60 * 60 * 1000) { // 1 hour
      throw new Error(
        `Migration already running (lock file exists, created ${ageMinutes} minutes ago).\n` +
        `If previous run crashed, delete: ${lockFile}`
      );
    } else {
      console.warn(`⚠️  Stale lock file found (${ageMinutes} minutes old), removing...`);
      fs.unlinkSync(lockFile);
    }
  }
  
  // Create lock file
  fs.writeFileSync(lockFile, `${process.pid}\n${new Date().toISOString()}`);
  console.log(`🔒 Created lock file: ${lockFile}`);
}

/**
 * Remove lock file
 */
function removeLockFile(): void {
  const lockFile = path.join(__dirname, '.migration-lock');
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log(`🔓 Removed lock file`);
    }
  } catch (error) {
    // Ignore cleanup errors
    console.warn(`⚠️  Could not remove lock file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main migration function
 */
async function migrateMilestones() {
  console.log('🚀 Starting milestone definitions migration...\n');
  
  // Check for concurrent execution
  try {
    checkConcurrentExecution();
  } catch (error) {
    console.error('❌', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
  
  // Ensure lock file is removed on exit
  process.on('exit', removeLockFile);
  process.on('SIGINT', () => {
    removeLockFile();
    process.exit(1);
  });
  process.on('SIGTERM', () => {
    removeLockFile();
    process.exit(1);
  });
  
  // Create admin keypair directly (avoiding config import)
  const adminKeypair = createAdminKeypair();
  
  // Read config directly from env vars (bypassing getConfig to avoid validation)
  const network = process.env.SUI_TESTNET_NETWORK ? 'testnet' : 
                  process.env.SUI_MAINNET_NETWORK ? 'mainnet' :
                  (process.env.SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';
  
  const packageId = network === 'testnet'
    ? (process.env.GAME_SCORE_CONTRACT_TESTNET || process.env.GAME_SCORE_CONTRACT)?.split('::')[0]
    : (process.env.GAME_SCORE_CONTRACT_MAINNET || process.env.GAME_SCORE_CONTRACT)?.split('::')[0];
  
  const registryId = network === 'testnet'
    ? (process.env.ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET || process.env.ACHIEVEMENT_REGISTRY_OBJECT_ID)
    : (process.env.ACHIEVEMENT_REGISTRY_OBJECT_ID_MAINNET || process.env.ACHIEVEMENT_REGISTRY_OBJECT_ID);
  
  const adminCapId = network === 'testnet'
    ? (process.env.ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_TESTNET || 
       process.env.ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || 
       process.env.ACHIEVEMENT_ADMIN_CAP_OBJECT_ID ||
       process.env.ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID)
    : (process.env.ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_MAINNET || 
       process.env.ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID_MAINNET || 
       process.env.ACHIEVEMENT_ADMIN_CAP_OBJECT_ID ||
       process.env.ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID);
  
  if (!packageId || !registryId || !adminCapId) {
    console.error('❌ Missing required configuration:');
    console.error(`   Package ID: ${packageId || 'MISSING'}`);
    console.error(`   Registry ID: ${registryId || 'MISSING'}`);
    console.error(`   Admin Cap ID: ${adminCapId || 'MISSING'}`);
    console.error(`\n   Please ensure these environment variables are set:`);
    console.error(`   - GAME_SCORE_CONTRACT${network === 'testnet' ? '_TESTNET' : '_MAINNET'} (or GAME_SCORE_CONTRACT)`);
    console.error(`   - ACHIEVEMENT_REGISTRY_OBJECT_ID${network === 'testnet' ? '_TESTNET' : '_MAINNET'} (or ACHIEVEMENT_REGISTRY_OBJECT_ID)`);
    console.error(`   - ACHIEVEMENT_ADMIN_CAP_OBJECT_ID${network === 'testnet' ? '_TESTNET' : '_MAINNET'} (or ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID${network === 'testnet' ? '_TESTNET' : '_MAINNET'})`);
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log(`   Package ID: ${packageId}`);
  console.log(`   Registry ID: ${registryId}`);
  console.log(`   Admin Cap ID: ${adminCapId}`);
  console.log(`   Network: ${network}`);
  console.log(`   Admin Address: ${adminKeypair.toSuiAddress()}\n`);
  
  const client = new SuiClient({
    url: network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : getFullnodeUrl('mainnet'),
  });
  
  // Check for stuck transactions and try to unlock coins
  const unlocked = await checkAndUnlockCoins(client, adminKeypair);
  if (!unlocked) {
    console.log('⚠️  Could not unlock coins automatically. Proceeding with migration attempt...\n');
  }
  
  let totalMilestones = 0;
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  const adminAddress = adminKeypair.toSuiAddress();
  
  // Process each category
  for (const [categoryName, definitions] of Object.entries(milestoneDefinitions)) {
    const categoryCode = categoryCodes[categoryName];
    if (!categoryCode) {
      console.error(`❌ Unknown category: ${categoryName}`);
      continue;
    }
    
    console.log(`\n📁 Processing category: ${categoryName} (code: ${categoryCode})`);
    
    // Check for existing milestones
    console.log(`   🔍 Checking for existing milestones...`);
    const existingLevels = await getExistingMilestoneLevels(
      client,
      packageId,
      registryId,
      categoryCode,
      adminAddress
    );
    
    if (existingLevels.size > 0) {
      console.log(`   ✅ Found ${existingLevels.size} existing milestone(s): levels ${Array.from(existingLevels).sort((a, b) => a - b).join(', ')}`);
    } else {
      console.log(`   ℹ️  No existing milestones found for this category`);
    }
    
    // Prepare all milestones for this category, filtering out existing ones
    const milestonesToAdd: Array<{
      milestoneLevel: number;
      threshold: number;
      credits: number;
      items: Array<{ itemId: string; level: number; quantity: number }>;
    }> = [];
    
    for (let i = 0; i < definitions.length; i++) {
      const milestoneLevel = i + 1; // milestone_level starts at 1
      if (existingLevels.has(milestoneLevel)) {
        console.log(`   ⏭️  Milestone ${milestoneLevel} already exists (threshold=${definitions[i].threshold}), skipping...`);
        skippedCount++;
      } else {
        milestonesToAdd.push({
          milestoneLevel,
          threshold: definitions[i].threshold,
          credits: definitions[i].credits,
          items: definitions[i].items,
        });
      }
    }
    
    totalMilestones += definitions.length;
    
    if (milestonesToAdd.length === 0) {
      console.log(`   ✅ All ${definitions.length} milestones for this category already exist. Skipping.`);
      continue;
    }
    
    console.log(`   📦 Adding ${milestonesToAdd.length} new milestones (${existingLevels.size} already exist)...`);
    
    // Log all milestones being added
    for (const def of milestonesToAdd) {
      console.log(`   🎯 Milestone ${def.milestoneLevel}: threshold=${def.threshold}, credits=${def.credits}, items=${def.items.length}`);
    }
    
    // Add all milestones in a single batch transaction
    const result = await addMilestoneDefinitionsBatch(
      client,
      packageId,
      registryId,
      adminCapId,
      categoryCode,
      milestonesToAdd,
      adminKeypair
    );
    
    if (result.success) {
      successCount += result.added || milestonesToAdd.length;
      console.log(`   ✅ Successfully added ${result.added || milestonesToAdd.length} milestones in batch! Digest: ${result.digest}`);
    } else {
      errorCount += milestonesToAdd.length;
      console.error(`   ❌ Batch failed: ${result.error}`);
      
      // If it's "already exists" error (error code 6), retry with only missing milestones
      if (result.error?.includes('already exists') || result.error?.includes('E_MILESTONE_ALREADY_EXISTS') || 
          (result.error?.includes('MoveAbort') && result.error?.includes(', 6)'))) {
        console.log(`   ⚠️  Error code 6 detected: Some milestones already exist (E_MILESTONE_ALREADY_EXISTS)`);
        console.log(`   🔄 Checking which milestones are missing and retrying...`);
        
        // Refresh the existing milestones check
        const existingLevelsAfterError = await getExistingMilestoneLevels(
          client,
          packageId,
          registryId,
          categoryCode,
          adminAddress
        );
        
        const stillMissing = milestonesToAdd.filter(def => !existingLevelsAfterError.has(def.milestoneLevel));
        const alreadyExist = milestonesToAdd.filter(def => existingLevelsAfterError.has(def.milestoneLevel));
        
        if (alreadyExist.length > 0) {
          console.log(`   ✅ ${alreadyExist.length} milestone(s) already exist: levels ${alreadyExist.map(d => d.milestoneLevel).join(', ')}`);
          skippedCount += alreadyExist.length;
        }
        
        if (stillMissing.length > 0) {
          console.log(`   🔄 Retrying with ${stillMissing.length} missing milestone(s): levels ${stillMissing.map(d => d.milestoneLevel).join(', ')}...`);
          
          // Wait a moment for network state to sync
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Refresh coin selection for retry (coin versions may have changed)
          // This will be done inside addMilestoneDefinitionsBatch, but we need fresh coins
          
          // Retry with only missing milestones
          const retryResult = await addMilestoneDefinitionsBatch(
            client,
            packageId,
            registryId,
            adminCapId,
            categoryCode,
            stillMissing,
            adminKeypair
          );
          
          if (retryResult.success) {
            successCount += retryResult.added || stillMissing.length;
            errorCount -= milestonesToAdd.length; // Remove from errors
            console.log(`   ✅ Successfully added ${retryResult.added || stillMissing.length} remaining milestone(s)!`);
          } else {
            // Still failed - count only missing ones as errors
            errorCount -= alreadyExist.length; // Don't count existing ones as errors
            errorCount += stillMissing.length; // Count missing ones that failed
            console.log(`   ❌ Retry also failed: ${retryResult.error}`);
          }
        } else {
          // All milestones already exist
          errorCount -= milestonesToAdd.length;
          console.log(`   ✅ All milestones already exist - no action needed.`);
        }
      }
    }
    
    // Additional delay between categories to ensure previous transaction is fully processed
    // Note: We already wait for finalization above, but this adds extra safety margin
    if (result.success) {
      console.log(`   ⏳ Waiting 2 seconds before next category (transaction already finalized)...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      // If batch failed, wait longer before retrying
      console.log(`   ⏳ Batch failed, waiting 5 seconds before next category...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   Total milestones: ${totalMilestones}`);
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ⏭️  Already existed (skipped): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));
  
  // Remove lock file before exiting
  removeLockFile();
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some milestones failed to migrate. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All milestones migrated successfully!');
  }
}

// Run the migration
migrateMilestones().catch(error => {
  console.error('❌ Fatal error:', error);
  removeLockFile(); // Ensure lock file is removed on error
  process.exit(1);
});

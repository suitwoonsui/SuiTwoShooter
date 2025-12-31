// ==========================================
// Add Missing Enemies Cumulative Milestone Levels
// ==========================================
// Script to add any missing milestone levels for enemiesCumulative

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
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
  dotenv.config();
}

// Set dummy values for config validation if not present
if (!process.env.MEWS_TOKEN_TYPE_ID) {
  process.env.MEWS_TOKEN_TYPE_ID = '0x0';
}
if (!process.env.MIN_TOKEN_BALANCE) {
  process.env.MIN_TOKEN_BALANCE = '0';
}

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';

// Expected milestone definitions for enemiesCumulative
const expectedDefinitions = [
  { level: 1, threshold: 100, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
  { level: 2, threshold: 250, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
  { level: 3, threshold: 500, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
  { level: 4, threshold: 1000, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
  { level: 5, threshold: 2500, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
  { level: 6, threshold: 5000, credits: 3, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
  { level: 7, threshold: 10000, credits: 5, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }] },
];

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

// Create admin keypair
function createAdminKeypair(): Ed25519Keypair {
  const privateKeyHex = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error('ADMIN_WALLET_PRIVATE_KEY environment variable is required');
  }
  
  // Remove 0x prefix if present
  const cleanKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
  const keyBytes = fromHEX(cleanKey);
  return Ed25519Keypair.fromSecretKey(keyBytes);
}

async function addMissingLevels() {
  const adminKeypair = createAdminKeypair();
  
  // Read config directly from env vars
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
    console.error('❌ Missing required configuration');
    return;
  }

  const client = new SuiClient({
    url: network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : getFullnodeUrl('mainnet'),
  });

  const categoryCode = 11; // enemiesCumulative
  const senderAddress = adminKeypair.toSuiAddress();

  console.log('🔍 Checking for missing enemiesCumulative milestone levels...\n');
  console.log(`   Package ID: ${packageId}`);
  console.log(`   Registry ID: ${registryId}`);
  console.log(`   Admin Cap ID: ${adminCapId}`);
  console.log(`   Category Code: ${categoryCode} (enemiesCumulative)\n`);

  try {
    // Get existing levels
    const txb = new Transaction();
    txb.setSender(senderAddress);
    txb.moveCall({
      target: `${packageId}::achievement_system::get_all_milestone_levels_for_category`,
      arguments: [
        txb.object(registryId),
        txb.pure.u8(categoryCode),
      ],
    });

    const result = await client.devInspectTransactionBlock({
      sender: senderAddress,
      transactionBlock: txb,
    });

    let existingLevels: number[] = [];
    if (result.results && result.results[0] && 'returnValues' in result.results[0]) {
      const returnValues = result.results[0].returnValues;
      if (returnValues && returnValues.length > 0) {
        const val = returnValues[0];
        let byteArray: number[] | null = null;
        
        if (Array.isArray(val)) {
          if (val.length === 2 && Array.isArray(val[0])) {
            byteArray = val[0] as number[];
          } else if (val.length > 0 && typeof val[0] === 'number') {
            byteArray = val as number[];
          } else if (val.length === 2 && typeof val[0] === 'string') {
            try {
              const buffer = Buffer.from(val[0] as string, 'base64');
              byteArray = Array.from(buffer);
            } catch {}
          }
        } else if (typeof val === 'string') {
          try {
            const buffer = Buffer.from(val, 'base64');
            byteArray = Array.from(buffer);
          } catch {}
        }
        
        if (byteArray && byteArray.length > 0) {
          const length = byteArray[0];
          for (let i = 1; i <= length && i < byteArray.length; i++) {
            existingLevels.push(byteArray[i]);
          }
        }
      }
    }

    console.log(`✅ Found ${existingLevels.length} existing level(s): ${existingLevels.sort((a, b) => a - b).join(', ')}\n`);

    // Find missing levels
    const missingDefinitions = expectedDefinitions.filter(def => !existingLevels.includes(def.level));
    
    if (missingDefinitions.length === 0) {
      console.log('✅ All expected levels are already present on-chain!');
      return;
    }

    console.log(`⚠️  Found ${missingDefinitions.length} missing level(s): ${missingDefinitions.map(d => d.level).join(', ')}\n`);

    // Add missing levels one by one
    for (const def of missingDefinitions) {
      try {
        console.log(`📝 Adding level ${def.level}: threshold=${def.threshold}, credits=${def.credits}...`);
        
        const txb2 = new Transaction();
        txb2.setSender(senderAddress);
        
        // Convert items to parallel vectors
        const itemIds: number[] = [];
        const itemLevels: number[] = [];
        const itemQuantities: bigint[] = [];
        
        for (const item of def.items) {
          itemIds.push(itemIdToU8(item.itemId));
          itemLevels.push(item.level);
          itemQuantities.push(BigInt(item.quantity));
        }

        txb2.moveCall({
          target: `${packageId}::achievement_system::add_milestone_definition_entry`,
          arguments: [
            txb2.object(adminCapId),
            txb2.object(registryId),
            txb2.pure.u8(categoryCode),
            txb2.pure.u8(def.level),
            txb2.pure.u64(def.threshold),
            txb2.pure.u64(def.credits),
            txb2.pure('vector<u8>', itemIds),
            txb2.pure('vector<u8>', itemLevels),
            txb2.pure('vector<u64>', itemQuantities),
            txb2.object('0x6'), // Clock
          ],
        });

        txb2.setGasBudget(100000000);

        const transactionBytes = await txb2.build({ client });
        const result2 = await client.signAndExecuteTransaction({
          signer: adminKeypair,
          transaction: transactionBytes,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        if (result2.effects?.status?.status === 'success') {
          console.log(`   ✅ Successfully added level ${def.level} (digest: ${result2.digest})`);
        } else {
          console.error(`   ❌ Failed to add level ${def.level}: ${result2.effects?.status?.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(`   ❌ Error adding level ${def.level}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

addMissingLevels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

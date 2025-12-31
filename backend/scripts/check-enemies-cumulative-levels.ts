// ==========================================
// Check Enemies Cumulative Milestone Levels
// ==========================================
// Script to check which milestone levels exist on-chain for enemiesCumulative

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

async function checkEnemiesCumulativeLevels() {
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

  if (!packageId || !registryId) {
    console.error('❌ Missing contract configuration');
    return;
  }

  const client = new SuiClient({
    url: network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : getFullnodeUrl('mainnet'),
  });

  const senderAddress = process.env.ADMIN_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000000000000000000000000000';
  const categoryCode = 11; // enemiesCumulative

  console.log('🔍 Checking enemiesCumulative milestone levels on-chain...');
  console.log(`   Package ID: ${packageId}`);
  console.log(`   Registry ID: ${registryId}`);
  console.log(`   Category Code: ${categoryCode} (enemiesCumulative)\n`);

  try {
    // Query for all milestone levels in this category
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

    if (!result.results || !result.results[0] || !('returnValues' in result.results[0])) {
      console.error('❌ No return values from query');
      return;
    }

    const returnValues = result.results[0].returnValues;
    if (!returnValues || returnValues.length === 0) {
      console.log('📭 No milestone levels found on-chain for enemiesCumulative');
      return;
    }

    // Parse the return value (vector<u8>)
    let byteArray: number[] | null = null;
    const rawValue = returnValues[0];

    if (Array.isArray(rawValue)) {
      if (rawValue.length === 2 && Array.isArray(rawValue[0])) {
        // Format: [[byteArray], "type"]
        byteArray = rawValue[0] as number[];
      } else if (rawValue.length > 0 && typeof rawValue[0] === 'number') {
        // Format: [byteArray] (direct)
        byteArray = rawValue as number[];
      } else if (rawValue.length === 2 && typeof rawValue[0] === 'string') {
        // Format: [base64String, "type"]
        try {
          const buffer = Buffer.from(rawValue[0] as string, 'base64');
          byteArray = Array.from(buffer);
        } catch (e) {
          console.error('❌ Failed to decode base64:', e);
          return;
        }
      }
    } else if (typeof rawValue === 'string') {
      // Format: base64String
      try {
        const buffer = Buffer.from(rawValue, 'base64');
        byteArray = Array.from(buffer);
      } catch (e) {
        console.error('❌ Failed to decode base64:', e);
        return;
      }
    }

    if (!byteArray || byteArray.length === 0) {
      console.log('📭 No milestone levels found (empty vector)');
      return;
    }

    // Parse length-prefixed vector<u8>
    const length = byteArray[0];
    const levels: number[] = [];
    for (let i = 1; i <= length && i < byteArray.length; i++) {
      levels.push(byteArray[i]);
    }

    console.log(`✅ Found ${levels.length} milestone level(s) on-chain:`);
    console.log(`   Levels: ${levels.sort((a, b) => a - b).join(', ')}\n`);

    // Expected levels from migration script
    const expectedLevels = [1, 2, 3, 4, 5, 6, 7]; // 7 levels total
    const expectedThresholds = [100, 250, 500, 1000, 2500, 5000, 10000];
    
    console.log('📋 Expected levels (from migration script):');
    expectedLevels.forEach((level, idx) => {
      const exists = levels.includes(level);
      const marker = exists ? '✅' : '❌ MISSING';
      console.log(`   Level ${level}: Threshold ${expectedThresholds[idx]} ${marker}`);
    });

    const missingLevels = expectedLevels.filter(level => !levels.includes(level));
    if (missingLevels.length > 0) {
      console.log(`\n⚠️  Missing ${missingLevels.length} level(s): ${missingLevels.join(', ')}`);
    } else {
      console.log('\n✅ All expected levels are present!');
    }

    // Now fetch details for each level to see what's actually there
    console.log('\n📊 Fetching details for each level on-chain...\n');
    for (const level of levels.sort((a, b) => a - b)) {
      try {
        const txb2 = new Transaction();
        txb2.setSender(senderAddress);
        txb2.moveCall({
          target: `${packageId}::achievement_system::get_milestone_definition_full`,
          arguments: [
            txb2.object(registryId),
            txb2.pure.u8(categoryCode),
            txb2.pure.u8(level),
          ],
        });

        const defResult = await client.devInspectTransactionBlock({
          sender: senderAddress,
          transactionBlock: txb2,
        });

        if (defResult.results && defResult.results[0] && 'returnValues' in defResult.results[0]) {
          const defReturnValues = defResult.results[0].returnValues;
          if (defReturnValues && defReturnValues.length >= 4) {
            // Extract bytes
            const extractBytes = (val: unknown): number[] | string | null => {
              if (Array.isArray(val)) {
                if (val.length === 2 && Array.isArray(val[0])) {
                  return val[0] as number[];
                } else if (val.length > 0 && typeof val[0] === 'number') {
                  return val as number[];
                } else if (val.length === 2 && typeof val[0] === 'string') {
                  return val[0] as string;
                }
              } else if (typeof val === 'string') {
                return val;
              }
              return null;
            };

            const existsBytes = extractBytes(defReturnValues[0]);
            const thresholdBytes = extractBytes(defReturnValues[1]);
            const creditsBytes = extractBytes(defReturnValues[2]);

            // Parse exists (bool)
            let exists = false;
            if (Array.isArray(existsBytes)) {
              const byteArray = existsBytes.length === 1 && Array.isArray(existsBytes[0]) ? existsBytes[0] : existsBytes;
              if (Array.isArray(byteArray) && byteArray.length > 0) {
                exists = byteArray[0] === 1;
              }
            } else if (typeof existsBytes === 'string') {
              try {
                const buffer = Buffer.from(existsBytes, 'base64');
                exists = buffer.length > 0 && buffer[0] === 1;
              } catch {}
            }

            if (!exists) {
              console.log(`   Level ${level}: ❌ Does not exist`);
              continue;
            }

            // Parse threshold (u64, little-endian)
            let threshold = 0;
            let byteArray: number[] | null = null;
            if (Array.isArray(thresholdBytes)) {
              if (thresholdBytes.length === 1 && Array.isArray(thresholdBytes[0])) {
                byteArray = thresholdBytes[0] as number[];
              } else if (thresholdBytes.length > 0 && typeof thresholdBytes[0] === 'number') {
                byteArray = thresholdBytes as number[];
              }
            } else if (typeof thresholdBytes === 'string') {
              try {
                const buffer = Buffer.from(thresholdBytes, 'base64');
                byteArray = Array.from(buffer);
              } catch {}
            }
            if (byteArray && byteArray.length >= 8) {
              let value = BigInt(0);
              for (let i = 0; i < 8; i++) {
                value = value | (BigInt(byteArray[i]) << BigInt(i * 8));
              }
              threshold = Number(value);
            }

            // Parse credits (u64, little-endian)
            let credits = 0;
            byteArray = null;
            if (Array.isArray(creditsBytes)) {
              if (creditsBytes.length === 1 && Array.isArray(creditsBytes[0])) {
                byteArray = creditsBytes[0] as number[];
              } else if (creditsBytes.length > 0 && typeof creditsBytes[0] === 'number') {
                byteArray = creditsBytes as number[];
              }
            } else if (typeof creditsBytes === 'string') {
              try {
                const buffer = Buffer.from(creditsBytes, 'base64');
                byteArray = Array.from(buffer);
              } catch {}
            }
            if (byteArray && byteArray.length >= 8) {
              let value = BigInt(0);
              for (let i = 0; i < 8; i++) {
                value = value | (BigInt(byteArray[i]) << BigInt(i * 8));
              }
              credits = Number(value);
            }

            // Parse items (vector<ItemReward>)
            const itemsBytes = extractBytes(defReturnValues[3]);
            const items: Array<{ itemId: string; level: number; quantity: number }> = [];
            
            if (itemsBytes) {
              let itemByteArray: number[] | null = null;
              
              if (Array.isArray(itemsBytes)) {
                if (itemsBytes.length === 1 && Array.isArray(itemsBytes[0])) {
                  itemByteArray = itemsBytes[0] as number[];
                } else if (itemsBytes.length > 0 && typeof itemsBytes[0] === 'number') {
                  itemByteArray = itemsBytes as number[];
                } else if (itemsBytes.length === 2 && typeof itemsBytes[0] === 'string') {
                  try {
                    const buffer = Buffer.from(itemsBytes[0] as string, 'base64');
                    itemByteArray = Array.from(buffer);
                  } catch {}
                }
              } else if (typeof itemsBytes === 'string') {
                try {
                  const buffer = Buffer.from(itemsBytes, 'base64');
                  itemByteArray = Array.from(buffer);
                } catch {}
              }
              
              if (itemByteArray && itemByteArray.length > 0) {
                const length = itemByteArray[0];
                let offset = 1;
                
                const itemIdMap: Record<number, string> = {
                  0: 'orbLevel',
                  1: 'forceField',
                  2: 'extraLives',
                  3: 'slowTime',
                  4: 'coinTractorBeam',
                  5: 'destroyAll',
                  6: 'bossKillShot',
                };
                
                for (let i = 0; i < length && offset + 10 <= itemByteArray.length; i++) {
                  const itemId = itemByteArray[offset];
                  const itemLevel = itemByteArray[offset + 1];
                  
                  let quantity = BigInt(0);
                  for (let j = 0; j < 8; j++) {
                    quantity = quantity | (BigInt(itemByteArray[offset + 2 + j]) << BigInt(j * 8));
                  }
                  
                  items.push({
                    itemId: itemIdMap[itemId] || 'orbLevel',
                    level: itemLevel,
                    quantity: Number(quantity),
                  });
                  
                  offset += 10;
                }
              }
            }
            
            const itemsStr = items.map(item => `${item.itemId} (L${item.level}, Q${item.quantity})`).join(', ');
            console.log(`   Level ${level}: Threshold=${threshold}, Credits=${credits}, Items=[${itemsStr}]`);
          }
        }
      } catch (error) {
        console.error(`   Level ${level}: ❌ Error fetching details:`, error instanceof Error ? error.message : error);
      }
    }

  } catch (error) {
    console.error('❌ Error checking milestone levels:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

checkEnemiesCumulativeLevels()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

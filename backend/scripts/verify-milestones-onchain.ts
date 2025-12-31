// ==========================================
// Verify Milestones On-Chain
// ==========================================
// Checks what milestones actually exist on-chain

import * as dotenv from 'dotenv';
import * as path from 'path';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { bech32 } from 'bech32';

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
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

function createAdminKeypair(): Ed25519Keypair {
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.GAME_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Missing ADMIN_WALLET_PRIVATE_KEY or GAME_WALLET_PRIVATE_KEY');
  }
  
  let keyBytes: Uint8Array;
  if (privateKey.startsWith('suiprivkey1')) {
    const decoded = bech32.decode(privateKey);
    const bytes = bech32.fromWords(decoded.words);
    if (bytes.length === 33) {
      keyBytes = new Uint8Array(bytes.slice(1));
    } else if (bytes.length === 32) {
      keyBytes = new Uint8Array(bytes);
    } else {
      throw new Error(`Invalid private key length: ${bytes.length}`);
    }
  } else {
    let hexKey = privateKey.trim();
    if (hexKey.startsWith('0x') || hexKey.startsWith('0X')) {
      hexKey = hexKey.slice(2);
    }
    if (hexKey.length !== 64) {
      throw new Error(`Invalid hex private key length: ${hexKey.length}`);
    }
    keyBytes = fromHEX(hexKey);
  }
  
  return Ed25519Keypair.fromSecretKey(keyBytes);
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

async function verifyMilestones() {
  console.log('🔍 Verifying milestones on-chain...\n');
  
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
    console.error('❌ Missing configuration');
    process.exit(1);
  }
  
  console.log(`📋 Configuration:`);
  console.log(`   Package ID: ${packageId}`);
  console.log(`   Registry ID: ${registryId}`);
  console.log(`   Network: ${network}\n`);
  
  const client = new SuiClient({
    url: network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : getFullnodeUrl('mainnet'),
  });
  
  const adminKeypair = createAdminKeypair();
  const adminAddress = adminKeypair.toSuiAddress();
  
  let totalFound = 0;
  
  // Check each category
  for (const [categoryName, categoryCode] of Object.entries(categoryCodes)) {
    try {
      const txb = new Transaction();
      txb.setSender(adminAddress);
      txb.moveCall({
        target: `${packageId}::achievement_system::get_all_milestone_levels_for_category`,
        arguments: [
          txb.object(registryId),
          txb.pure.u8(categoryCode),
        ],
      });
      
      const result = await client.devInspectTransactionBlock({
        sender: adminAddress,
        transactionBlock: txb,
      });
      
      // Parse milestone levels
      const milestoneLevels: number[] = [];
      if (result.results && result.results[0] && 'returnValues' in result.results[0]) {
        const returnValues = result.results[0].returnValues;
        console.log(`   🔍 Debug: returnValues structure:`, JSON.stringify(returnValues, null, 2));
        
        if (returnValues && returnValues.length > 0) {
          const val = returnValues[0];
          console.log(`   🔍 Debug: First return value type:`, typeof val, Array.isArray(val) ? `(array, length: ${val.length})` : '');
          console.log(`   🔍 Debug: First return value:`, val);
          
          let bytes: string;
          let type: string;
          
          if (Array.isArray(val) && val.length === 2) {
            const [bytesVal, typeVal] = val as unknown[];
            console.log(`   🔍 Debug: Array format - bytesVal type: ${typeof bytesVal}, typeVal: ${typeVal}`);
            if (typeof bytesVal === 'string' && typeof typeVal === 'string') {
              bytes = bytesVal;
              type = typeVal;
            }
          } else if (typeof val === 'string') {
            console.log(`   🔍 Debug: String format`);
            bytes = val;
            type = 'vector<u8>';
          } else {
            console.log(`   🔍 Debug: Unknown format, val:`, val);
          }
          
          if (type === 'vector<u8>' && bytes) {
            try {
              console.log(`   🔍 Debug: Attempting to parse bytes (length: ${bytes.length})`);
              const buffer = Buffer.from(bytes, 'base64');
              console.log(`   🔍 Debug: Buffer length: ${buffer.length}`);
              const length = buffer.readUInt8(0);
              console.log(`   🔍 Debug: Vector length: ${length}`);
              for (let i = 0; i < length; i++) {
                const level = buffer.readUInt8(1 + i);
                milestoneLevels.push(level);
                console.log(`   🔍 Debug: Found milestone level: ${level}`);
              }
            } catch (parseError) {
              console.log(`   ⚠️  Error parsing vector: ${parseError instanceof Error ? parseError.message : 'Unknown'}`);
              console.log(`   🔍 Debug: Parse error stack:`, parseError instanceof Error ? parseError.stack : 'N/A');
            }
          } else {
            console.log(`   ⚠️  Type is not vector<u8> or bytes missing. Type: ${type}, Has bytes: ${!!bytes}`);
          }
        } else {
          console.log(`   ⚠️  No return values found`);
        }
      } else {
        console.log(`   ⚠️  No results or returnValues in result`);
        console.log(`   🔍 Debug: result structure:`, JSON.stringify(result, null, 2));
      }
      
      if (milestoneLevels.length > 0) {
        console.log(`✅ ${categoryName}: ${milestoneLevels.length} milestone(s) found - levels: ${milestoneLevels.sort((a, b) => a - b).join(', ')}`);
        totalFound += milestoneLevels.length;
        
        // Fetch details for each milestone
        for (const level of milestoneLevels.sort((a, b) => a - b)) {
          try {
            const txb2 = new Transaction();
            txb2.setSender(adminAddress);
            txb2.moveCall({
              target: `${packageId}::achievement_system::get_milestone_definition_full`,
              arguments: [
                txb2.object(registryId),
                txb2.pure.u8(categoryCode),
                txb2.pure.u8(level),
              ],
            });
            
            const defResult = await client.devInspectTransactionBlock({
              sender: adminAddress,
              transactionBlock: txb2,
            });
            
            // Try to parse the result
            if (defResult.results && defResult.results[0] && 'returnValues' in defResult.results[0]) {
              const returnValues = defResult.results[0].returnValues;
              if (returnValues && returnValues.length >= 4) {
                // Extract exists (first value)
                const existsVal = returnValues[0];
                let existsBytes: string;
                if (Array.isArray(existsVal) && existsVal.length === 2) {
                  existsBytes = existsVal[0] as string;
                } else {
                  existsBytes = existsVal as string;
                }
                
                // Check if exists (bool is 0x00 for false, 0x01 for true)
                const exists = Buffer.from(existsBytes, 'base64')[0] === 1;
                if (exists) {
                  console.log(`      Level ${level}: ✅ Exists on-chain`);
                } else {
                  console.log(`      Level ${level}: ⚠️  Returned but doesn't exist`);
                }
              }
            }
          } catch (error) {
            console.log(`      Level ${level}: ❌ Error fetching details: ${error instanceof Error ? error.message : 'Unknown'}`);
          }
        }
      } else {
        console.log(`❌ ${categoryName}: No milestones found`);
      }
    } catch (error) {
      console.log(`❌ ${categoryName}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`\n📊 Summary: ${totalFound} total milestones found on-chain`);
  
  if (totalFound === 0) {
    console.log(`\n⚠️  WARNING: No milestones found on-chain!`);
    console.log(`   This could mean:`);
    console.log(`   1. The migration didn't actually succeed`);
    console.log(`   2. The registry ID is incorrect`);
    console.log(`   3. There's a network/query issue`);
  } else if (totalFound < 39) {
    console.log(`\n⚠️  WARNING: Expected 39 milestones, but found ${totalFound}`);
    console.log(`   Some milestones may not have been migrated successfully`);
  } else {
    console.log(`\n✅ Found expected number of milestones (or more)`);
  }
}

verifyMilestones().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// ==========================================
// Test AdminCap Lock Status
// ==========================================
// Attempts a simple read operation to see if AdminCap is actually locked

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
    console.log(`📁 Loaded environment from: ${envPath}`);
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

async function testAdminCapLock() {
  console.log('🔍 Testing AdminCap lock status...\n');
  
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
    console.error('❌ Missing configuration');
    process.exit(1);
  }
  
  console.log(`📋 Configuration:`);
  console.log(`   Package ID: ${packageId}`);
  console.log(`   Registry ID: ${registryId}`);
  console.log(`   Admin Cap ID: ${adminCapId}`);
  console.log(`   Network: ${network}\n`);
  
  const client = new SuiClient({
    url: network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : getFullnodeUrl('mainnet'),
  });
  
  const adminKeypair = createAdminKeypair();
  const adminAddress = adminKeypair.toSuiAddress();
  
  console.log(`👤 Admin Address: ${adminAddress}\n`);
  
  // Test 1: Try a read-only operation (devInspectTransactionBlock)
  console.log('🧪 Test 1: Read-only operation (should always work)...');
  try {
    const txb = new Transaction();
    txb.setSender(adminAddress);
    txb.moveCall({
      target: `${packageId}::achievement_system::get_all_milestone_levels_for_category`,
      arguments: [
        txb.object(registryId),
        txb.pure.u8(1), // gamesPlayed category
      ],
    });
    
    const result = await client.devInspectTransactionBlock({
      sender: adminAddress,
      transactionBlock: txb,
    });
    
    console.log('   ✅ Read-only operation succeeded (AdminCap not needed for reads)');
  } catch (error) {
    console.log(`   ❌ Read-only operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Test 2: Try building a transaction that uses AdminCap (but don't execute)
  console.log('\n🧪 Test 2: Building transaction with AdminCap (simulation)...');
  try {
    const txb = new Transaction();
    txb.setSender(adminAddress);
    
    // Try to add a test milestone (we'll use a high milestone level that probably doesn't exist)
    txb.moveCall({
      target: `${packageId}::achievement_system::add_milestone_definition_entry`,
      arguments: [
        txb.object(adminCapId),
        txb.object(registryId),
        txb.pure.u8(1), // category: gamesPlayed
        txb.pure.u8(99), // milestone_level: 99 (probably doesn't exist)
        txb.pure.u64(999999), // threshold
        txb.pure.u64(0), // credits
        txb.pure('vector<u8>', []), // item_ids
        txb.pure('vector<u8>', []), // item_levels
        txb.pure('vector<u64>', []), // item_quantities
        txb.object('0x6'), // clock
      ],
    });
    
    // Just try to build it (this will check if AdminCap is accessible)
    const transactionBytes = await txb.build({ client });
    console.log('   ✅ Transaction built successfully - AdminCap appears to be accessible');
    console.log('   ⚠️  Note: This doesn\'t mean it\'s unlocked, just that we can reference it');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.log(`   ❌ Transaction build failed: ${errorMsg}`);
    if (errorMsg.includes('locked')) {
      console.log('   🔒 AdminCap appears to be LOCKED');
    }
  }
  
  // Test 3: Check current coins
  console.log('\n🧪 Test 3: Checking available gas coins...');
  try {
    const coins = await client.getCoins({
      owner: adminAddress,
      coinType: '0x2::sui::SUI',
    });
    
    console.log(`   💰 Found ${coins.data?.length || 0} gas coin(s)`);
    if (coins.data && coins.data.length > 0) {
      const coinsWithBalance = coins.data.filter(coin => BigInt(coin.balance) >= BigInt(100_000_000));
      console.log(`   💰 ${coinsWithBalance.length} coin(s) with balance >= 0.1 SUI`);
      
      coinsWithBalance.forEach((coin, i) => {
        const balanceSui = (BigInt(coin.balance) / BigInt(1_000_000_000)).toString();
        console.log(`      ${i + 1}. Coin ${coin.coinObjectId.substring(0, 20)}...: ${balanceSui} SUI (version: ${coin.version})`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error checking coins: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log('\n💡 Summary:');
  console.log('   - If Test 1 passed: Registry is accessible');
  console.log('   - If Test 2 passed: AdminCap can be referenced (but may still be locked during execution)');
  console.log('   - If Test 3 shows coins: You have gas available');
  console.log('   - The real test is trying to EXECUTE a transaction');
  console.log('   - If execution fails with "locked", the AdminCap is still locked');
}

testAdminCapLock().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

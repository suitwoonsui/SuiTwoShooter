// ==========================================
// Coin Unlock Script
// ==========================================
// Attempts to unlock a coin that's locked by pruned/non-existent transactions
// Uses multiple strategies to try to free the coin

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
  console.warn('⚠️  Could not find .env.local file, trying default dotenv behavior...');
  dotenv.config();
}

const LOCKED_COIN_ID = '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a';
const STUCK_TRANSACTIONS = [
  'EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A',
  'H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc',
];

/**
 * Create admin keypair from private key
 */
function createAdminKeypair(): Ed25519Keypair {
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.GAME_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Missing ADMIN_WALLET_PRIVATE_KEY or GAME_WALLET_PRIVATE_KEY environment variable');
  }
  
  let keyBytes: Uint8Array;
  if (privateKey.startsWith('suiprivkey1')) {
    try {
      const decoded = bech32.decode(privateKey);
      const bytes = bech32.fromWords(decoded.words);
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
 * Strategy 1: Check if coin is actually still locked by trying a no-op transaction
 */
async function testCoinLockStatus(
  client: SuiClient,
  adminKeypair: Ed25519Keypair
): Promise<{ isLocked: boolean; error?: string }> {
  console.log('\n🔍 Strategy 1: Testing if coin is actually locked...');
  
  try {
    // Try to use the coin in a simple transaction (transfer to self)
    const txb = new Transaction();
    const coin = txb.object(LOCKED_COIN_ID);
    
    // Try to transfer the coin to the same address (no-op)
    txb.transferObjects([coin], adminKeypair.toSuiAddress());
    txb.setSender(adminKeypair.toSuiAddress());
    txb.setGasBudget(50_000_000);
    
    // Use the coin itself as gas
    txb.setGasPayment([{
      objectId: LOCKED_COIN_ID,
      version: '696136829', // Known version from status doc
      digest: '', // Will be filled by SDK
    }]);
    
    const transactionBytes = await txb.build({ client });
    const result = await client.signAndExecuteTransaction({
      signer: adminKeypair,
      transaction: transactionBytes,
      options: {
        showEffects: true,
      },
    });
    
    if (result.effects?.status?.status === 'success') {
      console.log('   ✅ Coin is NOT locked! Transaction succeeded.');
      console.log(`   📋 Transaction: ${result.digest}`);
      return { isLocked: false };
    } else {
      const error = result.effects?.status?.error || 'Unknown error';
      if (error.includes('already locked')) {
        console.log('   ❌ Coin is still locked');
        return { isLocked: true, error };
      }
      return { isLocked: true, error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    if (errorMsg.includes('already locked') || errorMsg.includes('locked')) {
      console.log('   ❌ Coin is still locked');
      return { isLocked: true, error: errorMsg };
    }
    console.log(`   ⚠️  Error testing coin: ${errorMsg}`);
    return { isLocked: true, error: errorMsg };
  }
}

/**
 * Strategy 2: Try to split the coin (if it has enough balance)
 */
async function trySplitCoin(
  client: SuiClient,
  adminKeypair: Ed25519Keypair
): Promise<boolean> {
  console.log('\n🔧 Strategy 2: Attempting to split coin...');
  
  try {
    // Get fresh coin state
    const coinObject = await client.getObject({
      id: LOCKED_COIN_ID,
      options: {
        showContent: true,
        showOwner: true,
        showPreviousTransaction: true,
      },
    });
    
    if (coinObject.error || !coinObject.data) {
      console.log('   ❌ Could not fetch coin object');
      return false;
    }
    
    const balance = (coinObject.data.data as any)?.fields?.balance || '0';
    const balanceBigInt = BigInt(balance);
    const balanceSui = balanceBigInt / BigInt(1_000_000_000);
    
    console.log(`   💰 Coin balance: ${balanceSui.toString()} SUI`);
    
    if (balanceBigInt < BigInt(200_000_000)) {
      console.log('   ⚠️  Coin balance too low to split (need at least 0.2 SUI)');
      return false;
    }
    
    // Try to split a small amount
    const txb = new Transaction();
    const coin = txb.object(LOCKED_COIN_ID);
    const splitAmount = 100_000_000n; // 0.1 SUI
    const splitCoin = txb.splitCoins(coin, [splitAmount]);
    txb.transferObjects([splitCoin], adminKeypair.toSuiAddress());
    
    txb.setSender(adminKeypair.toSuiAddress());
    txb.setGasBudget(50_000_000);
    
    // Try using the coin as gas
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
        console.log(`   ✅ Successfully split coin! Transaction: ${result.digest}`);
        console.log('   ⏳ Waiting for transaction to finalize...');
        await client.waitForTransaction({
          digest: result.digest,
          options: { showEffects: true },
        });
        console.log('   ✅ Coin split complete! You now have an unlocked coin.');
        return true;
      } else {
        const error = result.effects?.status?.error || 'Unknown error';
        console.log(`   ❌ Split failed: ${error}`);
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('already locked')) {
        console.log('   ❌ Coin is locked - cannot split');
      } else {
        console.log(`   ❌ Error: ${errorMsg}`);
      }
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Strategy 3: Check current epoch and wait if needed
 */
async function checkEpochStatus(client: SuiClient): Promise<void> {
  console.log('\n📅 Strategy 3: Checking epoch status...');
  
  try {
    const latestCheckpoint = await client.getLatestCheckpointSequenceNumber();
    console.log(`   📊 Latest checkpoint: ${latestCheckpoint}`);
    
    // Get system state to check epoch
    const systemState = await client.getLatestSuiSystemState();
    console.log(`   📊 Current epoch: ${systemState.epoch}`);
    console.log(`   📊 Epoch start timestamp: ${systemState.epochStartTimestampMs}`);
    
    const now = Date.now();
    const epochAge = now - parseInt(systemState.epochStartTimestampMs);
    const epochAgeHours = epochAge / (1000 * 60 * 60);
    
    console.log(`   📊 Epoch age: ${epochAgeHours.toFixed(2)} hours`);
    console.log('   💡 Epoch changes may unlock stuck coins, but timing is unpredictable');
  } catch (error) {
    console.log(`   ⚠️  Could not fetch epoch info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Strategy 4: Get fresh coin info and check if lock has cleared
 */
async function checkCoinState(client: SuiClient): Promise<void> {
  console.log('\n🔍 Strategy 4: Checking current coin state...');
  
  try {
    const coinObject = await client.getObject({
      id: LOCKED_COIN_ID,
      options: {
        showContent: true,
        showOwner: true,
        showPreviousTransaction: true,
        showType: true,
      },
    });
    
    if (coinObject.error) {
      console.log(`   ❌ Error: ${coinObject.error.code} - ${coinObject.error.message}`);
      return;
    }
    
    if (!coinObject.data) {
      console.log('   ❌ Coin not found');
      return;
    }
    
    console.log(`   ✅ Coin exists`);
    console.log(`   📊 Object ID: ${coinObject.data.objectId}`);
    console.log(`   📊 Version: ${coinObject.data.version}`);
    console.log(`   📊 Previous TX: ${coinObject.data.previousTransaction || 'none'}`);
    console.log(`   📊 Owner: ${JSON.stringify(coinObject.data.owner)}`);
    
    if (coinObject.data.data && 'fields' in coinObject.data.data) {
      const balance = (coinObject.data.data as any).fields?.balance || '0';
      const balanceBigInt = BigInt(balance);
      const balanceSui = balanceBigInt / BigInt(1_000_000_000);
      console.log(`   💰 Balance: ${balanceSui.toString()} SUI`);
    }
    
    // Check if previous transaction is one of the stuck ones
    const prevTx = coinObject.data.previousTransaction;
    if (prevTx && STUCK_TRANSACTIONS.includes(prevTx)) {
      console.log('   ⚠️  Previous transaction is one of the stuck transactions');
    } else if (prevTx) {
      console.log('   ✅ Previous transaction is different - coin may have moved');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Strategy 5: Check all coins in wallet and see if we can use a different one
 */
async function checkAllCoins(client: SuiClient, adminKeypair: Ed25519Keypair): Promise<void> {
  console.log('\n💰 Strategy 5: Checking all coins in wallet...');
  
  try {
    const coins = await client.getCoins({
      owner: adminKeypair.toSuiAddress(),
      coinType: '0x2::sui::SUI',
    });
    
    if (!coins.data || coins.data.length === 0) {
      console.log('   ❌ No coins found in wallet');
      console.log('   💡 You need to add SUI to the wallet to create new gas coins');
      return;
    }
    
    console.log(`   📊 Found ${coins.data.length} coin(s) in wallet:`);
    
    const lockedCoinIndex = coins.data.findIndex(c => c.coinObjectId === LOCKED_COIN_ID);
    const otherCoins = coins.data.filter(c => c.coinObjectId !== LOCKED_COIN_ID);
    
    if (lockedCoinIndex >= 0) {
      const lockedCoin = coins.data[lockedCoinIndex];
      const balanceSui = (BigInt(lockedCoin.balance) / BigInt(1_000_000_000)).toString();
      console.log(`   🔒 Locked coin: ${lockedCoin.coinObjectId.substring(0, 10)}... (${balanceSui} SUI, version: ${lockedCoin.version})`);
    }
    
    if (otherCoins.length > 0) {
      console.log(`   ✅ Found ${otherCoins.length} other coin(s) that can be used:`);
      otherCoins.forEach((coin, i) => {
        const balanceSui = (BigInt(coin.balance) / BigInt(1_000_000_000)).toString();
        console.log(`      ${i + 1}. ${coin.coinObjectId.substring(0, 10)}... (${balanceSui} SUI, version: ${coin.version})`);
      });
      console.log('   💡 You can use these coins for transactions!');
    } else {
      console.log('   ❌ No other coins available');
      console.log('   💡 You need to add SUI to create new gas coins');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main unlock function
 */
async function unlockCoin() {
  console.log('🔓 Coin Unlock Script');
  console.log('='.repeat(60));
  console.log(`Locked Coin ID: ${LOCKED_COIN_ID}`);
  console.log(`Stuck Transactions: ${STUCK_TRANSACTIONS.join(', ')}`);
  console.log('='.repeat(60));
  
  const adminKeypair = createAdminKeypair();
  const network = process.env.SUI_TESTNET_NETWORK ? 'testnet' : 
                  process.env.SUI_MAINNET_NETWORK ? 'mainnet' :
                  (process.env.SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';
  
  const client = new SuiClient({
    url: network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : getFullnodeUrl('mainnet'),
  });
  
  console.log(`\n🌐 Network: ${network}`);
  console.log(`👤 Admin Address: ${adminKeypair.toSuiAddress()}\n`);
  
  // Run all strategies
  await checkCoinState(client);
  await checkAllCoins(client, adminKeypair);
  await checkEpochStatus(client);
  
  const lockStatus = await testCoinLockStatus(client, adminKeypair);
  
  if (lockStatus.isLocked) {
    console.log('\n⚠️  Coin is confirmed to be locked');
    const splitSuccess = await trySplitCoin(client, adminKeypair);
    
    if (!splitSuccess) {
      console.log('\n' + '='.repeat(60));
      console.log('❌ Could not unlock coin automatically');
      console.log('='.repeat(60));
      console.log('\n💡 Recommended Solutions:');
      console.log('   1. Add SUI to admin wallet to create new gas coins');
      console.log(`      Address: ${adminKeypair.toSuiAddress()}`);
      console.log('      Testnet faucet: https://discord.com/channels/916379725201563759/971488439931392130');
      console.log('   2. Wait for epoch change (unpredictable timing)');
      console.log('   3. Transfer SUI from another wallet');
      console.log('\n   Once you have new coins, the migration script will automatically use them.');
    }
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Coin appears to be unlocked!');
    console.log('='.repeat(60));
    console.log('\n💡 You can now run the migration script:');
    console.log('   cd backend && npx tsx scripts/migrate-milestones.ts');
  }
}

// Run the unlock script
unlockCoin().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// ==========================================
// Check Transaction Status Script
// ==========================================
// Checks the status of pending transactions to see if they've completed

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Try default .env if .env.local doesn't exist
if (!process.env.GAME_WALLET_PRIVATE_KEY) {
  dotenv.config();
}

const network = process.env.SUI_TESTNET_NETWORK ? 'testnet' : 
                process.env.SUI_MAINNET_NETWORK ? 'mainnet' :
                (process.env.SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';

const client = new SuiClient({
  url: network === 'testnet' 
    ? getFullnodeUrl('testnet')
    : getFullnodeUrl('mainnet'),
});

// The pending transactions from various errors
const pendingTransactions = [
  'EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A', // Original - locking AdminCap
  'H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc', // Original - locking coin
  '8odbrf6Qg5jW7fQeJ9phGHKZR3LaXad6UnUwN7JDwknR', // New - locking gas coin 0x5046c7a1...
  'EqHnSodJoCNoNcY87AXzbgL4fYPnb7D6UhGPp786ovNU', // New - locking coin 0x059b1843...
  '9dxJ5ByooKJJV54BpeEgwSga8P2XbTuLeWWQ3EPWTr83', // New - locking coin 0x059b1843...
];

// The locked objects
const lockedCoinIds = [
  '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a', // Original locked coin
  '0x059b1843b59dd50f48aa1f810a51624e1b41b57c7ab9bc6f65ffb1d4397f6c31', // New locked coin
  '0x5046c7a1f5858f08d45c2f122fd520fb7b2fc81ce3855e5ddce53296d6ddd949', // New locked coin
];

// AdminCap object ID (from config)
const adminCapId = process.env.ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_TESTNET || 
                   process.env.ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET ||
                   process.env.ACHIEVEMENT_ADMIN_CAP_OBJECT_ID ||
                   process.env.ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID ||
                   '0x846ffbdf1db33374be23930c35221688ee85d7b588e796575a9531abf18cf90c';

async function checkTransactions() {
  console.log('🔍 Checking status of pending transactions...\n');
  console.log(`Network: ${network}\n`);

  for (const txDigest of pendingTransactions) {
    try {
      console.log(`📋 Checking transaction: ${txDigest}`);
      const tx = await client.getTransactionBlock({
        digest: txDigest,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
        },
      });

      if (tx.effects?.status?.status === 'success') {
        console.log(`   ✅ Transaction SUCCEEDED`);
        console.log(`   📊 Effects:`, JSON.stringify(tx.effects, null, 2));
      } else if (tx.effects?.status?.status === 'failure') {
        console.log(`   ❌ Transaction FAILED`);
        console.log(`   📊 Error:`, tx.effects?.status?.error || 'Unknown error');
      } else {
        console.log(`   ⚠️  Transaction status: ${tx.effects?.status?.status || 'unknown'}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.log(`   ⚠️  Transaction NOT FOUND (may have been pruned or never existed)`);
      } else {
        console.log(`   ❌ Error checking transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    console.log('');
  }

  // Check the locked coins
  console.log(`\n💰 Checking locked coins:`);
  for (const coinId of lockedCoinIds) {
    try {
      const coin = await client.getObject({
        id: coinId,
        options: {
          showContent: true,
          showOwner: true,
          showPreviousTransaction: true,
        },
      });

      if (coin.data) {
        console.log(`\n   Coin: ${coinId.substring(0, 20)}...`);
        console.log(`   ✅ Coin exists`);
        if (coin.data.data && typeof coin.data.data === 'object' && 'fields' in coin.data.data) {
          const fields = (coin.data.data as any).fields;
          if (fields && fields.balance) {
            const balance = fields.balance;
            const balanceSui = (BigInt(balance) / BigInt(1_000_000_000)).toString();
            console.log(`   💰 Balance: ${balanceSui} SUI`);
          }
        }
        console.log(`   📊 Owner: ${coin.data.owner ? JSON.stringify(coin.data.owner) : 'unknown'}`);
        console.log(`   📊 Previous Transaction: ${coin.data.previousTransaction || 'none'}`);
        console.log(`   📊 Version: ${coin.data.version}`);
      } else {
        console.log(`\n   Coin: ${coinId.substring(0, 20)}...`);
        console.log(`   ⚠️  Coin not found or doesn't exist`);
      }
    } catch (error) {
      console.log(`\n   Coin: ${coinId.substring(0, 20)}...`);
      console.log(`   ❌ Error checking coin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check AdminCap status
  console.log(`\n🔐 Checking AdminCap: ${adminCapId.substring(0, 20)}...`);
  try {
    const adminCap = await client.getObject({
      id: adminCapId,
      options: {
        showContent: true,
        showOwner: true,
        showPreviousTransaction: true,
      },
    });

    if (adminCap.data) {
      console.log(`   ✅ AdminCap exists`);
      console.log(`   📊 Owner: ${adminCap.data.owner ? JSON.stringify(adminCap.data.owner) : 'unknown'}`);
      console.log(`   📊 Previous Transaction: ${adminCap.data.previousTransaction || 'none'}`);
      console.log(`   📊 Version: ${adminCap.data.version}`);
      console.log(`   ⚠️  If AdminCap is locked, ALL milestone operations will fail`);
    } else {
      console.log(`   ⚠️  AdminCap not found`);
    }
  } catch (error) {
    console.log(`   ❌ Error checking AdminCap: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check admin wallet coins
  const adminWalletAddress = process.env.ADMIN_WALLET_ADDRESS || 
                             (process.env.GAME_WALLET_PRIVATE_KEY ? 
                               // We'd need to derive address, but for now just show message
                               'Check manually' : 'Not configured');
  
  console.log(`\n💡 Analysis:`);
  console.log(`   - If transactions succeeded: Objects should be unlocked`);
  console.log(`   - If transactions failed: Objects may still be locked`);
  console.log(`   - If transactions not found: They may have been pruned - objects should be unlocked`);
  console.log(`   - AdminCap lock blocks ALL milestone operations`);
  console.log(`   - Gas coin locks block individual transactions`);
  
  console.log(`\n💡 Solutions:`);
  console.log(`   1. Wait for pending transactions to complete (if they're still processing)`);
  console.log(`   2. If AdminCap is locked: Wait for transaction EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A to complete`);
  console.log(`   3. Add more SUI to admin wallet to create new unlocked gas coins`);
  console.log(`   4. Check Sui Explorer for transaction status: https://suiexplorer.com/`);
}

checkTransactions().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// ==========================================
// Check Scheduler Coin Selection
// ==========================================
// Diagnoses why scheduler might be failing with coin selection

import * as dotenv from 'dotenv';
import * as path from 'path';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getAdminWalletService } from '../lib/sui/admin-wallet-service';

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

const LOCKED_COIN_ID = '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a';

async function checkSchedulerCoins() {
  console.log('🔍 Checking Scheduler Coin Selection\n');
  console.log('='.repeat(60));
  
  const adminWallet = getAdminWalletService();
  const network = process.env.SUI_TESTNET_NETWORK ? 'testnet' : 
                  process.env.SUI_MAINNET_NETWORK ? 'mainnet' :
                  (process.env.SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';
  
  const client = network === 'testnet'
    ? adminWallet.getTestnetClient()
    : adminWallet.getMainnetClient();
  
  console.log(`Network: ${network}`);
  console.log(`Admin Wallet: ${adminWallet.getAddress()}\n`);
  
  // Get all coins
  const coins = await client.getCoins({
    owner: adminWallet.getAddress(),
    coinType: '0x2::sui::SUI',
  });
  
  if (!coins.data || coins.data.length === 0) {
    console.log('❌ No SUI coins found in admin wallet!');
    console.log('💡 You need to add SUI to the wallet.');
    return;
  }
  
  console.log(`💰 Found ${coins.data.length} coin(s) in wallet\n`);
  
  // Sort by version (like scheduler does)
  const sortedCoins = [...coins.data].sort((a, b) => {
    return parseInt(a.version) - parseInt(b.version);
  });
  
  // Filter out locked coin
  const availableCoins = sortedCoins.filter(coin => coin.coinObjectId !== LOCKED_COIN_ID);
  const lockedCoin = sortedCoins.find(coin => coin.coinObjectId === LOCKED_COIN_ID);
  
  console.log('📊 Coin Analysis:\n');
  
  if (lockedCoin) {
    const balanceSui = (BigInt(lockedCoin.balance) / BigInt(1_000_000_000)).toString();
    console.log(`🔒 Locked Coin (FILTERED OUT):`);
    console.log(`   ID: ${lockedCoin.coinObjectId}`);
    console.log(`   Version: ${lockedCoin.version} (very high = likely locked)`);
    console.log(`   Balance: ${balanceSui} SUI`);
    console.log(`   Status: ❌ Will be filtered out by scheduler\n`);
  } else {
    console.log(`✅ Locked coin not found in wallet (may have been spent or split)\n`);
  }
  
  console.log(`✅ Available Coins (${availableCoins.length}):\n`);
  
  if (availableCoins.length === 0) {
    console.log('❌ NO UNLOCKED COINS AVAILABLE!');
    console.log('💡 This is why the scheduler is failing.');
    console.log('💡 You need to add more SUI to create new unlocked coins.');
    return;
  }
  
  const minGasBalance = 100_000_000; // 0.1 SUI
  
  availableCoins.forEach((coin, index) => {
    const balanceSui = (BigInt(coin.balance) / BigInt(1_000_000_000)).toString();
    const hasEnoughBalance = BigInt(coin.balance) >= BigInt(minGasBalance);
    const status = hasEnoughBalance ? '✅' : '⚠️';
    
    console.log(`${status} Coin ${index + 1}:`);
    console.log(`   ID: ${coin.coinObjectId}`);
    console.log(`   Version: ${coin.version} (lower = newer/less likely locked)`);
    console.log(`   Balance: ${balanceSui} SUI`);
    console.log(`   Usable: ${hasEnoughBalance ? 'YES (>= 0.1 SUI)' : 'NO (insufficient balance)'}`);
    console.log('');
  });
  
  // Find which coin scheduler would select
  const selectedCoin = availableCoins.find(c => parseInt(c.balance) >= minGasBalance);
  
  console.log('='.repeat(60));
  console.log('📋 Scheduler Selection:\n');
  
  if (selectedCoin) {
    const balanceSui = (BigInt(selectedCoin.balance) / BigInt(1_000_000_000)).toString();
    console.log('✅ Scheduler would select:');
    console.log(`   Coin ID: ${selectedCoin.coinObjectId}`);
    console.log(`   Version: ${selectedCoin.version}`);
    console.log(`   Balance: ${balanceSui} SUI`);
    console.log(`   Status: ✅ This coin should work!\n`);
    
    // Test if coin is actually unlocked
    console.log('🧪 Testing if coin is actually unlocked...\n');
    try {
      const coinObject = await client.getObject({
        id: selectedCoin.coinObjectId,
        options: {
          showContent: true,
          showOwner: true,
          showPreviousTransaction: true,
        },
      });
      
      if (coinObject.data) {
        console.log('✅ Coin exists and is accessible');
        console.log(`   Previous TX: ${coinObject.data.previousTransaction || 'none'}`);
        console.log(`   Version: ${coinObject.data.version}`);
        
        if (coinObject.data.previousTransaction) {
          // Check if previous transaction is one of the stuck ones
          const stuckTxs = [
            'EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A',
            'H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc',
          ];
          
          if (stuckTxs.includes(coinObject.data.previousTransaction)) {
            console.log('   ⚠️  WARNING: Previous transaction is a stuck transaction!');
            console.log('   ⚠️  This coin might also be locked.');
          } else {
            console.log('   ✅ Previous transaction is different - coin should be unlocked');
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error checking coin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.log('❌ NO USABLE COINS FOUND!');
    console.log('💡 All available coins have insufficient balance (< 0.1 SUI)');
    console.log('💡 You need coins with at least 0.1 SUI for gas');
    console.log('💡 Add more SUI to the wallet to create coins with sufficient balance');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 Recommendations:\n');
  
  if (availableCoins.length === 0) {
    console.log('1. Add more SUI to admin wallet to create new unlocked coins');
    console.log(`   Address: ${adminWallet.getAddress()}`);
    console.log('   Testnet faucet: https://discord.com/channels/916379725201563759/971488439931392130');
  } else if (!selectedCoin) {
    console.log('1. Coins exist but have insufficient balance');
    console.log('2. Add more SUI to create coins with >= 0.1 SUI balance');
  } else {
    console.log('1. ✅ Scheduler should work - unlocked coins are available');
    console.log('2. If scheduler still fails, check:');
    console.log('   - Scheduler logs for specific error messages');
    console.log('   - Whether the selected coin is actually being used');
    console.log('   - If there are other errors (not just coin locks)');
  }
  
  console.log('\n3. Check scheduler logs for:');
  console.log('   - "Available gas coins" - should show multiple coins');
  console.log('   - "Filtered out locked coin" - confirms locked coin is filtered');
  console.log('   - "Selected gas coin" - should NOT be the locked coin');
}

checkSchedulerCoins().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

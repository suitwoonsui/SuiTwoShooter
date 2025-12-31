// ==========================================
// Check Network Configuration
// ==========================================
// Verifies which network the scheduler and services are configured to use

import * as dotenv from 'dotenv';
import * as path from 'path';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

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

async function checkNetworkConfig() {
  console.log('🔍 Checking Network Configuration\n');
  console.log('='.repeat(60));
  
  // Check environment variables
  console.log('📋 Environment Variables:\n');
  console.log(`   SUI_TESTNET_NETWORK: ${process.env.SUI_TESTNET_NETWORK || '(not set)'}`);
  console.log(`   SUI_MAINNET_NETWORK: ${process.env.SUI_MAINNET_NETWORK || '(not set)'}`);
  console.log(`   SUI_NETWORK: ${process.env.SUI_NETWORK || '(not set)'}`);
  console.log(`   SUI_TESTNET_RPC_URL: ${process.env.SUI_TESTNET_RPC_URL || '(not set)'}`);
  console.log(`   SUI_MAINNET_RPC_URL: ${process.env.SUI_MAINNET_RPC_URL || '(not set)'}\n`);
  
  // Determine network (same logic as config)
  let network: 'testnet' | 'mainnet' | 'devnet' = 'mainnet';
  if (process.env.SUI_TESTNET_NETWORK) {
    network = 'testnet';
  } else if (process.env.SUI_MAINNET_NETWORK) {
    network = 'mainnet';
  } else if (process.env.SUI_NETWORK) {
    network = process.env.SUI_NETWORK as 'testnet' | 'mainnet' | 'devnet';
  }
  
  console.log('📋 Determined Network:\n');
  console.log(`   Network: ${network}`);
  console.log(`   RPC URL: ${network === 'testnet' ? 'https://fullnode.testnet.sui.io:443' : 'https://fullnode.mainnet.sui.io:443'}\n`);
  
  // Test both clients
  console.log('📋 Testing Network Connections:\n');
  
  const testnetClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  const mainnetClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
  
  try {
    const testnetInfo = await testnetClient.getChainIdentifier();
    console.log(`   ✅ Testnet Client: Connected`);
    console.log(`      Chain ID: ${testnetInfo}`);
    console.log(`      RPC: https://fullnode.testnet.sui.io:443\n`);
  } catch (error) {
    console.log(`   ❌ Testnet Client: Failed`);
    console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
  
  try {
    const mainnetInfo = await mainnetClient.getChainIdentifier();
    console.log(`   ✅ Mainnet Client: Connected`);
    console.log(`      Chain ID: ${mainnetInfo}`);
    console.log(`      RPC: https://fullnode.mainnet.sui.io:443\n`);
  } catch (error) {
    console.log(`   ❌ Mainnet Client: Failed`);
    console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
  
  // Check which client scheduler would use
  console.log('📋 Scheduler Configuration:\n');
  const schedulerClient = network === 'testnet' ? testnetClient : mainnetClient;
  
  console.log(`   Scheduler will use: ${network.toUpperCase()}`);
  console.log(`   Client RPC: ${network === 'testnet' ? 'https://fullnode.testnet.sui.io:443' : 'https://fullnode.mainnet.sui.io:443'}\n`);
  
  // Get admin wallet address from env (if available)
  const adminAddress = process.env.GAME_WALLET_ADDRESS || process.env.ADMIN_WALLET_ADDRESS;
  
  if (adminAddress) {
    console.log('📋 Admin Wallet Address:\n');
    console.log(`   Address: ${adminAddress}\n`);
    
    // Check coins on the configured network
    console.log('📋 Checking Coins on Configured Network:\n');
    try {
      const coins = await schedulerClient.getCoins({
        owner: adminAddress,
        coinType: '0x2::sui::SUI',
      });
      
      console.log(`   ✅ Found ${coins.data?.length || 0} coin(s) on ${network}`);
      
      if (coins.data && coins.data.length > 0) {
        const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
        const totalBalanceSui = (totalBalance / BigInt(1_000_000_000)).toString();
        console.log(`   Total Balance: ${totalBalanceSui} SUI\n`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to fetch coins`);
      console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
    
    // Check coins on the OTHER network (for comparison)
    console.log('📋 Checking Coins on OTHER Network (for comparison):\n');
    try {
      const otherClient = network === 'testnet' ? mainnetClient : testnetClient;
      const otherNetwork = network === 'testnet' ? 'mainnet' : 'testnet';
      
      const coins = await otherClient.getCoins({
        owner: adminAddress,
        coinType: '0x2::sui::SUI',
      });
      
      console.log(`   Found ${coins.data?.length || 0} coin(s) on ${otherNetwork}`);
      
      if (coins.data && coins.data.length > 0) {
        const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
        const totalBalanceSui = (totalBalance / BigInt(1_000_000_000)).toString();
        console.log(`   Total Balance: ${totalBalanceSui} SUI\n`);
      } else {
        console.log(`   ⚠️  No coins found on ${otherNetwork} - this is expected if you're only using ${network}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to fetch coins from ${network === 'testnet' ? 'mainnet' : 'testnet'}`);
      console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  } else {
    console.log('⚠️  Admin wallet address not found in environment variables\n');
    console.log('   Set GAME_WALLET_ADDRESS or ADMIN_WALLET_ADDRESS to check coin balances\n');
  }
  
  console.log('='.repeat(60));
  console.log('💡 Summary:\n');
  console.log(`   Configured Network: ${network.toUpperCase()}`);
  console.log(`   Scheduler will use: ${network.toUpperCase()}`);
  
  if (network === 'testnet') {
    console.log(`   ✅ Using TESTNET - This is correct for development`);
  } else {
    console.log(`   ⚠️  Using MAINNET - Make sure this is intentional!`);
  }
  
  console.log('\n💡 If the network is wrong:');
  console.log('   1. Set SUI_TESTNET_NETWORK=true in .env.local for testnet');
  console.log('   2. Set SUI_MAINNET_NETWORK=true in .env.local for mainnet');
  console.log('   3. Or set SUI_NETWORK=testnet or SUI_NETWORK=mainnet');
  console.log('   4. Restart the server after changing environment variables');
}

checkNetworkConfig().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

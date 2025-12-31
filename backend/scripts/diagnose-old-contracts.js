/**
 * Diagnostic script to check access to old contracts
 * This will help identify why we can't fetch data from old contracts
 */

require('dotenv').config({ path: '.env.local' });
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');

async function diagnoseOldContracts() {
  console.log('🔍 Diagnosing Old Contract Access Issues\n');
  console.log('=' .repeat(60));
  console.log('');

  // Get network
  const network = process.env.SUI_NETWORK || process.env.SUI_TESTNET_NETWORK || 'testnet';
  console.log(`🌐 Network: ${network}`);
  console.log('');

  // Initialize client
  const client = new SuiClient({
    url: getFullnodeUrl(network)
  });

  // Check environment variables
  console.log('📋 Environment Variables Check:');
  console.log('-'.repeat(60));
  
  const envVars = {
    'OLD_GAME_SCORE_CONTRACT_TESTNET': process.env.OLD_GAME_SCORE_CONTRACT_TESTNET,
    'OLD_SESSION_REGISTRY_OBJECT_ID_TESTNET': process.env.OLD_SESSION_REGISTRY_OBJECT_ID_TESTNET,
    'OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET': process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET,
    'OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET': process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET,
    'OLD_PREMIUM_STORE_CONTRACT_TESTNET': process.env.OLD_PREMIUM_STORE_CONTRACT_TESTNET,
    'OLD_PREMIUM_STORE_OBJECT_ID_TESTNET': process.env.OLD_PREMIUM_STORE_OBJECT_ID_TESTNET,
    'OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET': process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET,
    'OLD_GAME_PASS_CONTRACT_TESTNET': process.env.OLD_GAME_PASS_CONTRACT_TESTNET,
    'OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET': process.env.OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET,
    'OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET': process.env.OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET,
    'OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET': process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET,
  };

  let missingVars = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`❌ ${key}: NOT SET`);
      missingVars.push(key);
    }
  }
  console.log('');

  if (missingVars.length > 0) {
    console.log('⚠️  Missing environment variables detected!');
    console.log('   These need to be set in backend/.env.local');
    console.log('');
  }

  // Get old package ID
  const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET;
  if (!oldPackageId) {
    console.log('❌ OLD_GAME_SCORE_CONTRACT_TESTNET not set. Cannot proceed.');
    console.log('');
    console.log('💡 Solution: Add OLD_GAME_SCORE_CONTRACT_TESTNET to backend/.env.local');
    console.log('   From DEPLOYMENT_IDS.md, use: 0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0');
    return;
  }

  console.log('🔍 Checking Old Package:');
  console.log('-'.repeat(60));
  console.log(`Package ID: ${oldPackageId}`);
  console.log('');

  // Check if package exists
  try {
    console.log('1️⃣  Checking if old package exists...');
    const packageObj = await client.getObject({
      id: oldPackageId,
      options: { showType: true, showContent: false }
    });

    if (packageObj.error) {
      console.log(`   ❌ Package not found or error: ${packageObj.error.code}`);
      console.log(`   Error message: ${packageObj.error.message || 'Unknown'}`);
      console.log('');
      console.log('💡 The old package may have been deleted or the ID is incorrect.');
      return;
    }

    console.log(`   ✅ Package exists`);
    console.log(`   Type: ${packageObj.data?.type || 'Unknown'}`);
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error checking package: ${error.message}`);
    console.log('');
    return;
  }

  // Check old statistics registry
  const oldStatsRegistryId = process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET;
  if (oldStatsRegistryId) {
    console.log('2️⃣  Checking Old Statistics Registry:');
    console.log('-'.repeat(60));
    console.log(`Object ID: ${oldStatsRegistryId}`);
    console.log('');

    try {
      const statsObj = await client.getObject({
        id: oldStatsRegistryId,
        options: { showType: true, showContent: false }
      });

      if (statsObj.error) {
        console.log(`   ❌ Statistics Registry not found: ${statsObj.error.code}`);
        console.log(`   Error: ${statsObj.error.message || 'Unknown'}`);
      } else {
        console.log(`   ✅ Statistics Registry exists`);
        console.log(`   Type: ${statsObj.data?.type || 'Unknown'}`);
        
        // Try to call get_player_stats function
        console.log('');
        console.log('   🔍 Testing get_player_stats function...');
        try {
          const testAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
          const tx = new Transaction();
          tx.moveCall({
            target: `${oldPackageId}::score_submission::get_player_stats`,
            arguments: [
              tx.object(oldStatsRegistryId),
              tx.pure.address(testAddress),
            ],
          });

          const result = await client.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: testAddress,
          });

          if (result.results && result.results.length > 0) {
            console.log(`   ✅ Function call successful`);
            console.log(`   Return values: ${result.results[0].returnValues?.length || 0}`);
          } else {
            console.log(`   ⚠️  Function call returned no results`);
          }
        } catch (funcError) {
          console.log(`   ❌ Function call failed: ${funcError.message}`);
          console.log(`   This might mean:`);
          console.log(`   - The function doesn't exist in the old contract`);
          console.log(`   - The function signature changed`);
          console.log(`   - The package ID is incorrect`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error checking Statistics Registry: ${error.message}`);
      console.log('');
    }
  } else {
    console.log('2️⃣  Skipping Statistics Registry check (not configured)');
    console.log('');
  }

  // Check old game pass system
  const oldGamePassSystemId = process.env.OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET;
  if (oldGamePassSystemId) {
    console.log('3️⃣  Checking Old Game Pass System:');
    console.log('-'.repeat(60));
    console.log(`Object ID: ${oldGamePassSystemId}`);
    console.log('');

    try {
      const gamePassObj = await client.getObject({
        id: oldGamePassSystemId,
        options: { showType: true, showContent: false }
      });

      if (gamePassObj.error) {
        console.log(`   ❌ Game Pass System not found: ${gamePassObj.error.code}`);
        console.log(`   Error: ${gamePassObj.error.message || 'Unknown'}`);
      } else {
        console.log(`   ✅ Game Pass System exists`);
        console.log(`   Type: ${gamePassObj.data?.type || 'Unknown'}`);
        
        // Try to call has_active_pass function
        console.log('');
        console.log('   🔍 Testing has_active_pass function...');
        try {
          const testAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
          const tx = new Transaction();
          tx.moveCall({
            target: `${oldPackageId}::game_pass::has_active_pass`,
            arguments: [
              tx.object(oldGamePassSystemId),
              tx.pure.address(testAddress),
            ],
          });

          const result = await client.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: testAddress,
          });

          if (result.results && result.results.length > 0) {
            console.log(`   ✅ Function call successful`);
          } else {
            console.log(`   ⚠️  Function call returned no results`);
          }
        } catch (funcError) {
          console.log(`   ❌ Function call failed: ${funcError.message}`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error checking Game Pass System: ${error.message}`);
      console.log('');
    }
  } else {
    console.log('3️⃣  Skipping Game Pass System check (not configured)');
    console.log('');
  }

  // Summary
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log('');
  
  if (missingVars.length === 0) {
    console.log('✅ All required environment variables are set');
  } else {
    console.log(`⚠️  ${missingVars.length} environment variable(s) missing`);
    console.log('');
    console.log('💡 To fix this:');
    console.log('   1. Open backend/.env.local');
    console.log('   2. Copy the OLD_ prefixed values from contracts/suitwo_game/DEPLOYMENT_IDS.md');
    console.log('   3. Add them to your .env.local file');
    console.log('   4. Restart your backend server');
  }
  console.log('');
}

// Run diagnosis
diagnoseOldContracts().catch(error => {
  console.error('❌ Diagnostic script failed:', error);
  process.exit(1);
});


/**
 * Diagnostic script to check why wallet discovery isn't finding wallets with stats
 * This will help identify if:
 * 1. Events exist in the old contract
 * 2. Dynamic fields exist in the old stats registry
 * 3. Data actually exists for known wallet addresses
 */

require('dotenv').config({ path: '.env.local' });
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');

async function diagnoseWalletDiscovery() {
  console.log('🔍 Diagnosing Wallet Discovery Issues\n');
  console.log('='.repeat(60));
  console.log('');

  // Get network
  const network = process.env.SUI_NETWORK || process.env.SUI_TESTNET_NETWORK || 'testnet';
  console.log(`🌐 Network: ${network}`);
  console.log('');

  // Initialize client
  const client = new SuiClient({
    url: getFullnodeUrl(network)
  });

  // Get old package ID and stats registry ID
  const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
  const oldStatsRegistryId = process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;

  if (!oldPackageId) {
    console.log('❌ OLD_GAME_SCORE_CONTRACT_TESTNET not set');
    return;
  }

  if (!oldStatsRegistryId) {
    console.log('❌ OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET not set');
    return;
  }

  console.log('📋 Configuration:');
  console.log('-'.repeat(60));
  console.log(`Old Package ID: ${oldPackageId}`);
  console.log(`Old Stats Registry ID: ${oldStatsRegistryId}`);
  console.log('');

  // Step 1: Check if old stats registry exists
  console.log('1️⃣  Checking if old stats registry exists...');
  try {
    const registryObj = await client.getObject({
      id: oldStatsRegistryId,
      options: { showType: true, showContent: true }
    });

    if (registryObj.error) {
      console.log(`   ❌ Stats registry not found: ${registryObj.error.code}`);
      console.log(`   Error: ${registryObj.error.message || 'Unknown'}`);
      return;
    }

    console.log(`   ✅ Stats registry exists`);
    console.log(`   Type: ${registryObj.data?.type || 'Unknown'}`);
    
    // Check if it has a player_stats_table field
    if (registryObj.data?.content && registryObj.data.content.dataType === 'moveObject') {
      const fields = registryObj.data.content.fields;
      if (fields.player_stats_table) {
        console.log(`   ✅ Has player_stats_table field`);
        console.log(`   Table ID: ${fields.player_stats_table.fields?.id?.id || 'N/A'}`);
      } else {
        console.log(`   ⚠️  No player_stats_table field found`);
        console.log(`   Available fields: ${Object.keys(fields).join(', ')}`);
      }
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error checking stats registry: ${error.message}`);
    return;
  }

  // Step 2: Try to get dynamic fields from stats registry
  console.log('2️⃣  Checking dynamic fields in stats registry...');
  try {
    const dynamicFields = await client.getDynamicFields({
      parentId: oldStatsRegistryId,
      limit: 100
    });

    console.log(`   Found ${dynamicFields.data.length} dynamic fields`);
    
    if (dynamicFields.data.length > 0) {
      console.log(`   ✅ Dynamic fields exist - wallets should be discoverable`);
      console.log(`   First few fields:`);
      dynamicFields.data.slice(0, 5).forEach((field, idx) => {
        console.log(`     ${idx + 1}. Type: ${field.name?.type}, Value: ${field.name?.value || 'N/A'}`);
      });
    } else {
      console.log(`   ⚠️  No dynamic fields found - this might mean no stats exist`);
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error getting dynamic fields: ${error.message}`);
    console.log('');
  }

  // Step 3: Query ScoreSubmitted events
  console.log('3️⃣  Querying ScoreSubmitted events from old package...');
  try {
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: oldPackageId,
          module: 'score_submission',
        },
      },
      limit: 100,
      order: 'descending'
    });

    console.log(`   Found ${events.data.length} events`);
    
    if (events.data.length > 0) {
      console.log(`   ✅ Events exist - wallets should be discoverable`);
      
      // Extract unique player addresses
      const walletsSet = new Set();
      events.data.forEach(event => {
        if (event.parsedJson && event.parsedJson.player) {
          walletsSet.add(event.parsedJson.player);
        }
      });
      
      const wallets = Array.from(walletsSet);
      console.log(`   Found ${wallets.length} unique wallet addresses in events`);
      
      if (wallets.length > 0) {
        console.log(`   First few wallets:`);
        wallets.slice(0, 5).forEach((wallet, idx) => {
          console.log(`     ${idx + 1}. ${wallet}`);
        });
      }
    } else {
      console.log(`   ⚠️  No events found - this might mean:`);
      console.log(`      - No scores were ever submitted to this contract`);
      console.log(`      - Events were not emitted`);
      console.log(`      - Package ID is incorrect`);
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error querying events: ${error.message}`);
    console.log('');
  }

  // Step 4: Try to query stats for a known wallet (if provided)
  const testWallet = process.argv[2]; // Get from command line argument
  if (testWallet) {
    console.log(`4️⃣  Testing stats query for wallet: ${testWallet}`);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${oldPackageId}::score_submission::get_player_stats`,
        arguments: [
          tx.object(oldStatsRegistryId),
          tx.pure.address(testWallet),
        ],
      });

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: testWallet,
      });

      if (result.results && result.results[0]?.returnValues) {
        const returnValues = result.results[0].returnValues;
        if (returnValues[0] && Array.isArray(returnValues[0][0]) && returnValues[0][0][0] === 1) {
          console.log(`   ✅ Wallet has stats in old contract!`);
          console.log(`   This confirms data exists and the contract is accessible.`);
        } else {
          console.log(`   ⚠️  Wallet has no stats in old contract`);
        }
      } else {
        console.log(`   ⚠️  Could not determine if wallet has stats`);
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error querying stats: ${error.message}`);
      console.log('');
    }
  } else {
    console.log('4️⃣  Skipping wallet test (provide wallet address as argument to test)');
    console.log('   Usage: node diagnose-wallet-discovery.js <wallet_address>');
    console.log('');
  }

  // Summary
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log('');
  console.log('If no wallets are found, possible reasons:');
  console.log('1. No data was ever stored in the old contract');
  console.log('2. The old package ID or stats registry ID is incorrect');
  console.log('3. Events were not emitted (check contract code)');
  console.log('4. Dynamic fields structure is different than expected');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   - Verify the old package ID on Sui Explorer');
  console.log('   - Check if ScoreSubmitted events exist for the old package');
  console.log('   - Try querying stats for a known wallet address');
  console.log('   - Check backend logs for detailed error messages');
  console.log('');
}

// Run diagnosis
const testWallet = process.argv[2];
diagnoseWalletDiscovery(testWallet).catch(error => {
  console.error('❌ Diagnostic script failed:', error);
  process.exit(1);
});


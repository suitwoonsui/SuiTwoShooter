/**
 * Check which deployment actually has player data
 * This will query multiple deployments to find where the data actually exists
 */

require('dotenv').config({ path: '.env' });
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');

async function checkDeployments() {
  console.log('🔍 Checking Which Deployment Has Player Data\n');
  console.log('='.repeat(60));
  console.log('');

  const network = process.env.SUI_NETWORK || process.env.SUI_TESTNET_NETWORK || 'testnet';
  const client = new SuiClient({
    url: getFullnodeUrl(network)
  });

  // Test wallet address (you can change this to a known wallet)
  const testWallet = process.argv[2] || '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0';
  
  console.log(`🌐 Network: ${network}`);
  console.log(`👤 Test Wallet: ${testWallet}`);
  console.log('');

  // Deployments to check (from newest to oldest)
  const deployments = [
    {
      name: 'Current (2025-12-23)',
      packageId: '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352',
      statsRegistry: '0x1e8e0cd84fbe743a73f94c36d812cbda2e8e5038fcf3198daf1239b8893859ff',
      storeObject: '0x2919169a7ebadd3c95f4c9c1b2c4c9b9a5c9185ef69a3208b1866f9c81df8559',
    },
    {
      name: 'Previous (2025-12-22) - OLD_ in .env',
      packageId: '0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0',
      statsRegistry: '0x84dd37ba8e450bdc213fe20c4558ae8ffe342f31372e9185429783ba4df140cb',
      storeObject: '0x885d575c7c94d4fcee0e1e4220585de00616e7d4098c57ef7c0f318c99a03dcf',
    },
    {
      name: 'Older (2025-12-21)',
      packageId: '0x09b63ced8a7af6aaf620e8baba1c5d8840524eb1767cca70b679c1a6961d1b08',
      statsRegistry: '0x73b42806b5324b8359a507c924b24e4161af5b72f0bf62c4a87b9bccd3dc4f59',
      storeObject: '0xc0272b762e644dd95e6dfcb374f647838103ee165e9a824152c0b68f23cfcba7',
    },
  ];

  for (const deployment of deployments) {
    console.log(`📦 Checking ${deployment.name}:`);
    console.log('-'.repeat(60));
    console.log(`Package: ${deployment.packageId.substring(0, 20)}...`);
    console.log(`Stats Registry: ${deployment.statsRegistry.substring(0, 20)}...`);
    console.log(`Store Object: ${deployment.storeObject.substring(0, 20)}...`);
    console.log('');

    // Check 1: Query events
    console.log('  1️⃣  Checking events...');
    try {
      const events = await client.queryEvents({
        query: {
          MoveModule: {
            package: deployment.packageId,
            module: 'score_submission',
          },
        },
        limit: 10,
        order: 'descending',
      });

      console.log(`     Found ${events.data.length} events`);
      if (events.data.length > 0) {
        const wallets = new Set();
        events.data.forEach(e => {
          if (e.parsedJson?.player) wallets.add(e.parsedJson.player);
        });
        console.log(`     ✅ ${wallets.size} unique wallets in events`);
      } else {
        console.log(`     ⚠️  No events found`);
      }
    } catch (error) {
      console.log(`     ❌ Error: ${error.message}`);
    }
    console.log('');

    // Check 2: Query stats for test wallet
    console.log('  2️⃣  Checking stats for test wallet...');
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${deployment.packageId}::score_submission::get_player_stats`,
        arguments: [
          tx.object(deployment.statsRegistry),
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
          console.log(`     ✅ Wallet HAS stats in this deployment!`);
        } else {
          console.log(`     ⚠️  Wallet has NO stats in this deployment`);
        }
      }
    } catch (error) {
      console.log(`     ❌ Error: ${error.message}`);
    }
    console.log('');

    // Check 3: Check dynamic fields in stats registry
    console.log('  3️⃣  Checking dynamic fields in stats registry...');
    try {
      const fields = await client.getDynamicFields({
        parentId: deployment.statsRegistry,
        limit: 10,
      });
      console.log(`     Found ${fields.data.length} dynamic fields`);
      if (fields.data.length > 0) {
        console.log(`     ✅ Stats registry has data`);
      } else {
        console.log(`     ⚠️  Stats registry is empty`);
      }
    } catch (error) {
      console.log(`     ❌ Error: ${error.message}`);
    }
    console.log('');

    // Check 4: Check dynamic fields in store
    console.log('  4️⃣  Checking dynamic fields in store...');
    try {
      const fields = await client.getDynamicFields({
        parentId: deployment.storeObject,
        limit: 10,
      });
      console.log(`     Found ${fields.data.length} dynamic fields`);
      if (fields.data.length > 0) {
        console.log(`     ✅ Store has data`);
      } else {
        console.log(`     ⚠️  Store is empty`);
      }
    } catch (error) {
      console.log(`     ❌ Error: ${error.message}`);
    }
    console.log('');
    console.log('');
  }

  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log('This will help identify which deployment actually contains your player data.');
  console.log('Use the deployment that shows:');
  console.log('  ✅ Events found');
  console.log('  ✅ Wallet has stats');
  console.log('  ✅ Dynamic fields exist');
  console.log('');
}

checkDeployments().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


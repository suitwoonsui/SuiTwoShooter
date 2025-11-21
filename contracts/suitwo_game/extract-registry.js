// Extract Session Registry, Premium Store, and Badge Registry Object IDs from transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
// Deployment transaction
const deployTxDigest = 'EEpwYW2EN566p3x3onsApw7cJrq1MHdYRHQzeq4GYR5F';
// Badge Registry initialization transaction
const badgeInitTxDigest = 'FNChhLzYgEkXegeswPUSLc7NWucU5F2tN4DKWsCpQJxz';

async function extractObjects() {
  try {
    // First, extract from deployment transaction
    console.log('🔍 Querying deployment transaction:', deployTxDigest);
    const deployTx = await client.getTransactionBlock({
      digest: deployTxDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    // Then, extract BadgeRegistry from initialization transaction
    console.log('\n🔍 Querying badge registry initialization transaction:', badgeInitTxDigest);
    const badgeInitTx = await client.getTransactionBlock({
      digest: badgeInitTxDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });

    let sessionRegistryObjectId = null;
    let statisticsRegistryObjectId = null;
    let premiumStoreObjectId = null;
    let publisherObjectId = null;
    let badgeRegistryObjectId = null;

    console.log('\n📋 Checking deployment objectChanges...');
    if (deployTx.objectChanges) {
      for (const change of deployTx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          console.log(`  - ${change.type}: ${change.objectType}`);
          if (change.objectType.includes('SessionRegistry')) {
            sessionRegistryObjectId = change.objectId;
            console.log('\n✅ Found Session Registry!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
          if (change.objectType.includes('StatisticsRegistry')) {
            statisticsRegistryObjectId = change.objectId;
            console.log('\n✅ Found Statistics Registry!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
          if (change.objectType.includes('PremiumStore')) {
            premiumStoreObjectId = change.objectId;
            console.log('\n✅ Found Premium Store!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
          if (change.objectType.includes('Publisher')) {
            publisherObjectId = change.objectId;
            console.log('\n✅ Found Publisher!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
        }
      }
    }
    
    console.log('\n📋 Checking badge registry initialization objectChanges...');
    if (badgeInitTx.objectChanges) {
      for (const change of badgeInitTx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          console.log(`  - ${change.type}: ${change.objectType}`);
          if (change.objectType.includes('BadgeRegistry')) {
            badgeRegistryObjectId = change.objectId;
            console.log('\n✅ Found Badge Registry!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
        }
      }
    }

    console.log('\n📋 Summary:');
    if (sessionRegistryObjectId) {
      console.log(`   ✅ Session Registry: ${sessionRegistryObjectId}`);
    } else {
      console.log('   ⚠️  Session Registry: Not found');
    }
    if (statisticsRegistryObjectId) {
      console.log(`   ✅ Statistics Registry: ${statisticsRegistryObjectId}`);
    } else {
      console.log('   ⚠️  Statistics Registry: Not found');
    }
    if (premiumStoreObjectId) {
      console.log(`   ✅ Premium Store: ${premiumStoreObjectId}`);
    } else {
      console.log('   ⚠️  Premium Store: Not found');
    }
    if (publisherObjectId) {
      console.log(`   ✅ Publisher: ${publisherObjectId}`);
    } else {
      console.log('   ⚠️  Publisher: Not found');
    }
    if (badgeRegistryObjectId) {
      console.log(`   ✅ Badge Registry: ${badgeRegistryObjectId}`);
    } else {
      console.log('   ⚠️  Badge Registry: Not found (may need to be initialized separately)');
    }

    return { sessionRegistryObjectId, statisticsRegistryObjectId, premiumStoreObjectId, publisherObjectId, badgeRegistryObjectId };
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

extractObjects();


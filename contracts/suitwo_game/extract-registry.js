// Extract Session Registry and Premium Store Object IDs from transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const txDigest = 'HfTgofSR5ovvaotcKhzp1T4ffy21Ycnv4XdnYrpAdJ5X';

async function extractObjects() {
  try {
    console.log('🔍 Querying transaction:', txDigest);
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });

    let sessionRegistryObjectId = null;
    let premiumStoreObjectId = null;

    console.log('\n📋 Checking objectChanges...');
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          console.log(`  - ${change.type}: ${change.objectType}`);
          if (change.objectType.includes('SessionRegistry')) {
            sessionRegistryObjectId = change.objectId;
            console.log('\n✅ Found Session Registry!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
          if (change.objectType.includes('PremiumStore')) {
            premiumStoreObjectId = change.objectId;
            console.log('\n✅ Found Premium Store!');
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
    if (premiumStoreObjectId) {
      console.log(`   ✅ Premium Store: ${premiumStoreObjectId}`);
    } else {
      console.log('   ⚠️  Premium Store: Not found');
    }

    return { sessionRegistryObjectId, premiumStoreObjectId };
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

extractObjects();


// Extract Publisher object ID from deployment transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = '9GGZTgUuMqUChJ5koNu3Yj2TVtsnvQG6XraGPtqaXC97';
const packageId = '0x5c747e8ba3e93a028c3c35a2a997ab0ad6d86d5a373497f6be71439ff1e1fe71';

async function extractPublisher() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Examining deployment transaction:', txDigest);
    console.log('   Package ID:', packageId);
    console.log('');
    
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    let publisherObjectId = null;
    
    if (tx.objectChanges) {
      console.log('📋 Checking objectChanges...');
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          console.log(`   Found: ${change.objectType}`);
          if (change.objectType.includes('Publisher') && change.objectType.includes('badge_system')) {
            publisherObjectId = change.objectId;
            console.log(`   ✅ Found Badge Publisher: ${publisherObjectId}`);
            break;
          }
        }
      }
    }
    
    // Also check events for Publisher creation
    if (!publisherObjectId && tx.events) {
      console.log('\n📋 Checking events...');
      for (const event of tx.events) {
        if (event.type && event.type.includes('Publisher')) {
          console.log(`   Event: ${event.type}`);
        }
      }
    }
    
    // Also check the package's published objects
    if (!publisherObjectId) {
      console.log('\n📋 Searching for Publisher in package...');
      try {
        const packageObj = await client.getObject({
          id: packageId,
          options: {
            showContent: true,
            showOwner: true,
          },
        });
        
        // Publishers are typically owned by the package publisher address
        // Let's search by querying objects with the Publisher type
        const allObjects = await client.getOwnedObjects({
          owner: '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3',
          filter: {
            StructType: `${packageId}::badge_system::Publisher`,
          },
          options: {
            showType: true,
          },
          limit: 10,
        });
        
        if (allObjects.data && allObjects.data.length > 0) {
          publisherObjectId = allObjects.data[0].data?.objectId;
          console.log(`   ✅ Found Publisher: ${publisherObjectId}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Error searching: ${error.message}`);
      }
    }
    
    if (publisherObjectId) {
      console.log('\n📝 Badge Publisher Object ID:');
      console.log(`   BADGE_PUBLISHER_OBJECT_ID_TESTNET=${publisherObjectId}`);
    } else {
      console.log('\n❌ Badge Publisher object ID not found');
      console.log('   💡 The Publisher should be created automatically during package deployment.');
      console.log('   Check if the package deployment included the badge_system module.');
    }
    
    return publisherObjectId;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

extractPublisher();


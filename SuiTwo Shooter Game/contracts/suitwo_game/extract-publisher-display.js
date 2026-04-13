// Extract Publisher and Display Object IDs from deployment transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
// Current deployment transaction
const deployTxDigest = 'GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG';
const packageId = '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449';

async function extractPublisherAndDisplay() {
  try {
    console.log('🔍 Querying deployment transaction:', deployTxDigest);
    const deployTx = await client.getTransactionBlock({
      digest: deployTxDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });

    let publisherObjectId = null;
    let displayObjectId = null;

    console.log('\n📋 Checking objectChanges for Publisher and Display...');
    if (deployTx.objectChanges) {
      for (const change of deployTx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          console.log(`  - ${change.type}: ${change.objectType}`);
          if (change.objectType.includes('Publisher') || change.objectType.includes('badge_system::Publisher')) {
            publisherObjectId = change.objectId;
            console.log('\n✅ Found Publisher!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
          if (change.objectType.includes('Display') || change.objectType.includes('badge_system::Display')) {
            displayObjectId = change.objectId;
            console.log('\n✅ Found Display!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
        }
        // Also check for transferred objects (Publisher might be transferred to deployer)
        if (change.type === 'transferred' && change.objectType) {
          if (change.objectType.includes('Publisher') || change.objectType.includes('badge_system::Publisher')) {
            publisherObjectId = change.objectId;
            console.log('\n✅ Found Publisher (transferred)!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
        }
      }
    }

    // If Publisher not found in transaction, try to find it by querying the deployer's objects
    if (!publisherObjectId) {
      console.log('\n🔍 Publisher not found in transaction. Searching deployer wallet...');
      const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
      
      try {
        const objects = await client.getOwnedObjects({
          owner: deployerAddress,
          filter: {
            StructType: `${packageId}::badge_system::Publisher`,
          },
          options: {
            showType: true,
            showOwner: true,
          },
        });

        if (objects.data && objects.data.length > 0) {
          publisherObjectId = objects.data[0].data?.objectId;
          console.log('\n✅ Found Publisher in deployer wallet!');
          console.log('   Object ID:', publisherObjectId);
        }
      } catch (error) {
        console.warn('   ⚠️  Could not query deployer wallet:', error.message);
      }
    }

    console.log('\n📋 Summary:');
    if (publisherObjectId) {
      console.log(`   ✅ Publisher: ${publisherObjectId}`);
    } else {
      console.log('   ⚠️  Publisher: Not found (may need to check deployer wallet manually)');
    }
    if (displayObjectId) {
      console.log(`   ✅ Display: ${displayObjectId}`);
    } else {
      console.log('   ⚠️  Display: Not found (needs to be created separately via create_display function)');
    }

    if (publisherObjectId || displayObjectId) {
      console.log('\n📝 Add these to your backend/.env.local:');
      if (publisherObjectId) {
        console.log(`   BADGE_PUBLISHER_OBJECT_ID_TESTNET=${publisherObjectId}`);
      }
      if (displayObjectId) {
        console.log(`   BADGE_DISPLAY_OBJECT_ID_TESTNET=${displayObjectId}`);
      }
    }

    return { publisherObjectId, displayObjectId };
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

extractPublisherAndDisplay();


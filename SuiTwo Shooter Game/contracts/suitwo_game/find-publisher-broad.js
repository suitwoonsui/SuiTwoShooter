// Broad search for Publisher object
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
const packageId = '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449';

async function findPublisher() {
  try {
    console.log('🔍 Searching deployer wallet for Publisher object...');
    console.log('   Deployer:', deployerAddress);
    console.log('   Package ID:', packageId);
    
    // Get all objects owned by deployer
    const allObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      options: {
        showType: true,
        showOwner: true,
        showContent: false,
      },
    });

    console.log(`\n📦 Found ${allObjects.data?.length || 0} objects in deployer wallet`);
    
    let publisherObjectId = null;
    let displayObjectId = null;

    if (allObjects.data) {
      for (const obj of allObjects.data) {
        const objectType = obj.data?.type || '';
        const objectId = obj.data?.objectId || '';
        
        // Check for Publisher (various possible type formats)
        if (objectType.includes('Publisher') || 
            objectType.includes('publisher') ||
            objectType.includes('badge_system') && objectType.includes('Publisher')) {
          publisherObjectId = objectId;
          console.log('\n✅ Found Publisher!');
          console.log('   Object ID:', objectId);
          console.log('   Object Type:', objectType);
        }
        
        // Check for Display
        if (objectType.includes('Display') || 
            objectType.includes('display') ||
            objectType.includes('badge_system') && objectType.includes('Display')) {
          displayObjectId = objectId;
          console.log('\n✅ Found Display!');
          console.log('   Object ID:', objectId);
          console.log('   Object Type:', objectType);
        }
      }
    }

    // Also try querying with the specific type
    console.log('\n🔍 Trying specific type query...');
    try {
      const publisherQuery = await client.getOwnedObjects({
        owner: deployerAddress,
        filter: {
          StructType: `${packageId}::badge_system::Publisher`,
        },
        options: {
          showType: true,
        },
      });

      if (publisherQuery.data && publisherQuery.data.length > 0) {
        publisherObjectId = publisherQuery.data[0].data?.objectId;
        console.log('   ✅ Found via specific query:', publisherObjectId);
      }
    } catch (error) {
      console.log('   ⚠️  Specific query failed:', error.message);
    }

    console.log('\n📋 Summary:');
    if (publisherObjectId) {
      console.log(`   ✅ Publisher: ${publisherObjectId}`);
      console.log('\n📝 Add to your backend/.env.local:');
      console.log(`   BADGE_PUBLISHER_OBJECT_ID_TESTNET=${publisherObjectId}`);
    } else {
      console.log('   ⚠️  Publisher: Not found');
      console.log('   💡 The init() function should have created it. Check:');
      console.log('      1. Was the init() function called during deployment?');
      console.log('      2. Is the Publisher in a different wallet?');
      console.log('      3. Check Sui Explorer for the package:', packageId);
    }
    
    if (displayObjectId) {
      console.log(`   ✅ Display: ${displayObjectId}`);
      console.log(`   BADGE_DISPLAY_OBJECT_ID_TESTNET=${displayObjectId}`);
    } else {
      console.log('   ⚠️  Display: Not found (needs to be created via create_display function)');
    }

    return { publisherObjectId, displayObjectId };
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

findPublisher();


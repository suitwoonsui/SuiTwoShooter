// Find the Publisher object for the new package
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packageId = '0x5c747e8ba3e93a028c3c35a2a997ab0ad6d86d5a373497f6be71439ff1e1fe71';
const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function findPublisher() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Searching for Publisher object for package:', packageId);
    console.log('   Deployer address:', deployerAddress);
    console.log('');
    
    // Get package info to find the publisher address
    const packageInfo = await client.getObject({
      id: packageId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });

    if (!packageInfo || !packageInfo.data) {
      console.log('❌ Package not found');
      return;
    }

    const publisherAddress = packageInfo.data.owner?.AddressOwner;
    console.log('📦 Package owner (Publisher address):', publisherAddress);
    console.log('');

    if (!publisherAddress) {
      console.log('❌ Could not find publisher address from package');
      return;
    }

    // Search for Publisher objects owned by the publisher address
    const objects = await client.getOwnedObjects({
      owner: publisherAddress,
      filter: {
        StructType: `${packageId}::badge_system::Publisher`,
      },
      options: {
        showType: true,
        showOwner: true,
      },
    });

    if (objects.data && objects.data.length > 0) {
      console.log(`✅ Found ${objects.data.length} Publisher object(s):\n`);
      for (const obj of objects.data) {
        const objId = obj.data?.objectId;
        const objType = obj.data?.type;
        console.log(`   Publisher ID: ${objId}`);
        console.log(`   Type: ${objType}`);
        console.log('');
      }
      
      const publisherId = objects.data[0].data?.objectId;
      console.log('📝 Use this Publisher ID:');
      console.log(`   BADGE_PUBLISHER_OBJECT_ID_TESTNET=${publisherId}`);
      return publisherId;
    } else {
      console.log('❌ No Publisher object found');
      console.log('');
      console.log('💡 The Publisher should have been created during package deployment.');
      console.log('   Check the deployment transaction for a Publisher object.');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

findPublisher();

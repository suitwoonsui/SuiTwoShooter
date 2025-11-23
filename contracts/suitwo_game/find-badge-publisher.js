// Find Badge Publisher object from deployment transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = 'FiFL46L99TqY3h91EfNLy2pbu8uLR7yFEPC6kZStQRTo';
const packageId = '0xa235c3069ff0f2cd158ab6ecd9eccc436c094f064e3b5625957f88e3f47e0884';
const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function findBadgePublisher() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Searching for Badge Publisher object...\n');
    
    // First, check the deployment transaction
    console.log('1. Checking deployment transaction...');
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    let publisherId = null;
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          // Look for badge_system Publisher
          if (change.objectType.includes('badge_system') && change.objectType.includes('Publisher')) {
            publisherId = change.objectId;
            console.log('   ✅ Found in transaction:', publisherId);
            console.log('   Type:', change.objectType);
            return publisherId;
          }
        }
      }
    }
    
    // If not found in transaction, check deployer's wallet
    console.log('\n2. Checking deployer wallet for Publisher objects...');
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
      publisherId = objects.data[0].data?.objectId;
      console.log('   ✅ Found in wallet:', publisherId);
      return publisherId;
    }
    
    // Also check for generic Publisher that might be the badge Publisher
    console.log('\n3. Checking for generic Publisher objects...');
    const allObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      options: {
        showType: true,
      },
    });
    
    for (const obj of allObjects.data || []) {
      if (obj.data?.type?.includes('Publisher')) {
        console.log('   Found Publisher:', obj.data.objectId);
        console.log('   Type:', obj.data.type);
        // Check if it's from our package
        if (obj.data.type.includes(packageId)) {
          publisherId = obj.data.objectId;
          console.log('   ✅ This appears to be the badge Publisher!');
          return publisherId;
        }
      }
    }
    
    console.log('\n⚠️  Publisher not found. It may need to be created separately.');
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return null;
  }
}

findBadgePublisher().then(publisherId => {
  if (publisherId) {
    console.log('\n📝 Use this Publisher ID:');
    console.log(`   ${publisherId}`);
    console.log('\n📝 To create display, run:');
    console.log(`   node create-badge-display.js ${publisherId}`);
  }
});


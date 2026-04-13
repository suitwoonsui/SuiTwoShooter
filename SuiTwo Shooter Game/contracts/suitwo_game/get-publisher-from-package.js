// Get Publisher Object from Package
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packageId = '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449';
const publisherAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function getPublisherFromPackage() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Searching for Publisher object...');
    console.log('   Package ID:', packageId);
    console.log('   Publisher Address:', publisherAddress);
    console.log('');
    
    // Method 1: Query all objects owned by publisher address
    console.log('📦 Method 1: Querying objects owned by publisher...');
    const ownedObjects = await client.getOwnedObjects({
      owner: publisherAddress,
      options: {
        showType: true,
        showOwner: true,
      },
    });
    
    console.log(`   Found ${ownedObjects.data?.length || 0} objects\n`);
    
    let publisherFound = false;
    
    if (ownedObjects.data) {
      for (const obj of ownedObjects.data) {
        const objectType = obj.data?.type || '';
        const objectId = obj.data?.objectId || '';
        
        // Look for Publisher - could be in different modules
        if (objectType.includes('Publisher') || objectType.includes('publisher')) {
          console.log('✅ Found Publisher Object!');
          console.log('   Object ID:', objectId);
          console.log('   Type:', objectType);
          console.log('');
          console.log('📝 Use this to create the Display object:');
          console.log(`   node create-badge-display.js ${objectId}`);
          console.log(`   OR: node setup-badge-system.js ${objectId}`);
          publisherFound = true;
          break;
        }
      }
    }
    
    if (!publisherFound) {
      console.log('⚠️  Publisher not found in owned objects');
      console.log('');
      
      // Method 2: Try to get it from package published info
      console.log('📦 Method 2: Checking package published information...');
      try {
        const packageInfo = await client.getObject({
          id: packageId,
          options: {
            showContent: true,
            showOwner: true,
            showPreviousTransaction: true,
          },
        });
        
        console.log('   Package owner:', packageInfo.data?.owner);
        console.log('   Package type:', packageInfo.data?.type);
        
        // The Publisher might be accessible through the package's published modules
        // In Sui, Publisher is created when package is first published
        // It's typically owned by the publisher address
        
      } catch (error) {
        console.log('   Could not get package info:', error.message);
      }
      
      console.log('');
      console.log('💡 Alternative: The Publisher object might be:');
      console.log('   1. In a different wallet (if package was published by different address)');
      console.log('   2. Already used/consumed (if Display was already created)');
      console.log('   3. Need to check the original deployment transaction');
      console.log('');
      console.log('🔗 Check your deployment transaction:');
      console.log('   https://suiexplorer.com/txblock/GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG?network=testnet');
      console.log('');
      console.log('📝 If you can\'t find it, you can still use badges without Display.');
      console.log('   Display is optional - it only affects how badges appear in wallets.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

getPublisherFromPackage();


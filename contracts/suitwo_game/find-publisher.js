// Find Publisher Object ID
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packageId = process.env.PREMIUM_STORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT || 
                  '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449';

const publisherAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function findPublisher() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Searching for Publisher object...');
    console.log('   Package ID:', packageId);
    console.log('   Publisher Address:', publisherAddress);
    console.log('');
    
    // Get all objects owned by the publisher address
    const objects = await client.getOwnedObjects({
      owner: publisherAddress,
      options: {
        showType: true,
        showOwner: true,
        showContent: false,
      },
    });
    
    console.log(`📦 Found ${objects.data?.length || 0} objects owned by publisher\n`);
    
    let publisherFound = false;
    
    if (objects.data) {
      for (const obj of objects.data) {
        const objectType = obj.data?.type || '';
        const objectId = obj.data?.objectId || '';
        
        // Look for Publisher object
        if (objectType.includes('Publisher')) {
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
      console.log('⚠️  Publisher object not found in owned objects');
      console.log('');
      console.log('💡 Alternative methods to find Publisher:');
      console.log('   1. Check your deployment transaction on Sui Explorer');
      console.log('   2. Look for an object with type containing "Publisher"');
      console.log('   3. The Publisher might be in a different wallet');
      console.log('');
      console.log('🔗 Check deployment transaction:');
      console.log(`   https://suiexplorer.com/object/${packageId}?network=testnet`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

findPublisher();


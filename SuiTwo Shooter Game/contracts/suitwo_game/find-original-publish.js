// Find the original publish transaction that created the Publisher
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packageId = '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449';
const publisherAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function findOriginalPublish() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Finding original publish transaction...');
    console.log('   Package ID:', packageId);
    console.log('   Publisher Address:', publisherAddress);
    console.log('');
    
    // Method 1: Get package info to see publish info
    console.log('📦 Method 1: Checking package metadata...');
    try {
      const packageInfo = await client.getObject({
        id: packageId,
        options: {
          showContent: true,
          showOwner: true,
          showPreviousTransaction: true,
        },
      });
      
      if (packageInfo.data?.previousTransaction) {
        console.log('   Previous transaction:', packageInfo.data.previousTransaction);
        console.log('   This might be the original publish!');
        console.log('');
        console.log('🔗 Check this transaction:');
        console.log(`   https://suiexplorer.com/txblock/${packageInfo.data.previousTransaction}?network=testnet`);
        console.log('');
        console.log('   Or query it:');
        console.log(`   node extract-publisher-from-tx.js ${packageInfo.data.previousTransaction}`);
      }
    } catch (error) {
      console.log('   Could not get package info:', error.message);
    }
    
    // Method 2: Query all transactions for this package
    console.log('📦 Method 2: Searching for Publisher in your wallet...');
    console.log('   (Publisher should still exist from original publish)');
    console.log('');
    
    // Get ALL objects owned by publisher, including ones that might be Publisher
    const allObjects = await client.getOwnedObjects({
      owner: publisherAddress,
      options: {
        showType: true,
        showOwner: true,
      },
    });
    
    console.log(`   Found ${allObjects.data?.length || 0} total objects`);
    console.log('');
    console.log('   Searching for Publisher...');
    
    // Look for any object that might be a Publisher
    // Publisher type is: 0x2::package::Publisher
    const publisherObjects = [];
    
    if (allObjects.data) {
      for (const obj of allObjects.data) {
        const objectType = obj.data?.type || '';
        const objectId = obj.data?.objectId || '';
        
        // Check if it's a Publisher (could be in different formats)
        if (objectType.includes('package::Publisher') || 
            objectType.includes('Publisher') ||
            objectType === '0x2::package::Publisher') {
          publisherObjects.push({ id: objectId, type: objectType });
        }
      }
    }
    
    if (publisherObjects.length > 0) {
      console.log(`   ✅ Found ${publisherObjects.length} Publisher object(s)!`);
      console.log('');
      publisherObjects.forEach((pub, i) => {
        console.log(`   Publisher ${i + 1}:`);
        console.log('      Object ID:', pub.id);
        console.log('      Type:', pub.type);
        console.log('');
      });
      
      const firstPublisher = publisherObjects[0].id;
      console.log('📝 Use this to create Display:');
      console.log(`   node create-badge-display.js ${firstPublisher}`);
      console.log(`   OR: node setup-badge-system.js ${firstPublisher}`);
    } else {
      console.log('   ❌ No Publisher found in owned objects');
      console.log('');
      console.log('💡 The Publisher might be:');
      console.log('   1. In a different wallet (if someone else published originally)');
      console.log('   2. In the original publish transaction (need to find that transaction)');
      console.log('   3. Check your transaction history for the FIRST publish of this package');
    }
    
    // Method 3: Try to get package publish history
    console.log('');
    console.log('📦 Method 3: Package publish info...');
    console.log('   Package ID:', packageId);
    console.log('   Check Sui Explorer for package history:');
    console.log(`   https://suiexplorer.com/object/${packageId}?network=testnet`);
    console.log('');
    console.log('   Look for "Published" events or the first transaction that created this package.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

findOriginalPublish();


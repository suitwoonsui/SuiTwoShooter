// Deep search for Publisher object
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const publisherAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
const packageId = '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449';

async function deepSearch() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Deep search for Publisher object...');
    console.log('   Wallet:', publisherAddress);
    console.log('   Package:', packageId);
    console.log('');
    
    // Get ALL objects with pagination
    console.log('📦 Getting ALL objects from wallet (this may take a moment)...');
    let allObjects = [];
    let cursor = null;
    let hasNextPage = true;
    
    while (hasNextPage) {
      const response = await client.getOwnedObjects({
        owner: publisherAddress,
        options: {
          showType: true,
          showOwner: true,
          showContent: false,
        },
        cursor: cursor,
      });
      
      if (response.data) {
        allObjects = allObjects.concat(response.data);
      }
      
      hasNextPage = response.hasNextPage;
      cursor = response.nextCursor;
    }
    
    console.log(`   Total objects found: ${allObjects.length}`);
    console.log('');
    
    // Search for Publisher in all possible ways
    console.log('🔎 Searching for Publisher...');
    console.log('');
    
    const possiblePublishers = [];
    
    allObjects.forEach((obj, i) => {
      const objectType = obj.data?.type || '';
      const objectId = obj.data?.objectId || '';
      
      // Check for Publisher in various ways
      if (objectType.includes('Publisher') || 
          objectType.includes('publisher') ||
          objectType.toLowerCase().includes('publisher') ||
          objectId.includes('publisher') ||
          objectId.includes('Publisher')) {
        possiblePublishers.push({
          id: objectId,
          type: objectType,
          index: i
        });
      }
    });
    
    if (possiblePublishers.length > 0) {
      console.log(`✅ Found ${possiblePublishers.length} potential Publisher object(s):`);
      console.log('');
      possiblePublishers.forEach((pub, i) => {
        console.log(`   Publisher ${i + 1}:`);
        console.log('      Object ID:', pub.id);
        console.log('      Type:', pub.type);
        console.log('');
      });
      
      const firstPublisher = possiblePublishers[0].id;
      console.log('📝 Use this to create Display:');
      console.log(`   node create-badge-display.js ${firstPublisher}`);
    } else {
      console.log('❌ No Publisher object found in wallet');
      console.log('');
      
      // Show all object types for debugging
      console.log('📋 All unique object types in wallet:');
      const types = new Set();
      allObjects.forEach(obj => {
        if (obj.data?.type) {
          types.add(obj.data.type);
        }
      });
      
      const sortedTypes = Array.from(types).sort();
      sortedTypes.forEach(type => {
        console.log(`   - ${type}`);
      });
      
      console.log('');
      console.log('💡 Conclusion:');
      console.log('   The Publisher object does not exist in this wallet.');
      console.log('   This means either:');
      console.log('   1. The package was published without creating a Publisher');
      console.log('   2. The Publisher was transferred/consumed');
      console.log('   3. This version of Sui doesn\'t create Publisher for this publish method');
      console.log('');
      console.log('📝 Options:');
      console.log('   - Use badges without Display (they work fine, just no fancy metadata)');
      console.log('   - Republish the package to get a Publisher (creates new package ID)');
      console.log('   - Check if Display can be created another way');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

deepSearch();


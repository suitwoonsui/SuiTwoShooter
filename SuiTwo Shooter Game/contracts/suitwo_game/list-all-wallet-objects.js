// List ALL objects in wallet to help find Publisher
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const publisherAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function listAllObjects() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('📦 Listing ALL objects in your wallet...');
    console.log('   Address:', publisherAddress);
    console.log('');
    
    // Get all objects with pagination
    let allObjects = [];
    let cursor = null;
    let hasNextPage = true;
    let page = 1;
    
    while (hasNextPage) {
      console.log(`   Fetching page ${page}...`);
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
      page++;
    }
    
    console.log(`\n✅ Found ${allObjects.length} total objects\n`);
    console.log('═══════════════════════════════════════');
    console.log('📋 ALL OBJECTS IN WALLET');
    console.log('═══════════════════════════════════════\n');
    
    // Group by type
    const objectsByType = {};
    allObjects.forEach(obj => {
      const type = obj.data?.type || 'Unknown';
      if (!objectsByType[type]) {
        objectsByType[type] = [];
      }
      objectsByType[type].push(obj.data?.objectId);
    });
    
    // Sort types alphabetically
    const sortedTypes = Object.keys(objectsByType).sort();
    
    console.log('Objects grouped by type:\n');
    sortedTypes.forEach(type => {
      const count = objectsByType[type].length;
      console.log(`📦 ${type}`);
      console.log(`   Count: ${count}`);
      if (count <= 3) {
        objectsByType[type].forEach(id => {
          console.log(`   - ${id}`);
        });
      } else {
        console.log(`   - ${objectsByType[type][0]} (and ${count - 1} more)`);
      }
      console.log('');
    });
    
    // Specifically look for Publisher
    console.log('═══════════════════════════════════════');
    console.log('🔍 SEARCHING FOR PUBLISHER');
    console.log('═══════════════════════════════════════\n');
    
    const publisherObjects = [];
    allObjects.forEach(obj => {
      const type = obj.data?.type || '';
      const id = obj.data?.objectId || '';
      
      if (type.toLowerCase().includes('publisher') || 
          id.toLowerCase().includes('publisher')) {
        publisherObjects.push({ id, type });
      }
    });
    
    if (publisherObjects.length > 0) {
      console.log(`✅ Found ${publisherObjects.length} potential Publisher object(s):\n`);
      publisherObjects.forEach((p, i) => {
        console.log(`   ${i + 1}. Object ID: ${p.id}`);
        console.log(`      Type: ${p.type}`);
        console.log('');
      });
      console.log('📝 Use this to create Display:');
      console.log(`   node create-badge-display.js ${publisherObjects[0].id}`);
    } else {
      console.log('❌ No Publisher object found in wallet');
      console.log('');
      console.log('💡 What this means:');
      console.log('   - Publisher object does not exist in your wallet');
      console.log('   - This is why we can\'t create the Display object');
      console.log('   - Badges will still work, just without fancy metadata display');
    }
    
    // Also check for package-related objects
    console.log('\n═══════════════════════════════════════');
    console.log('📦 PACKAGE-RELATED OBJECTS');
    console.log('═══════════════════════════════════════\n');
    
    const packageObjects = [];
    allObjects.forEach(obj => {
      const type = obj.data?.type || '';
      if (type.includes('package') || type.includes('Package') || type.includes('UpgradeCap')) {
        packageObjects.push({
          id: obj.data?.objectId,
          type: type
        });
      }
    });
    
    if (packageObjects.length > 0) {
      console.log('Found package-related objects:\n');
      packageObjects.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.type}`);
        console.log(`      ID: ${p.id}`);
        console.log('');
      });
    } else {
      console.log('No package-related objects found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

listAllObjects();


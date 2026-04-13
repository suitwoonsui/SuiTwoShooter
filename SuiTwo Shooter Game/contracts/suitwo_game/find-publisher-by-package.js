// Find Publisher by querying package publish transactions
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Known package IDs from the codebase
const packageIds = [
  '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449', // Old
  '0xad85b74ca43ff929e5ad6a96d30ce979e7fc83a5f2ac65dd4dac0aeff0782be2', // New (from comprehensive check)
  '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', // This is actually the admin address, not a package
];

const adminAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function findPublisherForPackage(packageId) {
  try {
    console.log(`\n🔍 Checking package: ${packageId}`);
    
    // Get package info
    const packageInfo = await client.getObject({
      id: packageId,
      options: {
        showType: true,
        showOwner: true,
        showContent: true,
      },
    });
    
    if (packageInfo.error) {
      console.log(`   ❌ Package not found: ${packageInfo.error.code}`);
      return null;
    }
    
    console.log(`   ✅ Package found`);
    console.log(`   Type: ${packageInfo.data?.type || 'N/A'}`);
    
    // Try to find the publish transaction by querying events
    // Look for package publish events
    try {
      const events = await client.queryEvents({
        query: {
          Package: packageId,
        },
        limit: 10,
      });
      
      console.log(`   📋 Found ${events.data?.length || 0} events`);
      
      for (const event of events.data || []) {
        console.log(`   Event: ${event.id.eventSeq} - ${event.type}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Could not query events: ${e.message}`);
    }
    
    // Alternative: Query transactions that created this package
    // We can try to get the transaction from the package's version
    // But this might not be directly available via RPC
    
    return null;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function searchWalletForPublisher() {
  console.log('═══════════════════════════════════════');
  console.log('🔍 SEARCHING FOR PUBLISHER OBJECT');
  console.log('═══════════════════════════════════════\n');
  console.log('Method: Query wallet objects directly\n');
  
  try {
    // Get all objects owned by the admin wallet
    let cursor = null;
    let foundPublisher = false;
    let checkedCount = 0;
    const maxChecks = 100;
    
    do {
      const response = await client.getOwnedObjects({
        owner: adminAddress,
        filter: {
          StructType: '0x2::package::Publisher',
        },
        options: {
          showType: true,
          showOwner: true,
          showContent: false,
        },
        limit: 50,
        cursor: cursor,
      });
      
      const objects = response.data || [];
      checkedCount += objects.length;
      
      for (const obj of objects) {
        const objectType = obj.data?.type || '';
        if (objectType.includes('Publisher')) {
          foundPublisher = true;
          console.log('✅✅✅ FOUND PUBLISHER! ✅✅✅');
          console.log(`   Object ID: ${obj.data?.objectId}`);
          console.log(`   Type: ${objectType}`);
          console.log(`   Owner: ${JSON.stringify(obj.data?.owner)}`);
          console.log('\n💡 Next Steps:');
          console.log(`   node create-badge-display.js ${obj.data?.objectId}`);
          return obj.data?.objectId;
        }
      }
      
      cursor = response.nextCursor;
      
      if (checkedCount >= maxChecks) {
        break;
      }
    } while (cursor);
    
    if (!foundPublisher) {
      console.log(`   ❌ No Publisher found in ${checkedCount} objects`);
    }
    
    // Also try searching by package ID pattern
    console.log('\n═══════════════════════════════════════');
    console.log('🔍 SEARCHING BY PACKAGE ID PATTERN');
    console.log('═══════════════════════════════════════\n');
    
    for (const packageId of packageIds.slice(0, 2)) { // Skip the admin address
      const publisherId = await findPublisherForPackage(packageId);
      if (publisherId) {
        return publisherId;
      }
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('❌ NO PUBLISHER FOUND');
    console.log('═══════════════════════════════════════\n');
    console.log('The Publisher object does not exist for this package.');
    console.log('\n💡 Options:');
    console.log('   1. Proceed without Display (badges will still work)');
    console.log('   2. Republish the package (creates new package ID)');
    console.log('   3. Check Sui Explorer manually for the publish transaction');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

searchWalletForPublisher().catch(console.error);


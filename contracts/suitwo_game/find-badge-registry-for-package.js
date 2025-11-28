// Find BadgeRegistry objects for specific packages
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packages = [
  {
    id: '0x5a4d10695a27145386b510797c2305bf0de82e2dc94e0c19c9717f490d40f110',
    name: '2025-11-25 Package',
    txDigest: '5T5W2rcT2sGGRpFcczkkZR2T8m3CJ1a2vTry9FBHRZyu',
  },
  {
    id: '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b',
    name: '2025-11-23 Package',
    txDigest: '28Pt6vgDgpvm8ocKibmbigEj6nJhPsv4nrfPvQdoC2Hb',
  },
];

const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function findBadgeRegistryForPackage(packageInfo) {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log(`\n🔍 Checking ${packageInfo.name}:`);
    console.log(`   Package ID: ${packageInfo.id}`);
    console.log(`   Transaction: ${packageInfo.txDigest}\n`);
    
    // Method 1: Check deployment transaction
    console.log('1️⃣ Checking deployment transaction for BadgeRegistry...');
    const tx = await client.getTransactionBlock({
      digest: packageInfo.txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    let badgeRegistryFromTx = null;
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('BadgeRegistry')) {
            badgeRegistryFromTx = {
              objectId: change.objectId,
              objectType: change.objectType,
            };
            console.log(`   ✅ Found in transaction: ${change.objectId}`);
            console.log(`   Type: ${change.objectType}`);
          }
        }
      }
    }
    
    if (!badgeRegistryFromTx) {
      console.log('   ❌ Not found in deployment transaction');
    }
    
    // Method 2: Search for BadgeRegistry objects of this package type
    console.log('\n2️⃣ Searching for BadgeRegistry objects of this package type...');
    const badgeRegistryType = `${packageInfo.id}::badge_system::BadgeRegistry`;
    
    // Try to find by querying owned objects (if shared, check deployer's objects)
    // Note: BadgeRegistry is a shared object, so we need to search differently
    console.log(`   Looking for type: ${badgeRegistryType}`);
    
    // Check if we can find it by searching recent transactions from deployer
    console.log('\n3️⃣ Checking deployer wallet for related objects...');
    const allObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      options: {
        showType: true,
      },
      limit: 50,
    });
    
    let foundInWallet = null;
    for (const obj of allObjects.data || []) {
      if (obj.data?.type === badgeRegistryType) {
        foundInWallet = obj.data.objectId;
        console.log(`   ✅ Found in deployer wallet: ${foundInWallet}`);
        break;
      }
    }
    
    if (!foundInWallet) {
      console.log('   ❌ Not found in deployer wallet');
    }
    
    // Method 3: Check if badge_system was initialized (look for init transactions)
    console.log('\n4️⃣ Checking for badge_system initialization transactions...');
    console.log('   (This would require searching transaction history)');
    console.log('   Note: BadgeRegistry is created by calling badge_system::init()');
    
    const result = {
      packageId: packageInfo.id,
      packageName: packageInfo.name,
      badgeRegistryFromTransaction: badgeRegistryFromTx,
      badgeRegistryFromWallet: foundInWallet,
      badgeRegistryType,
    };
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error checking ${packageInfo.name}:`, error.message);
    return {
      packageId: packageInfo.id,
      packageName: packageInfo.name,
      error: error.message,
    };
  }
}

async function checkAllPackages() {
  console.log('🔍 Finding BadgeRegistry objects for each package...\n');
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const pkg of packages) {
    const result = await findBadgeRegistryForPackage(pkg);
    results.push(result);
    console.log('\n' + '='.repeat(80));
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 SUMMARY:\n');
  
  for (const result of results) {
    console.log(`${result.packageName} (${result.packageId.substring(0, 16)}...):`);
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}\n`);
      continue;
    }
    
    const found = result.badgeRegistryFromTransaction || result.badgeRegistryFromWallet;
    
    if (found) {
      const objectId = result.badgeRegistryFromTransaction?.objectId || result.badgeRegistryFromWallet;
      console.log(`   ✅ BadgeRegistry found: ${objectId}`);
      console.log(`   Type: ${result.badgeRegistryType}`);
    } else {
      console.log(`   ❌ BadgeRegistry NOT FOUND`);
      console.log(`   Type searched: ${result.badgeRegistryType}`);
    }
    console.log('');
  }
  
  // Check the known BadgeRegistry
  console.log('📋 Known BadgeRegistry from config:');
  console.log('   OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf');
  console.log('   Checking which package this belongs to...\n');
  
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  const knownRegistryId = '0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf';
  
  try {
    const registryObj = await client.getObject({
      id: knownRegistryId,
      options: {
        showType: true,
        showOwner: true,
      },
    });
    
    if (registryObj.data) {
      console.log(`   ✅ Found object`);
      console.log(`   Type: ${registryObj.data.type}`);
      
      // Extract package ID from type
      const typeParts = registryObj.data.type?.split('::');
      if (typeParts && typeParts.length > 0) {
        const packageId = typeParts[0];
        console.log(`   Package ID: ${packageId}`);
        
        // Check which package this matches
        for (const pkg of packages) {
          if (packageId === pkg.id) {
            console.log(`   ✅ Matches ${pkg.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Error checking object: ${error.message}`);
  }
}

checkAllPackages().catch(console.error);


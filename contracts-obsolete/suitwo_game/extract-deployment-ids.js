// Extract all object IDs from deployment transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = 'EUB1sJcRHB5RY6G1zZstbLRkagWrfesUUM5XZz91ZaQT';
const packageId = '0x93bef2e0ab5e8ea8df5a210e47204a68083d1d437966dc4121cd048bda6358ef';

async function extractDeploymentIds() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Examining deployment transaction:', txDigest);
    console.log('');
    
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
        showInput: true,
      },
    });
    
    let sessionRegistryObjectId = null;
    let statisticsRegistryObjectId = null;
    let premiumStoreObjectId = null;
    let badgePublisherObjectId = null;
    let packageIdFound = null;
    
    console.log('=== EXTRACTING OBJECT IDs ===\n');
    
    if (tx.objectChanges && tx.objectChanges.length > 0) {
      tx.objectChanges.forEach((change) => {
        if (change.type === 'published') {
          packageIdFound = change.packageId;
          console.log('✅ Package ID:', change.packageId);
        }
        
        if (change.type === 'created' && change.objectType) {
          console.log(`\n[Created] ${change.objectType}`);
          console.log('  Object ID:', change.objectId);
          
          if (change.objectType.includes('SessionRegistry')) {
            sessionRegistryObjectId = change.objectId;
            console.log('  ✅ Session Registry found!');
          }
          if (change.objectType.includes('StatisticsRegistry')) {
            statisticsRegistryObjectId = change.objectId;
            console.log('  ✅ Statistics Registry found!');
          }
          if (change.objectType.includes('PremiumStore')) {
            premiumStoreObjectId = change.objectId;
            console.log('  ✅ Premium Store found!');
          }
          if (change.objectType.includes('Publisher') && change.objectType.includes('badge_system')) {
            badgePublisherObjectId = change.objectId;
            console.log('  ✅ Badge Publisher found!');
          }
        }
      });
    }
    
    console.log('\n=== SUMMARY ===\n');
    console.log('Package ID:', packageIdFound || packageId);
    console.log('Session Registry:', sessionRegistryObjectId || 'Not found');
    console.log('Statistics Registry:', statisticsRegistryObjectId || 'Not found');
    console.log('Premium Store:', premiumStoreObjectId || 'Not found');
    console.log('Badge Publisher:', badgePublisherObjectId || 'Not found');
    
    console.log('\n=== .ENV VARIABLES ===\n');
    console.log(`GAME_SCORE_CONTRACT_TESTNET=${packageIdFound || packageId}`);
    if (sessionRegistryObjectId) {
      console.log(`SESSION_REGISTRY_OBJECT_ID_TESTNET=${sessionRegistryObjectId}`);
    }
    if (statisticsRegistryObjectId) {
      console.log(`STATISTICS_REGISTRY_OBJECT_ID_TESTNET=${statisticsRegistryObjectId}`);
    }
    if (premiumStoreObjectId) {
      console.log(`PREMIUM_STORE_CONTRACT_TESTNET=${packageIdFound || packageId}`);
      console.log(`PREMIUM_STORE_OBJECT_ID_TESTNET=${premiumStoreObjectId}`);
    }
    if (badgePublisherObjectId) {
      console.log(`BADGE_PUBLISHER_OBJECT_ID_TESTNET=${badgePublisherObjectId}`);
    }
    
    // Check deployer wallet for AdminCapability objects
    console.log('\n=== CHECKING FOR ADMIN CAPABILITIES ===\n');
    const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
    const finalPackageId = packageIdFound || packageId;
    
    let adminCapability = null;
    let premiumStoreAdminCapability = null;
    
    // Search for score_submission AdminCapability
    try {
      const scoreAdminObjects = await client.getOwnedObjects({
        owner: deployerAddress,
        filter: {
          StructType: `${finalPackageId}::score_submission::AdminCapability`,
        },
        options: { showType: true },
      });
      if (scoreAdminObjects.data && scoreAdminObjects.data.length > 0) {
        adminCapability = scoreAdminObjects.data[0].data?.objectId;
        console.log(`✅ AdminCapability: ${adminCapability}`);
      } else {
        console.log(`❌ AdminCapability NOT FOUND for ${finalPackageId}`);
      }
    } catch (e) {
      console.log(`⚠️  Error searching for AdminCapability: ${e.message}`);
    }
    
    // Search for premium_store AdminCapability
    try {
      const storeAdminObjects = await client.getOwnedObjects({
        owner: deployerAddress,
        filter: {
          StructType: `${finalPackageId}::terminal_store::AdminCapability`,
        },
        options: { showType: true },
      });
      if (storeAdminObjects.data && storeAdminObjects.data.length > 0) {
        premiumStoreAdminCapability = storeAdminObjects.data[0].data?.objectId;
        console.log(`✅ PremiumStoreAdminCapability: ${premiumStoreAdminCapability}`);
      } else {
        console.log(`❌ PremiumStoreAdminCapability NOT FOUND for ${finalPackageId}`);
      }
    } catch (e) {
      console.log(`⚠️  Error searching for PremiumStoreAdminCapability: ${e.message}`);
    }
    
    // Check for BadgeRegistry
    const knownRegistryId = '0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf';
    let badgeRegistry = null;
    try {
      const regObj = await client.getObject({
        id: knownRegistryId,
        options: { showType: true },
      });
      if (regObj.data?.type?.includes(finalPackageId)) {
        badgeRegistry = knownRegistryId;
        console.log(`✅ BadgeRegistry: ${badgeRegistry}`);
      }
    } catch (e) {}
    
    console.log('\n=== COMPLETE .ENV FOR THIS PACKAGE ===\n');
    console.log(`OLD_GAME_SCORE_CONTRACT_TESTNET=${finalPackageId}`);
    if (sessionRegistryObjectId) {
      console.log(`OLD_SESSION_REGISTRY_OBJECT_ID_TESTNET=${sessionRegistryObjectId}`);
    }
    if (statisticsRegistryObjectId) {
      console.log(`OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET=${statisticsRegistryObjectId}`);
    }
    if (premiumStoreObjectId) {
      console.log(`OLD_PREMIUM_STORE_CONTRACT_TESTNET=${finalPackageId}`);
      console.log(`OLD_PREMIUM_STORE_OBJECT_ID_TESTNET=${premiumStoreObjectId}`);
    }
    if (badgeRegistry) {
      console.log(`OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=${badgeRegistry}`);
    }
    if (badgePublisherObjectId) {
      console.log(`OLD_BADGE_PUBLISHER_OBJECT_ID_TESTNET=${badgePublisherObjectId}`);
    }
    if (adminCapability) {
      console.log(`OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${adminCapability}`);
    }
    if (premiumStoreAdminCapability) {
      console.log(`OLD_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${premiumStoreAdminCapability}`);
    }
    
    return {
      packageId: finalPackageId,
      sessionRegistryObjectId,
      statisticsRegistryObjectId,
      premiumStoreObjectId,
      badgePublisherObjectId,
      badgeRegistry,
      adminCapability,
      premiumStoreAdminCapability
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

extractDeploymentIds();


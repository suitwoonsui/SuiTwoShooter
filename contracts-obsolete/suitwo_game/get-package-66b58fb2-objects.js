// Get all object IDs from package 0x66b58fb2... deployment
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = '28Pt6vgDgpvm8ocKibmbigEj6nJhPsv4nrfPvQdoC2Hb';
const packageId = '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b';
const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function getObjects() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Extracting all objects from deployment:', packageId);
    console.log('📝 Transaction:', txDigest);
    console.log('');
    
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    const objects = {
      packageId: null,
      sessionRegistry: null,
      statisticsRegistry: null,
      premiumStore: null,
      badgeRegistry: null,
      publisher: null,
      adminCapability: null,
      premiumStoreAdminCapability: null,
    };
    
    console.log('=== OBJECTS FROM DEPLOYMENT TRANSACTION ===\n');
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'published') {
          objects.packageId = change.packageId;
          console.log(`✅ Package ID: ${change.packageId}`);
        }
        
        if (change.type === 'created' && change.objectType) {
          const objType = change.objectType;
          const objId = change.objectId;
          
          console.log(`\n[Created] ${objType}`);
          console.log(`  Object ID: ${objId}`);
          
          if (objType.includes('SessionRegistry')) {
            objects.sessionRegistry = objId;
            console.log('  ✅ Session Registry');
          }
          if (objType.includes('StatisticsRegistry')) {
            objects.statisticsRegistry = objId;
            console.log('  ✅ Statistics Registry');
          }
          if (objType.includes('PremiumStore')) {
            objects.premiumStore = objId;
            console.log('  ✅ Premium Store');
          }
          if (objType.includes('BadgeRegistry')) {
            objects.badgeRegistry = objId;
            console.log('  ✅ Badge Registry');
          }
          if (objType.includes('Publisher')) {
            objects.publisher = objId;
            console.log('  ✅ Publisher');
          }
          if (objType.includes('score_submission::AdminCapability')) {
            objects.adminCapability = objId;
            console.log('  ✅ Score Submission Admin Capability');
          }
          if (objType.includes('terminal_store::AdminCapability')) {
            objects.premiumStoreAdminCapability = objId;
            console.log('  ✅ Premium Store Admin Capability');
          }
        }
      }
    }
    
    // Check deployer wallet for AdminCapability objects (they might be created separately)
    console.log('\n=== CHECKING DEPLOYER WALLET FOR ADMIN CAPABILITIES ===\n');
    
    const allObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      options: {
        showType: true,
      },
      limit: 100,
    });
    
    for (const obj of allObjects.data || []) {
      const objType = obj.data?.type;
      if (objType) {
        if (objType.includes(`${packageId}::score_submission::AdminCapability`)) {
          if (!objects.adminCapability) {
            objects.adminCapability = obj.data.objectId;
            console.log(`✅ Found Score Admin Capability in wallet: ${obj.data.objectId}`);
          }
        }
        if (objType.includes(`${packageId}::terminal_store::AdminCapability`)) {
          if (!objects.premiumStoreAdminCapability) {
            objects.premiumStoreAdminCapability = obj.data.objectId;
            console.log(`✅ Found Premium Store Admin Capability in wallet: ${obj.data.objectId}`);
          }
        }
      }
    }
    
    // Check for BadgeRegistry initialization transaction
    console.log('\n=== CHECKING FOR BADGE REGISTRY ===\n');
    if (!objects.badgeRegistry) {
      console.log('⚠️  BadgeRegistry not found in deployment transaction');
      console.log('   Checking if it was initialized separately...');
      
      // The known BadgeRegistry
      const knownRegistryId = '0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf';
      try {
        const registryObj = await client.getObject({
          id: knownRegistryId,
          options: {
            showType: true,
          },
        });
        
        if (registryObj.data && registryObj.data.type?.includes(packageId)) {
          objects.badgeRegistry = knownRegistryId;
          console.log(`✅ Known BadgeRegistry belongs to this package: ${knownRegistryId}`);
        }
      } catch (error) {
        console.log(`   Error checking registry: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPLETE OBJECT LIST FOR PACKAGE 0x66b58fb2...\n');
    console.log('Package ID:', objects.packageId || packageId);
    console.log('');
    console.log('Session Registry:', objects.sessionRegistry || 'NOT FOUND');
    console.log('Statistics Registry:', objects.statisticsRegistry || 'NOT FOUND');
    console.log('Premium Store:', objects.premiumStore || 'NOT FOUND');
    console.log('Badge Registry:', objects.badgeRegistry || 'NOT FOUND');
    console.log('Publisher:', objects.publisher || 'NOT FOUND');
    console.log('Admin Capability (Score):', objects.adminCapability || 'NOT FOUND');
    console.log('Admin Capability (Premium Store):', objects.premiumStoreAdminCapability || 'NOT FOUND');
    
    console.log('\n' + '='.repeat(80));
    console.log('📝 .ENV CONFIGURATION FOR THIS PACKAGE:\n');
    console.log(`OLD_GAME_SCORE_CONTRACT_TESTNET=${objects.packageId || packageId}`);
    if (objects.sessionRegistry) {
      console.log(`OLD_SESSION_REGISTRY_OBJECT_ID_TESTNET=${objects.sessionRegistry}`);
    }
    if (objects.statisticsRegistry) {
      console.log(`OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET=${objects.statisticsRegistry}`);
    }
    if (objects.premiumStore) {
      console.log(`OLD_PREMIUM_STORE_CONTRACT_TESTNET=${objects.packageId || packageId}`);
      console.log(`OLD_PREMIUM_STORE_OBJECT_ID_TESTNET=${objects.premiumStore}`);
    }
    if (objects.badgeRegistry) {
      console.log(`OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=${objects.badgeRegistry}`);
    }
    if (objects.publisher) {
      console.log(`OLD_BADGE_PUBLISHER_OBJECT_ID_TESTNET=${objects.publisher}`);
    }
    if (objects.adminCapability) {
      console.log(`OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${objects.adminCapability}`);
    }
    if (objects.premiumStoreAdminCapability) {
      console.log(`OLD_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${objects.premiumStoreAdminCapability}`);
    }
    
    return objects;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

getObjects();


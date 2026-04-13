// Find AdminCapability and StatisticsRegistry for package 0x66b58fb2...
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packageId = '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b';
const txDigest = '28Pt6vgDgpvm8ocKibmbigEj6nJhPsv4nrfPvQdoC2Hb';
const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function findObjects() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Finding objects for package:', packageId);
    console.log('📝 Deployment transaction:', txDigest);
    console.log('');
    
    // Check deployment transaction
    console.log('1️⃣ Checking deployment transaction...');
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    const foundInTx = {
      sessionRegistry: null,
      statisticsRegistry: null,
      premiumStore: null,
      adminCapability: null,
      premiumStoreAdminCapability: null,
    };
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          const objType = change.objectType;
          const objId = change.objectId;
          
          if (objType.includes('SessionRegistry')) {
            foundInTx.sessionRegistry = objId;
            console.log(`   ✅ SessionRegistry: ${objId}`);
          }
          if (objType.includes('StatisticsRegistry')) {
            foundInTx.statisticsRegistry = objId;
            console.log(`   ✅ StatisticsRegistry: ${objId}`);
          }
          if (objType.includes('PremiumStore')) {
            foundInTx.premiumStore = objId;
            console.log(`   ✅ PremiumStore: ${objId}`);
          }
          if (objType.includes('score_submission::AdminCapability')) {
            foundInTx.adminCapability = objId;
            console.log(`   ✅ Score AdminCapability: ${objId}`);
          }
          if (objType.includes('premium_store::AdminCapability')) {
            foundInTx.premiumStoreAdminCapability = objId;
            console.log(`   ✅ Premium Store AdminCapability: ${objId}`);
          }
        }
      }
    }
    
    // Check deployer wallet
    console.log('\n2️⃣ Checking deployer wallet for AdminCapability objects...');
    
    // Score submission AdminCapability
    const scoreAdminType = `${packageId}::score_submission::AdminCapability`;
    const scoreAdminObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      filter: {
        StructType: scoreAdminType,
      },
      options: {
        showType: true,
      },
    });
    
    if (scoreAdminObjects.data && scoreAdminObjects.data.length > 0) {
      const objId = scoreAdminObjects.data[0].data?.objectId;
      console.log(`   ✅ Score AdminCapability found: ${objId}`);
      if (!foundInTx.adminCapability) {
        foundInTx.adminCapability = objId;
      }
    } else {
      console.log(`   ❌ Score AdminCapability NOT found`);
    }
    
    // Premium store AdminCapability
    const storeAdminType = `${packageId}::premium_store::AdminCapability`;
    const storeAdminObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      options: {
        showType: true,
      },
      limit: 100,
    });
    
    let foundStoreAdmin = null;
    for (const obj of storeAdminObjects.data || []) {
      if (obj.data?.type === storeAdminType) {
        foundStoreAdmin = obj.data.objectId;
        console.log(`   ✅ Premium Store AdminCapability found: ${foundStoreAdmin}`);
        break;
      }
    }
    
    if (foundStoreAdmin) {
      if (!foundInTx.premiumStoreAdminCapability) {
        foundInTx.premiumStoreAdminCapability = foundStoreAdmin;
      }
    } else {
      console.log(`   ❌ Premium Store AdminCapability NOT found`);
    }
    
    // Check for StatisticsRegistry
    console.log('\n3️⃣ Checking for StatisticsRegistry...');
    const statsRegistryType = `${packageId}::score_submission::StatisticsRegistry`;
    
    // StatisticsRegistry is a shared object, so check if it exists
    if (foundInTx.statisticsRegistry) {
      console.log(`   ✅ StatisticsRegistry from transaction: ${foundInTx.statisticsRegistry}`);
    } else {
      console.log(`   ❌ StatisticsRegistry NOT found in transaction`);
      console.log(`   Type to search: ${statsRegistryType}`);
    }
    
    // Summary
    console.log('\n📊 SUMMARY:\n');
    console.log('Objects found for package 0x66b58fb2... (2025-11-23):\n');
    
    const results = {
      sessionRegistry: foundInTx.sessionRegistry || 'NOT FOUND',
      statisticsRegistry: foundInTx.statisticsRegistry || 'NOT FOUND',
      premiumStore: foundInTx.premiumStore || 'NOT FOUND',
      adminCapability: foundInTx.adminCapability || 'NOT FOUND',
      premiumStoreAdminCapability: foundInTx.premiumStoreAdminCapability || 'NOT FOUND',
      badgeRegistry: '0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf', // Known
    };
    
    console.log(`SessionRegistry: ${results.sessionRegistry}`);
    console.log(`StatisticsRegistry: ${results.statisticsRegistry}`);
    console.log(`PremiumStore: ${results.premiumStore}`);
    console.log(`AdminCapability: ${results.adminCapability}`);
    console.log(`PremiumStoreAdminCapability: ${results.premiumStoreAdminCapability}`);
    console.log(`BadgeRegistry: ${results.badgeRegistry} ✅`);
    
    // Check if we have all required objects
    console.log('\n✅ Required objects for admin_mint_badge:');
    const hasAll = results.adminCapability !== 'NOT FOUND' && 
                   results.statisticsRegistry !== 'NOT FOUND' && 
                   results.badgeRegistry !== 'NOT FOUND';
    
    if (hasAll) {
      console.log('   ✅ ALL REQUIRED OBJECTS FOUND!');
      console.log('\n📝 Recommended .env configuration:');
      console.log(`   OLD_GAME_SCORE_CONTRACT_TESTNET=${packageId}`);
      console.log(`   OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${results.adminCapability}`);
      console.log(`   OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET=${results.statisticsRegistry}`);
      console.log(`   OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=${results.badgeRegistry}`);
    } else {
      console.log('   ❌ MISSING REQUIRED OBJECTS');
      if (results.adminCapability === 'NOT FOUND') {
        console.log('      - AdminCapability');
      }
      if (results.statisticsRegistry === 'NOT FOUND') {
        console.log('      - StatisticsRegistry');
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

findObjects();


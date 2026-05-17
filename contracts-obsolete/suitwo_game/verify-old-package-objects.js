// Verify which objects belong to the 2025-11-25 deployment package
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packageId = '0x5a4d10695a27145386b510797c2305bf0de82e2dc94e0c19c9717f490d40f110';
const txDigest = '5T5W2rcT2sGGRpFcczkkZR2T8m3CJ1a2vTry9FBHRZyu';

// Current OLD_ values from the file
const currentOldValues = {
  SESSION_REGISTRY: '0xd174d23457d83f73eeb5c333256ea128e1b259a5166805f327fb0732fe01be6c',
  STATISTICS_REGISTRY: '0x5386b64e19113aa78a45825c5586e4d305983d3efa8d116cebfa38cf8604754b',
  ADMIN_CAPABILITY: '0x8667a488bf8aaf8b691a7cd952e43ba615a0ca8b545e89e9783f69d069091f13',
  PREMIUM_STORE: '0xb69f6233ba981b62c231d2f4d9e4f6eba16322b440abe729b7cf4c53e49118e3',
  PREMIUM_STORE_ADMIN_CAPABILITY: '0x136a0f26c594855d75dbe3e3e9d191a6cce2c3faa7deada5f6918855e6f8ec18',
};

async function verifyObjects() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Verifying objects from deployment:', packageId);
    console.log('📝 Transaction:', txDigest);
    console.log('');
    
    // Get the deployment transaction
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    console.log('📋 Objects created in this deployment:\n');
    
    const createdObjects = {
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
          
          console.log(`[Created] ${objType}`);
          console.log(`  Object ID: ${objId}`);
          
          if (objType.includes('SessionRegistry')) {
            createdObjects.sessionRegistry = objId;
            console.log('  ✅ Session Registry');
          }
          if (objType.includes('StatisticsRegistry')) {
            createdObjects.statisticsRegistry = objId;
            console.log('  ✅ Statistics Registry');
          }
          if (objType.includes('PremiumStore')) {
            createdObjects.premiumStore = objId;
            console.log('  ✅ Premium Store');
          }
          if (objType.includes('score_submission::AdminCapability')) {
            createdObjects.adminCapability = objId;
            console.log('  ✅ Score Submission Admin Capability');
          }
          if (objType.includes('terminal_store::AdminCapability')) {
            createdObjects.premiumStoreAdminCapability = objId;
            console.log('  ✅ Premium Store Admin Capability');
          }
          console.log('');
        }
      }
    }
    
    console.log('\n📊 VERIFICATION RESULTS:\n');
    console.log('Current OLD_ values in file vs. Objects from 2025-11-25 deployment:\n');
    
    const checks = [
      { name: 'SESSION_REGISTRY', current: currentOldValues.SESSION_REGISTRY, fromDeployment: createdObjects.sessionRegistry },
      { name: 'STATISTICS_REGISTRY', current: currentOldValues.STATISTICS_REGISTRY, fromDeployment: createdObjects.statisticsRegistry },
      { name: 'ADMIN_CAPABILITY', current: currentOldValues.ADMIN_CAPABILITY, fromDeployment: createdObjects.adminCapability },
      { name: 'PREMIUM_STORE', current: currentOldValues.PREMIUM_STORE, fromDeployment: createdObjects.premiumStore },
      { name: 'PREMIUM_STORE_ADMIN_CAPABILITY', current: currentOldValues.PREMIUM_STORE_ADMIN_CAPABILITY, fromDeployment: createdObjects.premiumStoreAdminCapability },
    ];
    
    let allMatch = true;
    for (const check of checks) {
      const matches = check.current === check.fromDeployment;
      const status = matches ? '✅ MATCH' : '❌ MISMATCH';
      console.log(`${check.name}:`);
      console.log(`  Current: ${check.current}`);
      console.log(`  From Deployment: ${check.fromDeployment || 'NOT FOUND'}`);
      console.log(`  ${status}\n`);
      
      if (!matches) {
        allMatch = false;
      }
    }
    
    if (allMatch) {
      console.log('✅ All OLD_ values match the 2025-11-25 deployment!\n');
    } else {
      console.log('❌ Some OLD_ values do NOT match the 2025-11-25 deployment.');
      console.log('   They may be from a different deployment.\n');
    }
    
    // Also check if we need to look for admin capabilities created separately
    console.log('🔍 Note: Admin capabilities might have been created in separate transactions.');
    console.log('   Checking if admin capabilities exist for this package...\n');
    
    // Try to find admin capabilities by checking the deployer's wallet
    const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
    
    // Check for score_submission AdminCapability
    const scoreAdminObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      filter: {
        StructType: `${packageId}::score_submission::AdminCapability`,
      },
      options: {
        showType: true,
      },
    });
    
    if (scoreAdminObjects.data && scoreAdminObjects.data.length > 0) {
      const foundId = scoreAdminObjects.data[0].data?.objectId;
      console.log(`Found Score Admin Capability: ${foundId}`);
      if (foundId === currentOldValues.ADMIN_CAPABILITY) {
        console.log('  ✅ Matches current OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET\n');
      } else {
        console.log('  ❌ Does NOT match current OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET\n');
      }
    }
    
    // Check for premium_store AdminCapability
    const storeAdminObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      filter: {
        StructType: `${packageId}::terminal_store::AdminCapability`,
      },
      options: {
        showType: true,
      },
    });
    
    if (storeAdminObjects.data && storeAdminObjects.data.length > 0) {
      const foundId = storeAdminObjects.data[0].data?.objectId;
      console.log(`Found Premium Store Admin Capability: ${foundId}`);
      if (foundId === currentOldValues.PREMIUM_STORE_ADMIN_CAPABILITY) {
        console.log('  ✅ Matches current OLD_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET\n');
      } else {
        console.log('  ❌ Does NOT match current OLD_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET\n');
      }
    }
    
    return {
      allMatch,
      createdObjects,
      currentOldValues,
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

verifyObjects();


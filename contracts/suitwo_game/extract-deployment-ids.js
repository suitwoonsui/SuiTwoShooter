// Extract all object IDs from deployment transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = 'B8rJBJXm6voZfCXtJwpARKuL38HZxYv8vd9S4Er2iFTF';
const packageId = '0x9b981a5b3d2acbee7ed3989e1707de1c5868d9e1ff89b6b14a107cff9fac96b1';

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
    
    return {
      packageId: packageIdFound || packageId,
      sessionRegistryObjectId,
      statisticsRegistryObjectId,
      premiumStoreObjectId,
      badgePublisherObjectId
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

extractDeploymentIds();


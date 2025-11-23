// Extract Badge Registry ID from initialization transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = '8SxAqZNRcSyuxaJZA6JhiCkkCYmp7hKryFGgHEahHsoE';

async function extractBadgeRegistry() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Examining transaction:', txDigest);
    
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    let badgeRegistryObjectId = null;
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType && change.objectType.includes('BadgeRegistry')) {
          badgeRegistryObjectId = change.objectId;
          console.log('✅ Found Badge Registry:', badgeRegistryObjectId);
          console.log('   Type:', change.objectType);
          break;
        }
      }
    }
    
    if (badgeRegistryObjectId) {
      console.log('\n📝 Badge Registry Object ID:');
      console.log(`   BADGE_REGISTRY_OBJECT_ID_TESTNET=${badgeRegistryObjectId}`);
    } else {
      console.log('\n❌ Badge Registry object ID not found');
    }
    
    return badgeRegistryObjectId;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

extractBadgeRegistry();


// Extract Display object ID from transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = 'BiVUCF4UURUKPU7yFRi9H9dgcgafzgBqF8oAZYgF8WMy';

async function extractDisplayId() {
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
    
    let displayObjectId = null;
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if ((change.type === 'created' || change.type === 'transferred') && 
            change.objectType && change.objectType.includes('Display')) {
          displayObjectId = change.objectId;
          console.log('✅ Found Display object:', displayObjectId);
          console.log('   Type:', change.objectType);
          break;
        }
      }
    }
    
    if (!displayObjectId) {
      console.log('⚠️  Display object ID not found in objectChanges');
      console.log('Checking created objects...');
      if (tx.effects?.created) {
        for (const obj of tx.effects.created) {
          if (obj.reference?.objectType?.includes('Display')) {
            displayObjectId = obj.reference.objectId;
            console.log('✅ Found Display object:', displayObjectId);
            break;
          }
        }
      }
    }
    
    if (displayObjectId) {
      console.log('\n📝 Display Object ID:');
      console.log(`   BADGE_DISPLAY_OBJECT_ID_TESTNET=${displayObjectId}`);
    } else {
      console.log('\n❌ Display object ID not found');
      }
    
    return displayObjectId;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

extractDisplayId();

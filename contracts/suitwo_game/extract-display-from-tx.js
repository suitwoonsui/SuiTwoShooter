// Extract Display Object ID from transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = process.argv[2] || '3S6teAo7RV4mtUqggUDsP6gHc2X8DjdUJmkvRa6qYYRs';

async function extractDisplayId() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  try {
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    console.log('🔍 Searching for Display object in transaction...\n');
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' || change.type === 'transferred') {
          if (change.objectType && change.objectType.includes('Display')) {
            console.log('✅ Found Display object!');
            console.log('   Object ID:', change.objectId);
            console.log('   Type:', change.objectType);
            console.log('   Change Type:', change.type);
            if (change.owner) {
              console.log('   Owner:', JSON.stringify(change.owner, null, 2));
            }
            console.log('\n📝 Add this to your .env.local:');
            console.log(`   BADGE_DISPLAY_OBJECT_ID_TESTNET=${change.objectId}`);
            return;
          }
        }
      }
    }
    
    console.log('⚠️  Display object not found in objectChanges');
    console.log('\n📋 Transaction details:');
    console.log(JSON.stringify(tx, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

extractDisplayId();


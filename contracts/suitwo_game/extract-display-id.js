// Extract Display object ID from transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const txDigest = '6g668QhNjiWxcqnGYW6jerL7Ad2tZfRGuT8f1t3F2NAi';

async function extractDisplayId() {
  try {
    console.log('🔍 Extracting Display Object ID from transaction...\n');
    
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' || change.type === 'transferred') {
          const objectType = change.objectType || '';
          if (objectType.includes('Display')) {
            console.log('✅✅✅ FOUND DISPLAY OBJECT! ✅✅✅\n');
            console.log('📋 Display Object Information:');
            console.log(`   Object ID: ${change.objectId}`);
            console.log(`   Type: ${objectType}`);
            console.log(`   Owner: ${JSON.stringify(change.owner)}`);
            console.log('\n💡 Save this Display Object ID for future updates!');
            return change.objectId;
          }
        }
      }
    }
    
    console.log('❌ Display object not found in transaction');
    console.log('\n📋 All object changes:');
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        console.log(`   ${change.type}: ${change.objectType || 'N/A'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

extractDisplayId().catch(console.error);


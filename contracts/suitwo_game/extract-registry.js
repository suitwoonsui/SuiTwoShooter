// Extract Session Registry Object ID from transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const txDigest = '4yrRQtZc3LPUkpvwPBVJpTWoTyyc9KVtewALtn4fpxot';

async function extractRegistry() {
  try {
    console.log('🔍 Querying transaction:', txDigest);
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });

    console.log('\n📋 Checking objectChanges...');
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          console.log(`  - ${change.type}: ${change.objectType}`);
          if (change.objectType.includes('SessionRegistry')) {
            console.log('\n✅ Found Session Registry!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
            return change.objectId;
          }
        }
      }
    }

    console.log('\n📋 Checking effects.created...');
    if (tx.effects?.created) {
      for (const obj of tx.effects.created) {
        const objectType = obj.reference?.objectType || '';
        console.log(`  - Created object: ${objectType.substring(0, 80)}...`);
        if (objectType.includes('SessionRegistry')) {
          console.log('\n✅ Found Session Registry!');
          console.log('   Object ID:', obj.reference.objectId);
          console.log('   Owner:', JSON.stringify(obj.owner, null, 2));
          return obj.reference.objectId;
        }
      }
    }

    console.log('\n📋 Checking events...');
    if (tx.events) {
      for (const event of tx.events) {
        console.log(`  - Event type: ${event.type}`);
      }
    }

    console.log('\n⚠️  Session Registry not found in transaction data');
    console.log('   Full transaction data:');
    console.log(JSON.stringify(tx, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

extractRegistry();


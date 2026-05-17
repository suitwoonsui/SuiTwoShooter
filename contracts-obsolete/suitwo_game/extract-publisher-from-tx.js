// Extract Publisher Object ID from deployment transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = 'GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG';

async function extractPublisher() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Querying deployment transaction...');
    console.log('   Transaction Digest:', txDigest);
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
    
    console.log('📋 Analyzing transaction...\n');
    
    let publisherId = null;
    let packageId = null;
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        // Find package ID
        if (change.type === 'published') {
          packageId = change.packageId;
          console.log('✅ Found Package ID:', packageId);
        }
        
        // Find Publisher object
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('Publisher')) {
            publisherId = change.objectId;
            console.log('✅ Found Publisher Object!');
            console.log('   Object ID:', publisherId);
            console.log('   Type:', change.objectType);
          }
        }
      }
    }
    
    console.log('');
    
    if (publisherId) {
      console.log('═══════════════════════════════════════');
      console.log('✅ Publisher Object Found!');
      console.log('═══════════════════════════════════════\n');
      console.log('📝 Publisher Object ID:', publisherId);
      console.log('');
      console.log('🚀 Now you can create the Display object:');
      console.log(`   node create-badge-display.js ${publisherId}`);
      console.log(`   OR: node setup-badge-system.js ${publisherId}`);
      console.log('');
      console.log('🔗 View on Sui Explorer:');
      console.log(`   https://suiexplorer.com/object/${publisherId}?network=testnet`);
    } else {
      console.log('⚠️  Publisher object not found in transaction');
      console.log('');
      console.log('📋 All object changes in transaction:');
      if (tx.objectChanges) {
        for (const change of tx.objectChanges) {
          if (change.type === 'created') {
            console.log(`   - ${change.type}: ${change.objectType || 'unknown'}`);
            if (change.objectId) {
              console.log(`     ID: ${change.objectId}`);
            }
          }
        }
      }
    }
    
    if (packageId) {
      console.log('');
      console.log('📦 Package ID:', packageId);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

extractPublisher();


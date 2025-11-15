// Script to find the old PremiumStore object ID from a package
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

// Configuration
const OLD_PACKAGE_ID = '0x9d0508427c0fcdd4c59479b932320bb81fa208a3708c4dc89a282c96862273cd';
const NETWORK = 'testnet'; // Change to 'mainnet' if needed

const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

async function findOldStoreObject() {
  try {
    console.log('🔍 Searching for PremiumStore object from old package...');
    console.log(`   Package ID: ${OLD_PACKAGE_ID}`);
    console.log(`   Network: ${NETWORK}\n`);

    // Method 1: Query objects owned by the package
    // Note: This might not work directly, so we'll try a different approach
    
    // Method 2: Query for objects with the PremiumStore type
    // We need to find objects created by the package's init() function
    
    // Method 3: Check if we can query by type
    // Unfortunately, Sui doesn't have a direct "get all objects of type" API
    
    // Method 4: If you have the deployment transaction digest, we can extract it from there
    console.log('⚠️  Direct object query by type is not available in Sui SDK.');
    console.log('\n📋 To find the old PremiumStore object ID, you can:');
    console.log('\n   1. Check your deployment logs/notes');
    console.log('   2. Use Sui Explorer:');
    console.log(`      https://suiexplorer.com/object/${OLD_PACKAGE_ID}?network=${NETWORK}`);
    console.log('   3. If you have the deployment transaction digest:');
    console.log('      - Go to: https://suiexplorer.com/txblock/<DIGEST>?network=testnet');
    console.log('      - Look for "Object Changes" section');
    console.log('      - Find object with type containing "PremiumStore"');
    console.log('\n   4. Or provide the deployment transaction digest and I can help extract it');
    
    // If you have the transaction digest, uncomment and use this:
    /*
    const TX_DIGEST = 'YOUR_TRANSACTION_DIGEST_HERE';
    console.log(`\n🔍 Querying transaction: ${TX_DIGEST}`);
    const tx = await client.getTransactionBlock({
      digest: TX_DIGEST,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('PremiumStore')) {
          console.log('\n✅ Found PremiumStore object!');
          console.log(`   Object ID: ${change.objectId}`);
          console.log(`   Object Type: ${change.objectType}`);
          return change.objectId;
        }
      }
    }
    */

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findOldStoreObject();


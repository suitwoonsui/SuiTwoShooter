// Verify package ID from deployment transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const txDigest = '5G2YjAjG2UPwSVFod6Lx2VDvPTTLxnwg3ybUYaeWhoX2';

async function verifyPackageId() {
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

    console.log('\n📋 All Object Changes:');
    if (tx.objectChanges) {
      let packageId = null;
      for (const change of tx.objectChanges) {
        if (change.type === 'published') {
          packageId = change.packageId;
          console.log(`  ✅ Published Package ID: ${packageId}`);
        } else if (change.type === 'created' && change.objectType) {
          console.log(`  - ${change.type}: ${change.objectType}`);
          // Extract package ID from object type
          if (change.objectType.includes('::')) {
            const extractedPackageId = change.objectType.split('::')[0];
            if (extractedPackageId.startsWith('0x')) {
              console.log(`    → Package ID from object: ${extractedPackageId}`);
            }
          }
        }
      }
      
      if (packageId) {
        console.log(`\n✅ Confirmed Package ID: ${packageId}`);
        return packageId;
      }
    }
    
    console.log('\n⚠️  Package ID not found in objectChanges');
    console.log('Full transaction:', JSON.stringify(tx, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyPackageId();


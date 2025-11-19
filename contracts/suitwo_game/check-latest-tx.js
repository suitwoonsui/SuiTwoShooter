// Check latest transaction for Publisher
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = 'FsCNwMDjFXYMyqbWfaMWJcXGCN1npjf7auwng9BJvD4F';

async function checkLatestTx() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Checking latest publish transaction...');
    console.log('   Transaction:', txDigest);
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
    
    console.log('=== ALL OBJECT CHANGES ===\n');
    
    let packageId = null;
    let publisherId = null;
    let upgradeCapId = null;
    
    if (tx.objectChanges) {
      tx.objectChanges.forEach((change, i) => {
        console.log(`[${i}] Type: ${change.type}`);
        if (change.objectType) console.log(`    Object Type: ${change.objectType}`);
        if (change.objectId) console.log(`    Object ID: ${change.objectId}`);
        if (change.packageId) console.log(`    Package ID: ${change.packageId}`);
        if (change.owner) console.log(`    Owner: ${JSON.stringify(change.owner)}`);
        console.log('');
        
        if (change.type === 'published') {
          packageId = change.packageId;
        }
        if (change.type === 'created') {
          if (change.objectType?.includes('Publisher')) {
            publisherId = change.objectId;
          }
          if (change.objectType?.includes('UpgradeCap')) {
            upgradeCapId = change.objectId;
          }
        }
      });
    }
    
    console.log('=== SUMMARY ===\n');
    console.log('Package ID:', packageId || 'NOT FOUND');
    console.log('Publisher ID:', publisherId || 'NOT FOUND');
    console.log('UpgradeCap ID:', upgradeCapId || 'NOT FOUND');
    console.log('');
    
    if (!publisherId && upgradeCapId) {
      console.log('⚠️  ISSUE: Got UpgradeCap instead of Publisher');
      console.log('');
      console.log('This means Sui treated this as an upgrade, not a fresh publish.');
      console.log('Publisher is only created on the VERY FIRST publish.');
      console.log('');
      console.log('💡 Possible solutions:');
      console.log('   1. Publisher might exist from a previous publish (check older transactions)');
      console.log('   2. Modify the code slightly to force a fresh publish');
      console.log('   3. Use badges without Display (they work fine)');
    }
    
    if (packageId) {
      console.log('\n📝 New Package ID to update:');
      console.log(`   ${packageId}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLatestTx();


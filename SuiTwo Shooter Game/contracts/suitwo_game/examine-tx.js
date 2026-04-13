// Examine transaction to find Publisher
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = 'GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG';

async function examineTransaction() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Examining transaction:', txDigest);
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
    
    if (tx.objectChanges && tx.objectChanges.length > 0) {
      tx.objectChanges.forEach((change, i) => {
        console.log(`[Change ${i}]`);
        console.log('  Type:', change.type);
        
        if (change.type === 'published') {
          console.log('  Package ID:', change.packageId);
        }
        
        if (change.objectId) {
          console.log('  Object ID:', change.objectId);
        }
        
        if (change.objectType) {
          console.log('  Object Type:', change.objectType);
        }
        
        if (change.owner) {
          console.log('  Owner:', JSON.stringify(change.owner, null, 2));
        }
        
        console.log('');
      });
    } else {
      console.log('No object changes found');
    }
    
    console.log('\n=== SEARCHING FOR PUBLISHER ===\n');
    
    // Look for Publisher in all possible ways
    const publisher = tx.objectChanges?.find(c => 
      c.objectType?.includes('Publisher') || 
      c.objectType?.includes('publisher') ||
      c.objectType?.toLowerCase().includes('publisher')
    );
    
    if (publisher) {
      console.log('✅ FOUND PUBLISHER!');
      console.log('   Object ID:', publisher.objectId);
      console.log('   Type:', publisher.objectType);
      console.log('   Owner:', JSON.stringify(publisher.owner, null, 2));
      console.log('');
      console.log('📝 Use this to create Display:');
      console.log(`   node create-badge-display.js ${publisher.objectId}`);
    } else {
      console.log('❌ Publisher not found in objectChanges');
      console.log('');
      console.log('💡 Possible reasons:');
      console.log('   1. This was an upgrade, not initial publish (Publisher from original publish)');
      console.log('   2. Publisher is in a different transaction');
      console.log('   3. Publisher was created but not shown in this transaction');
    }
    
    // Also check effects.created
    console.log('\n=== CHECKING EFFECTS.CREATED ===\n');
    if (tx.effects?.created) {
      tx.effects.created.forEach((obj, i) => {
        console.log(`[Created ${i}]`);
        console.log('  Object ID:', obj.reference?.objectId);
        console.log('  Type:', obj.reference?.objectType);
        if (obj.owner) {
          console.log('  Owner:', JSON.stringify(obj.owner, null, 2));
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

examineTransaction();


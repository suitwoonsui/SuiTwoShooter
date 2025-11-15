// Debug script to inspect the failed consumption transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const txDigest = 'FJNdnnR83wrUjURCApfH3cXMLyCMAt9hWuVyRqoE1fu1'; // From the latest logs

async function debugTransaction() {
  try {
    console.log('🔍 Querying failed transaction:', txDigest);
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });

    console.log('\n📋 Transaction Input:');
    console.log('   Full transaction data:', JSON.stringify(tx.transaction, null, 2));
    
    if (tx.transaction?.data?.transaction?.transactions) {
      const moveCall = tx.transaction.data.transaction.transactions.find(
        (t) => t.kind === 'MoveCall'
      );
      if (moveCall) {
        console.log('   Function:', moveCall.target);
        console.log('   Arguments:', JSON.stringify(moveCall.arguments, null, 2));
      }
    }
    
    // Also check the input data directly
    if (tx.transaction?.data) {
      console.log('\n📋 Transaction Data:');
      console.log(JSON.stringify(tx.transaction.data, null, 2));
    }

    console.log('\n📋 Transaction Effects:');
    console.log('   Status:', tx.effects?.status?.status);
    if (tx.effects?.status?.error) {
      console.log('   Error:', tx.effects.status.error);
    }

    console.log('\n📋 Object Changes:');
    if (tx.objectChanges) {
      tx.objectChanges.forEach((change, idx) => {
        console.log(`   Change ${idx + 1}:`, change.type);
        if (change.objectType) {
          console.log('      Type:', change.objectType);
        }
        if (change.objectId) {
          console.log('      Object ID:', change.objectId);
        }
      });
    }

    // Check the inventory object structure
    const playerAddress = '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0';
    const storeObjectId = '0xbe699524d27e43927d15cef29a6c650f5cf66f39071fe6c3397c0f555ec36a6e';
    
    console.log('\n🔍 Checking inventory object structure...');
    try {
      const dynamicField = await client.getDynamicFieldObject({
        parentId: storeObjectId,
        name: {
          type: 'address',
          value: playerAddress,
        },
      });

      if (dynamicField.data) {
        const inventoryObjectId = dynamicField.data.objectId;
        console.log('   Inventory Object ID:', inventoryObjectId);
        
        const inventoryObj = await client.getObject({
          id: inventoryObjectId,
          options: { showContent: true, showType: true },
        });

        if (inventoryObj.data) {
          console.log('   Inventory Object Type:', inventoryObj.data.type);
          console.log('   Inventory Content:', JSON.stringify(inventoryObj.data.content, null, 2));
        }
      }
    } catch (error) {
      console.error('   Error checking inventory:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugTransaction();


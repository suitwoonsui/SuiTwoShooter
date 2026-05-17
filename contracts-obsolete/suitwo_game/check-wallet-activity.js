// Check wallet activity/transactions for Publisher
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const publisherAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function checkWalletActivity() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Checking wallet activity for Publisher...');
    console.log('   Address:', publisherAddress);
    console.log('');
    console.log('📋 This will check recent transactions...');
    console.log('   (Note: Checking all transactions may take a while)');
    console.log('');
    
    // Get transactions for this address
    // Note: This might be limited, so we'll check what we can
    console.log('📦 Fetching transactions...');
    
    // Get transactions where this address was involved
    // We'll check the transactions we know about first
    const knownTransactions = [
      { name: 'Original Publish', digest: 'GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG' },
      { name: 'Republish', digest: 'FsCNwMDjFXYMyqbWfaMWJcXGCN1npjf7auwng9BJvD4F' },
    ];
    
    console.log('Checking known transactions:\n');
    
    for (const txInfo of knownTransactions) {
      console.log(`📝 ${txInfo.name}: ${txInfo.digest}`);
      try {
        const tx = await client.getTransactionBlock({
          digest: txInfo.digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
            showEvents: true,
            showInput: true,
          },
        });
        
        // Check all object changes
        let publisherFound = false;
        if (tx.objectChanges) {
          for (const change of tx.objectChanges) {
            if (change.type === 'created' && change.objectType?.includes('Publisher')) {
              console.log(`   ✅ FOUND PUBLISHER!`);
              console.log(`      Object ID: ${change.objectId}`);
              console.log(`      Type: ${change.objectType}`);
              if (change.owner) {
                console.log(`      Owner: ${JSON.stringify(change.owner)}`);
              }
              publisherFound = true;
            }
          }
        }
        
        if (!publisherFound) {
          console.log('   ❌ No Publisher in this transaction');
        }
        
        console.log('');
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}\n`);
      }
    }
    
    // Try to get recent transactions for this address
    console.log('═══════════════════════════════════════');
    console.log('📋 MANUAL CHECK INSTRUCTIONS');
    console.log('═══════════════════════════════════════\n');
    
    console.log('1. Go to Sui Explorer Activity tab:');
    console.log(`   https://suiexplorer.com/address/${publisherAddress}?network=testnet`);
    console.log('');
    console.log('2. Look through the transaction history');
    console.log('   - Scroll through all transactions');
    console.log('   - Look for any transaction that shows "Publisher" in the object changes');
    console.log('   - Check transactions that say "Published" or "Upgrade"');
    console.log('');
    console.log('3. What to look for in Activity:');
    console.log('   - Transactions with type "Published"');
    console.log('   - Object changes showing "0x2::package::Publisher"');
    console.log('   - Any mention of "Publisher" in transaction details');
    console.log('');
    console.log('4. If you find a transaction with Publisher:');
    console.log('   - Click on that transaction');
    console.log('   - Look in "Object Changes" section');
    console.log('   - Find the Publisher object ID');
    console.log('   - Share that object ID with me');
    console.log('');
    console.log('5. Also check:');
    console.log('   - Look for transactions where objects were "Transferred"');
    console.log('   - Publisher might have been transferred to another address');
    console.log('   - Or it might have been "Consumed" in a transaction');
    console.log('');
    
    console.log('═══════════════════════════════════════');
    console.log('💡 WHAT TO SEARCH FOR');
    console.log('═══════════════════════════════════════\n');
    console.log('In the Activity tab, search for (Ctrl+F):');
    console.log('   - "Publisher"');
    console.log('   - "0x2::package::Publisher"');
    console.log('   - "package::Publisher"');
    console.log('');
    console.log('Look for transactions that:');
    console.log('   - Created a Publisher object');
    console.log('   - Transferred a Publisher object');
    console.log('   - Show "Published" action');
    console.log('');
    
    console.log('═══════════════════════════════════════');
    console.log('🔗 DIRECT LINKS');
    console.log('═══════════════════════════════════════\n');
    console.log('Your wallet on Sui Explorer:');
    console.log(`   https://suiexplorer.com/address/${publisherAddress}?network=testnet`);
    console.log('');
    console.log('Known publish transactions:');
    console.log(`   Original: https://suiexplorer.com/txblock/GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG?network=testnet`);
    console.log(`   Republish: https://suiexplorer.com/txblock/FsCNwMDjFXYMyqbWfaMWJcXGCN1npjf7auwng9BJvD4F?network=testnet`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkWalletActivity();


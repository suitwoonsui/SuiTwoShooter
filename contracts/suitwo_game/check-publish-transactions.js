// Check specific publish transactions for Publisher object
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Extract publish transaction IDs from the results.md file
// Format appears to be: two 8-character parts
const publishTransactions = [
  // Most recent (35m ago)
  { id: 'FsCNwMDjg9BJvD4F', age: '35m 18s' },
  // Recent (1h 44m ago) - this is the one user mentioned
  { id: 'GPsvcwadof5UswTG', age: '1h 44m' },
  // Older ones
  { id: 'HfTgofSRYrpAdJ5X', age: '4d' },
  { id: 'xjwuzM5xFMUmvj6z', age: '4d' },
  { id: 'C89sX4JTkjPCrzAX', age: '4d' },
  { id: '5G2YjAjGYaeWhoX2', age: '4d' },
  { id: '2Wfr3rUdZa22UK5D', age: '5d' },
  { id: '9UF1B1iG4EDet6x7', age: '5d' },
  { id: '64M2AVVcrXB8nQsA', age: '5d' },
  { id: '4yrRQtZctn4fpxot', age: '7d' },
  { id: 'CZfuF3MXKo5PD2Qb', age: '7d' },
  { id: '6TdqheYaiTXX9vjy', age: '7d' },
  { id: '83pT3nxmdTN6hj2s', age: '7d' },
  { id: 'Bu8mz7yaz1gVFQNv', age: '7d' },
  { id: '6qVWrPXN5guyfVAz', age: '8d' },
  { id: '3mfvtNcueT9mVviK', age: '9d' },
  { id: '4CNC9WtEcRkyiRzQ', age: '11d' },
  { id: '2KAExk2awMjNr2dh', age: '11d' },
  { id: 'EuiCoKx8NacoSQWK', age: '12d' },
  { id: '7LDpWNGVkUQA1rQ6', age: '12d' },
  { id: '5X4CLYLkLhXvuwyq', age: '12d' },
  { id: 'AK4qCkh9HCeFm767', age: '12d' },
];

async function checkTransaction(txId) {
  try {
    console.log(`\n🔍 Checking transaction: ${txId}`);
    const tx = await client.getTransactionBlock({
      digest: txId,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showInput: false,
        showEvents: true,
        showBalanceChanges: false,
      },
    });

    if (tx.objectChanges) {
      let foundPublisher = false;
      let foundUpgradeCap = false;
      let foundDisplay = false;
      
      for (const change of tx.objectChanges) {
        if (change.type === 'published') {
          console.log(`   📦 Package Published: ${change.packageId}`);
        } else if (change.type === 'created') {
          const objectType = change.objectType || '';
          if (objectType.includes('Publisher')) {
            foundPublisher = true;
            console.log(`   ✅ FOUND PUBLISHER!`);
            console.log(`      Object ID: ${change.objectId}`);
            console.log(`      Type: ${objectType}`);
          } else if (objectType.includes('UpgradeCap')) {
            foundUpgradeCap = true;
            console.log(`   📋 UpgradeCap created: ${change.objectId}`);
          } else if (objectType.includes('Display')) {
            foundDisplay = true;
            console.log(`   🖼️  Display created: ${change.objectId}`);
          }
        } else if (change.type === 'transferred') {
          const objectType = change.objectType || '';
          if (objectType.includes('Publisher')) {
            foundPublisher = true;
            console.log(`   ✅ FOUND PUBLISHER (transferred)!`);
            console.log(`      Object ID: ${change.objectId}`);
            console.log(`      Type: ${objectType}`);
            console.log(`      Owner: ${JSON.stringify(change.owner)}`);
          }
        }
      }
      
      if (!foundPublisher && !foundUpgradeCap && !foundDisplay) {
        console.log(`   ℹ️  No Publisher, UpgradeCap, or Display found`);
        if (tx.objectChanges.length > 0) {
          console.log(`   📋 Objects created/changed: ${tx.objectChanges.length}`);
          // Show first few object types
          const types = tx.objectChanges
            .slice(0, 5)
            .map(c => c.objectType || c.type)
            .filter(Boolean);
          if (types.length > 0) {
            console.log(`   📋 Sample types: ${types.join(', ')}`);
          }
        }
      }
      
      return foundPublisher;
    }
    
    return false;
  } catch (error) {
    if (error.message.includes('not found')) {
      console.log(`   ❌ Transaction not found (might be invalid ID format)`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    return false;
  }
}

async function checkAllTransactions() {
  console.log('═══════════════════════════════════════');
  console.log('🔍 CHECKING PUBLISH TRANSACTIONS');
  console.log('═══════════════════════════════════════');
  console.log(`Checking ${publishTransactions.length} publish transactions...`);
  console.log('Focusing on most recent ones first...\n');
  
  let foundAnyPublisher = false;
  
  // Check most recent transactions first
  for (const tx of publishTransactions.slice(0, 5)) {
    const found = await checkTransaction(tx.id);
    if (found) {
      foundAnyPublisher = true;
      console.log(`\n🎉 SUCCESS! Found Publisher in transaction: ${tx.id}`);
      console.log(`   Age: ${tx.age}`);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (!foundAnyPublisher) {
    console.log('\n═══════════════════════════════════════');
    console.log('❌ NO PUBLISHER FOUND IN RECENT TRANSACTIONS');
    console.log('═══════════════════════════════════════\n');
    console.log('Checking older transactions...\n');
    
    for (const tx of publishTransactions.slice(5)) {
      const found = await checkTransaction(tx.id);
      if (found) {
        foundAnyPublisher = true;
        console.log(`\n🎉 SUCCESS! Found Publisher in transaction: ${tx.id}`);
        console.log(`   Age: ${tx.age}`);
        break; // Stop once we find one
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n═══════════════════════════════════════');
  if (foundAnyPublisher) {
    console.log('✅ PUBLISHER FOUND!');
    console.log('═══════════════════════════════════════\n');
    console.log('You can now use the Publisher Object ID to create the Display:');
    console.log('   node create-badge-display.js <PUBLISHER_OBJECT_ID>');
  } else {
    console.log('❌ NO PUBLISHER OBJECT FOUND');
    console.log('═══════════════════════════════════════\n');
    console.log('This means:');
    console.log('   1. The package was published without creating a Publisher');
    console.log('   2. The Publisher was consumed/transferred elsewhere');
    console.log('   3. This version of Sui doesn\'t create Publishers automatically');
    console.log('\n💡 You can proceed without Display - badges will still work!');
    console.log('   The Display is only for metadata presentation in wallets.');
  }
}

checkAllTransactions().catch(console.error);


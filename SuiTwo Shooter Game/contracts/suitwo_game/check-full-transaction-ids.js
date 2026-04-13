// Check the full transaction IDs from results.md for Publisher objects
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Full transaction IDs from the bottom of results.md (most recent first)
const transactionIds = [
  'FsCNwMDjFXYMyqbWfaMWJcXGCN1npjf7auwng9BJvD4F', // Most recent (35m ago)
  'GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG', // 1h 44m ago
  'HfTgofSR5ovvaotcKhzp1T4ffy21Ycnv4XdnYrpAdJ5X', // 4d ago
  'xjwuzM5xy1NZjYfzHfH2CkR9dc9Ub6xVowiFMUmvj6z', // 4d ago
  'C89sX4JTSDjkk5aTPUszcNh9kuWYEPsw26SwkjPCrzAX', // 4d ago
  '5G2YjAjG2UPwSVFod6Lx2VDvPTTLxnwg3ybUYaeWhoX2', // 4d ago
  '2Wfr3rUdC3mTiKGPLNyYswFHLuPdjEt7Eu2kZa22UK5D', // 5d ago
  '9UF1B1iGpyAwYheW1FurDsrPEmTnqMivG9Sy4EDet6x7', // 5d ago
  '64M2AVVcrBmtA6TD5dZAcMcs3vjPG6XznArtrXB8nQsA', // 5d ago
  '4yrRQtZc3LPUkpvwPBVJpTWoTyyc9KVtewALtn4fpxot', // 7d ago
  'CZfuF3MXJZNPSFN73imf7ohWuJUQUzZtqBj5Ko5PD2Qb', // 7d ago
  '6TdqheYaCFf5apEvJZF5msqbooFyaqMYAQgXiTXX9vjy', // 7d ago
  '83pT3nxmFbyPwWAYm9PantK9DTdy4ctpygYadTN6hj2s', // 7d ago
  'Bu8mz7yawp4YCxRdQY6gAKFZrdN8FzoKjScqz1gVFQNv', // 7d ago
  '6qVWrPXNGaUmtfs5wE5uJYyF98ZDPb3t218f5guyfVAz', // 8d ago
  '3mfvtNcuvKGdV8eemcN257KViNh2aLDUUuFqeT9mVviK', // 9d ago
  '4CNC9WtE1QeeepgRFeDu4YeCtMMkQo3uHJxTcRkyiRzQ', // 11d ago
  '2KAExk2aiqaq8PdmhK4h4j6Kapky3EcjxQsLwMjNr2dh', // 11d ago
  'EuiCoKx8i9KcXvSFJxUFaQ4MTN7EAQaKs89wNacoSQWK', // 12d ago
  '7LDpWNGVkxvf3SWrEj8kM4nGyn3cSwAQ4hcxkUQA1rQ6', // 12d ago
  '5X4CLYLkk5FfvTRjme4PNmMSfgGij9PAJqDbLhXvuwyq', // 12d ago
  'AK4qCkh9srnKVUQhdE9XEixqZqV44ucwsFJuHCeFm767', // 12d ago
];

async function checkTransaction(txId) {
  try {
    console.log(`\n🔍 Checking: ${txId.substring(0, 20)}...`);
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
      let publisherId = null;
      let foundUpgradeCap = false;
      let packageId = null;
      
      for (const change of tx.objectChanges) {
        if (change.type === 'published') {
          packageId = change.packageId;
          console.log(`   📦 Package Published: ${packageId}`);
        } else if (change.type === 'created') {
          const objectType = change.objectType || '';
          if (objectType.includes('Publisher')) {
            foundPublisher = true;
            publisherId = change.objectId;
            console.log(`   ✅✅✅ FOUND PUBLISHER! ✅✅✅`);
            console.log(`      Object ID: ${publisherId}`);
            console.log(`      Type: ${objectType}`);
          } else if (objectType.includes('UpgradeCap')) {
            foundUpgradeCap = true;
            console.log(`   📋 UpgradeCap created: ${change.objectId}`);
          }
        } else if (change.type === 'transferred') {
          const objectType = change.objectType || '';
          if (objectType.includes('Publisher')) {
            foundPublisher = true;
            publisherId = change.objectId;
            console.log(`   ✅✅✅ FOUND PUBLISHER (transferred)! ✅✅✅`);
            console.log(`      Object ID: ${publisherId}`);
            console.log(`      Type: ${objectType}`);
            console.log(`      Owner: ${JSON.stringify(change.owner)}`);
          }
        }
      }
      
      if (foundPublisher) {
        return { found: true, publisherId, packageId, txId };
      } else if (foundUpgradeCap) {
        console.log(`   ℹ️  Only UpgradeCap found (no Publisher)`);
      } else if (packageId) {
        console.log(`   ℹ️  Package published but no Publisher or UpgradeCap found`);
      } else {
        console.log(`   ℹ️  No publish-related objects found`);
      }
      
      return { found: false, packageId, txId };
    }
    
    return { found: false, txId };
  } catch (error) {
    if (error.message.includes('not found')) {
      console.log(`   ❌ Transaction not found`);
    } else {
      console.log(`   ❌ Error: ${error.message.substring(0, 100)}`);
    }
    return { found: false, error: error.message };
  }
}

async function checkAllTransactions() {
  console.log('═══════════════════════════════════════');
  console.log('🔍 CHECKING FULL TRANSACTION IDs');
  console.log('═══════════════════════════════════════\n');
  console.log(`Checking ${transactionIds.length} publish transactions...`);
  console.log('Starting with most recent...\n');
  
  let foundPublisher = null;
  
  // Check transactions in order (most recent first)
  for (let i = 0; i < transactionIds.length; i++) {
    const txId = transactionIds[i];
    const result = await checkTransaction(txId);
    
    if (result.found && result.publisherId) {
      foundPublisher = result;
      console.log('\n🎉🎉🎉 SUCCESS! 🎉🎉🎉');
      console.log('═══════════════════════════════════════');
      console.log('✅ PUBLISHER OBJECT FOUND!');
      console.log('═══════════════════════════════════════\n');
      console.log(`Transaction ID: ${result.txId}`);
      console.log(`Publisher Object ID: ${result.publisherId}`);
      if (result.packageId) {
        console.log(`Package ID: ${result.packageId}`);
      }
      console.log('\n💡 Next Steps:');
      console.log(`   node create-badge-display.js ${result.publisherId}`);
      console.log(`   OR:`);
      console.log(`   node setup-badge-system.js ${result.publisherId}`);
      break; // Stop once we find one
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  if (!foundPublisher) {
    console.log('\n═══════════════════════════════════════');
    console.log('❌ NO PUBLISHER OBJECT FOUND');
    console.log('═══════════════════════════════════════\n');
    console.log('Checked all publish transactions but no Publisher was found.');
    console.log('\nThis means:');
    console.log('   1. The packages were published without creating a Publisher');
    console.log('   2. The Publisher was consumed/transferred elsewhere');
    console.log('   3. This version of Sui doesn\'t create Publishers automatically');
    console.log('\n💡 You can proceed without Display - badges will still work!');
    console.log('   The Display is only for metadata presentation in wallets.');
  }
}

checkAllTransactions().catch(console.error);


// Parse results.md and check all publish transactions for Publisher
const fs = require('fs');
const path = require('path');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Parse the results.md file
function parseTransactions() {
  const filePath = path.join(__dirname, '../../docs/results.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const transactions = [];
  let i = 0;
  
  // Skip header (lines 1-5)
  i = 6;
  
  while (i < lines.length) {
    const type = lines[i]?.trim();
    if (!type || type === '') {
      i++;
      continue;
    }
    
    // Check if this is a "Publish" transaction
    if (type === 'Publish') {
      const part1 = lines[i + 1]?.trim();
      const part2 = lines[i + 2]?.trim();
      
      if (part1 && part2) {
        // Combine the two parts to form full transaction ID
        const txId = part1 + part2;
        
        // Find the age (look ahead for a line with time format like "35m 18s", "1h 44m", "4d")
        let age = 'unknown';
        for (let j = i + 3; j < Math.min(i + 15, lines.length); j++) {
          const ageLine = lines[j]?.trim();
          if (ageLine && (ageLine.includes('m') || ageLine.includes('h') || ageLine.includes('d'))) {
            age = ageLine;
            break;
          }
        }
        
        transactions.push({
          type: 'Publish',
          txId: txId,
          age: age,
          line: i + 1
        });
      }
    }
    
    i++;
  }
  
  return transactions;
}

async function checkTransaction(txId, age) {
  try {
    console.log(`\n🔍 Checking: ${txId.substring(0, 16)}... (${age})`);
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
          console.log(`   📦 Package: ${packageId}`);
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
            console.log(`   📋 UpgradeCap: ${change.objectId}`);
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
      } else {
        console.log(`   ℹ️  No Publisher or UpgradeCap found`);
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
  console.log('📋 PARSING TRANSACTIONS FROM results.md');
  console.log('═══════════════════════════════════════\n');
  
  const transactions = parseTransactions();
  console.log(`Found ${transactions.length} Publish transactions\n`);
  
  console.log('═══════════════════════════════════════');
  console.log('🔍 CHECKING FOR PUBLISHER OBJECTS');
  console.log('═══════════════════════════════════════\n');
  console.log('Checking most recent transactions first...\n');
  
  let foundPublisher = null;
  
  // Check transactions in order (most recent first based on age)
  for (const tx of transactions) {
    const result = await checkTransaction(tx.txId, tx.age);
    
    if (result.found && result.publisherId) {
      foundPublisher = result;
      console.log('\n🎉🎉🎉 SUCCESS! 🎉🎉🎉');
      console.log('═══════════════════════════════════════');
      console.log('✅ PUBLISHER OBJECT FOUND!');
      console.log('═══════════════════════════════════════\n');
      console.log(`Transaction ID: ${result.txId}`);
      console.log(`Age: ${tx.age}`);
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
    await new Promise(resolve => setTimeout(resolve, 500));
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


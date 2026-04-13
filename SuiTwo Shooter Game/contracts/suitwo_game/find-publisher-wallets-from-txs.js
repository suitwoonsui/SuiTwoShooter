// Find wallet addresses from publish transactions, then search those wallets for Publisher
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Transaction IDs from results.md (most recent first)
const transactionIds = [
  'FsCNwMDjFXYMyqbWfaMWJcXGCN1npjf7auwng9BJvD4F',
  'GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG',
  'HfTgofSR5ovvaotcKhzp1T4ffy21Ycnv4XdnYrpAdJ5X',
  'xjwuzM5xy1NZjYfzHfH2CkR9dc9Ub6xVowiFMUmvj6z',
  'C89sX4JTSDjkk5aTPUszcNh9kuWYEPsw26SwkjPCrzAX',
  '5G2YjAjG2UPwSVFod6Lx2VDvPTTLxnwg3ybUYaeWhoX2',
];

async function findPublisherWallets() {
  console.log('═══════════════════════════════════════');
  console.log('🔍 FINDING WALLETS FROM PUBLISH TRANSACTIONS');
  console.log('═══════════════════════════════════════\n');
  
  const wallets = new Set();
  const walletToTx = new Map();
  
  // Check transactions to find sender addresses
  for (const txId of transactionIds.slice(0, 10)) { // Check first 10
    try {
      console.log(`\n📋 Checking transaction: ${txId.substring(0, 20)}...`);
      
      const tx = await client.getTransactionBlock({
        digest: txId,
        options: {
          showEffects: true,
          showInput: true,
        },
      });
      
      // Get sender from transaction
      const sender = tx.transaction?.data?.sender;
      if (sender) {
        console.log(`   Sender: ${sender}`);
        wallets.add(sender);
        if (!walletToTx.has(sender)) {
          walletToTx.set(sender, []);
        }
        walletToTx.get(sender).push(txId);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`   ❌ Error: ${error.message.substring(0, 80)}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('📋 FOUND WALLETS');
  console.log('═══════════════════════════════════════\n');
  
  const walletArray = Array.from(wallets);
  console.log(`Found ${walletArray.length} unique wallet(s):\n`);
  
  for (const wallet of walletArray) {
    console.log(`   ${wallet}`);
    const txs = walletToTx.get(wallet) || [];
    console.log(`      Transactions: ${txs.length}`);
  }
  
  // Now search each wallet for Publisher
  console.log('\n═══════════════════════════════════════');
  console.log('🔍 SEARCHING WALLETS FOR PUBLISHER');
  console.log('═══════════════════════════════════════\n');
  
  let foundPublisher = null;
  
  for (const wallet of walletArray) {
    console.log(`\n🔍 Checking wallet: ${wallet.substring(0, 20)}...`);
    
    try {
      // Search for Publisher objects
      const response = await client.getOwnedObjects({
        owner: wallet,
        filter: {
          StructType: '0x2::package::Publisher',
        },
        options: {
          showType: true,
          showOwner: true,
        },
        limit: 50,
      });
      
      const objects = response.data || [];
      
      if (objects.length > 0) {
        for (const obj of objects) {
          const objectType = obj.data?.type || '';
          if (objectType.includes('Publisher')) {
            foundPublisher = {
              wallet,
              publisherId: obj.data?.objectId,
              type: objectType,
            };
            console.log(`   ✅✅✅ FOUND PUBLISHER! ✅✅✅`);
            console.log(`      Object ID: ${foundPublisher.publisherId}`);
            console.log(`      Type: ${objectType}`);
            break;
          }
        }
      } else {
        console.log(`   ❌ No Publisher found`);
      }
      
      if (foundPublisher) break;
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`   ❌ Error: ${error.message.substring(0, 80)}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════');
  if (foundPublisher) {
    console.log('🎉 SUCCESS! PUBLISHER FOUND!');
    console.log('═══════════════════════════════════════\n');
    console.log('📋 Publisher Information:');
    console.log(`   Publisher Object ID: ${foundPublisher.publisherId}`);
    console.log(`   Wallet Address: ${foundPublisher.wallet}`);
    console.log(`   Type: ${foundPublisher.type}`);
    console.log('\n💡 Next Steps:');
    console.log(`   node create-badge-display.js ${foundPublisher.publisherId}`);
    console.log(`   OR:`);
    console.log(`   node setup-badge-system.js ${foundPublisher.publisherId}`);
  } else {
    console.log('❌ NO PUBLISHER FOUND');
    console.log('═══════════════════════════════════════\n');
    console.log('Checked all wallets from publish transactions.');
    console.log('The Publisher may not exist, or may be in a different wallet.');
  }
}

findPublisherWallets().catch(console.error);


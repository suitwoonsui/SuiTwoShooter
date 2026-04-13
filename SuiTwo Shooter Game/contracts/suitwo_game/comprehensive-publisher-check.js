// Comprehensive Publisher Check - Manual and Automated
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const publisherAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
const packageId1 = '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449'; // Old
const packageId2 = '0xad85b74ca43ff929e5ad6a96d30ce979e7fc83a5f2ac65dd4dac0aeff0782be2'; // New
const txDigest1 = 'GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG'; // Original
const txDigest2 = 'FsCNwMDjFXYMyqbWfaMWJcXGCN1npjf7auwng9BJvD4F'; // Republish

async function comprehensiveCheck() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 COMPREHENSIVE PUBLISHER CHECK');
    console.log('═══════════════════════════════════════\n');
    
    // Method 1: Check wallet for Publisher
    console.log('📦 Method 1: Checking wallet for Publisher object...');
    const allObjects = await client.getOwnedObjects({
      owner: publisherAddress,
      options: {
        showType: true,
        showOwner: true,
        showContent: false,
      },
    });
    
    console.log(`   Total objects in wallet: ${allObjects.data?.length || 0}`);
    
    const publishers = [];
    if (allObjects.data) {
      for (const obj of allObjects.data) {
        const type = obj.data?.type || '';
        if (type.includes('Publisher') || type.includes('publisher')) {
          publishers.push({
            id: obj.data?.objectId,
            type: type
          });
        }
      }
    }
    
    if (publishers.length > 0) {
      console.log(`   ✅ Found ${publishers.length} Publisher object(s)!`);
      publishers.forEach((p, i) => {
        console.log(`      ${i + 1}. ID: ${p.id}`);
        console.log(`         Type: ${p.type}`);
      });
    } else {
      console.log('   ❌ No Publisher found in wallet');
    }
    
    // Method 2: Check both transactions
    console.log('\n📦 Method 2: Checking transactions for Publisher...');
    
    const transactions = [
      { name: 'Original Publish', digest: txDigest1 },
      { name: 'Republish', digest: txDigest2 }
    ];
    
    for (const txInfo of transactions) {
      console.log(`\n   Checking ${txInfo.name} (${txInfo.digest})...`);
      try {
        const tx = await client.getTransactionBlock({
          digest: txInfo.digest,
          options: {
            showObjectChanges: true,
          },
        });
        
        let foundPublisher = false;
        if (tx.objectChanges) {
          for (const change of tx.objectChanges) {
            if (change.type === 'created' && change.objectType?.includes('Publisher')) {
              console.log(`      ✅ Found Publisher in this transaction!`);
              console.log(`         Object ID: ${change.objectId}`);
              console.log(`         Type: ${change.objectType}`);
              foundPublisher = true;
            }
          }
        }
        
        if (!foundPublisher) {
          console.log(`      ❌ No Publisher in this transaction`);
        }
      } catch (error) {
        console.log(`      ⚠️  Error checking transaction: ${error.message}`);
      }
    }
    
    // Method 3: Check package info
    console.log('\n📦 Method 3: Checking package information...');
    for (const pkgId of [packageId1, packageId2]) {
      console.log(`\n   Package: ${pkgId}`);
      try {
        const pkg = await client.getObject({
          id: pkgId,
          options: {
            showOwner: true,
            showPreviousTransaction: true,
          },
        });
        
        console.log(`      Owner: ${JSON.stringify(pkg.data?.owner)}`);
        if (pkg.data?.previousTransaction) {
          console.log(`      Previous TX: ${pkg.data.previousTransaction}`);
        }
      } catch (error) {
        console.log(`      ⚠️  Error: ${error.message}`);
      }
    }
    
    // Method 4: Manual steps
    console.log('\n═══════════════════════════════════════');
    console.log('📋 MANUAL CHECK STEPS');
    console.log('═══════════════════════════════════════\n');
    
    console.log('1. Check Sui Explorer for your wallet:');
    console.log(`   https://suiexplorer.com/address/${publisherAddress}?network=testnet`);
    console.log('   - Look for any object with "Publisher" in the name/type');
    console.log('   - Check the "Objects" tab');
    console.log('');
    
    console.log('2. Check transaction on Sui Explorer:');
    console.log(`   Original: https://suiexplorer.com/txblock/${txDigest1}?network=testnet`);
    console.log(`   Republish: https://suiexplorer.com/txblock/${txDigest2}?network=testnet`);
    console.log('   - Look in "Object Changes" section');
    console.log('   - Search for "Publisher"');
    console.log('');
    
    console.log('3. Use Sui CLI to query your wallet:');
    console.log(`   sui client objects --address ${publisherAddress}`);
    console.log('   - Look for any object with "Publisher" in the output');
    console.log('');
    
    console.log('4. Check package on Sui Explorer:');
    console.log(`   https://suiexplorer.com/object/${packageId1}?network=testnet`);
    console.log(`   https://suiexplorer.com/object/${packageId2}?network=testnet`);
    console.log('   - Look for "Publisher" information');
    console.log('');
    
    console.log('5. Query for Publisher by type:');
    console.log('   sui client objects --address <YOUR_ADDRESS> --json | findstr /i "Publisher"');
    console.log('');
    
    console.log('═══════════════════════════════════════');
    console.log('💡 WHAT TO LOOK FOR');
    console.log('═══════════════════════════════════════\n');
    console.log('Publisher object should have:');
    console.log('   - Type: 0x2::package::Publisher');
    console.log('   - Or: <PACKAGE_ID>::package::Publisher');
    console.log('   - Owner: Your wallet address');
    console.log('   - Created in the FIRST publish transaction');
    console.log('');
    
    console.log('If you find it, use it like this:');
    console.log('   node create-badge-display.js <PUBLISHER_OBJECT_ID>');
    console.log('   OR:');
    console.log('   node setup-badge-system.js <PUBLISHER_OBJECT_ID>');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

comprehensiveCheck();


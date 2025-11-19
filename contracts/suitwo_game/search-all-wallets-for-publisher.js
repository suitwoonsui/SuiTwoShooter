// Search multiple wallets for Publisher object
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Known wallet addresses to check
const walletsToCheck = [
  '0x0dff7b018de969ecabfd99280593d031a4091dc1aa733ecddcd36a564daf993b', // laughing-sapphire
  '0x503a62312153c9b8340d2c3af386725267170deb69d2ec03bf3106197b5a5724', // elastic-avanturine
  '0x5c7d736ea886bc00e0c694665cc11996948bdb974eafcc3d671210e44d2370d4', // nervous-zircon
  '0x7034cbcfb670f3f15ee7425e8d21387f2e2d647007a65f02cd0265b9fa24d76e', // compassionate-spinel
  '0x8b7950b642855a901a422f6509bb53da1c1d73db068d97bb12dd89ca7dd14505', // eager-sphene
  '0xa2fb9c2b28471ade863044384a519276056c4766cb995ff111b704197437a074', // priceless-hypersthene
  '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', // dazzling-zircon (current admin)
  '0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02', // vibrant-coral
];

// Package IDs to check
const packageIds = [
  '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449',
  '0xad85b74ca43ff929e5ad6a96d30ce979e7fc83a5f2ac65dd4dac0aeff0782be2',
  '0x593248f258fb9fa0912aa93ecf7b97121eafd2efa8f2d8cf84aad3170b242b56', // Latest from force-fresh-publish
];

async function searchWalletForPublisher(walletAddress) {
  try {
    console.log(`\n🔍 Checking wallet: ${walletAddress.substring(0, 20)}...`);
    
    let cursor = null;
    let foundPublisher = false;
    let checkedCount = 0;
    const maxChecks = 200;
    
    do {
      // Search for Publisher objects
      const response = await client.getOwnedObjects({
        owner: walletAddress,
        filter: {
          StructType: '0x2::package::Publisher',
        },
        options: {
          showType: true,
          showOwner: true,
          showContent: false,
        },
        limit: 50,
        cursor: cursor,
      });
      
      const objects = response.data || [];
      checkedCount += objects.length;
      
      for (const obj of objects) {
        const objectType = obj.data?.type || '';
        if (objectType.includes('Publisher')) {
          foundPublisher = true;
          console.log(`   ✅✅✅ FOUND PUBLISHER! ✅✅✅`);
          console.log(`      Object ID: ${obj.data?.objectId}`);
          console.log(`      Type: ${objectType}`);
          console.log(`      Owner: ${JSON.stringify(obj.data?.owner)}`);
          return obj.data?.objectId;
        }
      }
      
      cursor = response.nextCursor;
      
      if (checkedCount >= maxChecks) {
        break;
      }
    } while (cursor);
    
    // Also check all objects for any Publisher
    console.log(`   📋 Checked ${checkedCount} objects, searching all objects...`);
    
    cursor = null;
    checkedCount = 0;
    
    do {
      const response = await client.getOwnedObjects({
        owner: walletAddress,
        options: {
          showType: true,
          showOwner: true,
          showContent: false,
        },
        limit: 50,
        cursor: cursor,
      });
      
      const objects = response.data || [];
      checkedCount += objects.length;
      
      for (const obj of objects) {
        const objectType = obj.data?.type || '';
        if (objectType.includes('Publisher')) {
          foundPublisher = true;
          console.log(`   ✅✅✅ FOUND PUBLISHER (in general search)! ✅✅✅`);
          console.log(`      Object ID: ${obj.data?.objectId}`);
          console.log(`      Type: ${objectType}`);
          return obj.data?.objectId;
        }
      }
      
      cursor = response.nextCursor;
      
      if (checkedCount >= 500) { // Limit to avoid too many requests
        break;
      }
    } while (cursor);
    
    if (!foundPublisher) {
      console.log(`   ❌ No Publisher found (checked ${checkedCount} objects)`);
    }
    
    return null;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function searchAllWallets() {
  console.log('═══════════════════════════════════════');
  console.log('🔍 SEARCHING ALL WALLETS FOR PUBLISHER');
  console.log('═══════════════════════════════════════\n');
  console.log(`Checking ${walletsToCheck.length} wallet(s)...\n`);
  
  let foundPublisher = null;
  
  for (const wallet of walletsToCheck) {
    const publisherId = await searchWalletForPublisher(wallet);
    if (publisherId) {
      foundPublisher = { wallet, publisherId };
      break;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n═══════════════════════════════════════');
  if (foundPublisher) {
    console.log('🎉 SUCCESS! PUBLISHER FOUND!');
    console.log('═══════════════════════════════════════\n');
    console.log('📋 Publisher Information:');
    console.log(`   Publisher Object ID: ${foundPublisher.publisherId}`);
    console.log(`   Wallet Address: ${foundPublisher.wallet}`);
    console.log('\n💡 Next Steps:');
    console.log(`   node create-badge-display.js ${foundPublisher.publisherId}`);
    console.log(`   OR:`);
    console.log(`   node setup-badge-system.js ${foundPublisher.publisherId}`);
  } else {
    console.log('❌ NO PUBLISHER FOUND IN CHECKED WALLETS');
    console.log('═══════════════════════════════════════\n');
    console.log('💡 To add more wallets to check:');
    console.log('   1. Edit this script');
    console.log('   2. Add wallet addresses to the walletsToCheck array');
    console.log('   3. Run the script again');
    console.log('\n💡 To find wallet addresses:');
    console.log('   - Check deployment logs');
    console.log('   - Check .env files');
    console.log('   - Check any saved private keys');
    console.log('   - Check transaction history for other addresses');
  }
}

// Also check if we can find wallets from package publish transactions
async function findWalletsFromPackages() {
  console.log('\n═══════════════════════════════════════');
  console.log('🔍 CHECKING PACKAGE PUBLISHERS');
  console.log('═══════════════════════════════════════\n');
  
  for (const packageId of packageIds) {
    try {
      console.log(`\n📦 Checking package: ${packageId.substring(0, 20)}...`);
      const pkg = await client.getObject({
        id: packageId,
        options: {
          showOwner: true,
          showType: true,
        },
      });
      
      if (pkg.data?.owner) {
        const owner = pkg.data.owner;
        if (owner.AddressOwner) {
          const ownerAddress = owner.AddressOwner;
          console.log(`   Publisher address: ${ownerAddress}`);
          
          // Check if this wallet is already in our list
          if (!walletsToCheck.includes(ownerAddress)) {
            console.log(`   ⚠️  New wallet found! Adding to search list...`);
            walletsToCheck.push(ownerAddress);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Could not query package: ${error.message}`);
    }
  }
}

async function main() {
  // First, find wallets from packages
  await findWalletsFromPackages();
  
  // Then search all wallets
  await searchAllWallets();
}

main().catch(console.error);


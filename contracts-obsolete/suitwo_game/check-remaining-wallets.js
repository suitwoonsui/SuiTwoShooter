// Check the remaining wallets that hit rate limits
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const remainingWallets = [
  '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', // dazzling-zircon
  '0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02', // vibrant-coral
];

async function checkWallet(walletAddress) {
  try {
    console.log(`\n🔍 Checking wallet: ${walletAddress.substring(0, 20)}...`);
    
    // Wait a bit to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    });
    
    const objects = response.data || [];
    
    if (objects.length > 0) {
      console.log(`   ✅✅✅ FOUND ${objects.length} PUBLISHER(S)! ✅✅✅`);
      
      for (const obj of objects) {
        console.log(`      Object ID: ${obj.data?.objectId}`);
        console.log(`      Type: ${obj.data?.type || 'N/A'}`);
        return obj.data?.objectId;
      }
    } else {
      console.log(`   ❌ No Publisher found`);
    }
    
    return null;
  } catch (error) {
    if (error.message.includes('429')) {
      console.log(`   ⚠️  Rate limited, waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return checkWallet(walletAddress); // Retry
    }
    console.log(`   ❌ Error: ${error.message.substring(0, 80)}`);
    return null;
  }
}

async function checkAll() {
  console.log('═══════════════════════════════════════');
  console.log('🔍 CHECKING REMAINING WALLETS');
  console.log('═══════════════════════════════════════\n');
  
  let foundPublisher = null;
  
  for (const wallet of remainingWallets) {
    const publisherId = await checkWallet(wallet);
    if (publisherId) {
      foundPublisher = { wallet, publisherId };
      break;
    }
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
    console.log('❌ NO PUBLISHER FOUND');
    console.log('═══════════════════════════════════════\n');
    console.log('Checked all 8 wallets. No Publisher object found.');
    console.log('\n💡 This means:');
    console.log('   1. The Publisher was never created');
    console.log('   2. The Publisher was transferred/consumed');
    console.log('   3. All publishes created UpgradeCap instead');
    console.log('\n💡 Options:');
    console.log('   1. Proceed without Display (badges work fine)');
    console.log('   2. Try publishing from a completely fresh wallet');
    console.log('   3. Contact Sui support about Publisher creation');
  }
}

checkAll().catch(console.error);


// Check a specific wallet for Publisher object
// Usage: node check-wallet-for-publisher.js <WALLET_ADDRESS>
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const walletAddress = process.argv[2];

if (!walletAddress) {
  console.log('Usage: node check-wallet-for-publisher.js <WALLET_ADDRESS>');
  console.log('\nExample:');
  console.log('  node check-wallet-for-publisher.js 0x1234...');
  process.exit(1);
}

async function checkWallet() {
  try {
    console.log(`🔍 Checking wallet: ${walletAddress}\n`);
    
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
      console.log(`✅✅✅ FOUND ${objects.length} PUBLISHER(S)! ✅✅✅\n`);
      
      for (const obj of objects) {
        console.log('📋 Publisher Information:');
        console.log(`   Object ID: ${obj.data?.objectId}`);
        console.log(`   Type: ${obj.data?.type || 'N/A'}`);
        console.log(`   Owner: ${JSON.stringify(obj.data?.owner)}`);
        console.log('');
      }
      
      const firstPublisher = objects[0].data?.objectId;
      console.log('💡 Next Steps:');
      console.log(`   node create-badge-display.js ${firstPublisher}`);
      console.log(`   OR:`);
      console.log(`   node setup-badge-system.js ${firstPublisher}`);
    } else {
      console.log('❌ No Publisher found in this wallet');
      console.log('\n💡 This wallet may not have published any packages,');
      console.log('   or the Publisher was transferred/consumed.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkWallet().catch(console.error);


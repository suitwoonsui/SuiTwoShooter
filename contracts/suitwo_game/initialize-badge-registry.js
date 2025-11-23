// Initialize Badge Registry
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// Get package ID from environment variable or use the one from deployment
const packageId = process.env.GAME_SCORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT || 
                  '0x6df4ec20614cbf2b407de12997bb5fa689f7ec2833a3df3ea84cd9986f3f448d'; // Latest package

// Fee recipient address (admin wallet address)
const feeRecipient = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

function decodePrivateKey(privateKey) {
  if (privateKey.startsWith('suiprivkey1')) {
    const decoded = bech32.decode(privateKey);
    const bytes = bech32.fromWords(decoded.words);
    if (bytes.length === 33) {
      return new Uint8Array(bytes.slice(1));
    } else if (bytes.length === 32) {
      return new Uint8Array(bytes);
    } else {
      throw new Error(`Unexpected key length: ${bytes.length} bytes`);
    }
  } else {
    let hexKey = privateKey.trim();
    if (hexKey.startsWith('0x') || hexKey.startsWith('0X')) {
      hexKey = hexKey.slice(2);
    }
    return fromHEX(hexKey);
  }
}

async function initializeBadgeRegistry() {
  try {
    console.log('🔧 Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    
    // Initialize Sui client
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('\n📦 Initializing Badge Registry...');
    console.log('   Package ID:', packageId);
    console.log('   Fee Recipient:', feeRecipient);
    
    // Create transaction
    const txb = new Transaction();
    
    // Call initialize_badge_registry
    txb.moveCall({
      target: `${packageId}::badge_system::initialize_badge_registry`,
      arguments: [
        txb.pure.address(feeRecipient), // fee_recipient: address
      ],
    });
    
    txb.setGasBudget(50_000_000); // 0.05 SUI
    
    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    // Extract BadgeRegistry object ID
    let badgeRegistryObjectId = null;
    
    if (result.effects?.objectChanges) {
      for (const change of result.effects.objectChanges) {
        if (change.type === 'created' && change.objectType && change.objectType.includes('BadgeRegistry')) {
          badgeRegistryObjectId = change.objectId;
        }
      }
    }
    
    if (result.effects?.status?.status === 'success') {
      console.log('\n✅ Badge Registry initialized successfully!');
      console.log('\n📋 Badge Registry Information:');
      if (badgeRegistryObjectId) {
        console.log('   🏅 Badge Registry Object ID:', badgeRegistryObjectId);
      } else {
        console.warn('   ⚠️  Badge Registry Object ID not found automatically');
      }
      console.log('   📝 Transaction Digest:', result.digest);
      console.log('\n🔗 View on Sui Explorer:');
      console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
      
      if (badgeRegistryObjectId) {
        console.log('\n📝 Add this to your backend/.env.local:');
        console.log(`   BADGE_REGISTRY_OBJECT_ID_TESTNET=${badgeRegistryObjectId}`);
      }
    } else {
      throw new Error(`Initialization failed: ${result.effects?.status?.error || 'Unknown error'}`);
    }
    
    return badgeRegistryObjectId;
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

initializeBadgeRegistry();


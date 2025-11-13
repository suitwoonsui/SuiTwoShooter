// Create admin capability and extract the object ID
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';
const packageId = '0x87f741fdb04e34701ec039d5c7f897cae52b5631f2f83e2f4b82b283f618af3d';

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

async function createAdminCapability() {
  try {
    console.log('🔧 Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    
    // Initialize Sui client
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('\n📦 Creating admin capability...');
    console.log('   Package ID:', packageId);
    console.log('   Admin Address:', address);
    
    // Build transaction
    const txb = new Transaction();
    
    // Call create_admin_capability function
    txb.moveCall({
      target: `${packageId}::score_submission::create_admin_capability`,
      arguments: [
        txb.pure.address(address),  // admin_address: address
      ],
    });
    
    // Set gas budget
    txb.setGasBudget(50_000_000);
    
    console.log('🔐 Signing and executing transaction...');
    
    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    
    console.log('\n✅ Transaction executed successfully!');
    console.log('   Transaction Digest:', result.digest);
    
    // Extract Admin Capability Object ID
    let adminCapabilityObjectId = null;
    
    if (result.objectChanges) {
      for (const change of result.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('AdminCapability')) {
            adminCapabilityObjectId = change.objectId;
            break;
          }
        }
      }
    }
    
    // Also check effects.objectChanges as fallback
    if (!adminCapabilityObjectId && result.effects?.objectChanges) {
      for (const change of result.effects.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('AdminCapability')) {
            adminCapabilityObjectId = change.objectId;
            break;
          }
        }
      }
    }
    
    if (adminCapabilityObjectId) {
      console.log('\n✅ Found Admin Capability!');
      console.log('   Object ID:', adminCapabilityObjectId);
      console.log('\n📝 Add this to your backend/.env.local:');
      console.log(`   ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${adminCapabilityObjectId}`);
    } else {
      console.log('\n⚠️  Admin Capability Object ID not found automatically');
      console.log('   Transaction Digest:', result.digest);
      console.log('   You may need to query for it manually:');
      console.log(`   sui client tx-block ${result.digest}`);
      console.log('   Look for an object of type AdminCapability');
    }
    
    console.log('\n🔗 View on Sui Explorer:');
    console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
    
  } catch (error) {
    console.error('❌ Error creating admin capability:', error);
    process.exit(1);
  }
}

createAdminCapability();


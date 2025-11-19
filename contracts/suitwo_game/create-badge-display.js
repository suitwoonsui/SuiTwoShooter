// Create Badge Display Object
// This configures how badges appear in wallets (Sui Wallet, Sui Explorer, etc.)
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// Get package ID from environment variable or use the one from deployment
const packageId = process.env.PREMIUM_STORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT || 
                  '0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed'; // New package with Publisher

// Publisher object ID - get from deployment transaction or pass as argument
// You can find this in your deployment transaction output
// Look for an object with type containing "Publisher"
const publisherObjectId = process.argv[2] || process.env.PUBLISHER_OBJECT_ID || null;

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

async function findPublisherObject(client, packageId) {
  try {
    console.log('🔍 Searching for Publisher object...');
    
    // Get package info
    const packageInfo = await client.getObject({
      id: packageId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });

    if (!packageInfo || !packageInfo.data) {
      throw new Error('Package not found');
    }

    // Try to find Publisher in the package's published objects
    // Publisher is typically created when the package is published
    // We need to query objects owned by the package publisher
    
    // Get the publisher address from package info
    const publisherAddress = packageInfo.data.owner?.AddressOwner;
    
    if (publisherAddress) {
      console.log('   Publisher address:', publisherAddress);
      
      // Query objects owned by the publisher
      const objects = await client.getOwnedObjects({
        owner: publisherAddress,
        filter: {
          StructType: `${packageId}::badge_system::Publisher`,
        },
        options: {
          showType: true,
          showOwner: true,
        },
      });

      if (objects.data && objects.data.length > 0) {
        const publisherId = objects.data[0].data?.objectId;
        console.log('   ✅ Found Publisher object:', publisherId);
        return publisherId;
      }
    }

    // Alternative: search by type in all objects
    console.log('   Searching by type...');
    const allObjects = await client.getOwnedObjects({
      owner: publisherAddress || '0x0', // Fallback
      options: {
        showType: true,
      },
    });

    for (const obj of allObjects.data || []) {
      if (obj.data?.type?.includes('Publisher')) {
        console.log('   ✅ Found Publisher object:', obj.data.objectId);
        return obj.data.objectId;
      }
    }

    return null;
  } catch (error) {
    console.warn('   ⚠️  Could not automatically find Publisher:', error.message);
    return null;
  }
}

async function createBadgeDisplay() {
  try {
    console.log('🔧 Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    
    // Initialize Sui client
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Get Publisher object ID
    let publisherId = publisherObjectId;
    
    if (!publisherId) {
      console.log('\n🔍 Publisher object ID not provided, attempting to find it...');
      publisherId = await findPublisherObject(client, packageId);
      
      if (!publisherId) {
        console.error('\n❌ Publisher object ID not found!');
        console.error('\n📝 Please provide the Publisher object ID:');
        console.error('   Option 1: Pass as argument:');
        console.error('     node create-badge-display.js <PUBLISHER_OBJECT_ID>');
        console.error('   Option 2: Set environment variable:');
        console.error('     PUBLISHER_OBJECT_ID=<PUBLISHER_OBJECT_ID> node create-badge-display.js');
        console.error('\n💡 How to find Publisher object ID:');
        console.error('   1. Check your deployment transaction output');
        console.error('   2. Look for an object with type containing "Publisher"');
        console.error('   3. Or query your wallet objects:');
        console.error('      sui client objects --address <YOUR_ADDRESS>');
        process.exit(1);
      }
    }
    
    console.log('\n📦 Creating Badge Display Object...');
    console.log('   Package ID:', packageId);
    console.log('   Publisher Object ID:', publisherId);
    
    // Create transaction
    const txb = new Transaction();
    
    // Get the Publisher object
    const publisherObj = txb.object(publisherId);
    
    // Call create_display
    txb.moveCall({
      target: `${packageId}::badge_system::create_display`,
      arguments: [
        publisherObj, // publisher: &Publisher
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
    
    // Extract Display object ID
    let displayObjectId = null;
    
    if (result.effects?.objectChanges) {
      for (const change of result.effects.objectChanges) {
        // Display object will be transferred to the sender
        if (change.type === 'created' && change.objectType && change.objectType.includes('Display')) {
          displayObjectId = change.objectId;
        }
        // Or it might show as transferred
        if (change.type === 'transferred' && change.objectType && change.objectType.includes('Display')) {
          displayObjectId = change.objectId;
        }
      }
    }
    
    // Also check in created objects
    if (!displayObjectId && result.effects?.created) {
      for (const obj of result.effects.created) {
        if (obj.reference?.objectType?.includes('Display')) {
          displayObjectId = obj.reference.objectId;
        }
      }
    }
    
    if (result.effects?.status?.status === 'success') {
      console.log('\n✅ Badge Display object created successfully!');
      console.log('\n📋 Display Object Information:');
      if (displayObjectId) {
        console.log('   🎨 Display Object ID:', displayObjectId);
        console.log('   📍 Location: Owned by your wallet (for future updates)');
      } else {
        console.warn('   ⚠️  Display Object ID not found automatically');
        console.log('   💡 Check the transaction output manually');
      }
      console.log('   📝 Transaction Digest:', result.digest);
      console.log('\n🔗 View on Sui Explorer:');
      console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
      
      if (displayObjectId) {
        console.log('\n📝 Optional: Add this to your backend/.env.local (for future updates):');
        console.log(`   BADGE_DISPLAY_OBJECT_ID_TESTNET=${displayObjectId}`);
        console.log('\n💡 Note: The Display object is now in your wallet.');
        console.log('   You can use it to update badge metadata in the future using update_display().');
      }
    } else {
      throw new Error(`Display creation failed: ${result.effects?.status?.error || 'Unknown error'}`);
    }
    
    return displayObjectId;
    
  } catch (error) {
    console.error('\n❌ Display creation failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createBadgeDisplay();


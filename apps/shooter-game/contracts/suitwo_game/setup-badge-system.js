// Complete Badge System Setup
// This script runs both initialization steps automatically:
// 1. Initialize BadgeRegistry
// 2. Create Display Object
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// Get package ID from environment variable or use the one from deployment
// IMPORTANT: This must be the NEW package ID from the latest deployment
const packageId = process.env.GAME_SCORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT || 
                  '0x96401d57521e6a7abe5a04d072983713330fb8b5a55601ebfe9fc04ed652abe3'; // Latest package (2025-01-XX) with ticket_count fix

// Fee recipient address (admin wallet address)
const feeRecipient = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

// Publisher object ID - optional, script will try to find it
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
    console.log('   🔍 Searching for Publisher object...');
    
    const packageInfo = await client.getObject({
      id: packageId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });

    if (!packageInfo || !packageInfo.data) {
      return null;
    }

    const publisherAddress = packageInfo.data.owner?.AddressOwner;
    
    if (publisherAddress) {
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

    return null;
  } catch (error) {
    return null;
  }
}

async function initializeBadgeRegistry(client, keypair) {
  try {
    console.log('\n📦 Step 1: Initializing Badge Registry...');
    console.log('   Package ID:', packageId);
    console.log('   Fee Recipient:', feeRecipient);
    
    const txb = new Transaction();
    
    txb.moveCall({
      target: `${packageId}::badge_system::initialize_badge_registry`,
      arguments: [
        txb.pure.address(feeRecipient),
      ],
    });
    
    txb.setGasBudget(50_000_000);
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    let badgeRegistryObjectId = null;
    
    if (result.effects?.objectChanges) {
      for (const change of result.effects.objectChanges) {
        if (change.type === 'created' && change.objectType && change.objectType.includes('BadgeRegistry')) {
          badgeRegistryObjectId = change.objectId;
        }
      }
    }
    
    if (result.effects?.status?.status === 'success') {
      console.log('   ✅ Badge Registry initialized successfully!');
      if (badgeRegistryObjectId) {
        console.log('   🏅 Badge Registry Object ID:', badgeRegistryObjectId);
      }
      console.log('   📝 Transaction:', result.digest);
      return { success: true, badgeRegistryObjectId, digest: result.digest };
    } else {
      throw new Error(`Initialization failed: ${result.effects?.status?.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    throw error;
  }
}

async function createBadgeDisplay(client, keypair, publisherId) {
  try {
    console.log('\n🎨 Step 2: Creating Badge Display Object...');
    console.log('   Package ID:', packageId);
    console.log('   Publisher Object ID:', publisherId);
    
    const txb = new Transaction();
    const publisherObj = txb.object(publisherId);
    
    txb.moveCall({
      target: `${packageId}::badge_system::create_display`,
      arguments: [publisherObj],
    });
    
    txb.setGasBudget(50_000_000);
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    let displayObjectId = null;
    
    if (result.effects?.objectChanges) {
      for (const change of result.effects.objectChanges) {
        if ((change.type === 'created' || change.type === 'transferred') && 
            change.objectType && change.objectType.includes('Display')) {
          displayObjectId = change.objectId;
        }
      }
    }
    
    if (result.effects?.status?.status === 'success') {
      console.log('   ✅ Badge Display object created successfully!');
      if (displayObjectId) {
        console.log('   🎨 Display Object ID:', displayObjectId);
      }
      console.log('   📝 Transaction:', result.digest);
      return { success: true, displayObjectId, digest: result.digest };
    } else {
      throw new Error(`Display creation failed: ${result.effects?.status?.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    throw error;
  }
}

async function setupBadgeSystem() {
  try {
    console.log('🚀 Badge System Setup');
    console.log('═══════════════════════════════════════\n');
    
    console.log('🔧 Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Step 1: Initialize Badge Registry
    const registryResult = await initializeBadgeRegistry(client, keypair);
    
    if (!registryResult.success) {
      throw new Error('Badge Registry initialization failed');
    }
    
    // Step 2: Find Publisher and Create Display
    // Use the Publisher from the deployment transaction (package Publisher)
    // New deployment Publisher: 0x1939eff49571cb44905841150733ed8730a28e7822b11e9f9481412e75446216
    let publisherId = publisherObjectId || '0x1939eff49571cb44905841150733ed8730a28e7822b11e9f9481412e75446216';
    
    // Add a small delay to ensure gas objects are refreshed
    console.log('\n⏳ Waiting before creating Display...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!publisherId) {
      console.log('\n🔍 Publisher object ID not provided, attempting to find it...');
      publisherId = await findPublisherObject(client, packageId);
      
      if (!publisherId) {
        console.error('\n⚠️  Could not automatically find Publisher object ID');
        console.error('\n📝 Please provide it and run create-badge-display.js separately:');
        console.error('   node create-badge-display.js <PUBLISHER_OBJECT_ID>');
        console.error('\n💡 How to find Publisher object ID:');
        console.error('   1. Check your deployment transaction output');
        console.error('   2. Query your wallet: sui client objects --address <YOUR_ADDRESS>');
        console.error('   3. Look for an object with type containing "Publisher"');
        console.log('\n✅ Badge Registry is ready! Display can be created later.');
        return;
      }
    }
    
    // Create Display
    const displayResult = await createBadgeDisplay(client, keypair, publisherId);
    
    if (!displayResult.success) {
      console.warn('\n⚠️  Badge Registry is ready, but Display creation failed');
      console.warn('   You can create it later using: node create-badge-display.js <PUBLISHER_OBJECT_ID>');
      return;
    }
    
    // Success summary
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Badge System Setup Complete!');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📋 Environment Variables to Add:\n');
    
    if (registryResult.badgeRegistryObjectId) {
      console.log('   # Required: Badge Registry');
      console.log(`   BADGE_REGISTRY_OBJECT_ID_TESTNET=${registryResult.badgeRegistryObjectId}\n`);
    }
    
    if (displayResult.displayObjectId) {
      console.log('   # Optional: Display Object (for future updates)');
      console.log(`   BADGE_DISPLAY_OBJECT_ID_TESTNET=${displayResult.displayObjectId}\n`);
    }
    
    console.log('🔗 View Transactions:');
    if (registryResult.digest) {
      console.log(`   Registry: https://suiexplorer.com/txblock/${registryResult.digest}?network=testnet`);
    }
    if (displayResult.digest) {
      console.log(`   Display:  https://suiexplorer.com/txblock/${displayResult.digest}?network=testnet`);
    }
    
    console.log('\n✨ Your badge system is ready to use!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

setupBadgeSystem();


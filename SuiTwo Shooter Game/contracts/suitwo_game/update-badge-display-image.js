// ==========================================
// Update Badge Display Object with Image URL
// ==========================================
// This script updates the existing Display object to add the image_url field
// 
// IMPORTANT: Before running this, check if your Display object is valid:
//   node check-display-object.js
//
// If the Display object is from a different package (contract was redeployed),
// you need to RECREATE it instead of updating:
//   node create-badge-display.js <NEW_PUBLISHER_OBJECT_ID>

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env.local') });

// Configuration
// Package ID extracted from badge type: 0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b
const packageId = process.env.GAME_SCORE_PACKAGE_ID_TESTNET || process.env.GAME_SCORE_PACKAGE_ID || '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b';
// Use the specific Display object ID from the user
const displayObjectId = process.env.BADGE_DISPLAY_OBJECT_ID_TESTNET || process.env.BADGE_DISPLAY_OBJECT_ID || '0x6897f6b256e19b26ad1eec9c28c17114119920a07bb913a9d0e0787fa94b4869';
// Use same private key as setup-badge-system.js (or from env)
const privateKey = process.env.ADMIN_PRIVATE_KEY || 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

if (!packageId) {
  console.error('❌ GAME_SCORE_PACKAGE_ID_TESTNET or GAME_SCORE_PACKAGE_ID not set');
  process.exit(1);
}

if (!displayObjectId) {
  console.error('❌ BADGE_DISPLAY_OBJECT_ID_TESTNET or BADGE_DISPLAY_OBJECT_ID not set');
  console.error('💡 You need to provide the Display object ID to update it');
  console.error('💡 Find it in your wallet or from the create_display transaction');
  process.exit(1);
}

if (!privateKey) {
  console.error('❌ ADMIN_PRIVATE_KEY not set');
  process.exit(1);
}

function decodePrivateKey(privateKey) {
  // Support both bech32 (suiprivkey1...) and hex formats
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

async function updateBadgeDisplay() {
  try {
    console.log('🚀 Updating Badge Display Object with Image URL');
    console.log('═══════════════════════════════════════\n');
    
    console.log('🔧 Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    console.log('   Package ID:', packageId);
    console.log('   Display Object ID:', displayObjectId);
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Build transaction to update Display object
    console.log('\n📝 Building update transaction...');
    const txb = new Transaction();
    
    // Get the Display object
    const displayObj = txb.object(displayObjectId);
    
    // Prepare fields and values to update
    // IMPORTANT: The Display template must reference the struct field using {image}
    // Wallets look for the key "image_url" but the value should be "{image}" to reference
    // the badge's image field (not a hardcoded URL)
    // The {image} placeholder will be replaced with the actual URL from each badge's image field
    const fields = ['image_url'];
    const values = ['{image}'];  // References the 'image' field in EarlySupporterBadge struct
    
    // Call update_display function
    // Note: For vector<String>, we need to use 'string' (lowercase) as the type name
    // This will add the field if it doesn't exist, or update it if it does
    txb.moveCall({
      target: `${packageId}::badge_system::update_display`,
      arguments: [
        displayObj,
        txb.pure.vector('string', fields),
        txb.pure.vector('string', values),
      ],
    });
    
    txb.setGasBudget(50_000_000); // 0.05 SUI
    
    console.log('✅ Transaction built');
    console.log('   Updating field: image_url');
    console.log('   Template value: {image} (references badge.image field)');
    console.log('   This will map display.image_url -> badge.image for each badge');
    
    // Sign and execute
    console.log('\n📤 Signing and executing transaction...');
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    if (result.effects?.status?.status === 'success') {
      console.log('\n✅ Badge Display object updated successfully!');
      console.log('   📝 Transaction Digest:', result.digest);
      console.log('\n🔗 View on Sui Explorer:');
      console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
      console.log('\n💡 The Display object now includes the image_url field.');
      console.log('   Wallets and SuiVision should now display badge images!');
    } else {
      throw new Error(`Update failed: ${result.effects?.status?.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('\n❌ Update failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

updateBadgeDisplay();


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
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env.local') });

// Configuration
const packageId = process.env.GAME_SCORE_PACKAGE_ID_TESTNET || process.env.GAME_SCORE_PACKAGE_ID;
const displayObjectId = process.env.BADGE_DISPLAY_OBJECT_ID_TESTNET || process.env.BADGE_DISPLAY_OBJECT_ID;
const privateKey = process.env.ADMIN_PRIVATE_KEY;

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
  // Remove 0x prefix if present
  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  // Convert hex string to Uint8Array
  const keyBytes = new Uint8Array(Buffer.from(key, 'hex'));
  return keyBytes;
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
    
    // Prepare fields and values to add
    // Note: We're adding the image_url field
    // The Move function expects vector<String>, so we pass arrays directly
    const fields = ['image_url'];
    const values = ['https://suitwo.game/api/badges/{owner}/image'];
    
    // Call update_display function
    // Note: The Sui SDK will convert the arrays to Move vectors
    txb.moveCall({
      target: `${packageId}::badge_system::update_display`,
      arguments: [
        displayObj,
        txb.pure.vector('String', fields),
        txb.pure.vector('String', values),
      ],
    });
    
    txb.setGasBudget(50_000_000); // 0.05 SUI
    
    console.log('✅ Transaction built');
    console.log('   Adding field: image_url');
    console.log('   Value: https://suitwo.game/api/badges/{owner}/image');
    
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


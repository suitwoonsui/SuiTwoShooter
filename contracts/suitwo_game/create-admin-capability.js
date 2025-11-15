// Create admin capability and extract the object ID
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// Get package ID from environment variable or use the one from your backend .env
// Update this to match PREMIUM_STORE_CONTRACT_TESTNET from your backend .env file
const packageId = process.env.PREMIUM_STORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT || 
                  '0x2ecb8d9a29816e1d8359b17adb62b4bffb9a34c8d0540f81c54729a8d6c14e4e'; // Fallback - UPDATE THIS

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
    
    console.log('\n📦 Creating admin capabilities for both modules...');
    console.log('   Package ID:', packageId);
    console.log('   Admin Address:', address);
    
    let scoreSubmissionAdminCap = null;
    let premiumStoreAdminCap = null;
    
    // Create admin capability for score_submission
    console.log('\n1️⃣ Creating admin capability for score_submission...');
    const txb1 = new Transaction();
    txb1.moveCall({
      target: `${packageId}::score_submission::create_admin_capability`,
      arguments: [
        txb1.pure.address(address),
      ],
    });
    txb1.setGasBudget(50_000_000);
    
    const result1 = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb1,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    
    console.log('   ✅ Transaction executed!');
    console.log('   Transaction Digest:', result1.digest);
    
    // Extract score_submission AdminCapability
    if (result1.objectChanges) {
      for (const change of result1.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('score_submission::AdminCapability')) {
            scoreSubmissionAdminCap = change.objectId;
            console.log('   ✅ Found score_submission AdminCapability:', scoreSubmissionAdminCap);
            break;
          }
        }
      }
    }
    
    // Create admin capability for premium_store
    console.log('\n2️⃣ Creating admin capability for premium_store...');
    
    // Add a small delay to avoid version conflicts
    console.log('   ⏳ Waiting 2 seconds to avoid object version conflicts...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const txb2 = new Transaction();
    txb2.moveCall({
      target: `${packageId}::premium_store::create_admin_capability`,
      arguments: [
        txb2.pure.address(address),
      ],
    });
    txb2.setGasBudget(50_000_000);
    
    // Retry logic for version conflicts
    let result2;
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        result2 = await client.signAndExecuteTransaction({
          signer: keypair,
          transaction: txb2,
          options: {
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        if (error.message && error.message.includes('not available for consumption')) {
          retries--;
          if (retries > 0) {
            console.log(`   ⚠️  Version conflict detected, retrying... (${retries} attempts remaining)`);
            // Wait a bit longer before retrying
            await new Promise(resolve => setTimeout(resolve, 3000));
            // Rebuild transaction to get fresh object versions
            txb2 = new Transaction();
            txb2.moveCall({
              target: `${packageId}::premium_store::create_admin_capability`,
              arguments: [
                txb2.pure.address(address),
              ],
            });
            txb2.setGasBudget(50_000_000);
          }
        } else {
          throw error; // Not a version conflict, throw immediately
        }
      }
    }
    
    if (!result2) {
      throw lastError;
    }
    
    console.log('   ✅ Transaction executed!');
    console.log('   Transaction Digest:', result2.digest);
    
    // Extract premium_store AdminCapability
    if (result2.objectChanges) {
      for (const change of result2.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('premium_store::AdminCapability')) {
            premiumStoreAdminCap = change.objectId;
            console.log('   ✅ Found premium_store AdminCapability:', premiumStoreAdminCap);
            break;
          }
        }
      }
    }
    
    // Summary
    console.log('\n📋 Summary:');
    if (scoreSubmissionAdminCap) {
      console.log(`   ✅ Score Submission Admin Capability: ${scoreSubmissionAdminCap}`);
    } else {
      console.log('   ⚠️  Score Submission Admin Capability: Not found');
    }
    if (premiumStoreAdminCap) {
      console.log(`   ✅ Premium Store Admin Capability: ${premiumStoreAdminCap}`);
    } else {
      console.log('   ⚠️  Premium Store Admin Capability: Not found');
    }
    
    console.log('\n📝 Add these to your backend/.env.local:');
    if (scoreSubmissionAdminCap) {
      console.log(`   ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${scoreSubmissionAdminCap}`);
    }
    if (premiumStoreAdminCap) {
      console.log(`   PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${premiumStoreAdminCap}`);
    }
    
    console.log('\n🔗 View on Sui Explorer:');
    console.log(`   Score Submission: https://suiexplorer.com/txblock/${result1.digest}?network=testnet`);
    console.log(`   Premium Store: https://suiexplorer.com/txblock/${result2.digest}?network=testnet`);
    
  } catch (error) {
    console.error('❌ Error creating admin capability:', error);
    process.exit(1);
  }
}

createAdminCapability();


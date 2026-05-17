// Create admin capabilities for the new package deployment
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// New package ID from latest deployment
const packageId = '0xd609f0a35712ee249f59c49c684dd9bd17511f5d5fb12e807f980e31c5ea9cea';

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createAdminCaps() {
  try {
    console.log('🔐 CREATING ADMIN CAPABILITIES FOR NEW PACKAGE');
    console.log('═══════════════════════════════════════\n');
    
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    console.log('   Package ID:', packageId);
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // 1. Score Submission Admin Cap
    console.log('\n1️⃣ Creating Score Submission Admin Capability...');
    const scoreAdminTx = new Transaction();
    scoreAdminTx.moveCall({
      target: `${packageId}::score_submission::create_admin_capability`,
      arguments: [scoreAdminTx.pure.address(address)],
    });
    scoreAdminTx.setGasBudget(50_000_000);
    
    const scoreAdminResult = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: scoreAdminTx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    let scoreAdminCapId = null;
    if (scoreAdminResult.effects?.status?.status === 'success' && scoreAdminResult.effects?.objectChanges) {
      for (const change of scoreAdminResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('AdminCapability') && change.objectType?.includes('score_submission')) {
          scoreAdminCapId = change.objectId;
        }
      }
    }
    
    if (scoreAdminCapId) {
      console.log('   ✅ Score Submission Admin Cap:', scoreAdminCapId);
      console.log('   Transaction:', scoreAdminResult.digest);
    } else {
      console.warn('   ⚠️  Score Submission Admin Cap not found');
      console.log('   Transaction:', scoreAdminResult.digest);
      console.log('   Object Changes:', JSON.stringify(scoreAdminResult.effects?.objectChanges, null, 2));
    }
    
    await sleep(2000);
    
    // 2. Premium Store Admin Cap
    console.log('\n2️⃣ Creating Premium Store Admin Capability...');
    const storeAdminTx = new Transaction();
    storeAdminTx.moveCall({
      target: `${packageId}::terminal_store::create_admin_capability`,
      arguments: [storeAdminTx.pure.address(address)],
    });
    storeAdminTx.setGasBudget(50_000_000);
    
    const storeAdminResult = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: storeAdminTx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    let storeAdminCapId = null;
    if (storeAdminResult.effects?.status?.status === 'success' && storeAdminResult.effects?.objectChanges) {
      for (const change of storeAdminResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('AdminCapability') && change.objectType?.includes('terminal_store')) {
          storeAdminCapId = change.objectId;
        }
      }
    }
    
    if (storeAdminCapId) {
      console.log('   ✅ Premium Store Admin Cap:', storeAdminCapId);
      console.log('   Transaction:', storeAdminResult.digest);
    } else {
      console.warn('   ⚠️  Premium Store Admin Cap not found');
      console.log('   Transaction:', storeAdminResult.digest);
      console.log('   Object Changes:', JSON.stringify(storeAdminResult.effects?.objectChanges, null, 2));
    }
    
    await sleep(2000);
    
    // 3. Tournament Admin Cap: tournaments are platform-provided (see TOURNAMENTS_PLATFORM_ONLY.md)
    console.log('\n3️⃣ Skipping Tournament Admin Cap (use platform events/tournament admin)');
    let tournamentAdminCapId = null;
    if (tournamentAdminCapId) {
      console.log('   ✅ Tournament Admin Cap:', tournamentAdminCapId);
    } else {
      console.warn('   ⚠️  Tournament Admin Cap: use platform (TOURNAMENTS_PLATFORM_ONLY.md)');
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ ADMIN CAPABILITIES CREATION COMPLETE!');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📋 SUMMARY:');
    console.log('   📦 Package ID:', packageId);
    if (scoreAdminCapId) {
      console.log('   🔐 Score Submission Admin Cap:', scoreAdminCapId);
    } else {
      console.log('   ⚠️  Score Submission Admin Cap: NOT FOUND');
    }
    if (storeAdminCapId) {
      console.log('   🔐 Premium Store Admin Cap:', storeAdminCapId);
    } else {
      console.log('   ⚠️  Premium Store Admin Cap: NOT FOUND');
    }
    if (tournamentAdminCapId) {
      console.log('   🔐 Tournament Admin Cap:', tournamentAdminCapId);
    } else {
      console.log('   ⚠️  Tournament Admin Cap: NOT FOUND');
    }
    
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. Update backend/.env.local with the new admin cap IDs above');
    console.log('   2. Update apps/shooter-game/contracts/suitwo_game/DEPLOYMENT_IDS.md');
    console.log('   3. Restart your backend server');
    
  } catch (error) {
    console.error('\n❌ Failed to create admin capabilities:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createAdminCaps().catch(console.error);


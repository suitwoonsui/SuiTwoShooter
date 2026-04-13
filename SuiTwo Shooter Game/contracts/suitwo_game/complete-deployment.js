// Complete the deployment from the published package
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// From the previous publish transaction
const packageId = '0x14fc42564172569c7195a430194d9eb3890277624942993f9476d0512bfbec86';
const gamePassSystemObjectId = '0x1d5102691beda95d510555baecce1261695bf39c0c2c5c757a8790d17288a43d';
const sessionRegistryObjectId = '0x1e7577624bc908929b14a435318284d8f5b92358fcc8f84190efc19e186ac095';
const statisticsRegistryObjectId = '0x964228ebc2ff748571e3f3c0e20d800f842e927eec0d4f2f184f8bb9f938f074';
const premiumStoreObjectId = '0x576fcbe81f705500c3fdf09f91e67a0567cbdaa52a8afb29898846ec7b722faf';
const tournamentRegistryObjectId = '0xe1109785543783d8599cb5477b4ce87200acf9890906368ad33da92152db1f25';
const badgePublisherObjectId = '0xb14128737e8f0cb397e83e63bfeb0f0654ef55ea44f637f9ecde49933b0b3512';

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

async function completeDeployment() {
  try {
    console.log('🚀 COMPLETING CONTRACT DEPLOYMENT');
    console.log('═══════════════════════════════════════\n');
    
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    console.log('   Package ID:', packageId);
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Step 1: Initialize Badge Registry
    console.log('\n🏅 Step 1: Initializing Badge Registry...');
    const badgeInitTx = new Transaction();
    badgeInitTx.moveCall({
      target: `${packageId}::badge_system::initialize_badge_registry`,
      arguments: [badgeInitTx.pure.address(address)],
    });
    badgeInitTx.setGasBudget(50_000_000);
    
    const badgeInitResult = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: badgeInitTx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    if (badgeInitResult.effects?.status?.status !== 'success') {
      throw new Error(`Badge Registry init failed: ${badgeInitResult.effects?.status?.error || 'Unknown error'}`);
    }
    
    let badgeRegistryObjectId = null;
    if (badgeInitResult.effects?.objectChanges) {
      for (const change of badgeInitResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('BadgeRegistry')) {
          badgeRegistryObjectId = change.objectId;
        }
      }
    }
    
    // Fallback: query latest transaction if not found
    if (!badgeRegistryObjectId) {
      console.log('   ⚠️  Badge Registry not in effects, querying latest transaction...');
      const txs = await client.queryTransactionBlocks({
        filter: { FromAddress: address },
        options: { showObjectChanges: true },
        limit: 1,
      });
      if (txs.data[0]?.objectChanges) {
        for (const change of txs.data[0].objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('BadgeRegistry')) {
            badgeRegistryObjectId = change.objectId;
          }
        }
      }
    }
    
    if (!badgeRegistryObjectId) {
      throw new Error('Badge Registry object ID not found');
    }
    
    console.log('✅ Badge Registry initialized');
    console.log('   🏅 Badge Registry:', badgeRegistryObjectId);
    
    await sleep(2000);
    
    // Step 2: Create Badge Display
    console.log('\n🖼️  Step 2: Creating Badge Display...');
    let badgeDisplayObjectId = null;
    const displayTx = new Transaction();
    displayTx.moveCall({
      target: `${packageId}::badge_system::create_display`,
      arguments: [
        displayTx.object(badgePublisherObjectId),
      ],
    });
    displayTx.setGasBudget(50_000_000);
    
    const displayResult = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: displayTx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    if (displayResult.effects?.status?.status !== 'success') {
      console.warn('   ⚠️  Display creation failed:', displayResult.effects?.status?.error);
    } else {
      if (displayResult.effects?.objectChanges) {
        for (const change of displayResult.effects.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('Display')) {
            badgeDisplayObjectId = change.objectId;
          }
        }
      }
      
      if (badgeDisplayObjectId) {
        console.log('✅ Badge Display created');
        console.log('   🖼️  Badge Display:', badgeDisplayObjectId);
      } else {
        console.warn('   ⚠️  Badge Display object ID not found');
      }
    }
    
    await sleep(2000);
    
    // Step 3: Create Admin Capabilities
    console.log('\n🔐 Step 3: Creating Admin Capabilities...');
    
    // Score Submission Admin Cap
    console.log('   Creating Score Submission Admin Capability...');
    const scoreAdminTx = new Transaction();
    scoreAdminTx.moveCall({
      target: `${packageId}::score_submission::create_admin_capability`,
      arguments: [scoreAdminTx.pure.address(address)],
    });
    scoreAdminTx.setGasBudget(30_000_000);
    
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
        if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
          scoreAdminCapId = change.objectId;
        }
      }
    }
    
    if (scoreAdminCapId) {
      console.log('   ✅ Score Submission Admin Cap:', scoreAdminCapId);
    } else {
      console.warn('   ⚠️  Score Submission Admin Cap not found');
    }
    
    await sleep(2000);
    
    // Premium Store Admin Cap
    console.log('   Creating Premium Store Admin Capability...');
    const storeAdminTx = new Transaction();
    storeAdminTx.moveCall({
      target: `${packageId}::premium_store::create_admin_capability`,
      arguments: [storeAdminTx.pure.address(address)],
    });
    storeAdminTx.setGasBudget(30_000_000);
    
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
        if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
          storeAdminCapId = change.objectId;
        }
      }
    }
    
    if (storeAdminCapId) {
      console.log('   ✅ Premium Store Admin Cap:', storeAdminCapId);
    } else {
      console.warn('   ⚠️  Premium Store Admin Cap not found');
    }
    
    await sleep(2000);
    
    // Tournament Admin Cap
    console.log('   Creating Tournament Admin Capability...');
    const tournamentAdminTx = new Transaction();
    tournamentAdminTx.moveCall({
      target: `${packageId}::tournaments::create_admin_capability`,
      arguments: [tournamentAdminTx.pure.address(address)],
    });
    tournamentAdminTx.setGasBudget(30_000_000);
    
    const tournamentAdminResult = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tournamentAdminTx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    let tournamentAdminCapId = null;
    if (tournamentAdminResult.effects?.status?.status === 'success' && tournamentAdminResult.effects?.objectChanges) {
      for (const change of tournamentAdminResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
          tournamentAdminCapId = change.objectId;
        }
      }
    }
    
    if (tournamentAdminCapId) {
      console.log('   ✅ Tournament Admin Cap:', tournamentAdminCapId);
    } else {
      console.warn('   ⚠️  Tournament Admin Cap not found');
    }
    
    // Final Summary
    console.log('\n═══════════════════════════════════════');
    console.log('✅ DEPLOYMENT COMPLETE!');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📋 DEPLOYMENT SUMMARY:');
    console.log('   📦 Package ID:', packageId);
    console.log('   🆔 Session Registry:', sessionRegistryObjectId);
    console.log('   📊 Statistics Registry:', statisticsRegistryObjectId);
    console.log('   🛒 Premium Store:', premiumStoreObjectId);
    console.log('   🎮 Game Pass System:', gamePassSystemObjectId);
    console.log('   🏆 Tournament Registry:', tournamentRegistryObjectId);
    console.log('   🏅 Badge Registry:', badgeRegistryObjectId);
    console.log('   🏅 Badge Publisher:', badgePublisherObjectId);
    console.log('   🖼️  Badge Display:', badgeDisplayObjectId || 'NOT FOUND');
    console.log('   🔐 Score Admin Cap:', scoreAdminCapId || 'NOT FOUND');
    console.log('   🔐 Store Admin Cap:', storeAdminCapId || 'NOT FOUND');
    console.log('   🔐 Tournament Admin Cap:', tournamentAdminCapId || 'NOT FOUND');
    
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. Update backend/.env.local with the new IDs above');
    console.log('   2. Update contracts/suitwo_game/DEPLOYMENT_IDS.md');
    console.log('   3. Restart your backend server');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

completeDeployment();


// Full contract deployment with all initialization steps
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

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

async function fullDeploy() {
  try {
    console.log('🚀 FULL CONTRACT DEPLOYMENT');
    console.log('═══════════════════════════════════════\n');
    
    // Step 1: Initialize admin wallet
    console.log('🔧 Step 1: Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Check balance
    console.log('\n💰 Checking wallet balance...');
    const balance = await client.getBalance({ owner: address });
    const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000;
    console.log(`   Balance: ${balanceInSUI} SUI`);
    
    if (balanceInSUI < 0.5) {
      console.error('❌ Insufficient balance! Need at least 0.5 SUI for full deployment.');
      console.log('   Please fund the wallet:', address);
      return;
    }
    
    // Step 2: Build contract
    console.log('\n🔨 Step 2: Building contract...');
    try {
      execSync('sui move build', { 
        cwd: __dirname, 
        stdio: 'inherit',
        shell: true
      });
      console.log('✅ Contract built successfully');
    } catch (error) {
      console.error('❌ Build failed');
      throw error;
    }
    
    // Step 3: Publish package
    console.log('\n📦 Step 3: Publishing package...');
    const buildPath = path.join(__dirname, 'build', 'suitwo_game');
    const modulesDir = path.join(buildPath, 'bytecode_modules');
    
    const modules = fs.readdirSync(modulesDir)
      .filter(f => f.endsWith('.mv') && !f.includes('dependencies') && !f.includes('mews'))
      .map(f => fs.readFileSync(path.join(modulesDir, f)));
    
    console.log(`   Found ${modules.length} module(s) to publish`);
    
    const txb = new Transaction();
    const moduleBytes = modules.map(m => new Uint8Array(m));
    
    const frameworkDependencies = [
      '0x0000000000000000000000000000000000000000000000000000000000000001', // MoveStdlib
      '0x0000000000000000000000000000000000000000000000000000000000000002', // Sui
    ];
    
    const [upgradeCap] = txb.publish({
      modules: moduleBytes,
      dependencies: frameworkDependencies,
    });
    
    txb.transferObjects([upgradeCap], address);
    txb.setGasBudget(200_000_000);
    
    console.log('   Publishing to testnet (this may take a minute)...');
    const publishResult = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    
    if (publishResult.effects?.status?.status !== 'success') {
      throw new Error(`Publish failed: ${publishResult.effects?.status?.error || 'Unknown error'}`);
    }
    
    console.log('✅ Package published successfully');
    console.log('   Transaction Digest:', publishResult.digest);
    
    // Extract package ID and objects from publish transaction
    let packageId = null;
    let sessionRegistryObjectId = null;
    let statisticsRegistryObjectId = null;
    let premiumStoreObjectId = null;
    let gamePassSystemObjectId = null;
    let tournamentRegistryObjectId = null;
    let badgePublisherObjectId = null;
    
    // First, try to get package ID from objectChanges
    if (publishResult.effects?.objectChanges) {
      for (const change of publishResult.effects.objectChanges) {
        if (change.type === 'published') {
          packageId = change.packageId;
        }
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('SessionRegistry')) {
            sessionRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('StatisticsRegistry')) {
            statisticsRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('PremiumStore')) {
            premiumStoreObjectId = change.objectId;
          }
          if (change.objectType.includes('GamePassSystem')) {
            gamePassSystemObjectId = change.objectId;
          }
          if (change.objectType.includes('TournamentRegistry')) {
            tournamentRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('Publisher')) {
            badgePublisherObjectId = change.objectId;
          }
          
          // Fallback: Extract package ID from object type if not found
          if (!packageId && change.objectType.includes('::')) {
            const extractedPackageId = change.objectType.split('::')[0];
            if (extractedPackageId.startsWith('0x') && extractedPackageId.length === 66) {
              packageId = extractedPackageId;
            }
          }
        }
      }
    }
    
    // If still not found, query the transaction directly
    if (!packageId) {
      console.log('   ⚠️  Package ID not in effects, waiting for transaction to be indexed...');
      await sleep(5000);  // Wait 5 seconds for transaction to be indexed
      console.log('   Querying transaction directly...');
      const txDetails = await client.getTransactionBlock({
        digest: publishResult.digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      if (txDetails.objectChanges) {
        for (const change of txDetails.objectChanges) {
          if (change.type === 'published') {
            packageId = change.packageId;
            break;
          }
          // Also extract from object types
          if (change.type === 'created' && change.objectType && change.objectType.includes('::')) {
            const extractedPackageId = change.objectType.split('::')[0];
            if (extractedPackageId.startsWith('0x') && extractedPackageId.length === 66) {
              packageId = extractedPackageId;
            }
          }
        }
      }
    }
    
    if (!packageId) {
      console.error('   ❌ Could not extract package ID. Transaction details:');
      console.error(JSON.stringify(publishResult, null, 2));
      throw new Error('Package ID not found in publish transaction');
    }
    
    console.log('\n📋 Extracted from publish transaction:');
    console.log('   📦 Package ID:', packageId);
    if (sessionRegistryObjectId) console.log('   🆔 Session Registry:', sessionRegistryObjectId);
    if (statisticsRegistryObjectId) console.log('   📊 Statistics Registry:', statisticsRegistryObjectId);
    if (premiumStoreObjectId) console.log('   🛒 Premium Store:', premiumStoreObjectId);
    if (gamePassSystemObjectId) console.log('   🎮 Game Pass System:', gamePassSystemObjectId);
    if (tournamentRegistryObjectId) console.log('   🏆 Tournament Registry:', tournamentRegistryObjectId);
    if (badgePublisherObjectId) console.log('   🏅 Badge Publisher:', badgePublisherObjectId);
    
    // Wait a bit for objects to be available
    console.log('\n⏳ Waiting for objects to be available...');
    await sleep(3000);
    
    // Step 4: Badge Registry — platform only (game package no longer has badge_system)
    console.log('\n🏅 Step 4: Badge Registry...');
    let badgeRegistryObjectId = null;
    console.log('   ℹ️  Badges are on platform (platform_nft). Skipping game badge_system init.');
    await sleep(500);

    // Step 5: Badge Display — platform only
    console.log('\n🖼️  Step 5: Badge Display...');
    let badgeDisplayObjectId = null;
    console.log('   ℹ️  Badge display is on platform. Skipping game badge_system create_display.');
    await sleep(2000);

    // Step 6: Create Admin Capabilities
    console.log('\n🔐 Step 6: Creating Admin Capabilities...');
    
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
      target: `${packageId}::terminal_store::create_admin_capability`,
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
    
    // Tournament Admin Cap: tournaments are platform-provided (see TOURNAMENTS_PLATFORM_ONLY.md)
    console.log('   Skipping Tournament Admin Cap (use platform events/tournament admin)');
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
      console.warn('   ⚠️  Tournament Admin Cap: use platform (TOURNAMENTS_PLATFORM_ONLY.md)');
    }
    
    // Final Summary
    console.log('\n═══════════════════════════════════════');
    console.log('✅ FULL DEPLOYMENT COMPLETE!');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📋 DEPLOYMENT SUMMARY:');
    console.log('   📦 Package ID:', packageId);
    console.log('   🆔 Session Registry:', sessionRegistryObjectId || 'NOT FOUND');
    console.log('   📊 Statistics Registry:', statisticsRegistryObjectId || 'NOT FOUND');
    console.log('   🛒 Premium Store:', premiumStoreObjectId || 'NOT FOUND');
    console.log('   🎮 Game Pass System:', gamePassSystemObjectId || 'NOT FOUND');
    console.log('   🏆 Tournament Registry:', tournamentRegistryObjectId || 'NOT FOUND');
    console.log('   🏅 Badge Registry:', badgeRegistryObjectId || 'NOT FOUND');
    console.log('   🏅 Badge Publisher:', badgePublisherObjectId || 'NOT FOUND');
    console.log('   🖼️  Badge Display:', badgeDisplayObjectId || 'NOT FOUND');
    console.log('   🔐 Score Admin Cap:', scoreAdminCapId || 'NOT FOUND');
    console.log('   🔐 Store Admin Cap:', storeAdminCapId || 'NOT FOUND');
    console.log('   🔐 Tournament Admin Cap:', tournamentAdminCapId || 'NOT FOUND');
    
    console.log('\n🔗 View on Sui Explorer:');
    console.log(`   Package: https://suiexplorer.com/object/${packageId}?network=testnet`);
    console.log(`   Publish TX: https://suiexplorer.com/txblock/${publishResult.digest}?network=testnet`);
    
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. Update backend/.env.local with the new IDs above');
    console.log('   2. Update apps/shooter-game/contracts/suitwo_game/DEPLOYMENT_IDS.md');
    console.log('   3. Restart your backend server');
    
    // Return all IDs for potential script usage
    return {
      packageId,
      sessionRegistryObjectId,
      statisticsRegistryObjectId,
      premiumStoreObjectId,
      gamePassSystemObjectId,
      tournamentRegistryObjectId,
      badgeRegistryObjectId,
      badgePublisherObjectId,
      badgeDisplayObjectId,
      scoreAdminCapId,
      storeAdminCapId,
      tournamentAdminCapId,
      publishDigest: publishResult.digest,
    };
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fullDeploy();


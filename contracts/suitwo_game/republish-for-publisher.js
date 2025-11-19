// Republish package to get Publisher object
// This creates a NEW package ID, so all references need to be updated
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

async function republishForPublisher() {
  try {
    console.log('🚀 Republishing Package to Get Publisher Object');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('⚠️  IMPORTANT: This will create a NEW package ID!');
    console.log('   You will need to update all references to the old package ID.');
    console.log('');
    
    console.log('🔧 Initializing admin wallet...');
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
    
    if (balanceInSUI < 0.15) {
      console.error('❌ Insufficient balance! Need at least 0.15 SUI for deployment.');
      console.log('   Please fund the wallet:', address);
      return;
    }
    
    // Build the contract
    console.log('\n🔨 Building contract...');
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
    
    // Read the compiled package
    const buildPath = path.join(__dirname, 'build', 'suitwo_game');
    const modulesDir = path.join(buildPath, 'bytecode_modules');
    
    const modules = fs.readdirSync(modulesDir)
      .filter(f => f.endsWith('.mv') && !f.includes('dependencies') && !f.includes('mews'))
      .map(f => fs.readFileSync(path.join(modulesDir, f)));
    
    console.log(`\n📦 Found ${modules.length} module(s) to publish`);
    
    console.log('\n📦 Publishing contract to testnet...');
    console.log('   This will create a NEW package with a Publisher object...');
    
    const txb = new Transaction();
    const moduleBytes = modules.map(m => new Uint8Array(m));
    
    const frameworkDependencies = [
      '0x0000000000000000000000000000000000000000000000000000000000000001', // MoveStdlib
      '0x0000000000000000000000000000000000000000000000000000000000000002', // Sui
    ];
    
    // Publish - this should create a Publisher on first publish
    const [upgradeCap] = txb.publish({
      modules: moduleBytes,
      dependencies: frameworkDependencies,
    });
    
    // Transfer upgrade capability to sender
    txb.transferObjects([upgradeCap], address);
    
    txb.setGasBudget(150_000_000);
    
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
    
    // Extract package ID and Publisher
    let packageId = null;
    let publisherId = null;
    let sessionRegistryId = null;
    let premiumStoreId = null;
    let statisticsRegistryId = null;
    
    if (result.effects?.objectChanges) {
      for (const change of result.effects.objectChanges) {
        if (change.type === 'published') {
          packageId = change.packageId;
        }
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('Publisher')) {
            publisherId = change.objectId;
          }
          if (change.objectType.includes('SessionRegistry')) {
            sessionRegistryId = change.objectId;
          }
          if (change.objectType.includes('PremiumStore')) {
            premiumStoreId = change.objectId;
          }
          if (change.objectType.includes('StatisticsRegistry')) {
            statisticsRegistryId = change.objectId;
          }
        }
      }
    }
    
    if (result.effects?.status?.status === 'success') {
      console.log('\n✅ Package republished successfully!');
      console.log('\n═══════════════════════════════════════');
      console.log('📋 NEW PACKAGE INFORMATION');
      console.log('═══════════════════════════════════════\n');
      
      if (packageId) {
        console.log('📦 NEW Package ID:', packageId);
      }
      
      if (publisherId) {
        console.log('✅ Publisher Object ID:', publisherId);
        console.log('   (This is what we needed!)');
      } else {
        console.log('⚠️  WARNING: Publisher object not found!');
        console.log('   This is unexpected. Check the transaction manually.');
      }
      
      if (sessionRegistryId) {
        console.log('📊 Session Registry Object ID:', sessionRegistryId);
      }
      
      if (premiumStoreId) {
        console.log('🛒 Premium Store Object ID:', premiumStoreId);
      }
      
      if (statisticsRegistryId) {
        console.log('📈 Statistics Registry Object ID:', statisticsRegistryId);
      }
      
      console.log('\n📝 Transaction Digest:', result.digest);
      console.log('\n🔗 View on Sui Explorer:');
      console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
      
      console.log('\n═══════════════════════════════════════');
      console.log('⚠️  ACTION REQUIRED: Update References');
      console.log('═══════════════════════════════════════\n');
      
      console.log('You need to update these environment variables:');
      console.log('');
      
      if (packageId) {
        console.log('   OLD Package ID: 0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449');
        console.log(`   NEW Package ID: ${packageId}`);
        console.log('');
        console.log('   Update in backend/.env:');
        console.log(`   GAME_SCORE_CONTRACT_TESTNET=${packageId}`);
        console.log(`   PREMIUM_STORE_CONTRACT_TESTNET=${packageId}`);
      }
      
      if (sessionRegistryId) {
        console.log(`   SESSION_REGISTRY_OBJECT_ID=${sessionRegistryId}`);
      }
      
      if (premiumStoreId) {
        console.log(`   PREMIUM_STORE_OBJECT_ID=${premiumStoreId}`);
      }
      
      if (statisticsRegistryId) {
        console.log(`   STATISTICS_REGISTRY_OBJECT_ID=${statisticsRegistryId}`);
      }
      
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('🎯 NEXT STEPS');
      console.log('═══════════════════════════════════════\n');
      
      if (publisherId) {
        console.log('1. Update environment variables (see above)');
        console.log('2. Initialize Badge Registry:');
        console.log('   node initialize-badge-registry.js');
        console.log('3. Create Display object:');
        console.log(`   node create-badge-display.js ${publisherId}`);
        console.log('   OR:');
        console.log(`   node setup-badge-system.js ${publisherId}`);
      } else {
        console.log('1. Check the transaction manually for Publisher object');
        console.log('2. If found, use it to create Display');
        console.log('3. Update all environment variables');
      }
      
    } else {
      throw new Error(`Publish failed: ${result.effects?.status?.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('\n❌ Republish failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

republishForPublisher();


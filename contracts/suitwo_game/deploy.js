// Programmatic contract deployment using the admin wallet
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
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

async function deploy() {
  try {
    console.log('🔧 Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    
    // Initialize Sui client
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Check balance
    console.log('\n💰 Checking wallet balance...');
    const balance = await client.getBalance({ owner: address });
    const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000;
    console.log(`   Balance: ${balanceInSUI} SUI`);
    
    if (balanceInSUI < 0.01) {
      console.error('❌ Insufficient balance! Need at least 0.01 SUI for deployment.');
      console.log('   Please fund the wallet:', address);
      return;
    }
    
    // Build the contract first
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
    
    // Get our modules (not in dependencies folder, exclude mews)
    const modules = fs.readdirSync(modulesDir)
      .filter(f => f.endsWith('.mv') && !f.includes('dependencies') && !f.includes('mews'))
      .map(f => fs.readFileSync(path.join(modulesDir, f)));
    
    console.log(`\n📦 Found ${modules.length} module(s) to publish (excluding mews)`);
    
    // Get dependencies from the build info
    // The SDK will automatically resolve framework dependencies, but we need to pass empty array
    // The actual dependencies are resolved from the build metadata
    const dependencies = [];
    
    console.log('\n📦 Publishing contract to testnet...');
    console.log('   This may take a minute...');
    
    // Use Transaction to publish
    const { Transaction } = require('@mysten/sui/transactions');
    const txb = new Transaction();
    
    // Publish using Transaction
    // Convert modules from Buffer to Uint8Array
    const moduleBytes = modules.map(m => new Uint8Array(m));
    
    // Sui framework packages are system packages with well-known addresses:
    // MoveStdlib: 0x1 (0x0000000000000000000000000000000000000000000000000000000000000001)
    // Sui: 0x2 (0x0000000000000000000000000000000000000000000000000000000000000002)
    // These are automatically available on the network, but we need to pass them as dependencies
    const frameworkDependencies = [
      '0x0000000000000000000000000000000000000000000000000000000000000001', // MoveStdlib
      '0x0000000000000000000000000000000000000000000000000000000000000002', // Sui
    ];
    
    const [upgradeCap] = txb.publish({
      modules: moduleBytes,
      dependencies: frameworkDependencies,
    });
    
    // Transfer upgrade capability to sender (optional, but good practice)
    txb.transferObjects([upgradeCap], address);
    
    // Set higher gas budget for contract deployment (publishing requires more gas)
    // With 3 modules (score_submission + premium_store + badge_system, excluding mews), we need more gas
    txb.setGasBudget(150_000_000); // 0.15 SUI - deployment needs more gas than regular transactions
    
    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    
    // Extract package ID, Session Registry, Premium Store, and Badge Registry object IDs from transaction effects
    let packageId = null;
    let sessionRegistryObjectId = null;
    let premiumStoreObjectId = null;
    let badgeRegistryObjectId = null;
    
    // Check objectChanges (most reliable method)
    if (result.effects?.objectChanges) {
      for (const change of result.effects.objectChanges) {
        // Package ID from published change
        if (change.type === 'published') {
          packageId = change.packageId;
        }
        // Session Registry, Premium Store, and Badge Registry from created shared objects
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('SessionRegistry')) {
            sessionRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('PremiumStore')) {
            premiumStoreObjectId = change.objectId;
          }
          if (change.objectType.includes('BadgeRegistry')) {
            badgeRegistryObjectId = change.objectId;
          }
        }
      }
    }
    
    // Fallback: check created objects
    if (result.effects?.created) {
      for (const obj of result.effects.created) {
        if (obj.owner === 'Immutable' && !packageId) {
          packageId = obj.reference?.objectId;
        }
        // Check for shared objects (SessionRegistry, PremiumStore, BadgeRegistry)
        if (obj.owner && typeof obj.owner === 'object' && 'Shared' in obj.owner) {
          const objectType = obj.reference?.objectType || '';
          if (objectType.includes('SessionRegistry')) {
            sessionRegistryObjectId = obj.reference?.objectId;
          }
          if (objectType.includes('PremiumStore')) {
            premiumStoreObjectId = obj.reference?.objectId;
          }
          if (objectType.includes('BadgeRegistry')) {
            badgeRegistryObjectId = obj.reference?.objectId;
          }
        }
      }
    }
    
    // Debug: log the full result if IDs not found
    if ((!packageId || !sessionRegistryObjectId) && result.effects?.status?.status === 'success') {
      console.log('\n⚠️  Some IDs not found automatically. Checking transaction details...');
    }
    
    if (result.effects?.status?.status === 'success') {
      console.log('\n✅ Contract deployed successfully!');
      console.log('\n📋 Deployment Information:');
      
      if (packageId) {
        console.log('   📦 Package ID:', packageId);
      } else {
        console.warn('   ⚠️  Package ID not found automatically');
      }
      
      if (sessionRegistryObjectId) {
        console.log('   🆔 Session Registry Object ID:', sessionRegistryObjectId);
      } else {
        console.warn('   ⚠️  Session Registry Object ID not found automatically');
        console.log('   You may need to query for it manually');
      }
      
      if (premiumStoreObjectId) {
        console.log('   🛒 Premium Store Object ID:', premiumStoreObjectId);
      }
      if (badgeRegistryObjectId) {
        console.log('   🏅 Badge Registry Object ID:', badgeRegistryObjectId);
      }
      
      console.log('   📝 Transaction Digest:', result.digest);
      console.log('\n🔗 View on Sui Explorer:');
      if (packageId) {
        console.log(`   https://suiexplorer.com/object/${packageId}?network=testnet`);
      }
      console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
      
      console.log('\n📝 Add these to your backend/.env.local:');
      if (packageId) {
        console.log(`   GAME_SCORE_CONTRACT_TESTNET=${packageId}`);
      } else {
        console.log('   GAME_SCORE_CONTRACT_TESTNET=<EXTRACT_FROM_TRANSACTION>');
      }
      if (sessionRegistryObjectId) {
        console.log(`   SESSION_REGISTRY_OBJECT_ID_TESTNET=${sessionRegistryObjectId}`);
      } else {
        console.log('   SESSION_REGISTRY_OBJECT_ID_TESTNET=<EXTRACT_FROM_TRANSACTION>');
        console.log('   Check transaction effects for created SessionRegistry object');
      }
      if (premiumStoreObjectId) {
        console.log(`   PREMIUM_STORE_OBJECT_ID_TESTNET=${premiumStoreObjectId}`);
      }
      if (badgeRegistryObjectId) {
        console.log(`   BADGE_REGISTRY_OBJECT_ID_TESTNET=${badgeRegistryObjectId}`);
      }
    } else {
      throw new Error(`Deployment failed: ${result.effects?.status?.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

deploy();


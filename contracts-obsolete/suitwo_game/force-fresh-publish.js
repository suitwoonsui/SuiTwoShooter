// Force a fresh publish by changing package name to get a Publisher object
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

const moveTomlPath = path.join(__dirname, 'Move.toml');
const originalMoveToml = fs.readFileSync(moveTomlPath, 'utf-8');

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

async function forceFreshPublish() {
  try {
    console.log('🚀 FORCING FRESH PUBLISH TO GET PUBLISHER');
    console.log('═══════════════════════════════════════\n');
    
    // Step 1: Modify Move.toml to change package name
    console.log('📝 Step 1: Modifying package name to force fresh publish...');
    const timestamp = Date.now();
    const newPackageName = `suitwo_game_${timestamp}`;
    
    // Replace package name in Move.toml
    const modifiedMoveToml = originalMoveToml.replace(
      /^name = "suitwo_game"/m,
      `name = "${newPackageName}"`
    );
    
    fs.writeFileSync(moveTomlPath, modifiedMoveToml);
    console.log(`   ✅ Changed package name to: ${newPackageName}`);
    
    // Step 2: Build
    console.log('\n🔨 Step 2: Building contract...');
    try {
      execSync('sui move build', { 
        cwd: __dirname, 
        stdio: 'inherit',
        shell: true
      });
      console.log('   ✅ Build successful');
    } catch (error) {
      // Restore original Move.toml on error
      fs.writeFileSync(moveTomlPath, originalMoveToml);
      throw new Error('Build failed: ' + error.message);
    }
    
    // Step 3: Initialize wallet
    console.log('\n🔐 Step 3: Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    console.log(`   ✅ Address: ${address}`);
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Check balance
    console.log('\n💰 Step 4: Checking balance...');
    const balance = await client.getBalance({ owner: address });
    const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000;
    console.log(`   Balance: ${balanceInSUI} SUI`);
    
    if (balanceInSUI < 0.15) {
      fs.writeFileSync(moveTomlPath, originalMoveToml);
      throw new Error(`Insufficient balance! Need at least 0.15 SUI. Current: ${balanceInSUI} SUI`);
    }
    
    // Step 5: Read compiled modules
    console.log('\n📦 Step 5: Reading compiled modules...');
    const buildPath = path.join(__dirname, 'build', newPackageName);
    const modulesDir = path.join(buildPath, 'bytecode_modules');
    
    if (!fs.existsSync(modulesDir)) {
      fs.writeFileSync(moveTomlPath, originalMoveToml);
      throw new Error('Build directory not found. Build may have failed.');
    }
    
    const modules = fs.readdirSync(modulesDir)
      .filter(f => f.endsWith('.mv') && !f.includes('dependencies'))
      .map(f => fs.readFileSync(path.join(modulesDir, f)));
    
    console.log(`   ✅ Found ${modules.length} module(s)`);
    
    // Step 6: Publish
    console.log('\n🚀 Step 6: Publishing as FRESH package (this should create Publisher)...');
    console.log('   ⚠️  This will create a NEW package ID!');
    
    const txb = new Transaction();
    const moduleBytes = modules.map(m => new Uint8Array(m));
    
    const frameworkDependencies = [
      '0x0000000000000000000000000000000000000000000000000000000000000001', // MoveStdlib
      '0x0000000000000000000000000000000000000000000000000000000000000002', // Sui
    ];
    
    // Publish - with new package name, this should be treated as fresh
    const [upgradeCap] = txb.publish({
      modules: moduleBytes,
      dependencies: frameworkDependencies,
    });
    
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
    
    console.log(`\n   ✅ Transaction successful!`);
    console.log(`   Digest: ${result.digest}`);
    
    // Step 7: Extract Publisher
    console.log('\n🔍 Step 7: Extracting Publisher object...');
    let packageId = null;
    let publisherId = null;
    let upgradeCapId = null;
    
    if (result.objectChanges) {
      for (const change of result.objectChanges) {
        if (change.type === 'published') {
          packageId = change.packageId;
          console.log(`   📦 Package ID: ${packageId}`);
        } else if (change.type === 'created') {
          const objectType = change.objectType || '';
          if (objectType.includes('Publisher')) {
            publisherId = change.objectId;
            console.log(`   ✅✅✅ PUBLISHER FOUND! ✅✅✅`);
            console.log(`      Object ID: ${publisherId}`);
            console.log(`      Type: ${objectType}`);
          } else if (objectType.includes('UpgradeCap')) {
            upgradeCapId = change.objectId;
            console.log(`   📋 UpgradeCap: ${upgradeCapId}`);
          }
        }
      }
    }
    
    // Step 8: Restore original Move.toml
    console.log('\n📝 Step 8: Restoring original Move.toml...');
    fs.writeFileSync(moveTomlPath, originalMoveToml);
    console.log('   ✅ Restored');
    
    // Step 9: Results
    console.log('\n═══════════════════════════════════════');
    if (publisherId) {
      console.log('🎉 SUCCESS! PUBLISHER OBJECT CREATED!');
      console.log('═══════════════════════════════════════\n');
      console.log('📋 IMPORTANT INFORMATION:');
      console.log(`   Publisher Object ID: ${publisherId}`);
      console.log(`   New Package ID: ${packageId}`);
      console.log(`   Transaction: ${result.digest}`);
      console.log('\n💡 Next Steps:');
      console.log(`   1. Update your package ID to: ${packageId}`);
      console.log(`   2. Run: node create-badge-display.js ${publisherId}`);
      console.log(`   3. Or run: node setup-badge-system.js ${publisherId}`);
      console.log('\n⚠️  NOTE: This is a NEW package ID!');
      console.log('   You need to update all references to the old package ID.');
    } else {
      console.log('❌ NO PUBLISHER CREATED');
      console.log('═══════════════════════════════════════\n');
      console.log('Sui still treated this as an upgrade.');
      console.log(`   Package ID: ${packageId || 'NOT FOUND'}`);
      console.log(`   UpgradeCap: ${upgradeCapId || 'NOT FOUND'}`);
      console.log('\n💡 Alternative: We may need to check if Publisher exists from');
      console.log('   a very first publish, or use a different approach.');
    }
    
  } catch (error) {
    // Make sure to restore Move.toml on any error
    try {
      fs.writeFileSync(moveTomlPath, originalMoveToml);
    } catch (e) {
      console.error('⚠️  Could not restore Move.toml:', e.message);
    }
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

forceFreshPublish().catch(console.error);


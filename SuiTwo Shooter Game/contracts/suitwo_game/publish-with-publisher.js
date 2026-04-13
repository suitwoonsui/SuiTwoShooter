// Publish the contract - this time the init function will create a Publisher automatically
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

async function publishWithPublisher() {
  try {
    console.log('🚀 PUBLISHING CONTRACT WITH PUBLISHER AUTO-CREATION');
    console.log('═══════════════════════════════════════\n');
    console.log('The init() function will automatically create a Publisher object!');
    console.log('This will create a NEW package ID.\n');
    
    // Build
    console.log('🔨 Step 1: Building contract...');
    try {
      execSync('sui move build', { 
        cwd: __dirname, 
        stdio: 'inherit',
        shell: true
      });
      console.log('   ✅ Build successful\n');
    } catch (error) {
      throw new Error('Build failed: ' + error.message);
    }
    
    // Initialize wallet
    console.log('🔐 Step 2: Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    console.log(`   ✅ Address: ${address}\n`);
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Check balance
    console.log('💰 Step 3: Checking balance...');
    const balance = await client.getBalance({ owner: address });
    const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000;
    console.log(`   Balance: ${balanceInSUI} SUI\n`);
    
    if (balanceInSUI < 0.15) {
      throw new Error(`Insufficient balance! Need at least 0.15 SUI. Current: ${balanceInSUI} SUI`);
    }
    
    // Read modules
    console.log('📦 Step 4: Reading compiled modules...');
    const buildPath = path.join(__dirname, 'build', 'suitwo_game');
    const modulesDir = path.join(buildPath, 'bytecode_modules');
    
    if (!fs.existsSync(modulesDir)) {
      throw new Error('Build directory not found');
    }
    
    const modules = fs.readdirSync(modulesDir)
      .filter(f => f.endsWith('.mv') && !f.includes('dependencies'))
      .map(f => fs.readFileSync(path.join(modulesDir, f)));
    
    console.log(`   ✅ Found ${modules.length} module(s)\n`);
    
    // Publish
    console.log('🚀 Step 5: Publishing contract...');
    console.log('   The init() function will automatically create a Publisher!\n');
    
    const txb = new Transaction();
    const moduleBytes = modules.map(m => new Uint8Array(m));
    
    const frameworkDependencies = [
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000000000000000000000000000002',
    ];
    
    const [upgradeCap] = txb.publish({
      modules: moduleBytes,
      dependencies: frameworkDependencies,
    });
    
    txb.transferObjects([upgradeCap], address);
    txb.setGasBudget(150_000_000);
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    console.log(`   ✅ Transaction successful!`);
    console.log(`   Digest: ${result.digest}\n`);
    
    // Extract Publisher
    console.log('🔍 Step 6: Extracting Publisher object...');
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
        } else if (change.type === 'transferred') {
          const objectType = change.objectType || '';
          if (objectType.includes('Publisher')) {
            publisherId = change.objectId;
            console.log(`   ✅✅✅ PUBLISHER FOUND (transferred)! ✅✅✅`);
            console.log(`      Object ID: ${publisherId}`);
            console.log(`      Type: ${objectType}`);
          }
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════');
    if (publisherId) {
      console.log('🎉 SUCCESS! PUBLISHER CREATED!');
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
      
      // Save to file
      const info = {
        publisherId,
        packageId,
        transaction: result.digest,
        timestamp: new Date().toISOString(),
      };
      
      fs.writeFileSync(
        path.join(__dirname, 'publisher-info.json'),
        JSON.stringify(info, null, 2)
      );
      
      console.log('\n💾 Information saved to: publisher-info.json');
    } else {
      console.log('❌ NO PUBLISHER CREATED');
      console.log('═══════════════════════════════════════\n');
      console.log('The init() function should have created a Publisher.');
      console.log(`   Package ID: ${packageId || 'NOT FOUND'}`);
      console.log(`   UpgradeCap: ${upgradeCapId || 'NOT FOUND'}`);
      console.log('\n💡 Check the transaction on Sui Explorer:');
      console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

publishWithPublisher().catch(console.error);


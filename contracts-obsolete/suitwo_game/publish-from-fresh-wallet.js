// Publish from a completely fresh wallet to get Publisher
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function publishFromFreshWallet() {
  try {
    console.log('🚀 PUBLISHING FROM FRESH WALLET');
    console.log('═══════════════════════════════════════\n');
    console.log('This will create a NEW wallet and publish from it.');
    console.log('A fresh wallet that has never published should create a Publisher.\n');
    
    // Generate a completely new keypair
    console.log('🔑 Step 1: Generating new wallet...');
    const keypair = new Ed25519Keypair();
    const address = keypair.toSuiAddress();
    const privateKey = keypair.getSecretKey();
    
    console.log('   ✅ New wallet created!');
    console.log(`   Address: ${address}`);
    console.log(`   Private Key: ${privateKey}`);
    console.log('\n⚠️  IMPORTANT: Save this private key!');
    console.log('   You will need it to manage the Publisher object.\n');
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Check balance
    console.log('💰 Step 2: Checking balance...');
    const balance = await client.getBalance({ owner: address });
    const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000;
    console.log(`   Balance: ${balanceInSUI} SUI`);
    
    if (balanceInSUI < 0.2) {
      console.log('\n❌ Insufficient balance in new wallet!');
      console.log(`   Need: 0.2 SUI`);
      console.log(`   Current: ${balanceInSUI} SUI`);
      console.log('\n💡 Please fund this wallet:');
      console.log(`   ${address}`);
      console.log('\n   You can use a faucet or transfer from your main wallet.');
      console.log('   Then run this script again.');
      return;
    }
    
    // Build
    console.log('\n🔨 Step 3: Building contract...');
    try {
      execSync('sui move build', { 
        cwd: __dirname, 
        stdio: 'inherit',
        shell: true
      });
      console.log('   ✅ Build successful');
    } catch (error) {
      throw new Error('Build failed: ' + error.message);
    }
    
    // Read modules
    console.log('\n📦 Step 4: Reading compiled modules...');
    const buildPath = path.join(__dirname, 'build', 'suitwo_game');
    const modulesDir = path.join(buildPath, 'bytecode_modules');
    
    if (!fs.existsSync(modulesDir)) {
      throw new Error('Build directory not found');
    }
    
    const modules = fs.readdirSync(modulesDir)
      .filter(f => f.endsWith('.mv') && !f.includes('dependencies'))
      .map(f => fs.readFileSync(path.join(modulesDir, f)));
    
    console.log(`   ✅ Found ${modules.length} module(s)`);
    
    // Publish
    console.log('\n🚀 Step 5: Publishing from FRESH wallet...');
    console.log('   This should create a Publisher object!\n');
    
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
    console.log('🔍 Step 6: Checking for Publisher...');
    let packageId = null;
    let publisherId = null;
    
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
            console.log(`   📋 UpgradeCap: ${change.objectId} (not what we want)`);
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
      console.log(`   New Wallet Address: ${address}`);
      console.log(`   New Wallet Private Key: ${privateKey}`);
      console.log(`   Transaction: ${result.digest}`);
      console.log('\n💡 Next Steps:');
      console.log(`   1. Save the Publisher ID: ${publisherId}`);
      console.log(`   2. Save the new wallet private key: ${privateKey}`);
      console.log(`   3. Update package ID to: ${packageId}`);
      console.log(`   4. Run: node create-badge-display.js ${publisherId}`);
      console.log('\n⚠️  NOTE: The Publisher is owned by the NEW wallet!');
      console.log('   You will need to use that wallet to create/update Display.');
      
      // Save to file
      const info = {
        publisherId,
        packageId,
        walletAddress: address,
        walletPrivateKey: privateKey,
        transaction: result.digest,
        timestamp: new Date().toISOString(),
      };
      
      fs.writeFileSync(
        path.join(__dirname, 'publisher-info.json'),
        JSON.stringify(info, null, 2)
      );
      
      console.log('\n💾 Information saved to: publisher-info.json');
    } else {
      console.log('❌ STILL NO PUBLISHER');
      console.log('═══════════════════════════════════════\n');
      console.log('Even with a fresh wallet, Sui created UpgradeCap.');
      console.log(`   Package ID: ${packageId || 'NOT FOUND'}`);
      console.log('\n💡 This suggests a Sui framework issue.');
      console.log('   Options:');
      console.log('   1. Proceed without Display');
      console.log('   2. Contact Sui support');
      console.log('   3. Check Sui version/framework');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

publishFromFreshWallet().catch(console.error);


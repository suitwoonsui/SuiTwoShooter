// Try publishing with explicit publish metadata to force Publisher creation
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

async function tryPublishWithMetadata() {
  try {
    console.log('🚀 ATTEMPTING PUBLISH WITH EXPLICIT METADATA');
    console.log('═══════════════════════════════════════\n');
    console.log('This will try using sui client publish directly...\n');
    
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('🔐 Admin wallet:', address);
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Check balance
    const balance = await client.getBalance({ owner: address });
    const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000;
    console.log(`💰 Balance: ${balanceInSUI} SUI\n`);
    
    if (balanceInSUI < 0.15) {
      throw new Error(`Insufficient balance! Need at least 0.15 SUI. Current: ${balanceInSUI} SUI`);
    }
    
    console.log('📝 Attempting to use sui client publish directly...');
    console.log('   This might create a Publisher if we use the CLI...\n');
    
    // Try using sui client publish via CLI
    // This sometimes works differently than the SDK
    try {
      const output = execSync('sui client publish --gas-budget 150000000 --skip-dependency-verification', {
        cwd: __dirname,
        encoding: 'utf-8',
        stdio: 'pipe',
        shell: true
      });
      
      console.log('✅ CLI publish completed!');
      console.log('\n📋 Output:');
      console.log(output);
      
      // Try to extract transaction digest from output
      const digestMatch = output.match(/Transaction Digest: ([A-Za-z0-9]+)/);
      if (digestMatch) {
        const digest = digestMatch[1];
        console.log(`\n🔍 Checking transaction: ${digest}`);
        
        // Check the transaction for Publisher
        const tx = await client.getTransactionBlock({
          digest: digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
            showEvents: true,
          },
        });
        
        let publisherId = null;
        let packageId = null;
        
        if (tx.objectChanges) {
          for (const change of tx.objectChanges) {
            if (change.type === 'published') {
              packageId = change.packageId;
              console.log(`   📦 Package: ${packageId}`);
            } else if (change.type === 'created') {
              const objectType = change.objectType || '';
              if (objectType.includes('Publisher')) {
                publisherId = change.objectId;
                console.log(`   ✅✅✅ PUBLISHER FOUND! ✅✅✅`);
                console.log(`      Object ID: ${publisherId}`);
              }
            }
          }
        }
        
        if (publisherId) {
          console.log('\n🎉 SUCCESS!');
          console.log(`   Publisher: ${publisherId}`);
          console.log(`   Package: ${packageId}`);
          console.log(`\n💡 Next: node create-badge-display.js ${publisherId}`);
        } else {
          console.log('\n❌ Still no Publisher created');
        }
      }
      
    } catch (error) {
      console.error('❌ CLI publish failed:', error.message);
      console.log('\n💡 The CLI might have config issues. Let me try one more approach...');
      
      // Last resort: Check if we can query Publisher from package metadata
      console.log('\n🔍 Checking if Publisher can be queried from existing packages...');
      
      const packages = [
        '0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449',
        '0xad85b74ca43ff929e5ad6a96d30ce979e7fc83a5f2ac65dd4dac0aeff0782be2',
      ];
      
      for (const pkgId of packages) {
        try {
          // Try to get package info
          const pkgInfo = await client.getObject({
            id: pkgId,
            options: {
              showType: true,
              showOwner: true,
              showContent: true,
            },
          });
          
          console.log(`\n   Package ${pkgId}:`);
          console.log(`   Type: ${pkgInfo.data?.type || 'N/A'}`);
          
          // Publisher might be stored in package metadata or as a child object
          // But this is unlikely to work
        } catch (e) {
          console.log(`   Could not query package ${pkgId}`);
        }
      }
      
      console.log('\n═══════════════════════════════════════');
      console.log('❌ UNABLE TO CREATE PUBLISHER');
      console.log('═══════════════════════════════════════\n');
      console.log('Sui is consistently creating UpgradeCap instead of Publisher.');
      console.log('\n💡 Possible solutions:');
      console.log('   1. Use a completely new wallet that has never published');
      console.log('   2. Contact Sui support about Publisher creation');
      console.log('   3. Proceed without Display (badges work fine)');
      console.log('   4. Wait for Sui framework update that fixes this');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

tryPublishWithMetadata().catch(console.error);


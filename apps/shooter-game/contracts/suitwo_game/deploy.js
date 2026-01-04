// Complete contract deployment with connection testing and retry logic
// This is the ONLY deployment script you need
const { SuiClient } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// Alternative RPC endpoints in case the default fails
const TESTNET_RPC_ENDPOINTS = [
  'https://fullnode.testnet.sui.io:443',
  'https://sui-testnet-rpc.allthatnode.com',
  'https://testnet.suiet.app',
  'https://rpc-testnet.suiscan.xyz',
];

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

// Test connection to a specific RPC endpoint
async function testConnection(url, timeout = 10000) {
  try {
    const client = new SuiClient({ url });
    await Promise.race([
      client.getLatestCheckpointSequenceNumber(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      )
    ]);
    return { success: true, url };
  } catch (error) {
    return { success: false, url, error: error.message };
  }
}

// Find a working RPC endpoint
async function findWorkingEndpoint() {
  console.log('🔍 Testing RPC endpoints...\n');
  
  for (const endpoint of TESTNET_RPC_ENDPOINTS) {
    console.log(`   Testing: ${endpoint}...`);
    const result = await testConnection(endpoint, 8000);
    if (result.success) {
      console.log(`   ✅ Connected to: ${endpoint}\n`);
      return endpoint;
    } else {
      console.log(`   ❌ Failed: ${result.error}\n`);
    }
  }
  
  throw new Error('❌ All RPC endpoints failed. Check your internet connection and try again.');
}

// Retry wrapper for operations
async function retryOperation(operation, maxRetries = 3, delay = 2000, operationName = 'Operation') {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
      }
      const result = await operation();
      if (attempt > 1) {
        console.log(`   ✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`${operationName} failed after ${maxRetries} attempts: ${error.message}`);
      }
      if (attempt > 1) {
        console.log(`   ⚠️  Attempt ${attempt} failed: ${error.message}`);
        console.log(`   Retrying in ${delay}ms...`);
      }
      await sleep(delay);
      delay *= 1.5; // Exponential backoff
    }
  }
}

async function deploy() {
  try {
    console.log('🚀 CONTRACT DEPLOYMENT');
    console.log('═══════════════════════════════════════\n');
    
    // Step 0: Find working RPC endpoint
    console.log('🔧 Step 0: Finding working RPC endpoint...');
    const rpcUrl = await findWorkingEndpoint();
    const client = new SuiClient({ url: rpcUrl });
    
    // Step 1: Initialize admin wallet
    console.log('🔧 Step 1: Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    console.log('   RPC URL:', rpcUrl);
    
    // Check balance with retry
    console.log('\n💰 Checking wallet balance...');
    const balance = await retryOperation(
      async () => await client.getBalance({ owner: address }),
      3,
      2000,
      'Balance check'
    );
    const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000;
    console.log(`   Balance: ${balanceInSUI} SUI`);
    
    if (balanceInSUI < 0.5) {
      console.error('❌ Insufficient balance! Need at least 0.5 SUI for full deployment.');
      console.log('   Please fund the wallet:', address);
      console.log('   Get testnet SUI from: https://discord.gg/sui (testnet-faucet channel)');
      return;
    }
    
    // Step 2: Build contract
    console.log('\n🔨 Step 2: Building contract...');
    try {
      execSync('sui move build', { 
        cwd: __dirname, 
        stdio: 'inherit',
        shell: true,
        timeout: 120000
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
    
    if (!fs.existsSync(modulesDir)) {
      throw new Error(`Build directory not found: ${modulesDir}`);
    }
    
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
    txb.setGasBudget(500_000_000); // Increased for large package deployment
    
    console.log('   Publishing to testnet (this may take 1-2 minutes)...');
    
    // Publish with retry
    const publishResult = await retryOperation(
      async () => {
        return await client.signAndExecuteTransaction({
          signer: keypair,
          transaction: txb,
          options: {
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
      },
      3,
      5000,
      'Package publish'
    );
    
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
          
          if (!packageId && change.objectType.includes('::')) {
            const extractedPackageId = change.objectType.split('::')[0];
            if (extractedPackageId.startsWith('0x') && extractedPackageId.length === 66) {
              packageId = extractedPackageId;
            }
          }
        }
      }
    }
    
    // If still not found, query the transaction directly with retry
    if (!packageId || !sessionRegistryObjectId || !statisticsRegistryObjectId) {
      console.log('   ⚠️  Some IDs not in effects, waiting for transaction to be indexed...');
      await sleep(5000);
      console.log('   Querying transaction directly...');
      
      const txDetails = await retryOperation(
        async () => await client.getTransactionBlock({
          digest: publishResult.digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        }),
        3,
        3000,
        'Transaction query'
      );
      
      if (txDetails.objectChanges) {
        for (const change of txDetails.objectChanges) {
          if (change.type === 'published') {
            packageId = change.packageId;
          }
          if (change.type === 'created' && change.objectType) {
            const objectType = change.objectType;
            if (objectType.includes('::')) {
              const extractedPackageId = objectType.split('::')[0];
              if (extractedPackageId.startsWith('0x') && extractedPackageId.length === 66) {
                packageId = extractedPackageId;
              }
            }
            // Extract all object types
            if (objectType.includes('SessionRegistry')) {
              sessionRegistryObjectId = change.objectId;
            }
            if (objectType.includes('StatisticsRegistry')) {
              statisticsRegistryObjectId = change.objectId;
            }
            if (objectType.includes('PremiumStore')) {
              premiumStoreObjectId = change.objectId;
            }
            if (objectType.includes('GamePassSystem')) {
              gamePassSystemObjectId = change.objectId;
            }
            if (objectType.includes('TournamentRegistry')) {
              tournamentRegistryObjectId = change.objectId;
            }
            if (objectType.includes('Publisher') && objectType.includes('badge')) {
              badgePublisherObjectId = change.objectId;
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
    
    await sleep(3000);
    
    // Step 4: Initialize Badge Registry
    console.log('\n🏅 Step 4: Initializing Badge Registry...');
    const badgeInitTx = new Transaction();
    badgeInitTx.moveCall({
      target: `${packageId}::badge_system::initialize_badge_registry`,
      arguments: [badgeInitTx.pure.address(address)],
    });
    badgeInitTx.setGasBudget(50_000_000);
    
    const badgeInitResult = await retryOperation(
      async () => await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: badgeInitTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      }),
      3,
      3000,
      'Badge Registry init'
    );
    
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
    
    // If not found, query the transaction directly
    if (!badgeRegistryObjectId) {
      console.log('   ⚠️  Badge Registry not in effects, querying transaction...');
      await sleep(3000);
      const badgeTxDetails = await retryOperation(
        async () => await client.getTransactionBlock({
          digest: badgeInitResult.digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        }),
        3,
        3000,
        'Badge Registry transaction query'
      );
      
      if (badgeTxDetails.objectChanges) {
        for (const change of badgeTxDetails.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('BadgeRegistry')) {
            badgeRegistryObjectId = change.objectId;
          }
        }
      }
    }
    
    if (!badgeRegistryObjectId) {
      console.warn('   ⚠️  Badge Registry object ID not found in transaction');
      console.warn('   Transaction digest:', badgeInitResult.digest);
      console.warn('   You may need to extract it manually from Sui Explorer');
      console.warn('   Continuing with deployment...');
    }
    
    if (badgeRegistryObjectId) {
      console.log('✅ Badge Registry initialized');
      console.log('   🏅 Badge Registry:', badgeRegistryObjectId);
    } else {
      console.log('⚠️  Badge Registry initialized but ID not found');
      console.log('   Check transaction:', badgeInitResult.digest);
    }
    
    await sleep(2000);
    
    // Step 5: Create Badge Display
    console.log('\n🖼️  Step 5: Creating Badge Display...');
    let badgeDisplayObjectId = null;
    if (!badgePublisherObjectId) {
      console.warn('   ⚠️  Badge Publisher not found, skipping Display creation');
    } else {
      const displayTx = new Transaction();
      displayTx.moveCall({
        target: `${packageId}::badge_system::create_display`,
        arguments: [
          displayTx.object(badgePublisherObjectId),
        ],
      });
      displayTx.setGasBudget(50_000_000);
      
      const displayResult = await retryOperation(
        async () => await client.signAndExecuteTransaction({
          signer: keypair,
          transaction: displayTx,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        }),
        3,
        3000,
        'Badge Display creation'
      );
      
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
    }
    
    await sleep(2000);
    
    // Step 6: Initialize Achievement Registry
    console.log('\n🏆 Step 6: Initializing Achievement Registry...');
    const achievementInitTx = new Transaction();
    achievementInitTx.moveCall({
      target: `${packageId}::achievement_system::initialize_achievement_registry`,
      arguments: [achievementInitTx.pure.address(address)],
    });
    achievementInitTx.setGasBudget(50_000_000);
    
    const achievementInitResult = await retryOperation(
      async () => await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: achievementInitTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      }),
      3,
      3000,
      'Achievement Registry init'
    );
    
    if (achievementInitResult.effects?.status?.status !== 'success') {
      throw new Error(`Achievement Registry init failed: ${achievementInitResult.effects?.status?.error || 'Unknown error'}`);
    }
    
    let achievementRegistryObjectId = null;
    if (achievementInitResult.effects?.objectChanges) {
      for (const change of achievementInitResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('AchievementRegistry')) {
          achievementRegistryObjectId = change.objectId;
        }
      }
    }
    
    // If not found, query the transaction directly
    if (!achievementRegistryObjectId) {
      console.log('   ⚠️  Achievement Registry not in effects, querying transaction...');
      await sleep(3000);
      const achievementTxDetails = await retryOperation(
        async () => await client.getTransactionBlock({
          digest: achievementInitResult.digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        }),
        3,
        3000,
        'Achievement Registry transaction query'
      );
      
      if (achievementTxDetails.objectChanges) {
        for (const change of achievementTxDetails.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('AchievementRegistry')) {
            achievementRegistryObjectId = change.objectId;
          }
        }
      }
    }
    
    if (!achievementRegistryObjectId) {
      console.warn('   ⚠️  Achievement Registry object ID not found in transaction');
      console.warn('   Transaction digest:', achievementInitResult.digest);
      console.warn('   You may need to extract it manually from Sui Explorer');
      console.warn('   Continuing with deployment...');
    }
    
    if (achievementRegistryObjectId) {
      console.log('✅ Achievement Registry initialized');
      console.log('   🏆 Achievement Registry:', achievementRegistryObjectId);
    } else {
      console.log('⚠️  Achievement Registry initialized but ID not found');
      console.log('   Check transaction:', achievementInitResult.digest);
    }
    
    await sleep(2000);
    
    // Step 7: Create Achievement Admin Capability
    console.log('   Creating Achievement Admin Capability...');
    const achievementAdminTx = new Transaction();
    achievementAdminTx.moveCall({
      target: `${packageId}::achievement_system::create_admin_capability`,
      arguments: [achievementAdminTx.pure.address(address)],
    });
    achievementAdminTx.setGasBudget(30_000_000);
    
    const achievementAdminResult = await retryOperation(
      async () => await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: achievementAdminTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      }),
      3,
      3000,
      'Achievement Admin Cap creation'
    );
    
    let achievementAdminCapId = null;
    if (achievementAdminResult.effects?.status?.status === 'success' && achievementAdminResult.effects?.objectChanges) {
      for (const change of achievementAdminResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
          achievementAdminCapId = change.objectId;
        }
      }
    }
    
    // If not found, query transaction
    if (!achievementAdminCapId && achievementAdminResult.effects?.status?.status === 'success') {
      await sleep(2000);
      const achievementAdminTxDetails = await retryOperation(
        async () => await client.getTransactionBlock({
          digest: achievementAdminResult.digest,
          options: { showObjectChanges: true },
        }),
        2,
        2000,
        'Achievement Admin Cap query'
      );
      if (achievementAdminTxDetails.objectChanges) {
        for (const change of achievementAdminTxDetails.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
            achievementAdminCapId = change.objectId;
          }
        }
      }
    }
    
    if (achievementAdminCapId) {
      console.log('   ✅ Achievement Admin Cap:', achievementAdminCapId);
    } else {
      console.warn('   ⚠️  Achievement Admin Cap not found');
    }
    
    await sleep(2000);
    
    // Step 8: Create Admin Capabilities
    console.log('\n🔐 Step 8: Creating Admin Capabilities...');
    
    // Score Submission Admin Cap
    console.log('   Creating Score Submission Admin Capability...');
    const scoreAdminTx = new Transaction();
    scoreAdminTx.moveCall({
      target: `${packageId}::score_submission::create_admin_capability`,
      arguments: [scoreAdminTx.pure.address(address)],
    });
    scoreAdminTx.setGasBudget(30_000_000);
    
    const scoreAdminResult = await retryOperation(
      async () => await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: scoreAdminTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      }),
      3,
      3000,
      'Score Admin Cap creation'
    );
    
    let scoreAdminCapId = null;
    if (scoreAdminResult.effects?.status?.status === 'success' && scoreAdminResult.effects?.objectChanges) {
      for (const change of scoreAdminResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
          scoreAdminCapId = change.objectId;
        }
      }
    }
    
    // If not found, query transaction
    if (!scoreAdminCapId && scoreAdminResult.effects?.status?.status === 'success') {
      await sleep(2000);
      const scoreTxDetails = await retryOperation(
        async () => await client.getTransactionBlock({
          digest: scoreAdminResult.digest,
          options: { showObjectChanges: true },
        }),
        2,
        2000,
        'Score Admin Cap query'
      );
      if (scoreTxDetails.objectChanges) {
        for (const change of scoreTxDetails.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
            scoreAdminCapId = change.objectId;
          }
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
    
    const storeAdminResult = await retryOperation(
      async () => await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: storeAdminTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      }),
      3,
      3000,
      'Store Admin Cap creation'
    );
    
    let storeAdminCapId = null;
    if (storeAdminResult.effects?.status?.status === 'success' && storeAdminResult.effects?.objectChanges) {
      for (const change of storeAdminResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
          storeAdminCapId = change.objectId;
        }
      }
    }
    
    // If not found, query transaction
    if (!storeAdminCapId && storeAdminResult.effects?.status?.status === 'success') {
      await sleep(2000);
      const storeTxDetails = await retryOperation(
        async () => await client.getTransactionBlock({
          digest: storeAdminResult.digest,
          options: { showObjectChanges: true },
        }),
        2,
        2000,
        'Store Admin Cap query'
      );
      if (storeTxDetails.objectChanges) {
        for (const change of storeTxDetails.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
            storeAdminCapId = change.objectId;
          }
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
    
    const tournamentAdminResult = await retryOperation(
      async () => await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tournamentAdminTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      }),
      3,
      3000,
      'Tournament Admin Cap creation'
    );
    
    let tournamentAdminCapId = null;
    if (tournamentAdminResult.effects?.status?.status === 'success' && tournamentAdminResult.effects?.objectChanges) {
      for (const change of tournamentAdminResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
          tournamentAdminCapId = change.objectId;
        }
      }
    }
    
    // If not found, query transaction
    if (!tournamentAdminCapId && tournamentAdminResult.effects?.status?.status === 'success') {
      await sleep(2000);
      const tournamentTxDetails = await retryOperation(
        async () => await client.getTransactionBlock({
          digest: tournamentAdminResult.digest,
          options: { showObjectChanges: true },
        }),
        2,
        2000,
        'Tournament Admin Cap query'
      );
      if (tournamentTxDetails.objectChanges) {
        for (const change of tournamentTxDetails.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('AdminCapability')) {
            tournamentAdminCapId = change.objectId;
          }
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
    console.log('   🆔 Session Registry:', sessionRegistryObjectId || 'NOT FOUND');
    console.log('   📊 Statistics Registry:', statisticsRegistryObjectId || 'NOT FOUND');
    console.log('   🛒 Premium Store:', premiumStoreObjectId || 'NOT FOUND');
    console.log('   🎮 Game Pass System:', gamePassSystemObjectId || 'NOT FOUND');
    console.log('   🏆 Tournament Registry:', tournamentRegistryObjectId || 'NOT FOUND');
    console.log('   🏅 Badge Registry:', badgeRegistryObjectId || 'NOT FOUND');
    console.log('   🏅 Badge Publisher:', badgePublisherObjectId || 'NOT FOUND');
    console.log('   🖼️  Badge Display:', badgeDisplayObjectId || 'NOT FOUND');
    console.log('   🏆 Achievement Registry:', achievementRegistryObjectId || 'NOT FOUND');
    console.log('   🔐 Achievement Admin Cap:', achievementAdminCapId || 'NOT FOUND');
    console.log('   🔐 Score Admin Cap:', scoreAdminCapId || 'NOT FOUND');
    console.log('   🔐 Store Admin Cap:', storeAdminCapId || 'NOT FOUND');
    console.log('   🔐 Tournament Admin Cap:', tournamentAdminCapId || 'NOT FOUND');
    
    console.log('\n🔗 View on Sui Explorer:');
    console.log(`   Package: https://suiexplorer.com/object/${packageId}?network=testnet`);
    console.log(`   Publish TX: https://suiexplorer.com/txblock/${publishResult.digest}?network=testnet`);
    
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. Update backend/.env.local with the new IDs above');
    console.log('   2. Update contracts/suitwo_game/DEPLOYMENT_IDS.md');
    console.log('   3. Restart your backend server');
    
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
      achievementRegistryObjectId,
      achievementAdminCapId,
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
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your internet connection');
    console.error('   2. Verify you have sufficient SUI balance (at least 0.5 SUI)');
    console.error('   3. Try running the script again (it will retry automatically)');
    console.error('   4. Check if Sui testnet is experiencing issues');
    process.exit(1);
  }
}

deploy();

// Game contract deployment script (upgradable)
// Complete deployment with connection testing and retry logic. To upgrade: run again; UpgradeCap from UPGRADE_CAP.json or discovered on-chain.
//
// Platform package ID: Prefer .env (PLATFORM_PACKAGE_ID_TESTNET or AQUEDUCT_PLATFORM_PACKAGE_ID_TESTNET) as single source of truth.
// The Move compiler only reads Move.toml at build time. When .env has the platform ID we write it into Move.toml before building.
const { SuiClient } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX, normalizeSuiObjectId } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Transaction } = require('@mysten/sui/transactions');

// Load game backend .env so PLATFORM_PACKAGE_ID_TESTNET / AQUEDUCT_PLATFORM_PACKAGE_ID_TESTNET are available for Move.toml sync
function loadGameEnv() {
  const envPath = path.join(__dirname, '..', '..', 'backend', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!process.env[key]) {
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}
loadGameEnv();

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
  let moveTomlRestore = null;
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
    
    // Step 2: Check for existing UpgradeCap
    const upgradeCapFile = path.join(__dirname, 'UPGRADE_CAP.json');
    let existingUpgradeCap = null;
    let originalPackageId = null;
    let isUpgrade = false;
    
    if (fs.existsSync(upgradeCapFile)) {
      try {
        const upgradeCapData = JSON.parse(fs.readFileSync(upgradeCapFile, 'utf8'));
        existingUpgradeCap = normalizeSuiObjectId(upgradeCapData.upgradeCapId);
        originalPackageId = normalizeSuiObjectId(upgradeCapData.packageId);
        console.log('✅ Found existing UpgradeCap');
        console.log('   UpgradeCap ID:', existingUpgradeCap);
        console.log('   Original Package ID:', originalPackageId);
        isUpgrade = true;
      } catch (error) {
        console.log('   ⚠️  Could not read UpgradeCap file, will try on-chain discovery');
      }
    }
    if (!isUpgrade) {
      const moveTomlPath = path.join(__dirname, 'Move.toml');
      if (fs.existsSync(moveTomlPath)) {
        const moveToml = fs.readFileSync(moveTomlPath, 'utf8');
        const match = moveToml.match(/suitwo_game\s*=\s*"([^"]+)"/);
        const packageIdFromToml = match ? normalizeSuiObjectId(match[1]) : null;
        if (packageIdFromToml && packageIdFromToml !== '0x0' && packageIdFromToml !== '0') {
          const normalize = (id) => String(id).toLowerCase().replace(/^0x/, '');
          const targetId = normalize(packageIdFromToml);
          try {
            const owned = await client.getOwnedObjects({
              owner: address,
              filter: { StructType: '0x2::package::UpgradeCap' },
              options: { showContent: true },
            });
            for (const obj of owned.data || []) {
              const content = obj.data?.content;
              if (content?.dataType === 'moveObject' && content.fields?.package) {
                const capPkg = normalize(content.fields.package?.id ?? content.fields.package);
                if (capPkg === targetId) {
                  existingUpgradeCap = obj.data.objectId;
                  originalPackageId = packageIdFromToml;
                  isUpgrade = true;
                  console.log('✅ Discovered UpgradeCap on-chain for package', packageIdFromToml);
                  fs.writeFileSync(upgradeCapFile, JSON.stringify({
                    upgradeCapId: existingUpgradeCap,
                    packageId: originalPackageId,
                    network: 'testnet',
                    discoveredAt: new Date().toISOString(),
                  }, null, 2));
                  break;
                }
              }
            }
          } catch (e) {
            console.log('   ⚠️  On-chain discovery failed:', e.message);
          }
        }
      }
      if (!isUpgrade) console.log('   Will do fresh publish (no UpgradeCap file or on-chain match)');
    }

    // Sync platform package ID from .env to Move.toml so build uses correct dependency (single source of truth)
    const moveTomlPath = path.join(__dirname, 'Move.toml');
    const platformFromEnv = process.env.AQUEDUCT_PLATFORM_PACKAGE_ID_TESTNET || process.env.PLATFORM_PACKAGE_ID_TESTNET;
    if (platformFromEnv && platformFromEnv.trim() !== '' && platformFromEnv !== '0x0' && fs.existsSync(moveTomlPath)) {
      let moveTomlContent = fs.readFileSync(moveTomlPath, 'utf8');
      const platformMatch = moveTomlContent.match(/aqueduct_platform\s*=\s*"([^"]+)"/);
      const currentInToml = platformMatch ? platformMatch[1] : '';
      if (currentInToml !== platformFromEnv.trim()) {
        moveTomlContent = moveTomlContent.replace(
          /(aqueduct_platform\s*=\s*)"[^"]+"/,
          '$1"' + platformFromEnv.trim() + '"'
        );
        fs.writeFileSync(moveTomlPath, moveTomlContent);
        console.log('\n✅ Platform package ID from .env; synced to Move.toml for build.');
      }
    }

    // Step 3: Build contract
    console.log('\n🔨 Step 3: Building contract...');
    // Fresh publish requires package built with address 0x0 (PublishErrorNonZeroAddress otherwise)
    if (!isUpgrade) {
      let moveTomlContent = fs.readFileSync(moveTomlPath, 'utf8');
      moveTomlRestore = moveTomlContent;
      moveTomlContent = moveTomlContent.replace(
        /(suitwo_game\s*=\s*)"[^"]+"/,
        (_, prefix) => `${prefix}"0x0"`
      );
      if (moveTomlContent !== moveTomlRestore) {
        fs.writeFileSync(moveTomlPath, moveTomlContent);
        console.log('   Set package address to 0x0 in Move.toml for fresh publish');
      }
    }
    const buildDir = path.join(__dirname, 'build');
    if (fs.existsSync(buildDir)) {
      try {
        fs.rmSync(buildDir, { recursive: true, maxRetries: 3 });
        console.log('   Cleaned previous build directory');
      } catch (cleanErr) {
        const isPerm = /EPERM|operation not permitted|Access is denied/i.test(cleanErr.message || '');
        console.warn('   ⚠️  Could not clean build dir (will build over):', cleanErr.message);
        if (isPerm) {
          console.warn('   💡 Cursor\'s terminal may be blocking file access. Run from an external PowerShell/CMD:');
          console.warn('      cd "' + __dirname + '"');
          console.warn('      node deploy.js');
        }
      }
    }
    // Use a config dir for build so we don't read corrupted global client.yaml (e.g. EOF)
    // Prefer LOCALAPPDATA\SuiUpgrade (used by run-upgrade.ps1) if it has client.yaml; else .sui_upgrade_cli
    const buildConfigDir =
      (process.env.LOCALAPPDATA && fs.existsSync(path.join(process.env.LOCALAPPDATA, 'SuiUpgrade', 'client.yaml')))
        ? path.join(process.env.LOCALAPPDATA, 'SuiUpgrade')
        : path.join(__dirname, '.sui_upgrade_cli');
    const buildEnv = { ...process.env, SUI_CONFIG_DIR: buildConfigDir };
    try {
      execSync('sui move build', { 
        cwd: __dirname, 
        stdio: 'inherit',
        shell: true,
        timeout: 600000,  // 10 min (first build can fetch Sui framework from git)
        env: buildEnv,
      });
      console.log('✅ Contract built successfully');
    } catch (error) {
      console.error('❌ Build failed');
      if (/Access is denied|os error 5/i.test(error.message || '')) {
        console.error('\n💡 Cursor\'s integrated terminal often blocks the Sui build (build/locks). Run from *outside* Cursor:');
        console.error('   Open PowerShell or CMD from the Start menu, then:');
        console.error('   cd "' + __dirname + '"');
        console.error('   node deploy.js');
      }
      throw error;
    }
    
    // Step 4: Publish or Upgrade package
    if (isUpgrade) {
      console.log('\n🔄 Step 4: Upgrading game package...');
      console.log('   💡 If SDK upgrade fails, run .\\run-upgrade.ps1 from PowerShell (outside Cursor)');
    } else {
      console.log('\n📦 Step 4: Publishing game package (first deployment)...');
    }
    const buildPath = path.join(__dirname, 'build', 'suitwo_game');
    const modulesDir = path.join(buildPath, 'bytecode_modules');
    
    if (!fs.existsSync(modulesDir)) {
      throw new Error(`Build directory not found: ${modulesDir}`);
    }
    
    // MVP: package may contain only mews; include all non-dependency .mv modules
    const modules = fs.readdirSync(modulesDir)
      .filter(f => f.endsWith('.mv') && !f.includes('dependencies'))
      .map(f => fs.readFileSync(path.join(modulesDir, f)));
    
    console.log(`   Found ${modules.length} module(s) to publish`);
    
    const txb = new Transaction();
    const moduleBytes = modules.map(m => new Uint8Array(m));
    
    // Get platform package ID from environment or use current deployed platform package
    const platformPackageId = process.env.PLATFORM_PACKAGE_ID_TESTNET || process.env.PLATFORM_PACKAGE_ID || '0xf5e7f3b3ad9ec17b06e2e4c192bcaadd382bb7b6702782745a8942613fd31816';
    
    const frameworkDependencies = [
      '0x0000000000000000000000000000000000000000000000000000000000000001', // MoveStdlib
      '0x0000000000000000000000000000000000000000000000000000000000000002', // Sui
      platformPackageId, // Platform package (game_pass, terminal_store, events)
    ];
    
    let publishResult;
    let upgradeCapId = null;
    
    if (isUpgrade) {
      // Upgrade path: Use SDK with digest/modules/deps coming from `sui move build --dump-bytecode-as-base64`
      // This is the only "proper" way to be 100% aligned with Sui's compiler + digest rules.
      console.log('   Upgrading package using Sui SDK (this may take 1-2 minutes)...');
      console.log('   UpgradeCap:', existingUpgradeCap);
      console.log('   Original Package ID:', originalPackageId);
      
      const moveTomlPath = path.join(__dirname, 'Move.toml');
      let moveTomlRestore = null; // content to restore on exit/failure
      try {
        const policy = 0; // COMPATIBLE

        // Sui requires upgrade bytecode to be built with the package's own address as 0x0
        // (PublishErrorNonZeroAddress otherwise). Temporarily set suitwo_game = "0x0", build, then restore.
        console.log('   Setting package address to 0x0 in Move.toml for upgrade build...');
        let moveTomlContent = fs.readFileSync(moveTomlPath, 'utf8');
        moveTomlRestore = moveTomlContent;
        moveTomlContent = moveTomlContent.replace(
          /(suitwo_game\s*=\s*)"[^"]+"/,
          (_, prefix) => `${prefix}"0x0"`
        );
        if (moveTomlContent === moveTomlRestore) {
          throw new Error('Move.toml: could not find suitwo_game address line to set 0x0');
        }
        fs.writeFileSync(moveTomlPath, moveTomlContent);

        console.log('   Building package with Sui CLI to get digest/modules/deps...');
        // Use spawnSync so we still get stdout when build exits with 1 (e.g. linter warnings).
        // Use same config dir as initial build to avoid broken/corrupt client.yaml in project dir.
        const upgradeBuildConfigDir =
          (process.env.LOCALAPPDATA && fs.existsSync(path.join(process.env.LOCALAPPDATA, 'SuiUpgrade', 'client.yaml')))
            ? path.join(process.env.LOCALAPPDATA, 'SuiUpgrade')
            : path.join(__dirname, '.sui_upgrade_cli');
        const buildEnv = { ...process.env, SUI_CONFIG_DIR: upgradeBuildConfigDir };
        const buildResult = spawnSync('sui', ['move', 'build', '--dump-bytecode-as-base64', '--path', '.'], {
          cwd: __dirname,
          encoding: 'utf-8',
          shell: true,
          timeout: 600000,
          maxBuffer: 50 * 1024 * 1024,
          env: buildEnv,
        });
        const buildOut = (buildResult.stdout || '') + (buildResult.stderr || '');

        // The build output contains warnings + a JSON line: {"modules":[...],"dependencies":[...],"digest":[...]}
        const jsonMatch = buildOut.match(/\{\"modules\":\[.*\],\"dependencies\":\[.*\],\"digest\":\[.*\]\}/);
        if (!jsonMatch) {
          throw new Error(
            `Could not find build JSON in sui move build output. (Output tail: ${buildOut.slice(-500)})`
          );
        }

        const buildJson = JSON.parse(jsonMatch[0]);
        const packageDigest = buildJson.digest;
        const depsRaw = buildJson.dependencies;
        const modulesBase64 = buildJson.modules; // Keep as base64 strings for upgrade (SDK accepts string[] or number[][])

        if (!Array.isArray(packageDigest) || packageDigest.length !== 32) {
          throw new Error(`Invalid digest from build output (len=${packageDigest?.length})`);
        }
        if (!Array.isArray(depsRaw) || depsRaw.length === 0) {
          throw new Error('Invalid dependencies from build output');
        }
        if (!Array.isArray(modulesBase64) || modulesBase64.length === 0) {
          throw new Error('Invalid modules from build output');
        }

        // Normalize all dependency IDs (chain can reject non-normalized addresses)
        const depsForUpgrade = depsRaw.map((d) => normalizeSuiObjectId(d));
        const packageIdForUpgrade = normalizeSuiObjectId(originalPackageId);

        console.log(
          `   ✅ Build produced ${modulesBase64.length} modules, ${depsForUpgrade.length} deps, digest=${Buffer.from(
            packageDigest
          ).toString('hex')}`
        );
        console.log('   Package ID for upgrade:', packageIdForUpgrade);

        console.log('   Building upgrade transaction (authorize + upgrade + commit)...');
        const upgradeTx = new Transaction();
        const upgradeCapObj = upgradeTx.object(existingUpgradeCap);

        const upgradeTicket = upgradeTx.moveCall({
          target: '0x2::package::authorize_upgrade',
          arguments: [
            upgradeCapObj,
            upgradeTx.pure.u8(policy),
            upgradeTx.pure.vector('u8', packageDigest),
          ],
        });

        // Pass modules as base64 strings (SDK serializes same way; avoids any Uint8Array edge case)
        const [upgradeReceipt] = upgradeTx.upgrade({
          modules: modulesBase64,
          dependencies: depsForUpgrade,
          package: packageIdForUpgrade,
          ticket: upgradeTicket,
        });

        upgradeTx.moveCall({
          target: '0x2::package::commit_upgrade',
          arguments: [upgradeCapObj, upgradeReceipt],
        });

        upgradeTx.setGasBudget(500_000_000); // Higher budget for game package

        console.log('   Executing upgrade transaction...');

        publishResult = await retryOperation(
          async () => {
            return await client.signAndExecuteTransaction({
              signer: keypair,
              transaction: upgradeTx,
              options: {
                showEffects: true,
                showEvents: true,
                showObjectChanges: true,
              },
            });
          },
          3,
          5000,
          'Package upgrade'
        );

        // Upgrade tx may succeed on-chain while RPC returns error in effects (confirmation quirk).
        // If effects say failed, re-fetch the tx by digest with retries (node can return stale failure).
        if (publishResult.effects?.status?.status !== 'success') {
          const digest = publishResult.digest;
          if (digest) {
            console.log('   ⚠️  RPC reported non-success; confirming on-chain status for digest:', digest);
            let confirmed = false;
            const delays = [5000, 8000, 12000];
            for (let attempt = 0; attempt <= delays.length && !confirmed; attempt++) {
              if (attempt > 0) {
                console.log(`   Retry ${attempt}/${delays.length} in ${delays[attempt - 1] / 1000}s...`);
                await sleep(delays[attempt - 1]);
              } else {
                await sleep(3000);
              }
              try {
                const txDetails = await client.getTransactionBlock({
                  digest,
                  options: { showEffects: true, showObjectChanges: true },
                });
                const ok = txDetails.effects?.status?.status === 'success';
                if (ok) {
                  console.log('   ✅ On-chain confirmation: upgrade succeeded');
                  publishResult = {
                    ...publishResult,
                    effects: {
                      ...(txDetails.effects || {}),
                      objectChanges: txDetails.effects?.objectChanges ?? txDetails.objectChanges ?? publishResult.effects?.objectChanges,
                    },
                  };
                  confirmed = true;
                }
              } catch (_) {}
            }
            if (!confirmed) {
              throw new Error(`Upgrade failed: ${publishResult.effects?.status?.error || 'Unknown error'}`);
            }
          } else {
            throw new Error(`Upgrade failed: ${publishResult.effects?.status?.error || 'Unknown error'}`);
          }
        } else {
          console.log('   ✅ Upgrade completed successfully');
        }
        console.log('   Transaction Digest:', publishResult.digest);
        
        upgradeCapId = existingUpgradeCap; // Keep the same UpgradeCap
      
      } catch (error) {
        console.error('   ❌ SDK upgrade failed:', error.message);
        console.error('\n   📋 Run the upgrade from PowerShell (outside Cursor):');
        console.error(`      cd "${__dirname}"`);
        console.error(`      .\\run-upgrade.ps1`);
        console.error('   Upgrade Sui CLI to 1.64.x to match testnet: choco upgrade sui -y');
        throw new Error(`Upgrade failed: ${error.message}`);
      } finally {
        if (moveTomlRestore != null) {
          try {
            fs.writeFileSync(moveTomlPath, moveTomlRestore);
            console.log('   Restored Move.toml package address.');
          } catch (e) {
            console.warn('   ⚠️  Could not restore Move.toml:', e.message);
          }
        }
      }
      
    } else {
      // Fresh publish path
      const [upgradeCap] = txb.publish({
        modules: moduleBytes,
        dependencies: frameworkDependencies,
      });
      
      txb.transferObjects([upgradeCap], address);
      txb.setGasBudget(500_000_000); // Increased for large package deployment
      
      console.log('   Publishing to testnet (this may take 1-2 minutes)...');
      
      // Publish with retry
      publishResult = await retryOperation(
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
    }
    
    if (publishResult.effects?.status?.status !== 'success') {
      throw new Error(`${isUpgrade ? 'Upgrade' : 'Publish'} failed: ${publishResult.effects?.status?.error || 'Unknown error'}`);
    }
    
    console.log(`✅ Game package ${isUpgrade ? 'upgraded' : 'published'} successfully`);
    console.log('   Transaction Digest:', publishResult.digest);
    
    // Extract package ID and objects from publish/upgrade transaction
    // NOTE: Terminal (TerminalStore) and GamePassSystem come from the platform package deployment, not this game package
    let packageId = isUpgrade ? originalPackageId : null; // For upgrades, use original package ID
    let newPackageId = null; // For upgrades, this will be the new version ID
    let sessionRegistryObjectId = null;
    let statisticsRegistryObjectId = null;
    let itemCatalogRegistryObjectId = null;
    let itemCatalogAdminCapId = null;
    let gameConfigRegistryObjectId = null;
    let gameConfigAdminCapId = null;
    let tournamentRegistryObjectId = null;
    let badgePublisherObjectId = null;
    let achievementRegistryObjectId = null;
    
    if (publishResult.effects?.objectChanges) {
      for (const change of publishResult.effects.objectChanges) {
        if (change.type === 'published') {
          if (isUpgrade) {
            newPackageId = change.packageId; // New version ID for upgrades
          } else {
            packageId = change.packageId;
          }
        }
        if (change.type === 'created' && change.objectType) {
          // Extract UpgradeCap ID (only on fresh publish)
          if (!isUpgrade && change.objectType.includes('UpgradeCap')) {
            upgradeCapId = change.objectId;
          }
          if (change.objectType.includes('SessionRegistry')) {
            sessionRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('StatisticsRegistry')) {
            statisticsRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('ItemCatalogRegistry')) {
            itemCatalogRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('GameConfigRegistry')) {
            gameConfigRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('TournamentRegistry')) {
            tournamentRegistryObjectId = change.objectId;
          }
          if (change.objectType.includes('Publisher')) {
            badgePublisherObjectId = change.objectId;
          }
          if (change.objectType.includes('AchievementRegistry')) {
            achievementRegistryObjectId = change.objectId;
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
    
    // If package ID or (for multi-module) session/statistics not found, query the transaction directly
    const needQuery = !packageId || (!sessionRegistryObjectId && !statisticsRegistryObjectId && !upgradeCapId);
    if (needQuery) {
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
            if (!isUpgrade && objectType.includes('UpgradeCap')) {
              upgradeCapId = change.objectId;
            }
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
            if (objectType.includes('ItemCatalogRegistry')) {
              itemCatalogRegistryObjectId = change.objectId;
            }
            if (objectType.includes('GameConfigRegistry')) {
              gameConfigRegistryObjectId = change.objectId;
            }
            if (objectType.includes('TournamentRegistry')) {
              tournamentRegistryObjectId = change.objectId;
            }
            if (objectType.includes('Publisher') && objectType.includes('badge')) {
              badgePublisherObjectId = change.objectId;
            }
            if (objectType.includes('AchievementRegistry')) {
              achievementRegistryObjectId = change.objectId;
            }
          }
        }
      }
    }
    
    // For upgrades, if we didn't get upgradeCapId from tx, find the one for this package
    if (isUpgrade && !upgradeCapId && originalPackageId) {
      const normalize = (id) => String(normalizeSuiObjectId(id)).toLowerCase().replace(/^0x/, '');
      const targetId = normalize(originalPackageId);
      const ownedObjects = await client.getOwnedObjects({
        owner: address,
        filter: { StructType: '0x2::package::UpgradeCap' },
        options: { showContent: true },
      });
      for (const obj of ownedObjects.data || []) {
        const content = obj.data?.content;
        if (content?.dataType === 'moveObject' && content.fields?.package) {
          const capPkg = normalize(content.fields.package?.id ?? content.fields.package);
          if (capPkg === targetId) {
            upgradeCapId = obj.data.objectId;
            break;
          }
        }
      }
    }
    
    if (!isUpgrade && !packageId) {
      console.error('   ❌ Could not extract package ID. Transaction details:');
      console.error(JSON.stringify(publishResult, null, 2));
      throw new Error('Package ID not found in publish transaction');
    }
    
    // Save UpgradeCap for future upgrades
    if (upgradeCapId && !isUpgrade) {
      const upgradeCapData = {
        upgradeCapId,
        packageId: packageId,
        network: 'testnet',
        deployedAt: new Date().toISOString(),
      };
      fs.writeFileSync(upgradeCapFile, JSON.stringify(upgradeCapData, null, 2));
      console.log('   💾 UpgradeCap saved for future upgrades');
    } else if (isUpgrade && upgradeCapId) {
      // Update the upgrade cap file with new version info
      const upgradeCapData = {
        upgradeCapId,
        packageId: originalPackageId, // Keep original package ID
        newPackageId: newPackageId, // Track new version
        network: 'testnet',
        lastUpgradedAt: new Date().toISOString(),
      };
      fs.writeFileSync(upgradeCapFile, JSON.stringify(upgradeCapData, null, 2));
      console.log('   💾 UpgradeCap updated');
    }
    
    console.log(`\n📋 Extracted from ${isUpgrade ? 'upgrade' : 'publish'} transaction:`);
    if (isUpgrade) {
      console.log('   📦 Original Package ID:', originalPackageId);
      console.log('   📦 New Version Package ID:', newPackageId || 'SAME (upgrade in progress)');
      console.log('   🔑 UpgradeCap ID:', upgradeCapId || 'NOT FOUND');
    } else {
      console.log('   📦 Package ID:', packageId);
      console.log('   🔑 UpgradeCap ID:', upgradeCapId || 'NOT FOUND');
    }
    if (sessionRegistryObjectId) console.log('   🆔 Session Registry:', sessionRegistryObjectId);
    if (statisticsRegistryObjectId) console.log('   📊 Statistics Registry:', statisticsRegistryObjectId);
    if (itemCatalogRegistryObjectId) console.log('   📦 Item Catalog Registry:', itemCatalogRegistryObjectId);
    if (gameConfigRegistryObjectId) console.log('   ⚙️  Game Config Registry:', gameConfigRegistryObjectId);
    if (tournamentRegistryObjectId) console.log('   🏆 Tournament Registry:', tournamentRegistryObjectId);
    if (badgePublisherObjectId) console.log('   🏅 Badge Publisher:', badgePublisherObjectId);
    if (achievementRegistryObjectId) console.log('   🎯 Achievement Registry:', achievementRegistryObjectId);
    console.log('\n   ℹ️  NOTE: Platform objects (Terminal, GamePassSystem) come from platform package deployment');
    console.log('      Set PLATFORM_PACKAGE_ID, PREMIUM_STORE_OBJECT_ID, GAME_PASS_SYSTEM_OBJECT_ID in your .env file');
    
    // Game package is mews-only (badge, game config, item catalog are platform-only; no game init steps).
    const isMewsOnly = !isUpgrade && modules.length === 1;
    if (isMewsOnly) {
      console.log('\n   Game package (MEWS only). Badge, game config, and store catalog are on platform.');
      console.log('\n✅ Game package deployment complete.');
      console.log('   📦 Package ID:', packageId);
      if (upgradeCapId) console.log('   🔑 UpgradeCap:', upgradeCapId);
      console.log('   Set MEWS_PACKAGE_ID_TESTNET=' + packageId);
      if (moveTomlRestore) {
        try {
          fs.writeFileSync(moveTomlPath, moveTomlRestore);
          console.log('   Restored Move.toml package address.');
        } catch (e) {
          console.warn('   Could not restore Move.toml:', e.message);
        }
      }
      return {
        packageId,
        upgradeCapId,
        sessionRegistryObjectId,
        statisticsRegistryObjectId,
        publishDigest: publishResult.digest,
        deployedAt: new Date().toISOString(),
      };
    }

    // Legacy path: package had multiple modules (e.g. upgrade from older deploy). No init for platform-only modules.
    await sleep(3000);

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
    
    // Terminal Admin Cap
    console.log('   Creating Terminal Admin Capability...');
    const storeAdminTx = new Transaction();
    storeAdminTx.moveCall({
      target: `${packageId}::terminal_store::create_admin_capability`,
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
      console.log('   ✅ Terminal Admin Cap:', storeAdminCapId);
    } else {
      console.warn('   ⚠️  Terminal Admin Cap not found');
    }
    
    await sleep(2000);
    
    // Tournament admin cap is on platform (platform::station). Game package no longer has tournaments module.
    console.log('   Skipping Tournament Admin Cap (tournaments are platform-provided; see TOURNAMENTS_PLATFORM_ONLY.md)');
    let tournamentAdminCapId = null;
    const tournamentAdminResult = { effects: { status: { status: 'success' } } };
    if (false) {
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
      console.warn('   ⚠️  Tournament Admin Cap: use platform (see TOURNAMENTS_PLATFORM_ONLY.md)');
    }
    
    await sleep(2000);
    
    // Step 9: Extract Item Catalog Registry (auto-initialized via init())
    console.log('\n📦 Step 9: Extracting Item Catalog Registry...');
    
    // Item Catalog Registry is auto-initialized via init() function, so check the publish transaction
    if (publishResult.effects?.objectChanges) {
      for (const change of publishResult.effects.objectChanges) {
        if (change.type === 'created' && change.objectType?.includes('ItemCatalogRegistry')) {
          itemCatalogRegistryObjectId = change.objectId;
        }
      }
    }
    
    // If not found, query the publish transaction directly
    if (!itemCatalogRegistryObjectId) {
      console.log('   ⚠️  Item Catalog Registry not in effects, querying transaction...');
      await sleep(3000);
      const itemCatalogTxDetails = await retryOperation(
        async () => await client.getTransactionBlock({
          digest: publishResult.digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        }),
        3,
        3000,
        'Item Catalog Registry transaction query'
      );
      
      if (itemCatalogTxDetails.objectChanges) {
        for (const change of itemCatalogTxDetails.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('ItemCatalogRegistry')) {
            itemCatalogRegistryObjectId = change.objectId;
          }
        }
      }
    }
    
    if (!itemCatalogRegistryObjectId) {
      console.warn('   ⚠️  Item Catalog Registry object ID not found in transaction');
      console.warn('   Transaction digest:', publishResult.digest);
      console.warn('   You may need to extract it manually from Sui Explorer');
      console.warn('   Continuing with deployment...');
    }
    
    if (itemCatalogRegistryObjectId) {
      console.log('✅ Item Catalog Registry found');
      console.log('   📦 Item Catalog Registry:', itemCatalogRegistryObjectId);
    } else {
      console.log('⚠️  Item Catalog Registry not found');
      console.log('   Check transaction:', publishResult.digest);
    }
    
    await sleep(2000);
    
    // Item catalog and game config are platform-only (store/catalog, app-config). No game package init.

    // Final Summary
    console.log('\n═══════════════════════════════════════');
    console.log('✅ DEPLOYMENT COMPLETE!');
    console.log('═══════════════════════════════════════\n');
    
    console.log('📋 DEPLOYMENT SUMMARY:');
    if (isUpgrade) {
      console.log('   📦 Original Package ID:', originalPackageId);
      console.log('   📦 New Version Package ID:', newPackageId || 'SAME');
      console.log('   🔑 UpgradeCap ID:', upgradeCapId || 'NOT FOUND');
      console.log('   ✅ Package upgraded - shared objects persist with same IDs');
    } else {
      console.log('   📦 Package ID:', packageId);
      console.log('   🔑 UpgradeCap ID:', upgradeCapId || 'NOT FOUND');
    }
    console.log('   🆔 Session Registry:', sessionRegistryObjectId || 'NOT FOUND');
    console.log('   📊 Statistics Registry:', statisticsRegistryObjectId || 'NOT FOUND');
    console.log('   🏆 Tournament Registry:', tournamentRegistryObjectId || 'NOT FOUND');
    console.log('\n   ℹ️  Badge, game config, store catalog: platform-only (Shipyard, Helm, Terminal).');
    console.log('   ℹ️  Platform: PLATFORM_PACKAGE_ID, PREMIUM_STORE_OBJECT_ID, GAME_PASS_SYSTEM_OBJECT_ID in .env');
    console.log('   🏆 Achievement Registry:', achievementRegistryObjectId || 'NOT FOUND');
    console.log('   🔐 Achievement Admin Cap:', achievementAdminCapId || 'NOT FOUND');
    console.log('   🔐 Score Admin Cap:', scoreAdminCapId || 'NOT FOUND');
    console.log('   🔐 Store Admin Cap:', storeAdminCapId || 'NOT FOUND');
    console.log('   🔐 Tournament Admin Cap:', tournamentAdminCapId || 'NOT FOUND');
    
    console.log('\n🔗 View on Sui Explorer:');
    console.log(`   Package: https://suiexplorer.com/object/${packageId}?network=testnet`);
    console.log(`   Publish TX: https://suiexplorer.com/txblock/${publishResult.digest}?network=testnet`);
    
    // Step 13: Run initialization scripts
    console.log('\n🚀 Step 13: Running initialization scripts...');
    console.log('═══════════════════════════════════════\n');
    
    // Set environment variables for initialization scripts
    const initEnv = {
      ...process.env,
      GAME_SCORE_CONTRACT_TESTNET: packageId,
      GAME_CONFIG_REGISTRY_ID_TESTNET: gameConfigRegistryObjectId,
      GAME_CONFIG_ADMIN_CAP_ID_TESTNET: gameConfigAdminCapId,
      ITEM_CATALOG_REGISTRY_ID_TESTNET: itemCatalogRegistryObjectId,
      ITEM_CATALOG_ADMIN_CAP_ID_TESTNET: itemCatalogAdminCapId,
      ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET: achievementRegistryObjectId,
      ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET: achievementAdminCapId,
    };
    
    // Run game config initialization
    if (gameConfigRegistryObjectId && gameConfigAdminCapId) {
      console.log('📦 Initializing Game Config...');
      try {
        execSync('node migrate-game-config.js', {
          cwd: __dirname,
          env: initEnv,
          stdio: 'inherit',
          shell: true,
          timeout: 120000
        });
        console.log('✅ Game Config initialized\n');
      } catch (error) {
        console.warn('⚠️  Game Config initialization failed:', error.message);
        console.warn('   You can run it manually later: node migrate-game-config.js\n');
      }
    } else {
      console.warn('⚠️  Skipping Game Config initialization (registry or admin cap not found)\n');
    }
    
    // Run item catalog initialization
    if (itemCatalogRegistryObjectId && itemCatalogAdminCapId) {
      console.log('📦 Initializing Item Catalog...');
      try {
        execSync('node migrate-item-catalog.js', {
          cwd: __dirname,
          env: initEnv,
          stdio: 'inherit',
          shell: true,
          timeout: 120000
        });
        console.log('✅ Item Catalog initialized\n');
      } catch (error) {
        console.warn('⚠️  Item Catalog initialization failed:', error.message);
        console.warn('   You can run it manually later: node migrate-item-catalog.js\n');
      }
    } else {
      console.warn('⚠️  Skipping Item Catalog initialization (registry or admin cap not found)\n');
    }
    
    // Run milestone initialization
    if (achievementRegistryObjectId && achievementAdminCapId) {
      console.log('🏆 Initializing Milestones...');
      try {
        const backendScriptsPath = path.resolve(__dirname, '../../backend/scripts');
        execSync('npx tsx migrate-milestones.ts', {
          cwd: backendScriptsPath,
          env: initEnv,
          stdio: 'inherit',
          shell: true,
          timeout: 300000 // 5 minutes for milestones (can take longer)
        });
        console.log('✅ Milestones initialized\n');
      } catch (error) {
        console.warn('⚠️  Milestone initialization failed:', error.message);
        console.warn('   You can run it manually later: cd backend && npx tsx scripts/migrate-milestones.ts\n');
      }
    } else {
      console.warn('⚠️  Skipping Milestone initialization (registry or admin cap not found)\n');
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✅ ALL INITIALIZATIONS COMPLETE!');
    console.log('═══════════════════════════════════════\n');
    
    console.log('\n⚠️  NEXT STEPS:');
    if (isUpgrade) {
      console.log('   ✅ Package upgraded - shared objects persist with same IDs');
      console.log('   ℹ️  No need to update .env files (object IDs stay the same)');
      console.log('   ℹ️  Backend will automatically use the latest package version');
      console.log('\n💡 TIP: For future upgrades, just run this script again - it will automatically detect and use the UpgradeCap!');
    } else {
      console.log('   1. Update backend/.env.local with the new IDs above');
      console.log('   2. Update apps/shooter-game/contracts/suitwo_game/DEPLOYMENT_IDS.md');
      console.log('   3. Restart your backend server');
      console.log('\n💡 TIP: UpgradeCap saved! For future upgrades, just run this script again.');
    }
    if (moveTomlRestore) {
      try {
        fs.writeFileSync(moveTomlPath, moveTomlRestore);
        console.log('   Restored Move.toml package address.');
      } catch (e) {
        console.warn('   Could not restore Move.toml:', e.message);
      }
    }
    return {
      packageId: isUpgrade ? originalPackageId : packageId,
      newPackageId: isUpgrade ? newPackageId : null,
      upgradeCapId,
      isUpgrade,
      sessionRegistryObjectId,
      statisticsRegistryObjectId,
      tournamentRegistryObjectId,
      badgeRegistryObjectId,
      badgePublisherObjectId,
      badgeDisplayObjectId,
      achievementRegistryObjectId,
      achievementAdminCapId,
      scoreAdminCapId,
      storeAdminCapId,
      tournamentAdminCapId,
      itemCatalogRegistryObjectId,
      itemCatalogAdminCapId,
      gameConfigRegistryObjectId,
      gameConfigAdminCapId,
      publishDigest: publishResult.digest,
      deployedAt: new Date().toISOString(),
      // Platform objects come from platform package deployment
      // Set PLATFORM_PACKAGE_ID, PREMIUM_STORE_OBJECT_ID, GAME_PASS_SYSTEM_OBJECT_ID in .env
    };
    
  } catch (error) {
    if (moveTomlRestore) {
      try {
        fs.writeFileSync(moveTomlPath, moveTomlRestore);
      } catch (e) {}
    }
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

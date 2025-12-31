/**
 * Find which old contract packages actually contain Inventory, Stats, and Game Pass data
 * This script checks multiple historical package IDs to identify the correct OLD_ values
 * 
 * Usage:
 *   node backend/scripts/find-old-contracts-with-data.js
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

// Historical package IDs from DEPLOYMENT_IDS.md (newest to oldest)
const HISTORICAL_PACKAGES = [
  { id: '0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c', date: '2025-12-30', name: 'Current' },
  { id: '0xea5767f2e72096e637f2f64175aa8931c6cd3fde3dc7cc450dc9399ec1daf4c6', date: '2025-12-30', name: 'Previous 2025-12-30 (CHECK THIS FIRST)' },
  { id: '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352', date: '2025-12-23', name: '2025-12-23 (CHECK THIS SECOND)' },
  { id: '0x7406dc825f706a249e72b087bd971889a54b7a4f37a372827ad83bfce1c88e49', date: '2025-12-30', name: 'Earlier 2025-12-30' },
  { id: '0x987bfff631bbbda273e7c5adb472cb9500252171768ac38cecc51d643753b4d5', date: '2025-12-30', name: 'Earlier 2025-12-30' },
  { id: '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352', date: '2025-12-23', name: '2025-12-23' },
  { id: '0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0', date: '2025-12-22', name: '2025-12-22' },
  { id: '0x09b63ced8a7af6aaf620e8baba1c5d8840524eb1767cca70b679c1a6961d1b08', date: '2025-12-21', name: '2025-12-21' },
  { id: '0x7b88de48e0c2d699da4fe6180c91b7ff229b222115f851bff3092888da38cd7e', date: '2025-12-21', name: '2025-12-21 (2)' },
  { id: '0x25b5142a89b49e973b983c7de0f808078f2e0ba7b1b4bba0def6eca6ebfa0d3a', date: '2025-12-17', name: '2025-12-17' },
  { id: '0xd7f7faf4aaf1ab2326e9550adaeba0b47e3ecb4939e211ecfa07b4edc1aea722', date: '2025-12-17', name: '2025-12-17 (2)' },
  { id: '0x8053eb09104f372b2d48591168a951819ddd13e208b29077b9c79989fe646650', date: '2025-12-16', name: '2025-12-16' },
  { id: '0x6a2d1d8c86b9cf0e7d0c669c1f544723f2102fcb0312e64936c6d6135d9e83ec', date: '2025-12-09', name: '2025-12-09' },
  { id: '0xa0763684543959c4965870d531a09ce2ea621e6e7e8e1b88e7d6ca26a36dd82a', date: '2025-12-09', name: '2025-12-09 (2)' },
  { id: '0xc99f61a5d10c48896ff5463099a72e096a73fb7758f34a607ff97b3144a3999b', date: '2025-12-09', name: '2025-12-09 (3)' },
  { id: '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b', date: '2025-11-23', name: '2025-11-23 (Complete Badge System)' },
];

// Known object IDs from different deployments (we'll try to find them)
// These are from DEPLOYMENT_IDS.md notes
const KNOWN_OBJECTS = {
  '2025-12-17': {
    statsRegistry: '0xd9738d034cc964bd6f5193650118272c2da3d72631c598aaa70b57a0cdccc23c',
    premiumStore: '0x1c60ee543f1ca3bfc3fabb00e6858d97e94bea631e0e219ece7834e010f470ea',
    gamePassSystem: '0xdca6db05f3b72327a28e3d25a08eb91d6519575836dcfb87f22cd2370d62f007',
  },
  '2025-12-23': {
    statsRegistry: null, // Need to find
    premiumStore: null,
    gamePassSystem: null,
  },
};

async function checkObjectExists(objectId) {
  try {
    const obj = await client.getObject({
      id: objectId,
      options: { showType: true },
    });
    return obj.data !== null;
  } catch (error) {
    return false;
  }
}

async function countDynamicFields(parentId) {
  try {
    const fields = await client.getDynamicFields({
      parentId: parentId,
      limit: 1000,
    });
    return fields.data.length;
  } catch (error) {
    return -1; // Error
  }
}

async function findObjectsInPackage(packageId, moduleName, structName) {
  try {
    // Try to query for objects created by this package
    const objects = await client.queryObjects({
      filter: {
        StructType: `${packageId}::${moduleName}::${structName}`,
      },
      options: { showType: true },
      limit: 20,
    });
    
    return objects.data.map(obj => ({
      objectId: obj.data?.objectId,
      type: obj.data?.type,
    })).filter(obj => obj.objectId);
  } catch (error) {
    return [];
  }
}

async function checkPackageObjects(packageId, date) {
  const results = {
    premiumStores: [],
    statsRegistries: [],
    gamePassSystems: [],
  };
  
  console.log(`      🔍 Searching for PremiumStore objects...`);
  // Find PremiumStore objects
  try {
    const stores = await findObjectsInPackage(packageId, 'premium_store', 'PremiumStore');
    console.log(`      Found ${stores.length} PremiumStore object(s)`);
    for (const store of stores) {
      const count = await countDynamicFields(store.objectId);
      results.premiumStores.push({ objectId: store.objectId, walletCount: count });
      if (count > 0) {
        console.log(`      ✅ PremiumStore ${store.objectId.substring(0, 20)}... has ${count} wallets`);
      }
    }
  } catch (error) {
    console.log(`      ⚠️  Error finding PremiumStore: ${error.message}`);
  }
  
  console.log(`      🔍 Searching for StatisticsRegistry objects...`);
  // Find StatisticsRegistry objects
  try {
    const registries = await findObjectsInPackage(packageId, 'score_submission', 'StatisticsRegistry');
    console.log(`      Found ${registries.length} StatisticsRegistry object(s)`);
    for (const registry of registries) {
      const count = await countDynamicFields(registry.objectId);
      results.statsRegistries.push({ objectId: registry.objectId, walletCount: count });
      if (count > 0) {
        console.log(`      ✅ StatisticsRegistry ${registry.objectId.substring(0, 20)}... has ${count} wallets`);
      }
    }
  } catch (error) {
    console.log(`      ⚠️  Error finding StatisticsRegistry: ${error.message}`);
  }
  
  console.log(`      🔍 Searching for GamePassSystem objects...`);
  // Find GamePassSystem objects
  try {
    const systems = await findObjectsInPackage(packageId, 'game_pass', 'GamePassSystem');
    console.log(`      Found ${systems.length} GamePassSystem object(s)`);
    for (const system of systems) {
      const count = await countDynamicFields(system.objectId);
      results.gamePassSystems.push({ objectId: system.objectId, walletCount: count });
      if (count > 0) {
        console.log(`      ✅ GamePassSystem ${system.objectId.substring(0, 20)}... has ${count} wallets`);
      }
    }
  } catch (error) {
    console.log(`      ⚠️  Error finding GamePassSystem: ${error.message}`);
  }
  
  return results;
}

async function checkPackageForData(packageInfo) {
  console.log(`\n📦 Checking package: ${packageInfo.name} (${packageInfo.date})`);
  console.log(`   Package ID: ${packageInfo.id.substring(0, 20)}...`);
  
  const results = {
    packageId: packageInfo.id,
    date: packageInfo.date,
    name: packageInfo.name,
    inventory: { found: false, storeId: null, walletCount: 0 },
    stats: { found: false, registryId: null, walletCount: 0 },
    gamePass: { found: false, systemId: null, walletCount: 0 },
  };
  
  // Check known objects from different deployments
  let known = null;
  if (packageInfo.id === '0xea5767f2e72096e637f2f64175aa8931c6cd3fde3dc7cc450dc9399ec1daf4c6') {
    // Previous 2025-12-30 deployment
    known = KNOWN_OBJECTS['2025-12-30'];
  } else if (packageInfo.id === '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352') {
    // 2025-12-23 deployment
    known = KNOWN_OBJECTS['2025-12-23'];
  } else if (packageInfo.date === '2025-12-17' || packageInfo.id === '0x25b5142a89b49e973b983c7de0f808078f2e0ba7b1b4bba0def6eca6ebfa0d3a') {
    known = KNOWN_OBJECTS['2025-12-17'];
  }
  
  if (known) {
    
    // Check Stats Registry
    if (known.statsRegistry) {
      console.log(`   🔍 Checking Stats Registry: ${known.statsRegistry.substring(0, 20)}...`);
      const exists = await checkObjectExists(known.statsRegistry);
      if (exists) {
        const count = await countDynamicFields(known.statsRegistry);
        if (count >= 0) {
          results.stats.found = true;
          results.stats.registryId = known.statsRegistry;
          results.stats.walletCount = count;
          console.log(`   ✅ Stats Registry found with ${count} wallets`);
        }
      }
    }
    
    // Check Premium Store
    if (known.premiumStore) {
      console.log(`   🔍 Checking Premium Store: ${known.premiumStore.substring(0, 20)}...`);
      const exists = await checkObjectExists(known.premiumStore);
      if (exists) {
        const count = await countDynamicFields(known.premiumStore);
        if (count >= 0) {
          results.inventory.found = true;
          results.inventory.storeId = known.premiumStore;
          results.inventory.walletCount = count;
          console.log(`   ✅ Premium Store found with ${count} wallets`);
        }
      }
    }
    
    // Check Game Pass System
    if (known.gamePassSystem) {
      console.log(`   🔍 Checking Game Pass System: ${known.gamePassSystem.substring(0, 20)}...`);
      const exists = await checkObjectExists(known.gamePassSystem);
      if (exists) {
        const count = await countDynamicFields(known.gamePassSystem);
        if (count >= 0) {
          results.gamePass.found = true;
          results.gamePass.systemId = known.gamePassSystem;
          results.gamePass.walletCount = count;
          console.log(`   ✅ Game Pass System found with ${count} wallets`);
        }
      }
    }
  }
  
  // For other packages, try to find objects by querying
  if (!results.inventory.found || !results.stats.found || !results.gamePass.found) {
    console.log(`   🔍 Querying package for objects...`);
    const packageObjects = await checkPackageObjects(packageInfo.id, packageInfo.date);
    
    // Check Premium Stores
    if (!results.inventory.found && packageObjects.premiumStores.length > 0) {
      const bestStore = packageObjects.premiumStores.find(s => s.walletCount > 0) || packageObjects.premiumStores[0];
      if (bestStore) {
        results.inventory.found = true;
        results.inventory.storeId = bestStore.objectId;
        results.inventory.walletCount = bestStore.walletCount;
        console.log(`   ✅ Found Premium Store: ${bestStore.objectId.substring(0, 20)}... (${bestStore.walletCount} wallets)`);
      }
    }
    
    // Check Stats Registries
    if (!results.stats.found && packageObjects.statsRegistries.length > 0) {
      const bestRegistry = packageObjects.statsRegistries.find(r => r.walletCount > 0) || packageObjects.statsRegistries[0];
      if (bestRegistry) {
        results.stats.found = true;
        results.stats.registryId = bestRegistry.objectId;
        results.stats.walletCount = bestRegistry.walletCount;
        console.log(`   ✅ Found Statistics Registry: ${bestRegistry.objectId.substring(0, 20)}... (${bestRegistry.walletCount} wallets)`);
      }
    }
    
    // Check Game Pass Systems
    if (!results.gamePass.found && packageObjects.gamePassSystems.length > 0) {
      const bestSystem = packageObjects.gamePassSystems.find(s => s.walletCount > 0) || packageObjects.gamePassSystems[0];
      if (bestSystem) {
        results.gamePass.found = true;
        results.gamePass.systemId = bestSystem.objectId;
        results.gamePass.walletCount = bestSystem.walletCount;
        console.log(`   ✅ Found Game Pass System: ${bestSystem.objectId.substring(0, 20)}... (${bestSystem.walletCount} wallets)`);
      }
    }
  }
  
  return results;
}

async function main() {
  console.log('🔍 Finding Old Contracts with Data');
  console.log('='.repeat(80));
  console.log(`RPC URL: ${testnetUrl}`);
  console.log('='.repeat(80));
  
  const allResults = [];
  
  // Check each historical package
  for (const packageInfo of HISTORICAL_PACKAGES) {
    const result = await checkPackageForData(packageInfo);
    allResults.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n✅ Packages with INVENTORY data:');
  const inventoryPackages = allResults.filter(r => r.inventory.found);
  if (inventoryPackages.length === 0) {
    console.log('   ❌ No packages found with inventory data');
  } else {
    inventoryPackages.forEach(r => {
      console.log(`   📦 ${r.name} (${r.date})`);
      console.log(`      Package: ${r.packageId}`);
      console.log(`      Store ID: ${r.inventory.storeId}`);
      console.log(`      Wallets: ${r.inventory.walletCount}`);
    });
  }
  
  console.log('\n✅ Packages with STATS data:');
  const statsPackages = allResults.filter(r => r.stats.found);
  if (statsPackages.length === 0) {
    console.log('   ❌ No packages found with stats data');
  } else {
    statsPackages.forEach(r => {
      console.log(`   📦 ${r.name} (${r.date})`);
      console.log(`      Package: ${r.packageId}`);
      console.log(`      Registry ID: ${r.stats.registryId}`);
      console.log(`      Wallets: ${r.stats.walletCount}`);
    });
  }
  
  console.log('\n✅ Packages with GAME PASS data:');
  const gamePassPackages = allResults.filter(r => r.gamePass.found);
  if (gamePassPackages.length === 0) {
    console.log('   ❌ No packages found with game pass data');
  } else {
    gamePassPackages.forEach(r => {
      console.log(`   📦 ${r.name} (${r.date})`);
      console.log(`      Package: ${r.packageId}`);
      console.log(`      System ID: ${r.gamePass.systemId}`);
      console.log(`      Wallets: ${r.gamePass.walletCount}`);
    });
  }
  
  // Recommended OLD_ values
  console.log('\n\n💡 RECOMMENDED OLD_ VALUES:');
  console.log('='.repeat(80));
  
  if (inventoryPackages.length > 0) {
    const best = inventoryPackages[0];
    console.log(`\nOLD_PREMIUM_STORE_CONTRACT_TESTNET=${best.packageId}`);
    console.log(`OLD_PREMIUM_STORE_OBJECT_ID_TESTNET=${best.inventory.storeId}`);
  }
  
  if (statsPackages.length > 0) {
    const best = statsPackages[0];
    console.log(`\nOLD_GAME_SCORE_CONTRACT_TESTNET=${best.packageId}`);
    console.log(`OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET=${best.stats.registryId}`);
  }
  
  if (gamePassPackages.length > 0) {
    const best = gamePassPackages[0];
    console.log(`\nOLD_GAME_PASS_CONTRACT_TESTNET=${best.packageId}`);
    console.log(`OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET=${best.gamePass.systemId}`);
  }
  
  console.log('');
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

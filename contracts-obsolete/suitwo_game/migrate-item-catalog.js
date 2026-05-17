// ==========================================
// Initialize Item Catalog Registry
// Loads item definitions and levels into the ItemCatalogRegistry
// ==========================================

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

// Try to load .env file if dotenv is available
try {
  require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
} catch (e) {
  // dotenv not available, rely on environment variables being set
}

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

// Get configuration from environment variables
const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY || 
                   process.env.GAME_WALLET_PRIVATE_KEY || 
                   'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// Package ID - contains provisions Move module (game or platform package)
const packageId = process.env.GAME_SCORE_CONTRACT_TESTNET ||
                  process.env.PREMIUM_STORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT ||
                  process.env.PACKAGE_ID_TESTNET ||
                  '0xe7bb0aeb498b664eeec0f9a5730c620eaf4536280836e976327cb8304c5596e1';

const registryId = process.env.ITEM_CATALOG_REGISTRY_ID_TESTNET || 
                  process.env.ITEM_CATALOG_REGISTRY_ID || 
                  '0x6425eb71cbdb020adb1f65ed9716f4cd2867b49e004e3e26c477e0a64f5adb6c';
const adminCapId = process.env.ITEM_CATALOG_ADMIN_CAP_ID_TESTNET || 
                  process.env.ITEM_CATALOG_ADMIN_CAP_ID || 
                  '0x462aa5a91fd6a4e90f248b10579103b6372c7abcbaceac734ea789cacbb812d8';

const network = process.env.SUI_NETWORK || 'testnet';

// Item type mapping (matches Move contract)
const ITEM_TYPE_MAP = {
  'extraLives': 0,
  'forceField': 1,
  'orbLevel': 2,
  'slowTime': 3,
  'destroyAll': 4,
  'bossKillShot': 5,
  'coinTractorBeam': 6,
};

// Category mapping
const CATEGORY_MAP = {
  'defensive': 0,
  'offensive': 1,
  'tactical': 2,
  'utility': 3,
};

// Item catalog data
// TODO: Import from centralized source: apps/shooter-game/backend/lib/services/item-catalog.ts (ITEM_CATALOG_FALLBACK)
// For now, this is duplicated here because Node.js scripts can't easily import TypeScript files
// The source of truth is: apps/shooter-game/backend/lib/services/item-catalog.ts
const ITEMS = [
  {
    itemId: 'extraLives',
    name: 'Extra Lives',
    description: 'Start with additional lives beyond the default 3',
    category: 'defensive',
    icon: '❤️',
    levels: [
      { level: 1, usdPrice: 0.35, effect: '+1 life', description: 'Start with 4 total lives (3 base + 1 purchased)' },
      { level: 2, usdPrice: 1.00, effect: '+2 lives', description: 'Start with 5 total lives (3 base + 2 purchased)' },
      { level: 3, usdPrice: 2.00, effect: '+3 lives', description: 'Start with 6 total lives (3 base + 3 purchased)' },
    ],
  },
  {
    itemId: 'forceField',
    name: 'Force Field Start',
    description: 'Begin the game with an active force field at a specified level',
    category: 'defensive',
    icon: '🛡️',
    levels: [
      { level: 1, usdPrice: 0.75, effect: 'Level 1 force field', description: 'Start with Level 1 force field active (normally requires 5 coin streak)' },
      { level: 2, usdPrice: 1.60, effect: 'Level 2 force field', description: 'Start with Level 2 force field active (normally requires 12 coin streak)' },
      { level: 3, usdPrice: 2.40, effect: 'Level 3 force field', description: 'Start with Level 3 force field active (normally requires 30 coin streak)' },
    ],
  },
  {
    itemId: 'orbLevel',
    name: 'Orb Level Start',
    description: 'Begin the game with a higher magic orb level',
    category: 'offensive',
    icon: '🔮',
    levels: [
      { level: 1, usdPrice: 0.50, effect: 'Start at Level 2', description: 'Begin at Orb Level 2 (skip initial grind)' },
      { level: 2, usdPrice: 1.20, effect: 'Start at Level 3', description: 'Begin at Orb Level 3 (stronger starting power)' },
      { level: 3, usdPrice: 1.80, effect: 'Start at Level 4', description: 'Begin at Orb Level 4 (very strong starting power)' },
    ],
  },
  {
    itemId: 'coinTractorBeam',
    name: 'Coin Tractor Beam',
    description: 'Pull all coins on screen toward the player automatically',
    category: 'utility',
    icon: '🧲',
    levels: [
      { level: 1, usdPrice: 0.75, effect: '4 seconds, 30% range', description: 'Pull coins from 30% of screen range for 4 seconds' },
      { level: 2, usdPrice: 1.20, effect: '6 seconds, 60% range', description: 'Pull coins from 60% of screen range for 6 seconds' },
      { level: 3, usdPrice: 1.60, effect: '8 seconds, 90% range', description: 'Pull coins from 90% of screen range for 8 seconds' },
    ],
  },
  {
    itemId: 'slowTime',
    name: 'Slow Time Power',
    description: 'Activate a power that slows game speed for a short duration',
    category: 'tactical',
    icon: '⏱️',
    levels: [
      { level: 1, usdPrice: 1.00, effect: '4 seconds duration', description: 'Slow time for 4 seconds (50% speed reduction)' },
      { level: 2, usdPrice: 1.80, effect: '6 seconds duration', description: 'Slow time for 6 seconds (50% speed reduction)' },
      { level: 3, usdPrice: 2.40, effect: '8 seconds duration', description: 'Slow time for 8 seconds (50% speed reduction)' },
    ],
  },
  {
    itemId: 'destroyAll',
    name: 'Destroy All Enemies',
    description: 'Launch seeking missiles that automatically destroy all enemies on screen',
    category: 'tactical',
    icon: '💥',
    levels: [
      { level: 1, usdPrice: 1.75, effect: 'Clear all enemies', description: 'Instantly destroy all enemies on screen (one-time use per game)' },
    ],
  },
  {
    itemId: 'bossKillShot',
    name: 'Boss Kill Shot',
    description: 'Instant kill the current boss with a powerful screen-wide attack',
    category: 'tactical',
    icon: '🎯',
    levels: [
      { level: 1, usdPrice: 2.50, effect: 'Instant boss kill', description: 'Instantly defeat any boss regardless of remaining HP (one-time use per game)' },
    ],
  },
];

// Helper function to convert string to vector<u8>
function stringToVector(str) {
  return Array.from(new TextEncoder().encode(str));
}

async function main() {
  // Validate required environment variables
  if (!registryId) {
    throw new Error('ITEM_CATALOG_REGISTRY_ID_TESTNET not set. Please set it in your .env file.');
  }
  if (!adminCapId) {
    throw new Error('ITEM_CATALOG_ADMIN_CAP_ID_TESTNET not set. Please set it in your .env file.');
  }
  if (!packageId) {
    throw new Error('Package ID not set. Please set GAME_SCORE_CONTRACT_TESTNET, PREMIUM_STORE_CONTRACT_TESTNET, or PACKAGE_ID_TESTNET in your .env file.');
  }

  console.log('🚀 Initializing Item Catalog Registry');
  console.log('=====================================');
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`📦 Registry ID: ${registryId}`);
  console.log(`🔐 Admin Cap ID: ${adminCapId}`);
  console.log(`🌐 Network: ${network}`);
  console.log('');

  // Initialize Sui client
  const rpcUrl = network === 'testnet' 
    ? getFullnodeUrl('testnet')
    : getFullnodeUrl('mainnet');
  const client = new SuiClient({ url: rpcUrl });

  // Initialize keypair
  const secretKey = decodePrivateKey(privateKey);
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const address = keypair.toSuiAddress();
  console.log(`👤 Admin Address: ${address}`);
  console.log('');

  // Get Clock object ID (standard Sui object)
  const clockObjectId = '0x6';

  let successCount = 0;
  let errorCount = 0;
  const totalOperations = ITEMS.length + ITEMS.reduce((sum, item) => sum + item.levels.length, 0);

  // Initialize each item definition and its levels
  console.log('📦 Initializing Item Definitions and Levels...');
  console.log('');
  
  for (const item of ITEMS) {
    const itemType = ITEM_TYPE_MAP[item.itemId];
    if (itemType === undefined) {
      console.error(`   ❌ Skipping invalid item ID: ${item.itemId}`);
      errorCount++;
      continue;
    }

    try {
      // Step 1: Create item definition
      console.log(`📝 Setting item definition: ${item.name} (Type ${itemType})...`);
      console.log(`   Category: ${item.category}`);

      const tx1 = new Transaction();
      
      // Convert strings to vector<u8>
      const nameVector = stringToVector(item.name);
      const descVector = stringToVector(item.description);
      const iconVector = stringToVector(item.icon);
      const categoryU8 = CATEGORY_MAP[item.category] ?? 0;

      tx1.moveCall({
        target: `${packageId}::provisions::admin_set_item_definition`,
        arguments: [
          tx1.object(adminCapId),           // AdminCapability
          tx1.object(registryId),            // ItemCatalogRegistry
          tx1.object(clockObjectId),         // Clock
          tx1.pure.u8(itemType),             // item_type
          tx1.pure.vector('u8', nameVector), // name
          tx1.pure.vector('u8', descVector), // description
          tx1.pure.u8(categoryU8),           // category
          tx1.pure.vector('u8', iconVector), // icon
          tx1.pure.bool(true),               // active
        ],
      });
      tx1.setGasBudget(50_000_000);

      const result1 = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx1,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result1.effects?.status?.status === 'success') {
        console.log(`   ✅ Item definition created! Transaction: ${result1.digest}`);
        successCount++;
      } else {
        console.error(`   ❌ Failed: ${result1.effects?.status?.error || 'Unknown error'}`);
        errorCount++;
        continue; // Skip levels if definition failed
      }

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Add all levels for this item
      for (const level of item.levels) {
        try {
          console.log(`   📝 Setting level ${level.level}: $${level.usdPrice.toFixed(2)} (${Math.round(level.usdPrice * 100)} cents)`);

          const tx2 = new Transaction();
          
          const effectVector = stringToVector(level.effect);
          const levelDescVector = stringToVector(level.description);
          const priceCents = Math.round(level.usdPrice * 100);

          tx2.moveCall({
            target: `${packageId}::provisions::admin_set_item_level`,
            arguments: [
              tx2.object(adminCapId),           // AdminCapability
              tx2.object(registryId),            // ItemCatalogRegistry
              tx2.object(clockObjectId),         // Clock
              tx2.pure.u8(itemType),             // item_type
              tx2.pure.u8(level.level),          // level
              tx2.pure.u64(priceCents),          // usd_price_cents
              tx2.pure.vector('u8', effectVector), // effect
              tx2.pure.vector('u8', levelDescVector), // description
            ],
          });
          tx2.setGasBudget(50_000_000);

          const result2 = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx2,
            options: {
              showEffects: true,
              showObjectChanges: true,
            },
          });

          if (result2.effects?.status?.status === 'success') {
            console.log(`      ✅ Level ${level.level} created! Transaction: ${result2.digest}`);
            successCount++;
          } else {
            console.error(`      ❌ Failed: ${result2.effects?.status?.error || 'Unknown error'}`);
            errorCount++;
          }

          // Small delay between transactions
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`      ❌ Error setting level ${level.level}:`, error.message);
          errorCount++;
        }
      }
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error setting item definition for ${item.name}:`, error.message);
      errorCount++;
      console.log('');
    }
  }

  console.log('=====================================');
  console.log('📊 Summary:');
  console.log(`   ✅ Success: ${successCount}/${totalOperations}`);
  console.log(`   ❌ Errors: ${errorCount}/${totalOperations}`);
  console.log('');

  if (errorCount === 0) {
    console.log('🎉 Item Catalog initialization complete!');
  } else {
    console.log('⚠️  Some items/levels failed to initialize.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

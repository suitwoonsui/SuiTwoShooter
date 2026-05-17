// ==========================================
// Initialize Game Config Registry
// Loads pack configurations into the GameConfigRegistry
// ==========================================

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

// Try to load .env file if dotenv is available (from contracts/suitwo_game, backend is ../../backend)
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

// Package ID - contains all modules including game_config
const packageId = process.env.GAME_SCORE_CONTRACT_TESTNET ||
                  process.env.PREMIUM_STORE_CONTRACT_TESTNET || 
                  process.env.PREMIUM_STORE_CONTRACT ||
                  process.env.PACKAGE_ID_TESTNET ||
                  '0x4399e0c77cf022dccd27f73a2a6c98aa01058b4f6a4cd68d0e3e1266081832b2';

const registryId = process.env.GAME_CONFIG_REGISTRY_ID_TESTNET || 
                  process.env.GAME_CONFIG_REGISTRY_ID || 
                  '0x09a2a3b72386c119ab85716522a49a5406105fcf8a3ea6d485aef4c164a75e6b';
const adminCapId = process.env.GAME_CONFIG_ADMIN_CAP_ID_TESTNET || 
                  process.env.GAME_CONFIG_ADMIN_CAP_ID || 
                  '0x4a58618bb2cab53de9b27c6ee6fb2f9064e6ba067c37e5d0f868c20a5ef00bdb';

const network = process.env.SUI_NETWORK || 'testnet';

// Import pack configurations from centralized data file (from contracts/suitwo_game, backend/data is ../../backend/data)
const path = require('path');
const { PACK_CONFIGS, TICKET_BUNDLES: TICKET_BUNDLES_DATA, MIN_TOKEN_BALANCE } = require(path.resolve(__dirname, '../../backend/data/initialization-data.js'));

// Map TICKET_BUNDLES from centralized data to the format needed (pack_type = 10 + quantity)
const TICKET_BUNDLES = TICKET_BUNDLES_DATA.map(bundle => ({
  packType: 10 + bundle.quantity, // pack_type = 10 + quantity
  quantity: bundle.quantity,
  name: bundle.name,
  description: bundle.description,
  priceUsdCents: bundle.priceUsdCents,
}));

// Helper function to convert string to vector<u8>
function stringToVector(str) {
  return Array.from(new TextEncoder().encode(str));
}

async function main() {
  // Validate required environment variables
  if (!registryId) {
    throw new Error('GAME_CONFIG_REGISTRY_ID_TESTNET not set. Please set it in your .env file.');
  }
  if (!adminCapId) {
    throw new Error('GAME_CONFIG_ADMIN_CAP_ID_TESTNET not set. Please set it in your .env file.');
  }
  if (!packageId) {
    throw new Error('Package ID not set. Please set GAME_SCORE_CONTRACT_TESTNET, PREMIUM_STORE_CONTRACT_TESTNET, or PACKAGE_ID_TESTNET in your .env file.');
  }

  console.log('🚀 Initializing Game Config Registry');
  console.log('=====================================');
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`   (from env: ${process.env.GAME_SCORE_CONTRACT_TESTNET || process.env.PREMIUM_STORE_CONTRACT_TESTNET || process.env.PACKAGE_ID_TESTNET || 'NOT SET - using fallback'})`);
  console.log(`⚙️  Registry ID: ${registryId}`);
  console.log(`   (from env: ${process.env.GAME_CONFIG_REGISTRY_ID_TESTNET || process.env.GAME_CONFIG_REGISTRY_ID || 'NOT SET - using fallback'})`);
  console.log(`🔐 Admin Cap ID: ${adminCapId}`);
  console.log(`   (from env: ${process.env.GAME_CONFIG_ADMIN_CAP_ID_TESTNET || process.env.GAME_CONFIG_ADMIN_CAP_ID || 'NOT SET - using fallback'})`);
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
  let totalOperations = PACK_CONFIGS.length + TICKET_BUNDLES.length + 1; // +1 for min token balance

  // Initialize each pack configuration
  console.log('📦 Initializing Credit Pack Configurations...');
  console.log('');
  for (const pack of PACK_CONFIGS) {
    try {
      console.log(`📝 Setting pack config: ${pack.name} (Type ${pack.packType})...`);
      console.log(`   Price: $${(pack.priceUsdCents / 100).toFixed(2)} (${pack.priceUsdCents} cents)`);
      console.log(`   Games: ${pack.games}`);

      const tx = new Transaction();
      
      // Convert strings to vector<u8>
      const nameVector = stringToVector(pack.name);
      const descVector = stringToVector(pack.description);

      tx.moveCall({
        target: `${packageId}::game_config::admin_set_pack_config`,
        arguments: [
          tx.object(adminCapId),           // AdminCapability
          tx.object(registryId),            // GameConfigRegistry
          tx.object(clockObjectId),         // Clock
          tx.pure.u8(pack.packType),        // pack_type
          tx.pure.u64(pack.priceUsdCents),  // price_usd_cents
          tx.pure.u64(pack.games),          // games
          tx.pure.vector('u8', nameVector), // name
          tx.pure.vector('u8', descVector), // description
        ],
      });
      tx.setGasBudget(50_000_000);

      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`   ✅ Success! Transaction: ${result.digest}`);
        successCount++;
      } else {
        console.error(`   ❌ Failed: ${result.effects?.status?.error || 'Unknown error'}`);
        errorCount++;
      }
      console.log('');

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Error setting pack config for ${pack.name}:`, error.message);
      errorCount++;
      console.log('');
    }
  }

  // Initialize ticket bundle configurations (as packs with pack_type 10+)
  console.log('=====================================');
  console.log('🎫 Initializing Tournament Ticket Bundles...');
  console.log('');
  for (const bundle of TICKET_BUNDLES) {
    try {
      console.log(`📝 Setting ticket bundle: ${bundle.name} (${bundle.quantity} tickets, pack_type ${bundle.packType})...`);
      console.log(`   Price: $${(bundle.priceUsdCents / 100).toFixed(2)} (${bundle.priceUsdCents} cents)`);
      console.log(`   Price per ticket: $${((bundle.priceUsdCents / bundle.quantity) / 100).toFixed(2)}`);

      const tx = new Transaction();
      
      // Convert strings to vector<u8>
      const nameVector = stringToVector(bundle.name);
      const descVector = stringToVector(bundle.description);

      tx.moveCall({
        target: `${packageId}::game_config::admin_set_pack_config`,
        arguments: [
          tx.object(adminCapId),           // AdminCapability
          tx.object(registryId),            // GameConfigRegistry
          tx.object(clockObjectId),         // Clock
          tx.pure.u8(bundle.packType),       // pack_type (10+ for tickets)
          tx.pure.u64(bundle.priceUsdCents), // price_usd_cents
          tx.pure.u64(bundle.quantity),      // games field = quantity of tickets
          tx.pure.vector('u8', nameVector), // name
          tx.pure.vector('u8', descVector), // description
        ],
      });
      tx.setGasBudget(50_000_000);

      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`   ✅ Success! Transaction: ${result.digest}`);
        successCount++;
      } else {
        console.error(`   ❌ Failed: ${result.effects?.status?.error || 'Unknown error'}`);
        errorCount++;
      }
      console.log('');

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Error setting ticket bundle for ${bundle.name}:`, error.message);
      errorCount++;
      console.log('');
    }
  }

  // Initialize min token balance
  console.log('=====================================');
  console.log('🎯 Initializing Min Token Balance...');
  console.log('');
  try {
    console.log(`📝 Setting min token balance...`);
    console.log(`   Value: ${(MIN_TOKEN_BALANCE / 1_000_000_000).toLocaleString()} $MEWS (${MIN_TOKEN_BALANCE} with 9 decimals)`);

    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::game_config::admin_set_min_token_balance`,
      arguments: [
        tx.object(adminCapId),           // AdminCapability
        tx.object(registryId),            // GameConfigRegistry
        tx.object(clockObjectId),         // Clock
        tx.pure.u64(MIN_TOKEN_BALANCE),   // min_token_balance
      ],
    });
    tx.setGasBudget(50_000_000);

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (result.effects?.status?.status === 'success') {
      console.log(`   ✅ Success! Transaction: ${result.digest}`);
      successCount++;
    } else {
      console.error(`   ❌ Failed: ${result.effects?.status?.error || 'Unknown error'}`);
      errorCount++;
    }
    console.log('');
  } catch (error) {
    console.error(`   ❌ Error setting min token balance:`, error.message);
    errorCount++;
    console.log('');
  }

  console.log('=====================================');
  console.log('📊 Summary:');
  console.log(`   ✅ Success: ${successCount}/${totalOperations}`);
  console.log(`   ❌ Errors: ${errorCount}/${totalOperations}`);
  console.log('');

  if (successCount === totalOperations) {
    console.log('🎉 Game Config initialization complete!');
  } else {
    console.log('⚠️  Some configurations failed to initialize.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

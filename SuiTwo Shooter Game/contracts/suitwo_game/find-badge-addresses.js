// Find addresses that have badges
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  return env;
}

const envPath = path.join(__dirname, '../../backend/.env.local');
const env = loadEnvFile(envPath);
Object.keys(env).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = env[key];
  }
});

const packageId = process.argv[2] || process.env.GAME_SCORE_CONTRACT_TESTNET || process.env.GAME_SCORE_CONTRACT;
const badgeRegistryId = process.env.BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.BADGE_REGISTRY_OBJECT_ID;

async function findBadgeAddresses() {
  if (!packageId || !badgeRegistryId) {
    console.error('❌ Package ID or Badge Registry ID not set');
    console.error('   Package ID:', packageId || 'NOT SET');
    console.error('   Badge Registry ID:', badgeRegistryId || 'NOT SET');
    process.exit(1);
  }

  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  try {
    console.log('🔍 Finding addresses with badges...\n');
    console.log('📦 Package ID:', packageId);
    console.log('📋 Badge Registry ID:', badgeRegistryId);
    console.log('');
    
    // Get the badge registry object
    const registry = await client.getObject({
      id: badgeRegistryId,
      options: {
        showContent: true,
      },
    });
    
    if (!registry.data || !registry.data.content) {
      console.error('❌ Could not read badge registry');
      process.exit(1);
    }
    
    // The registry has a Table<address, ID> for badges
    // We need to query the dynamic fields to get all entries
    const dynamicFields = await client.getDynamicFields({
      parentId: badgeRegistryId,
    });
    
    console.log(`✅ Found ${dynamicFields.data.length} badge(s) in registry\n`);
    
    if (dynamicFields.data.length === 0) {
      console.log('⚠️  No badges found in registry');
      console.log('   You may need to mint a badge first');
      return;
    }
    
    console.log('📋 Addresses with badges:');
    console.log('');
    
    for (const field of dynamicFields.data) {
      // The name field contains the address
      const address = field.name.value;
      const badgeId = field.objectId;
      
      console.log(`   Address: ${address}`);
      console.log(`   Badge ID: ${badgeId}`);
      console.log(`   Test URL: http://localhost:3000/api/badges/${address}/image`);
      console.log('');
    }
    
    if (dynamicFields.data.length > 0) {
      const firstAddress = dynamicFields.data[0].name.value;
      console.log('💡 To test the image endpoint, run:');
      console.log(`   node test-badge-image.js ${firstAddress}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

findBadgeAddresses();


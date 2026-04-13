// ==========================================
// Find and Check Badge Objects
// ==========================================
// This script finds badge objects and checks their image configuration

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

const packageId = process.env.GAME_SCORE_PACKAGE_ID_TESTNET || process.env.GAME_SCORE_PACKAGE_ID;
const badgeRegistryId = process.env.BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.BADGE_REGISTRY_OBJECT_ID;
const displayObjectId = process.env.BADGE_DISPLAY_OBJECT_ID_TESTNET || process.env.BADGE_DISPLAY_OBJECT_ID;
const playerAddress = process.argv[2]; // Optional: specific player address

if (!packageId) {
  console.error('❌ GAME_SCORE_PACKAGE_ID_TESTNET not set');
  process.exit(1);
}

async function findAndCheckBadges() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  console.log('🔍 Finding and Checking Badge Objects');
  console.log('═══════════════════════════════════════\n');
  
  // Check Display object first
  if (displayObjectId) {
    console.log('📋 Checking Display Object...\n');
    try {
      const displayObj = await client.getObject({
        id: displayObjectId,
        options: {
          showContent: true,
          showDisplay: true,
        },
      });
      
      if (displayObj.data?.content?.fields?.fields) {
        const fields = displayObj.data.content.fields.fields;
        const imageUrlField = fields.find(f => f.key === 'image_url');
        
        if (imageUrlField) {
          console.log(`✅ Display.image_url: "${imageUrlField.value}"`);
          if (imageUrlField.value === '{image}') {
            console.log('   ✅ CORRECT: References {image} struct field\n');
          } else {
            console.log('   ❌ INCORRECT: Should be {image}\n');
          }
        } else {
          console.log('❌ Display.image_url field is MISSING\n');
        }
      }
    } catch (error) {
      console.error('❌ Error checking Display:', error.message, '\n');
    }
  }
  
  // Find badges
  console.log('🔍 Finding Badge Objects...\n');
  
  try {
    // Try to find badges by querying objects with the badge type
    const badgeType = `${packageId}::badge_system::EarlySupporterBadge`;
    
    // If we have a player address, try to get their badge from registry
    if (playerAddress && badgeRegistryId) {
      console.log(`Looking for badge for player: ${playerAddress}\n`);
      
      // Query the registry (we'd need to call a view function, but let's try direct object query)
      // Actually, we can query owned objects
      const ownedObjects = await client.getOwnedObjects({
        owner: playerAddress,
        filter: {
          StructType: badgeType,
        },
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
        },
        limit: 10,
      });
      
      if (ownedObjects.data && ownedObjects.data.length > 0) {
        for (const obj of ownedObjects.data) {
          if (obj.data) {
            await checkBadgeObject(client, obj.data.objectId, obj.data);
          }
        }
      } else {
        console.log('❌ No badge found for this address\n');
      }
    } else {
      // Try to find any badges by querying recent transactions or using a known address
      console.log('💡 To check a specific badge, provide player address:');
      console.log('   node find-and-check-badge.js <PLAYER_ADDRESS>\n');
      
      // Or we can try to find badges by querying the registry
      if (badgeRegistryId) {
        console.log('📋 Badge Registry ID:', badgeRegistryId);
        console.log('   (Registry is a shared object, cannot directly query badge list)\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error finding badges:', error.message);
  }
}

async function checkBadgeObject(client, badgeId, badgeData) {
  console.log('═══════════════════════════════════════');
  console.log(`📦 Badge Object: ${badgeId}`);
  console.log('═══════════════════════════════════════\n');
  
  if (badgeData.content?.fields) {
    const fields = badgeData.content.fields;
    console.log('📋 Badge Fields:');
    console.log('   owner:', fields.owner);
    console.log('   tier:', fields.tier);
    console.log('   games_played:', fields.games_played);
    
    if (fields.image) {
      console.log(`   ✅ image: "${fields.image}"`);
      
      // Validate URL
      if (fields.image.startsWith('http://') || fields.image.startsWith('https://')) {
        console.log('   ✅ URL format is valid');
        try {
          const url = new URL(fields.image);
          console.log('   Domain:', url.hostname);
          console.log('   Path:', url.pathname);
        } catch (e) {
          console.log('   ⚠️  URL parsing error');
        }
      } else {
        console.log('   ❌ Image field is not a valid URL');
      }
    } else {
      console.log('   ❌ image field is MISSING');
    }
  }
  
  // Check resolved Display data
  if (badgeData.display?.data) {
    console.log('\n📋 Resolved Display Data (what wallets see):');
    const displayData = badgeData.display.data;
    
    if (displayData.image_url) {
      console.log(`   ✅ image_url: "${displayData.image_url}"`);
      
      if (displayData.image_url.startsWith('http://') || displayData.image_url.startsWith('https://')) {
        console.log('   ✅ Resolved to valid URL - wallets should display this');
      } else {
        console.log('   ❌ Resolved value is not a URL');
        console.log('   This is why wallets show "no media"');
      }
    } else {
      console.log('   ❌ image_url is MISSING in Display data');
      console.log('   This is why wallets show "no media"');
    }
    
    console.log('\n   Full Display data:');
    console.log(JSON.stringify(displayData, null, 2));
  } else {
    console.log('\n❌ No Display data resolved');
    console.log('   This means the Display object is not properly configured');
  }
  
  console.log('');
}

findAndCheckBadges().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


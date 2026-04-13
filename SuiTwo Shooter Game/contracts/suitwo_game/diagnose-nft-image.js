// ==========================================
// Diagnose NFT Image Display Issue
// ==========================================
// This script checks both the Display object and a badge object
// to diagnose why images aren't showing in Slush Wallet

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

const displayObjectId = process.argv[2] || process.env.BADGE_DISPLAY_OBJECT_ID_TESTNET || process.env.BADGE_DISPLAY_OBJECT_ID;
const badgeObjectId = process.argv[3]; // Optional: pass a badge object ID to check

if (!displayObjectId) {
  console.error('❌ BADGE_DISPLAY_OBJECT_ID_TESTNET not set');
  console.error('   Usage: node diagnose-nft-image.js [DISPLAY_OBJECT_ID] [BADGE_OBJECT_ID]');
  process.exit(1);
}

async function diagnose() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  console.log('🔍 Diagnosing NFT Image Display Issue');
  console.log('═══════════════════════════════════════\n');
  
  // ===== 1. Check Display Object =====
  console.log('📋 Step 1: Checking Display Object...\n');
  try {
    const displayObj = await client.getObject({
      id: displayObjectId,
      options: {
        showContent: true,
        showType: true,
        showDisplay: true,
      },
    });
    
    if (!displayObj.data) {
      console.error('❌ Display object not found!');
      console.error(`   ID: ${displayObjectId}`);
      return;
    }
    
    console.log('✅ Display object found');
    console.log('   Type:', displayObj.data.type);
    console.log('   Version:', displayObj.data.content?.fields?.version || 'unknown');
    console.log('');
    
    if (displayObj.data.content?.fields?.fields) {
      const fields = displayObj.data.content.fields.fields;
      console.log('📋 Display object fields:');
      
      // Find image_url field
      let imageUrlFound = false;
      for (const field of fields) {
        if (field.key === 'image_url') {
          imageUrlFound = true;
          console.log(`   ✅ image_url: "${field.value}"`);
          
          if (field.value === '{image}') {
            console.log('   ✅ CORRECT: References {image} struct field');
          } else if (field.value.includes('http')) {
            console.log('   ❌ INCORRECT: Has hardcoded URL instead of {image}');
            console.log('   💡 Fix: Update Display object to use {image}');
          } else {
            console.log('   ⚠️  UNEXPECTED: Value is not {image}');
          }
        }
      }
      
      if (!imageUrlFound) {
        console.log('   ❌ image_url field is MISSING');
        console.log('   💡 Fix: Add image_url field with value {image}');
      }
    } else {
      console.log('⚠️  Could not read Display object fields');
      console.log('   Raw content:', JSON.stringify(displayObj.data.content, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error checking Display object:', error.message);
    return;
  }
  
  // ===== 2. Check Badge Object (if provided) =====
  if (badgeObjectId) {
    console.log('\n📋 Step 2: Checking Badge Object...\n');
    try {
      const badgeObj = await client.getObject({
        id: badgeObjectId,
        options: {
          showContent: true,
          showType: true,
          showDisplay: true,
        },
      });
      
      if (!badgeObj.data) {
        console.error('❌ Badge object not found!');
        console.error(`   ID: ${badgeObjectId}`);
        return;
      }
      
      console.log('✅ Badge object found');
      console.log('   Type:', badgeObj.data.type);
      console.log('');
      
      // Check badge fields
      if (badgeObj.data.content?.fields) {
        const fields = badgeObj.data.content.fields;
        console.log('📋 Badge object fields:');
        console.log('   owner:', fields.owner);
        console.log('   tier:', fields.tier);
        console.log('   games_played:', fields.games_played);
        
        if (fields.image) {
          console.log(`   ✅ image: "${fields.image}"`);
          
          // Check if URL is valid
          if (fields.image.startsWith('http://') || fields.image.startsWith('https://')) {
            console.log('   ✅ URL format is valid');
            
            // Try to check if URL is accessible
            try {
              const url = new URL(fields.image);
              console.log('   ✅ URL is well-formed');
              console.log('   Domain:', url.hostname);
              console.log('   Path:', url.pathname);
            } catch (e) {
              console.log('   ⚠️  URL parsing error:', e.message);
            }
          } else {
            console.log('   ⚠️  Image field does not contain a valid URL');
          }
        } else {
          console.log('   ❌ image field is MISSING');
        }
      }
      
      // Check resolved Display data
      if (badgeObj.data.display?.data) {
        console.log('\n📋 Resolved Display data (what wallets see):');
        const displayData = badgeObj.data.display.data;
        console.log(JSON.stringify(displayData, null, 2));
        
        if (displayData.image_url) {
          console.log(`\n✅ image_url in Display: "${displayData.image_url}"`);
          
          // Check if it's a valid URL
          if (displayData.image_url.startsWith('http://') || displayData.image_url.startsWith('https://')) {
            console.log('   ✅ Resolved to valid URL');
          } else {
            console.log('   ⚠️  Resolved value is not a URL');
            console.log('   This might be why wallets show "no media"');
          }
        } else {
          console.log('\n❌ image_url is MISSING in resolved Display data');
          console.log('   This is why wallets show "no media"');
        }
      } else {
        console.log('\n⚠️  No Display data resolved for this badge');
        console.log('   This might mean the Display object is not properly configured');
      }
      
    } catch (error) {
      console.error('❌ Error checking Badge object:', error.message);
    }
  } else {
    console.log('\n💡 Tip: Pass a badge object ID as second argument to check a specific badge');
    console.log('   Example: node diagnose-nft-image.js <DISPLAY_ID> <BADGE_ID>');
  }
  
  // ===== Summary =====
  console.log('\n═══════════════════════════════════════');
  console.log('📊 Diagnosis Summary');
  console.log('═══════════════════════════════════════\n');
  
  console.log('Common issues and fixes:');
  console.log('1. Display.image_url ≠ "{image}" → Run: node update-badge-display-image.js');
  console.log('2. Badge.image field missing/empty → Update badge image URL');
  console.log('3. Badge.image URL not accessible → Check Vercel deployment');
  console.log('4. Display object version not updated → Display object needs update_version() call');
  console.log('');
}

diagnose().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


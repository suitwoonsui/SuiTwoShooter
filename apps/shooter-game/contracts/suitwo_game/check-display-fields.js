// Check Display object fields
// This script checks the Display object to see if image_url is configured correctly
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

if (!displayObjectId) {
  console.error('❌ BADGE_DISPLAY_OBJECT_ID_TESTNET or BADGE_DISPLAY_OBJECT_ID not set');
  console.error('   Please provide Display object ID as argument or set in .env.local');
  process.exit(1);
}

async function checkDisplayFields() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  try {
    console.log('🔍 Checking Display object fields...\n');
    console.log('📦 Display Object ID:', displayObjectId);
    console.log('');
    
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
      process.exit(1);
    }
    
    if (displayObj.data.content && displayObj.data.content.fields) {
      const fields = displayObj.data.content.fields;
      console.log('📋 Display object fields:');
      console.log(JSON.stringify(fields, null, 2));
      console.log('');
      
      // Check for image_url field
      const imageUrlValue = fields.image_url;
      
      if (imageUrlValue) {
        console.log('✅ image_url field is present!');
        console.log('   Current value:', imageUrlValue);
        console.log('');
        
        // Check if it's the correct template
        if (imageUrlValue === '{image}') {
          console.log('✅ CORRECT: image_url references {image} struct field');
          console.log('   This is the correct configuration for wallets!');
        } else if (imageUrlValue.includes('{image}')) {
          console.log('✅ CORRECT: image_url contains {image} reference');
        } else if (imageUrlValue.includes('{owner}') || imageUrlValue.includes('http')) {
          console.log('❌ INCORRECT: image_url has a hardcoded URL template');
          console.log('   Expected: {image}');
          console.log('   Found:', imageUrlValue);
          console.log('');
          console.log('💡 Fix: Run the update script to correct this:');
          console.log('   node update-badge-display-image.js');
        } else {
          console.log('⚠️  image_url has an unexpected value');
          console.log('   Expected: {image}');
          console.log('   Found:', imageUrlValue);
        }
      } else {
        console.log('❌ image_url field is NOT present');
        console.log('');
        console.log('💡 Fix: Run the update script to add it:');
        console.log('   node update-badge-display-image.js');
      }
    } else {
      console.log('⚠️  Could not read Display object fields');
      console.log('   Object data:', JSON.stringify(displayObj.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

checkDisplayFields();


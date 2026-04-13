// ==========================================
// Check if Display Object is Valid for Current Package
// ==========================================
// This script checks if the existing Display object is valid for the current package
// and determines if you need to recreate it or can just update it

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

// Configuration
// Note: The package ID is stored as GAME_SCORE_CONTRACT in the backend config
// Can also be passed as command line arguments: node check-display-object.js <PACKAGE_ID> <DISPLAY_OBJECT_ID>
const packageId = process.argv[2] || process.env.GAME_SCORE_CONTRACT_TESTNET || process.env.GAME_SCORE_CONTRACT || process.env.GAME_SCORE_PACKAGE_ID_TESTNET || process.env.GAME_SCORE_PACKAGE_ID;
const displayObjectId = process.argv[3] || process.env.BADGE_DISPLAY_OBJECT_ID_TESTNET || process.env.BADGE_DISPLAY_OBJECT_ID;

if (!packageId) {
  console.error('❌ Package ID not found in environment variables');
  console.error('   Please set one of:');
  console.error('   - GAME_SCORE_CONTRACT_TESTNET');
  console.error('   - GAME_SCORE_CONTRACT');
  console.error('   - GAME_SCORE_PACKAGE_ID_TESTNET');
  console.error('   - GAME_SCORE_PACKAGE_ID');
  console.error('');
  console.error('   Check your backend/.env.local file');
  process.exit(1);
}

if (!displayObjectId) {
  console.error('❌ BADGE_DISPLAY_OBJECT_ID_TESTNET or BADGE_DISPLAY_OBJECT_ID not set');
  process.exit(1);
}

async function checkDisplayObject() {
  try {
    console.log('🔍 Checking Display Object Validity');
    console.log('═══════════════════════════════════════\n');
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('📦 Current Package ID:', packageId);
    console.log('🎨 Display Object ID:', displayObjectId);
    console.log('');
    
    // Get Display object info
    console.log('📥 Fetching Display object...');
    const displayObj = await client.getObject({
      id: displayObjectId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });
    
    if (!displayObj.data) {
      console.error('❌ Display object not found!');
      console.error('   The Display object ID may be incorrect or the object was deleted.');
      process.exit(1);
    }
    
    console.log('✅ Display object found');
    console.log('   Type:', displayObj.data.type);
    console.log('   Owner:', JSON.stringify(displayObj.data.owner, null, 2));
    console.log('');
    
    // Check if Display object type matches current package
    const displayType = displayObj.data.type || '';
    const expectedTypePrefix = `${packageId}::badge_system::Display`;
    
    console.log('🔍 Checking package compatibility...');
    console.log('   Display object type:', displayType);
    console.log('   Expected type prefix:', expectedTypePrefix);
    console.log('');
    
    if (displayType.includes(packageId)) {
      console.log('✅ Display object is VALID for current package!');
      console.log('');
      console.log('💡 You can UPDATE the existing Display object:');
      console.log('   node update-badge-display-image.js');
      console.log('');
      console.log('   This will add the image_url field to the existing Display object.');
    } else {
      console.log('⚠️  Display object is from a DIFFERENT package!');
      console.log('');
      console.log('📋 The Display object type shows it was created for a different package.');
      console.log('   This means the contract was redeployed with a new package ID.');
      console.log('');
      console.log('💡 You need to RECREATE the Display object:');
      console.log('   1. Find the new Publisher object ID from the latest deployment');
      console.log('   2. Run: node create-badge-display.js <NEW_PUBLISHER_OBJECT_ID>');
      console.log('   3. Update BADGE_DISPLAY_OBJECT_ID_TESTNET in .env.local');
      console.log('');
      console.log('🔍 To find the Publisher object:');
      console.log('   - Check your latest deployment transaction');
      console.log('   - Or run: node find-publisher-broad.js');
      console.log('   - Or query your wallet: sui client objects --address <YOUR_ADDRESS>');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

checkDisplayObject();


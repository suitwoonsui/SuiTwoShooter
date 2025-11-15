// Verify admin capability object type
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
require('dotenv').config({ path: '.env' });

const network = process.env.SUI_NETWORK || 'testnet';
const adminCapabilityId = process.env.PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || 
                          process.env.PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET;

async function verifyAdminCapability() {
  if (!adminCapabilityId) {
    console.error('❌ PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET (or MAINNET) not set in .env');
    process.exit(1);
  }

  console.log(`🔍 Verifying admin capability object...`);
  console.log(`   Network: ${network}`);
  console.log(`   Object ID: ${adminCapabilityId}`);
  console.log('');

  try {
    const client = new SuiClient({ url: getFullnodeUrl(network) });
    
    const object = await client.getObject({
      id: adminCapabilityId,
      options: { showType: true, showOwner: true },
    });

    if (object.error) {
      console.error(`❌ Object not found: ${object.error}`);
      process.exit(1);
    }

    const objectType = object.data?.type || 'unknown';
    const owner = object.data?.owner || 'unknown';

    console.log(`✅ Object found!`);
    console.log(`   Type: ${objectType}`);
    console.log(`   Owner: ${JSON.stringify(owner)}`);
    console.log('');

    // Check if it's the correct type
    if (objectType.includes('premium_store::AdminCapability')) {
      console.log('✅ CORRECT TYPE: This is a premium_store::AdminCapability');
      console.log('   This is the correct admin capability for the premium store.');
    } else if (objectType.includes('score_submission::AdminCapability')) {
      console.error('❌ WRONG TYPE: This is a score_submission::AdminCapability');
      console.error('   This is the admin capability for score submission, not premium store.');
      console.error('   You need to create a separate premium_store::AdminCapability.');
      console.error('');
      console.error('   To fix this:');
      console.error('   1. Run: cd contracts/suitwo_game && node create-admin-capability.js');
      console.error('   2. Look for "Premium Store Admin Capability" in the output');
      console.error('   3. Update PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET in your .env file');
      process.exit(1);
    } else {
      console.error(`❌ UNKNOWN TYPE: ${objectType}`);
      console.error('   This does not appear to be an admin capability object.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error verifying object:', error);
    process.exit(1);
  }
}

verifyAdminCapability();


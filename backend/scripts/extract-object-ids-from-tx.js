/**
 * Extract object IDs from a deployment transaction
 * 
 * Usage:
 *   node backend/scripts/extract-object-ids-from-tx.js <transaction_digest>
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

const TX_DIGEST = process.argv[2] || '4obHCdHkUt88yLKYzzQiADFsBk1FVU1ZwDWChBefDgSL';

async function extractObjectIds() {
  console.log('🔍 Extracting Object IDs from Transaction');
  console.log('='.repeat(80));
  console.log(`Transaction: ${TX_DIGEST}`);
  console.log('='.repeat(80));
  console.log('');
  
  try {
    const tx = await client.getTransactionBlock({
      digest: TX_DIGEST,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });

    if (tx.timestampMs) {
      const date = new Date(Number(tx.timestampMs));
      console.log(`📅 Transaction Date: ${date.toISOString()}`);
      console.log('');
    }

    const objects = {
      packageId: null,
      statisticsRegistry: null,
      premiumStore: null,
      gamePassSystem: null,
      sessionRegistry: null,
      adminCapability: null,
      premiumStoreAdminCapability: null,
    };

    if (tx.objectChanges) {
      console.log('📦 Found Object Changes:');
      console.log('');
      
      for (const change of tx.objectChanges) {
        if (change.type === 'published') {
          objects.packageId = change.packageId;
          console.log(`✅ Package ID: ${change.packageId}`);
        }
        
        if (change.type === 'created' && change.objectType) {
          const objectType = change.objectType;
          const objectId = change.objectId;
          
          console.log(`\n📦 Created Object: ${objectType}`);
          console.log(`   Object ID: ${objectId}`);
          
          if (objectType.includes('StatisticsRegistry')) {
            objects.statisticsRegistry = objectId;
            console.log(`   ✅ Statistics Registry found!`);
          } else if (objectType.includes('PremiumStore')) {
            objects.premiumStore = objectId;
            console.log(`   ✅ Premium Store found!`);
          } else if (objectType.includes('GamePassSystem')) {
            objects.gamePassSystem = objectId;
            console.log(`   ✅ Game Pass System found!`);
          } else if (objectType.includes('SessionRegistry')) {
            objects.sessionRegistry = objectId;
            console.log(`   ✅ Session Registry found!`);
          } else if (objectType.includes('AdminCapability') && objectType.includes('score_submission')) {
            objects.adminCapability = objectId;
            console.log(`   ✅ Admin Capability found!`);
          } else if (objectType.includes('AdminCapability') && objectType.includes('premium_store')) {
            objects.premiumStoreAdminCapability = objectId;
            console.log(`   ✅ Premium Store Admin Capability found!`);
          }
        }
      }
    }

    console.log('\n\n📋 EXTRACTED OBJECT IDs:');
    console.log('='.repeat(80));
    console.log('');
    
    if (objects.packageId) {
      console.log(`OLD_GAME_SCORE_CONTRACT_TESTNET=${objects.packageId}`);
      console.log(`OLD_PREMIUM_STORE_CONTRACT_TESTNET=${objects.packageId}`);
      console.log(`OLD_GAME_PASS_CONTRACT_TESTNET=${objects.packageId}`);
      console.log('');
    }
    
    if (objects.statisticsRegistry) {
      console.log(`OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET=${objects.statisticsRegistry}`);
    }
    
    if (objects.premiumStore) {
      console.log(`OLD_PREMIUM_STORE_OBJECT_ID_TESTNET=${objects.premiumStore}`);
    }
    
    if (objects.gamePassSystem) {
      console.log(`OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET=${objects.gamePassSystem}`);
    }
    
    if (objects.sessionRegistry) {
      console.log(`OLD_SESSION_REGISTRY_OBJECT_ID_TESTNET=${objects.sessionRegistry}`);
    }
    
    if (objects.adminCapability) {
      console.log(`OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${objects.adminCapability}`);
    }
    
    if (objects.premiumStoreAdminCapability) {
      console.log(`OLD_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${objects.premiumStoreAdminCapability}`);
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

extractObjectIds();

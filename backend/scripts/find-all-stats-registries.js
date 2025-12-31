/**
 * Find all StatisticsRegistry objects from the 12-28 deployment package
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

const PACKAGE_ID = '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352';

async function findAllStatsRegistries() {
  console.log('🔍 Finding All StatisticsRegistry Objects');
  console.log('='.repeat(80));
  console.log(`Package ID: ${PACKAGE_ID}`);
  console.log('='.repeat(80));
  console.log('');
  
  try {
    // Query for all StatisticsRegistry objects from this package
    const objects = await client.queryObjects({
      filter: {
        StructType: `${PACKAGE_ID}::score_submission::StatisticsRegistry`,
      },
      options: { showType: true },
      limit: 100,
    });
    
    console.log(`📦 Found ${objects.data.length} StatisticsRegistry object(s):\n`);
    
    for (const obj of objects.data) {
      const objectId = obj.data?.objectId;
      if (!objectId) continue;
      
      console.log(`📊 StatisticsRegistry:`);
      console.log(`   Object ID: ${objectId}`);
      
      try {
        // Check how many wallets have stats
        const fields = await client.getDynamicFields({
          parentId: objectId,
          limit: 1000,
        });
        console.log(`   ✅ Wallets with stats: ${fields.data.length}`);
        
        if (fields.data.length > 0) {
          console.log(`   🎯 THIS IS THE CORRECT OBJECT ID!`);
        }
      } catch (e) {
        console.log(`   ⚠️  Error checking: ${e.message}`);
      }
      console.log('');
    }
    
    // Also check the one we extracted from the transaction
    const extractedId = '0x1e8e0cd84fbe743a73f94c36d812cbda2e8e5038fcf3198daf1239b8893859ff';
    console.log(`\n🔍 Checking extracted object ID from transaction:`);
    console.log(`   Object ID: ${extractedId}`);
    
    try {
      const obj = await client.getObject({
        id: extractedId,
        options: { showType: true },
      });
      
      if (obj.data) {
        console.log(`   ✅ Object exists`);
        console.log(`   Type: ${obj.data.type}`);
        
        const fields = await client.getDynamicFields({
          parentId: extractedId,
          limit: 1000,
        });
        console.log(`   Wallets: ${fields.data.length}`);
      } else {
        console.log(`   ❌ Object not found`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

findAllStatsRegistries();

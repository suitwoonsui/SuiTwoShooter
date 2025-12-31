/**
 * Verify the 12-28 deployment object IDs have data
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

const OBJECT_IDS = {
  stats: '0x1e8e0cd84fbe743a73f94c36d812cbda2e8e5038fcf3198daf1239b8893859ff',
  store: '0x2919169a7ebadd3c95f4c9c1b2c4c9b9a5c9185ef69a3208b1866f9c81df8559',
  gamePass: '0x2cae3046a912fdc95ea69098181c4125c72f6a601a55b3e0197eb2dd359475aa',
};

async function verifyStatsRegistry(registryId) {
  try {
    // Get the StatisticsRegistry object to access the player_stats table
    const registryObj = await client.getObject({
      id: registryId,
      options: { showContent: true },
    });

    if (registryObj.error || !registryObj.data?.content) {
      return { error: 'Failed to read StatisticsRegistry object' };
    }

    const content = registryObj.data.content;
    const fields = content.fields;

    if (!fields.player_stats) {
      return { error: 'StatisticsRegistry has no player_stats table' };
    }

    // Get the table ID (Tables are stored as dynamic fields)
    let tableId = null;
    if (fields.player_stats.fields && fields.player_stats.fields.id) {
      tableId = fields.player_stats.fields.id.id || fields.player_stats.fields.id;
    } else if (fields.player_stats.id) {
      tableId = fields.player_stats.id.id || fields.player_stats.id;
    } else {
      return { error: 'Could not find table ID in player_stats structure' };
    }

    // Get all dynamic fields from the table (each field is a player address -> PlayerStats entry)
    const dynamicFields = await client.getDynamicFields({
      parentId: tableId,
      limit: 1000,
    });

    return { walletCount: dynamicFields.data.length, tableId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function verify() {
  console.log('🔍 Verifying 12-28 Deployment Object IDs');
  console.log('='.repeat(80));
  console.log('');
  
  // Check Stats Registry (needs special handling for the player_stats table)
  console.log('📊 STATS REGISTRY:');
  console.log(`   Object ID: ${OBJECT_IDS.stats}`);
  const statsResult = await verifyStatsRegistry(OBJECT_IDS.stats);
  if (statsResult.error) {
    console.log(`   ❌ Error: ${statsResult.error}`);
  } else {
    console.log(`   ✅ Wallets with stats: ${statsResult.walletCount}`);
    console.log(`   📋 Table ID: ${statsResult.tableId}`);
  }
  console.log('');
  
  // Check Premium Store
  console.log('🛒 PREMIUM STORE:');
  console.log(`   Object ID: ${OBJECT_IDS.store}`);
  try {
    const fields = await client.getDynamicFields({
      parentId: OBJECT_IDS.store,
      limit: 1000,
    });
    console.log(`   ✅ Wallets with inventory: ${fields.data.length}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e instanceof Error ? e.message : String(e)}`);
  }
  console.log('');
  
  // Check Game Pass System
  console.log('🎫 GAME PASS SYSTEM:');
  console.log(`   Object ID: ${OBJECT_IDS.gamePass}`);
  try {
    const fields = await client.getDynamicFields({
      parentId: OBJECT_IDS.gamePass,
      limit: 1000,
    });
    console.log(`   ✅ Wallets with game passes: ${fields.data.length}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e instanceof Error ? e.message : String(e)}`);
  }
  console.log('');
}

verify().catch(console.error);

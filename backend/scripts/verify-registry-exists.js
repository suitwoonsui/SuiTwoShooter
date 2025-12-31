/**
 * Script to verify if registry objects exist
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

// Force testnet for tournament registries
const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
// Ensure we're using testnet
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

const REGISTRIES = [
  { name: 'Current', id: process.env.TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET },
  { name: 'Old', id: process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET },
  { name: 'Old Old', id: process.env.OLD_OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET },
].filter(r => r.id);

async function checkRegistry(registryId, name) {
  console.log(`\n📋 Checking ${name} Registry: ${registryId}`);
  
  try {
    const obj = await client.getObject({
      id: registryId,
      options: { showContent: true, showType: true, showOwner: true },
    });

    if (obj.error) {
      console.log(`   ❌ Error: ${obj.error.code} - ${obj.error}`);
      return;
    }

    if (!obj.data) {
      console.log(`   ❌ Object not found`);
      return;
    }

    console.log(`   ✅ Object exists!`);
    console.log(`   Type: ${obj.data.type}`);
    console.log(`   Owner: ${JSON.stringify(obj.data.owner)}`);
    console.log(`   Has content: ${!!obj.data.content}`);
    
    if (obj.data.content) {
      const fields = (obj.data.content).fields;
      console.log(`   Fields: ${Object.keys(fields).join(', ')}`);
      
      if (fields.tournaments) {
        const tournamentsTableId = fields.tournaments?.fields?.id?.id || fields.tournaments?.id?.id;
        console.log(`   Tournaments table: ${tournamentsTableId || 'NOT FOUND'}`);
        
        if (tournamentsTableId) {
          try {
            const allFields = await client.getDynamicFields({
              parentId: tournamentsTableId,
              limit: 10,
            });
            console.log(`   Tournament entries in table: ${allFields.data.length}`);
          } catch (e) {
            console.log(`   Error querying table: ${e.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
}

async function checkAll() {
  console.log('🔍 Verifying registry objects exist...');
  console.log('='.repeat(60));
  console.log('Network:', RPC_URL.includes('testnet') ? 'TESTNET' : 'MAINNET');
  console.log('='.repeat(60));

  for (const registry of REGISTRIES) {
    await checkRegistry(registry.id, registry.name);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

checkAll().catch(console.error);


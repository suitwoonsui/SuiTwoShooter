require('dotenv').config({ path: '../.env.local' });
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

async function debugLeaderboardStructure() {
  console.log('🔍 Debugging leaderboard structure for restored tournaments...\n');

  const network = process.env.SUI_NETWORK || 'testnet';
  const client = new SuiClient({
    url: network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : getFullnodeUrl('mainnet')
  });

  // Tournament IDs to check (12 and 13 were restored)
  const tournamentIds = [12, 13];

  for (const tournamentId of tournamentIds) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Tournament ID: ${tournamentId}`);
    console.log('='.repeat(60));

    try {
      // Get tournament registry - try multiple possible env var names
      const registryId = process.env.TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET 
        || process.env.TOURNAMENT_REGISTRY_OBJECT_ID
        || process.env.NEXT_PUBLIC_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET
        || process.env.NEXT_PUBLIC_TOURNAMENT_REGISTRY_OBJECT_ID;
      
      if (!registryId) {
        console.log('Available env vars with TOURNAMENT:', Object.keys(process.env).filter(k => k.includes('TOURNAMENT')));
      }
      if (!registryId) {
        console.log('❌ Tournament registry not configured');
        continue;
      }

      // Get tournament object ID from registry
      const registryObj = await client.getObject({
        id: registryId,
        options: { showContent: true },
      });

      if (!registryObj.data?.content) {
        console.log('❌ Could not read tournament registry');
        continue;
      }

      const registryFields = registryObj.data.content.fields;
      const tournamentsTableId = registryFields.tournaments?.fields?.id?.id || null;

      if (!tournamentsTableId) {
        console.log('❌ Could not find tournaments table');
        continue;
      }

      // Get tournament object ID from table
      const tournamentField = await client.getDynamicFieldObject({
        parentId: tournamentsTableId,
        name: { type: 'u64', value: String(tournamentId) },
      });

      if (!tournamentField.data?.objectId) {
        console.log(`❌ Tournament ${tournamentId} not found in registry`);
        continue;
      }

      const tournamentObjectId = tournamentField.data.objectId;
      console.log(`✅ Tournament object ID: ${tournamentObjectId}`);

      // Get tournament object
      const tournamentObj = await client.getObject({
        id: tournamentObjectId,
        options: { showContent: true },
      });

      if (!tournamentObj.data?.content) {
        console.log('❌ Could not read tournament object');
        continue;
      }

      const tournamentFields = tournamentObj.data.content.fields;
      const leaderboardTableId = tournamentFields.leaderboard?.fields?.id?.id || null;

      if (!leaderboardTableId) {
        console.log('❌ Could not find leaderboard table');
        continue;
      }

      console.log(`✅ Leaderboard table ID: ${leaderboardTableId}`);

      // Get all dynamic fields from leaderboard table
      const leaderboardFields = await client.getDynamicFields({
        parentId: leaderboardTableId,
        limit: 100,
      });

      console.log(`\n📊 Found ${leaderboardFields.data.length} leaderboard entries\n`);

      for (let i = 0; i < Math.min(leaderboardFields.data.length, 5); i++) {
        const field = leaderboardFields.data[i];
        const playerAddress = typeof field.name === 'object' && 'value' in field.name
          ? String(field.name.value)
          : String(field.name);

        console.log(`\n--- Entry ${i + 1} ---`);
        console.log(`Player Address: ${playerAddress}`);
        console.log(`Field Object ID: ${field.objectId}`);

        try {
          // Try getDynamicFieldObject first
          const dynamicFieldObj = await client.getDynamicFieldObject({
            parentId: leaderboardTableId,
            name: field.name,
          });

          console.log('\n📦 Using getDynamicFieldObject:');
          if (dynamicFieldObj.data?.content) {
            const content = dynamicFieldObj.data.content;
            console.log('Content type:', dynamicFieldObj.data.type);
            console.log('Content structure:', JSON.stringify(content, null, 2));
            
            // Try to extract value
            const fields = content.fields || content.value?.fields || {};
            console.log('\n📈 Extracted fields:');
            console.log('  - value:', fields.value, '(type:', typeof fields.value, ')');
            console.log('  - player_name:', fields.player_name, '(type:', typeof fields.player_name, ')');
            
            if (fields.player_name && Array.isArray(fields.player_name)) {
              const nameBytes = new Uint8Array(fields.player_name);
              const decodedName = new TextDecoder().decode(nameBytes).trim();
              console.log('  - Decoded name:', decodedName);
            }
          }
        } catch (error) {
          console.log('❌ getDynamicFieldObject failed:', error.message);
        }

        try {
          // Try direct object read
          const entryObj = await client.getObject({
            id: field.objectId,
            options: { showContent: true, showType: true },
          });

          console.log('\n📦 Using getObject (direct):');
          if (entryObj.data?.content) {
            const content = entryObj.data.content;
            console.log('Object type:', entryObj.data.type);
            console.log('Content structure:', JSON.stringify(content, null, 2));
            
            const fields = content.fields || {};
            console.log('\n📈 Extracted fields:');
            console.log('  - value:', fields.value, '(type:', typeof fields.value, ')');
            console.log('  - player_name:', fields.player_name, '(type:', typeof fields.player_name, ')');
            
            if (fields.player_name && Array.isArray(fields.player_name)) {
              const nameBytes = new Uint8Array(fields.player_name);
              const decodedName = new TextDecoder().decode(nameBytes).trim();
              console.log('  - Decoded name:', decodedName);
            }
          }
        } catch (error) {
          console.log('❌ getObject failed:', error.message);
        }
      }

      if (leaderboardFields.data.length > 5) {
        console.log(`\n... and ${leaderboardFields.data.length - 5} more entries`);
      }

    } catch (error) {
      console.error(`❌ Error debugging tournament ${tournamentId}:`, error.message);
      console.error(error.stack);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Debug complete');
  console.log('='.repeat(60));
}

debugLeaderboardStructure().catch(console.error);


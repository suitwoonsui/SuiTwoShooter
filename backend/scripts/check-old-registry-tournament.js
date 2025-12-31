/**
 * Script to check a specific tournament in the old registry
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : 12;

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

const OLD_REGISTRY_ID = process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '';

if (!OLD_REGISTRY_ID) {
  console.error('❌ Missing OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET');
  process.exit(1);
}

async function checkTournament() {
  console.log('🔍 Checking tournament', TOURNAMENT_ID, 'in old registry...');
  console.log('='.repeat(60));
  console.log('Old Registry ID:', OLD_REGISTRY_ID);
  console.log('='.repeat(60));

  try {
    // 1. Get registry
    const registryObj = await client.getObject({
      id: OLD_REGISTRY_ID,
      options: { showContent: true },
    });

    if (!registryObj.data?.content) {
      console.error('❌ Registry not found');
      return;
    }

    const fields = (registryObj.data.content).fields;
    const tournamentsTableId = fields.tournaments?.fields?.id?.id;

    if (!tournamentsTableId) {
      console.error('❌ Tournaments table not found');
      return;
    }

    console.log('✅ Found tournaments table:', tournamentsTableId);

    // 2. Get tournament
    // u64 values need to be strings in the Sui SDK
    const tournamentKey = {
      type: 'u64',
      value: String(TOURNAMENT_ID),
    };

    const tournamentField = await client.getDynamicFieldObject({
      parentId: tournamentsTableId,
      name: tournamentKey,
    });

    if (!tournamentField.data) {
      console.error(`❌ Tournament ${TOURNAMENT_ID} not found in old registry`);
      return;
    }

    // The dynamic field object contains the tournament ID
    // We need to read the field object to get the actual tournament object ID
    let tournamentObjectId = tournamentField.data.objectId;
    
    // Read the field object to extract the tournament ID
    const fieldObj = await client.getObject({
      id: tournamentField.data.objectId,
      options: { showContent: true, showType: true },
    });

    if (fieldObj.data?.content) {
      const fieldFields = (fieldObj.data.content).fields;
      // The value field contains the tournament object ID
      if (fieldFields.value) {
        if (typeof fieldFields.value === 'string') {
          tournamentObjectId = fieldFields.value;
        } else if (fieldFields.value.fields?.id) {
          tournamentObjectId = fieldFields.value.fields.id;
        } else if (fieldFields.value.id) {
          tournamentObjectId = typeof fieldFields.value.id === 'string' 
            ? fieldFields.value.id 
            : fieldFields.value.id.id;
        }
      }
    }

    console.log(`✅ Tournament ${TOURNAMENT_ID} found: ${tournamentObjectId}`);

    // 3. Read tournament object
    const tournamentObj = await client.getObject({
      id: tournamentObjectId,
      options: { showContent: true, showType: true },
    });

    if (!tournamentObj.data?.content) {
      console.error('❌ Tournament object has no content');
      return;
    }

    const tournamentFields = (tournamentObj.data.content).fields;
    
    // Decode name
    const nameBytes = tournamentFields.name || [];
    const name = new TextDecoder().decode(new Uint8Array(nameBytes));

    console.log('\n📊 Tournament Info:');
    console.log('   Name:', name);
    console.log('   Category:', tournamentFields.category);
    console.log('   Type:', tournamentObj.data.type);

    // 4. Check leaderboard table
    const leaderboardTableId = tournamentFields.leaderboard?.fields?.id?.id || tournamentFields.leaderboard?.id?.id;
    
    if (!leaderboardTableId) {
      console.log('\n⚠️  No leaderboard table found');
      return;
    }

    console.log('\n📋 Leaderboard Table ID:', leaderboardTableId);

    const leaderboardFields = await client.getDynamicFields({
      parentId: leaderboardTableId,
      limit: 1000,
    });

    console.log(`\n📊 Leaderboard Entries: ${leaderboardFields.data.length}`);

    if (leaderboardFields.data.length === 0) {
      console.log('⚠️  Leaderboard table is empty');
      return;
    }

    console.log('\n📋 Reading leaderboard entries...\n');

    const entries = [];
    for (let i = 0; i < Math.min(leaderboardFields.data.length, 20); i++) {
      const field = leaderboardFields.data[i];
      
      try {
        const entryField = await client.getDynamicFieldObject({
          parentId: leaderboardTableId,
          name: field.name,
        });

        if (entryField.data?.content) {
          const entryContent = entryField.data.content;
          const address = typeof field.name === 'object' && 'value' in field.name
            ? String(field.name.value)
            : String(field.name);

          // Check structure - old contract stored Table<address, u64> (just score)
          // New contract stores Table<address, LeaderboardEntry> (score + name)
          let score = 0;
          let playerName = '';

          // Try to extract score
          if (entryContent.fields) {
            // Could be LeaderboardEntry { value: u64, player_name: vector<u8> }
            if (entryContent.fields.value !== undefined) {
              score = Number(entryContent.fields.value);
            }
            // Or could be just u64 directly
            if (typeof entryContent.fields === 'number') {
              score = Number(entryContent.fields);
            }
            // Check for player_name
            if (entryContent.fields.player_name) {
              const nameBytes = Array.isArray(entryContent.fields.player_name)
                ? entryContent.fields.player_name
                : [];
              playerName = new TextDecoder().decode(new Uint8Array(nameBytes)).trim();
            }
          } else if (typeof entryContent === 'object' && 'value' in entryContent) {
            // Direct u64 value
            score = Number(entryContent.value);
          } else if (typeof entryContent === 'number' || typeof entryContent === 'string') {
            score = Number(entryContent);
          }

          entries.push({
            address,
            score,
            playerName: playerName || '(no name)',
            rawContent: JSON.stringify(entryContent, null, 2).substring(0, 200),
          });

          console.log(`${i + 1}. ${address.substring(0, 10)}... | Score: ${score} | Name: ${playerName || '(no name)'}`);
        }
      } catch (error) {
        console.error(`   Error reading entry ${i + 1}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Found ${entries.length} leaderboard entries`);
    if (entries.length > 0) {
      console.log('\n📊 Sample entry structure:');
      console.log(entries[0].rawContent);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkTournament().catch(console.error);


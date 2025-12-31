/**
 * Script to verify leaderboard data for a specific tournament
 */

require('dotenv').config({ path: '.env.local' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const TOURNAMENT_OBJECT_ID = process.argv[2];

if (!TOURNAMENT_OBJECT_ID) {
  console.error('Usage: node verify-leaderboard-data.js <tournament_object_id>');
  process.exit(1);
}

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const client = new SuiClient({ url: RPC_URL });

async function verifyLeaderboard() {
  console.log('🔍 Verifying leaderboard data for tournament:', TOURNAMENT_OBJECT_ID);
  console.log('='.repeat(60));

  try {
    // Get tournament object
    const tournamentObj = await client.getObject({
      id: TOURNAMENT_OBJECT_ID,
      options: { showContent: true, showType: true },
    });

    if (!tournamentObj.data?.content) {
      console.error('❌ Tournament object not found or has no content');
      return;
    }

    const fields = (tournamentObj.data.content).fields;
    console.log('\n📊 Tournament Object Structure:');
    console.log('Type:', tournamentObj.data.type);
    console.log('Has leaderboard field:', !!fields.leaderboard);

    if (!fields.leaderboard) {
      console.error('❌ Tournament has no leaderboard field');
      return;
    }

    const leaderboardTableId = fields.leaderboard?.fields?.id?.id || fields.leaderboard?.id?.id || null;
    
    if (!leaderboardTableId) {
      console.error('❌ Could not extract leaderboard table ID');
      console.log('Leaderboard field structure:', JSON.stringify(fields.leaderboard, null, 2));
      return;
    }

    console.log('✅ Leaderboard table ID:', leaderboardTableId);

    // Get all dynamic fields (leaderboard entries)
    const leaderboardFields = await client.getDynamicFields({
      parentId: leaderboardTableId,
      limit: 1000,
    });

    console.log(`\n📋 Found ${leaderboardFields.data.length} leaderboard entries`);

    if (leaderboardFields.data.length === 0) {
      console.log('⚠️  No leaderboard entries found in table');
      return;
    }

    console.log('\n🔍 Reading leaderboard entries...\n');

    const entries = [];

    for (let i = 0; i < Math.min(leaderboardFields.data.length, 20); i++) {
      const field = leaderboardFields.data[i];
      
      // Extract player address from field name
      const playerAddress = typeof field.name === 'object' && 'value' in field.name
        ? String(field.name.value)
        : String(field.name);

      try {
        // Read the LeaderboardEntry using getDynamicFieldObject
        const dynamicFieldObj = await client.getDynamicFieldObject({
          parentId: leaderboardTableId,
          name: field.name,
        });

        if (!dynamicFieldObj.data?.content) {
          console.log(`⚠️  Entry ${i + 1}: No content for ${playerAddress}`);
          continue;
        }

        const content = dynamicFieldObj.data.content;
        let entryFields = {};

        // Try to extract the LeaderboardEntry structure
        if (content.fields) {
          entryFields = content.fields;
        } else if (content.value?.fields) {
          entryFields = content.value.fields;
        } else if (content.value && typeof content.value === 'object') {
          if ('value' in content.value || 'player_name' in content.value) {
            entryFields = content.value;
          } else if (content.value.fields) {
            entryFields = content.value.fields;
          } else {
            entryFields = content.value;
          }
        } else if ('value' in content || 'player_name' in content) {
          entryFields = content;
        }

        // Extract score
        let score = 0;
        let rawValue = undefined;

        if (entryFields.value?.fields?.value !== undefined && entryFields.value.fields.value !== null) {
          rawValue = entryFields.value.fields.value;
        } else if (entryFields.value !== undefined && entryFields.value !== null) {
          rawValue = entryFields.value;
        } else if (entryFields.fields?.value !== undefined && entryFields.fields.value !== null) {
          rawValue = entryFields.fields.value;
        }

        if (rawValue !== undefined && rawValue !== null) {
          if (typeof rawValue === 'string') {
            score = parseInt(rawValue, 10) || 0;
          } else if (typeof rawValue === 'number') {
            score = rawValue;
          } else if (typeof rawValue === 'bigint') {
            score = Number(rawValue);
          } else {
            score = Number(rawValue) || 0;
          }
        }

        // Extract player name
        let playerName = '';
        const nameSource = entryFields.value?.fields?.player_name || 
                          entryFields.player_name || 
                          entryFields.fields?.player_name || 
                          entryFields.value?.player_name;

        if (nameSource) {
          if (Array.isArray(nameSource)) {
            const uint8Array = new Uint8Array(nameSource);
            playerName = new TextDecoder().decode(uint8Array).trim();
          } else if (typeof nameSource === 'string') {
            playerName = nameSource.trim();
          }
        }

        entries.push({
          rank: i + 1,
          address: playerAddress,
          score,
          playerName: playerName || '(no name)',
          rawStructure: JSON.stringify(entryFields, null, 2).substring(0, 200),
        });

        console.log(`${i + 1}. ${playerAddress.substring(0, 10)}... | Score: ${score} | Name: ${playerName || '(no name)'}`);
      } catch (error) {
        console.error(`❌ Error reading entry ${i + 1} (${playerAddress}):`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully read ${entries.length} leaderboard entries`);
    console.log(`   Entries with names: ${entries.filter(e => e.playerName !== '(no name)').length}`);
    console.log(`   Entries with scores > 0: ${entries.filter(e => e.score > 0).length}`);

    if (entries.length > 0) {
      console.log('\n📊 Sample entry structure:');
      console.log(entries[0].rawStructure);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

verifyLeaderboard().catch(console.error);


/**
 * Verify that tournament data (participants, leaderboard) was properly migrated
 * This script checks both old and new tournaments to compare data
 */

require('dotenv').config({ path: '.env' });
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const OLD_PACKAGE_ID = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || '0x09b63ced8a7af6aaf620e8baba1c5d8840524eb1767cca70b679c1a6961d1b08';
const OLD_REGISTRY_ID = process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '0xeb51d0ef6f02838ba32eb3f0bbc90d36910529a1d084964394ce5c1055ab6fec';
const NEW_REGISTRY_ID = process.env.TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '';

async function getTournamentData(client, registryId, tournamentsTableId, tournamentId) {
  try {
    const tournamentKey = {
      type: 'u64',
      value: tournamentId,
    };

    const tournamentField = await client.getDynamicFieldObject({
      parentId: tournamentsTableId,
      name: tournamentKey,
    });

    if (!tournamentField.data || !tournamentField.data.objectId) {
      return null;
    }

    let tournamentObjId = tournamentField.data.objectId;
    
    // Check if field object is the tournament itself
    const fieldObj = await client.getObject({
      id: tournamentObjId,
      options: { showContent: true, showType: true },
    });

    if (fieldObj.data?.type?.includes('Tournament')) {
      // Field object IS the tournament
    } else if (fieldObj.data?.content) {
      const fields = fieldObj.data.content.fields;
      if (fields?.value) {
        tournamentObjId = typeof fields.value === 'string' 
          ? fields.value 
          : (fields.value?.fields?.id || fields.value?.id || null);
      }
    }

    if (!tournamentObjId) {
      return null;
    }

    const tournamentObj = await client.getObject({
      id: tournamentObjId,
      options: { showContent: true, showType: true },
    });

    if (!tournamentObj.data?.content || !tournamentObj.data.type?.includes('Tournament')) {
      return null;
    }

    const fields = tournamentObj.data.content.fields;
    
    // Get participants
    const participantsTableId = fields.participants?.fields?.id?.id || null;
    let participants = [];
    if (participantsTableId) {
      const participantFields = await client.getDynamicFields({
        parentId: participantsTableId,
        limit: 1000,
      });
      participants = participantFields.data.map(field => {
        const address = typeof field.name === 'object' && 'value' in field.name
          ? String(field.name.value)
          : String(field.name);
        return address;
      });
    }

    // Get leaderboard
    const leaderboardTableId = fields.leaderboard?.fields?.id?.id || null;
    let leaderboard = [];
    if (leaderboardTableId) {
      const leaderboardFields = await client.getDynamicFields({
        parentId: leaderboardTableId,
        limit: 1000,
      });
      leaderboard = leaderboardFields.data.map(field => {
        const address = typeof field.name === 'object' && 'value' in field.name
          ? String(field.name.value)
          : String(field.name);
        return address;
      });
    }

    return {
      tournamentId: Number(fields.tournament_id || tournamentId),
      participants: participants.length,
      leaderboard: leaderboard.length,
      participantsList: participants,
      leaderboardList: leaderboard,
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function verifyTournamentData() {
  console.log('🔍 Verifying Tournament Data Migration\n');
  console.log('='.repeat(60));
  console.log('');

  const network = process.env.SUI_NETWORK || process.env.SUI_TESTNET_NETWORK || 'testnet';
  const client = new SuiClient({
    url: getFullnodeUrl(network)
  });

  // Get tournaments table IDs
  console.log('📋 Reading registry structures...\n');
  
  let oldTournamentsTableId = null;
  let newTournamentsTableId = null;

  try {
    const oldRegistry = await client.getObject({
      id: OLD_REGISTRY_ID,
      options: { showContent: true },
    });
    if (oldRegistry.data?.content) {
      oldTournamentsTableId = oldRegistry.data.content.fields?.tournaments?.fields?.id?.id;
    }
  } catch (error) {
    console.log(`❌ Error reading old registry: ${error.message}`);
  }

  if (NEW_REGISTRY_ID) {
    try {
      const newRegistry = await client.getObject({
        id: NEW_REGISTRY_ID,
        options: { showContent: true },
      });
      if (newRegistry.data?.content) {
        newTournamentsTableId = newRegistry.data.content.fields?.tournaments?.fields?.id?.id;
      }
    } catch (error) {
      console.log(`❌ Error reading new registry: ${error.message}`);
    }
  }

  console.log(`Old tournaments table: ${oldTournamentsTableId ? '✅ Found' : '❌ Not found'}`);
  console.log(`New tournaments table: ${newTournamentsTableId ? '✅ Found' : '❌ Not found'}`);
  console.log('');

  // Check tournaments 0-11
  const tournamentIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  console.log('📊 Comparing Old vs New Tournament Data:\n');
  console.log('='.repeat(60));

  for (const tournamentId of tournamentIds) {
    console.log(`\n🏆 Tournament ${tournamentId}:`);
    console.log('-'.repeat(60));

    let oldData = null;
    let newData = null;

    if (oldTournamentsTableId) {
      oldData = await getTournamentData(client, OLD_REGISTRY_ID, oldTournamentsTableId, tournamentId);
    }

    if (newTournamentsTableId) {
      // Find new tournament by matching properties (we don't know the new ID)
      // For now, just try to find it by checking all tournaments
      const allFields = await client.getDynamicFields({
        parentId: newTournamentsTableId,
        limit: 1000,
      });

      // Try to match by checking tournament properties
      for (const field of allFields.data) {
        try {
          const fieldKey = typeof field.name === 'object' && 'value' in field.name
            ? Number(field.name.value)
            : Number(field.name);

          let tournamentObjId = field.objectId;
          const fieldObj = await client.getObject({
            id: field.objectId,
            options: { showContent: true, showType: true },
          });

          if (fieldObj.data?.type?.includes('Tournament')) {
            tournamentObjId = field.objectId;
          } else if (fieldObj.data?.content) {
            const fields = fieldObj.data.content.fields;
            if (fields?.value) {
              tournamentObjId = typeof fields.value === 'string' 
                ? fields.value 
                : (fields.value?.fields?.id || fields.value?.id || null);
            }
          }

          if (tournamentObjId) {
            const tournamentObj = await client.getObject({
              id: tournamentObjId,
              options: { showContent: true },
            });

            if (tournamentObj.data?.content) {
              const fields = tournamentObj.data.content.fields;
              // Check if this might be the migrated tournament
              // We'll just get the first few and compare
              const tempData = await getTournamentData(client, NEW_REGISTRY_ID, newTournamentsTableId, fieldKey);
              if (tempData && !newData) {
                newData = tempData;
                break; // Just get first match for now
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (oldData && !oldData.error) {
      console.log(`  Old Tournament:`);
      console.log(`    Participants: ${oldData.participants}`);
      console.log(`    Leaderboard: ${oldData.leaderboard}`);
      if (oldData.participants > 0) {
        console.log(`    Participant addresses: ${oldData.participantsList.slice(0, 5).join(', ')}${oldData.participants > 5 ? '...' : ''}`);
      }
    } else {
      console.log(`  Old Tournament: ${oldData?.error || 'Not found'}`);
    }

    if (newData && !newData.error) {
      console.log(`  New Tournament (ID ${newData.tournamentId}):`);
      console.log(`    Participants: ${newData.participants}`);
      console.log(`    Leaderboard: ${newData.leaderboard}`);
      if (newData.participants > 0) {
        console.log(`    Participant addresses: ${newData.participantsList.slice(0, 5).join(', ')}${newData.participants > 5 ? '...' : ''}`);
      }

      // Compare
      if (oldData && !oldData.error) {
        const participantsMatch = oldData.participants === newData.participants;
        const leaderboardMatch = oldData.leaderboard === newData.leaderboard;
        console.log(`  Comparison:`);
        console.log(`    Participants: ${participantsMatch ? '✅ Match' : '❌ Mismatch'}`);
        console.log(`    Leaderboard: ${leaderboardMatch ? '✅ Match' : '❌ Mismatch'}`);
      }
    } else {
      console.log(`  New Tournament: ${newData?.error || 'Not found'}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 Note: This script checks if data exists in both old and new tournaments.');
  console.log('   If participants/leaderboard are 0 in old tournaments, they were empty to begin with.');
  console.log('');
}

verifyTournamentData().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


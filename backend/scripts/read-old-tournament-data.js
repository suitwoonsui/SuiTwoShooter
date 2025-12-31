/**
 * Script to read tournament data from the old contract
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (TOURNAMENT_ID === null || isNaN(TOURNAMENT_ID)) {
  console.error('Usage: node read-old-tournament-data.js <tournament_id>');
  process.exit(1);
}

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const OLD_PACKAGE_ID = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || '';
const OLD_REGISTRY_ID = process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '';

if (!OLD_PACKAGE_ID || !OLD_REGISTRY_ID) {
  console.error('❌ Missing environment variables:');
  console.error('   OLD_GAME_SCORE_CONTRACT_TESTNET:', OLD_PACKAGE_ID || 'NOT SET');
  console.error('   OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET:', OLD_REGISTRY_ID || 'NOT SET');
  console.error('\n💡 Make sure these are set in .env.local');
  process.exit(1);
}

const client = new SuiClient({ url: RPC_URL });

async function readOldTournament() {
  console.log('🔍 Reading tournament data from old contract...');
  console.log('='.repeat(60));
  console.log('Tournament ID:', TOURNAMENT_ID);
  console.log('Old Package ID:', OLD_PACKAGE_ID);
  console.log('Old Registry ID:', OLD_REGISTRY_ID);
  console.log('='.repeat(60));

  try {
    // 1. Get the tournament object from the registry table directly
    console.log('\n📋 Step 1: Reading registry table...');
    console.log('   Registry ID:', OLD_REGISTRY_ID);
    
    let registryObj;
    try {
      registryObj = await client.getObject({
        id: OLD_REGISTRY_ID,
        options: { showContent: true, showType: true },
      });
    } catch (error) {
      console.error('❌ Error reading registry object:', error.message);
      console.error('   This might mean the object ID is incorrect or the object no longer exists');
      return;
    }

    if (!registryObj.data?.content) {
      console.error('❌ Registry object has no content');
      console.error('   Object exists:', !!registryObj.data);
      console.error('   Object type:', registryObj.data?.type);
      return;
    }
    
    console.log('✅ Registry object found');
    console.log('   Type:', registryObj.data.type);

    const registryFields = (registryObj.data.content).fields;
    const tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;

    if (!tournamentsTableId) {
      console.error('❌ Tournaments table not found in registry');
      return;
    }

    console.log('✅ Found tournaments table:', tournamentsTableId);

    // 2. Query the tournament from the table
    console.log('\n📋 Step 2: Querying tournament from table...');
    const tournamentKey = {
      type: 'u64',
      value: TOURNAMENT_ID,
    };

    const tournamentField = await client.getDynamicFieldObject({
      parentId: tournamentsTableId,
      name: tournamentKey,
    });

    if (!tournamentField.data?.objectId) {
      console.error('❌ Tournament not found in table');
      return;
    }

    const tournamentObjectId = tournamentField.data.objectId;
    console.log('✅ Found tournament object:', tournamentObjectId);

    // 3. Read the tournament object
    console.log('\n📋 Step 3: Reading tournament object...');
    const tournamentObj = await client.getObject({
      id: tournamentObjectId,
      options: { showContent: true, showType: true },
    });

    if (!tournamentObj.data?.content) {
      console.error('❌ Tournament object has no content');
      return;
    }

    const fields = (tournamentObj.data.content).fields;
    
    // Decode name
    const nameBytes = fields.name || [];
    const name = new TextDecoder().decode(new Uint8Array(nameBytes));

    console.log('\n📊 Tournament Data:');
    console.log('='.repeat(60));
    console.log('Name:', name);
    console.log('Category:', fields.category);
    console.log('Start Time:', new Date(Number(fields.start_time || 0)).toISOString());
    console.log('End Time:', new Date(Number(fields.end_time || 0)).toISOString());
    console.log('Entry Fee Tickets:', fields.entry_fee_tickets);
    console.log('Prize Pool USD Cents:', fields.prize_pool_usd_cents);
    console.log('Distribution Status:', fields.distribution_status);

    // 4. Read participants table
    console.log('\n📋 Step 4: Reading participants table...');
    const participantsTableId = fields.participants?.fields?.id?.id || fields.participants?.id?.id;
    
    if (participantsTableId) {
      const participantsFields = await client.getDynamicFields({
        parentId: participantsTableId,
        limit: 1000,
      });

      console.log(`✅ Found ${participantsFields.data.length} participants`);
      
      const participants = [];
      for (let i = 0; i < Math.min(participantsFields.data.length, 10); i++) {
        const field = participantsFields.data[i];
        const participantField = await client.getDynamicFieldObject({
          parentId: participantsTableId,
          name: field.name,
        });

        if (participantField.data?.content) {
          const participantFields = (participantField.data.content).fields;
          const address = typeof field.name === 'object' && 'value' in field.name
            ? String(field.name.value)
            : String(field.name);
          
          participants.push({
            address,
            ticket_id: participantFields.ticket_id,
            ticket_value_usd_cents: participantFields.ticket_value_usd_cents,
            entered_at: participantFields.entered_at,
          });
        }
      }

      console.log('\n📋 Sample Participants (first 10):');
      participants.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.address.substring(0, 10)}... | Ticket: ${p.ticket_id} | Value: ${p.ticket_value_usd_cents}¢`);
      });
    } else {
      console.log('⚠️  No participants table found');
    }

    // 5. Read leaderboard table
    console.log('\n📋 Step 5: Reading leaderboard table...');
    const leaderboardTableId = fields.leaderboard?.fields?.id?.id || fields.leaderboard?.id?.id;
    
    if (leaderboardTableId) {
      const leaderboardFields = await client.getDynamicFields({
        parentId: leaderboardTableId,
        limit: 1000,
      });

      console.log(`✅ Found ${leaderboardFields.data.length} leaderboard entries`);
      
      const leaderboard = [];
      for (let i = 0; i < Math.min(leaderboardFields.data.length, 10); i++) {
        const field = leaderboardFields.data[i];
        
        try {
          const leaderboardField = await client.getDynamicFieldObject({
            parentId: leaderboardTableId,
            name: field.name,
          });

          if (leaderboardField.data?.content) {
            const entryFields = (leaderboardField.data.content).fields;
            const address = typeof field.name === 'object' && 'value' in field.name
              ? String(field.name.value)
              : String(field.name);
            
            // Old tournaments stored just u64 (score), not LeaderboardEntry
            // Check if it's a simple u64 or a LeaderboardEntry struct
            let score = 0;
            if (entryFields.value !== undefined) {
              score = Number(entryFields.value);
            } else if (typeof entryFields === 'number' || typeof entryFields === 'string') {
              score = Number(entryFields);
            }

            leaderboard.push({
              address,
              score,
            });
          }
        } catch (error) {
          console.error(`   Error reading entry ${i + 1}:`, error.message);
        }
      }

      console.log('\n📋 Sample Leaderboard (first 10):');
      leaderboard.forEach((l, i) => {
        console.log(`   ${i + 1}. ${l.address.substring(0, 10)}... | Score: ${l.score}`);
      });
    } else {
      console.log('⚠️  No leaderboard table found');
    }

    // 6. Query TournamentScoreUpdated events for player names
    console.log('\n📋 Step 6: Querying TournamentScoreUpdated events for player names...');
    const scoreEvents = await client.queryEvents({
      query: {
        MoveModule: {
          package: OLD_PACKAGE_ID,
          module: 'tournaments',
        },
      },
      limit: 1000,
      order: 'descending',
    });

    const nameMap = new Map();
    for (const event of scoreEvents.data) {
      if (event.type?.includes('TournamentScoreUpdated')) {
        const eventData = event.parsedJson;
        if (Number(eventData.tournament_id) === TOURNAMENT_ID) {
          const player = typeof eventData.player === 'string' 
            ? eventData.player 
            : String(eventData.player?.[0] || '');
          
          if (player && eventData.player_name) {
            const nameBytes = Array.isArray(eventData.player_name) 
              ? eventData.player_name 
              : [];
            const playerName = new TextDecoder().decode(new Uint8Array(nameBytes)).trim();
            if (playerName && !nameMap.has(player.toLowerCase())) {
              nameMap.set(player.toLowerCase(), playerName);
            }
          }
        }
      }
    }

    console.log(`✅ Found ${nameMap.size} player names from events`);
    if (nameMap.size > 0) {
      console.log('\n📋 Player Names:');
      Array.from(nameMap.entries()).slice(0, 10).forEach(([addr, name]) => {
        console.log(`   ${addr.substring(0, 10)}... : ${name}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Tournament data read successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

readOldTournament().catch(console.error);


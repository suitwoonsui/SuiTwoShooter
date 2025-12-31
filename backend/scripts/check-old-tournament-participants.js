/**
 * Script to check participants in the old tournament
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

async function checkParticipants() {
  console.log('🔍 Checking participants for tournament', TOURNAMENT_ID, 'in old registry...');
  console.log('='.repeat(60));

  try {
    // 1. Get registry
    const registryObj = await client.getObject({
      id: OLD_REGISTRY_ID,
      options: { showContent: true },
    });

    const fields = (registryObj.data.content).fields;
    const tournamentsTableId = fields.tournaments?.fields?.id?.id;

    // 2. Get tournament
    const tournamentKey = {
      type: 'u64',
      value: String(TOURNAMENT_ID),
    };

    const tournamentField = await client.getDynamicFieldObject({
      parentId: tournamentsTableId,
      name: tournamentKey,
    });

    // Extract tournament object ID
    let tournamentObjectId = tournamentField.data.objectId;
    const fieldObj = await client.getObject({
      id: tournamentField.data.objectId,
      options: { showContent: true },
    });

    if (fieldObj.data?.content) {
      const fieldFields = (fieldObj.data.content).fields;
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
      options: { showContent: true },
    });

    const tournamentFields = (tournamentObj.data.content).fields;
    
    // Decode name
    const nameBytes = tournamentFields.name || [];
    const name = new TextDecoder().decode(new Uint8Array(nameBytes));
    console.log(`📊 Tournament: "${name}"`);

    // 4. Check participants table
    const participantsTableId = tournamentFields.participants?.fields?.id?.id || tournamentFields.participants?.id?.id;
    
    if (!participantsTableId) {
      console.log('\n⚠️  No participants table found');
      return;
    }

    console.log(`\n📋 Participants Table ID: ${participantsTableId}`);

    const participantsFields = await client.getDynamicFields({
      parentId: participantsTableId,
      limit: 1000,
    });

    console.log(`\n📊 Participants: ${participantsFields.data.length}`);

    if (participantsFields.data.length === 0) {
      console.log('⚠️  Participants table is empty');
      return;
    }

    console.log('\n📋 Participant addresses:');
    participantsFields.data.forEach((field, i) => {
      const address = typeof field.name === 'object' && 'value' in field.name
        ? String(field.name.value)
        : String(field.name);
      console.log(`   ${i + 1}. ${address}`);
    });

    // 5. Check for TournamentEntered events
    const OLD_PACKAGE_ID = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || '';
    if (OLD_PACKAGE_ID) {
      console.log('\n📋 Checking TournamentEntered events...');
      const events = await client.queryEvents({
        query: {
          MoveModule: {
            package: OLD_PACKAGE_ID,
            module: 'tournaments',
          },
        },
        limit: 1000,
        order: 'descending',
      });

      const enteredEvents = events.data.filter(event => {
        if (!event.type?.includes('TournamentEntered')) return false;
        const eventData = event.parsedJson;
        return Number(eventData.tournament_id || 0) === TOURNAMENT_ID;
      });

      console.log(`   Found ${enteredEvents.length} TournamentEntered events for tournament ${TOURNAMENT_ID}`);
      
      if (enteredEvents.length > 0) {
        console.log('\n📋 Players who entered (from events):');
        enteredEvents.forEach((event, i) => {
          const eventData = event.parsedJson;
          const player = typeof eventData.player === 'string' 
            ? eventData.player 
            : String(eventData.player?.[0] || '');
          console.log(`   ${i + 1}. ${player}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Summary:');
    console.log(`   Participants in table: ${participantsFields.data.length}`);
    console.log(`   Leaderboard entries: 0 (as we saw earlier)`);
    console.log(`   Score events: 0 (as we saw earlier)`);
    console.log('\n💡 Conclusion:');
    if (participantsFields.data.length > 0) {
      console.log('   ⚠️  Tournament has participants but NO scores were submitted.');
      console.log('   This means players entered but never submitted scores.');
    } else {
      console.log('   ✅ Tournament has no participants and no scores.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkParticipants().catch(console.error);


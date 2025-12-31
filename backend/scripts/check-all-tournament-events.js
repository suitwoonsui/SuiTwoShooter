/**
 * Check all tournament events to see what data is available
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const OLD_PACKAGE_ID = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 
                       process.env.OLD_GAME_SCORE_PACKAGE_ID || 
                       process.env.OLD_GAME_SCORE_CONTRACT || '';

if (!OLD_PACKAGE_ID) {
  console.error('❌ Missing OLD_GAME_SCORE_CONTRACT_TESTNET environment variable');
  process.exit(1);
}

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

async function checkAllEvents() {
  console.log('🔍 Checking All Tournament Events');
  console.log('='.repeat(60));
  console.log(`Old Package ID: ${OLD_PACKAGE_ID}`);
  console.log(`RPC URL: ${testnetUrl}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Query all events from the tournaments module
    console.log('📋 Querying all events from tournaments module...');
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

    console.log(`   ✅ Found ${events.data.length} total events`);
    console.log('');

    // Group events by type
    const eventsByType = {};
    const tournamentsWithScores = new Set();
    const tournamentsWithEntries = new Set();

    for (const event of events.data) {
      const eventType = event.type || 'unknown';
      if (!eventsByType[eventType]) {
        eventsByType[eventType] = [];
      }
      eventsByType[eventType].push(event);

      // Check for score events
      if (eventType.includes('ScoreUpdated') || eventType.includes('Score')) {
        const eventData = event.parsedJson;
        const tournamentId = Number(eventData.tournament_id || 0);
        if (tournamentId !== 0 || eventData.tournament_id) {
          tournamentsWithScores.add(tournamentId);
        }
      }

      // Check for entry events
      if (eventType.includes('Entered') || eventType.includes('Entry')) {
        const eventData = event.parsedJson;
        const tournamentId = Number(eventData.tournament_id || 0);
        if (tournamentId !== 0 || eventData.tournament_id) {
          tournamentsWithEntries.add(tournamentId);
        }
      }
    }

    console.log('📊 Events by Type:');
    console.log('='.repeat(60));
    for (const [type, typeEvents] of Object.entries(eventsByType)) {
      console.log(`   ${type}: ${typeEvents.length} events`);
    }
    console.log('');

    // Check for TournamentScoreUpdated specifically
    const scoreUpdatedEvents = eventsByType[Object.keys(eventsByType).find(k => k.includes('ScoreUpdated'))] || [];
    
    if (scoreUpdatedEvents.length > 0) {
      console.log('📋 TournamentScoreUpdated Events Analysis:');
      console.log('='.repeat(60));
      
      const tournamentScores = {};
      
      for (const event of scoreUpdatedEvents) {
        const eventData = event.parsedJson;
        const tournamentId = Number(eventData.tournament_id || 0);
        
        if (!tournamentScores[tournamentId]) {
          tournamentScores[tournamentId] = {
            count: 0,
            players: new Set(),
            maxScore: 0,
          };
        }
        
        tournamentScores[tournamentId].count++;
        const player = typeof eventData.player === 'string' 
          ? eventData.player 
          : String(eventData.player?.[0] || '');
        tournamentScores[tournamentId].players.add(player);
        
        const score = Number(eventData.value || 0);
        if (score > tournamentScores[tournamentId].maxScore) {
          tournamentScores[tournamentId].maxScore = score;
        }
      }

      console.log(`   Found ${Object.keys(tournamentScores).length} tournaments with score events:`);
      for (const [tournamentId, data] of Object.entries(tournamentScores)) {
        console.log(`   Tournament ${tournamentId}: ${data.count} events, ${data.players.size} unique players, max score: ${data.maxScore}`);
      }
      console.log('');
    } else {
      console.log('⚠️  No TournamentScoreUpdated events found!');
      console.log('   Available event types:');
      for (const type of Object.keys(eventsByType)) {
        console.log(`      - ${type}`);
      }
      console.log('');
    }

    // Show sample events
    console.log('📋 Sample Events (first 5 of each type):');
    console.log('='.repeat(60));
    for (const [type, typeEvents] of Object.entries(eventsByType)) {
      console.log(`\n${type}:`);
      for (let i = 0; i < Math.min(5, typeEvents.length); i++) {
        const event = typeEvents[i];
        console.log(`   ${i + 1}. ${JSON.stringify(event.parsedJson, null, 2).substring(0, 200)}...`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log(`   Total events: ${events.data.length}`);
    console.log(`   Event types: ${Object.keys(eventsByType).length}`);
    console.log(`   Tournaments with score events: ${tournamentsWithScores.size}`);
    console.log(`   Tournaments with entry events: ${tournamentsWithEntries.size}`);
    
    if (tournamentsWithScores.size === 0) {
      console.log('\n⚠️  WARNING: No tournaments found with score events!');
      console.log('   This means leaderboard data might not be in events.');
      console.log('   We need to check if the data is stored elsewhere.');
    } else {
      console.log('\n✅ Found tournaments with score events!');
      console.log('   These tournaments have leaderboard data in events:');
      Array.from(tournamentsWithScores).sort((a, b) => a - b).forEach(id => {
        console.log(`      - Tournament ${id}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAllEvents().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


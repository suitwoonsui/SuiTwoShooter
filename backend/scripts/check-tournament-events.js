/**
 * Script to check TournamentScoreUpdated events for tournaments
 * This will tell us if scores were submitted but not stored in the table
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : 12;

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const OLD_PACKAGE_ID = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || '';

if (!OLD_PACKAGE_ID) {
  console.error('❌ Missing OLD_GAME_SCORE_CONTRACT_TESTNET environment variable');
  process.exit(1);
}

const client = new SuiClient({ url: testnetUrl });

async function checkEvents() {
  console.log('🔍 Checking TournamentScoreUpdated events for tournament', TOURNAMENT_ID);
  console.log('='.repeat(60));
  console.log('Old Package ID:', OLD_PACKAGE_ID);
  console.log('='.repeat(60));

  try {
    // Query all events from tournaments module
    console.log('\n📋 Querying all events from tournaments module...');
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

    console.log(`✅ Found ${events.data.length} total events from tournaments module`);
    
    // Show event types
    const eventTypes = new Map();
    events.data.forEach(event => {
      const type = event.type || 'unknown';
      eventTypes.set(type, (eventTypes.get(type) || 0) + 1);
    });
    
    console.log('\n📋 Event types found:');
    Array.from(eventTypes.entries()).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Filter for TournamentScoreUpdated events for this tournament
    const scoreEvents = events.data.filter(event => {
      if (!event.type?.includes('TournamentScoreUpdated')) return false;
      const eventData = event.parsedJson;
      return Number(eventData.tournament_id || 0) === TOURNAMENT_ID;
    });

    console.log(`\n📊 TournamentScoreUpdated events for tournament ${TOURNAMENT_ID}: ${scoreEvents.length}`);

    if (scoreEvents.length === 0) {
      console.log('⚠️  No score events found for this tournament');
      console.log('   This means no scores were ever submitted to this tournament');
      return;
    }

    console.log('\n📋 Score Events:');
    const scoreMap = new Map();
    
    scoreEvents.forEach((event, i) => {
      const eventData = event.parsedJson;
      const player = typeof eventData.player === 'string' 
        ? eventData.player 
        : String(eventData.player?.[0] || '');
      const value = Number(eventData.value || 0);
      const timestamp = Number(eventData.timestamp || 0);
      
      // Keep highest score per player
      if (!scoreMap.has(player) || scoreMap.get(player).value < value) {
        scoreMap.set(player, {
          player,
          value,
          timestamp,
          eventIndex: i,
        });
      }
    });

    console.log(`\n📊 Unique players with scores: ${scoreMap.size}`);
    console.log('\n📋 Leaderboard from events:');
    
    const sortedScores = Array.from(scoreMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    sortedScores.forEach((entry, i) => {
      console.log(`   ${i + 1}. ${entry.player.substring(0, 10)}... | Score: ${entry.value} | Time: ${new Date(entry.timestamp).toISOString()}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Summary:');
    console.log(`   Total score events: ${scoreEvents.length}`);
    console.log(`   Unique players: ${scoreMap.size}`);
    console.log(`   Scores found in events: ${sortedScores.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   Scores found in table: NO (as we saw earlier)`);
    console.log('\n💡 Conclusion:');
    if (scoreMap.size > 0) {
      console.log('   ⚠️  Scores exist in events but NOT in the table!');
      console.log('   This suggests the old contract had a bug where scores were not written to the leaderboard table.');
      console.log('   We need to reconstruct the leaderboard from events during migration.');
    } else {
      console.log('   ✅ No scores were ever submitted to this tournament.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkEvents().catch(console.error);


/**
 * Test script to verify we can find leaderboard data in TournamentScoreUpdated events
 * for old tournaments
 * 
 * Usage:
 *   node backend/scripts/test-find-leaderboard-in-events.js [tournamentId]
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : 12;
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

async function testFindLeaderboardInEvents() {
  console.log('🔍 Testing Leaderboard Data in Events');
  console.log('='.repeat(60));
  console.log(`Tournament ID: ${TOURNAMENT_ID}`);
  console.log(`Old Package ID: ${OLD_PACKAGE_ID}`);
  console.log(`RPC URL: ${testnetUrl}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Query TournamentScoreUpdated events
    console.log('📋 Step 1: Querying TournamentScoreUpdated events...');
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

    // Filter for TournamentScoreUpdated events for this tournament
    console.log(`📋 Step 2: Filtering for TournamentScoreUpdated events for tournament ${TOURNAMENT_ID}...`);
    
    const decodeBytes = (bytes) => {
      if (!bytes) return '';
      if (typeof bytes === 'string') return bytes;
      if (Array.isArray(bytes)) {
        const uint8Array = new Uint8Array(bytes);
        return new TextDecoder().decode(uint8Array).trim();
      }
      return '';
    };

    const scoreEvents = [];
    const scoreMap = new Map(); // Track highest score per player
    const nameMap = new Map(); // Track player names

    for (const event of events.data) {
      if (event.type?.includes('TournamentScoreUpdated')) {
        const eventData = event.parsedJson;
        const eventTournamentId = Number(eventData.tournament_id || 0);
        
        if (eventTournamentId === TOURNAMENT_ID) {
          const player = typeof eventData.player === 'string' 
            ? eventData.player 
            : String(eventData.player?.[0] || '');
          
          const score = Number(eventData.value || 0);
          const timestamp = Number(eventData.timestamp || 0);
          
          // Keep highest score per player
          if (!scoreMap.has(player) || scoreMap.get(player).score < score) {
            scoreMap.set(player, {
              player,
              score,
              timestamp,
              eventId: event.id.eventSeq,
            });
          }
          
          // Extract player name
          if (eventData.player_name) {
            const playerName = decodeBytes(eventData.player_name);
            if (playerName && !nameMap.has(player.toLowerCase())) {
              nameMap.set(player.toLowerCase(), playerName);
            }
          }
          
          scoreEvents.push({
            player,
            score,
            timestamp,
            playerName: eventData.player_name ? decodeBytes(eventData.player_name) : '',
            eventId: event.id.eventSeq,
          });
        }
      }
    }

    console.log(`   ✅ Found ${scoreEvents.length} TournamentScoreUpdated events for tournament ${TOURNAMENT_ID}`);
    console.log(`   ✅ Found ${scoreMap.size} unique players with scores`);
    console.log(`   ✅ Found ${nameMap.size} players with names`);
    console.log('');

    if (scoreMap.size === 0) {
      console.log('⚠️  No leaderboard data found in events for this tournament.');
      console.log('   This could mean:');
      console.log('   - No scores were ever submitted to this tournament');
      console.log('   - The tournament ID is incorrect');
      console.log('   - The old package ID is incorrect');
      return;
    }

    // Display leaderboard reconstructed from events
    console.log('📋 Step 3: Leaderboard reconstructed from events:');
    console.log('='.repeat(60));
    
    const sortedScores = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score);

    sortedScores.forEach((entry, i) => {
      const playerName = nameMap.get(entry.player.toLowerCase()) || '(no name)';
      const date = new Date(entry.timestamp).toISOString();
      console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${entry.player.substring(0, 12).padEnd(12, ' ')} | Score: ${entry.score.toString().padStart(10, ' ')} | Name: ${playerName.padEnd(20, ' ')} | ${date}`);
    });

    console.log('='.repeat(60));
    console.log('');

    // Summary
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log(`   Total events for tournament: ${scoreEvents.length}`);
    console.log(`   Unique players: ${scoreMap.size}`);
    console.log(`   Players with names: ${nameMap.size}`);
    console.log(`   Highest score: ${sortedScores[0]?.score || 0}`);
    console.log(`   Lowest score: ${sortedScores[sortedScores.length - 1]?.score || 0}`);
    console.log('');
    
    if (scoreMap.size > 0) {
      console.log('✅ SUCCESS: Leaderboard data found in events!');
      console.log('   The migration service can reconstruct the leaderboard from events.');
    } else {
      console.log('❌ FAILED: No leaderboard data found in events.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFindLeaderboardInEvents().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


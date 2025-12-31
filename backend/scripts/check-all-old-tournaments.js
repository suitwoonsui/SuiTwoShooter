/**
 * Script to check all tournaments from old contract and see which have leaderboard data
 */

require('dotenv').config({ path: '.env' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function checkAllTournaments() {
  console.log('🔍 Checking all tournaments from old contract...');
  console.log('='.repeat(60));

  try {
    // 1. Get all tournament IDs
    console.log('\n📋 Step 1: Discovering all tournaments...');
    const listResponse = await fetch(`${API_BASE_URL}/api/tournaments/migrate`);
    const listData = await listResponse.json();
    
    if (!listResponse.ok || !listData.success || !listData.tournamentIds) {
      console.error('❌ Failed to get tournament list:', listData.error || 'Unknown error');
      return;
    }

    const tournamentIds = listData.tournamentIds.sort((a, b) => a - b);
    console.log(`✅ Found ${tournamentIds.length} tournaments: ${tournamentIds.join(', ')}`);

    // 2. Read each tournament
    console.log('\n📋 Step 2: Reading tournament data...\n');
    
    const results = [];
    
    for (const tournamentId of tournamentIds) {
      try {
        const url = `${API_BASE_URL}/api/tournaments/migrate?action=read&tournamentId=${tournamentId}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok && data.success && data.tournament) {
          const tournament = data.tournament;
          results.push({
            tournamentId,
            name: tournament.name,
            participants: tournament.participants.length,
            leaderboard: tournament.leaderboard.length,
            hasLeaderboardData: tournament.leaderboard.length > 0,
            distributionStatus: tournament.distribution_status,
            prizePool: tournament.prize_pool_usd_cents,
          });
          
          const status = tournament.leaderboard.length > 0 ? '✅' : '⚠️ ';
          console.log(`${status} Tournament ${tournamentId}: "${tournament.name}" | Participants: ${tournament.participants.length} | Leaderboard: ${tournament.leaderboard.length}`);
        } else {
          console.log(`❌ Tournament ${tournamentId}: Failed to read - ${data.error || 'Unknown error'}`);
          results.push({
            tournamentId,
            error: data.error || 'Unknown error',
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.log(`❌ Tournament ${tournamentId}: Error - ${error.message}`);
        results.push({
          tournamentId,
          error: error.message,
        });
      }
    }

    // 3. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    
    const withLeaderboard = results.filter(r => r.hasLeaderboardData);
    const withoutLeaderboard = results.filter(r => !r.error && !r.hasLeaderboardData);
    const errors = results.filter(r => r.error);
    
    console.log(`\n✅ Tournaments with leaderboard data: ${withLeaderboard.length}`);
    if (withLeaderboard.length > 0) {
      withLeaderboard.forEach(r => {
        console.log(`   Tournament ${r.tournamentId}: "${r.name}" - ${r.leaderboard} entries`);
      });
    }
    
    console.log(`\n⚠️  Tournaments without leaderboard data: ${withoutLeaderboard.length}`);
    if (withoutLeaderboard.length > 0) {
      withoutLeaderboard.forEach(r => {
        console.log(`   Tournament ${r.tournamentId}: "${r.name}" - ${r.participants} participants, 0 leaderboard entries`);
      });
    }
    
    if (errors.length > 0) {
      console.log(`\n❌ Tournaments with errors: ${errors.length}`);
      errors.forEach(r => {
        console.log(`   Tournament ${r.tournamentId}: ${r.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${results.length} tournaments`);
    console.log(`   With leaderboard: ${withLeaderboard.length}`);
    console.log(`   Without leaderboard: ${withoutLeaderboard.length}`);
    console.log(`   Errors: ${errors.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkAllTournaments().catch(console.error);


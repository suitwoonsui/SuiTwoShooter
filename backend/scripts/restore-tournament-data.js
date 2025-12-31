/**
 * Script to restore data for already-migrated tournaments
 * This will restore participants, leaderboard, and distribution_status
 * for tournaments that were created but had data restoration fail
 */

require('dotenv').config({ path: '.env' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function restoreTournamentData(oldTournamentId) {
  const url = `${API_BASE_URL}/api/tournaments/migrate?action=restore&oldTournamentId=${oldTournamentId}`;
  
  console.log(`\n🔄 Restoring data for tournament ${oldTournamentId}...`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    if (data.success) {
      console.log(`   ✅ Success!`);
      if (data.newTournamentId !== undefined) {
        console.log(`   📊 New tournament ID: ${data.newTournamentId}`);
      }
      if (data.digests && data.digests.length > 0) {
        console.log(`   📝 Transaction digests: ${data.digests.length}`);
        data.digests.forEach((digest, i) => {
          console.log(`      ${i + 1}. ${digest}`);
        });
      }
      return { success: true, data };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function restoreAllTournaments() {
  console.log('🚀 Starting tournament data restoration...');
  console.log('='.repeat(60));
  
  // Tournaments 0-11 that need data restoration
  const tournamentIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  const results = [];
  
  for (const tournamentId of tournamentIds) {
    const result = await restoreTournamentData(tournamentId);
    results.push({ tournamentId, ...result });
    
    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${tournamentIds.length}`);
  console.log(`❌ Failed: ${failed.length}/${tournamentIds.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successful tournaments:');
    successful.forEach(r => {
      console.log(`   Tournament ${r.tournamentId}: New ID ${r.data?.newTournamentId || 'N/A'}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed tournaments:');
    failed.forEach(r => {
      console.log(`   Tournament ${r.tournamentId}: ${r.error}`);
    });
  }
  
  console.log('');
}

restoreAllTournaments().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


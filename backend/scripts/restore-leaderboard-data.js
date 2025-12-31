/**
 * Script to restore leaderboard data for already-migrated tournaments
 * 
 * This script reads leaderboard data from old tournaments and restores it
 * to tournaments that have already been migrated but are missing leaderboard data.
 * 
 * Usage:
 *   node backend/scripts/restore-leaderboard-data.js <oldTournamentId> [newTournamentId]
 * 
 * Examples:
 *   # Restore leaderboard for tournament 5 (auto-find new tournament)
 *   node backend/scripts/restore-leaderboard-data.js 5
 * 
 *   # Restore leaderboard for tournament 5 to specific new tournament ID
 *   node backend/scripts/restore-leaderboard-data.js 5 12
 * 
 *   # Restore multiple tournaments
 *   node backend/scripts/restore-leaderboard-data.js --all
 */

require('dotenv').config({ path: '.env' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function readOldTournamentData(oldTournamentId) {
  const url = `${API_BASE_URL}/api/tournaments/migrate?action=read&tournamentId=${oldTournamentId}`;
  
  console.log(`\n📖 Reading old tournament ${oldTournamentId} data...`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    if (data.success && data.tournament) {
      const tournament = data.tournament;
      console.log(`   ✅ Tournament found: "${tournament.name}"`);
      console.log(`   📊 Participants: ${tournament.participants?.length || 0}`);
      console.log(`   🏆 Leaderboard entries: ${tournament.leaderboard?.length || 0}`);
      
      if (tournament.leaderboard && tournament.leaderboard.length > 0) {
        console.log(`   📋 Top 5 scores:`);
        tournament.leaderboard
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .forEach((entry, i) => {
            console.log(`      ${i + 1}. ${entry.address.substring(0, 10)}... | Score: ${entry.score}${entry.playerName ? ` | Name: ${entry.playerName}` : ''}`);
          });
      } else {
        console.log(`   ⚠️  No leaderboard entries found in old tournament`);
      }
      
      return { success: true, tournament };
    } else {
      throw new Error(data.error || 'Failed to read tournament data');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function restoreTournamentData(oldTournamentId, newTournamentId = null) {
  const url = newTournamentId
    ? `${API_BASE_URL}/api/tournaments/migrate?action=restore&oldTournamentId=${oldTournamentId}&newTournamentId=${newTournamentId}`
    : `${API_BASE_URL}/api/tournaments/migrate?action=restore&oldTournamentId=${oldTournamentId}`;
  
  console.log(`\n🔄 Restoring leaderboard data for tournament ${oldTournamentId}...`);
  if (newTournamentId) {
    console.log(`   Target new tournament ID: ${newTournamentId}`);
  } else {
    console.log(`   Auto-finding new tournament by matching properties...`);
  }
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

async function verifyLeaderboard(newTournamentId) {
  const url = `${API_BASE_URL}/api/tournaments/${newTournamentId}/leaderboard`;
  
  console.log(`\n🔍 Verifying leaderboard for tournament ${newTournamentId}...`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.leaderboard) {
      console.log(`   ✅ Leaderboard has ${data.leaderboard.length} entries`);
      if (data.leaderboard.length > 0) {
        console.log(`   📋 Top 5 scores:`);
        data.leaderboard.slice(0, 5).forEach((entry, i) => {
          console.log(`      ${i + 1}. ${entry.playerAddress.substring(0, 10)}... | Score: ${entry.value}${entry.playerName ? ` | Name: ${entry.playerName}` : ''}`);
        });
      }
      return { success: true, leaderboard: data.leaderboard };
    } else {
      console.log(`   ⚠️  Could not verify leaderboard: ${data.error || 'Unknown error'}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`   ⚠️  Could not verify leaderboard: ${error.message}`);
    return { success: false };
  }
}

async function restoreSingleTournament(oldTournamentId, newTournamentId = null) {
  console.log('='.repeat(60));
  console.log(`🎯 Restoring Leaderboard Data for Tournament ${oldTournamentId}`);
  console.log('='.repeat(60));
  
  // Step 1: Read old tournament data
  const readResult = await readOldTournamentData(oldTournamentId);
  if (!readResult.success) {
    console.log(`\n❌ Failed to read old tournament data. Cannot proceed.`);
    return { success: false, error: readResult.error };
  }
  
  const tournament = readResult.tournament;
  
  // Check if there's leaderboard data to restore
  if (!tournament.leaderboard || tournament.leaderboard.length === 0) {
    console.log(`\n⚠️  Old tournament has no leaderboard data to restore.`);
    return { success: false, error: 'No leaderboard data in old tournament' };
  }
  
  // Step 2: Restore the data
  const restoreResult = await restoreTournamentData(oldTournamentId, newTournamentId);
  if (!restoreResult.success) {
    console.log(`\n❌ Failed to restore tournament data.`);
    return { success: false, error: restoreResult.error };
  }
  
  const finalNewTournamentId = restoreResult.data?.newTournamentId || newTournamentId;
  
  // Step 3: Verify the leaderboard was restored
  if (finalNewTournamentId) {
    await verifyLeaderboard(finalNewTournamentId);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Restoration Complete!');
  console.log('='.repeat(60));
  
  return {
    success: true,
    oldTournamentId,
    newTournamentId: finalNewTournamentId,
    leaderboardEntries: tournament.leaderboard.length,
  };
}

async function restoreAllTournaments() {
  console.log('🚀 Starting leaderboard restoration for all tournaments...');
  console.log('='.repeat(60));
  
  // First, discover all tournaments in the old registry
  const discoverUrl = `${API_BASE_URL}/api/tournaments/migrate`;
  console.log(`\n📋 Discovering tournaments in old registry...`);
  
  try {
    const response = await fetch(discoverUrl);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to discover tournaments');
    }
    
    const tournamentIds = data.tournamentIds || [];
    console.log(`   ✅ Found ${tournamentIds.length} tournaments\n`);
    
    if (tournamentIds.length === 0) {
      console.log('⚠️  No tournaments found in old registry.');
      return;
    }
    
    const results = [];
    
    for (const oldTournamentId of tournamentIds) {
      const result = await restoreSingleTournament(oldTournamentId);
      results.push({ oldTournamentId, ...result });
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
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
        console.log(`   Old ID ${r.oldTournamentId} → New ID ${r.newTournamentId || 'N/A'} (${r.leaderboardEntries || 0} entries)`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed tournaments:');
      failed.forEach(r => {
        console.log(`   Old ID ${r.oldTournamentId}: ${r.error || 'Unknown error'}`);
      });
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ Error discovering tournaments:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node restore-leaderboard-data.js <oldTournamentId> [newTournamentId]');
    console.log('  node restore-leaderboard-data.js --all');
    console.log('');
    console.log('Examples:');
    console.log('  node restore-leaderboard-data.js 5');
    console.log('  node restore-leaderboard-data.js 5 12');
    console.log('  node restore-leaderboard-data.js --all');
    process.exit(1);
  }
  
  if (args[0] === '--all') {
    await restoreAllTournaments();
  } else {
    const oldTournamentId = parseInt(args[0], 10);
    const newTournamentId = args[1] ? parseInt(args[1], 10) : null;
    
    if (isNaN(oldTournamentId)) {
      console.error(`❌ Invalid tournament ID: ${args[0]}`);
      process.exit(1);
    }
    
    if (newTournamentId !== null && isNaN(newTournamentId)) {
      console.error(`❌ Invalid new tournament ID: ${args[1]}`);
      process.exit(1);
    }
    
    await restoreSingleTournament(oldTournamentId, newTournamentId);
  }
}

main().catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});


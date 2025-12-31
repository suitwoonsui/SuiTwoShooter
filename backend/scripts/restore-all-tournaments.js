/**
 * Script to discover and restore all tournaments from old registry
 * This will:
 * 1. Discover all tournaments in the old registry
 * 2. Restore data for each migrated tournament
 */

require('dotenv').config({ path: '.env.local' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function discoverTournaments() {
  console.log('🔍 Discovering tournaments from old registry...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/migrate`);
    const data = await response.json();
    
    if (response.ok && data.success && data.tournamentIds) {
      console.log(`✅ Found ${data.tournamentIds.length} tournaments in old registry`);
      return data.tournamentIds.sort((a, b) => a - b);
    } else {
      throw new Error(data.error || 'Failed to discover tournaments');
    }
  } catch (error) {
    console.error('❌ Error discovering tournaments:', error.message);
    throw error;
  }
}

async function restoreTournamentData(oldTournamentId) {
  const url = `${API_BASE_URL}/api/tournaments/migrate?action=restore&oldTournamentId=${oldTournamentId}`;
  
  console.log(`\n🔄 Restoring data for tournament ${oldTournamentId}...`);
  
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
  console.log('🚀 Starting tournament data restoration for all tournaments...');
  console.log('='.repeat(60));
  
  try {
    // Discover all tournaments
    const tournamentIds = await discoverTournaments();
    
    if (tournamentIds.length === 0) {
      console.log('\n✅ No tournaments found to restore.');
      return;
    }
    
    console.log(`\n📋 Tournaments to restore: ${tournamentIds.join(', ')}`);
    console.log(`\n⚠️  This will restore data for ${tournamentIds.length} tournaments.`);
    
    const results = [];
    
    for (const tournamentId of tournamentIds) {
      const result = await restoreTournamentData(tournamentId);
      results.push({ tournamentId, ...result });
      
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
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

restoreAllTournaments().catch(console.error);


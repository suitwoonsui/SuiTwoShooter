/**
 * Restore leaderboard data from the 2025-12-23 package for tournaments 12 and 13
 * This package has the leaderboard data in events that needs to be migrated to on-chain storage
 * 
 * Usage:
 *   node backend/scripts/restore-from-2025-12-23-package.js [tournamentId]
 */

require('dotenv').config({ path: '.env' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Package ID from 2025-12-23 deployment where the leaderboard data actually exists
const PACKAGE_2025_12_23 = '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352';

async function restoreFrom20251223Package(tournamentId) {
  console.log('='.repeat(80));
  console.log(`🔄 Restoring Tournament ${tournamentId} from 2025-12-23 Package`);
  console.log('='.repeat(80));
  console.log(`Source Package: ${PACKAGE_2025_12_23}`);
  console.log('');

  // Step 1: Read tournament data from 2025-12-23 package
  console.log('📖 Step 1: Reading tournament data from 2025-12-23 package...');
  const readUrl = `${API_BASE_URL}/api/tournaments/migrate?action=read&tournamentId=${tournamentId}&oldPackageId=${PACKAGE_2025_12_23}`;
  
  try {
    const readResponse = await fetch(readUrl);
    const readData = await readResponse.json();
    
    if (!readResponse.ok || !readData.success) {
      throw new Error(readData.error || 'Failed to read tournament data');
    }
    
    const tournament = readData.tournament;
    console.log(`   ✅ Tournament found: "${tournament.name}"`);
    console.log(`   📊 Participants: ${tournament.participants?.length || 0}`);
    console.log(`   🏆 Leaderboard entries: ${tournament.leaderboard?.length || 0}`);
    
    if (tournament.leaderboard && tournament.leaderboard.length > 0) {
      console.log(`   📋 Top 5 scores:`);
      tournament.leaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .forEach((entry, i) => {
          console.log(`      ${i + 1}. ${entry.address.substring(0, 12)}... | Score: ${entry.score}${entry.playerName ? ` | Name: ${entry.playerName}` : ''}`);
        });
    } else {
      console.log(`   ⚠️  No leaderboard entries found`);
      return { success: false, error: 'No leaderboard data found' };
    }
    
    console.log('');
    
    // Step 2: Restore to new contract (on-chain storage)
    console.log('💾 Step 2: Restoring leaderboard data to on-chain storage...');
    const restoreUrl = `${API_BASE_URL}/api/tournaments/migrate?action=restore&oldTournamentId=${tournamentId}&sourcePackageId=${PACKAGE_2025_12_23}`;
    
    const restoreResponse = await fetch(restoreUrl);
    const restoreData = await restoreResponse.json();
    
    if (!restoreResponse.ok || !restoreData.success) {
      throw new Error(restoreData.error || 'Failed to restore tournament data');
    }
    
    console.log(`   ✅ Success!`);
    if (restoreData.newTournamentId !== undefined) {
      console.log(`   📊 New tournament ID: ${restoreData.newTournamentId}`);
    }
    if (restoreData.digests && restoreData.digests.length > 0) {
      console.log(`   📝 Transaction digests: ${restoreData.digests.length}`);
      restoreData.digests.forEach((digest, i) => {
        console.log(`      ${i + 1}. ${digest}`);
      });
    }
    
    // Step 3: Verify the data was stored on-chain
    if (restoreData.newTournamentId) {
      console.log('');
      console.log('🔍 Step 3: Verifying on-chain storage...');
      const verifyUrl = `${API_BASE_URL}/api/tournaments/${restoreData.newTournamentId}/leaderboard`;
      
      try {
        const verifyResponse = await fetch(verifyUrl);
        const verifyData = await verifyResponse.json();
        
        if (verifyData.success && verifyData.leaderboard) {
          console.log(`   ✅ Leaderboard verified: ${verifyData.leaderboard.length} entries stored on-chain`);
          if (verifyData.leaderboard.length > 0) {
            console.log(`   📋 Top 3 on-chain entries:`);
            verifyData.leaderboard.slice(0, 3).forEach((entry, i) => {
              console.log(`      ${i + 1}. ${entry.playerAddress.substring(0, 12)}... | Score: ${entry.value}${entry.playerName ? ` | Name: ${entry.playerName}` : ''}`);
            });
          }
        } else {
          console.log(`   ⚠️  Could not verify: ${verifyData.error || 'Unknown error'}`);
        }
      } catch (verifyError) {
        console.log(`   ⚠️  Could not verify: ${verifyError.message}`);
      }
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ Migration Complete!');
    console.log('='.repeat(80));
    console.log(`Tournament ${tournamentId} leaderboard data has been migrated from events to on-chain storage.`);
    console.log('');
    
    return { success: true, data: restoreData };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function restoreAll() {
  console.log('🚀 Restoring All Tournaments from 2025-12-23 Package');
  console.log('='.repeat(80));
  console.log('');
  
  // Tournaments 12 and 13 have data in the 2025-12-23 package
  const tournamentIds = [12, 13];
  
  const results = [];
  
  for (const tournamentId of tournamentIds) {
    const result = await restoreFrom20251223Package(tournamentId);
    results.push({ tournamentId, ...result });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${tournamentIds.length}`);
  console.log(`❌ Failed: ${failed.length}/${tournamentIds.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successfully migrated:');
    successful.forEach(r => {
      console.log(`   Tournament ${r.tournamentId} → New ID ${r.data?.newTournamentId || 'N/A'}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed:');
    failed.forEach(r => {
      console.log(`   Tournament ${r.tournamentId}: ${r.error || 'Unknown error'}`);
    });
  }
  
  console.log('');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--all') {
    await restoreAll();
  } else {
    const tournamentId = parseInt(args[0], 10);
    
    if (isNaN(tournamentId)) {
      console.error(`❌ Invalid tournament ID: ${args[0]}`);
      console.log('\nUsage:');
      console.log('  node restore-from-2025-12-23-package.js <tournamentId>');
      console.log('  node restore-from-2025-12-23-package.js --all');
      process.exit(1);
    }
    
    await restoreFrom20251223Package(tournamentId);
  }
}

main().catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});


require('dotenv').config({ path: '../.env.local' });
// Use native fetch (Node.js 18+)
const fetch = globalThis.fetch || require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TOURNAMENT_IDS = [12, 13];

async function restoreTournaments() {
  console.log('🚀 Starting tournament restoration for tournaments 12 and 13...');
  console.log('============================================================\n');

  const successfulRestorations = [];
  const failedRestorations = [];

  for (const oldTournamentId of TOURNAMENT_IDS) {
    console.log(`🔄 Restoring data for tournament ${oldTournamentId}...`);
    const url = `${API_BASE_URL}/api/tournaments/migrate?action=restore&oldTournamentId=${oldTournamentId}`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`   ✅ Success!`);
        console.log(`   📊 New tournament ID: ${result.newTournamentId}`);
        console.log(`   📝 Transaction digests: ${result.digests?.length || 0}`);
        if (result.digests) {
          result.digests.forEach((digest, index) => {
            console.log(`      ${index + 1}. ${digest}`);
          });
        }
        successfulRestorations.push({ id: oldTournamentId, newId: result.newTournamentId });
      } else {
        console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
        failedRestorations.push({ id: oldTournamentId, error: result.error || 'Unknown error' });
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
      failedRestorations.push({ id: oldTournamentId, error: error.message });
    }
    console.log('\n');
  }

  console.log('============================================================');
  console.log('📊 Summary:');
  console.log('============================================================');
  console.log(`✅ Successful: ${successfulRestorations.length}/${TOURNAMENT_IDS.length}`);
  console.log(`❌ Failed: ${failedRestorations.length}/${TOURNAMENT_IDS.length}`);

  if (successfulRestorations.length > 0) {
    console.log('\n✅ Successful tournaments:');
    successfulRestorations.forEach(t => console.log(`   Tournament ${t.id}: New ID ${t.newId}`));
  }

  if (failedRestorations.length > 0) {
    console.log('\n❌ Failed tournaments:');
    failedRestorations.forEach(t => console.log(`   Tournament ${t.id}: ${t.error}`));
  }
}

restoreTournaments().catch(console.error);


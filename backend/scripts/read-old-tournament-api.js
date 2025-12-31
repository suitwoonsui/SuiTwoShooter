/**
 * Script to read tournament data from old contract via API
 */

require('dotenv').config({ path: '.env' });

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (TOURNAMENT_ID === null || isNaN(TOURNAMENT_ID)) {
  console.error('Usage: node read-old-tournament-api.js <tournament_id>');
  process.exit(1);
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function readOldTournament() {
  console.log('🔍 Reading tournament data from old contract via API...');
  console.log('='.repeat(60));
  console.log('Tournament ID:', TOURNAMENT_ID);
  console.log('API Base URL:', API_BASE_URL);
  console.log('='.repeat(60));

  try {
    // Use the migration API endpoint to get tournament IDs first
    // Then we can use the readOldTournament method via a test endpoint
    // For now, let's just call the restore endpoint which will read the data
    // Actually, let's create a simple test by calling the migration service's readOldTournament
    
    // Since we can't easily import TypeScript, let's use a workaround:
    // Call the restore endpoint which internally calls readOldTournament
    // But we'll just look at the logs or create a dedicated read endpoint
    
    console.log('\n💡 Note: This script needs a dedicated API endpoint to read old tournament data.');
    console.log('   For now, you can check the backend logs when running the restore script.');
    console.log('   Or we can add a GET endpoint to /api/tournaments/migrate?action=read&tournamentId=' + TOURNAMENT_ID);
    
    // Let's try calling a hypothetical read endpoint
    const url = `${API_BASE_URL}/api/tournaments/migrate?action=read&tournamentId=${TOURNAMENT_ID}`;
    console.log('\n📡 Attempting to call:', url);
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('\n✅ Tournament Data:');
        console.log(JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log('❌ API Error:', response.status, errorText);
        console.log('\n💡 The read endpoint may not exist yet. Check backend logs from restore operations instead.');
      }
    } catch (fetchError) {
      console.log('❌ Fetch Error:', fetchError.message);
      console.log('\n💡 The read endpoint may not exist. The migration service can read old tournaments.');
      console.log('   Check the backend code in: backend/lib/sui/migration-service/tournament-migration.ts');
      console.log('   Method: readOldTournament()');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

readOldTournament().catch(console.error);


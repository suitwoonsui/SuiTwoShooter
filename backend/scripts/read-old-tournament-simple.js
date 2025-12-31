/**
 * Script to read tournament data from old contract using the migration service
 */

require('dotenv').config({ path: '.env' });

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (TOURNAMENT_ID === null || isNaN(TOURNAMENT_ID)) {
  console.error('Usage: node read-old-tournament-simple.js <tournament_id>');
  process.exit(1);
}

// Import the migration service
async function readTournament() {
  try {
    // Use dynamic import for TypeScript modules
    const migrationModule = await import('../lib/sui/migration-service/tournament-migration.js');
    const adminModule = await import('../lib/sui/admin-wallet-service.js');
    
    const { TournamentMigrationService } = migrationModule;
    const { AdminWalletService } = adminModule;
    
    const adminWallet = new AdminWalletService();
    const migrationService = new TournamentMigrationService(adminWallet);
    
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || '';
    const oldRegistryId = process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '';
    
    if (!oldPackageId || !oldRegistryId) {
      console.error('❌ Missing environment variables');
      process.exit(1);
    }
    
    console.log('🔍 Reading tournament', TOURNAMENT_ID, 'from old contract...');
    console.log('='.repeat(60));
    
    const result = await migrationService.readOldTournament(
      oldPackageId,
      oldRegistryId,
      TOURNAMENT_ID
    );
    
    if (!result.success) {
      console.error('❌ Failed to read tournament:', result.error);
      return;
    }
    
    const tournament = result.tournament;
    
    console.log('\n📊 Tournament Data:');
    console.log('='.repeat(60));
    console.log('Tournament ID:', tournament.tournament_id);
    console.log('Name:', tournament.name);
    console.log('Category:', tournament.category);
    console.log('Start Time:', new Date(tournament.start_time).toISOString());
    console.log('End Time:', new Date(tournament.end_time).toISOString());
    console.log('Entry Fee Tickets:', tournament.entry_fee_tickets);
    console.log('Prize Pool USD Cents:', tournament.prize_pool_usd_cents);
    console.log('Distribution Status:', tournament.distribution_status);
    console.log('Object ID:', tournament.object_id);
    
    console.log('\n📋 Participants:', tournament.participants.length);
    if (tournament.participants.length > 0) {
      tournament.participants.slice(0, 10).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.address.substring(0, 10)}... | Ticket: ${p.ticket_id} | Value: ${p.ticket_value_usd_cents}¢ | Entered: ${new Date(p.entered_at).toISOString()}`);
      });
      if (tournament.participants.length > 10) {
        console.log(`   ... and ${tournament.participants.length - 10} more`);
      }
    }
    
    console.log('\n📋 Leaderboard:', tournament.leaderboard.length);
    if (tournament.leaderboard.length > 0) {
      tournament.leaderboard.slice(0, 10).forEach((l, i) => {
        console.log(`   ${i + 1}. ${l.address.substring(0, 10)}... | Score: ${l.score} | Name: ${l.playerName || '(no name)'}`);
      });
      if (tournament.leaderboard.length > 10) {
        console.log(`   ... and ${tournament.leaderboard.length - 10} more`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Tournament data read successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

readTournament().catch(console.error);


/**
 * Migration script to move existing tournaments from active_tournaments vector
 * to the new active_tournaments/past_tournaments table structure
 * 
 * This script should be run once after deploying the new contract structure
 * to migrate existing tournaments to the appropriate table.
 */

require('dotenv').config({ path: '../.env' });
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');

const GRACE_PERIOD_MS = 3600000; // 1 hour

async function migrateTournamentsToTables() {
  console.log('🚀 Starting tournament table migration...');
  console.log('============================================================\n');

  const network = process.env.SUI_NETWORK || 'testnet';
  const rpcUrl = network === 'testnet'
    ? getFullnodeUrl('testnet')
    : network === 'mainnet'
    ? getFullnodeUrl('mainnet')
    : process.env.SUI_RPC_URL;

  if (!rpcUrl) {
    throw new Error('SUI_RPC_URL or SUI_NETWORK must be set');
  }

  const client = new SuiClient({ url: rpcUrl });

  // Get admin wallet
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  if (!adminPrivateKey) {
    throw new Error('ADMIN_PRIVATE_KEY must be set');
  }

  const keypair = Ed25519Keypair.fromSecretKey(fromHEX(adminPrivateKey));
  const adminAddress = keypair.toSuiAddress();

  // Get contract addresses
  const packageId = process.env.GAME_SCORE_CONTRACT_TESTNET?.split('::')[0] || process.env.GAME_SCORE_CONTRACT_TESTNET;
  const registryId = process.env.TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET;
  const adminCapId = process.env.TOURNAMENT_ADMIN_CAP_OBJECT_ID_TESTNET;

  if (!packageId || !registryId || !adminCapId) {
    throw new Error('Missing required contract addresses. Check GAME_SCORE_CONTRACT_TESTNET, TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET, and TOURNAMENT_ADMIN_CAP_OBJECT_ID_TESTNET');
  }

  console.log('📋 Configuration:');
  console.log(`   Network: ${network}`);
  console.log(`   Package ID: ${packageId}`);
  console.log(`   Registry ID: ${registryId}`);
  console.log(`   Admin Cap ID: ${adminCapId}`);
  console.log(`   Admin Address: ${adminAddress}\n`);

  try {
    // Read registry to get all tournaments
    const registryObj = await client.getObject({
      id: registryId,
      options: { showContent: true },
    });

    if (!registryObj.data?.content) {
      throw new Error('Failed to read TournamentRegistry object');
    }

    const registryFields = registryObj.data.content.fields;

    // Get tournaments table
    const tournamentsTableId = registryFields.tournaments?.fields?.id?.id;
    if (!tournamentsTableId) {
      throw new Error('Tournaments table not found in registry');
    }

    // Get all tournaments from the tournaments table
    const tournamentsFields = await client.getDynamicFields({
      parentId: tournamentsTableId,
      limit: 1000,
    });

    console.log(`📊 Found ${tournamentsFields.data.length} tournaments to migrate\n`);

    const now = Date.now();
    let activeCount = 0;
    let pastCount = 0;
    let errorCount = 0;

    // Process each tournament
    for (const field of tournamentsFields.data) {
      const tournamentId = typeof field.name === 'object' && 'value' in field.name
        ? Number(field.name.value)
        : Number(field.name);
      const tournamentObjectId = field.objectId;

      try {
        // Get tournament object to check end time
        const tournamentObj = await client.getObject({
          id: tournamentObjectId,
          options: { showContent: true },
        });

        if (!tournamentObj.data?.content) {
          console.log(`   ⚠️  Tournament ${tournamentId}: Could not read tournament object, skipping`);
          errorCount++;
          continue;
        }

        const tournamentFields = tournamentObj.data.content.fields;
        const endTime = Number(tournamentFields.end_time);
        const distributionStatus = Number(tournamentFields.distribution_status || 0);
        const gracePeriodEnd = endTime + GRACE_PERIOD_MS;

        // Determine if tournament should be in active or past table
        const shouldBePast = gracePeriodEnd <= now || distributionStatus > 0;

        // Check if already in correct table (if tables exist)
        // Note: This assumes the new contract structure is already deployed
        // If not, we'll need to handle the migration differently

        // For now, we'll just log what should happen
        // The actual migration will happen automatically via the scheduler
        // or can be done manually via the move_tournament_to_past function

        if (shouldBePast) {
          pastCount++;
          console.log(`   ✅ Tournament ${tournamentId}: Should be in past_tournaments (endTime: ${new Date(endTime).toISOString()}, status: ${distributionStatus})`);
        } else {
          activeCount++;
          console.log(`   ✅ Tournament ${tournamentId}: Should be in active_tournaments (endTime: ${new Date(endTime).toISOString()})`);
        }
      } catch (error) {
        console.log(`   ❌ Tournament ${tournamentId}: Error - ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n============================================================');
    console.log('📊 Migration Summary:');
    console.log('============================================================');
    console.log(`✅ Should be active: ${activeCount}`);
    console.log(`✅ Should be past: ${pastCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\n💡 Note: Actual table migration will happen automatically via:`);
    console.log(`   1. Scheduler's moveEndedTournamentsToPast() function`);
    console.log(`   2. Reward distribution flow (after rewards are distributed)`);
    console.log(`   3. Manual call to move_tournament_to_past() function`);
    console.log(`\n✨ The scheduler will automatically move tournaments as they end.`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateTournamentsToTables()
  .then(() => {
    console.log('\n✅ Migration analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });


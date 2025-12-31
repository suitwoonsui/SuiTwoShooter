/**
 * Script to remove all tournaments from the current contract registry
 * 
 * IMPORTANT LIMITATION:
 * Tournament objects are SHARED objects in Sui and cannot be deleted.
 * This script only removes tournaments from the registry tables.
 * The Tournament objects themselves will remain on-chain as orphaned shared objects.
 * 
 * For testing purposes, this should be sufficient since:
 * - Tournaments won't be accessible through the registry
 * - Migration will create new tournaments with new IDs
 * - Old Tournament objects will remain but won't interfere with new migrations
 * 
 * If you need complete deletion for testing, consider:
 * 1. Using a fresh deployment for each test
 * 2. Or modifying the contract to make tournaments owned (not shared) - but this breaks functionality
 */

require('dotenv').config({ path: '.env.local' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');
const { fromB64 } = require('@mysten/sui/utils');

const network = process.env.SUI_NETWORK || 'testnet';
const packageId = process.env.GAME_SCORE_CONTRACT_TESTNET || process.env.GAME_SCORE_PACKAGE_ID || '';
const tournamentRegistryId = process.env.TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || process.env.TOURNAMENT_REGISTRY_OBJECT_ID || '';
const tournamentAdminCapId = process.env.TOURNAMENT_ADMIN_CAP_ID_TESTNET || process.env.TOURNAMENT_ADMIN_CAP_ID || '';
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || '';

if (!packageId || !tournamentRegistryId || !tournamentAdminCapId || !adminPrivateKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - GAME_SCORE_CONTRACT_TESTNET or GAME_SCORE_PACKAGE_ID');
  console.error('   - TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET or TOURNAMENT_REGISTRY_OBJECT_ID');
  console.error('   - TOURNAMENT_ADMIN_CAP_ID_TESTNET or TOURNAMENT_ADMIN_CAP_ID');
  console.error('   - ADMIN_PRIVATE_KEY');
  process.exit(1);
}

const client = new SuiClient({ url: getFullnodeUrl(network) });
const keypair = Ed25519Keypair.fromSecretKey(fromB64(adminPrivateKey));

async function getAllTournaments() {
  console.log('📋 Fetching all tournaments from registry...');
  
  try {
    const registryObj = await client.getObject({
      id: tournamentRegistryId,
      options: { showContent: true },
    });

    if (!registryObj.data?.content) {
      throw new Error('Failed to fetch tournament registry');
    }

    const registryFields = (registryObj.data.content).fields;
    const tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;

    if (!tournamentsTableId) {
      throw new Error('Tournaments table not found in registry');
    }

    // Get all dynamic fields (tournament IDs)
    const allFields = await client.getDynamicFields({
      parentId: tournamentsTableId,
      limit: 1000,
    });

    const tournamentIds = [];
    for (const field of allFields.data) {
      const tournamentId = typeof field.name === 'object' && 'value' in field.name
        ? Number(field.name.value)
        : Number(field.name);
      tournamentIds.push(tournamentId);
    }

    console.log(`✅ Found ${tournamentIds.length} tournaments`);
    return tournamentIds.sort((a, b) => a - b);
  } catch (error) {
    console.error('❌ Error fetching tournaments:', error.message);
    throw error;
  }
}

async function deleteTournament(tournamentId) {
  console.log(`\n🗑️  Deleting tournament ${tournamentId}...`);

  try {
    const txb = new Transaction();
    txb.setSender(keypair.toSuiAddress());

      txb.moveCall({
        target: `${packageId}::tournaments::admin_remove_tournament_from_registry`,
        arguments: [
          txb.object(tournamentRegistryId),
          txb.pure.u64(tournamentId),
          txb.object(tournamentAdminCapId),
        ],
      });

    txb.setGasBudget(10_000_000);

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    if (result.effects?.status?.status === 'success') {
      console.log(`   ✅ Tournament ${tournamentId} deleted successfully`);
      console.log(`   📝 Digest: ${result.digest}`);
      return { success: true, digest: result.digest };
    } else {
      const error = result.effects?.status?.error || 'Unknown error';
      console.log(`   ❌ Failed: ${error}`);
      return { success: false, error };
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function deleteAllTournaments() {
  console.log('🚀 Starting tournament deletion process...');
  console.log('='.repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Package ID: ${packageId}`);
  console.log(`Registry ID: ${tournamentRegistryId}`);
  console.log(`Admin Cap ID: ${tournamentAdminCapId}`);
  console.log('='.repeat(60));

  try {
    // Get all tournament IDs
    const tournamentIds = await getAllTournaments();

    if (tournamentIds.length === 0) {
      console.log('\n✅ No tournaments found to delete.');
      return;
    }

    console.log(`\n⚠️  WARNING: This will remove ${tournamentIds.length} tournaments from the registry!`);
    console.log('   IMPORTANT: Tournament objects are SHARED and cannot be deleted.');
    console.log('   They will remain on-chain as orphaned objects but won\'t be accessible through the registry.');
    console.log('   This is sufficient for testing - migration will create new tournaments with new IDs.');
    console.log(`\nTournament IDs to delete: ${tournamentIds.join(', ')}`);

    // Confirm deletion
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question('\n❓ Are you sure you want to proceed? Type "DELETE ALL" to confirm: ', (ans) => {
        rl.close();
        resolve(ans);
      });
    });

    if (answer !== 'DELETE ALL') {
      console.log('\n❌ Deletion cancelled.');
      return;
    }

    console.log('\n🗑️  Deleting tournaments...\n');

    const results = [];
    for (const tournamentId of tournamentIds) {
      const result = await deleteTournament(tournamentId);
      results.push({ tournamentId, ...result });
      
      // Small delay between deletions to avoid rate limiting
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
      console.log('\n✅ Successfully deleted tournaments:');
      successful.forEach(r => {
        console.log(`   Tournament ${r.tournamentId}: ${r.digest}`);
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed to delete tournaments:');
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

deleteAllTournaments().catch(console.error);


/**
 * Verify leaderboard is stored on-chain
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const client = new SuiClient({ url: RPC_URL });
const REGISTRY_ID = process.env.TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '';

async function getTournamentObjectId(tournamentId) {
  if (!REGISTRY_ID) {
    throw new Error('TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET not set');
  }
  
  const registryObj = await client.getObject({
    id: REGISTRY_ID,
    options: { showContent: true },
  });
  
  if (!registryObj.data?.content) {
    throw new Error('Failed to read registry');
  }
  
  const registryFields = registryObj.data.content.fields;
  const tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;
  
  if (!tournamentsTableId) {
    throw new Error('Tournaments table not found');
  }
  
  const tournamentKey = {
    type: 'u64',
    value: tournamentId,
  };
  
  const tournamentField = await client.getDynamicFieldObject({
    parentId: tournamentsTableId,
    name: tournamentKey,
  });
  
  if (!tournamentField.data?.objectId) {
    return null;
  }
  
  // Check if field object is the tournament itself
  const fieldObj = await client.getObject({
    id: tournamentField.data.objectId,
    options: { showContent: true, showType: true },
  });
  
  if (fieldObj.data?.type?.includes('Tournament')) {
    return tournamentField.data.objectId;
  } else if (fieldObj.data?.content) {
    const fields = fieldObj.data.content.fields;
    if (fields?.value) {
      const objId = typeof fields.value === 'string' 
        ? fields.value 
        : (fields.value?.fields?.id || fields.value?.id || null);
      if (objId) {
        const tournamentObj = await client.getObject({
          id: objId,
          options: { showType: true },
        });
        if (tournamentObj.data?.type?.includes('Tournament')) {
          return objId;
        }
      }
    }
  }
  
  return null;
}

async function verifyLeaderboard(tournamentId) {
  console.log(`\n🔍 Verifying Tournament ${tournamentId} Leaderboard`);
  console.log('='.repeat(60));
  
  try {
    // Get tournament object ID from registry
    console.log('   Getting tournament object ID from registry...');
    const tournamentObjectId = await getTournamentObjectId(tournamentId);
    
    if (!tournamentObjectId) {
      console.log(`   ❌ Tournament ${tournamentId} not found in new registry`);
      return false;
    }
    
    console.log(`   ✅ Found tournament object: ${tournamentObjectId.substring(0, 16)}...`);
    
    // Get leaderboard
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentObjectId}/leaderboard`);
    const data = await response.json();
    
    if (data.success && data.leaderboard) {
      console.log(`   ✅ Leaderboard found: ${data.leaderboard.length} entries stored on-chain`);
      if (data.leaderboard.length > 0) {
        console.log('\n   📋 Leaderboard entries:');
        data.leaderboard.forEach((entry, i) => {
          console.log(`      ${i + 1}. ${entry.playerAddress.substring(0, 12)}... | Score: ${entry.value} | Name: ${entry.playerName || '(no name)'}`);
        });
      }
      return true;
    } else {
      console.log(`   ❌ Failed: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  const tournamentIds = [12, 13];
  
  console.log('🔍 Verifying On-Chain Leaderboard Storage');
  console.log('='.repeat(60));
  
  for (const tournamentId of tournamentIds) {
    await verifyLeaderboard(tournamentId);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification Complete');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


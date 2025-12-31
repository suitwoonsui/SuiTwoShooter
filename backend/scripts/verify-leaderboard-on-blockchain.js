/**
 * Verify leaderboard data is stored on-chain in the blockchain
 * This script directly queries the Sui blockchain to check if leaderboard data exists
 * 
 * Usage:
 *   node backend/scripts/verify-leaderboard-on-blockchain.js [tournamentId]
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : 12;
const REGISTRY_ID = process.env.TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '';
const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
// Ensure we're using testnet
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

if (!REGISTRY_ID) {
  console.error('❌ Missing TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET environment variable');
  process.exit(1);
}

async function getTournamentObjectId(tournamentId) {
  console.log(`\n📋 Step 1: Getting tournament object ID from registry...`);
  console.log(`   Registry ID: ${REGISTRY_ID}`);
  console.log(`   Tournament ID: ${tournamentId}`);
  
  const registryObj = await client.getObject({
    id: REGISTRY_ID,
    options: { showContent: true },
  });
  
  if (!registryObj.data?.content) {
    throw new Error('Failed to read registry object');
  }
  
  const registryFields = registryObj.data.content.fields;
  const tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;
  
  if (!tournamentsTableId) {
    throw new Error('Tournaments table not found in registry');
  }
  
  console.log(`   ✅ Found tournaments table: ${tournamentsTableId}`);
  
  // Sui SDK expects the name in a specific format for u64 keys
  const tournamentKey = {
    type: 'u64',
    value: String(tournamentId), // Convert to string
  };
  
  const tournamentField = await client.getDynamicFieldObject({
    parentId: tournamentsTableId,
    name: tournamentKey,
  });
  
  if (!tournamentField.data?.objectId) {
    throw new Error(`Tournament ${tournamentId} not found in registry table`);
  }
  
  // Check if field object is the tournament itself
  const fieldObj = await client.getObject({
    id: tournamentField.data.objectId,
    options: { showContent: true, showType: true },
  });
  
  let tournamentObjectId = null;
  
  if (fieldObj.data?.type?.includes('Tournament')) {
    tournamentObjectId = tournamentField.data.objectId;
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
          tournamentObjectId = objId;
        }
      }
    }
  }
  
  if (!tournamentObjectId) {
    throw new Error(`Could not extract tournament object ID for tournament ${tournamentId}`);
  }
  
  console.log(`   ✅ Found tournament object: ${tournamentObjectId}`);
  return tournamentObjectId;
}

async function verifyLeaderboardOnChain(tournamentObjectId) {
  console.log(`\n📋 Step 2: Reading leaderboard table from blockchain...`);
  console.log(`   Tournament Object ID: ${tournamentObjectId}`);
  
  // Read tournament object to get leaderboard table ID
  const tournamentObj = await client.getObject({
    id: tournamentObjectId,
    options: { showContent: true, showType: true },
  });
  
  if (!tournamentObj.data?.content) {
    throw new Error('Failed to read tournament object');
  }
  
  const fields = tournamentObj.data.content.fields;
  const leaderboardTableId = fields?.leaderboard?.fields?.id?.id;
  
  if (!leaderboardTableId) {
    throw new Error('Leaderboard table not found in tournament object');
  }
  
  console.log(`   ✅ Found leaderboard table: ${leaderboardTableId}`);
  
  // Get all dynamic fields from the leaderboard table
  console.log(`\n📋 Step 3: Reading leaderboard entries from blockchain...`);
  const leaderboardFields = await client.getDynamicFields({
    parentId: leaderboardTableId,
    limit: 1000,
  });
  
  console.log(`   ✅ Found ${leaderboardFields.data.length} leaderboard entries on-chain`);
  
  if (leaderboardFields.data.length === 0) {
    console.log(`   ⚠️  Leaderboard table is empty - no data stored on-chain`);
    return [];
  }
  
  // Read each entry
  const entries = [];
  const decodeBytes = (bytes) => {
    if (!bytes) return '';
    if (typeof bytes === 'string') return bytes;
    if (Array.isArray(bytes)) {
      const uint8Array = new Uint8Array(bytes);
      return new TextDecoder().decode(uint8Array).trim();
    }
    return '';
  };
  
  for (const field of leaderboardFields.data) {
    try {
      const playerAddress = typeof field.name === 'object' && 'value' in field.name
        ? String(field.name.value)
        : String(field.name);
      
      // Read the LeaderboardEntry using getDynamicFieldObject
      const entryField = await client.getDynamicFieldObject({
        parentId: leaderboardTableId,
        name: field.name,
      });
      
      if (entryField.data?.content) {
        const content = entryField.data.content;
        let score = 0;
        let playerName = '';
        
        // Extract score and player name from LeaderboardEntry struct
        // Structure: { fields: { value: <u64>, player_name: <vector<u8>> } }
        // The value might be nested: { fields: { value: { fields: { value: u64 } } } }
        // Match the logic from tournament-service.ts for consistency
        
        // First, get the fields - this is the LeaderboardEntry struct fields
        const entryFields = content.fields;
        
        if (entryFields) {
          // Extract score - check multiple possible locations (matching tournament-service.ts)
          let rawValue = undefined;
          
          // Check nested value structure first (most common in current contract)
          if (entryFields.value?.fields?.value !== undefined && entryFields.value.fields.value !== null) {
            rawValue = entryFields.value.fields.value;
          } else if (entryFields.value !== undefined && entryFields.value !== null) {
            // Check if value is an object with nested structure
            if (typeof entryFields.value === 'object' && entryFields.value !== null) {
              if (entryFields.value.value !== undefined && entryFields.value.value !== null) {
                rawValue = entryFields.value.value;
              } else {
                rawValue = entryFields.value;
              }
            } else {
              rawValue = entryFields.value;
            }
          } else if (entryFields.fields?.value !== undefined && entryFields.fields.value !== null) {
            rawValue = entryFields.fields.value;
          }
          
          // Convert to number
          if (rawValue !== undefined && rawValue !== null) {
            if (typeof rawValue === 'string') {
              score = parseInt(rawValue, 10) || 0;
            } else if (typeof rawValue === 'number') {
              score = rawValue;
            } else if (typeof rawValue === 'bigint') {
              score = Number(rawValue);
            } else {
              score = Number(rawValue) || 0;
            }
          }
          
          // Extract player name - check multiple possible locations (matching tournament-service.ts)
          let nameSource = undefined;
          
          if (entryFields.player_name) {
            nameSource = entryFields.player_name;
          } else if (entryFields.fields?.player_name) {
            nameSource = entryFields.fields.player_name;
          } else if (entryFields.value?.fields?.player_name) {
            nameSource = entryFields.value.fields.player_name;
          } else if (entryFields.value?.player_name) {
            nameSource = entryFields.value.player_name;
          }
          
          // Decode the player name
          if (nameSource) {
            if (Array.isArray(nameSource)) {
              const uint8Array = new Uint8Array(nameSource);
              playerName = new TextDecoder().decode(uint8Array).trim();
            } else if (typeof nameSource === 'string') {
              playerName = nameSource.trim();
            }
          }
        }
        
        entries.push({
          address: playerAddress,
          score,
          playerName,
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Error reading entry: ${error.message}`);
    }
  }
  
  return entries.sort((a, b) => b.score - a.score);
}

async function verifyTournamentOnBlockchain() {
  console.log('🔍 Verifying Leaderboard Data on Blockchain');
  console.log('='.repeat(80));
  console.log(`Tournament ID: ${TOURNAMENT_ID}`);
  console.log(`Registry ID: ${REGISTRY_ID}`);
  console.log(`RPC URL: ${testnetUrl}`);
  console.log('='.repeat(80));
  
  try {
    // Get tournament object ID
    const tournamentObjectId = await getTournamentObjectId(TOURNAMENT_ID);
    
    // Read leaderboard from blockchain
    const entries = await verifyLeaderboardOnChain(tournamentObjectId);
    
    // Display results
    console.log(`\n📊 Results:`);
    console.log('='.repeat(80));
    
    if (entries.length === 0) {
      console.log(`❌ No leaderboard entries found on-chain`);
      console.log(`\nThis means:`);
      console.log(`   - The leaderboard table exists but is empty`);
      console.log(`   - Data was not successfully restored`);
      console.log(`   - Or the tournament has no scores yet`);
    } else {
      console.log(`✅ Found ${entries.length} leaderboard entries stored ON-CHAIN:`);
      console.log('');
      console.log('📋 Leaderboard (sorted by score):');
      entries.forEach((entry, i) => {
        console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${entry.address.substring(0, 12).padEnd(12, ' ')} | Score: ${entry.score.toString().padStart(10, ' ')} | Name: ${entry.playerName || '(no name)'}`);
      });
      
      console.log(`\n✅ CONFIRMED: Leaderboard data is stored on-chain in the blockchain!`);
      console.log(`   - Tournament Object ID: ${tournamentObjectId}`);
      console.log(`   - Entries stored: ${entries.length}`);
      console.log(`   - Data source: On-chain table (not events)`);
      console.log(`   - Future migrations will read from this on-chain storage`);
    }
    
    console.log('');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyTournamentOnBlockchain().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


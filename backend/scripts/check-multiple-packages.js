/**
 * Script to check tournament data across multiple package IDs
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : 12;

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const client = new SuiClient({ url: RPC_URL });

// Package IDs to check (from deployment history)
const PACKAGE_IDS = [
  {
    name: 'Current (2025-12-30)',
    id: '0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c',
  },
  {
    name: 'Previous (2025-12-30)',
    id: '0xea5767f2e72096e637f2f64175aa8931c6cd3fde3dc7cc450dc9399ec1daf4c6',
  },
  {
    name: 'Older (2025-12-23)',
    id: '0x7406dc825f706a249e72b087bd971889a54b7a4f37a372827ad83bfce1c88e49',
  },
  {
    name: 'Even Older',
    id: '0x987bfff631bbbda273e7c5adb472cb9500252171768ac38cecc51d643753b4d5',
  },
  {
    name: 'Old (2025-12-23)',
    id: '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352',
  },
];

// Registry IDs to check
const REGISTRY_IDS = [
  {
    name: 'Current Registry',
    id: process.env.TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '',
  },
  {
    name: 'Old Registry',
    id: process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '',
  },
  {
    name: 'Old Old Registry',
    id: process.env.OLD_OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '',
  },
].filter(r => r.id);

async function checkPackage(packageId, packageName) {
  console.log(`\n📦 Checking package: ${packageName}`);
  console.log(`   Package ID: ${packageId}`);
  console.log('   ' + '-'.repeat(56));

  try {
    // 1. Check for TournamentCreated events
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: packageId,
          module: 'tournaments',
        },
      },
      limit: 100,
      order: 'descending',
    });

    console.log(`   ✅ Found ${events.data.length} events from tournaments module`);

    // Check for TournamentScoreUpdated events for this tournament
    const scoreEvents = events.data.filter(event => {
      if (!event.type?.includes('TournamentScoreUpdated')) return false;
      const eventData = event.parsedJson;
      return Number(eventData.tournament_id || 0) === TOURNAMENT_ID;
    });

    if (scoreEvents.length > 0) {
      console.log(`   🎯 Found ${scoreEvents.length} TournamentScoreUpdated events for tournament ${TOURNAMENT_ID}!`);
      
      const scoreMap = new Map();
      scoreEvents.forEach(event => {
        const eventData = event.parsedJson;
        const player = typeof eventData.player === 'string' 
          ? eventData.player 
          : String(eventData.player?.[0] || '');
        const value = Number(eventData.value || 0);
        
        if (!scoreMap.has(player) || scoreMap.get(player) < value) {
          scoreMap.set(player, value);
        }
      });

      console.log(`   📊 Unique players with scores: ${scoreMap.size}`);
      Array.from(scoreMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([player, score], i) => {
          console.log(`      ${i + 1}. ${player.substring(0, 10)}... : ${score}`);
        });

      return { found: true, packageId, packageName, scoreCount: scoreMap.size };
    } else {
      console.log(`   ⚠️  No TournamentScoreUpdated events for tournament ${TOURNAMENT_ID}`);
    }

    return { found: false, packageId, packageName };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { found: false, packageId, packageName, error: error.message };
  }
}

async function checkRegistry(registryId, registryName) {
  console.log(`\n📋 Checking registry: ${registryName}`);
  console.log(`   Registry ID: ${registryId}`);
  console.log('   ' + '-'.repeat(56));

  try {
    const registryObj = await client.getObject({
      id: registryId,
      options: { showContent: true, showType: true },
    });

    if (!registryObj.data?.content) {
      console.log('   ❌ Registry object not found or has no content');
      return { found: false };
    }

    console.log('   ✅ Registry object found');
    console.log(`   Type: ${registryObj.data.type}`);

    const fields = (registryObj.data.content).fields;
    const tournamentsTableId = fields?.tournaments?.fields?.id?.id;

    if (!tournamentsTableId) {
      console.log('   ⚠️  No tournaments table found');
      return { found: false };
    }

    console.log(`   ✅ Tournaments table: ${tournamentsTableId}`);

    // Try to find the tournament
    const tournamentKey = {
      type: 'u64',
      value: TOURNAMENT_ID,
    };

    try {
      const tournamentField = await client.getDynamicFieldObject({
        parentId: tournamentsTableId,
        name: tournamentKey,
      });

      if (tournamentField.data?.objectId) {
        const tournamentObjectId = tournamentField.data.objectId;
        console.log(`   ✅ Tournament ${TOURNAMENT_ID} found: ${tournamentObjectId}`);

        // Read the tournament object
        const tournamentObj = await client.getObject({
          id: tournamentObjectId,
          options: { showContent: true },
        });

        if (tournamentObj.data?.content) {
          const tournamentFields = (tournamentObj.data.content).fields;
          const leaderboardTableId = tournamentFields.leaderboard?.fields?.id?.id || tournamentFields.leaderboard?.id?.id;
          
          if (leaderboardTableId) {
            const leaderboardFields = await client.getDynamicFields({
              parentId: leaderboardTableId,
              limit: 1000,
            });

            console.log(`   📊 Leaderboard entries: ${leaderboardFields.data.length}`);
            
            if (leaderboardFields.data.length > 0) {
              console.log(`   🎯 FOUND LEADERBOARD DATA!`);
              return { found: true, registryId, registryName, entryCount: leaderboardFields.data.length };
            }
          }
        }
      } else {
        console.log(`   ⚠️  Tournament ${TOURNAMENT_ID} not found in this registry`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error querying tournament: ${error.message}`);
    }

    return { found: false };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { found: false, error: error.message };
  }
}

async function checkAll() {
  console.log('🔍 Checking tournament data across multiple package IDs and registries...');
  console.log('='.repeat(60));
  console.log('Tournament ID:', TOURNAMENT_ID);
  console.log('='.repeat(60));

  const results = {
    packages: [],
    registries: [],
  };

  // Check all packages
  for (const pkg of PACKAGE_IDS) {
    const result = await checkPackage(pkg.id, pkg.name);
    results.packages.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Check all registries
  for (const registry of REGISTRY_IDS) {
    const result = await checkRegistry(registry.id, registry.name);
    results.registries.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));

  const packagesWithData = results.packages.filter(r => r.found);
  const registriesWithData = results.registries.filter(r => r.found);

  if (packagesWithData.length > 0) {
    console.log('\n✅ Packages with score events:');
    packagesWithData.forEach(r => {
      console.log(`   ${r.packageName} (${r.packageId.substring(0, 20)}...): ${r.scoreCount} players`);
    });
  }

  if (registriesWithData.length > 0) {
    console.log('\n✅ Registries with leaderboard data:');
    registriesWithData.forEach(r => {
      console.log(`   ${r.registryName} (${r.registryId.substring(0, 20)}...): ${r.entryCount} entries`);
    });
  }

  if (packagesWithData.length === 0 && registriesWithData.length === 0) {
    console.log('\n⚠️  No leaderboard data found in any package or registry');
    console.log('   This suggests:');
    console.log('   1. No scores were ever submitted to this tournament');
    console.log('   2. The data is in a different package/registry not checked');
    console.log('   3. The data was stored differently (not in tables or events)');
  }
}

checkAll().catch(console.error);


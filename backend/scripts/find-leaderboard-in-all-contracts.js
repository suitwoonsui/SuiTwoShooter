/**
 * Check multiple contract versions to find where leaderboard data is stored
 * Checks: OLD contract, OLD_OLD contract, and potentially even older ones
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const TOURNAMENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : 12;

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

// Contract versions to check (from newest to oldest)
const CONTRACT_VERSIONS = [
  {
    name: 'OLD (Previous 2025-12-30)',
    packageId: process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || '',
    registryId: process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '',
  },
  {
    name: 'OLD_OLD (Even Older)',
    packageId: process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || '', // Same package, different registry
    registryId: process.env.OLD_OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '',
  },
  // Add more if needed - check deployment history
];

// Also check older package IDs from deployment history
const OLDER_PACKAGE_IDS = [
  '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352', // 2025-12-23
  '0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0', // 2025-12-22
  '0x25b5142a89b49e973b983c7de0f808078f2e0ba7b1b4bba0def6eca6ebfa0d3a', // 2025-12-17
];

async function checkContractVersion(versionName, packageId, registryId, tournamentId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Checking: ${versionName}`);
  console.log(`Package ID: ${packageId}`);
  console.log(`Registry ID: ${registryId || 'N/A'}`);
  console.log('='.repeat(60));

  if (!packageId) {
    console.log('   ⚠️  Package ID not configured, skipping...');
    return { found: false, reason: 'Package ID not configured' };
  }

  try {
    // 1. Check events from this package
    console.log('\n📋 Step 1: Checking TournamentScoreUpdated events...');
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: packageId,
          module: 'tournaments',
        },
      },
      limit: 1000,
      order: 'descending',
    });

    console.log(`   ✅ Found ${events.data.length} total events from this package`);

    const decodeBytes = (bytes) => {
      if (!bytes) return '';
      if (typeof bytes === 'string') return bytes;
      if (Array.isArray(bytes)) {
        const uint8Array = new Uint8Array(bytes);
        return new TextDecoder().decode(uint8Array).trim();
      }
      return '';
    };

    const scoreMap = new Map();
    const nameMap = new Map();

    for (const event of events.data) {
      if (event.type?.includes('TournamentScoreUpdated')) {
        const eventData = event.parsedJson;
        const eventTournamentId = Number(eventData.tournament_id || 0);
        
        if (eventTournamentId === tournamentId) {
          const player = typeof eventData.player === 'string' 
            ? eventData.player 
            : String(eventData.player?.[0] || '');
          
          const score = Number(eventData.value || 0);
          
          // Keep highest score per player
          if (!scoreMap.has(player) || scoreMap.get(player) < score) {
            scoreMap.set(player, score);
          }
          
          // Extract player name
          if (eventData.player_name) {
            const playerName = decodeBytes(eventData.player_name);
            if (playerName && !nameMap.has(player.toLowerCase())) {
              nameMap.set(player.toLowerCase(), playerName);
            }
          }
        }
      }
    }

    console.log(`   ✅ Found ${scoreMap.size} unique players with scores for tournament ${tournamentId}`);

    // 2. Check leaderboard table if registry ID is available
    let tableScores = 0;
    if (registryId) {
      console.log('\n📋 Step 2: Checking leaderboard table...');
      try {
        const registryObj = await client.getObject({
          id: registryId,
          options: { showContent: true },
        });

        if (registryObj.data?.content) {
          const registryFields = registryObj.data.content.fields;
          const tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;

          if (tournamentsTableId) {
            // Try to find the tournament in the registry
            const tournamentKey = {
              type: 'u64',
              value: tournamentId,
            };

            try {
              const tournamentField = await client.getDynamicFieldObject({
                parentId: tournamentsTableId,
                name: tournamentKey,
              });

              if (tournamentField.data && tournamentField.data.objectId) {
                const tournamentObj = await client.getObject({
                  id: tournamentField.data.objectId,
                  options: { showContent: true },
                });

                if (tournamentObj.data?.content) {
                  const fields = tournamentObj.data.content.fields;
                  const leaderboardTableId = fields?.leaderboard?.fields?.id?.id;

                  if (leaderboardTableId) {
                    const leaderboardFields = await client.getDynamicFields({
                      parentId: leaderboardTableId,
                      limit: 1000,
                    });

                    tableScores = leaderboardFields.data.length;
                    console.log(`   ✅ Found ${tableScores} entries in leaderboard table`);
                  } else {
                    console.log(`   ⚠️  No leaderboard table found in tournament object`);
                  }
                }
              } else {
                console.log(`   ⚠️  Tournament ${tournamentId} not found in registry table`);
              }
            } catch (tableError) {
              console.log(`   ⚠️  Error reading tournament from table: ${tableError.message}`);
            }
          } else {
            console.log(`   ⚠️  No tournaments table found in registry`);
          }
        }
      } catch (registryError) {
        console.log(`   ⚠️  Error reading registry: ${registryError.message}`);
      }
    } else {
      console.log('\n📋 Step 2: Skipping table check (no registry ID)');
    }

    // Summary
    const foundInEvents = scoreMap.size > 0;
    const foundInTable = tableScores > 0;

    if (foundInEvents || foundInTable) {
      console.log('\n✅ FOUND DATA:');
      if (foundInEvents) {
        console.log(`   - ${scoreMap.size} players with scores in events`);
        const sortedScores = Array.from(scoreMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        console.log('   - Top 5 scores:');
        sortedScores.forEach(([player, score], i) => {
          const name = nameMap.get(player.toLowerCase()) || '(no name)';
          console.log(`     ${i + 1}. ${player.substring(0, 12)}... | Score: ${score} | Name: ${name}`);
        });
      }
      if (foundInTable) {
        console.log(`   - ${tableScores} entries in leaderboard table`);
      }
      return { found: true, events: scoreMap.size, table: tableScores, versionName, packageId, registryId };
    } else {
      console.log('\n❌ NO DATA FOUND');
      return { found: false, reason: 'No scores in events or table' };
    }

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return { found: false, reason: error.message };
  }
}

async function findLeaderboardInAllContracts() {
  console.log('🔍 Finding Leaderboard Data Across All Contract Versions');
  console.log('='.repeat(60));
  console.log(`Tournament ID: ${TOURNAMENT_ID}`);
  console.log('='.repeat(60));

  const results = [];

  // Check configured contract versions
  for (const version of CONTRACT_VERSIONS) {
    if (version.packageId) {
      const result = await checkContractVersion(
        version.name,
        version.packageId,
        version.registryId,
        TOURNAMENT_ID
      );
      results.push(result);
    }
  }

  // Check older package IDs (just events, no registry)
  for (const packageId of OLDER_PACKAGE_IDS) {
    const result = await checkContractVersion(
      `Package ${packageId.substring(0, 16)}... (from deployment history)`,
      packageId,
      '', // No registry ID for these
      TOURNAMENT_ID
    );
    results.push(result);
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));

  const foundVersions = results.filter(r => r.found);
  const notFoundVersions = results.filter(r => !r.found);

  if (foundVersions.length > 0) {
    console.log('\n✅ Leaderboard data found in:');
    foundVersions.forEach(r => {
      console.log(`   - ${r.versionName}`);
      console.log(`     Package: ${r.packageId}`);
      if (r.registryId) {
        console.log(`     Registry: ${r.registryId}`);
      }
      console.log(`     Events: ${r.events} players`);
      if (r.table > 0) {
        console.log(`     Table: ${r.table} entries`);
      }
      console.log('');
    });

    // Recommend which one to use
    const bestMatch = foundVersions[0]; // First one found (newest)
    console.log(`\n💡 RECOMMENDATION: Use ${bestMatch.versionName}`);
    console.log(`   Package ID: ${bestMatch.packageId}`);
    if (bestMatch.registryId) {
      console.log(`   Registry ID: ${bestMatch.registryId}`);
    }
  } else {
    console.log('\n❌ NO LEADERBOARD DATA FOUND in any contract version!');
    console.log('\nThis could mean:');
    console.log('   - No scores were ever submitted to tournament ' + TOURNAMENT_ID);
    console.log('   - The tournament ID is incorrect');
    console.log('   - The data is in an even older contract not checked');
    console.log('   - The data was never stored (contract bug)');
  }

  if (notFoundVersions.length > 0) {
    console.log('\n⚠️  No data found in:');
    notFoundVersions.forEach(r => {
      console.log(`   - ${r.versionName || 'Unknown'}: ${r.reason || 'No data'}`);
    });
  }
}

findLeaderboardInAllContracts().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


/**
 * Check all tournaments across all contract versions to find where leaderboard data is stored
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

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
];

// Also check older package IDs from deployment history
const OLDER_PACKAGE_IDS = [
  { id: '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352', name: '2025-12-23' },
  { id: '0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0', name: '2025-12-22' },
  { id: '0x25b5142a89b49e973b983c7de0f808078f2e0ba7b1b4bba0def6eca6ebfa0d3a', name: '2025-12-17' },
];

async function getAllTournamentIds(packageId, registryId) {
  try {
    // Try to get from registry table
    if (registryId) {
      const registryObj = await client.getObject({
        id: registryId,
        options: { showContent: true },
      });

      if (registryObj.data?.content) {
        const registryFields = registryObj.data.content.fields;
        const tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;

        if (tournamentsTableId) {
          const allFields = await client.getDynamicFields({
            parentId: tournamentsTableId,
            limit: 1000,
          });

          const tournamentIds = [];
          for (const field of allFields.data) {
            const tournamentId = typeof field.name === 'object' && 'value' in field.name
              ? Number(field.name.value)
              : Number(field.name);
            if (!isNaN(tournamentId)) {
              tournamentIds.push(tournamentId);
            }
          }
          return tournamentIds.sort((a, b) => a - b);
        }
      }
    }

    // Fallback: get from events
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

    const tournamentIds = new Set();
    for (const event of events.data) {
      if (event.type?.includes('TournamentCreated')) {
        const eventData = event.parsedJson;
        const tournamentId = Number(eventData.tournament_id || 0);
        if (!isNaN(tournamentId)) {
          tournamentIds.add(tournamentId);
        }
      }
    }

    return Array.from(tournamentIds).sort((a, b) => a - b);
  } catch (error) {
    console.error(`Error getting tournament IDs: ${error.message}`);
    return [];
  }
}

async function checkTournamentInContract(tournamentId, packageId, registryId) {
  const decodeBytes = (bytes) => {
    if (!bytes) return '';
    if (typeof bytes === 'string') return bytes;
    if (Array.isArray(bytes)) {
      const uint8Array = new Uint8Array(bytes);
      return new TextDecoder().decode(uint8Array).trim();
    }
    return '';
  };

  try {
    // Check events
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

    const scoreMap = new Map();
    for (const event of events.data) {
      if (event.type?.includes('TournamentScoreUpdated')) {
        const eventData = event.parsedJson;
        const eventTournamentId = Number(eventData.tournament_id || 0);
        
        if (eventTournamentId === tournamentId) {
          const player = typeof eventData.player === 'string' 
            ? eventData.player 
            : String(eventData.player?.[0] || '');
          
          const score = Number(eventData.value || 0);
          
          if (!scoreMap.has(player) || scoreMap.get(player) < score) {
            scoreMap.set(player, score);
          }
        }
      }
    }

    // Check table if registry ID available
    let tableCount = 0;
    if (registryId) {
      try {
        const registryObj = await client.getObject({
          id: registryId,
          options: { showContent: true },
        });

        if (registryObj.data?.content) {
          const registryFields = registryObj.data.content.fields;
          const tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;

          if (tournamentsTableId) {
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

                    tableCount = leaderboardFields.data.length;
                  }
                }
              }
            } catch (e) {
              // Tournament not found in this registry
            }
          }
        }
      } catch (e) {
        // Registry error
      }
    }

    return {
      events: scoreMap.size,
      table: tableCount,
      hasData: scoreMap.size > 0 || tableCount > 0,
    };
  } catch (error) {
    return {
      events: 0,
      table: 0,
      hasData: false,
      error: error.message,
    };
  }
}

async function checkAllTournamentsAllContracts() {
  console.log('🔍 Checking All Tournaments Across All Contract Versions');
  console.log('='.repeat(80));
  console.log('');

  // Get all tournament IDs from the OLD contract
  const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || '';
  const oldRegistryId = process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || '';

  if (!oldPackageId) {
    console.error('❌ Missing OLD_GAME_SCORE_CONTRACT_TESTNET');
    process.exit(1);
  }

  console.log('📋 Step 1: Getting all tournament IDs from OLD contract...');
  const allTournamentIds = await getAllTournamentIds(oldPackageId, oldRegistryId);
  console.log(`   ✅ Found ${allTournamentIds.length} tournaments: ${allTournamentIds.join(', ')}`);
  console.log('');

  if (allTournamentIds.length === 0) {
    console.log('⚠️  No tournaments found. Exiting.');
    return;
  }

  // Check each tournament in each contract version
  const results = {};

  for (const tournamentId of allTournamentIds) {
    results[tournamentId] = {};
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Checking Tournament ${tournamentId}`);
    console.log('='.repeat(80));

    // Check configured contract versions
    for (const version of CONTRACT_VERSIONS) {
      if (version.packageId) {
        console.log(`\n  Checking ${version.name}...`);
        const result = await checkTournamentInContract(
          tournamentId,
          version.packageId,
          version.registryId
        );
        results[tournamentId][version.name] = result;
        
        if (result.hasData) {
          console.log(`    ✅ Found: ${result.events} in events, ${result.table} in table`);
        } else {
          console.log(`    ❌ Not found`);
        }
      }
    }

    // Check older package IDs
    for (const packageInfo of OLDER_PACKAGE_IDS) {
      console.log(`\n  Checking Package ${packageInfo.name} (${packageInfo.id.substring(0, 16)}...)...`);
      const result = await checkTournamentInContract(
        tournamentId,
        packageInfo.id,
        '' // No registry for these
      );
      results[tournamentId][`Package ${packageInfo.name}`] = result;
      
      if (result.hasData) {
        console.log(`    ✅ Found: ${result.events} in events`);
      } else {
        console.log(`    ❌ Not found`);
      }
    }
  }

  // Final summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  const tournamentsWithData = [];
  const tournamentsWithoutData = [];

  for (const [tournamentId, contractResults] of Object.entries(results)) {
    let foundAnywhere = false;
    const foundIn = [];

    for (const [contractName, result] of Object.entries(contractResults)) {
      if (result.hasData) {
        foundAnywhere = true;
        foundIn.push({
          contract: contractName,
          events: result.events,
          table: result.table,
        });
      }
    }

    if (foundAnywhere) {
      tournamentsWithData.push({
        tournamentId: parseInt(tournamentId),
        foundIn,
      });
    } else {
      tournamentsWithoutData.push(parseInt(tournamentId));
    }
  }

  console.log(`✅ Tournaments WITH leaderboard data: ${tournamentsWithData.length}`);
  console.log('='.repeat(80));
  if (tournamentsWithData.length > 0) {
    tournamentsWithData.sort((a, b) => a.tournamentId - b.tournamentId);
    for (const tournament of tournamentsWithData) {
      console.log(`\nTournament ${tournament.tournamentId}:`);
      for (const location of tournament.foundIn) {
        console.log(`  - ${location.contract}:`);
        console.log(`      Events: ${location.events} players`);
        if (location.table > 0) {
          console.log(`      Table: ${location.table} entries`);
        }
      }
    }
  }

  console.log(`\n\n❌ Tournaments WITHOUT leaderboard data: ${tournamentsWithoutData.length}`);
  console.log('='.repeat(80));
  if (tournamentsWithoutData.length > 0) {
    tournamentsWithoutData.sort((a, b) => a - b);
    console.log(`Tournament IDs: ${tournamentsWithoutData.join(', ')}`);
    console.log('\nThese tournaments have no leaderboard data in any contract version.');
    console.log('This could mean:');
    console.log('  - No scores were ever submitted');
    console.log('  - Data is in an even older contract not checked');
    console.log('  - Data was never stored (contract bug)');
  }

  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('='.repeat(80));
  
  if (tournamentsWithData.length > 0) {
    // Group by contract version
    const byContract = {};
    for (const tournament of tournamentsWithData) {
      for (const location of tournament.foundIn) {
        if (!byContract[location.contract]) {
          byContract[location.contract] = [];
        }
        byContract[location.contract].push(tournament.tournamentId);
      }
    }

    console.log('\nBest contract version to use for migration:');
    for (const [contract, tournamentIds] of Object.entries(byContract)) {
      console.log(`  ${contract}: ${tournamentIds.length} tournaments`);
      console.log(`    Tournament IDs: ${tournamentIds.join(', ')}`);
    }
  }

  console.log('\n');
}

checkAllTournamentsAllContracts().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


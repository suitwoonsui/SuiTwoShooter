// Comprehensive verification script to check all contract IDs
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const EXPECTED_PACKAGE_ID = '0x6a2d1d8c86b9cf0e7d0c669c1f544723f2102fcb0312e64936c6d6135d9e83ec';
const DEPLOYMENT_TX = '2eMGqJvxyQSoDBTs3DcLtASasE4dMQSNkPCUZjdLNfNz';
const BADGE_REGISTRY_INIT_TX = '5rVT2BQUiPQiD8c5LiMdk2CHfQFjuDqZHGau2esoJUDy';
const BADGE_DISPLAY_TX = '14rawtwUxVbpG3WJcXZaGAhgw59NYeQa2LEN8Fin2Mx3';
const ADMIN_CAP_TX_SCORE = 'DNhjXYQDtLKXo5PwfJFyvCnzVLXYWivhbkEDyexHGfwX';
const ADMIN_CAP_TX_PREMIUM = 'DDuyLpPfAfekRqHwPZo5iB4XjKc7KJtsMPSm3gGuxNRE';
const TOURNAMENT_ADMIN_CAP_TX = 'G6X81p1hvBwmxAHEeskgpb2ueLgmA4GNLoCTZXd2BHtn';

// IDs from DEPLOYMENT_IDS.md (latest deployment)
const EXPECTED_IDS = {
  packageId: EXPECTED_PACKAGE_ID,
  sessionRegistry: '0xe0be7ce081578b96faa1f1d20e118d4d53139d5e8520db1dd26a0bed13af9fd7',
  statisticsRegistry: '0x2a3a59302a12a20e06ec8fb8aeb45078e5b253324b5ab4ff92a682be0c4472f4',
  adminCapability: '0x57faea338b2590c2b9d96b114c7e248f8914a6e9ed75742d2f2b32bad2472f93',
  premiumStore: '0xbec65ea77375599a1a9aab23fe98c8dc74602d210f31468864ac7f2eed74d592',
  premiumStoreAdminCapability: '0xe5423ca97cff6c0a795e17bb1b6421bdd6dd2e5cf18f2b4a1f881f6f00ad1dbf',
  gamePassSystem: '0x8d2be3b1da42c3209c2087081182d88c59879872a87080b0e66aa482b5f5f444',
  tournamentRegistry: '0x0efad36a39b1d6a4dfbcfe0f20160361da8de0f924e31fb4330f18eedeb5329a',
  tournamentAdminCapability: '0x164c11a5f2c2fd622de135074c3903697971391cef803f79dac928965ab5e2c6',
  badgeRegistry: '0x65cf4528ca7160f2243ddd8099d1158570645bae1ef0af0efdf50d23eab33edb',
  badgePublisher: '0xa91f44377f2196e03f4fe152b7cf5b094d3afb27498b878e26879232af0638b6',
  badgeDisplay: '0x6aa2a8f58db33416bc669d9c1b9edab9ef4fb60623efc1de5e661f9b7ae24f3d',
};

async function verifyObject(objectId, expectedType, expectedPackageId) {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    const obj = await client.getObject({
      id: objectId,
      options: { showType: true, showContent: false },
    });

    if (obj.error) {
      return {
        exists: false,
        error: obj.error,
      };
    }

    const actualType = obj.data?.type || 'unknown';
    const actualPackageId = actualType.split('::')[0];

    return {
      exists: true,
      actualType,
      actualPackageId,
      expectedPackageId,
      matches: actualPackageId === expectedPackageId,
      typeMatches: actualType.includes(expectedType),
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
    };
  }
}

async function extractFromTransaction(txDigest, objectTypeFilter) {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    const objects = [];
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          if (objectTypeFilter(change.objectType)) {
            objects.push({
              id: change.objectId,
              type: change.objectType,
            });
          }
        }
      }
    }

    return objects;
  } catch (error) {
    console.error(`Error extracting from transaction ${txDigest}:`, error.message);
    return [];
  }
}

async function verifyAll() {
  console.log('🔍 VERIFYING ALL CONTRACT IDs\n');
  console.log('='.repeat(80));
  console.log(`Expected Package ID: ${EXPECTED_PACKAGE_ID}\n`);

  const results = {};
  const issues = [];

  // Verify Package
  console.log('📦 Verifying Package...');
  const packageObj = await verifyObject(EXPECTED_PACKAGE_ID, 'Package', EXPECTED_PACKAGE_ID);
  results.package = packageObj;
  if (!packageObj.exists) {
    issues.push(`❌ Package ${EXPECTED_PACKAGE_ID} does not exist!`);
  } else {
    console.log('   ✅ Package exists');
  }

  // Verify objects from deployment transaction
  console.log('\n📋 Extracting objects from deployment transaction...');
  const deploymentObjects = await extractFromTransaction(DEPLOYMENT_TX, (type) => 
    type.includes('SessionRegistry') || 
    type.includes('StatisticsRegistry') || 
    type.includes('PremiumStore') || 
    type.includes('GamePassSystem') ||
    type.includes('TournamentRegistry') ||
    type.includes('Publisher')
  );

  console.log(`   Found ${deploymentObjects.length} objects in deployment transaction`);

  // Verify Session Registry
  console.log('\n📊 Verifying Session Registry...');
  const sessionReg = await verifyObject(EXPECTED_IDS.sessionRegistry, 'SessionRegistry', EXPECTED_PACKAGE_ID);
  results.sessionRegistry = sessionReg;
  if (!sessionReg.exists) {
    issues.push(`❌ Session Registry ${EXPECTED_IDS.sessionRegistry} does not exist!`);
  } else if (!sessionReg.matches) {
    issues.push(`❌ Session Registry is from package ${sessionReg.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
  } else {
    console.log('   ✅ Session Registry exists and matches package');
  }

  // Verify Statistics Registry
  console.log('\n📊 Verifying Statistics Registry...');
  const statsReg = await verifyObject(EXPECTED_IDS.statisticsRegistry, 'StatisticsRegistry', EXPECTED_PACKAGE_ID);
  results.statisticsRegistry = statsReg;
  if (!statsReg.exists) {
    issues.push(`❌ Statistics Registry ${EXPECTED_IDS.statisticsRegistry} does not exist!`);
  } else if (!statsReg.matches) {
    issues.push(`❌ Statistics Registry is from package ${statsReg.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
  } else {
    console.log('   ✅ Statistics Registry exists and matches package');
  }

  // Verify Admin Capability (score_submission)
  console.log('\n🔑 Verifying Admin Capability (score_submission)...');
  const adminCap = await verifyObject(EXPECTED_IDS.adminCapability, 'AdminCapability', EXPECTED_PACKAGE_ID);
  results.adminCapability = adminCap;
  if (!adminCap.exists) {
    issues.push(`❌ Admin Capability ${EXPECTED_IDS.adminCapability} does not exist!`);
  } else if (!adminCap.matches) {
    issues.push(`❌ Admin Capability is from package ${adminCap.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
  } else {
    console.log('   ✅ Admin Capability exists and matches package');
  }

  // Verify Premium Store
  console.log('\n🏪 Verifying Premium Store...');
  const premiumStore = await verifyObject(EXPECTED_IDS.premiumStore, 'PremiumStore', EXPECTED_PACKAGE_ID);
  results.premiumStore = premiumStore;
  if (!premiumStore.exists) {
    issues.push(`❌ Premium Store ${EXPECTED_IDS.premiumStore} does not exist!`);
  } else if (!premiumStore.matches) {
    issues.push(`❌ Premium Store is from package ${premiumStore.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
  } else {
    console.log('   ✅ Premium Store exists and matches package');
  }

  // Verify Premium Store Admin Capability
  console.log('\n🔑 Verifying Premium Store Admin Capability...');
  const premiumAdminCap = await verifyObject(EXPECTED_IDS.premiumStoreAdminCapability, 'AdminCapability', EXPECTED_PACKAGE_ID);
  results.premiumStoreAdminCapability = premiumAdminCap;
  if (!premiumAdminCap.exists) {
    issues.push(`❌ Premium Store Admin Capability ${EXPECTED_IDS.premiumStoreAdminCapability} does not exist!`);
  } else if (!premiumAdminCap.matches) {
    issues.push(`❌ Premium Store Admin Capability is from package ${premiumAdminCap.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
  } else {
    console.log('   ✅ Premium Store Admin Capability exists and matches package');
  }

  // Verify Game Pass System
  console.log('\n🎫 Verifying Game Pass System...');
  const gamePass = await verifyObject(EXPECTED_IDS.gamePassSystem, 'GamePassSystem', EXPECTED_PACKAGE_ID);
  results.gamePassSystem = gamePass;
  if (!gamePass.exists) {
    issues.push(`❌ Game Pass System ${EXPECTED_IDS.gamePassSystem} does not exist!`);
  } else if (!gamePass.matches) {
    issues.push(`❌ Game Pass System is from package ${gamePass.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
  } else {
    console.log('   ✅ Game Pass System exists and matches package');
  }

  // Verify Tournament Registry
  console.log('\n🎯 Verifying Tournament Registry...');
  const tournamentReg = await verifyObject(EXPECTED_IDS.tournamentRegistry, 'TournamentRegistry', EXPECTED_PACKAGE_ID);
  results.tournamentRegistry = tournamentReg;
  if (!tournamentReg.exists) {
    issues.push(`❌ Tournament Registry ${EXPECTED_IDS.tournamentRegistry} does not exist!`);
  } else if (!tournamentReg.matches) {
    issues.push(`❌ Tournament Registry is from package ${tournamentReg.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
  } else {
    console.log('   ✅ Tournament Registry exists and matches package');
  }

  // Verify Tournament Admin Capability
  console.log('\n🔑 Verifying Tournament Admin Capability...');
  const tournamentAdminCap = await verifyObject(EXPECTED_IDS.tournamentAdminCapability, 'AdminCapability', EXPECTED_PACKAGE_ID);
  results.tournamentAdminCapability = tournamentAdminCap;
  if (!tournamentAdminCap.exists) {
    issues.push(`❌ Tournament Admin Capability ${EXPECTED_IDS.tournamentAdminCapability} does not exist!`);
  } else if (!tournamentAdminCap.matches) {
    issues.push(`❌ Tournament Admin Capability is from package ${tournamentAdminCap.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
  } else {
    console.log('   ✅ Tournament Admin Capability exists and matches package');
  }

  // Verify Badge Registry
  console.log('\n🏅 Verifying Badge Registry...');
  const badgeReg = await verifyObject(EXPECTED_IDS.badgeRegistry, 'BadgeRegistry', EXPECTED_PACKAGE_ID);
  results.badgeRegistry = badgeReg;
  if (!badgeReg.exists) {
    issues.push(`❌ Badge Registry ${EXPECTED_IDS.badgeRegistry} does not exist!`);
  } else if (!badgeReg.matches) {
    issues.push(`❌ Badge Registry is from package ${badgeReg.actualPackageId}, expected ${EXPECTED_PACKAGE_ID}`);
    console.log(`   ⚠️  Badge Registry is from OLD package! Need to initialize for new package.`);
  } else {
    console.log('   ✅ Badge Registry exists and matches package');
  }

  // Verify Badge Publisher
  // Note: Publisher is from package 0x2 (Sui framework), which is correct
  console.log('\n📰 Verifying Badge Publisher...');
  const badgePub = await verifyObject(EXPECTED_IDS.badgePublisher, 'Publisher', '0x2');
  results.badgePublisher = badgePub;
  if (!badgePub.exists) {
    issues.push(`❌ Badge Publisher ${EXPECTED_IDS.badgePublisher} does not exist!`);
  } else if (badgePub.actualPackageId !== '0x2') {
    issues.push(`❌ Badge Publisher is from package ${badgePub.actualPackageId}, expected 0x2 (Sui framework)`);
  } else {
    console.log('   ✅ Badge Publisher exists (from Sui framework package 0x2, which is correct)');
  }

  // Verify Badge Display
  // Note: Display is from package 0x2 (Sui framework), but should reference the new badge type
  console.log('\n🎨 Verifying Badge Display...');
  const badgeDisplay = await verifyObject(EXPECTED_IDS.badgeDisplay, 'Display', '0x2');
  results.badgeDisplay = badgeDisplay;
  if (!badgeDisplay.exists) {
    issues.push(`❌ Badge Display ${EXPECTED_IDS.badgeDisplay} does not exist!`);
  } else {
    // Check if Display references the correct badge type from new package
    const displayType = badgeDisplay.actualType || '';
    if (displayType.includes(EXPECTED_PACKAGE_ID)) {
      console.log('   ✅ Badge Display exists and references new package badge type');
    } else if (displayType.includes('0x262634988ab966ef39dadcace74637e1e30193943ec1afe475ff67bbb528f966')) {
      issues.push(`❌ Badge Display references OLD package badge type, expected ${EXPECTED_PACKAGE_ID}`);
    } else {
      console.log('   ✅ Badge Display exists (from Sui framework package 0x2, which is correct)');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY\n');

  if (issues.length === 0) {
    console.log('✅ All contract IDs are correct and match the expected package!');
  } else {
    console.log(`❌ Found ${issues.length} issue(s):\n`);
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });

    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('   1. If Badge Registry is from wrong package, run:');
    console.log('      node setup-badge-system.js');
    console.log('      (Make sure GAME_SCORE_CONTRACT_TESTNET is set to the new package ID)');
    console.log('\n   2. If any other objects are wrong, check the deployment transaction:');
    console.log(`      https://suiexplorer.com/txblock/${DEPLOYMENT_TX}?network=testnet`);
  }

  // Detailed results
  console.log('\n' + '='.repeat(80));
  console.log('📋 DETAILED RESULTS\n');
  for (const [name, result] of Object.entries(results)) {
    if (result.exists) {
      console.log(`${name}:`);
      console.log(`  Object ID: ${EXPECTED_IDS[name] || 'N/A'}`);
      console.log(`  Type: ${result.actualType}`);
      console.log(`  Package: ${result.actualPackageId}`);
      console.log(`  Matches: ${result.matches ? '✅' : '❌'}`);
    } else {
      console.log(`${name}: ❌ NOT FOUND`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }
    console.log('');
  }
}

verifyAll().catch(console.error);


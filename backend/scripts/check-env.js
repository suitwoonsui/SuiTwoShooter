/**
 * Simple script to check .env configuration
 * Run with: node scripts/check-env.js
 */

require('dotenv').config({ path: '.env.local' });

const EXPECTED_OLD_PACKAGE = '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b';
const EXPECTED_OLD_REGISTRY = '0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf';

console.log('🔍 Checking .env Configuration...\n');

const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;
const oldAdminCapabilityId = process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID;
const oldStatsRegistryId = process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;

let allGood = true;

console.log('📋 Environment Variables:');
console.log(`   OLD_GAME_SCORE_CONTRACT_TESTNET: ${oldPackageId || '❌ NOT SET'}`);
if (oldPackageId) {
  if (oldPackageId === EXPECTED_OLD_PACKAGE) {
    console.log(`      ✅ Correct (matches expected old package for badges)`);
  } else {
    console.log(`      ❌ WRONG - Expected: ${EXPECTED_OLD_PACKAGE}`);
    console.log(`         Current: ${oldPackageId}`);
    allGood = false;
  }
}

console.log(`\n   OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET: ${oldRegistryId || '❌ NOT SET'}`);
if (oldRegistryId) {
  if (oldRegistryId === EXPECTED_OLD_REGISTRY) {
    console.log(`      ✅ Correct`);
  } else {
    console.log(`      ⚠️  Different from expected: ${EXPECTED_OLD_REGISTRY}`);
    console.log(`         Current: ${oldRegistryId}`);
  }
}

console.log(`\n   OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET: ${oldAdminCapabilityId || '❌ NOT SET'}`);
if (!oldAdminCapabilityId) {
  allGood = false;
} else {
  console.log(`      Value: ${oldAdminCapabilityId}`);
  console.log(`      ⚠️  Must be from package ${EXPECTED_OLD_PACKAGE.substring(0, 10)}...`);
}

console.log(`\n   OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET: ${oldStatsRegistryId || '⚠️  NOT SET (will use new contract)'}`);
if (oldStatsRegistryId) {
  console.log(`      Value: ${oldStatsRegistryId}`);
  console.log(`      ⚠️  Must be from package ${EXPECTED_OLD_PACKAGE.substring(0, 10)}...`);
}

console.log('\n' + '='.repeat(60));
if (allGood && oldPackageId && oldRegistryId && oldAdminCapabilityId) {
  console.log('✅ Basic configuration looks correct!');
  console.log('\n⚠️  Note: To fully verify, objects must be checked on-chain to ensure');
  console.log('   they are from the correct package. Use the admin API endpoint:');
  console.log('   POST /api/admin/badges with action: "verify-old-config"');
} else {
  console.log('❌ Configuration issues found!');
  if (!oldPackageId) {
    console.log('   - OLD_GAME_SCORE_CONTRACT_TESTNET is not set');
  }
  if (!oldRegistryId) {
    console.log('   - OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET is not set');
  }
  if (!oldAdminCapabilityId) {
    console.log('   - OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET is not set');
  }
  if (oldPackageId && oldPackageId !== EXPECTED_OLD_PACKAGE) {
    console.log('   - OLD_GAME_SCORE_CONTRACT_TESTNET has wrong value');
  }
}


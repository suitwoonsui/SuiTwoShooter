/**
 * Verification script to check if .env file matches DEPLOYMENT_IDS.md
 * Run with: node scripts/verify-env-config.js
 */

require('dotenv').config({ path: '.env.local' });
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const EXPECTED_OLD_PACKAGE = '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b';

async function verifyConfig() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  console.log('🔍 Verifying Old Contract Configuration...\n');
  
  const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
  const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;
  const oldAdminCapabilityId = process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID;
  const oldStatsRegistryId = process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;

  const issues = [];
  const config = {};

  // Check if all required variables are set
  console.log('📋 Environment Variables:');
  console.log(`   OLD_GAME_SCORE_CONTRACT_TESTNET: ${oldPackageId || '❌ NOT SET'}`);
  console.log(`   OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET: ${oldRegistryId || '❌ NOT SET'}`);
  console.log(`   OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET: ${oldAdminCapabilityId || '❌ NOT SET'}`);
  console.log(`   OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET: ${oldStatsRegistryId || '❌ NOT SET'}\n`);

  if (!oldPackageId) {
    issues.push({ field: 'OLD_GAME_SCORE_CONTRACT_TESTNET', issue: 'Not set' });
  } else {
    config.oldPackageId = oldPackageId;
    
    // Check if it matches expected
    if (oldPackageId !== EXPECTED_OLD_PACKAGE) {
      issues.push({
        field: 'OLD_GAME_SCORE_CONTRACT_TESTNET',
        issue: `Expected ${EXPECTED_OLD_PACKAGE}, but got ${oldPackageId}`,
      });
    }
  }

  if (!oldRegistryId) {
    issues.push({ field: 'OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET', issue: 'Not set' });
  } else {
    config.oldRegistryId = oldRegistryId;
  }

  if (!oldAdminCapabilityId) {
    issues.push({ field: 'OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET', issue: 'Not set' });
  } else {
    config.oldAdminCapabilityId = oldAdminCapabilityId;
  }

  if (!oldStatsRegistryId) {
    issues.push({ field: 'OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET', issue: 'Not set (will use new contract stats registry as fallback)' });
    config.oldStatsRegistryId = 'NOT SET';
  } else {
    config.oldStatsRegistryId = oldStatsRegistryId;
  }

  // If all required are set, verify they're from the correct package
  if (oldPackageId && oldRegistryId && oldAdminCapabilityId) {
    console.log('🔗 Verifying objects are from correct package...\n');
    
    try {
      // Verify registry
      console.log(`   Checking BadgeRegistry: ${oldRegistryId.substring(0, 10)}...`);
      const registryObj = await client.getObject({
        id: oldRegistryId,
        options: { showType: true },
      });

      if (registryObj.data?.type) {
        const registryPackage = registryObj.data.type.split('::')[0];
        console.log(`      Type: ${registryObj.data.type}`);
        console.log(`      Package: ${registryPackage}`);
        if (registryPackage !== oldPackageId) {
          issues.push({
            field: 'OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET',
            issue: `Registry is from package ${registryPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is ${oldPackageId}`,
          });
          console.log(`      ❌ MISMATCH - Registry is from different package!`);
        } else {
          console.log(`      ✅ Correct package`);
        }
      } else {
        issues.push({
          field: 'OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET',
          issue: 'Registry object not found or invalid',
        });
        console.log(`      ❌ Object not found`);
      }

      // Verify admin capability
      console.log(`\n   Checking AdminCapability: ${oldAdminCapabilityId.substring(0, 10)}...`);
      const adminCapObj = await client.getObject({
        id: oldAdminCapabilityId,
        options: { showType: true },
      });

      if (adminCapObj.data?.type) {
        const adminCapPackage = adminCapObj.data.type.split('::')[0];
        console.log(`      Type: ${adminCapObj.data.type}`);
        console.log(`      Package: ${adminCapPackage}`);
        if (adminCapPackage !== oldPackageId) {
          issues.push({
            field: 'OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET',
            issue: `AdminCapability is from package ${adminCapPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is ${oldPackageId}`,
          });
          console.log(`      ❌ MISMATCH - AdminCapability is from different package!`);
        } else {
          console.log(`      ✅ Correct package`);
        }
      } else {
        issues.push({
          field: 'OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET',
          issue: 'AdminCapability object not found or invalid',
        });
        console.log(`      ❌ Object not found`);
      }

      // Verify stats registry if set
      if (oldStatsRegistryId && oldStatsRegistryId !== 'NOT SET') {
        console.log(`\n   Checking StatisticsRegistry: ${oldStatsRegistryId.substring(0, 10)}...`);
        const statsRegObj = await client.getObject({
          id: oldStatsRegistryId,
          options: { showType: true },
        });

        if (statsRegObj.data?.type) {
          const statsRegPackage = statsRegObj.data.type.split('::')[0];
          console.log(`      Type: ${statsRegObj.data.type}`);
          console.log(`      Package: ${statsRegPackage}`);
          if (statsRegPackage !== oldPackageId) {
            issues.push({
              field: 'OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET',
              issue: `StatisticsRegistry is from package ${statsRegPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is ${oldPackageId}`,
            });
            console.log(`      ❌ MISMATCH - StatisticsRegistry is from different package!`);
          } else {
            console.log(`      ✅ Correct package`);
          }
        } else {
          issues.push({
            field: 'OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET',
            issue: 'StatisticsRegistry object not found or invalid',
          });
          console.log(`      ❌ Object not found`);
        }
      }
    } catch (verifyError) {
      issues.push({
        field: 'VERIFICATION',
        issue: `Failed to verify objects on blockchain: ${verifyError.message}`,
      });
      console.log(`\n   ❌ Error verifying objects: ${verifyError.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (issues.length > 0) {
    console.log('❌ Configuration Issues Found:\n');
    issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue.field}: ${issue.issue}`);
    });
    console.log('\n⚠️  Please fix these issues before using the old contract functions.');
    process.exit(1);
  } else {
    console.log('✅ Configuration is correct!');
    console.log('\n📦 Current Configuration:');
    console.log(`   Old Package: ${config.oldPackageId}`);
    console.log(`   Badge Registry: ${config.oldRegistryId}`);
    console.log(`   Admin Capability: ${config.oldAdminCapabilityId}`);
    console.log(`   Statistics Registry: ${config.oldStatsRegistryId || 'Using new contract registry'}`);
    console.log('\n✅ All objects are from the correct package!');
    process.exit(0);
  }
}

verifyConfig().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});


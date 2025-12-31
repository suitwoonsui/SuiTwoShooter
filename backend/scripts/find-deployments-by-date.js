/**
 * Find deployments by checking transaction timestamps
 * This will help identify deployments from 12-27, 12-28, or 12-29 that might be missing
 * 
 * Usage:
 *   node backend/scripts/find-deployments-by-date.js
 */

require('dotenv').config({ path: '.env' });

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
const testnetUrl = RPC_URL.includes('testnet') ? RPC_URL : getFullnodeUrl('testnet');
const client = new SuiClient({ url: testnetUrl });

// All known package IDs from DEPLOYMENT_IDS.md
const KNOWN_PACKAGES = [
  { id: '0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c', tx: 'Ebff5a7dR75ZPrXyroj2JAg5qBLnPNRWCwr7fSaztiTV', name: 'Current' },
  { id: '0xea5767f2e72096e637f2f64175aa8931c6cd3fde3dc7cc450dc9399ec1daf4c6', tx: '3L4xSGwbwYYoGdcukt8LQeMj3NE5qVcMBWnUDxsr8Zyu', name: 'Previous 2025-12-30' },
  { id: '0x7406dc825f706a249e72b087bd971889a54b7a4f37a372827ad83bfce1c88e49', tx: 'HYgPNo1MD4FcnqJBHXcQmcbJxbTPcb4hLpjcurEXJA3c', name: 'Earlier 2025-12-30' },
  { id: '0x987bfff631bbbda273e7c5adb472cb9500252171768ac38cecc51d643753b4d5', tx: 'EYkkw25KVMRbFNiVPQaoW9yNrxEDuSJRjNQxA66jSLND', name: 'Earlier 2025-12-30 (2)' },
  { id: '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352', tx: '4obHCdHkUt88yLKYzzQiADFsBk1FVU1ZwDWChBefDgSL', name: '2025-12-23' },
  { id: '0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0', tx: 'H1TLvsCcs3BhkXEnNGuzorN3nRcbWAewU2sxzq2e4eoZ', name: '2025-12-22' },
];

async function checkTransactionDate(txDigest, packageId, name) {
  try {
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (tx.timestampMs) {
      const date = new Date(Number(tx.timestampMs));
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      return {
        packageId,
        name,
        txDigest,
        date: dateStr,
        timestamp: date.toISOString(),
        isTargetDate: dateStr === '2025-12-27' || dateStr === '2025-12-28' || dateStr === '2025-12-29',
      };
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️  Error checking ${name}: ${error.message}`);
    return null;
  }
}

async function findPackagesByDate() {
  console.log('🔍 Finding Deployments by Date');
  console.log('='.repeat(80));
  console.log(`RPC URL: ${testnetUrl}`);
  console.log('='.repeat(80));
  console.log('\n📅 Checking transaction timestamps for known packages...\n');
  
  const results = [];
  
  for (const pkg of KNOWN_PACKAGES) {
    console.log(`📦 Checking ${pkg.name}...`);
    console.log(`   Package: ${pkg.id.substring(0, 20)}...`);
    console.log(`   Transaction: ${pkg.tx}`);
    
    const result = await checkTransactionDate(pkg.tx, pkg.id, pkg.name);
    if (result) {
      results.push(result);
      console.log(`   ✅ Date: ${result.date} (${result.timestamp})`);
      if (result.isTargetDate) {
        console.log(`   🎯 TARGET DATE FOUND!`);
      }
    } else {
      console.log(`   ⚠️  Could not determine date`);
    }
    console.log('');
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('='.repeat(80));
  
  const targetPackages = results.filter(r => r.isTargetDate);
  
  if (targetPackages.length > 0) {
    console.log('\n🎯 Packages deployed on 12-27, 12-28, or 12-29:');
    targetPackages.forEach(pkg => {
      console.log(`\n   📦 ${pkg.name}`);
      console.log(`      Package ID: ${pkg.packageId}`);
      console.log(`      Transaction: ${pkg.txDigest}`);
      console.log(`      Date: ${pkg.date}`);
      console.log(`      Timestamp: ${pkg.timestamp}`);
    });
  } else {
    console.log('\n❌ No packages found deployed on 12-27, 12-28, or 12-29');
    console.log('\n📅 All checked packages:');
    results.forEach(pkg => {
      console.log(`   ${pkg.date} - ${pkg.name} (${pkg.packageId.substring(0, 20)}...)`);
    });
  }
  
  // Check if we need to search for more packages
  console.log('\n\n💡 Next Steps:');
  if (targetPackages.length === 0) {
    console.log('   1. The deployments from 12-27, 12-28, or 12-29 might not be in the known list');
    console.log('   2. Check your deployment logs or transaction history for packages from those dates');
    console.log('   3. Or check if any of the "2025-12-30" deployments were actually deployed on 12-27, 12-28, or 12-29');
  } else {
    console.log(`   1. Use package ${targetPackages[0].packageId} for OLD_ values`);
    console.log(`   2. Extract object IDs from transaction ${targetPackages[0].txDigest}`);
  }
  
  console.log('');
}

findPackagesByDate().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

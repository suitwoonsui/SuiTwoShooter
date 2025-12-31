/**
 * Verify the actual deployment date by checking the transaction on-chain
 */

require('dotenv').config({ path: '.env' });
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

async function verifyDeploymentDate() {
  console.log('🔍 Verifying Deployment Date from Blockchain\n');
  console.log('='.repeat(60));
  console.log('');

  const network = process.env.SUI_NETWORK || process.env.SUI_TESTNET_NETWORK || 'testnet';
  const client = new SuiClient({
    url: getFullnodeUrl(network)
  });

  // Transaction digest from DEPLOYMENT_IDS.md
  const txDigest = '4obHCdHkUt88yLKYzzQiADFsBk1FVU1ZwDWChBefDgSL';
  const packageId = '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352';

  console.log(`🌐 Network: ${network}`);
  console.log(`📦 Package ID: ${packageId}`);
  console.log(`📝 Transaction: ${txDigest}`);
  console.log('');

  try {
    // Get the transaction
    console.log('1️⃣  Checking transaction details...');
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
        showInput: false,
      },
    });

    if (tx.timestampMs) {
      const date = new Date(Number(tx.timestampMs));
      console.log(`   ✅ Transaction timestamp: ${date.toISOString()}`);
      console.log(`   📅 Date: ${date.toLocaleDateString()}`);
      console.log(`   🕐 Time: ${date.toLocaleTimeString()}`);
      console.log(`   📆 Formatted: ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    } else {
      console.log(`   ⚠️  No timestamp in transaction`);
    }

    // Check if this is a package publish transaction
    if (tx.objectChanges) {
      const published = tx.objectChanges.find(change => change.type === 'published');
      if (published) {
        console.log(`   ✅ Package published: ${published.packageId}`);
        if (published.packageId === packageId) {
          console.log(`   ✅ Package ID matches!`);
        } else {
          console.log(`   ⚠️  Package ID mismatch!`);
          console.log(`      Expected: ${packageId}`);
          console.log(`      Found: ${published.packageId}`);
        }
      }
    }

    console.log('');

    // Also check the package object directly
    console.log('2️⃣  Checking package object...');
    try {
      const packageObj = await client.getObject({
        id: packageId,
        options: { showType: true, showContent: false, showOwner: true }
      });

      if (packageObj.data) {
        console.log(`   ✅ Package exists`);
        console.log(`   Type: ${packageObj.data.type || 'Unknown'}`);
        
        // Try to get the package's creation transaction
        if (packageObj.data.owner) {
          console.log(`   Owner: ${JSON.stringify(packageObj.data.owner)}`);
        }
      } else if (packageObj.error) {
        console.log(`   ❌ Package not found: ${packageObj.error.code}`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking package: ${error.message}`);
    }
    console.log('');

    // Check transaction effects for more info
    if (tx.effects) {
      console.log('3️⃣  Transaction effects:');
      console.log(`   Status: ${tx.effects.status?.status || 'Unknown'}`);
      if (tx.effects.gasUsed) {
        console.log(`   Gas used: ${tx.effects.gasUsed.computationCost || 'N/A'}`);
      }
    }
    console.log('');

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.stack) {
      console.log(`Stack: ${error.stack}`);
    }
  }

  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log('The transaction timestamp above shows the actual deployment date.');
  console.log('Update DEPLOYMENT_IDS.md with the correct date.');
  console.log('');
}

verifyDeploymentDate().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


// Extract TreasuryCap Object ID from deployment transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const txDigest = '5G2YjAjG2UPwSVFod6Lx2VDvPTTLxnwg3ybUYaeWhoX2';

async function extractTreasuryCap() {
  try {
    console.log('🔍 Querying transaction:', txDigest);
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });

    let treasuryCapObjectId = null;
    let tokenTypeId = null;
    let packageId = null;

    console.log('\n📋 Checking objectChanges...');
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'published') {
          packageId = change.packageId;
          console.log(`  ✅ Found Package ID: ${packageId}`);
        }
        if (change.type === 'created' && change.objectType) {
          console.log(`  - ${change.type}: ${change.objectType}`);
          if (change.objectType.includes('TreasuryCap') && change.objectType.includes('MEWS')) {
            treasuryCapObjectId = change.objectId;
            console.log('\n✅ Found MEWS TreasuryCap!');
            console.log('   Object ID:', change.objectId);
            console.log('   Object Type:', change.objectType);
          }
        }
      }
    }

    // Calculate token type ID
    if (packageId) {
      tokenTypeId = `${packageId}::mews::MEWS`;
      console.log('\n✅ Token Type ID:');
      console.log(`   ${tokenTypeId}`);
    }

    console.log('\n📋 Summary:');
    if (packageId) {
      console.log(`   ✅ Package ID: ${packageId}`);
    } else {
      console.log('   ⚠️  Package ID: Not found');
    }
    if (treasuryCapObjectId) {
      console.log(`   ✅ TreasuryCap Object ID: ${treasuryCapObjectId}`);
    } else {
      console.log('   ⚠️  TreasuryCap: Not found');
    }
    if (tokenTypeId) {
      console.log(`   ✅ Token Type ID: ${tokenTypeId}`);
    } else {
      console.log('   ⚠️  Token Type ID: Not found');
    }

    console.log('\n📝 Add these to your backend/.env.local:');
    if (tokenTypeId) {
      console.log(`   MEWS_TOKEN_TYPE_ID_TESTNET=${tokenTypeId}`);
    }
    if (treasuryCapObjectId) {
      console.log(`   MEWS_TREASURY_CAP_OBJECT_ID_TESTNET=${treasuryCapObjectId}`);
    }

    return { packageId, treasuryCapObjectId, tokenTypeId };
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

extractTreasuryCap();


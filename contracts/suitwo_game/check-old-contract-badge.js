// Check for badges under the old contract
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const adminAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
const oldPackageId = '0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed';
const newPackageId = '0xe854820fb67bea5736cede2314d9f9eb4e4e58c3d0444d7d9ad7c5f402f21607';

async function checkOldContractBadge() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  try {
    console.log('🔍 Checking for badges under old contract...\n');
    console.log('📍 Admin Address:', adminAddress);
    console.log('📦 Old Package ID:', oldPackageId);
    console.log('📦 New Package ID:', newPackageId);
    console.log('');
    
    // Check all owned objects for badge types
    const objects = await client.getOwnedObjects({
      owner: adminAddress,
      options: {
        showType: true,
        showContent: true,
      },
    });
    
    console.log(`📦 Found ${objects.data.length} total objects in admin wallet\n`);
    
    // Look for badges from either package
    const badgeObjects = objects.data.filter(obj => {
      const type = obj.data?.type || '';
      return type.includes('badge') || type.includes('Badge') || type.includes('EarlySupporter');
    });
    
    if (badgeObjects.length > 0) {
      console.log(`✅ Found ${badgeObjects.length} badge object(s)!\n`);
      
      badgeObjects.forEach((obj, idx) => {
        const type = obj.data?.type || '';
        const isOldContract = type.includes(oldPackageId);
        const isNewContract = type.includes(newPackageId);
        
        console.log(`📋 Badge ${idx + 1}:`);
        console.log(`   Object ID: ${obj.data?.objectId}`);
        console.log(`   Type: ${type}`);
        console.log(`   Contract: ${isOldContract ? '⚠️  OLD CONTRACT' : isNewContract ? '✅ NEW CONTRACT' : '❓ UNKNOWN'}`);
        
        if (obj.data?.content?.fields) {
          const fields = obj.data.content.fields;
          console.log(`   Owner (metadata): ${fields.owner}`);
          console.log(`   Tier: ${fields.tier}`);
          console.log(`   Games Played: ${fields.games_played}`);
          console.log(`   Image Data: ${fields.image_data ? `${fields.image_data.length} bytes` : 'none'}`);
        }
        
        console.log('');
        console.log(`   🔗 View on SuiVision: https://suivision.xyz/object/${obj.data?.objectId}?network=testnet`);
        console.log(`   🔗 View on Explorer: https://suiexplorer.com/object/${obj.data?.objectId}?network=testnet`);
        
        if (isOldContract) {
          console.log('');
          console.log('   ⚠️  This badge is from the OLD contract');
          console.log('   The new Display object will NOT apply to this badge');
          console.log('   You have two options:');
          console.log('   1. Mint a new badge under the new contract');
          console.log('   2. The old badge will still work, but won\'t show images via the new Display');
        } else if (isNewContract) {
          const badgeOwner = obj.data?.content?.fields?.owner || adminAddress;
          console.log('');
          console.log(`   ✅ This badge is from the NEW contract`);
          console.log(`   🖼️  Test Image API: http://localhost:3000/api/badges/${badgeOwner}/image`);
          console.log('   The Display object should work for this badge!');
        }
        console.log('');
      });
    } else {
      console.log('❌ No badge objects found in admin wallet');
      console.log('');
      console.log('💡 To test the badge image feature:');
      console.log('   1. Mint a new badge under the new contract');
      console.log('   2. The new Display object will apply to new badges');
      console.log('   3. Images will appear in wallets/SuiVision');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkOldContractBadge();


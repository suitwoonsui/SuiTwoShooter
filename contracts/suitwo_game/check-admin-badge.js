// Check if admin wallet has a badge and find the badge ID
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');

const packageId = process.argv[2] || '0xe854820fb67bea5736cede2314d9f9eb4e4e58c3d0444d7d9ad7c5f402f21607';
const badgeRegistryId = process.argv[3] || '0x34f6768a126e82c0cfba188cd1fe132eb8d5ff23f99b611a52bb4f300fa61420';
const adminAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function checkAdminBadge() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  try {
    console.log('🔍 Checking admin wallet for badge...\n');
    console.log('📍 Admin Address:', adminAddress);
    console.log('📦 Package ID:', packageId);
    console.log('📋 Badge Registry ID:', badgeRegistryId);
    console.log('');
    
    // Check if player has badge using the contract function
    console.log('📥 Calling has_badge function...');
    const tx1 = new Transaction();
    tx1.moveCall({
      target: `${packageId}::badge_system::has_badge`,
      arguments: [
        tx1.object(badgeRegistryId),
        tx1.pure.address(adminAddress),
      ],
    });
    
    const result1 = await client.devInspectTransactionBlock({
      transactionBlock: tx1,
      sender: adminAddress,
    });
    
    if (result1.results && result1.results[0]?.returnValues?.[0]) {
      const returnValue = result1.results[0].returnValues[0];
      let hasBadge = false;
      
      // Parse boolean from return value
      if (Array.isArray(returnValue) && Array.isArray(returnValue[0])) {
        hasBadge = returnValue[0][0] === 1 || returnValue[0][0] === true;
      } else if (returnValue[0] === 1 || returnValue[0] === true) {
        hasBadge = true;
      }
      
      console.log('✅ has_badge result:', hasBadge);
      console.log('');
      
      if (hasBadge) {
        // Get badge ID
        console.log('📥 Getting badge ID...');
        const tx2 = new Transaction();
        tx2.moveCall({
          target: `${packageId}::badge_system::get_badge_id`,
          arguments: [
            tx2.object(badgeRegistryId),
            tx2.pure.address(adminAddress),
          ],
        });
        
        const result2 = await client.devInspectTransactionBlock({
          transactionBlock: tx2,
          sender: adminAddress,
        });
        
        if (result2.results && result2.results[0]?.returnValues?.[0]) {
          const returnValue = result2.results[0].returnValues[0];
          let badgeId = null;
          
          if (Array.isArray(returnValue) && Array.isArray(returnValue[0]) && returnValue[0].length === 32) {
            const bytes = returnValue[0];
            const hexString = bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
            badgeId = `0x${hexString}`;
          }
          
          if (badgeId) {
            console.log('✅ Badge ID:', badgeId);
            console.log('');
            console.log('🔗 Test the image API:');
            console.log(`   http://localhost:3000/api/badges/${adminAddress}/image`);
            console.log('');
            console.log('🔗 View badge on SuiVision:');
            console.log(`   https://suivision.xyz/object/${badgeId}?network=testnet`);
            console.log('');
            console.log('🔗 View badge on Sui Explorer:');
            console.log(`   https://suiexplorer.com/object/${badgeId}?network=testnet`);
          } else {
            console.log('⚠️  Could not extract badge ID from response');
            console.log('   Response:', JSON.stringify(result2.results[0].returnValues, null, 2));
          }
        } else {
          console.log('❌ Could not get badge ID');
        }
      } else {
        console.log('❌ Admin wallet does NOT have a badge registered');
        console.log('');
        console.log('💡 The badge might be:');
        console.log('   1. In the admin wallet but not registered in the registry');
        console.log('   2. Registered under a different address');
        console.log('   3. Need to check owned objects directly');
        console.log('');
        console.log('🔍 Checking owned objects...');
        
        // Check owned objects
        const objects = await client.getOwnedObjects({
          owner: adminAddress,
          filter: {
            StructType: `${packageId}::badge_system::EarlySupporterBadge`,
          },
          options: {
            showType: true,
            showContent: true,
          },
        });
        
        if (objects.data && objects.data.length > 0) {
          console.log(`✅ Found ${objects.data.length} badge(s) in admin wallet!`);
          objects.data.forEach((obj, idx) => {
            console.log(`   Badge ${idx + 1}:`);
            console.log(`   - Object ID: ${obj.data?.objectId}`);
            if (obj.data?.content?.fields) {
              const fields = obj.data.content.fields;
              console.log(`   - Owner: ${fields.owner}`);
              console.log(`   - Tier: ${fields.tier}`);
              console.log(`   - Games Played: ${fields.games_played}`);
            }
            console.log('');
          });
        } else {
          console.log('❌ No badges found in admin wallet');
        }
      }
    } else {
      console.log('❌ Could not get has_badge result');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkAdminBadge();


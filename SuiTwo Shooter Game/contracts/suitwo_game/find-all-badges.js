// Find all badge objects owned by admin wallet
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const adminAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function findAllBadges() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  try {
    console.log('🔍 Searching for all badge objects in admin wallet...\n');
    console.log('📍 Admin Address:', adminAddress);
    console.log('');
    
    // Get all owned objects
    const objects = await client.getOwnedObjects({
      owner: adminAddress,
      options: {
        showType: true,
        showContent: true,
      },
    });
    
    console.log(`📦 Found ${objects.data.length} total objects in admin wallet\n`);
    
    // Filter for badge objects
    const badgeObjects = objects.data.filter(obj => {
      const type = obj.data?.type || '';
      return type.includes('badge') || type.includes('Badge') || type.includes('EarlySupporter');
    });
    
    if (badgeObjects.length > 0) {
      console.log(`✅ Found ${badgeObjects.length} badge object(s)!\n`);
      
      badgeObjects.forEach((obj, idx) => {
        console.log(`📋 Badge ${idx + 1}:`);
        console.log(`   Object ID: ${obj.data?.objectId}`);
        console.log(`   Type: ${obj.data?.type}`);
        
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
        console.log(`   🖼️  Test Image API: http://localhost:3000/api/badges/${fields?.owner || adminAddress}/image`);
        console.log('');
      });
      
      // If badge owner is different from admin, that's why it's not found
      if (badgeObjects[0]?.data?.content?.fields?.owner !== adminAddress) {
        const badgeOwner = badgeObjects[0].data.content.fields.owner;
        console.log('💡 Note: Badge owner (metadata) is different from admin wallet');
        console.log(`   Badge Owner: ${badgeOwner}`);
        console.log(`   Admin Wallet: ${adminAddress}`);
        console.log('');
        console.log('   This badge was minted via admin_mint_badge()');
        console.log('   The badge object is in admin wallet, but registered under player address');
        console.log(`   Use this address to test: ${badgeOwner}`);
        console.log('');
      }
    } else {
      console.log('❌ No badge objects found in admin wallet');
      console.log('');
      console.log('💡 To test the badge image:');
      console.log('   1. Mint a badge (via admin page or game)');
      console.log('   2. Or use an address that already has a badge');
      console.log('');
      console.log('   The image will appear in wallets/SuiVision once:');
      console.log('   - A badge exists');
      console.log('   - The Display object is configured (✅ Done)');
      console.log('   - The API endpoint is accessible (✅ Done)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

findAllBadges();


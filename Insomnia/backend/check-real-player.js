require('dotenv').config();
const { SuiClient } = require('@mysten/sui/client');

async function checkRealPlayer() {
  const oldGamePassSystemId = "0xeb28c8cf9b90b98dddf4e90ec62e274fa8e68fe1fabf7e16b5796d6c3099e074";
  const realPlayerAddress = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0";
  
  console.log('🔍 Checking Real Player in Old Contract...');
  console.log('👤 Real Player Address:', realPlayerAddress);
  console.log('🎫 Old Game Pass System:', oldGamePassSystemId);
  console.log('');

  try {
    // Initialize Sui client
    const client = new SuiClient({
      url: 'https://fullnode.testnet.sui.io:443'
    });

    console.log('🌐 Connected to:', client.url);
    console.log('');

    // Get the old GamePassSystem object
    console.log('🔍 Getting old GamePassSystem object...');
    const oldGamePassSystem = await client.getObject({
      id: oldGamePassSystemId,
      options: { showContent: true }
    });

    if (!oldGamePassSystem.data?.content) {
      console.log('❌ No content found in old GamePassSystem');
      return;
    }

    console.log('✅ Old GamePassSystem found');
    console.log('');

    // Get the active_passes table
    const activePassesTable = oldGamePassSystem.data.content.fields.active_passes;
    if (!activePassesTable) {
      console.log('❌ Active passes table not found');
      return;
    }

    console.log('📋 Active Passes Table ID:', activePassesTable.fields.id.id);
    console.log('');

    // Get dynamic fields from the table
    console.log('🔍 Getting dynamic fields from old table...');
    const dynamicFields = await client.getDynamicFields({
      parentId: activePassesTable.fields.id.id,
      limit: 100
    });

    console.log('📊 Dynamic Fields found:', dynamicFields.data.length);
    console.log('');

    // Look for the real player
    const realPlayerEntry = dynamicFields.data.find(field => 
      field.name.type === 'address' && field.name.value === realPlayerAddress
    );

    if (realPlayerEntry) {
      console.log('✅ Found real player in old contract!');
      console.log('📋 Player entry:', JSON.stringify(realPlayerEntry, null, 2));
      console.log('');

      // Get the actual GamePass object
      const tableEntry = await client.getObject({
        id: realPlayerEntry.objectId,
        options: { showContent: true }
      });

      if (tableEntry.data?.content?.fields?.value) {
        const gamePassId = tableEntry.data.content.fields.value;
        console.log('🎫 GamePass ID from table:', gamePassId);
        console.log('');

        // Get the GamePass object
        const gamePass = await client.getObject({
          id: gamePassId,
          options: { showContent: true }
        });

        if (gamePass.data?.content?.fields) {
          const fields = gamePass.data.content.fields;
          console.log('🎮 GamePass Details:');
          console.log('   - Games Remaining:', fields.games_remaining);
          console.log('   - Pass Type:', fields.pass_type);
          console.log('   - Is Active:', fields.is_active);
          console.log('   - Expires At:', fields.expires_at);
          console.log('   - Purchased At:', fields.purchased_at);
          console.log('');
        }
      }
    } else {
      console.log('❌ Real player NOT found in old contract');
      console.log('');
      
      // Show what players are actually in the old contract
      console.log('📋 Players found in old contract:');
      dynamicFields.data.forEach((field, index) => {
        console.log(`   ${index + 1}. Address: ${field.name.value}`);
      });
      console.log('');
      
      console.log('⚠️  This explains why the migration didn\'t work - the real player data is not in the old contract!');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkRealPlayer().catch(console.error);




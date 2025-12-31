require('dotenv').config();
const { SuiClient } = require('@mysten/sui/client');

async function debugGamePass() {
  const gamePassSystemId = "0x4976bde8443611ea03bb4d8b939ad64c186e44be740f3874e645141e2b892b1f";
  
  console.log('🔍 Debugging Game Pass System...');
  console.log('🎫 Game Pass System ID:', gamePassSystemId);
  console.log('');

  try {
    // Initialize Sui client
    const client = new SuiClient({
      url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
    });

    console.log('🌐 Connected to:', client.url);
    console.log('');

    // Get the GamePassSystem object
    console.log('🔍 Getting GamePassSystem object...');
    const gamePassSystem = await client.getObject({
      id: gamePassSystemId,
      options: { showContent: true }
    });

    console.log('📊 GamePassSystem object:');
    console.log(JSON.stringify(gamePassSystem, null, 2));
    console.log('');

    if (gamePassSystem.data?.content) {
      console.log('🔍 GamePassSystem content fields:');
      console.log(Object.keys(gamePassSystem.data.content.fields));
      console.log('');

      const activePassesTable = gamePassSystem.data.content.fields.active_passes;
      if (activePassesTable) {
        console.log('📋 Active Passes Table:');
        console.log(JSON.stringify(activePassesTable, null, 2));
        console.log('');

        if (activePassesTable.id) {
          console.log('🔍 Getting dynamic fields from table:', activePassesTable.id);
          
          try {
            const dynamicFields = await client.getDynamicFields({
              parentId: activePassesTable.id,
              limit: 100
            });

            console.log('📊 Dynamic Fields:');
            console.log(JSON.stringify(dynamicFields, null, 2));
            console.log('');

            if (dynamicFields.data && dynamicFields.data.length > 0) {
              console.log('✅ Found dynamic fields in table');
              console.log('📊 Number of entries:', dynamicFields.data.length);
              
              // Look for our test player
              const playerAddress = "0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02";
              const playerEntry = dynamicFields.data.find(field => 
                field.name.type === 'address' && field.name.value === playerAddress
              );

              if (playerEntry) {
                console.log('👤 Found player entry:');
                console.log(JSON.stringify(playerEntry, null, 2));
                console.log('');

                // Get the actual GamePass object
                console.log('🔍 Getting GamePass object:', playerEntry.objectId);
                const gamePass = await client.getObject({
                  id: playerEntry.objectId,
                  options: { showContent: true }
                });

                console.log('🎫 GamePass object:');
                console.log(JSON.stringify(gamePass, null, 2));
                console.log('');

                if (gamePass.data?.content?.fields) {
                  console.log('🔍 GamePass fields:');
                  console.log('games_remaining:', gamePass.data.content.fields.games_remaining);
                  console.log('pass_type:', gamePass.data.content.fields.pass_type);
                  console.log('is_active:', gamePass.data.content.fields.is_active);
                  console.log('expires_at:', gamePass.data.content.fields.expires_at);
                  console.log('purchased_at:', gamePass.data.content.fields.purchased_at);
                }
              } else {
                console.log('❌ Player not found in dynamic fields');
              }
            } else {
              console.log('❌ No dynamic fields found in table');
            }
          } catch (error) {
            console.error('❌ Error getting dynamic fields:', error);
          }
        } else {
          console.log('❌ No table ID found in active_passes field');
        }
      } else {
        console.log('❌ active_passes field not found');
      }
    } else {
      console.log('❌ No content found in GamePassSystem object');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugGamePass().catch(console.error);

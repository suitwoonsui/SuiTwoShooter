require('dotenv').config();
const { SuiClient } = require('@mysten/sui/client');

async function simpleDebug() {
  const gamePassId = "0x649a742696fc1d7b20a3e2f8c833c3b12c0d928f5d065c0f324a35830071364a";
  
  console.log('🔍 Simple Debug - GamePass Object...');
  console.log('🎫 GamePass ID:', gamePassId);
  console.log('');

  try {
    // Initialize Sui client
    const client = new SuiClient({
      url: 'https://fullnode.testnet.sui.io:443'
    });

    console.log('🌐 Connected to:', client.url);
    console.log('');

    // Get the GamePass object directly
    console.log('🔍 Getting GamePass object...');
    const gamePass = await client.getObject({
      id: gamePassId,
      options: { showContent: true }
    });

    console.log('🎫 GamePass object:');
    console.log(JSON.stringify(gamePass, null, 2));
    console.log('');

    if (gamePass.data?.content?.fields) {
      console.log('🔍 GamePass fields:');
      const fields = gamePass.data.content.fields;
      console.log('games_remaining:', fields.games_remaining, 'type:', typeof fields.games_remaining);
      console.log('pass_type:', fields.pass_type, 'type:', typeof fields.pass_type);
      console.log('is_active:', fields.is_active, 'type:', typeof fields.is_active);
      console.log('expires_at:', fields.expires_at, 'type:', typeof fields.expires_at);
      console.log('purchased_at:', fields.purchased_at, 'type:', typeof fields.purchased_at);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

simpleDebug().catch(console.error);




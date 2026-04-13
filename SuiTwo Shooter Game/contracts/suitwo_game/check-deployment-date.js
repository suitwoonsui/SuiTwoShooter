// Check the actual deployment date from the transaction
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const txDigest = '5quF1swS36tGYDb3SAYQCk7Mbx2HRqJTr24B44Ewhimr';

async function checkDate() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Checking deployment transaction timestamp...');
    console.log('   Transaction:', txDigest);
    console.log('');
    
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    
    // Get timestamp from transaction
    const timestamp = tx.timestampMs;
    
    if (timestamp) {
      const date = new Date(Number(timestamp));
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const dateTimeStr = date.toISOString();
      
      console.log('📅 Transaction Timestamp:');
      console.log(`   Unix timestamp (ms): ${timestamp}`);
      console.log(`   Date: ${dateStr}`);
      console.log(`   Full datetime: ${dateTimeStr}`);
      console.log('');
      console.log('📝 Use this date in DEPLOYMENT_IDS.md:');
      console.log(`   **Latest Deployment Date:** ${dateStr}`);
    } else {
      console.log('⚠️  No timestamp found in transaction');
      console.log('   Using today\'s date instead');
      const today = new Date().toISOString().split('T')[0];
      console.log(`   **Latest Deployment Date:** ${today}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkDate();


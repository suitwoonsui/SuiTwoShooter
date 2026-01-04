// Search all transactions for Publisher
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const publisherAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function searchAllTransactions() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Searching all transactions for Publisher...');
    console.log('   Address:', publisherAddress);
    console.log('');
    console.log('⚠️  Note: This may take a while and might be rate-limited');
    console.log('   Checking transactions where this address was involved...');
    console.log('');
    
    // Try to get transactions for this address
    // Note: Sui RPC might have limits on how many transactions we can query
    let foundPublisher = false;
    let checkedCount = 0;
    let cursor = null;
    const maxChecks = 50; // Limit to avoid rate limiting
    
    try {
      // Query transactions (this might not be directly available, but let's try)
      // Actually, Sui RPC doesn't have a direct "get transactions by address" endpoint
      // We'd need to use events or query objects
      
      console.log('📋 Alternative: Checking via events...');
      console.log('');
      
      // Check for DisplayCreated events which would indicate Publisher was used
      const displayEvents = await client.queryEvents({
        query: {
          MoveModule: {
            package: publisherAddress, // This won't work, but let's try a different approach
          }
        },
        limit: 100,
      });
      
      console.log('Events found:', displayEvents.data?.length || 0);
      
    } catch (error) {
      console.log('Event query not available or failed');
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('📋 MANUAL CHECK IN SUI EXPLORER');
    console.log('═══════════════════════════════════════\n');
    
    console.log('1. Open your wallet Activity tab:');
    console.log(`   https://suiexplorer.com/address/${publisherAddress}?network=testnet`);
    console.log('');
    console.log('2. In the Activity/Transactions tab:');
    console.log('   - Use Ctrl+F (or Cmd+F on Mac) to search');
    console.log('   - Search for: "Publisher"');
    console.log('   - Look through all transactions');
    console.log('');
    console.log('3. What you\'re looking for:');
    console.log('   - Any transaction that created a "Publisher" object');
    console.log('   - Type: "0x2::package::Publisher"');
    console.log('   - Or: "<package_id>::package::Publisher"');
    console.log('');
    console.log('4. If you find it:');
    console.log('   - Click on that transaction');
    console.log('   - Go to "Changes" or "Object Changes" tab');
    console.log('   - Find the Publisher object ID');
    console.log('   - Copy that object ID');
    console.log('   - Share it with me');
    console.log('');
    console.log('5. Also check for:');
    console.log('   - Transactions where Publisher was "Transferred"');
    console.log('   - Transactions where Publisher was "Consumed"');
    console.log('   - Any transaction mentioning "package::Publisher"');
    console.log('');
    
    console.log('═══════════════════════════════════════');
    console.log('🔍 QUICK SEARCH TIPS');
    console.log('═══════════════════════════════════════\n');
    console.log('In Sui Explorer Activity tab:');
    console.log('   1. Press Ctrl+F (Windows) or Cmd+F (Mac)');
    console.log('   2. Type: Publisher');
    console.log('   3. Press Enter to find next match');
    console.log('   4. Look at each match to see if it\'s a Publisher object');
    console.log('');
    console.log('Look for these patterns:');
    console.log('   - "0x2::package::Publisher"');
    console.log('   - "package::Publisher"');
    console.log('   - "Publisher" in object type');
    console.log('   - "Created" action with Publisher type');
    console.log('');
    
    console.log('═══════════════════════════════════════');
    console.log('💡 IF YOU FIND IT');
    console.log('═══════════════════════════════════════\n');
    console.log('Once you have the Publisher Object ID, run:');
    console.log('   node create-badge-display.js <PUBLISHER_OBJECT_ID>');
    console.log('   OR:');
    console.log('   node setup-badge-system.js <PUBLISHER_OBJECT_ID>');
    console.log('');
    console.log('This will create the Display object for badges.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

searchAllTransactions();


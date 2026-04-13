const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

async function checkRecentTxs() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  const address = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
  
  const txs = await client.queryTransactionBlocks({
    filter: { FromAddress: address },
    options: { showObjectChanges: true },
    limit: 10,
  });
  
  console.log('Last 10 transactions:\n');
  txs.data.forEach((tx, i) => {
    console.log(`${i+1}. ${tx.digest}`);
    tx.objectChanges?.forEach(c => {
      if (c.type === 'created' && c.objectType) {
        const isImportant = c.objectType.includes('AdminCapability') || c.objectType.includes('Display');
        const marker = isImportant ? '✅' : '  ';
        const typeName = c.objectType.split('::').pop();
        console.log(`   ${marker} ${typeName} -> ${c.objectId}`);
      }
    });
    console.log('');
  });
}

checkRecentTxs().catch(console.error);


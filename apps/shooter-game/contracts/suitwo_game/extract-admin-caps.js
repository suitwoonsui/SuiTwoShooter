// Extract admin capability IDs from transactions
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const transactions = [
  '8DZcu4ZD38Uha2rg41jrFeoiFoHVSc5tbLREvnUzzjkj', // Score Submission
  '5v3ate4DXsDWzrSvHL66u3MZCuEYYNJNPbtFCBpdt4Fj', // Premium Store
  'EorWVG3PUeUYWad5CFi1RNBbXk1g2L4r9zbei9ZSZSVu'  // Tournament
];

async function extractAdminCaps() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  const results = await Promise.all(
    transactions.map(digest => 
      client.getTransactionBlock({ 
        digest, 
        options: { showObjectChanges: true } 
      })
    )
  );
  
  const names = ['Score Submission', 'Premium Store', 'Tournament'];
  
  results.forEach((tx, i) => {
    console.log(`\n${names[i]} Admin Capability:`);
    console.log(`  Transaction: ${tx.digest}`);
    
    if (tx.objectChanges) {
      const adminCap = tx.objectChanges.find(
        change => change.type === 'created' && 
        change.objectType?.includes('AdminCapability')
      );
      
      if (adminCap) {
        console.log(`  ✅ Admin Cap ID: ${adminCap.objectId}`);
        console.log(`  Type: ${adminCap.objectType}`);
      } else {
        console.log('  ⚠️  Admin Cap not found in object changes');
        console.log('  All object changes:', JSON.stringify(tx.objectChanges, null, 2));
      }
    } else {
      console.log('  ⚠️  No object changes found');
    }
  });
}

extractAdminCaps().catch(console.error);


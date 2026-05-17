// Check deployment dates for all package IDs to determine chronological order
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packages = [
  '0x8fd0510821f3cd408347bb6f851a358ae9db80d93c4f5b580d65d0304b60c4cb', // Current
  '0x5a4d10695a27145386b510797c2305bf0de82e2dc94e0c19c9717f490d40f110', // Previous
  '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b', // Earlier
  '0x6df4ec20614cbf2b407de12997bb5fa689f7ec2833a3df3ea84cd9986f3f448d', // Earlier
  '0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed', // Earlier
  '0x6e2cb689422cb1a2d4d3ed3817242e2f298ee6e5ab7afbcbb548475118834faa', // Earlier
  '0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a', // Earlier (MEWS)
];

async function checkPackageDate(packageId) {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    const packageObj = await client.getObject({
      id: packageId,
      options: {
        showPreviousTransaction: true,
      },
    });
    
    if (!packageObj.data) {
      return {
        packageId,
        found: false,
        error: 'Package not found',
      };
    }
    
    const publishTx = packageObj.data.previousTransaction;
    
    if (!publishTx) {
      return {
        packageId,
        found: true,
        publishTx: null,
        timestamp: null,
        date: null,
      };
    }
    
    const txDetails = await client.getTransactionBlock({
      digest: publishTx,
      options: {
        showEffects: true,
      },
    });
    
    const timestamp = txDetails.timestampMs ? Number(txDetails.timestampMs) : null;
    const date = timestamp ? new Date(timestamp).toISOString() : null;
    
    return {
      packageId,
      found: true,
      publishTx,
      timestamp,
      date,
    };
  } catch (error) {
    return {
      packageId,
      found: false,
      error: error.message,
    };
  }
}

async function checkAllPackages() {
  console.log('🔍 Checking deployment dates for all packages...\n');
  
  const results = [];
  
  for (const packageId of packages) {
    console.log(`Checking ${packageId.substring(0, 16)}...`);
    const result = await checkPackageDate(packageId);
    results.push(result);
    
    if (result.found && result.date) {
      console.log(`  ✅ Date: ${result.date}`);
      console.log(`  📝 Transaction: ${result.publishTx}\n`);
    } else if (result.found) {
      console.log(`  ⚠️  Found but no timestamp\n`);
    } else {
      console.log(`  ❌ ${result.error}\n`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Sort by timestamp (newest first)
  const sorted = results
    .filter(r => r.timestamp !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  console.log('\n📅 CHRONOLOGICAL ORDER (Newest to Oldest):\n');
  sorted.forEach((result, index) => {
    console.log(`${index + 1}. ${result.packageId}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Transaction: ${result.publishTx}\n`);
  });
  
  // Show packages without timestamps
  const noTimestamp = results.filter(r => r.found && r.timestamp === null);
  if (noTimestamp.length > 0) {
    console.log('\n⚠️  Packages without timestamps:\n');
    noTimestamp.forEach(result => {
      console.log(`   ${result.packageId}`);
      console.log(`   Transaction: ${result.publishTx || 'N/A'}\n`);
    });
  }
  
  // Show packages not found
  const notFound = results.filter(r => !r.found);
  if (notFound.length > 0) {
    console.log('\n❌ Packages not found:\n');
    notFound.forEach(result => {
      console.log(`   ${result.packageId}`);
      console.log(`   Error: ${result.error}\n`);
    });
  }
  
  return sorted;
}

checkAllPackages().catch(console.error);


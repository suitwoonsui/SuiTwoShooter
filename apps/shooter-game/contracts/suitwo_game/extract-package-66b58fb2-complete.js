// Extract ALL object IDs from package 0x66b58fb2... deployment
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packageId = '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b';
const deployTxDigest = '28Pt6vgDgpvm8ocKibmbigEj6nJhPsv4nrfPvQdoC2Hb';
const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function extractAll() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  console.log('🔍 Extracting ALL objects from package:', packageId);
  console.log('📝 Deployment transaction:', deployTxDigest);
  console.log('');
  
  // Get deployment transaction
  const deployTx = await client.getTransactionBlock({
    digest: deployTxDigest,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });
  
  const objects = {};
  
  console.log('=== OBJECTS FROM DEPLOYMENT ===\n');
  
  if (deployTx.objectChanges) {
    for (const change of deployTx.objectChanges) {
      if (change.type === 'published') {
        objects.packageId = change.packageId;
        console.log(`✅ Package: ${change.packageId}`);
      }
      
      if (change.type === 'created' && change.objectType) {
        const type = change.objectType;
        const id = change.objectId;
        
        console.log(`\n[Created] ${type}`);
        console.log(`  ID: ${id}`);
        
        if (type.includes('SessionRegistry')) {
          objects.sessionRegistry = id;
        }
        if (type.includes('StatisticsRegistry')) {
          objects.statisticsRegistry = id;
        }
        if (type.includes('PremiumStore')) {
          objects.premiumStore = id;
        }
        if (type.includes('BadgeRegistry')) {
          objects.badgeRegistry = id;
        }
        if (type.includes('Publisher')) {
          objects.publisher = id;
        }
      }
    }
  }
  
  // Check for admin capabilities in deployer wallet
  console.log('\n=== CHECKING DEPLOYER WALLET ===\n');
  
  const allObjects = await client.getOwnedObjects({
    owner: deployerAddress,
    options: { showType: true },
    limit: 200,
  });
  
  for (const obj of allObjects.data || []) {
    const type = obj.data?.type;
    if (type && type.includes(packageId)) {
      if (type.includes('score_submission::AdminCapability')) {
        objects.adminCapability = obj.data.objectId;
        console.log(`✅ AdminCapability: ${obj.data.objectId}`);
      }
      if (type.includes('premium_store::AdminCapability')) {
        objects.premiumStoreAdminCapability = obj.data.objectId;
        console.log(`✅ PremiumStoreAdminCapability: ${obj.data.objectId}`);
      }
    }
  }
  
  // Check BadgeRegistry object directly
  const knownRegistryId = '0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf';
  try {
    const regObj = await client.getObject({
      id: knownRegistryId,
      options: { showType: true, showPreviousTransaction: true },
    });
    if (regObj.data?.type?.includes(packageId)) {
      objects.badgeRegistry = knownRegistryId;
      console.log(`\n✅ BadgeRegistry confirmed: ${knownRegistryId}`);
      console.log(`   Created in transaction: ${regObj.data.previousTransaction}`);
    }
  } catch (e) {}
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPLETE CONFIGURATION FOR PACKAGE 0x66b58fb2...\n');
  
  console.log('Package ID:', objects.packageId || packageId);
  console.log('Session Registry:', objects.sessionRegistry || 'NOT FOUND');
  console.log('Statistics Registry:', objects.statisticsRegistry || 'NOT FOUND');
  console.log('Premium Store:', objects.premiumStore || 'NOT FOUND');
  console.log('Badge Registry:', objects.badgeRegistry || 'NOT FOUND');
  console.log('Publisher:', objects.publisher || 'NOT FOUND');
  console.log('Admin Capability:', objects.adminCapability || 'NOT FOUND');
  console.log('Premium Store Admin Capability:', objects.premiumStoreAdminCapability || 'NOT FOUND');
  
  console.log('\n' + '='.repeat(80));
  console.log('📝 .ENV CONFIGURATION:\n');
  
  console.log(`OLD_GAME_SCORE_CONTRACT_TESTNET=${objects.packageId || packageId}`);
  if (objects.sessionRegistry) {
    console.log(`OLD_SESSION_REGISTRY_OBJECT_ID_TESTNET=${objects.sessionRegistry}`);
  }
  if (objects.statisticsRegistry) {
    console.log(`OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET=${objects.statisticsRegistry}`);
  }
  if (objects.premiumStore) {
    console.log(`OLD_PREMIUM_STORE_CONTRACT_TESTNET=${objects.packageId || packageId}`);
    console.log(`OLD_PREMIUM_STORE_OBJECT_ID_TESTNET=${objects.premiumStore}`);
  }
  if (objects.badgeRegistry) {
    console.log(`OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=${objects.badgeRegistry}`);
  }
  if (objects.publisher) {
    console.log(`OLD_BADGE_PUBLISHER_OBJECT_ID_TESTNET=${objects.publisher}`);
  }
  if (objects.adminCapability) {
    console.log(`OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${objects.adminCapability}`);
  }
  if (objects.premiumStoreAdminCapability) {
    console.log(`OLD_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${objects.premiumStoreAdminCapability}`);
  }
}

extractAll().catch(console.error);


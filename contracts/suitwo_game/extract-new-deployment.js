// Extract all object IDs from the new deployment
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const path = require('path');

const txDigest = 'ACuUuNH4f3aa3m3eQw2DGQMCGzbcvkScTPHN2bcYTHki';
const packageId = '0x10666e8f2da2023c89e5d3b5259fa6e091a10ddd862536afdd1eedad4e53591b';
const deployerAddress = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

async function extractAll() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  console.log('🔍 Extracting all objects from deployment:', packageId);
  console.log('📝 Transaction:', txDigest);
  console.log('');
  
  const tx = await client.getTransactionBlock({
    digest: txDigest,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });
  
  const objects = {
    packageId: null,
    sessionRegistry: null,
    statisticsRegistry: null,
    premiumStore: null,
    publisher: null,
  };
  
  console.log('=== OBJECTS FROM DEPLOYMENT TRANSACTION ===\n');
  
  if (tx.objectChanges) {
    for (const change of tx.objectChanges) {
      if (change.type === 'published') {
        objects.packageId = change.packageId;
        console.log(`✅ Package ID: ${change.packageId}`);
      }
      
      if (change.type === 'created' && change.objectType) {
        const type = change.objectType;
        const id = change.objectId;
        
        console.log(`\n[Created] ${type}`);
        console.log(`  Object ID: ${id}`);
        
        if (type.includes('SessionRegistry')) {
          objects.sessionRegistry = id;
          console.log('  ✅ Session Registry');
        }
        if (type.includes('StatisticsRegistry')) {
          objects.statisticsRegistry = id;
          console.log('  ✅ Statistics Registry');
        }
        if (type.includes('PremiumStore')) {
          objects.premiumStore = id;
          console.log('  ✅ Premium Store');
        }
        if (type.includes('Publisher')) {
          objects.publisher = id;
          console.log('  ✅ Publisher');
        }
      }
    }
  }
  
  // Check for badge publisher
  console.log('\n=== CHECKING FOR BADGE PUBLISHER ===\n');
  if (!objects.publisher) {
    // Look for badge_system Publisher
    const allObjects = await client.getOwnedObjects({
      owner: deployerAddress,
      options: { showType: true },
      limit: 50,
    });
    
    for (const obj of allObjects.data || []) {
      const type = obj.data?.type;
      if (type && type.includes('Publisher') && type.includes('badge_system')) {
        objects.publisher = obj.data.objectId;
        console.log(`✅ Badge Publisher found: ${obj.data.objectId}`);
        break;
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPLETE OBJECT LIST\n');
  console.log('Package ID:', objects.packageId || packageId);
  console.log('Session Registry:', objects.sessionRegistry || 'NOT FOUND');
  console.log('Statistics Registry:', objects.statisticsRegistry || 'NOT FOUND');
  console.log('Premium Store:', objects.premiumStore || 'NOT FOUND');
  console.log('Publisher:', objects.publisher || 'NOT FOUND');
  
  console.log('\n' + '='.repeat(80));
  console.log('📝 .ENV VARIABLES:\n');
  console.log(`GAME_SCORE_CONTRACT_TESTNET=${objects.packageId || packageId}`);
  if (objects.sessionRegistry) {
    console.log(`SESSION_REGISTRY_OBJECT_ID_TESTNET=${objects.sessionRegistry}`);
  }
  if (objects.statisticsRegistry) {
    console.log(`STATISTICS_REGISTRY_OBJECT_ID_TESTNET=${objects.statisticsRegistry}`);
  }
  if (objects.premiumStore) {
    console.log(`PREMIUM_STORE_CONTRACT_TESTNET=${objects.packageId || packageId}`);
    console.log(`PREMIUM_STORE_OBJECT_ID_TESTNET=${objects.premiumStore}`);
  }
  if (objects.publisher) {
    console.log(`BADGE_PUBLISHER_OBJECT_ID_TESTNET=${objects.publisher}`);
  }
  
  return objects;
}

extractAll().catch(console.error);


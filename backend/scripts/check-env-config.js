/**
 * Check what environment variables the config is actually reading
 * This will help diagnose why old contract IDs aren't being used
 */

// Load from .env (user confirmed they use .env, not .env.local)
require('dotenv').config({ path: '.env' });

async function checkConfig() {
  console.log('🔍 Checking Environment Variable Configuration\n');
  console.log('='.repeat(60));
  console.log('');

  // Check raw environment variables
  console.log('📋 Raw Environment Variables:');
  console.log('-'.repeat(60));
  const envVars = {
    'OLD_PREMIUM_STORE_OBJECT_ID_TESTNET': process.env.OLD_PREMIUM_STORE_OBJECT_ID_TESTNET,
    'OLD_PREMIUM_STORE_CONTRACT_TESTNET': process.env.OLD_PREMIUM_STORE_CONTRACT_TESTNET,
    'OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET': process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET,
    'OLD_GAME_SCORE_CONTRACT_TESTNET': process.env.OLD_GAME_SCORE_CONTRACT_TESTNET,
    'PREMIUM_STORE_OBJECT_ID_TESTNET': process.env.PREMIUM_STORE_OBJECT_ID_TESTNET,
    'STATISTICS_REGISTRY_OBJECT_ID_TESTNET': process.env.STATISTICS_REGISTRY_OBJECT_ID_TESTNET,
    'GAME_SCORE_CONTRACT_TESTNET': process.env.GAME_SCORE_CONTRACT_TESTNET,
  };

  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`❌ ${key}: NOT SET`);
    }
  }
  console.log('');

  // Check what config SHOULD be reading (based on config.ts logic)
  console.log('📋 Expected Config Values (based on config.ts logic):');
  console.log('-'.repeat(60));
  const network = process.env.SUI_NETWORK || process.env.SUI_TESTNET_NETWORK || 'testnet';
  
  const currentStoreObject = network === 'testnet'
    ? (process.env.PREMIUM_STORE_OBJECT_ID_TESTNET || process.env.PREMIUM_STORE_OBJECT_ID || '')
    : (process.env.PREMIUM_STORE_OBJECT_ID_MAINNET || process.env.PREMIUM_STORE_OBJECT_ID || '');
  
  const oldStoreObject = network === 'testnet'
    ? (process.env.OLD_PREMIUM_STORE_OBJECT_ID_TESTNET || process.env.OLD_PREMIUM_STORE_OBJECT_ID || '')
    : (process.env.OLD_PREMIUM_STORE_OBJECT_ID_MAINNET || process.env.OLD_PREMIUM_STORE_OBJECT_ID || '');
  
  console.log('Current Contracts:');
  console.log(`  Premium Store Object: ${currentStoreObject ? currentStoreObject.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`  Statistics Registry: ${process.env.STATISTICS_REGISTRY_OBJECT_ID_TESTNET ? process.env.STATISTICS_REGISTRY_OBJECT_ID_TESTNET.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`  Game Score Contract: ${process.env.GAME_SCORE_CONTRACT_TESTNET ? process.env.GAME_SCORE_CONTRACT_TESTNET.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log('');
  
  console.log('Old Contracts (for migration):');
  console.log(`  Old Premium Store Object: ${oldStoreObject ? oldStoreObject.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`  Old Statistics Registry: ${process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET ? process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`  Old Game Score Contract: ${process.env.OLD_GAME_SCORE_CONTRACT_TESTNET ? process.env.OLD_GAME_SCORE_CONTRACT_TESTNET.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log('');

  // Check if old IDs match current IDs (this would be the problem!)
  if (oldStoreObject && currentStoreObject && oldStoreObject === currentStoreObject) {
    console.log('⚠️  WARNING: Old Premium Store Object ID matches Current!');
    console.log('   This means migration will query the wrong contract.');
    console.log('');
  }

  if (oldStoreObject && currentStoreObject) {
    console.log('Comparison:');
    console.log(`  Current: ${currentStoreObject}`);
    console.log(`  Old:     ${oldStoreObject}`);
    console.log(`  Match:   ${oldStoreObject === currentStoreObject ? '❌ YES (WRONG!)' : '✅ NO (CORRECT)'}`);
    console.log('');
  }

  // Check .env file location
  console.log('📁 File Check:');
  console.log('-'.repeat(60));
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envPath)) {
    console.log(`✅ .env exists: ${envPath}`);
    const content = fs.readFileSync(envPath, 'utf8');
    const hasOldStore = content.includes('OLD_PREMIUM_STORE_OBJECT_ID_TESTNET');
    const hasOldStats = content.includes('OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET');
    const hasOldGameScore = content.includes('OLD_GAME_SCORE_CONTRACT_TESTNET');
    console.log(`   Contains OLD_PREMIUM_STORE_OBJECT_ID_TESTNET: ${hasOldStore ? '✅ YES' : '❌ NO'}`);
    console.log(`   Contains OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET: ${hasOldStats ? '✅ YES' : '❌ NO'}`);
    console.log(`   Contains OLD_GAME_SCORE_CONTRACT_TESTNET: ${hasOldGameScore ? '✅ YES' : '❌ NO'}`);
  } else {
    console.log(`❌ .env NOT FOUND: ${envPath}`);
  }
  console.log('');

  console.log('💡 Recommendations:');
  console.log('-'.repeat(60));
  if (!process.env.OLD_PREMIUM_STORE_OBJECT_ID_TESTNET) {
    console.log('1. Add OLD_PREMIUM_STORE_OBJECT_ID_TESTNET to your .env file');
    console.log('   Expected: 0xc0272b762e644dd95e6dfcb374f647838103ee165e9a824152c0b68f23cfcba7');
  }
  if (!process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET) {
    console.log('2. Add OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET to your .env file');
    console.log('   Expected: 0x73b42806b5324b8359a507c924b24e4161af5b72f0bf62c4a87b9bccd3dc4f59');
  }
  if (!process.env.OLD_GAME_SCORE_CONTRACT_TESTNET) {
    console.log('3. Add OLD_GAME_SCORE_CONTRACT_TESTNET to your .env file');
    console.log('   Expected: 0x09b63ced8a7af6aaf620e8baba1c5d8840524eb1767cca70b679c1a6961d1b08');
  }
  if (oldStoreObject && currentStoreObject && oldStoreObject === currentStoreObject) {
    console.log('4. ⚠️  CRITICAL: Old and Current store IDs are the same!');
    console.log('   Your .env file has the wrong value for OLD_PREMIUM_STORE_OBJECT_ID_TESTNET');
    console.log('   It should be: 0xc0272b762e644dd95e6dfcb374f647838103ee165e9a824152c0b68f23cfcba7');
  }
  console.log('');
}

checkConfig().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


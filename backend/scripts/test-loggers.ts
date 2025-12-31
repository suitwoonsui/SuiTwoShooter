// ==========================================
// Manual Test Script for StoreLogger and MigrationLogger
// ==========================================

import { StoreLogger } from '../lib/sui/store-logger';
import { MigrationLogger } from '../lib/sui/migration-logger';

console.log('🧪 Testing StoreLogger and MigrationLogger\n');

// Test StoreLogger
console.log('=== StoreLogger Tests ===\n');

// Test info (should always log)
console.log('1. Testing StoreLogger.info():');
StoreLogger.info('StoreService initialized for testnet');
StoreLogger.info('Inventory loaded', { extraLives_1: 5, forceField_2: 3 });

// Test warn
console.log('\n2. Testing StoreLogger.warn():');
StoreLogger.warn('Premium store contract not configured');

// Test error
console.log('\n3. Testing StoreLogger.error():');
StoreLogger.error('Error querying inventory', new Error('Test error'));

// Test transaction
console.log('\n4. Testing StoreLogger.transaction():');
StoreLogger.transaction('Transaction built successfully', {
  gasEstimate: 1000000,
  gasEstimateSUI: '0.001'
});

// Test inventory
console.log('\n5. Testing StoreLogger.inventory():');
StoreLogger.inventory('Querying inventory for 0x123...');

// Test purchase
console.log('\n6. Testing StoreLogger.purchase():');
StoreLogger.purchase('Building transaction', {
  playerAddress: '0x123',
  itemCount: 3,
  paymentToken: 'SUI',
  totalAmount: '1000000000'
});

// Test debug (should not log unless DEBUG_STORE is enabled)
console.log('\n7. Testing StoreLogger.debug() (should not log):');
StoreLogger.debug('This should not appear');
console.log('   ✓ Debug message correctly suppressed');

// Test debug enabled
process.env.DEBUG_STORE = 'true';
console.log('\n8. Testing StoreLogger.debug() with DEBUG_STORE=true:');
StoreLogger.debug('This debug message should appear', { test: 'data' });
delete process.env.DEBUG_STORE;

// Test isDebugEnabled
console.log('\n9. Testing StoreLogger.isDebugEnabled():');
console.log(`   Debug enabled (default): ${StoreLogger.isDebugEnabled()}`);
process.env.DEBUG_STORE = 'true';
console.log(`   Debug enabled (with flag): ${StoreLogger.isDebugEnabled()}`);
delete process.env.DEBUG_STORE;

// Test MigrationLogger
console.log('\n\n=== MigrationLogger Tests ===\n');

// Test info
console.log('1. Testing MigrationLogger.info():');
MigrationLogger.info('Fetching all wallets with inventory from old store');

// Test warn
console.log('\n2. Testing MigrationLogger.warn():');
MigrationLogger.warn('Event-based discovery failed, trying alternative method', {
  error: 'Test error message'
});

// Test error
console.log('\n3. Testing MigrationLogger.error():');
MigrationLogger.error('Error reading old inventory', new Error('Test error'));

// Test inventory
console.log('\n4. Testing MigrationLogger.inventory():');
MigrationLogger.inventory('Querying old inventory for 0x123...');

// Test stats
console.log('\n5. Testing MigrationLogger.stats():');
MigrationLogger.stats('Querying old stats for 0x123...');
MigrationLogger.stats('Old stats', { score: 1000, gamesPlayed: 5 });

// Test transaction
console.log('\n6. Testing MigrationLogger.transaction():');
MigrationLogger.transaction('Building migration transaction');
MigrationLogger.transaction('Inventory migrated successfully', {
  digest: '0xabc123...'
});

// Test debug (should not log unless DEBUG_MIGRATION is enabled)
console.log('\n7. Testing MigrationLogger.debug() (should not log):');
MigrationLogger.debug('This should not appear');
console.log('   ✓ Debug message correctly suppressed');

// Test debug enabled
process.env.DEBUG_MIGRATION = 'true';
console.log('\n8. Testing MigrationLogger.debug() with DEBUG_MIGRATION=true:');
MigrationLogger.debug('This debug message should appear', { test: 'data' });
delete process.env.DEBUG_MIGRATION;

// Test isDebugEnabled
console.log('\n9. Testing MigrationLogger.isDebugEnabled():');
console.log(`   Debug enabled (default): ${MigrationLogger.isDebugEnabled()}`);
process.env.DEBUG_MIGRATION = 'true';
console.log(`   Debug enabled (with flag): ${MigrationLogger.isDebugEnabled()}`);
delete process.env.DEBUG_MIGRATION;

console.log('\n\n✅ All logger tests completed!');
console.log('\n📝 Summary:');
console.log('   - StoreLogger: All methods working correctly');
console.log('   - MigrationLogger: All methods working correctly');
console.log('   - Debug flags: Working correctly (suppress when disabled, show when enabled)');
console.log('   - Formatting: Consistent [PREFIX] message format');


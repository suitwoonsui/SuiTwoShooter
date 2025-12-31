#!/usr/bin/env node

/**
 * Complete Contract Migration Script
 * 
 * Usage: node migrate-contracts.js <old-contracts-json> <new-contracts-json>
 * 
 * Example: node migrate-contracts.js '{"scoreSystem":"0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3","gamePassSystem":"0x123..."}' '{"scoreSystem":"0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14","gamePassSystem":"0x456..."}'
 * 
 * Or use the simplified format:
 * node migrate-contracts.js --simple <old-score-system-id> <new-score-system-id>
 */

require('dotenv').config();
const { ContractMigrationService } = require('./src/services/contractMigration');
const { GameOwnerWallet } = require('./src/services/gameOwnerWallet');

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  let oldContracts, newContracts;
  
  // Check for simplified mode
  if (args[0] === '--simple') {
    if (args.length !== 3) {
      console.error('❌ Usage for simple mode: node migrate-contracts.js --simple <old-score-system-id> <new-score-system-id>');
      console.error('');
      console.error('Example:');
      console.error('  node migrate-contracts.js --simple 0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3 0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14');
      process.exit(1);
    }
    
    // Simple mode - just migrate ScoreSystem
    oldContracts = { scoreSystem: args[1] };
    newContracts = { scoreSystem: args[2] };
    
  } else {
    if (args.length !== 2) {
      console.error('❌ Usage: node migrate-contracts.js <old-contracts-json> <new-contracts-json>');
      console.error('');
      console.error('Example:');
      console.error('  node migrate-contracts.js \'{"scoreSystem":"0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3","gamePassSystem":"0x123..."}\' \'{"scoreSystem":"0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14","gamePassSystem":"0x456..."}\'');
      console.error('');
      console.error('Or use simple mode for ScoreSystem only:');
      console.error('  node migrate-contracts.js --simple <old-score-system-id> <new-score-system-id>');
      process.exit(1);
    }
    
    try {
      oldContracts = JSON.parse(args[0]);
      newContracts = JSON.parse(args[1]);
    } catch (parseError) {
      console.error('❌ Failed to parse contract JSON:', parseError.message);
      console.error('Make sure to properly escape quotes in your JSON strings');
      process.exit(1);
    }
  }

  console.log('🔄 Insomnia Game Complete Contract Migration Tool');
  console.log('==============================================');
  console.log('📤 Old Contracts:', oldContracts);
  console.log('📥 New Contracts:', newContracts);
  console.log('');

  try {
    // Initialize services
    console.log('🔧 Initializing services...');
    
    const migrationService = new ContractMigrationService();
    await migrationService.initialize();
    
    const gameOwnerWallet = new GameOwnerWallet();
    await gameOwnerWallet.initialize();
    
    console.log('✅ Services initialized successfully');
    console.log('');

    // Check migration status before starting
    console.log('📊 Checking current migration status...');
    const status = await migrationService.getCompleteMigrationStatus(oldContracts, newContracts);
    
    if (status.error) {
      console.error('❌ Failed to check migration status:', status.error);
      process.exit(1);
    }
    
    // Display status for each contract type
    if (status.scoreSystem) {
      console.log(`   🏆 ScoreSystem: ${status.scoreSystem.oldCount} → ${status.scoreSystem.newCount} (${status.scoreSystem.progressPercentage}%)`);
    }
    if (status.gamePassSystem) {
      console.log(`   🎫 GamePassSystem: ${status.gamePassSystem.oldCount} → ${status.gamePassSystem.newCount} (${status.gamePassSystem.progressPercentage}%)`);
    }
    if (status.adminSystem) {
      console.log(`   👑 AdminSystem: ${status.adminSystem.oldCount} → ${status.adminSystem.newCount} (${status.adminSystem.progressPercentage}%)`);
    }
    if (status.gameCore) {
      console.log(`   🎮 GameCore: ${status.gameCore.oldCount} → ${status.gameCore.newCount} (${status.gameCore.progressPercentage}%)`);
    }
    
    console.log(`   📊 Overall Progress: ${status.overall.progressPercentage}%`);
    console.log(`   ✅ Complete: ${status.overall.isComplete ? 'Yes' : 'No'}`);
    console.log('');

    if (status.overall.isComplete) {
      console.log('✅ Migration is already complete!');
      process.exit(0);
    }

    // Check if there's anything to migrate
    const hasDataToMigrate = Object.values(status).some(system => 
      system && typeof system === 'object' && system.oldCount > 0
    );
    
    if (!hasDataToMigrate) {
      console.log('⚠️  No data found in old contracts to migrate');
      process.exit(0);
    }

    // Confirm migration
    console.log('⚠️  This will migrate ALL data from the old contracts to the new contracts.');
    console.log('   This includes:');
    if (status.scoreSystem?.oldCount > 0) console.log(`      • ${status.scoreSystem.oldCount} players and their statistics`);
    if (status.gamePassSystem?.oldCount > 0) console.log(`      • ${status.gamePassSystem.oldCount} game passes and access permissions`);
    if (status.adminSystem?.oldCount > 0) console.log(`      • ${status.adminSystem.oldCount} admin accounts and permissions`);
    if (status.gameCore?.oldCount > 0) console.log(`      • ${status.gameCore.oldCount} active game sessions`);
    console.log('   This process cannot be undone and may take several minutes.');
    console.log('');
    
    // In a real scenario, you might want to add a confirmation prompt here
    // For now, we'll proceed automatically
    
    console.log('🚀 Starting complete migration...');
    console.log('');

    // Start complete migration
    const result = await migrationService.migrateAllContracts(
      oldContracts,
      newContracts,
      gameOwnerWallet
    );

    if (result.success) {
      console.log('');
      console.log('🎉 Complete migration completed successfully!');
      console.log('');
      
      // Display results for each system
      if (result.results.scoreSystem) {
        const sys = result.results.scoreSystem;
        console.log(`🏆 ScoreSystem: ${sys.migratedPlayers}/${sys.totalPlayers} players migrated`);
        if (sys.failedMigrations > 0) {
          console.log(`   ⚠️  ${sys.failedMigrations} failed migrations`);
        }
      }
      
      if (result.results.gamePassSystem) {
        const sys = result.results.gamePassSystem;
        console.log(`🎫 GamePassSystem: ${sys.migratedGamePasses}/${sys.totalGamePasses} passes migrated`);
        if (sys.failedMigrations > 0) {
          console.log(`   ⚠️  ${sys.failedMigrations} failed migrations`);
        }
      }
      
      if (result.results.adminSystem) {
        const sys = result.results.adminSystem;
        console.log(`👑 AdminSystem: ${sys.migratedAdmins}/${sys.totalAdmins} admins migrated`);
        if (sys.failedMigrations > 0) {
          console.log(`   ⚠️  ${sys.failedMigrations} failed migrations`);
        }
      }
      
      if (result.results.gameCore) {
        const sys = result.results.gameCore;
        console.log(`🎮 GameCore: ${sys.migratedSessions}/${sys.totalSessions} sessions migrated`);
        if (sys.failedMigrations > 0) {
          console.log(`   ⚠️  ${sys.failedMigrations} failed migrations`);
        }
      }
      
      console.log('');
      console.log(`📊 Total Summary:`);
      console.log(`   Players: ${result.results.totalPlayers}`);
      console.log(`   Game Passes: ${result.results.totalGamePasses}`);
      console.log(`   Admins: ${result.results.totalAdmins}`);
      console.log(`   Sessions: ${result.results.totalSessions}`);
      
      // Verify migration
      console.log('');
      console.log('🔍 Verifying complete migration...');
      const verification = await migrationService.verifyCompleteMigration(oldContracts, newContracts);
      
      if (verification.overall.success) {
        console.log('✅ Complete migration verification successful!');
        
        if (verification.scoreSystem) {
          console.log(`   ScoreSystem: ${verification.scoreSystem.oldCount} → ${verification.scoreSystem.newCount} players`);
        }
        if (verification.gamePassSystem) {
          console.log(`   GamePassSystem: ${verification.gamePassSystem.oldCount} → ${verification.gamePassSystem.newCount} passes`);
        }
        if (verification.adminSystem) {
          console.log(`   AdminSystem: ${verification.adminSystem.oldCount} → ${verification.adminSystem.newCount} admins`);
        }
        if (verification.gameCore) {
          console.log(`   GameCore: ${verification.gameCore.oldCount} → ${verification.gameCore.newCount} sessions`);
        }
      } else {
        console.log('⚠️  Complete migration verification failed:');
        verification.overall.warnings.forEach(warning => {
          console.log(`   ${warning}`);
        });
      }
      
          } else {
        console.error('❌ Complete migration failed:', result.error);
        process.exit(1);
      }

      // Cleanup
      if (migrationService) {
        migrationService.cleanup();
      }
      if (gameOwnerWallet) {
        gameOwnerWallet.cleanup();
      }

  } catch (error) {
    console.error('❌ Complete migration failed with error:', error);
    
    // Cleanup on error
    if (migrationService) {
      migrationService.cleanup();
    }
    if (gameOwnerWallet) {
      gameOwnerWallet.cleanup();
    }
    
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('');
  console.log('⚠️  Migration interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('⚠️  Migration terminated');
  process.exit(1);
});

// Run migration
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

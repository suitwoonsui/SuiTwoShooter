require('dotenv').config();
const { ContractMigrationService } = require('./src/services/contractMigration');
const { GameOwnerWallet } = require('./src/services/gameOwnerWallet');

async function checkStatus() {
  const oldContracts = {
    scoreSystem: "0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14",
    gamePassSystem: "0xeb28c8cf9b90b98dddf4e90ec62e274fa8e68fe1fabf7e16b5796d6c3099e074"
  };
  
  const newContracts = {
    scoreSystem: "0x37bda49b3ae56007196070cf381e5d3a1427d3405d40b9e11726ce2370f230a8",
    gamePassSystem: "0x4976bde8443611ea03bb4d8b939ad64c186e44be740f3874e645141e2b892b1f"
  };

  const playerAddress = "0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02";

  console.log('🔍 Checking Migration Status...');
  console.log('📤 Old Contracts:', oldContracts);
  console.log('📥 New Contracts:', newContracts);
  console.log('👤 Player Address:', playerAddress);
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

    // Check migration status
    console.log('📊 Checking migration status...');
    const status = await migrationService.getCompleteMigrationStatus(oldContracts, newContracts);
    
    if (status.error) {
      console.error('❌ Failed to check migration status:', status.error);
      return;
    }
    
    console.log('📊 Migration Status:', JSON.stringify(status, null, 2));
    console.log('');

    // Check specific player data in both contracts
    console.log('🔍 Checking player data in old contract...');
    const oldPlayerData = await migrationService.readPlayerData(oldContracts.scoreSystem, playerAddress);
    console.log('📤 Old Contract Player Data:', JSON.stringify(oldPlayerData, null, 2));
    console.log('');

    console.log('🔍 Checking player data in new contract...');
    const newPlayerData = await migrationService.readPlayerData(newContracts.scoreSystem, playerAddress);
    console.log('📥 New Contract Player Data:', JSON.stringify(newPlayerData, null, 2));
    console.log('');

    // Check game pass data in both contracts
    console.log('🔍 Checking game pass data in old contract...');
    const oldGamePassData = await migrationService.readPlayerGamePass(oldContracts.gamePassSystem, playerAddress);
    console.log('📤 Old Contract Game Pass Data:', JSON.stringify(oldGamePassData, null, 2));
    console.log('');

    console.log('🔍 Checking game pass data in new contract...');
    const newGamePassData = await migrationService.readPlayerGamePass(newContracts.gamePassSystem, playerAddress);
    console.log('📥 New Contract Game Pass Data:', JSON.stringify(newGamePassData, null, 2));
    console.log('');

    // Cleanup
    if (migrationService) {
      migrationService.cleanup();
    }
    if (gameOwnerWallet) {
      gameOwnerWallet.cleanup();
    }

  } catch (error) {
    console.error('❌ Status check failed:', error);
  }
}

checkStatus().catch(console.error);




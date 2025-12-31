const express = require('express');
const { ContractMigrationService } = require('../services/contractMigration');

const router = express.Router();

// Initialize migration service
let migrationService = null;

// Middleware to initialize migration service
const initializeMigrationService = async (req, res, next) => {
  if (!migrationService) {
    migrationService = new ContractMigrationService();
    await migrationService.initialize();
  }
  next();
};

// Middleware to validate contract objects
const validateContractObjects = (req, res, next) => {
  const { oldContracts, newContracts } = req.body;
  
  if (!oldContracts || !newContracts) {
    return res.status(400).json({ 
      error: 'Both oldContracts and newContracts objects are required' 
    });
  }
  
  // Validate contract structure
  const requiredFields = ['scoreSystem', 'gamePassSystem', 'adminSystem', 'gameCore'];
  const hasValidOldContracts = requiredFields.some(field => oldContracts[field]);
  const hasValidNewContracts = requiredFields.some(field => newContracts[field]);
  
  if (!hasValidOldContracts) {
    return res.status(400).json({ 
      error: 'At least one old contract ID must be provided' 
    });
  }
  
  if (!hasValidNewContracts) {
    return res.status(400).json({ 
      error: 'At least one new contract ID must be provided' 
    });
  }
  
  // Validate contract ID format for provided contracts
  for (const field of requiredFields) {
    if (oldContracts[field] && (!oldContracts[field].startsWith('0x') || oldContracts[field].length !== 66)) {
      return res.status(400).json({ 
        error: `Invalid old ${field} contract ID format` 
      });
    }
    if (newContracts[field] && (!newContracts[field].startsWith('0x') || newContracts[field].length !== 66)) {
      return res.status(400).json({ 
        error: `Invalid new ${field} contract ID format` 
      });
    }
  }
  
  next();
};

// POST /api/migration/start
router.post('/start', initializeMigrationService, validateContractObjects, async (req, res) => {
  try {
    const { oldContracts, newContracts } = req.body;
    
    console.log(`🔄 Complete migration request received:`);
    console.log(`   Old Contracts:`, oldContracts);
    console.log(`   New Contracts:`, newContracts);
    
    // Get game owner wallet instance from server
    const gameOwnerWallet = req.app.locals.gameOwnerWallet;
    if (!gameOwnerWallet) {
      console.error('Game owner wallet not available');
      return res.status(500).json({ 
        error: 'Game owner wallet not initialized' 
      });
    }
    
    console.log('✅ Pre-flight checks passed, starting complete migration...');
    
    // Start the complete migration process
    const result = await migrationService.migrateAllContracts(
      oldContracts, 
      newContracts, 
      gameOwnerWallet
    );
    
    if (result.success) {
      console.log('🎯 Complete migration completed successfully');
      
      res.json({
        success: true,
        message: 'Complete migration completed successfully',
        results: result.results,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Complete migration failed:', result.error);
      res.status(500).json({
        success: false,
        error: result.error || 'Complete migration failed'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in complete migration endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during complete migration'
    });
  }
});

// GET /api/migration/status
router.get('/status', initializeMigrationService, async (req, res) => {
  try {
    const { oldContracts, newContracts } = req.query;
    
    if (!oldContracts || !newContracts) {
      return res.status(400).json({ 
        error: 'Both oldContracts and newContracts query parameters are required' 
      });
    }
    
    // Parse JSON strings from query parameters
    let oldContractsObj, newContractsObj;
    try {
      oldContractsObj = JSON.parse(oldContracts);
      newContractsObj = JSON.parse(newContracts);
    } catch (parseError) {
      return res.status(400).json({ 
        error: 'Invalid JSON format for contract parameters' 
      });
    }
    
    console.log(`📊 Complete migration status request for:`);
    console.log(`   Old Contracts:`, oldContractsObj);
    console.log(`   New Contracts:`, newContractsObj);
    
    const status = await migrationService.getCompleteMigrationStatus(oldContractsObj, newContractsObj);
    
    if (status.error) {
      console.error('❌ Failed to get complete migration status:', status.error);
      res.status(500).json({
        success: false,
        error: status.error
      });
    } else {
      console.log('✅ Complete migration status retrieved successfully');
      
      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Error in complete migration status endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during status check'
    });
  }
});

// POST /api/migration/verify
router.post('/verify', initializeMigrationService, validateContractObjects, async (req, res) => {
  try {
    const { oldContracts, newContracts } = req.body;
    
    console.log(`🔍 Complete migration verification request for:`);
    console.log(`   Old Contracts:`, oldContracts);
    console.log(`   New Contracts:`, newContracts);
    
    const verification = await migrationService.verifyCompleteMigration(oldContracts, newContracts);
    
    if (verification.error) {
      console.error('❌ Complete migration verification failed:', verification.error);
      res.status(500).json({
        success: false,
        error: verification.error
      });
    } else {
      console.log('✅ Complete migration verification completed');
      
      res.json({
        success: true,
        verification,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Error in complete migration verification endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during verification'
    });
  }
});

// Legacy endpoint for single ScoreSystem migration (backward compatibility)
router.post('/score-system', initializeMigrationService, async (req, res) => {
  try {
    const { oldContractId, newContractId } = req.body;
    
    if (!oldContractId || !newContractId) {
      return res.status(400).json({ 
        error: 'Both oldContractId and newContractId are required' 
      });
    }
    
    console.log(`🏆 Legacy ScoreSystem migration request:`);
    console.log(`   Old Contract: ${oldContractId}`);
    console.log(`   New Contract: ${newContractId}`);
    
    // Get game owner wallet instance from server
    const gameOwnerWallet = req.app.locals.gameOwnerWallet;
    if (!gameOwnerWallet) {
      console.error('Game owner wallet not available');
      return res.status(500).json({ 
        error: 'Game owner wallet not initialized' 
      });
    }
    
    // Use the legacy single contract migration
    const result = await migrationService.migratePlayerData(
      oldContractId, 
      newContractId, 
      gameOwnerWallet
    );
    
    if (result.success) {
      console.log('🎯 Legacy ScoreSystem migration completed successfully');
      
      res.json({
        success: true,
        message: 'ScoreSystem migration completed successfully',
        totalPlayers: result.totalPlayers,
        migratedPlayers: result.migratedPlayers,
        failedMigrations: result.failedMigrations,
        errors: result.errors,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Legacy ScoreSystem migration failed:', result.error);
      res.status(500).json({
        success: false,
        error: result.error || 'Legacy ScoreSystem migration failed'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in legacy ScoreSystem migration endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during legacy migration'
    });
  }
});

// GET /api/migration/health
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      service: 'Complete Contract Migration Service',
      status: 'Healthy',
      supportedContracts: ['ScoreSystem', 'GamePassSystem', 'AdminSystem', 'GameCore'],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in migration health endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during health check'
    });
  }
});

module.exports = router;

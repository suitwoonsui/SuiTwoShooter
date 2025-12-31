const express = require('express');
const { GameOwnerWallet } = require('../services/gameOwnerWallet');

const router = express.Router();

// Middleware to validate request body
const validateConsumeCreditRequest = (req, res, next) => {
  const { gamePassId, playerAddress } = req.body;
  
  if (!gamePassId) {
    return res.status(400).json({ 
      error: 'Missing required field: gamePassId' 
    });
  }
  
  if (!playerAddress) {
    return res.status(400).json({ 
      error: 'Missing required field: playerAddress' 
    });
  }
  
  // Validate Sui address format (basic check)
  if (!playerAddress.startsWith('0x') || playerAddress.length !== 66) {
    return res.status(400).json({ 
      error: 'Invalid player address format' 
    });
  }
  
  next();
};

// POST /api/consume-credit
router.post('/', validateConsumeCreditRequest, async (req, res) => {
  try {
    const { gamePassId, playerAddress } = req.body;
    
    console.log(`📥 Consume credit request received:`);
    console.log(`   Game Pass ID: ${gamePassId}`);
    console.log(`   Player Address: ${playerAddress}`);
    
    // Get game owner wallet instance from server
    const gameOwnerWallet = req.app.locals.gameOwnerWallet;
    if (!gameOwnerWallet) {
      console.error('Game owner wallet not available');
      return res.status(500).json({ 
        error: 'Game owner wallet not initialized' 
      });
    }
    
    // Verify the game pass exists and is valid
    const gamePassStatus = await gameOwnerWallet.getGamePassStatus(gamePassId);
    if (!gamePassStatus) {
      console.error('Game pass not found:', gamePassId);
      return res.status(404).json({ 
        error: 'Game pass not found' 
      });
    }
    
    // Note: GamePass objects are shared objects, so we don't check ownership
    // The smart contract will handle permission validation
    console.log('✅ Game pass found and valid:', {
      passType: gamePassStatus.passType,
      gamesRemaining: gamePassStatus.gamesRemaining,
      isActive: gamePassStatus.isActive
    });
    
    if (!gamePassStatus.isActive) {
      console.error('Game pass is not active:', gamePassId);
      return res.status(400).json({ 
        error: 'Game pass is not active' 
      });
    }
    
    if (gamePassStatus.gamesRemaining <= 0) {
      console.error('No games remaining on pass:', gamePassId);
      return res.status(400).json({ 
        error: 'No games remaining on this pass' 
      });
    }
    
    console.log('✅ Pre-flight checks passed, consuming credit...');
    
    // Consume the game credit using the player address to look up the game pass
    const result = await gameOwnerWallet.consumeGameCredit(playerAddress);
    
    if (result.success) {
      console.log('🎯 Credit consumed successfully');
      
      // Get updated game pass status
      const updatedStatus = await gameOwnerWallet.getGamePassStatus(gamePassId);
      
      res.json({
        success: true,
        message: 'Game credit consumed successfully',
        transactionDigest: result.digest,
        gamePassStatus: updatedStatus,
        gamesRemaining: updatedStatus.gamesRemaining,
        isActive: updatedStatus.isActive
      });
    } else {
      console.error('❌ Failed to consume credit:', result.error);
      res.status(500).json({
        success: false,
        error: 'Failed to consume game credit',
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('Error in consume credit endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// GET /api/consume-credit/status/:gamePassId
router.get('/status/:gamePassId', async (req, res) => {
  try {
    const { gamePassId } = req.params;
    
    console.log(`📊 Status request for game pass: ${gamePassId}`);
    
    const gameOwnerWallet = req.app.locals.gameOwnerWallet;
    if (!gameOwnerWallet) {
      return res.status(500).json({ 
        error: 'Game owner wallet not initialized' 
      });
    }
    
    const gamePassStatus = await gameOwnerWallet.getGamePassStatus(gamePassId);
    if (!gamePassStatus) {
      return res.status(404).json({ 
        error: 'Game pass not found' 
      });
    }
    
    res.json({
      success: true,
      gamePassStatus
    });
    
  } catch (error) {
    console.error('Error in game pass status endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

module.exports = { consumeCreditRouter: router };

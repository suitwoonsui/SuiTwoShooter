const express = require('express');
const { GameOwnerWallet } = require('../services/gameOwnerWallet');

const router = express.Router();

// Middleware to validate request body
const validateSubmitScoreRequest = (req, res, next) => {
  const { playerAddress, finalScore, clicks, timeElapsed } = req.body;
  
  if (!playerAddress) {
    return res.status(400).json({ 
      error: 'Missing required field: playerAddress' 
    });
  }
  
  if (typeof finalScore !== 'number' || isNaN(finalScore) || finalScore < 0) {
    return res.status(400).json({ 
      error: 'Invalid finalScore: must be a non-negative number' 
    });
  }
  
  // Optional fields with defaults
  const validClicks = typeof clicks === 'number' && !isNaN(clicks) && clicks >= 0 ? clicks : 0;
  const validTimeElapsed = typeof timeElapsed === 'number' && !isNaN(timeElapsed) && timeElapsed >= 0 ? timeElapsed : 0;
  
  // Validate Sui address format (basic check)
  if (!playerAddress.startsWith('0x') || playerAddress.length !== 66) {
    return res.status(400).json({ 
      error: 'Invalid player address format' 
    });
  }
  
  // Add validated values to request for the route handler
  req.validatedData = {
    playerAddress,
    finalScore,
    clicks: validClicks,
    timeElapsed: validTimeElapsed
  };
  
  next();
};

// POST /api/submit-score
router.post('/', validateSubmitScoreRequest, async (req, res) => {
  try {
    const { playerAddress, finalScore, clicks, timeElapsed } = req.validatedData;
    
    console.log(`📥 Submit score request received:`);
    console.log(`   Player Address: ${playerAddress}`);
    console.log(`   Final Score: ${finalScore}`);
    console.log(`   Clicks: ${clicks}`);
    console.log(`   Time Elapsed: ${timeElapsed}`);
    
    // Get game owner wallet instance from server
    const gameOwnerWallet = req.app.locals.gameOwnerWallet;
    if (!gameOwnerWallet) {
      console.error('Game owner wallet not available');
      return res.status(500).json({ 
        error: 'Game owner wallet not initialized' 
      });
    }
    
    console.log('✅ Pre-flight checks passed, submitting score...');
    
    // Submit the score using game owner wallet (game owner pays gas)
    const result = await gameOwnerWallet.submitScore(playerAddress, finalScore, clicks, timeElapsed);
    
    if (result.success) {
      console.log('🎯 Score submitted successfully');
      
      res.json({
        success: true,
        message: 'Score submitted successfully',
        transactionDigest: result.digest,
        playerAddress,
        finalScore
      });
    } else {
      console.error('❌ Score submission failed:', result.error);
      res.status(500).json({
        success: false,
        error: result.error || 'Score submission failed'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in submit score endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during score submission'
    });
  }
});

module.exports = router;

const express = require('express');
const { GameOwnerWallet } = require('../services/gameOwnerWallet');

const router = express.Router();

// Middleware to validate query parameters
const validateLeaderboardRequest = (req, res, next) => {
  const { category, skillTier, limit } = req.query;
  
  // Validate category
  const validCategories = [
    'best_score', 'best_time', 'best_clicks', 'best_efficiency',
    'avg_score', 'avg_time', 'avg_clicks', 'avg_efficiency',
    'skill_tier', 'overall'
  ];
  
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({ 
      error: 'Invalid category. Must be one of: ' + validCategories.join(', ') 
    });
  }
  
  // Validate skill tier (0-4: Beginner, Intermediate, Advanced, Expert, Master)
  if (skillTier !== undefined) {
    const tier = parseInt(skillTier);
    if (isNaN(tier) || tier < 0 || tier > 4) {
      return res.status(400).json({ 
        error: 'Invalid skill tier. Must be 0-4 (0=Beginner, 1=Intermediate, 2=Advanced, 3=Expert, 4=Master)' 
      });
    }
  }
  
  // Validate limit
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ 
        error: 'Invalid limit. Must be 1-100' 
      });
    }
  }
  
  // Set defaults
  req.validatedQuery = {
    category: category || 'overall',
    skillTier: skillTier !== undefined ? parseInt(skillTier) : undefined,
    limit: limit ? parseInt(limit) : 25
  };
  
  next();
};

// GET /api/leaderboard
router.get('/', validateLeaderboardRequest, async (req, res) => {
  try {
    const { category, skillTier, limit } = req.validatedQuery;
    
    console.log(`📊 Leaderboard request received:`);
    console.log(`   Category: ${category}`);
    console.log(`   Skill Tier: ${skillTier !== undefined ? skillTier : 'All'}`);
    console.log(`   Limit: ${limit}`);
    
    // Get game owner wallet instance from server
    const gameOwnerWallet = req.app.locals.gameOwnerWallet;
    if (!gameOwnerWallet) {
      console.error('Game owner wallet not available');
      return res.status(500).json({ 
        error: 'Game owner wallet not initialized' 
      });
    }
    
    console.log('✅ Pre-flight checks passed, fetching leaderboard...');
    
    // Fetch leaderboard data based on category
    let leaderboardData;
    
    switch (category) {
      case 'best_score':
        leaderboardData = await gameOwnerWallet.getLeaderboardByBestScore(limit, skillTier);
        break;
      case 'best_time':
        leaderboardData = await gameOwnerWallet.getLeaderboardByBestTime(limit, skillTier);
        break;
      case 'best_clicks':
        leaderboardData = await gameOwnerWallet.getLeaderboardByBestClicks(limit, skillTier);
        break;
      case 'best_efficiency':
        leaderboardData = await gameOwnerWallet.getLeaderboardByBestEfficiency(limit, skillTier);
        break;
      case 'avg_score':
        leaderboardData = await gameOwnerWallet.getLeaderboardByAverageScore(limit, skillTier);
        break;
      case 'avg_time':
        leaderboardData = await gameOwnerWallet.getLeaderboardByAverageTime(limit, skillTier);
        break;
      case 'avg_clicks':
        leaderboardData = await gameOwnerWallet.getLeaderboardByAverageClicks(limit, skillTier);
        break;
      case 'avg_efficiency':
        leaderboardData = await gameOwnerWallet.getLeaderboardByAverageEfficiency(limit, skillTier);
        break;
      case 'skill_tier':
        leaderboardData = await gameOwnerWallet.getLeaderboardBySkillTier(skillTier || 0, limit);
        break;
      case 'overall':
      default:
        leaderboardData = await gameOwnerWallet.getOverallLeaderboard(limit, skillTier);
        break;
    }
    
    if (leaderboardData.success) {
      console.log('🎯 Leaderboard data fetched successfully');
      
      res.json({
        success: true,
        category,
        skillTier: skillTier !== undefined ? skillTier : 'all',
        limit,
        totalPlayers: leaderboardData.totalPlayers || 0,
        data: leaderboardData.players || [],
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Leaderboard fetch failed:', leaderboardData.error);
      res.status(500).json({
        success: false,
        error: leaderboardData.error || 'Failed to fetch leaderboard data'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in leaderboard endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during leaderboard fetch'
    });
  }
});

// GET /api/leaderboard/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      {
        id: 'best_score',
        name: 'Best Score',
        description: 'Highest single game score',
        icon: '🏆'
      },
      {
        id: 'best_time',
        name: 'Most Time',
        description: 'Longest survival time',
        icon: '⏱️'
      },
      {
        id: 'best_clicks',
        name: 'Most Clicks',
        description: 'Most clicks in one game',
        icon: '🖱️'
      },
      {
        id: 'best_efficiency',
        name: 'Best Efficiency',
        description: 'Best clicks/second ratio',
        icon: '⚡'
      },
      {
        id: 'avg_score',
        name: 'Average Score',
        description: 'Consistent scoring ability',
        icon: '📊'
      },
      {
        id: 'avg_time',
        name: 'Average Time',
        description: 'Consistent survival ability',
        icon: '🕐'
      },
      {
        id: 'avg_clicks',
        name: 'Average Clicks',
        description: 'Consistent clicking performance',
        icon: '🖱️'
      },
      {
        id: 'avg_efficiency',
        name: 'Average Efficiency',
        description: 'Consistent efficiency',
        icon: '⚡'
      },
      {
        id: 'skill_tier',
        name: 'Skill Tier',
        description: 'Rankings by skill level',
        icon: '🎯'
      },
      {
        id: 'overall',
        name: 'Overall',
        description: 'Combined performance ranking',
        icon: '🌟'
      }
    ];
    
    res.json({
      success: true,
      categories,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in categories endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during categories fetch'
    });
  }
});

// GET /api/leaderboard/skill-tiers
router.get('/skill-tiers', async (req, res) => {
  try {
    const skillTiers = [
      {
        id: 0,
        name: 'Beginner',
        description: '0-30 seconds, any score',
        icon: '🎯',
        color: 'blue'
      },
      {
        id: 1,
        name: 'Intermediate',
        description: '30+ seconds, 30+ avg score',
        icon: '🚀',
        color: 'green'
      },
      {
        id: 2,
        name: 'Advanced',
        description: '60+ seconds, 60+ avg score',
        icon: '🏃',
        color: 'yellow'
      },
      {
        id: 3,
        name: 'Expert',
        description: '90+ seconds, 100+ avg score',
        icon: '🎖️',
        color: 'orange'
      },
      {
        id: 4,
        name: 'Master',
        description: '120+ seconds, 150+ avg score',
        icon: '👑',
        color: 'purple'
      }
    ];
    
    res.json({
      success: true,
      skillTiers,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in skill tiers endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during skill tiers fetch'
    });
  }
});

module.exports = router;


const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { GameOwnerWallet } = require('./services/gameOwnerWallet');
const { consumeCreditRouter } = require('./routes/consumeCredit');
const submitScoreRouter = require('./routes/submitScore');
const leaderboardRouter = require('./routes/leaderboard');
const migrationRouter = require('./routes/migration');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize game owner wallet
let gameOwnerWallet;

async function initializeWallet() {
  try {
    gameOwnerWallet = new GameOwnerWallet();
    await gameOwnerWallet.initialize();
    
    // Make wallet available to routes
    app.locals.gameOwnerWallet = gameOwnerWallet;
    
    console.log('✅ Game owner wallet initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize game owner wallet:', error);
    process.exit(1);
  }
}

// API routes
app.use('/api/consume-credit', consumeCreditRouter);
app.use('/api/submit-score', submitScoreRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/migration', migrationRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await initializeWallet();
  
  app.listen(PORT, () => {
    console.log(`🚀 Insomnia Game Backend running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`🎮 Consume credit: http://localhost:${PORT}/api/consume-credit`);
    console.log(`🏆 Submit score: http://localhost:${PORT}/api/submit-score`);
    console.log(`📊 Leaderboard: http://localhost:${PORT}/api/leaderboard`);
    console.log(`🔄 Migration: http://localhost:${PORT}/api/migration`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (gameOwnerWallet) {
    gameOwnerWallet.cleanup();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (gameOwnerWallet) {
    gameOwnerWallet.cleanup();
  }
  process.exit(0);
});

startServer().catch(console.error);

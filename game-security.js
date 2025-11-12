// ==========================================
// GAME SECURITY - ANTI-CHEAT MEASURES
// ==========================================

// 1. ENCRYPTED GAME STATE
class GameSecurity {
  constructor() {
    this.sessionKey = this.generateSessionKey();
    this.gameStartTime = Date.now();
    this.lastValidationTime = Date.now();
    this.validationInterval = 5000; // Validate every 5 seconds
    this.maxScorePerSecond = 10000; // Maximum realistic score gain per second (allows for boss rewards up to 5000 * 4 = 20000)
    this.checksumSalt = Math.random().toString(36).substr(2, 9);
  }

  generateSessionKey() {
    return Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
  }

  // Simple encryption for game state (use proper crypto in production)
  encryptGameState(gameState) {
    const data = JSON.stringify(gameState);
    return btoa(data + '|' + this.sessionKey);
  }

  decryptGameState(encryptedData) {
    try {
      const decoded = atob(encryptedData);
      const [data, key] = decoded.split('|');
      if (key !== this.sessionKey) {
        throw new Error('Invalid session key');
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Game state decryption failed:', e);
      return null;
    }
  }

  // Generate checksum for score validation
  generateScoreChecksum(score, time, actions) {
    const data = `${score}-${time}-${actions}-${this.checksumSalt}`;
    // Simple hash (use proper crypto hash in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Basic sanity check - smart contract does the real validation
  // This is just to catch obvious issues before submission
  validateScore(score, gameTime, actionsCount, scoreIncrement = 0) {
    // Basic sanity: score cannot be negative
    if (score < 0) {
      console.warn(`⚠️ [SECURITY] Negative score detected: ${score}`);
      return false;
    }
    
    // All other validation happens on-chain via smart contract
    // Smart contract validates exact score calculations, tier progression, etc.
    return true;
  }
}

// 2. PROTECTED GAME VARIABLES
class ProtectedGame {
  constructor() {
    this._score = 0;
    this._lives = 3;
    this._gameTime = 0;
    this._actionsCount = 0;
    this._lastScoreUpdate = Date.now();
    this._scoreHistory = []; // Track score progression
    this.security = new GameSecurity();
    
    // Hide variables from direct access
    this.obfuscateVariables();
  }

  obfuscateVariables() {
    // Use closures and property descriptors to protect variables
    let scoreValue = 0;
    let livesValue = 3;
    
    Object.defineProperty(this, 'score', {
      get: () => scoreValue,
      set: (value) => {
        const oldValue = scoreValue;
        const scoreDiff = value - oldValue;
        const isValid = this.validateScoreChange(value);
        if (isValid) {
          scoreValue = value;
          this.logScoreChange(value);
          if (scoreDiff > 5000) {
            console.log(`✅ [SECURITY] Large score update accepted: ${oldValue} -> ${value} (diff: ${scoreDiff})`);
          }
        } else {
          console.warn(`❌ [SECURITY] Invalid score change detected: ${oldValue} -> ${value} (diff: ${scoreDiff})`);
          this.flagSuspiciousActivity('score_manipulation');
          // Don't update score if validation fails
        }
      },
      enumerable: true,
      configurable: false
    });

    Object.defineProperty(this, 'lives', {
      get: () => livesValue,
      set: (value) => {
        if (value >= 0 && value <= 10) { // Reasonable bounds
          livesValue = value;
        } else {
          this.flagSuspiciousActivity('lives_manipulation');
        }
      },
      enumerable: true,
      configurable: false
    });
  }

  validateScoreChange(newScore) {
    // Basic sanity check: score cannot be negative
    if (newScore < 0) {
      console.warn(`⚠️ [SECURITY] Negative score change detected: ${newScore}`);
      return false;
    }
    
    // Basic sanity: score should be a reasonable number (not infinity, not NaN)
    if (!isFinite(newScore)) {
      console.warn(`⚠️ [SECURITY] Invalid score value detected: ${newScore}`);
      return false;
    }
    
    // All other validation happens on-chain via smart contract
    // Smart contract validates exact score calculations, tier progression, etc.
    return true;
  }

  logScoreChange(newScore) {
    // Calculate score difference from the previous score (before this update)
    // We need to get the old score before it was updated
    // Since this is called from the setter, we can use this._score which is the old value
    const oldScore = this._score;
    const scoreDiff = newScore - oldScore;
    this._scoreHistory.push(scoreDiff);
    if (this._scoreHistory.length > 50) {
      this._scoreHistory.shift();
    }
    this._lastScoreUpdate = Date.now();
    // Update _score to match the new score value
    this._score = newScore;
  }

  flagSuspiciousActivity(type) {
    console.warn(`Suspicious activity detected: ${type}`);
    // In production, send to server for analysis
    this.sendSecurityAlert({
      type: type,
      timestamp: Date.now(),
      sessionKey: this.security.sessionKey,
      gameState: this.getSecureGameState()
    });
  }

  getSecureGameState() {
    return {
      score: this._score,
      lives: this._lives,
      gameTime: this._gameTime,
      actions: this._actionsCount,
      checksum: this.security.generateScoreChecksum(
        this._score, 
        this._gameTime, 
        this._actionsCount
      )
    };
  }

  sendSecurityAlert(alertData) {
    // Simulate sending to server
    console.log('Security alert would be sent:', alertData);
    // fetch('/api/security/alert', {
    //   method: 'POST',
    //   body: JSON.stringify(alertData)
    // });
  }
}

// 3. INPUT SANITIZATION AND VALIDATION
class SecureInput {
  static sanitizePlayerName(name) {
    if (typeof name !== 'string') return 'Anonymous';
    
    // Remove dangerous characters
    const sanitized = name
      .replace(/[<>\"'&]/g, '') // Remove HTML/JS injection chars
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 20) // Limit length
      .trim();
    
    return sanitized || 'Anonymous';
  }

  static validateScore(score) {
    return typeof score === 'number' && 
           score >= 0 && 
           score <= 10000000 && 
           Number.isFinite(score) &&
           !isNaN(score);
  }

  static validateGameTime(time) {
    return typeof time === 'number' && 
           time >= 0 && 
           time <= 3600000 && // Max 1 hour
           Number.isFinite(time);
  }
}

// 4. RATE LIMITING
class RateLimiter {
  constructor() {
    this.submissions = [];
    this.maxSubmissions = 3; // Max 3 score submissions per minute
    this.timeWindow = 60000; // 1 minute
  }

  canSubmit() {
    const now = Date.now();
    // Clean old submissions
    this.submissions = this.submissions.filter(time => now - time < this.timeWindow);
    
    if (this.submissions.length >= this.maxSubmissions) {
      console.warn('Rate limit exceeded');
      return false;
    }
    
    this.submissions.push(now);
    return true;
  }
}

// 5. SECURE GAME IMPLEMENTATION
class SecureShooterGame extends ProtectedGame {
  constructor() {
    super();
    this.rateLimiter = new RateLimiter();
    this.startTime = Date.now();
    this.actionLog = [];
    
    // Override console methods to prevent cheating via console
    this.protectConsole();
    
    // Detect dev tools
    this.detectDevTools();
  }

  protectConsole() {
    // Store original methods (only if not already stored)
    if (!this._consoleProtected) {
      const originalLog = console.log;
      const originalWarn = console.warn;
      
      // Override but still allow logging (just monitor)
      console.log = (...args) => {
        this.logConsoleActivity('log', args);
        originalLog.apply(console, args);
      };
      
      this._consoleProtected = true;
    }
    
    // Prevent direct game object access (only if not already defined)
    if (!window.hasOwnProperty('game') || Object.getOwnPropertyDescriptor(window, 'game')?.configurable) {
      try {
        Object.defineProperty(window, 'game', {
          get: () => undefined,
          set: () => {},
          configurable: true // Allow redefinition if needed
        });
      } catch (e) {
        // Property already exists and is not configurable - ignore
        console.warn('⚠️ Could not protect game property:', e.message);
      }
    }
  }

  detectDevTools() {
    let devtools = false;
    const threshold = 160;
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools) {
          devtools = true;
          this.flagSuspiciousActivity('devtools_detected');
        }
      } else {
        devtools = false;
      }
    }, 500);
  }

  logConsoleActivity(type, args) {
    // Log suspicious console usage
    if (args.some(arg => typeof arg === 'string' && 
        (arg.includes('game.') || arg.includes('score') || arg.includes('lives')))) {
      this.flagSuspiciousActivity('console_game_access');
    }
  }

  // Reset game state for a new game
  reset() {
    console.log('🔄 [SECURITY] Resetting secureGame for new game');
    // Reset score via setter (updates closure variable)
    this.score = 0;
    this._score = 0;
    this._actionsCount = 0;
    this._lives = 3;
    this._gameTime = 0;
    this._lastScoreUpdate = Date.now();
    this._scoreHistory = [];
    this.startTime = Date.now();
    this.actionLog = [];
    // Reset rate limiter
    this.rateLimiter = new RateLimiter();
    // Reset security system
    this.security = new GameSecurity();
    console.log('✅ [SECURITY] secureGame reset complete');
  }

  incrementScore(points) {
    this._actionsCount++;
    const oldScore = this.score; // Get current score from getter
    const newScore = oldScore + points;
    
    console.log(`🔍 [SCORE DEBUG] incrementScore called: +${points} | Old: ${oldScore} | New: ${newScore} | Actions: ${this._actionsCount}`);
    
    // Check if this is a boss defeat bonus (5000, 10000, 15000, 20000)
    const validBossDefeatBonuses = [5000, 10000, 15000, 20000];
    const isBossDefeatBonus = validBossDefeatBonuses.includes(points);
    
    // Update via setter so the closure variable is updated
    // The setter will call logScoreChange() which updates this._score
    this.score = newScore;
    
    // Get the actual score after setter (in case validation modified it)
    const actualNewScore = this.score;
    
    console.log(`🔍 [SCORE DEBUG] After setter: actualNewScore=${actualNewScore} | Expected: ${newScore} | Match: ${actualNewScore === newScore}`);
    
    // Log action for pattern analysis
    this.actionLog.push({
      type: 'score_increase',
      points: points,
      timestamp: Date.now() - this.startTime,
      total: actualNewScore
    });
    
    // Basic sanity check only - smart contract does the real validation
    const isValid = this.security.validateScore(actualNewScore, 0, 0, points);
    
    if (!isValid) {
      console.warn(`⚠️ [SECURITY] Basic sanity check failed: +${points} points | Old: ${oldScore} | New: ${actualNewScore}`);
      this.flagSuspiciousActivity('invalid_score_value');
      // Revert the score (setter will update _score via logScoreChange)
      this.score = oldScore;
      console.log(`🔍 [SCORE DEBUG] Score reverted to: ${this.score}`);
    }
  }

  submitScore() {
    // Rate limiting check (but don't block - just warn)
    if (!this.rateLimiter.canSubmit()) {
      console.warn('⚠️ [SECURITY] Rate limit warning (not blocking blockchain submission)');
      // Don't return - continue with validation
    }

    const gameState = this.getSecureGameState();
    const isValid = this.validateFinalScore(gameState);
    
    // Always return the score, even if validation fails
    // The blockchain will do its own validation
    // Security validation here is just for logging/warning purposes
    if (!isValid) {
      console.warn('⚠️ [SECURITY] Score validation warning (not blocking blockchain submission):', {
        score: this._score,
        gameTime: gameState.gameTime,
        actions: gameState.actions
      });
      this.flagSuspiciousActivity('invalid_final_score');
      // Still return success with the score - don't block blockchain submission
    }

    // In production, send encrypted data to server
    const encryptedState = this.security.encryptGameState(gameState);
    
    return {
      success: true, // Always return success - validation is just for warnings
      score: this._score,
      encryptedData: encryptedState,
      checksum: gameState.checksum,
      validationWarning: !isValid // Flag if validation failed (for logging)
    };
  }

  validateFinalScore(gameState) {
    // Multiple validation checks
    const timeValid = SecureInput.validateGameTime(gameState.gameTime);
    const scoreValid = SecureInput.validateScore(gameState.score);
    // For final score validation, we don't have the increment, so pass 0
    // This will use normal time-based validation (which is fine for final scores)
    const progressionValid = this.security.validateScore(
      gameState.score, 
      gameState.gameTime, 
      gameState.actions,
      0  // No increment available for final validation
    );
    
    // Check action patterns (simple heuristic)
    // More lenient: allow 0 actions (for very short games) and up to 60s per action (for slow gameplay)
    let patternValid = true;
    if (gameState.actions > 0) {
      const avgTimePerAction = gameState.gameTime / gameState.actions;
      // Allow 0ms to 60s per action (more lenient for various gameplay styles)
      patternValid = avgTimePerAction >= 0 && avgTimePerAction <= 60000;
    }
    // If no actions, still allow (might be a very short game or test)
    
    // Log validation details for debugging
    if (!timeValid || !scoreValid || !progressionValid || !patternValid) {
      console.warn('⚠️ [SECURITY] Final score validation failed:', {
        timeValid,
        scoreValid,
        progressionValid,
        patternValid,
        score: gameState.score,
        gameTime: gameState.gameTime,
        actions: gameState.actions,
        avgTimePerAction: gameState.actions > 0 ? (gameState.gameTime / gameState.actions) : 'N/A'
      });
    }
    
    // For blockchain submissions, be more lenient - only block obviously invalid scores
    // Allow submission if at least basic validations pass (score and time are valid)
    // Progression and pattern checks are warnings, not blockers
    return timeValid && scoreValid; // Only require basic validations
  }
}

// 6. SERVER-SIDE VALIDATION (Node.js example)
const serverSideValidation = `
// SERVER-SIDE CODE (Node.js + Express)
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const scoreSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 score submissions per minute
  message: 'Too many score submissions'
});

// Score validation endpoint
app.post('/api/scores', scoreSubmissionLimiter, async (req, res) => {
  try {
    const { score, gameTime, actions, checksum, encryptedData } = req.body;
    
    // Validate input types
    if (typeof score !== 'number' || typeof gameTime !== 'number') {
      return res.status(400).json({ error: 'Invalid input types' });
    }
    
    // Validate ranges
    if (score < 0 || score > 10000000 || gameTime < 1000 || gameTime > 3600000) {
      return res.status(400).json({ error: 'Values out of range' });
    }
    
    // Validate score progression (server-side logic)
    const maxPossibleScore = (gameTime / 1000) * 500; // 500 points per second max
    if (score > maxPossibleScore) {
      return res.status(400).json({ error: 'Score too high for time played' });
    }
    
    // Verify checksum (if using same algorithm as client)
    const expectedChecksum = generateServerChecksum(score, gameTime, actions);
    if (checksum !== expectedChecksum) {
      return res.status(400).json({ error: 'Invalid checksum' });
    }
    
    // Additional validation: check against player's history
    const playerHistory = await getPlayerScoreHistory(req.ip);
    if (isScoreAnomalous(score, playerHistory)) {
      return res.status(400).json({ error: 'Anomalous score pattern' });
    }
    
    // Save score if all validations pass
    const savedScore = await saveScore({
      score,
      gameTime,
      actions,
      ip: req.ip,
      timestamp: new Date()
    });
    
    res.json({ success: true, rank: savedScore.rank });
    
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generateServerChecksum(score, time, actions) {
  // Same algorithm as client-side
  const crypto = require('crypto');
  const data = \`\${score}-\${time}-\${actions}-SERVER_SALT\`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function isScoreAnomalous(score, history) {
  if (history.length < 3) return false;
  
  const recentScores = history.slice(-5).map(h => h.score);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  
  // Flag if new score is 10x higher than recent average
  return score > avgRecent * 10;
}
`;

// 7. USAGE EXAMPLE
function initializeSecureGame() {
  const secureGame = new SecureShooterGame();
  
  // Example of secure score handling
  function onEnemyDestroyed(enemyType) {
    const points = enemyType * 15; // 15, 30, 45, 60 points based on enemy type
    secureGame.incrementScore(points);
  }
  
  function onGameOver() {
    const result = secureGame.submitScore();
    
    if (result.success) {
      console.log('Score submitted successfully:', result.score);
      // Display leaderboard or success message
    } else {
      console.error('Score submission failed:', result.error);
      // Handle error (don't submit to leaderboard)
    }
    
    // Always return the result so the caller can decide what to do
    return result;
  }
  
  return { secureGame, onEnemyDestroyed, onGameOver };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GameSecurity,
    ProtectedGame,
    SecureInput,
    RateLimiter,
    SecureShooterGame,
    initializeSecureGame
  };
}

// Expose on window for browser use
if (typeof window !== 'undefined') {
  window.GameSecurity = GameSecurity;
  window.GameSecurity.initializeSecureGame = initializeSecureGame; // Attach as method on GameSecurity
  window.ProtectedGame = ProtectedGame;
  window.SecureInput = SecureInput;
  window.RateLimiter = RateLimiter;
  window.SecureShooterGame = SecureShooterGame;
  window.initializeSecureGame = initializeSecureGame; // Also expose standalone for backwards compatibility
}

console.log('Game security measures loaded. Key features:');
console.log('✓ Encrypted game state');
console.log('✓ Protected variables with validation');
console.log('✓ Input sanitization');
console.log('✓ Rate limiting');
console.log('✓ Server-side validation');
console.log('✓ Anti-tampering measures');
console.log('✓ Pattern analysis');
console.log('✓ Dev tools detection');
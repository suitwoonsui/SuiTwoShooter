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
    this.encryptionKey = this.generateEncryptionKey();
    
    // Start validation loop
    this.startValidation();
  }
  
  generateSessionKey() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  generateEncryptionKey() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Encrypt game state before sending to server
  encryptGameState(gameState) {
    // Simple XOR encryption (for demo - use proper encryption in production)
    const stateString = JSON.stringify(gameState);
    const encrypted = Array.from(stateString)
      .map((char, i) => {
        const keyChar = this.encryptionKey[i % this.encryptionKey.length];
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
      })
      .join('');
    
    return btoa(encrypted); // Base64 encode
  }
  
  // Decrypt game state from server
  decryptGameState(encryptedState) {
    try {
      const encrypted = atob(encryptedState);
      const decrypted = Array.from(encrypted)
        .map((char, i) => {
          const keyChar = this.encryptionKey[i % this.encryptionKey.length];
          return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
        })
        .join('');
      
      return JSON.parse(decrypted);
    } catch (e) {
      console.error('Failed to decrypt game state:', e);
      return null;
    }
  }
  
  // Validate game state integrity
  validateGameState(gameState) {
    const now = Date.now();
    const gameDuration = now - this.gameStartTime;
    
    // Check for impossible scores (too high for game duration)
    if (gameState.score) {
      const maxPossibleScore = Math.floor(gameDuration / 100) * 10; // Rough estimate
      if (gameState.score > maxPossibleScore * 2) {
        console.warn('⚠ SECURITY WARNING: Suspicious score detected');
        return false;
      }
    }
    
    // Check for impossible game duration
    if (gameDuration < 0 || gameDuration > 3600000) { // Max 1 hour
      console.warn('⚠ SECURITY WARNING: Invalid game duration');
      return false;
    }
    
    // Check session key matches
    if (gameState.sessionKey !== this.sessionKey) {
      console.warn('⚠ SECURITY WARNING: Session key mismatch');
      return false;
    }
    
    return true;
  }
  
  // Start periodic validation
  startValidation() {
    setInterval(() => {
      this.lastValidationTime = Date.now();
      // Validation happens when game state is checked
    }, this.validationInterval);
  }
  
  // Get secure game state for submission
  getSecureGameState(gameState) {
    const secureState = {
      ...gameState,
      sessionKey: this.sessionKey,
      gameStartTime: this.gameStartTime,
      timestamp: Date.now(),
      validationHash: this.generateValidationHash(gameState)
    };
    
    return this.encryptGameState(secureState);
  }
  
  // Generate validation hash
  generateValidationHash(gameState) {
    const hashString = `${this.sessionKey}-${gameState.score}-${this.gameStartTime}`;
    // Simple hash (use proper hashing in production)
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}

// 2. ANTI-TAMPERING MEASURES
const AntiTamper = {
  // Check if game files have been modified
  checkFileIntegrity() {
    // In production, compare file hashes with server
    // For now, just check critical functions exist
    const criticalFunctions = [
      'startGame',
      'updateGame',
      'submitScore',
      'GameSecurity'
    ];
    
    for (const funcName of criticalFunctions) {
      if (typeof window[funcName] === 'undefined' && 
          typeof eval(funcName) === 'undefined') {
        console.warn(`⚠ SECURITY WARNING: Critical function ${funcName} missing`);
        return false;
      }
    }
    
    return true;
  },
  
  // Detect if dev tools are open (basic detection)
  detectDevTools() {
    let devtools = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        devtools = true;
      }
    });
    
    console.log(element);
    console.clear();
    
    return devtools;
  },
  
  // Warn if suspicious activity detected
  checkSuspiciousActivity() {
    // Check for common cheat tools
    if (window.cheatEngine || window.artmoney || window.gameGuardian) {
      console.warn('⚠ SECURITY WARNING: Cheat tools detected');
      return true;
    }
    
    return false;
  }
};

// 3. RATE LIMITING
const RateLimiter = {
  submissions: [],
  maxSubmissions: 10,
  timeWindow: 60000, // 1 minute
  
  canSubmit() {
    const now = Date.now();
    // Remove old submissions outside time window
    this.submissions = this.submissions.filter(
      time => now - time < this.timeWindow
    );
    
    // Check if under limit
    if (this.submissions.length >= this.maxSubmissions) {
      console.warn('⚠ RATE LIMIT: Too many submissions');
      return false;
    }
    
    // Record this submission
    this.submissions.push(now);
    return true;
  },
  
  reset() {
    this.submissions = [];
  }
};

// 4. INITIALIZE SECURITY
let gameSecurityInstance = null;

function initGameSecurity() {
  if (!gameSecurityInstance) {
    gameSecurityInstance = new GameSecurity();
    
    // Run integrity checks
    if (!AntiTamper.checkFileIntegrity()) {
      console.error('❌ SECURITY ERROR: File integrity check failed');
    }
    
    if (AntiTamper.checkSuspiciousActivity()) {
      console.warn('⚠ SECURITY WARNING: Suspicious activity detected');
    }
    
    console.log('✅ Game security initialized');
  }
  
  return gameSecurityInstance;
}

// 5. EXPORT
if (typeof window !== 'undefined') {
  window.GameSecurity = GameSecurity;
  window.AntiTamper = AntiTamper;
  window.RateLimiter = RateLimiter;
  window.initGameSecurity = initGameSecurity;
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameSecurity);
  } else {
    initGameSecurity();
  }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GameSecurity,
    AntiTamper,
    RateLimiter,
    initGameSecurity
  };
}

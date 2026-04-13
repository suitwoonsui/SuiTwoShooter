// ==========================================
// GAME STATE MANAGEMENT
// ==========================================
// Centralized game state management with security system integration

/**
 * GameState class - Manages all game state
 * Handles security system integration for score tracking
 */
class GameState {
  constructor() {
    // Canvas and rendering
    this.canvas = null;
    this.ctx = null;
    this.width = 800;
    this.height = 480;
    this.laneHeight = 480 / 3; // 3 horizontal lanes
    
    // Visual/scroll speed - controls visual movement and gameplay difficulty
    this.scrollSpeed = 2.5;
    this.baseScrollSpeed = 2.5;
    this.scrollSpeedIncrement = 0.01;
    this.maxScrollSpeed = 6;
    
    // Enemy speed (after tier 4) - separate from scrollSpeed, cap increases with each boss
    this.enemySpeed = 2.5;
    this.baseEnemySpeed = 2.5;
    this.enemySpeedIncrement = 0.01;
    
    // Distance speed - constant for consistent boss timing (increased to spawn bosses sooner)
    this.distanceSpeed = 3.5;
    
    // Score management (security system integration)
    this._fallbackScore = 0; // Fallback for when security system isn't loaded
    this._secureGame = null; // Reference to security system (set via setSecureGame)
    
    // Game progression
    this.coins = 0;
    this.distance = 0;
    this.distanceSinceBoss = 0;
    this.bossThreshold = 5000;
    
    // Projectiles
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.bossProjectiles = [];
    this.missilesPerShot = 1;
    this.projectileLevel = 1; // Magic orb level (size/power)
    this.startingOrbLevel = 1; // Starting orb level (for power-up cap calculation)
    this.orbLevelCap = 3; // Power-up cap (startingLevel + 2)
    
    // Lives system
    this.lives = 3;
    this.baseLives = 3; // Base lives (always 3)
    this.purchasedLives = 0; // Purchased extra lives
    this.maxLives = 3; // Maximum number of lives (base + purchased)
    
    // Game state flags
    this.gameRunning = false;
    this.gameOver = false; // Game over state
    this.paused = false; // Pause state
    
    // Progression tracking
    this.bossesDefeated = 0; // Number of bosses defeated
    this.currentTier = 1; // Current tier (1-4)
    this.enemiesDefeated = 0; // Number of enemies defeated (for blockchain/burn tracking)
    this.bossTiers = []; // Array tracking tier of each boss defeated (for accurate burn calculation)
    this.enemyTypes = []; // Array tracking type of each enemy defeated (for accurate score calculation)
    this.bossHits = 0; // Total damage dealt to bosses (points = damage dealt per hit)
    
    // Input state
    this.keys = {};
    this.mouseY = 240; // Mouse Y position
    
    // Visual effects
    this.particles = [];
    this.bgX = 0; // Background scrolls horizontally
    
    // Charge system
    this.maxChargeTime = 1000;
    this.chargeStart = null;
    this.flashTime = 0;
    this.invulnerabilityTime = 0; // Invulnerability timer after being hit
    
    // Boss system
    this.bossActive = false;
    this.bossWarning = false;
    this.selectedItems = {}; // Items selected for consumption (set by item-consumption.js)
    this.bossWarningTime = 0;
    this.boss = null;
    this.bossFireInterval = 2000;
    this.bossVictoryTimeout = false;
    this.bossVictoryTime = 0;
    this.bossVictoryTimeout = false;
    this.bossVictoryTime = 0;
    
    // Tournament mode state
    this.isTournamentMode = false; // Whether current game is a tournament game
    this.tournamentObjectId = null; // Tournament object ID on-chain
    this.tournamentCategory = null; // Tournament category: 'highestScore' | 'longestDistance' | 'totalCoins' | etc.
    this.tournamentName = null; // Tournament name for display
    this.anchorSessionId = null; // Anchor session ID (number) for tournament score submit; set when starting tournament game
    
    // Level timing
    this.levelStartDelay = 0; // Milliseconds remaining in delay
    this.levelStartDelayDuration = 1000; // 1 second delay after level starts
    this.autoFireInterval = 300; // Auto fire every 300ms (slower)
    this.lastAutoFire = 0;
    
    // Force field system
    this.forceField = {
      level: 0, // 0 = none, 1 = level 1, 2 = level 2, 3 = level 3
      coinStreak: 0, // Consecutive coins collected without being hit
      maxStreak: 0, // Highest streak achieved this game
      active: false, // Whether force field is currently active
      invulnerabilityTime: 0 // Invulnerability timer after being hit (60 frames = 1 second)
    };
    
    // Session tracking
    this.sessionId = null;
    
    // Utility function
    this.now = () => performance.now();
  }
  
  /**
   * Set the security system reference
   * @param {Object} secureGame - The secure game instance from GameSecurity
   */
  setSecureGame(secureGame) {
    this._secureGame = secureGame;
  }
  
  /**
   * Get the current score (from security system or fallback)
   * Priority: _fallbackScore > secureGame.score (if secureGame.score > 0)
   * @returns {number} Current score
   */
  get score() {
    // If _fallbackScore has a value, use it (most reliable)
    if (this._fallbackScore !== undefined && this._fallbackScore !== null && this._fallbackScore > 0) {
      return this._fallbackScore;
    }
    // Otherwise, try secureGame.score if it exists and is valid
    if (this._secureGame && this._secureGame.score !== undefined && this._secureGame.score !== null && this._secureGame.score > 0) {
      return this._secureGame.score;
    }
    // Fallback to _fallbackScore even if 0, or return 0
    return this._fallbackScore || 0;
  }
  
  /**
   * Legacy 'speed' property for backward compatibility (maps to scrollSpeed)
   */
  get speed() {
    return this.scrollSpeed;
  }
  
  set speed(value) {
    this.scrollSpeed = value;
  }
  
  /**
   * Legacy 'baseSpeed' property for backward compatibility (maps to baseScrollSpeed)
   */
  get baseSpeed() {
    return this.baseScrollSpeed;
  }
  
  set baseSpeed(value) {
    this.baseScrollSpeed = value;
  }
  
  /**
   * Legacy 'speedIncrement' property for backward compatibility (maps to scrollSpeedIncrement)
   */
  get speedIncrement() {
    return this.scrollSpeedIncrement;
  }
  
  set speedIncrement(value) {
    this.scrollSpeedIncrement = value;
  }
  
  /**
   * Legacy 'maxSpeed' property for backward compatibility (maps to maxScrollSpeed)
   */
  get maxSpeed() {
    return this.maxScrollSpeed;
  }
  
  set maxSpeed(value) {
    this.maxScrollSpeed = value;
  }
  
  /**
   * Reset all game state to initial values
   * Called when starting a new game
   * Preserves tournament state during reset
   */
  reset() {
    // PRESERVE tournament state before reset
    const preservedTournamentState = {
      isTournamentMode: this.isTournamentMode,
      tournamentObjectId: this.tournamentObjectId,
      tournamentCategory: this.tournamentCategory,
      tournamentName: this.tournamentName,
      returnToTournament: this.returnToTournament,
      anchorSessionId: this.anchorSessionId,
    };
    
    // Always generate a unique session ID for this game session (so submit never fails for missing session)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      this.sessionId = crypto.randomUUID();
    } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const timestamp = Date.now();
      const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      this.sessionId = `${timestamp}-${randomBytes}`;
    } else {
      const n = (typeof window !== 'undefined' && (window.__gameSessionIdCounter = (window.__gameSessionIdCounter || 0) + 1)) || 0;
      this.sessionId = `session_${Date.now()}_${n}_${Math.random().toString(36).slice(2, 11)}`;
    }
    
    // Reset fallback score
    this._fallbackScore = 0;
    
    // Reset speeds
    this.scrollSpeed = this.baseScrollSpeed;
    this.enemySpeed = this.baseEnemySpeed;
    
    // Reset progression
    this.coins = 0;
    this.distance = 0;
    this.distanceSinceBoss = 0;
    
    // Clear arrays
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.bossProjectiles = [];
    this.particles = [];
    
    // Reset projectiles
    this.missilesPerShot = 1;
    this.startingOrbLevel = 1; // Default starting level
    this.projectileLevel = 1;
    this.orbLevelCap = 3; // Will be recalculated based on startingOrbLevel
    
    // Reset lives
    this.baseLives = 3;
    this.purchasedLives = 0;
    this.lives = 3;
    this.maxLives = 3;
    
    // Reset charge system
    this.chargeStart = null;
    this.flashTime = 0;
    this.invulnerabilityTime = 0;
    
    // Reset boss system
    this.bossActive = false;
    this.bossWarning = false;
    this.bossWarningTime = 0;
    this.bossVictoryTimeout = false;
    this.bossVictoryTime = 0;
    this.boss = null;
    this.bossFireInterval = 2000; // Reset to default
    
    // Reset game state flags
    this.gameRunning = true;
    this.gameOver = false;
    this.paused = false;
    
    // Reset progression tracking
    this.bossesDefeated = 0;
    this.currentTier = 1;
    this.enemiesDefeated = 0;
    this.bossTiers = [];
    this.enemyTypes = [];
    this.bossHits = 0;
    
    // Reset level timing
    this.levelStartDelay = this.levelStartDelayDuration;
    this.lastAutoFire = 0;
    
    // Reset force field
    this.forceField.level = 0;
    this.forceField.coinStreak = 0;
    this.forceField.maxStreak = 0;
    this.forceField.active = false;
    this.forceField.invulnerabilityTime = 0;
    
    // Reset background
    this.bgX = 0;
    
    // RESTORE tournament state after reset
    this.isTournamentMode = preservedTournamentState.isTournamentMode;
    this.tournamentObjectId = preservedTournamentState.tournamentObjectId;
    this.tournamentCategory = preservedTournamentState.tournamentCategory;
    this.tournamentName = preservedTournamentState.tournamentName;
    this.returnToTournament = preservedTournamentState.returnToTournament;
    this.anchorSessionId = preservedTournamentState.anchorSessionId ?? null;
  }
  
  /**
   * Reset state for returning to main menu
   * Stops the game and clears arrays
   */
  resetForMenu() {
    this.gameRunning = false;
    this.gameOver = false;
    this.paused = false;
    
    // Clear arrays
    if (this.projectiles) this.projectiles = [];
    if (this.enemyProjectiles) this.enemyProjectiles = [];
    if (this.bossProjectiles) this.bossProjectiles = [];
    if (this.particles) this.particles = [];
    
    // Stop movement
    this.scrollSpeed = 0;
    
    // Reset boss state
    this.bossActive = false;
    this.bossWarning = false;
    if (this.boss) this.boss = null;
  }
}

// Create and export a singleton instance
const gameState = new GameState();

// Export both the instance and the class (for testing)
if (typeof window !== 'undefined') {
  window.GameState = GameState;
  window.gameState = gameState;
}

// For module systems (if used)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameState, gameState };
}


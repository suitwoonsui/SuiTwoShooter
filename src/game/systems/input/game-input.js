// ==========================================
// GAME INPUT SYSTEM - DESKTOP INPUT ONLY
// ==========================================
// Manages keyboard and mouse input for DESKTOP devices
// Handles input state, event listeners, and coordinate conversion
//
// NOTE: This is an EXTRACTION of existing code from main.js, not a recreation
// - Mobile touch input is handled separately by TouchInput system (touch-input.js)
// - This class only extracts the keyboard/mouse event listeners from main.js
// - The existing handleInput() function in player.js continues to work unchanged

console.log('✅ [GAME INPUT] GameInput module loaded');

/**
 * GameInput class - Manages keyboard and mouse input
 * 
 * Responsibilities:
 * - Keyboard state management (keys object)
 * - Mouse position tracking (mouseY)
 * - Event listener setup and cleanup
 * - Coordinate conversion (responsive canvas support)
 * - Pause key handling
 */
class GameInput {
  constructor(gameState) {
    if (!gameState) {
      console.error('❌ [GAME INPUT] GameState is required for GameInput');
      throw new Error('GameState is required for GameInput');
    }

    this.gameState = gameState;
    this.keys = {}; // Keyboard state object
    this.mouseY = 240; // Default mouse Y position
    
    // Event handlers (stored for cleanup)
    this._keydownHandler = null;
    this._keyupHandler = null;
    this._mousemoveHandler = null;
    
    // Canvas reference
    this.canvas = null;
    
    // UI game state reference (for menu visibility checks)
    this.uiGameState = null;
    
    console.log('✅ [GAME INPUT] GameInput initialized');
  }

  /**
   * Initialize input system
   * @param {HTMLCanvasElement} canvas - The game canvas element
   * @param {Object} uiGameState - UI game state (for menu visibility checks)
   */
  init(canvas, uiGameState = null) {
    if (!canvas) {
      console.error('❌ [GAME INPUT] Canvas is required for initialization');
      return;
    }

    this.canvas = canvas;
    this.uiGameState = uiGameState || (typeof window !== 'undefined' && window.uiGameState) || null;
    
    // Initialize keys object - use the same reference as gameState.keys for backward compatibility
    if (!this.gameState.keys) {
      this.gameState.keys = {};
    }
    this.keys = this.gameState.keys; // Use same reference so they stay in sync
    
    // Initialize mouse Y position to center of screen
    this.mouseY = this.gameState.height / 2;
    this.gameState.mouseY = this.mouseY;
    
    // Set up event listeners
    this._setupKeyboardListeners();
    this._setupMouseListeners();
    
    console.log('✅ [GAME INPUT] Input system initialized');
  }

  /**
   * Set up keyboard event listeners
   * @private
   */
  _setupKeyboardListeners() {
    // Keydown handler
    this._keydownHandler = (e) => {
      // Check if name input modal is visible - allow all keys to work normally in input field
      const nameInputModal = document.getElementById('nameInputModal');
      const isNameInputVisible = nameInputModal && nameInputModal.classList.contains('name-input-modal-visible');
      
      // If name input modal is visible, don't interfere with keyboard input
      if (isNameInputVisible) {
        // Allow all keys to work normally in the input field
        return;
      }
      
      // Game over handling is now done by leaderboard system's onGameOver()
      // Don't interfere with the game over interaction handling here
      if (this.gameState.gameOver && !this._isMenuVisible()) {
        // The leaderboard system will handle the game over interaction
        // This handler should not interfere
        return;
      }
      
      // Handle P key for pause (only if game is running and not game over)
      if (e.code === 'KeyP') {
        // Only prevent default and handle pause if game is running and not over
        if (this.gameState.gameRunning && !this.gameState.gameOver && !this._isMenuVisible()) {
          e.preventDefault();
          this.gameState.paused = !this.gameState.paused;
        }
        // If game is over or not running, allow P key to work normally (for input fields, etc.)
      } else {
        // Update both GameInput.keys and gameState.keys (they should be the same reference)
        // Only update if game is running and not over
        if (this.gameState.gameRunning && !this.gameState.gameOver) {
          this.keys[e.code] = true;
          this.gameState.keys[e.code] = true;
        }
      }
    };

    // Keyup handler
    this._keyupHandler = (e) => {
      // Check if name input modal is visible - don't interfere with keyboard input
      const nameInputModal = document.getElementById('nameInputModal');
      const isNameInputVisible = nameInputModal && nameInputModal.classList.contains('name-input-modal-visible');
      
      // If name input modal is visible, don't update game keys
      if (isNameInputVisible) {
        return;
      }
      
      // Only update keys if game is running and not over
      if (this.gameState.gameRunning && !this.gameState.gameOver) {
        // Update both GameInput.keys and gameState.keys (they should be the same reference)
        this.keys[e.code] = false;
        this.gameState.keys[e.code] = false;
      }
    };

    // Add event listeners
    document.addEventListener('keydown', this._keydownHandler);
    document.addEventListener('keyup', this._keyupHandler);
  }

  /**
   * Set up mouse event listeners
   * @private
   */
  _setupMouseListeners() {
    this._mousemoveHandler = (e) => {
      if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
        // Use responsive coordinate conversion
        const coords = ResponsiveCanvas.screenToGameCoords(e.clientX, e.clientY);
        this.mouseY = coords.y;
      } else {
        // Fallback to original method
        const rect = this.canvas.getBoundingClientRect();
        this.mouseY = e.clientY - rect.top;
      }
      
      // Update gameState.mouseY for backward compatibility
      this.gameState.mouseY = this.mouseY;
    };

    // Add event listener
    this.canvas.addEventListener('mousemove', this._mousemoveHandler);
  }

  /**
   * Check if menu is visible
   * @private
   * @returns {boolean} True if menu is visible
   */
  _isMenuVisible() {
    if (this.uiGameState) {
      return this.uiGameState.isMenuVisible;
    }
    if (typeof window !== 'undefined' && window.uiGameState) {
      return window.uiGameState.isMenuVisible;
    }
    return false;
  }

  /**
   * Update input state (called from game loop)
   * This is a placeholder for future input processing
   */
  update() {
    // Input state is updated via event listeners
    // This method can be used for input processing if needed
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    
    if (this._keyupHandler) {
      document.removeEventListener('keyup', this._keyupHandler);
      this._keyupHandler = null;
    }
    
    if (this._mousemoveHandler && this.canvas) {
      this.canvas.removeEventListener('mousemove', this._mousemoveHandler);
      this._mousemoveHandler = null;
    }
    
    console.log('✅ [GAME INPUT] Input system cleaned up');
  }

  /**
   * Get keyboard state
   * @param {string} keyCode - The key code to check
   * @returns {boolean} True if key is pressed
   */
  isKeyPressed(keyCode) {
    return !!this.keys[keyCode];
  }

  /**
   * Get mouse Y position
   * @returns {number} Mouse Y position
   */
  getMouseY() {
    return this.mouseY;
  }
}

// Global instance
let gameInputInstance = null;

/**
 * Initialize and return the singleton GameInput instance
 * @param {Object} gameState - The game state object
 * @param {HTMLCanvasElement} canvas - The game canvas element
 * @param {Object} uiGameState - UI game state (optional)
 * @returns {GameInput} The GameInput instance
 */
function initGameInput(gameState, canvas, uiGameState = null) {
  if (!gameInputInstance) {
    gameInputInstance = new GameInput(gameState);
  }
  
  // Initialize with canvas
  if (canvas) {
    gameInputInstance.init(canvas, uiGameState);
  }
  
  // Expose globally
  if (typeof window !== 'undefined') {
    window.gameInputInstance = gameInputInstance;
  }
  
  return gameInputInstance;
}

/**
 * Get the GameInput instance
 * @returns {GameInput|null} The GameInput instance, or null if not initialized
 */
function getGameInput() {
  return gameInputInstance;
}

// Export for use in main.js and other modules
if (typeof window !== 'undefined') {
  window.GameInput = GameInput;
  window.initGameInput = initGameInput;
  window.getGameInput = getGameInput;
}

console.log('✅ [GAME INPUT] GameInput module ready');


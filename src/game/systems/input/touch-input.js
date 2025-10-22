// ==========================================
// ENHANCED TOUCH INPUT MODULE
// ==========================================
// Purpose: Handle continuous touch input with visual feedback
// Dependencies: canvas-manager.js, device-detection.js
// Impact: Provides smooth touch controls for mobile devices

/**
 * Enhanced Touch Input System
 * Handles continuous touch input with visual feedback and smooth tracking
 * Provides touch zones, visual indicators, and haptic feedback simulation
 */
const TouchInput = {
  // Touch state
  isTouching: false,
  touchId: null,
  touchStartTime: 0,
  lastTouchX: 0,
  lastTouchY: 0,
  touchVelocity: { x: 0, y: 0 },
  
  // Visual feedback
  touchIndicator: null,
  touchTrail: [],
  maxTrailLength: 10,
  
  // Configuration
  config: {
    enableVisualFeedback: true,
    enableTouchTrail: true,
    enableHapticSimulation: true,
    touchSensitivity: 1.0,
    deadZone: 5 // Minimum movement to register
  },
  
  // Device info
  deviceType: 'desktop',
  isInitialized: false,
  
  /**
   * Initialize touch input system
   * @param {HTMLCanvasElement} canvas - The game canvas element
   * @param {boolean} forceEnable - Force enable even on desktop (for testing)
   */
  initialize(canvas, forceEnable = false) {
    this.canvas = canvas;
    this.gameContainer = canvas.closest('.game-container') || canvas.parentElement;
    this.deviceType = DeviceDetection.detectDeviceType();
    
    // Enable touch features on devices with touch support
    if (this.deviceType === 'mobile' || this.deviceType === 'tablet' || 
        DeviceDetection.hasTouchSupport() || forceEnable) {
      this.setupTouchHandling();
      this.createTouchIndicator();
      this.isInitialized = true;
      console.log('👆 Enhanced Touch Input initialized');
    } else {
      console.log('🖱️ Desktop detected - touch input disabled');
    }
  },

  /**
   * Setup touch event handling
   */
  setupTouchHandling() {
    if (!this.canvas || !this.gameContainer) return;
    
    // Touch start - attach to game container for wider touch area
    this.gameContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleTouchStart(e);
    }, { passive: false });
    
    // Touch move - attach to game container for wider touch area
    this.gameContainer.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.handleTouchMove(e);
    }, { passive: false });
    
    // Touch end - attach to game container for wider touch area
    this.gameContainer.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleTouchEnd(e);
    }, { passive: false });
    
    // Touch cancel - attach to game container for wider touch area
    this.gameContainer.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.handleTouchEnd(e);
    }, { passive: false });
  },

  /**
   * Handle touch start event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchStart(e) {
    if (e.touches.length === 0) return;
    
    const touch = e.touches[0];
    this.isTouching = true;
    this.touchId = touch.identifier;
    this.touchStartTime = Date.now();
    
    // Get initial touch position (already clamped)
    const coords = this.getTouchCoordinates(touch);
    this.lastTouchX = coords.x;
    this.lastTouchY = coords.y;
    
    // Initialize velocity
    this.touchVelocity = { x: 0, y: 0 };
    
    // Add to touch trail
    if (this.config.enableTouchTrail) {
      this.touchTrail = [coords];
    }
    
    // Show touch indicator
    if (this.config.enableVisualFeedback) {
      this.showTouchIndicator(coords.x, coords.y);
    }
    
    // Simulate haptic feedback
    if (this.config.enableHapticSimulation) {
      this.simulateHapticFeedback('start');
    }
    
    // Update game input
    this.updateGameInput(coords.x, coords.y);
    
    console.log('👆 Touch started at:', coords);
  },

  /**
   * Handle touch move event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchMove(e) {
    if (!this.isTouching || e.touches.length === 0) return;
    
    // Find the correct touch
    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchId) {
        touch = e.touches[i];
        break;
      }
    }
    
    if (!touch) return;
    
    // Get current touch position
    const coords = this.getTouchCoordinates(touch);
    
    // Calculate movement
    const deltaX = coords.x - this.lastTouchX;
    const deltaY = coords.y - this.lastTouchY;
    
    // Check dead zone
    if (Math.abs(deltaX) < this.config.deadZone && Math.abs(deltaY) < this.config.deadZone) {
      return;
    }
    
    // Calculate velocity
    const now = Date.now();
    const deltaTime = now - this.touchStartTime;
    if (deltaTime > 0) {
      this.touchVelocity.x = deltaX / deltaTime;
      this.touchVelocity.y = deltaY / deltaTime;
    }
    
    // Update last position
    this.lastTouchX = coords.x;
    this.lastTouchY = coords.y;
    
    // Add to touch trail
    if (this.config.enableTouchTrail) {
      this.touchTrail.push(coords);
      if (this.touchTrail.length > this.maxTrailLength) {
        this.touchTrail.shift();
      }
    }
    
    // Update touch indicator
    if (this.config.enableVisualFeedback) {
      this.updateTouchIndicator(coords.x, coords.y);
    }
    
    // Update game input
    this.updateGameInput(coords.x, coords.y);
    
    // Simulate haptic feedback for movement
    if (this.config.enableHapticSimulation && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      this.simulateHapticFeedback('move');
    }
  },

  /**
   * Handle touch end event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchEnd(e) {
    if (!this.isTouching) return;
    
    this.isTouching = false;
    this.touchId = null;
    
    // Hide touch indicator
    if (this.config.enableVisualFeedback) {
      this.hideTouchIndicator();
    }
    
    // Clear touch trail
    if (this.config.enableTouchTrail) {
      this.touchTrail = [];
    }
    
    // Simulate haptic feedback
    if (this.config.enableHapticSimulation) {
      this.simulateHapticFeedback('end');
    }
    
    // Reset game input
    this.resetGameInput();
    
    console.log('👆 Touch ended');
  },

  /**
   * Get touch coordinates in game space
   * @param {Touch} touch - Touch object
   * @returns {object} Game coordinates
   */
  getTouchCoordinates(touch) {
    let coords;
    if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
      coords = ResponsiveCanvas.screenToGameCoords(touch.clientX, touch.clientY);
    } else {
      // Fallback to original method
      const rect = this.canvas.getBoundingClientRect();
      coords = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    
    // Clamp coordinates to canvas bounds
    return this.clampToCanvasBounds(coords);
  },

  /**
   * Clamp coordinates to canvas bounds
   * @param {object} coords - Coordinates to clamp
   * @returns {object} Clamped coordinates
   */
  clampToCanvasBounds(coords) {
    // Always use original canvas dimensions for game logic (800x480)
    // The ResponsiveCanvas system maintains the original dimensions internally
    return {
      x: Math.max(0, Math.min(800, coords.x)),
      y: Math.max(0, Math.min(480, coords.y))
    };
  },

  /**
   * Update game input with touch coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updateGameInput(x, y) {
    // Update game mouse position for player movement
    if (typeof game !== 'undefined') {
      game.mouseY = y;
    }
    
    // Update player position directly if available
    if (typeof player !== 'undefined') {
      player.y = y - player.height / 2;
    }
    
    // Store last position for external access
    this.lastTouchX = x;
    this.lastTouchY = y;
  },

  /**
   * Reset game input
   */
  resetGameInput() {
    // Keep player at current position when touch ends
    // This prevents the player from jumping back to center
  },

  /**
   * Create touch indicator element
   */
  createTouchIndicator() {
    if (!this.config.enableVisualFeedback) return;
    
    this.touchIndicator = document.createElement('div');
    this.touchIndicator.style.cssText = `
      position: absolute;
      width: 40px;
      height: 40px;
      border: 3px solid #4DA2FF;
      border-radius: 50%;
      background: rgba(77, 162, 255, 0.2);
      pointer-events: none;
      z-index: 1000;
      display: none;
      transition: all 0.1s ease;
    `;
    
    // Add to game container for wider touch area
    const container = this.gameContainer || this.canvas.parentElement;
    if (container) {
      container.style.position = 'relative';
      container.appendChild(this.touchIndicator);
    }
  },

  /**
   * Show touch indicator at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  showTouchIndicator(x, y) {
    if (!this.touchIndicator) return;
    
    const containerRect = (this.gameContainer || this.canvas.parentElement).getBoundingClientRect();
    const screenCoords = ResponsiveCanvas.gameToScreenCoords(x, y);
    
    // Position relative to container, not screen
    this.touchIndicator.style.left = (screenCoords.x - containerRect.left - 20) + 'px';
    this.touchIndicator.style.top = (screenCoords.y - containerRect.top - 20) + 'px';
    this.touchIndicator.style.display = 'block';
    this.touchIndicator.style.transform = 'scale(1)';
  },

  /**
   * Update touch indicator position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updateTouchIndicator(x, y) {
    if (!this.touchIndicator) return;
    
    const containerRect = (this.gameContainer || this.canvas.parentElement).getBoundingClientRect();
    const screenCoords = ResponsiveCanvas.gameToScreenCoords(x, y);
    
    // Position relative to container, not screen
    this.touchIndicator.style.left = (screenCoords.x - containerRect.left - 20) + 'px';
    this.touchIndicator.style.top = (screenCoords.y - containerRect.top - 20) + 'px';
  },

  /**
   * Hide touch indicator
   */
  hideTouchIndicator() {
    if (!this.touchIndicator) return;
    
    this.touchIndicator.style.transform = 'scale(0)';
    setTimeout(() => {
      this.touchIndicator.style.display = 'none';
    }, 100);
  },

  /**
   * Simulate haptic feedback
   * @param {string} type - Type of feedback ('start', 'move', 'end')
   */
  simulateHapticFeedback(type) {
    // Visual feedback simulation since we can't do real haptic
    const colors = {
      start: '#4DA2FF',
      move: '#39ff14',
      end: '#ff6b6b'
    };
    
    if (this.touchIndicator) {
      this.touchIndicator.style.borderColor = colors[type];
    }
    
    // Audio feedback simulation
    if (typeof playButtonPressSound === 'function') {
      playButtonPressSound();
    }
  },

  /**
   * Render touch trail
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderTouchTrail(ctx) {
    if (!this.config.enableTouchTrail || this.touchTrail.length < 2) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(77, 162, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    for (let i = 0; i < this.touchTrail.length; i++) {
      const point = this.touchTrail[i];
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();
    ctx.restore();
  },

  /**
   * Get touch state
   * @returns {object} Current touch state
   */
  getTouchState() {
    return {
      isTouching: this.isTouching,
      touchId: this.touchId,
      lastPosition: { x: this.lastTouchX, y: this.lastTouchY },
      velocity: this.touchVelocity,
      trailLength: this.touchTrail.length
    };
  },

  /**
   * Update touch input (called by game loop)
   */
  update() {
    // Update touch indicator position if touching
    if (this.isTouching && this.touchIndicator) {
      const containerRect = this.canvas.parentElement.getBoundingClientRect();
      const screenCoords = ResponsiveCanvas.gameToScreenCoords(this.lastTouchX, this.lastTouchY);
      this.touchIndicator.style.left = (screenCoords.x - containerRect.left - 20) + 'px';
      this.touchIndicator.style.top = (screenCoords.y - containerRect.top - 20) + 'px';
    }
  },

  /**
   * Cleanup touch input system
   */
  destroy() {
    if (this.touchIndicator) {
      this.touchIndicator.remove();
      this.touchIndicator = null;
    }
    this.isInitialized = false;
  }
};

// Initialize touch input
console.log('👆 Enhanced Touch Input module loaded');

// Export globally for access by other modules
window.TouchInput = TouchInput;

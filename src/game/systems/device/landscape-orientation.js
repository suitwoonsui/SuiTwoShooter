// ==========================================
// LANDSCAPE ORIENTATION MODULE
// ==========================================
// Purpose: Force landscape orientation for mobile devices
// Dependencies: device-detection.js
// Impact: Zero on desktop, enforces landscape on mobile

/**
 * Landscape Orientation Enforcement
 * Forces mobile devices to use landscape orientation
 * Provides orientation change handling and UI adaptation
 */
const LandscapeOrientation = {
  // Orientation state
  isLandscapeEnforced: false,
  orientationOverlay: null,
  
  /**
   * Initialize landscape enforcement
   */
  initialize() {
    // Only enforce on mobile devices
    if (DeviceDetection.isMobile() || DeviceDetection.isTablet()) {
      this.enforceLandscape();
      this.setupOrientationHandling();
      console.log('📱 Landscape orientation enforcement enabled');
    } else {
      console.log('🖥️ Desktop detected - no orientation enforcement needed');
    }
  },

  /**
   * Enforce landscape orientation
   */
  enforceLandscape() {
    // Add CSS to lock orientation
    this.addOrientationCSS();
    
    // Create orientation overlay for portrait warning
    this.createOrientationOverlay();
    
    // Check initial orientation
    this.checkOrientation();
    
    this.isLandscapeEnforced = true;
  },

  /**
   * Add CSS to enforce landscape orientation
   */
  addOrientationCSS() {
    const style = document.createElement('style');
    style.textContent = `
      /* Force landscape orientation on mobile */
      @media screen and (max-width: 768px) {
        body {
          overflow: hidden;
        }
        
        /* Hide content when in portrait */
        .portrait-hidden {
          display: none !important;
        }
        
        /* Show content only in landscape */
        .landscape-only {
          display: block !important;
        }
        
        /* Portrait warning overlay */
        .orientation-warning {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #0a0a0a 0%, #0f1419 50%, #1a2332 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          color: white;
          text-align: center;
          padding: 20px;
        }
        
        .orientation-warning h2 {
          font-size: 2rem;
          margin-bottom: 20px;
          color: #4DA2FF;
        }
        
        .orientation-warning p {
          font-size: 1.2rem;
          margin-bottom: 30px;
          color: #ccc;
        }
        
        .orientation-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: rotate 2s linear infinite;
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(90deg); }
        }
        
        /* Hide orientation warning in landscape */
        @media screen and (orientation: landscape) {
          .orientation-warning {
            display: none !important;
          }
        }
        
        /* Show orientation warning in portrait */
        @media screen and (orientation: portrait) {
          .orientation-warning {
            display: flex !important;
          }
        }
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Create orientation warning overlay
   */
  createOrientationOverlay() {
    this.orientationOverlay = document.createElement('div');
    this.orientationOverlay.className = 'orientation-warning';
    this.orientationOverlay.innerHTML = `
      <div class="orientation-icon">📱</div>
      <h2>Rotate Your Device</h2>
      <p>Please rotate your device to landscape mode for the best gaming experience!</p>
      <p><small>The game is optimized for landscape orientation.</small></p>
    `;
    document.body.appendChild(this.orientationOverlay);
  },

  /**
   * Setup orientation change handling
   */
  setupOrientationHandling() {
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.checkOrientation();
      }, 100); // Small delay to ensure orientation has changed
    });

    // Listen for resize events (fallback)
    window.addEventListener('resize', () => {
      this.checkOrientation();
    });
  },

  /**
   * Check current orientation and update UI
   */
  checkOrientation() {
    if (!this.isLandscapeEnforced) return;

    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (isLandscape) {
      this.hideOrientationWarning();
      this.enableGameContent();
    } else {
      this.showOrientationWarning();
      this.disableGameContent();
    }
  },

  /**
   * Show orientation warning
   */
  showOrientationWarning() {
    if (this.orientationOverlay) {
      this.orientationOverlay.style.display = 'flex';
    }
  },

  /**
   * Hide orientation warning
   */
  hideOrientationWarning() {
    if (this.orientationOverlay) {
      this.orientationOverlay.style.display = 'none';
    }
  },

  /**
   * Enable game content (landscape mode)
   */
  enableGameContent() {
    // Remove portrait-hidden class from game elements
    const gameElements = document.querySelectorAll('.game-container, .suitch-header, .suitch-footer');
    gameElements.forEach(element => {
      element.classList.remove('portrait-hidden');
      element.classList.add('landscape-only');
    });
  },

  /**
   * Disable game content (portrait mode)
   */
  disableGameContent() {
    // Add portrait-hidden class to game elements
    const gameElements = document.querySelectorAll('.game-container, .suitch-header, .suitch-footer');
    gameElements.forEach(element => {
      element.classList.add('portrait-hidden');
      element.classList.remove('landscape-only');
    });
  },

  /**
   * Get current orientation
   * @returns {string} 'landscape' or 'portrait'
   */
  getCurrentOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  },

  /**
   * Check if device is in landscape
   * @returns {boolean} True if landscape
   */
  isLandscape() {
    return this.getCurrentOrientation() === 'landscape';
  },

  /**
   * Get optimal canvas dimensions for landscape
   * @param {string} deviceType - Device type
   * @returns {object} Optimal canvas dimensions
   */
  getLandscapeCanvasSize(deviceType) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Account for UI elements
    const headerHeight = 60;
    const footerHeight = 80;
    const availableHeight = screenHeight - headerHeight - footerHeight;
    
    // Calculate optimal size maintaining aspect ratio
    const gameAspectRatio = 800 / 480; // Original game aspect ratio
    
    let canvasWidth, canvasHeight;
    
    if (screenWidth / availableHeight > gameAspectRatio) {
      // Screen is wider than game aspect ratio
      canvasHeight = availableHeight;
      canvasWidth = canvasHeight * gameAspectRatio;
    } else {
      // Screen is taller than game aspect ratio
      canvasWidth = screenWidth;
      canvasHeight = canvasWidth / gameAspectRatio;
    }
    
    // Apply device-specific limits
    const config = getDeviceConfig(deviceType);
    canvasWidth = Math.min(canvasWidth, config.canvas.maxWidth);
    canvasHeight = Math.min(canvasHeight, config.canvas.maxHeight);
    
    return {
      width: Math.round(canvasWidth),
      height: Math.round(canvasHeight),
      scale: canvasWidth / 800 // Scale factor from original
    };
  },

  /**
   * Cleanup orientation enforcement
   */
  destroy() {
    if (this.orientationOverlay) {
      this.orientationOverlay.remove();
      this.orientationOverlay = null;
    }
    this.isLandscapeEnforced = false;
  }
};

// Initialize landscape orientation
console.log('🔄 Landscape Orientation module loaded');

// Export globally for access by other modules
window.LandscapeOrientation = LandscapeOrientation;

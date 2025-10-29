// ==========================================
// LANDSCAPE ORIENTATION MODULE
// ==========================================
// Purpose: Force landscape orientation for mobile devices by rotating viewport-container
// Dependencies: device-detection.js
// Impact: Zero on desktop, rotates game content to landscape on mobile portrait
// Approach: Rotates only .viewport-container (not html/body) for better isolation

/**
 * Landscape Orientation Enforcement
 * Forces mobile devices to display in landscape orientation
 * Rotates only .viewport-container for better compatibility with browser UI and Web3 wallets
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
      console.log('📱 Landscape orientation enforcement enabled');
    } else {
      console.log('🖥️ Desktop detected - no orientation enforcement needed');
    }
  },

  /**
   * Enforce landscape orientation
   */
  enforceLandscape() {
    // Initialize body styles for mobile
    this.setupBodyStyles();
    
    // Apply rotation based on orientation
    this.updateRotation();
    
    // Listen for orientation changes
    this.setupOrientationListener();
    
    this.isLandscapeEnforced = true;
  },

  /**
   * Setup body styles to prevent scrolling (uses CSS class)
   */
  setupBodyStyles() {
    // CSS handles this via .portrait-forced class on body
  },

  /**
   * Apply rotation to viewport container based on current orientation
   * Uses CSS classes instead of inline styles
   */
  updateRotation() {
    const viewportContainer = document.querySelector('.viewport-container');
    if (!viewportContainer) return;
    
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait) {
      // Device is in portrait - add rotation classes
      viewportContainer.classList.add('portrait-forced');
      viewportContainer.classList.remove('landscape-normal');
      document.body.classList.add('portrait-forced');
      
      console.log('📱 Applied portrait rotation to .viewport-container');
    } else {
      // Device is in landscape - remove rotation classes
      viewportContainer.classList.remove('portrait-forced');
      viewportContainer.classList.add('landscape-normal');
      document.body.classList.remove('portrait-forced');
      
    }
    
    // Trigger resize event to notify canvas manager
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  },

  /**
   * Setup listener for orientation changes
   */
  setupOrientationListener() {
    // Listen for resize events (orientation change triggers resize)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateRotation();
      }, 100);
    });
    
    // Listen for orientation change events
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateRotation();
      }, 200);
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
   * Removes CSS classes instead of inline styles
   */
  destroy() {
    // Remove rotation classes from viewport container
    const viewportContainer = document.querySelector('.viewport-container');
    if (viewportContainer) {
      viewportContainer.classList.remove('portrait-forced', 'landscape-normal');
    }
    
    // Remove body classes
    document.body.classList.remove('portrait-forced');
    
    // Remove orientation overlay if it exists
    if (this.orientationOverlay) {
      this.orientationOverlay.remove();
      this.orientationOverlay = null;
    }
    
    // Reset state
    this.isLandscapeEnforced = false;
  }
};

// Initialize landscape orientation
console.log('🔄 Landscape Orientation module loaded');

// Export globally for access by other modules
window.LandscapeOrientation = LandscapeOrientation;

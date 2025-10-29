// ==========================================
// RESPONSIVE CANVAS MANAGER MODULE
// ==========================================
// Purpose: Manage dynamic canvas sizing and coordinate transformation
// Dependencies: device-detection.js, device-config.js, landscape-orientation.js
// Impact: Replaces fixed canvas sizing with responsive system

/**
 * Responsive Canvas Management
 * Handles dynamic canvas sizing, coordinate transformation, and scaling
 * Maintains game logic coordinates while adapting visual output
 */
const ResponsiveCanvas = {
  // Canvas state
  canvas: null,
  ctx: null,
  originalWidth: 800,
  originalHeight: 480,
  currentWidth: 800,
  currentHeight: 480,
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  
  // Device-specific settings
  deviceType: 'desktop',
  isInitialized: false,
  
  /**
   * Initialize responsive canvas system
   * @param {HTMLCanvasElement} canvas - The game canvas element
   */
  initialize(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.deviceType = DeviceDetection.detectDeviceType();
    
    // Set up responsive sizing
    this.setupResponsiveSizing();
    
    // Listen for resize events
    this.setupResizeHandling();
    
    this.isInitialized = true;
    console.log('📐 Responsive Canvas Manager initialized');
  },

  /**
   * Setup responsive canvas sizing
   */
  setupResponsiveSizing() {
    if (!this.canvas) return;
    
    // For all devices, CSS handles sizing via object-fit: contain
    // Keep internal canvas at 800x480 for game logic
    this.canvas.width = 800;
    this.canvas.height = 480;
    this.scaleX = 1;
    this.scaleY = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  },

  /**
   * Calculate responsive canvas size for desktop
   * @param {object} containerSize - Container dimensions
   * @returns {object} Responsive canvas dimensions
   */
  calculateResponsiveSize(containerSize) {
    // Original game aspect ratio
    const gameAspectRatio = this.originalWidth / this.originalHeight;
    
    // Available space (account for padding)
    const availableWidth = containerSize.width - 40;
    const availableHeight = containerSize.height - 200;
    
    let canvasWidth, canvasHeight;
    
    // Maintain game aspect ratio while fitting in available space
    if (availableWidth / availableHeight > gameAspectRatio) {
      // Container is wider than game aspect ratio
      canvasHeight = availableHeight;
      canvasWidth = canvasHeight * gameAspectRatio;
    } else {
      // Container is taller than game aspect ratio
      canvasWidth = availableWidth;
      canvasHeight = canvasWidth / gameAspectRatio;
    }
    
    // Ensure minimum size
    canvasWidth = Math.max(canvasWidth, 400);
    canvasHeight = Math.max(canvasHeight, 240);
    
    return {
      width: Math.round(canvasWidth),
      height: Math.round(canvasHeight),
      scale: canvasWidth / this.originalWidth
    };
  },

  /**
   * Get container size for canvas sizing calculations
   * @returns {object} Container dimensions
   */
  getContainerSize() {
    const container = this.canvas.parentElement;
    if (!container) {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    
    const rect = container.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height
    };
  },

  /**
   * Resize canvas to specified dimensions
   * @param {number} width - New canvas width
   * @param {number} height - New canvas height
   */
  resizeCanvas(width, height) {
    if (!this.canvas) return;
    
    // For all devices, CSS handles display sizing via object-fit: contain
    // Keep internal dimensions at 800x480 for game logic
    console.log(`📱 ${this.deviceType} canvas: internal 800x480, CSS handles display sizing`);
    this.canvas.width = 800;
    this.canvas.height = 480;
    // No scaling needed - game logic uses internal dimensions
    this.scaleX = 1;
    this.scaleY = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  },

  /**
   * Update canvas CSS styling for responsive display
   */
  updateCanvasStyling() {
    if (!this.canvas) return;
    
    // DON'T set inline styles - let CSS handle dimensions
    // The CSS modularization uses aspect-ratio for proper sizing
    console.log('📐 Skipping inline style injection - using CSS aspect-ratio instead');
    
    // Just ensure the canvas has the internal dimensions for game logic
    this.canvas.width = 800;
    this.canvas.height = 480;
    
    // Let CSS handle the display size via aspect-ratio property
    // This allows the canvas to properly size within the flex layout
  },

  /**
   * Setup resize event handling
   */
  setupResizeHandling() {
    // Debounced resize handler
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.setupResponsiveSizing();
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Listen for orientation changes on mobile
    if (this.deviceType === 'mobile' || this.deviceType === 'tablet') {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          this.setupResponsiveSizing();
        }, 200);
      });
    }
  },

  /**
   * Convert screen coordinates to game coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {object} Game coordinates
   */
  screenToGameCoords(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    
    // Get position relative to canvas
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    
    // Convert to game coordinates using the actual canvas dimensions
    // The canvas is always 800x480, so we scale based on that
    const gameX = (canvasX / rect.width) * this.originalWidth;
    const gameY = (canvasY / rect.height) * this.originalHeight;
    
    return {
      x: Math.round(gameX),
      y: Math.round(gameY)
    };
  },

  /**
   * Convert game coordinates to screen coordinates
   * @param {number} gameX - Game X coordinate
   * @param {number} gameY - Game Y coordinate
   * @returns {object} Screen coordinates
   */
  gameToScreenCoords(gameX, gameY) {
    const rect = this.canvas.getBoundingClientRect();
    
    // Convert from game coordinates to canvas-relative coordinates
    const canvasX = (gameX / this.originalWidth) * rect.width;
    const canvasY = (gameY / this.originalHeight) * rect.height;
    
    // Convert to screen coordinates
    const screenX = canvasX + rect.left;
    const screenY = canvasY + rect.top;
    
    return {
      x: Math.round(screenX),
      y: Math.round(screenY)
    };
  },

  /**
   * Scale a value from original game scale to current scale
   * @param {number} value - Value to scale
   * @param {string} axis - 'x' or 'y' axis
   * @returns {number} Scaled value
   */
  scaleValue(value, axis = 'x') {
    return axis === 'x' ? value * this.scaleX : value * this.scaleY;
  },

  /**
   * Get current canvas state
   * @returns {object} Canvas state information
   */
  getCanvasState() {
    return {
      width: this.currentWidth,
      height: this.currentHeight,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      deviceType: this.deviceType,
      isInitialized: this.isInitialized
    };
  },

  /**
   * Check if coordinates are within canvas bounds
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if within bounds
   */
  isInBounds(x, y) {
    return x >= 0 && x < this.originalWidth && y >= 0 && y < this.originalHeight;
  },

  /**
   * Get canvas center coordinates
   * @returns {object} Center coordinates
   */
  getCenter() {
    return {
      x: this.originalWidth / 2,
      y: this.originalHeight / 2
    };
  },

  /**
   * Update canvas state (called by game loop)
   */
  update() {
    // Don't update canvas styling every frame - it causes growing
    // Only update on resize events
  },

  /**
   * Cleanup responsive canvas system
   */
  destroy() {
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
  }
};

// Initialize responsive canvas
console.log('📐 Responsive Canvas Manager module loaded');

// Export globally for access by other modules
window.ResponsiveCanvas = ResponsiveCanvas;
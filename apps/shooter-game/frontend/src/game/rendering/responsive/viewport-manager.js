// ==========================================
// VIEWPORT MANAGER MODULE
// ==========================================
// Purpose: Handle viewport calculations and coordinate transformations
// Dependencies: canvas-manager.js, device-detection.js
// Impact: Provides coordinate transformation utilities for responsive rendering

/**
 * Viewport Manager
 * Handles viewport calculations, coordinate transformations, and scaling utilities
 * Works with ResponsiveCanvas to provide seamless coordinate conversion
 */
const ViewportManager = {
  // Viewport state
  viewport: {
    x: 0,
    y: 0,
    width: 800,
    height: 480,
    scale: 1
  },
  
  // Device information
  deviceType: 'desktop',
  isInitialized: false,
  
  /**
   * Initialize viewport manager
   */
  initialize() {
    this.deviceType = DeviceDetection.detectDeviceType();
    this.updateViewport();
    this.isInitialized = true;
    console.log('👁️ Viewport Manager initialized');
  },

  /**
   * Update viewport information
   */
  updateViewport() {
    if (!ResponsiveCanvas.isInitialized) {
      // Fallback to default viewport
      this.viewport = {
        x: 0,
        y: 0,
        width: 800,
        height: 480,
        scale: 1
      };
      return;
    }
    
    const canvasState = ResponsiveCanvas.getCanvasState();
    this.viewport = {
      x: 0,
      y: 0,
      width: canvasState.width,
      height: canvasState.height,
      scale: canvasState.scaleX // Use X scale as primary scale
    };
  },

  /**
   * Convert screen coordinates to viewport coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {object} Viewport coordinates
   */
  screenToViewport(screenX, screenY) {
    if (!ResponsiveCanvas.isInitialized) {
      return { x: screenX, y: screenY };
    }
    
    return ResponsiveCanvas.screenToGameCoords(screenX, screenY);
  },

  /**
   * Convert viewport coordinates to screen coordinates
   * @param {number} viewportX - Viewport X coordinate
   * @param {number} viewportY - Viewport Y coordinate
   * @returns {object} Screen coordinates
   */
  viewportToScreen(viewportX, viewportY) {
    if (!ResponsiveCanvas.isInitialized) {
      return { x: viewportX, y: viewportY };
    }
    
    return ResponsiveCanvas.gameToScreenCoords(viewportX, viewportY);
  },

  /**
   * Scale coordinates based on current viewport scale
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {object} Scaled coordinates
   */
  scaleCoordinates(x, y) {
    return {
      x: x * this.viewport.scale,
      y: y * this.viewport.scale
    };
  },

  /**
   * Unscale coordinates based on current viewport scale
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {object} Unscaled coordinates
   */
  unscaleCoordinates(x, y) {
    return {
      x: x / this.viewport.scale,
      y: y / this.viewport.scale
    };
  },

  /**
   * Get viewport bounds
   * @returns {object} Viewport bounds
   */
  getViewportBounds() {
    return {
      left: this.viewport.x,
      top: this.viewport.y,
      right: this.viewport.x + this.viewport.width,
      bottom: this.viewport.y + this.viewport.height,
      width: this.viewport.width,
      height: this.viewport.height
    };
  },

  /**
   * Check if coordinates are within viewport bounds
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if within bounds
   */
  isInViewport(x, y) {
    const bounds = this.getViewportBounds();
    return x >= bounds.left && x <= bounds.right && 
           y >= bounds.top && y <= bounds.bottom;
  },

  /**
   * Clamp coordinates to viewport bounds
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {object} Clamped coordinates
   */
  clampToViewport(x, y) {
    const bounds = this.getViewportBounds();
    return {
      x: Math.max(bounds.left, Math.min(bounds.right, x)),
      y: Math.max(bounds.top, Math.min(bounds.bottom, y))
    };
  },

  /**
   * Get viewport center
   * @returns {object} Center coordinates
   */
  getViewportCenter() {
    return {
      x: this.viewport.width / 2,
      y: this.viewport.height / 2
    };
  },

  /**
   * Calculate distance between two points in viewport coordinates
   * @param {number} x1 - First X coordinate
   * @param {number} y1 - First Y coordinate
   * @param {number} x2 - Second X coordinate
   * @param {number} y2 - Second Y coordinate
   * @returns {number} Distance
   */
  calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Get optimal font size for current viewport scale
   * @param {number} baseFontSize - Base font size
   * @returns {number} Scaled font size
   */
  getScaledFontSize(baseFontSize) {
    return Math.max(8, Math.round(baseFontSize * this.viewport.scale));
  },

  /**
   * Get optimal line width for current viewport scale
   * @param {number} baseLineWidth - Base line width
   * @returns {number} Scaled line width
   */
  getScaledLineWidth(baseLineWidth) {
    return Math.max(1, baseLineWidth * this.viewport.scale);
  },

  /**
   * Get device-specific scaling factor
   * @returns {number} Device scaling factor
   */
  getDeviceScale() {
    const config = getDeviceConfig(this.deviceType);
    return config.ui.scale;
  },

  /**
   * Update viewport (called by game loop)
   */
  update() {
    this.updateViewport();
  },

  /**
   * Get viewport information for debugging
   * @returns {object} Viewport debug information
   */
  getDebugInfo() {
    return {
      viewport: this.viewport,
      deviceType: this.deviceType,
      isInitialized: this.isInitialized,
      canvasState: ResponsiveCanvas.isInitialized ? ResponsiveCanvas.getCanvasState() : null
    };
  },

  /**
   * Cleanup viewport manager
   */
  destroy() {
    this.isInitialized = false;
  }
};

// Initialize viewport manager
console.log('👁️ Viewport Manager module loaded');

// Export globally for access by other modules
window.ViewportManager = ViewportManager;

// ==========================================
// MOBILE UTILITIES MODULE
// ==========================================
// Purpose: Utility functions for mobile optimization
// Dependencies: device-detection.js, device-config.js
// Impact: Zero - only provides utility functions, doesn't change behavior

/**
 * Mobile Utility Functions
 * Provides helper functions for mobile optimization
 * All functions are pure and don't affect game state
 */
const MobileUtils = {
  /**
   * Check if current device is mobile
   * @returns {boolean} True if mobile device
   */
  isMobileDevice() {
    return DeviceDetection.isMobile();
  },

  /**
   * Check if current device is tablet
   * @returns {boolean} True if tablet device
   */
  isTabletDevice() {
    return DeviceDetection.isTablet();
  },

  /**
   * Check if current device is desktop
   * @returns {boolean} True if desktop device
   */
  isDesktopDevice() {
    return DeviceDetection.isDesktop();
  },

  /**
   * Get device type string
   * @returns {string} Device type ('mobile', 'tablet', 'desktop')
   */
  getDeviceType() {
    return DeviceDetection.detectDeviceType();
  },

  /**
   * Get screen dimensions
   * @returns {object} Screen dimensions
   */
  getScreenDimensions() {
    return DeviceDetection.detectScreenSize();
  },

  /**
   * Check if device has touch support
   * @returns {boolean} True if touch supported
   */
  hasTouchSupport() {
    return DeviceDetection.hasTouchSupport();
  },

  /**
   * Check if device supports orientation changes
   * @returns {boolean} True if orientation supported
   */
  hasOrientationSupport() {
    return DeviceDetection.hasOrientationSupport();
  },

  /**
   * Get optimal canvas size for current device
   * @param {object} containerSize - Container dimensions
   * @returns {object} Optimal canvas dimensions
   */
  getOptimalCanvasSize(containerSize) {
    const deviceType = this.getDeviceType();
    // Default canvas sizing - can be extended by device-specific modules
    return {
      width: Math.min(containerSize.width || 800, 800),
      height: Math.min(containerSize.height || 480, 480),
      scale: 1
    };
  },

  /**
   * Get UI scale factor for current device
   * @returns {number} UI scale factor
   */
  getUIScale() {
    const deviceType = this.getDeviceType();
    // Default UI scale - can be extended by device-specific modules
    return deviceType === 'mobile' ? 0.8 : 1.0;
  },

  /**
   * Get performance settings for current device
   * @returns {object} Performance settings
   */
  getPerformanceSettings() {
    const deviceType = this.getDeviceType();
    // Default performance settings - can be extended by device-specific modules
    return {
      particleCount: deviceType === 'mobile' ? 50 : 100,
      animationQuality: deviceType === 'mobile' ? 'medium' : 'high',
      textureQuality: deviceType === 'mobile' ? 'medium' : 'high'
    };
  },

  /**
   * Check if device is low-end (basic performance check)
   * @returns {boolean} True if low-end device
   */
  isLowEndDevice() {
    const capabilities = DeviceDetection.detectPerformanceCapabilities();
    const screenSize = DeviceDetection.detectScreenSize();
    
    // Simple heuristic for low-end devices
    return (
      screenSize.width < 400 || 
      screenSize.height < 600 ||
      capabilities.hardwareConcurrency < 4 ||
      capabilities.memoryEstimate < 4
    );
  },

  /**
   * Get device capabilities summary
   * @returns {object} Device capabilities
   */
  getDeviceCapabilities() {
    return DeviceDetection.detectPerformanceCapabilities();
  },

  /**
   * Format device info for logging
   * @returns {string} Formatted device info
   */
  getDeviceInfoString() {
    const deviceType = this.getDeviceType();
    const screenSize = this.getScreenDimensions();
    const capabilities = this.getDeviceCapabilities();
    
    return `Device: ${deviceType} | Screen: ${screenSize.width}x${screenSize.height} | Touch: ${capabilities.hasTouchSupport ? 'Yes' : 'No'} | WebGL: ${capabilities.hasWebGL ? 'Yes' : 'No'}`;
  },

  /**
   * Check if current orientation is portrait
   * @returns {boolean} True if portrait orientation
   */
  isPortraitOrientation() {
    return window.innerHeight > window.innerWidth;
  },

  /**
   * Check if current orientation is landscape
   * @returns {boolean} True if landscape orientation
   */
  isLandscapeOrientation() {
    return window.innerWidth > window.innerHeight;
  },

  /**
   * Get current orientation
   * @returns {string} 'portrait' or 'landscape'
   */
  getCurrentOrientation() {
    return this.isPortraitOrientation() ? 'portrait' : 'landscape';
  },

  /**
   * Debounce function for performance
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function for performance
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Initialize mobile utilities
console.log('🔧 Mobile Utilities module loaded');

// Export globally for access by other modules
window.MobileUtils = MobileUtils;

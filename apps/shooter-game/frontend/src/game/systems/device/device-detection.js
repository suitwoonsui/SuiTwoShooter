// ==========================================
// DEVICE DETECTION MODULE
// ==========================================
// Purpose: Detect device type, screen size, and capabilities
// Dependencies: None (foundation module)
// Impact: Zero - only provides detection, doesn't change behavior

/**
 * Device Detection System
 * Detects device type, screen size, and performance capabilities
 * Provides device-specific configurations for mobile optimization
 */
const DeviceDetection = {
  // Device type detection
  detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    // Mobile detection
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      return 'mobile';
    }
    
    // Tablet detection (larger screens with touch)
    if (screenWidth >= 768 && screenWidth <= 1024 && 'ontouchstart' in window) {
      return 'tablet';
    }
    
    // Desktop
    return 'desktop';
  },

  // Screen size detection
  detectScreenSize() {
    return {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      pixelRatio: window.devicePixelRatio || 1
    };
  },

  // Performance capabilities detection
  detectPerformanceCapabilities() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    return {
      hasWebGL: !!gl,
      maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
      hasTouchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0,
      hasOrientationSupport: 'orientation' in window,
      hasVibrationSupport: 'vibrate' in navigator,
      memoryEstimate: navigator.deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
    };
  },

  // Get comprehensive device info
  getDeviceInfo() {
    return {
      type: this.detectDeviceType(),
      screen: this.detectScreenSize(),
      capabilities: this.detectPerformanceCapabilities(),
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };
  },

  // Check if device is mobile
  isMobile() {
    return this.detectDeviceType() === 'mobile';
  },

  // Check if device is tablet
  isTablet() {
    return this.detectDeviceType() === 'tablet';
  },

  // Check if device is desktop
  isDesktop() {
    return this.detectDeviceType() === 'desktop';
  },

  // Check if device has touch support
  hasTouchSupport() {
    return this.detectPerformanceCapabilities().hasTouchSupport;
  },

  // Check if device supports orientation changes
  hasOrientationSupport() {
    return this.detectPerformanceCapabilities().hasOrientationSupport;
  }
};

// Initialize device detection
console.log('📱 Device Detection module loaded');

// Export globally for access by other modules
window.DeviceDetection = DeviceDetection;
// ==========================================
// DEVICE CONFIGURATION MODULE
// ==========================================
// Purpose: Store device-specific configurations
// Dependencies: device-detection.js
// Impact: Zero - only provides configuration data, doesn't change behavior

/**
 * Device-Specific Configurations
 * Contains optimized settings for different device types
 * Used by other systems to adapt behavior based on device capabilities
 */
const DeviceConfigs = {
  mobile: {
    canvas: { 
      maxWidth: 600,  // Increased for landscape
      maxHeight: 400, // Increased for landscape
      minWidth: 320,
      minHeight: 240,
      aspectRatio: 1.67 // Landscape aspect ratio
    },
    ui: { 
      scale: 1.2, 
      touchTargets: 44,
      fontSize: 14,
      padding: 12
    },
    performance: { 
      maxParticles: 50, 
      targetFPS: 30,
      enableScreenShake: true,
      enableTrailEffects: false
    },
    controls: {
      touchSensitivity: 0.3,
      enableHapticFeedback: true,
      enableTouchIndicators: true
    }
  },
  
  tablet: {
    canvas: { 
      maxWidth: 800,  // Increased for landscape
      maxHeight: 600, // Increased for landscape
      minWidth: 500,
      minHeight: 300,
      aspectRatio: 1.67 // Landscape aspect ratio
    },
    ui: { 
      scale: 1.1, 
      touchTargets: 40,
      fontSize: 16,
      padding: 10
    },
    performance: { 
      maxParticles: 100, 
      targetFPS: 45,
      enableScreenShake: true,
      enableTrailEffects: true
    },
    controls: {
      touchSensitivity: 0.25,
      enableHapticFeedback: true,
      enableTouchIndicators: true
    }
  },
  
  desktop: {
    canvas: { 
      maxWidth: 800, 
      maxHeight: 480,
      minWidth: 640,
      minHeight: 360,
      aspectRatio: 1.67
    },
    ui: { 
      scale: 1.0, 
      touchTargets: 32,
      fontSize: 14,
      padding: 8
    },
    performance: { 
      maxParticles: 200, 
      targetFPS: 60,
      enableScreenShake: true,
      enableTrailEffects: true
    },
    controls: {
      touchSensitivity: 0.2,
      enableHapticFeedback: false,
      enableTouchIndicators: false
    }
  }
};

/**
 * Get device configuration based on device type
 * @param {string} deviceType - 'mobile', 'tablet', or 'desktop'
 * @returns {object} Device-specific configuration
 */
function getDeviceConfig(deviceType) {
  return DeviceConfigs[deviceType] || DeviceConfigs.desktop;
}

/**
 * Get optimal canvas dimensions for current device
 * @param {string} deviceType - Device type
 * @param {object} containerSize - Container dimensions
 * @returns {object} Optimal canvas dimensions
 */
function getOptimalCanvasSize(deviceType, containerSize) {
  const config = getDeviceConfig(deviceType);
  const { maxWidth, maxHeight, minWidth, minHeight, aspectRatio } = config.canvas;
  
  // Calculate available space
  const availableWidth = Math.min(containerSize.width - 40, maxWidth);
  const availableHeight = Math.min(containerSize.height - 200, maxHeight);
  
  let canvasWidth, canvasHeight;
  
  // Maintain aspect ratio while fitting in available space
  if (availableWidth / availableHeight > aspectRatio) {
    canvasHeight = availableHeight;
    canvasWidth = canvasHeight * aspectRatio;
  } else {
    canvasWidth = availableWidth;
    canvasHeight = canvasWidth / aspectRatio;
  }
  
  // Ensure minimum dimensions
  canvasWidth = Math.max(canvasWidth, minWidth);
  canvasHeight = Math.max(canvasHeight, minHeight);
  
  return {
    width: Math.round(canvasWidth),
    height: Math.round(canvasHeight),
    scale: Math.min(canvasWidth / 800, canvasHeight / 480) // Scale factor from original size
  };
}

/**
 * Get UI scaling factor for device
 * @param {string} deviceType - Device type
 * @returns {number} UI scaling factor
 */
function getUIScale(deviceType) {
  return getDeviceConfig(deviceType).ui.scale;
}

/**
 * Get performance settings for device
 * @param {string} deviceType - Device type
 * @returns {object} Performance settings
 */
function getPerformanceSettings(deviceType) {
  return getDeviceConfig(deviceType).performance;
}

// Initialize device configurations
console.log('⚙️ Device Configuration module loaded');

// Export globally for access by other modules
window.DeviceConfigs = DeviceConfigs;
window.getDeviceConfig = getDeviceConfig;
window.getOptimalCanvasSize = getOptimalCanvasSize;
window.getUIScale = getUIScale;
window.getPerformanceSettings = getPerformanceSettings;

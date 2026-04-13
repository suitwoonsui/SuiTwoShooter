// ==========================================
// DEVICE MONITORING MODULE
// ==========================================
// Purpose: Monitor device performance and capabilities
// Dependencies: device-detection.js, device-config.js
// Impact: Zero - only monitors, doesn't change behavior

/**
 * Device Performance Monitoring
 * Monitors device performance and adapts game settings accordingly
 * Provides real-time device capability assessment
 */
const DeviceMonitoring = {
  // Monitoring state
  isMonitoring: false,
  frameCount: 0,
  lastFrameTime: 0,
  frameRateHistory: [],
  performanceHistory: [],
  
  // Performance thresholds
  thresholds: {
    lowFPS: 25,
    mediumFPS: 40,
    highFPS: 55,
    maxHistoryLength: 60 // 1 second at 60fps
  },

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.frameRateHistory = [];
    this.performanceHistory = [];
    
    // Start frame rate monitoring
    this.monitorFrameRate();
    
    console.log('📊 Device performance monitoring started');
  },

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('📊 Device performance monitoring stopped');
  },

  /**
   * Monitor frame rate
   */
  monitorFrameRate() {
    if (!this.isMonitoring) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.frameRateHistory.push(fps);
      
      // Keep only recent history
      if (this.frameRateHistory.length > this.thresholds.maxHistoryLength) {
        this.frameRateHistory.shift();
      }
    }
    
    this.lastFrameTime = currentTime;
    this.frameCount++;
    
    // Continue monitoring
    requestAnimationFrame(() => this.monitorFrameRate());
  },

  /**
   * Get current frame rate
   * @returns {number} Current FPS
   */
  getCurrentFrameRate() {
    if (this.frameRateHistory.length === 0) return 0;
    
    const recentFrames = this.frameRateHistory.slice(-10); // Last 10 frames
    return recentFrames.reduce((sum, fps) => sum + fps, 0) / recentFrames.length;
  },

  /**
   * Get average frame rate
   * @returns {number} Average FPS over monitoring period
   */
  getAverageFrameRate() {
    if (this.frameRateHistory.length === 0) return 0;
    
    return this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length;
  },

  /**
   * Get performance metrics
   * @returns {object} Performance metrics
   */
  getPerformanceMetrics() {
    const currentFPS = this.getCurrentFrameRate();
    const averageFPS = this.getAverageFrameRate();
    
    return {
      currentFPS: Math.round(currentFPS),
      averageFPS: Math.round(averageFPS),
      frameCount: this.frameCount,
      isStable: this.isPerformanceStable(),
      performanceLevel: this.getPerformanceLevel(currentFPS),
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now()
    };
  },

  /**
   * Check if performance is stable
   * @returns {boolean} True if performance is stable
   */
  isPerformanceStable() {
    if (this.frameRateHistory.length < 10) return true;
    
    const recentFrames = this.frameRateHistory.slice(-10);
    const minFPS = Math.min(...recentFrames);
    const maxFPS = Math.max(...recentFrames);
    
    // Consider stable if variation is less than 20%
    return (maxFPS - minFPS) < (maxFPS * 0.2);
  },

  /**
   * Get performance level based on FPS
   * @param {number} fps - Current FPS
   * @returns {string} Performance level
   */
  getPerformanceLevel(fps) {
    if (fps >= this.thresholds.highFPS) return 'high';
    if (fps >= this.thresholds.mediumFPS) return 'medium';
    if (fps >= this.thresholds.lowFPS) return 'low';
    return 'poor';
  },

  /**
   * Get memory usage estimate
   * @returns {object} Memory usage information
   */
  getMemoryUsage() {
    if ('memory' in performance) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    
    return {
      used: 'unknown',
      total: 'unknown',
      limit: 'unknown'
    };
  },

  /**
   * Check if performance is degraded
   * @returns {boolean} True if performance is below acceptable threshold
   */
  isPerformanceDegraded() {
    const currentFPS = this.getCurrentFrameRate();
    return currentFPS < this.thresholds.lowFPS;
  },

  /**
   * Get recommended performance settings
   * @param {string} deviceType - Device type
   * @returns {object} Recommended settings
   */
  getRecommendedSettings(deviceType) {
    const currentFPS = this.getCurrentFrameRate();
    const performanceLevel = this.getPerformanceLevel(currentFPS);
    
    const baseConfig = DeviceConfigs[deviceType] || DeviceConfigs.desktop;
    
    // Adjust settings based on performance
    const adjustments = {
      poor: { maxParticles: 10, targetFPS: 20, enableScreenShake: false },
      low: { maxParticles: 25, targetFPS: 25, enableScreenShake: false },
      medium: { maxParticles: 50, targetFPS: 30, enableScreenShake: true },
      high: { maxParticles: 100, targetFPS: 45, enableScreenShake: true }
    };
    
    return {
      ...baseConfig.performance,
      ...adjustments[performanceLevel]
    };
  },

  /**
   * Log performance report
   */
  logPerformanceReport() {
    const metrics = this.getPerformanceMetrics();
    console.log('📊 Performance Report:', {
      'Current FPS': metrics.currentFPS,
      'Average FPS': metrics.averageFPS,
      'Performance Level': metrics.performanceLevel,
      'Is Stable': metrics.isStable,
      'Memory Usage': metrics.memoryUsage,
      'Total Frames': metrics.frameCount
    });
  }
};

// Initialize device monitoring
console.log('📊 Device Monitoring module loaded');

// Export globally for access by other modules
window.DeviceMonitoring = DeviceMonitoring;

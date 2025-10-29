// ==========================================
// MOBILE SAFARI VIEWPORT FIX
// ==========================================
// Purpose: Fix viewport height calculation on mobile Safari
// Problem: Safari's 100vh includes browser chrome (address bar, favorites bar)
// Solution: Use window.innerHeight to get actual visible viewport height
// Impact: Prevents content from being cut off by browser UI on mobile Safari

/**
 * Mobile Safari Viewport Fix
 * Calculates actual viewport height excluding browser chrome
 */
const MobileViewportFix = {
  isInitialized: false,
  
  /**
   * Initialize viewport height fix for mobile Safari
   */
  initialize() {
    // Only apply on mobile devices
    if (!DeviceDetection.isMobile() && !DeviceDetection.isTablet()) {
      console.log('🖥️ Desktop detected - skipping mobile viewport fix');
      return;
    }
    
    this.updateViewportHeight();
    
    // Update on resize (handles orientation changes, browser chrome show/hide)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateViewportHeight();
      }, 150); // Debounce resize events
    });
    
    // Update on orientation change (immediate)
    window.addEventListener('orientationchange', () => {
      // Wait for orientation change to complete
      setTimeout(() => {
        this.updateViewportHeight();
      }, 100);
    });
    
    // Update on scroll (Safari shows/hides browser chrome on scroll)
    let lastHeight = window.innerHeight;
    window.addEventListener('scroll', () => {
      if (Math.abs(window.innerHeight - lastHeight) > 50) {
        lastHeight = window.innerHeight;
        this.updateViewportHeight();
      }
    }, { passive: true });
    
    this.isInitialized = true;
    console.log('📱 Mobile Safari viewport fix initialized');
  },
  
  /**
   * Update the CSS custom property with actual viewport height
   */
  updateViewportHeight() {
    // Get actual viewport height (excludes browser chrome)
    const vh = window.innerHeight * 0.01;
    
    // Set CSS custom property
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Also set real viewport width (though this is usually accurate)
    const vw = window.innerWidth * 0.01;
    document.documentElement.style.setProperty('--vw', `${vw}px`);
    
    console.log(`📐 Viewport updated: ${window.innerWidth}x${window.innerHeight} (--vh: ${vh}px, --vw: ${vw}px)`);
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  MobileViewportFix.initialize();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  // Will be initialized by DOMContentLoaded listener above
} else {
  MobileViewportFix.initialize();
}

// Export globally
window.MobileViewportFix = MobileViewportFix;


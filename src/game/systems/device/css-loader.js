// ==========================================
// CSS LOADER MODULE
// ==========================================
// Purpose: Dynamically load CSS based on device detection
// Dependencies: DeviceDetection
// Impact: Zero - only loads CSS, doesn't change behavior

/**
 * CSS Loader System
 * Dynamically loads CSS based on device type detection
 * Replaces media queries with precise device detection
 */
const CSSLoader = {
  // Load CSS file dynamically
  loadCSS(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    console.log(`✅ Loaded CSS: ${href}`);
  },

  // Load shared CSS modules (loaded for all devices)
  loadSharedCSS() {
    console.log('🔗 Loading Shared CSS modules...');
    
    // Theme and base styles (load first for CSS variables)
    this.loadCSS('src/game/rendering/responsive/shared/shared-theme.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-base-styles.css');
    
    // Universal component styling (load early for base classes)
    this.loadCSS('src/game/rendering/responsive/shared/shared-components.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-ui-components.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-ui-classes.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-viewport-container.css');
    
    // Feature-specific modules
    this.loadCSS('src/game/rendering/responsive/shared/shared-front-page.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-main-menu.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-panels.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-typography.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-interactions.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-responsive.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-gameplay.css');
    this.loadCSS('src/game/rendering/responsive/shared/shared-animations.css');
    console.log('✅ Shared CSS modules loaded successfully!');
  },

  // Load desktop CSS modules
  loadDesktopCSS() {
    console.log('🖥️ Loading Desktop CSS modules...');
    
    // Load shared CSS first
    this.loadSharedCSS();
    
    // Desktop-specific modules (only true differences)
    this.loadCSS('src/game/rendering/responsive/desktop-modules/desktop-game-ui.css');
    console.log('✅ Desktop CSS modules loaded successfully!');
  },

  // Load mobile CSS modules
  loadMobileCSS() {
    console.log('📱 Loading Mobile CSS modules...');
    
    // Load shared CSS first
    this.loadSharedCSS();
    
    // Mobile-specific modules (only true differences)
    this.loadCSS('src/game/rendering/responsive/mobile-modules/mobile-game-ui.css');
    this.loadCSS('src/game/rendering/responsive/mobile-modules/mobile-main-menu.css');
    this.loadCSS('src/game/rendering/responsive/mobile-modules/mobile-header-stats.css');
    this.loadCSS('src/game/rendering/responsive/mobile-modules/mobile-landscape-rotation.css');
    console.log('✅ Mobile CSS modules loaded successfully!');
  },

  // Load tablet CSS modules (can be desktop + mobile, or custom)
  loadTabletCSS() {
    console.log('📱 Loading Tablet CSS modules (currently using Desktop CSS)...');
    
    // For now, tablets use desktop CSS (can be customized later)
    this.loadDesktopCSS();
    
    // Could add tablet-specific CSS here if needed
    // this.loadCSS('src/game/rendering/responsive/tablet-modules/tablet-specific.css');
    console.log('✅ Tablet CSS modules loaded successfully!');
  },

  // Initialize CSS loading based on device detection
  init() {
    const deviceType = DeviceDetection.detectDeviceType();
    console.log(`🎯 Device detected: ${deviceType}`);
    console.log(`📊 Screen: ${window.screen.width}x${window.screen.height}`);
    console.log(`👆 Touch: ${'ontouchstart' in window ? 'Yes' : 'No'}`);
    
    // Add device class to body for CSS targeting
    document.body.classList.add(deviceType);
    
    // Load device-specific CSS (which loads shared CSS internally)
    switch (deviceType) {
      case 'desktop':
        this.loadDesktopCSS();
        break;
      case 'tablet':
        this.loadTabletCSS();
        break;
      case 'mobile':
        this.loadMobileCSS();
        break;
      default:
        console.warn(`⚠️ Unknown device type: ${deviceType}, defaulting to desktop`);
        this.loadDesktopCSS();
    }
    
    console.log('🎉 CSS loading complete!');
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CSSLoader.init();
});

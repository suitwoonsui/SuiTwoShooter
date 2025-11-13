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
  // Track CSS loading state
  isLoaded: false,
  loadCallbacks: [],
  
  // Load CSS file dynamically and return promise
  loadCSS(href) {
    return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // Add cache-busting query parameter for localhost (development)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const cacheBuster = isLocalhost ? `?v=${Date.now()}` : '';
    link.href = href + cacheBuster;
      
      link.onload = () => {
        console.log(`✅ Loaded CSS: ${href}`);
        resolve();
      };
      
      link.onerror = () => {
        console.error(`❌ Failed to load CSS: ${href}`);
        // Don't reject - continue loading other CSS files
        resolve();
      };
      
    document.head.appendChild(link);
    });
  },
  
  // Wait for all CSS to load (using a small delay for stylesheet cascade)
  waitForCSSLoad(callback) {
    // Check if CSS sheets are loaded by checking if styles are computed
    const checkInterval = setInterval(() => {
      const frontPage = document.getElementById('frontPage');
      if (frontPage) {
        const computedStyle = window.getComputedStyle(frontPage);
        // Check if CSS has loaded by verifying we have real styles (not defaults)
        if (computedStyle.display !== 'none' || frontPage.classList.contains('front-page-overlay-visible')) {
          clearInterval(checkInterval);
          this.isLoaded = true;
          console.log('✅ CSS confirmed loaded - styles computed');
          // Call all waiting callbacks
          this.loadCallbacks.forEach(cb => cb());
          this.loadCallbacks = [];
          if (callback) callback();
        }
      }
    }, 50); // Check every 50ms
    
    // Fallback timeout - proceed after 2 seconds even if CSS check fails
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.isLoaded) {
        this.isLoaded = true;
        console.warn('⚠️ CSS load check timeout - proceeding anyway');
        this.loadCallbacks.forEach(cb => cb());
        this.loadCallbacks = [];
        if (callback) callback();
      }
    }, 2000);
  },

  // Load shared CSS modules (loaded for all devices)
  async loadSharedCSS() {
    console.log('🔗 Loading Shared CSS modules...');
    
    // Theme and base styles (load first for CSS variables)
    await this.loadCSS('src/game/rendering/responsive/shared/shared-theme.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-base-styles.css');
    
    // Universal component styling (load early for base classes)
    await this.loadCSS('src/game/rendering/responsive/shared/shared-components.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-ui-components.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-ui-classes.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-viewport-container.css');
    
    // Feature-specific modules - CRITICAL: Load front-page CSS early
    await this.loadCSS('src/game/rendering/responsive/shared/shared-front-page.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-main-menu.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-panels.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-typography.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-interactions.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-responsive.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-gameplay.css');
    await this.loadCSS('src/game/rendering/responsive/shared/shared-animations.css');
    console.log('✅ Shared CSS modules loaded successfully!');
  },

  // Load desktop CSS modules
  async loadDesktopCSS() {
    console.log('🖥️ Loading Desktop CSS modules...');
    
    // Load shared CSS first
    await this.loadSharedCSS();
    
    // Desktop-specific modules (only true differences)
    await this.loadCSS('src/game/rendering/responsive/desktop-modules/desktop-game-ui.css');
    await this.loadCSS('src/game/rendering/ui/consumable-footer.css');
    console.log('✅ Desktop CSS modules loaded successfully!');
  },

  // Load mobile CSS modules
  async loadMobileCSS() {
    console.log('📱 Loading Mobile CSS modules...');
    
    // Load shared CSS first
    await this.loadSharedCSS();
    
    // Mobile-specific modules (only true differences)
    await this.loadCSS('src/game/rendering/responsive/mobile-modules/mobile-game-ui.css');
    await this.loadCSS('src/game/rendering/responsive/mobile-modules/mobile-main-menu.css');
    await this.loadCSS('src/game/rendering/responsive/mobile-modules/mobile-header-stats.css');
    await this.loadCSS('src/game/rendering/responsive/mobile-modules/mobile-landscape-rotation.css');
    await this.loadCSS('src/game/rendering/ui/consumable-footer.css');
    console.log('✅ Mobile CSS modules loaded successfully!');
  },

  // Load tablet CSS modules (can be desktop + mobile, or custom)
  async loadTabletCSS() {
    console.log('📱 Loading Tablet CSS modules (currently using Desktop CSS)...');
    
    // For now, tablets use desktop CSS (can be customized later)
    await this.loadDesktopCSS();
    
    // Could add tablet-specific CSS here if needed
    // await this.loadCSS('src/game/rendering/responsive/tablet-modules/tablet-specific.css');
    console.log('✅ Tablet CSS modules loaded successfully!');
  },

  // Initialize CSS loading based on device detection
  async init() {
    const deviceType = DeviceDetection.detectDeviceType();
    console.log(`🎯 Device detected: ${deviceType}`);
    console.log(`📊 Screen: ${window.screen.width}x${window.screen.height}`);
    console.log(`👆 Touch: ${'ontouchstart' in window ? 'Yes' : 'No'}`);
    
    // Add device class to body for CSS targeting
    document.body.classList.add(deviceType);
    
    // Load device-specific CSS (which loads shared CSS internally)
    switch (deviceType) {
      case 'desktop':
        await this.loadDesktopCSS();
        break;
      case 'tablet':
        await this.loadTabletCSS();
        break;
      case 'mobile':
        await this.loadMobileCSS();
        break;
      default:
        console.warn(`⚠️ Unknown device type: ${deviceType}, defaulting to desktop`);
        await this.loadDesktopCSS();
    }
    
    // Wait a bit for stylesheets to cascade and be computed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mark as loaded and dispatch custom event to signal CSS is loaded
    this.isLoaded = true;
    window.CSSLoader = this; // Make it accessible globally for UI initialization check
    window.dispatchEvent(new CustomEvent('cssLoaded'));
    
    console.log('🎉 CSS loading complete!');
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CSSLoader.init().catch(err => {
    console.error('❌ CSS loading failed:', err);
  });
});

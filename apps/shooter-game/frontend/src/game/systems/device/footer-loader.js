// ==========================================
// FOOTER LOADER MODULE
// ==========================================
// Purpose: Conditionally load footer HTML only for desktop devices
// Dependencies: DeviceDetection
// Impact: Minimal - only affects footer DOM structure

/**
 * Footer Loader System
 * Dynamically loads footer HTML based on device type detection
 * Footer is NOT needed on mobile devices to save space and avoid layout issues
 */

const FooterLoader = {
  footerHTML: `
    <footer class="game-footer">
      <div class="controls">
        <span class="control-item">
          <span class="control-icon">🖱️</span>
          Mouse: Move Player
        </span>
        <span class="control-item">
          <span class="control-icon">⏸️</span>
          P: Pause/Resume
        </span>
        <span class="control-item consumable-footer-item" data-item-id="coinTractorBeam">
          <span class="control-icon">🧲</span>
          M: Coin Tractor Beam
        </span>
        <span class="control-item consumable-footer-item" data-item-id="slowTime">
          <span class="control-icon">⏱️</span>
          S: Slow Time
        </span>
        <span class="control-item consumable-footer-item" data-item-id="destroyAll">
          <span class="control-icon">💥</span>
          D: Destroy All
        </span>
        <span class="control-item consumable-footer-item" data-item-id="bossKillShot">
          <span class="control-icon">🎯</span>
          B: Boss Kill Shot
        </span>
      </div>
      <div class="version-info">
        Alpha Release • Build 2024.01 • Anti-Cheat Enabled • Secure Scoring
      </div>
    </footer>
  `,

  // Insert footer into game container
  insertFooter() {
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) {
      console.warn('⚠️ Game container not found, cannot insert footer');
      return false;
    }

    // Check if footer already exists
    const existingFooter = gameContainer.querySelector('.game-footer');
    if (existingFooter) {
      console.log('✅ Footer already exists');
      return true;
    }

    // Insert footer at the end of game-container
    gameContainer.insertAdjacentHTML('beforeend', this.footerHTML);
    console.log('✅ Footer inserted successfully');
    return true;
  },

  // Remove footer from DOM
  removeFooter() {
    const footer = document.querySelector('.game-footer');
    if (footer) {
      footer.remove();
      console.log('✅ Footer removed from DOM');
      return true;
    }
    console.log('ℹ️ Footer not found in DOM');
    return false;
  },

  // Initialize based on device type
  init() {
    const deviceType = DeviceDetection.detectDeviceType();
    console.log(`🎯 Footer loader for device: ${deviceType}`);

    // Only insert footer for desktop and tablet
    if (deviceType === 'desktop' || deviceType === 'tablet') {
      // Small delay to ensure DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.insertFooter();
        });
      } else {
        this.insertFooter();
      }
    } else {
      // Mobile - ensure footer is removed if it exists
      this.removeFooter();
    }
  },

  // Re-initialize when device changes
  handleDeviceChange() {
    const deviceType = DeviceDetection.detectDeviceType();
    console.log(`🔄 Footer loader handling device change: ${deviceType}`);

    if (deviceType === 'desktop' || deviceType === 'tablet') {
      // Desktop/Tablet - ensure footer exists
      this.insertFooter();
    } else {
      // Mobile - remove footer if it exists
      this.removeFooter();
    }
  }
};

// Auto-initialize
FooterLoader.init();

// Export for global access
window.FooterLoader = FooterLoader;

console.log('📦 Footer Loader module loaded');


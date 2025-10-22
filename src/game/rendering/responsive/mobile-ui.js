/**
 * Mobile UI System - Responsive UI Design
 * Provides different UI layouts for different screen sizes
 */

const MobileUI = {
  deviceType: 'desktop',
  isInitialized: false,
  currentLayout: 'desktop',
  
  // UI Layout Configurations
  layouts: {
    desktop: {
      header: {
        show: true,
        compact: false,
        stats: ['distance', 'coins', 'status']
      },
      gameStats: {
        show: true,
        position: 'overlay', // overlay, sidebar, bottom
        compact: false,
        stats: ['score', 'orbLevel', 'tier', 'bossesDefeated', 'forceFieldLevel', 'coinStreak']
      },
      footer: {
        show: true,
        compact: false,
        controls: ['mouse', 'pause', 'autofire']
      },
      menu: {
        buttonSize: 'large',
        layout: 'vertical'
      }
    },
    
    tablet: {
      header: {
        show: true,
        compact: true,
        stats: ['distance', 'coins'] // Remove status to save space
      },
      gameStats: {
        show: true,
        position: 'sidebar', // Move to sidebar
        compact: true,
        stats: ['score', 'orbLevel', 'tier', 'bossesDefeated'] // Fewer stats
      },
      footer: {
        show: true,
        compact: true,
        controls: ['mouse', 'pause'] // Remove autofire info
      },
      menu: {
        buttonSize: 'large',
        layout: 'vertical'
      }
    },
    
    mobile: {
      header: {
        show: true,
        compact: true,
        stats: ['distance'], // Only distance - removed status
        integratedStats: true // NEW: Integrate game stats into header
      },
      gameStats: {
        show: false, // Hide the separate stats panel on mobile
        position: 'none',
        compact: true,
        stats: []
      },
      footer: {
        show: false, // Hide footer on mobile to save space
        compact: true,
        controls: []
      },
      menu: {
        buttonSize: 'extra-large',
        layout: 'vertical'
      }
    }
  },

  initialize() {
    this.deviceType = DeviceDetection.detectDeviceType();
    this.currentLayout = this.getLayoutForDevice(this.deviceType);
    this.isInitialized = true;
    
    console.log(`📱 Mobile UI initialized for ${this.deviceType} (${this.currentLayout} layout)`);
    
    // Apply initial layout
    this.applyLayout(this.currentLayout);
    
    // Apply mobile menu optimizations
    this.applyMobileMenuOptimizations();
    
    // Listen for device changes
    this.setupDeviceChangeListener();
  },

  getLayoutForDevice(deviceType) {
    switch(deviceType) {
      case 'mobile': return 'mobile';
      case 'tablet': return 'tablet';
      default: return 'desktop';
    }
  },

  applyLayout(layoutName) {
    if (!this.layouts[layoutName]) {
      console.warn(`Layout ${layoutName} not found, using desktop`);
      layoutName = 'desktop';
    }
    
    const layout = this.layouts[layoutName];
    this.currentLayout = layoutName;
    
    // Apply header layout
    this.applyHeaderLayout(layout.header);
    
    // Apply game stats layout
    this.applyGameStatsLayout(layout.gameStats);
    
    // Apply footer layout
    this.applyFooterLayout(layout.footer);
    
    // Apply menu layout
    this.applyMenuLayout(layout.menu);
    
    console.log(`📱 Applied ${layoutName} UI layout`);
  },

  applyHeaderLayout(headerConfig) {
    const header = document.querySelector('.suitch-header');
    if (!header) return;
    
    if (!headerConfig.show) {
      header.style.display = 'none';
      return;
    }
    
    header.style.display = 'flex';
    
    // Apply compact styling
    if (headerConfig.compact) {
      header.classList.add('mobile-compact');
      header.style.padding = '10px 15px';
      header.style.fontSize = '12px';
    } else {
      header.classList.remove('mobile-compact');
      header.style.padding = '15px 25px';
      header.style.fontSize = '14px';
    }
    
    // Handle integrated stats for mobile
    if (headerConfig.integratedStats) {
      this.integrateGameStatsIntoHeader(header);
    } else {
      this.removeIntegratedStats(header);
    }
    
    // Show/hide stats based on config
    const stats = header.querySelectorAll('.stat');
    stats.forEach((stat, index) => {
      const statType = this.getStatType(stat);
      if (headerConfig.stats.includes(statType)) {
        stat.style.display = 'flex';
        
        // Condense distance stat on mobile
        if (statType === 'distance' && headerConfig.compact) {
          stat.classList.add('distance-stat');
          this.condenseDistanceStat(stat);
        } else {
          stat.classList.remove('distance-stat');
          this.expandDistanceStat(stat);
        }
      } else {
        stat.style.display = 'none';
        stat.classList.remove('distance-stat');
      }
    });
  },

  applyGameStatsLayout(gameStatsConfig) {
    const gameStatsPanel = document.querySelector('.game-stats-panel');
    if (!gameStatsPanel) return;
    
    if (!gameStatsConfig.show) {
      gameStatsPanel.style.display = 'none';
      return;
    }
    
    gameStatsPanel.style.display = 'block';
    
    // Apply position
    this.positionGameStatsPanel(gameStatsPanel, gameStatsConfig.position);
    
    // Apply compact styling
    if (gameStatsConfig.compact) {
      gameStatsPanel.classList.add('mobile-compact');
      gameStatsPanel.style.padding = '10px 15px';
      gameStatsPanel.style.minWidth = '150px';
    } else {
      gameStatsPanel.classList.remove('mobile-compact');
      gameStatsPanel.style.padding = '15px 20px';
      gameStatsPanel.style.minWidth = '200px';
    }
    
    // Show/hide stats based on config
    const statItems = gameStatsPanel.querySelectorAll('.stat-item');
    statItems.forEach((statItem, index) => {
      const statType = this.getGameStatType(statItem);
      if (gameStatsConfig.stats.includes(statType)) {
        statItem.style.display = 'flex';
      } else {
        statItem.style.display = 'none';
      }
    });
  },

  positionGameStatsPanel(panel, position) {
    // Reset positioning
    panel.style.position = 'absolute';
    panel.style.top = '20px';
    panel.style.left = '20px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
    
    switch(position) {
      case 'overlay':
        // Default position - overlay on top-left
        panel.style.top = '20px';
        panel.style.left = '20px';
        break;
        
      case 'sidebar':
        // Move to right side
        panel.style.top = '20px';
        panel.style.left = 'auto';
        panel.style.right = '20px';
        break;
        
      case 'bottom':
        // Move to bottom
        panel.style.top = 'auto';
        panel.style.left = '20px';
        panel.style.bottom = '20px';
        break;
    }
  },

  applyFooterLayout(footerConfig) {
    const footer = document.querySelector('.suitch-footer');
    if (!footer) return;
    
    if (!footerConfig.show) {
      footer.style.display = 'none';
      return;
    }
    
    footer.style.display = 'block';
    
    // Apply compact styling
    if (footerConfig.compact) {
      footer.classList.add('mobile-compact');
      footer.style.padding = '10px 15px';
      footer.style.fontSize = '12px';
    } else {
      footer.classList.remove('mobile-compact');
      footer.style.padding = '15px 25px';
      footer.style.fontSize = '14px';
    }
    
    // Show/hide controls based on config
    const controls = footer.querySelectorAll('.control-item');
    controls.forEach((control, index) => {
      const controlType = this.getControlType(control);
      if (footerConfig.controls.includes(controlType)) {
        control.style.display = 'flex';
      } else {
        control.style.display = 'none';
      }
    });
  },

  applyMenuLayout(menuConfig) {
    const menuButtons = document.querySelectorAll('.menu-btn');
    menuButtons.forEach(button => {
      // Apply button size
      button.classList.remove('mobile-compact', 'mobile-large', 'mobile-extra-large');
      
      switch(menuConfig.buttonSize) {
        case 'compact':
          button.classList.add('mobile-compact');
          break;
        case 'large':
          button.classList.add('mobile-large');
          break;
        case 'extra-large':
          button.classList.add('mobile-extra-large');
          break;
      }
    });
  },

  // NEW: Integrate game stats into header for mobile
  integrateGameStatsIntoHeader(header) {
    // Remove existing integrated stats if any
    this.removeIntegratedStats(header);
    
    // Create integrated stats container
    const integratedStats = document.createElement('div');
    integratedStats.className = 'integrated-game-stats';
    integratedStats.innerHTML = `
      <div class="integrated-stat">
        <span class="stat-icon">🎯</span>
        <span class="stat-value" id="integratedScore">0</span>
      </div>
      <div class="integrated-stat orb-stat">
        <img src="assets/Blue Orb Shot.webp" alt="Orb Level" class="orb-icon">
        <span class="stat-value" id="integratedOrbLevel">1</span>
      </div>
      <div class="integrated-stat">
        <span class="stat-icon">🏆</span>
        <span class="stat-value" id="integratedTier">1</span>
      </div>
      <div class="integrated-stat coin-stat">
        <img src="assets/SuiTwo_Coin.webp" alt="Coins" class="coin-icon">
        <span class="stat-value" id="integratedCoins">0</span>
      </div>
    `;
    
    // Insert after the title but before existing stats
    const title = header.querySelector('.title');
    if (title) {
      title.parentNode.insertBefore(integratedStats, title.nextSibling);
    }
    
    // Update the stats with current game values
    this.updateIntegratedStats();
  },

  removeIntegratedStats(header) {
    const existingIntegratedStats = header.querySelector('.integrated-game-stats');
    if (existingIntegratedStats) {
      existingIntegratedStats.remove();
    }
  },

  updateIntegratedStats() {
    // Update integrated stats with current game values
    const scoreElement = document.getElementById('integratedScore');
    const orbLevelElement = document.getElementById('integratedOrbLevel');
    const tierElement = document.getElementById('integratedTier');
    const coinsElement = document.getElementById('integratedCoins');
    
    if (scoreElement && typeof game !== 'undefined') {
      scoreElement.textContent = game.score || 0;
    }
    
    if (orbLevelElement && typeof game !== 'undefined') {
      orbLevelElement.textContent = game.orbLevel || 1;
    }
    
    if (tierElement && typeof game !== 'undefined') {
      tierElement.textContent = game.tier || 1;
    }
    
    if (coinsElement && typeof game !== 'undefined') {
      coinsElement.textContent = game.coins || 0;
    }
  },

  // NEW: Condense distance stat for mobile - hide label text, show only value
  condenseDistanceStat(statElement) {
    // Find the text node containing "Distance:" and hide it
    const walker = document.createTreeWalker(
      statElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
      if (textNode.textContent.trim().includes('Distance:')) {
        // Store original text for restoration
        statElement.dataset.originalText = textNode.textContent;
        
        // Replace with empty text
        textNode.textContent = '';
        break;
      }
    }
  },

  // NEW: Expand distance stat for desktop/tablet - restore label text
  expandDistanceStat(statElement) {
    if (statElement.dataset.originalText) {
      // Find the text node and restore original text
      const walker = document.createTreeWalker(
        statElement,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let textNode;
      while (textNode = walker.nextNode()) {
        if (textNode.textContent.trim() === '') {
          textNode.textContent = statElement.dataset.originalText;
          delete statElement.dataset.originalText;
          break;
        }
      }
    }
  },

  // NEW: Apply mobile menu optimizations
  applyMobileMenuOptimizations() {
    if (this.deviceType === 'mobile') {
      this.optimizeMenuButtons();
      this.optimizeMenuPanels();
      this.optimizeMenuNavigation();
      this.addMobileMenuGestures();
      this.optimizeMenuStateManagement();
    }
  },

  optimizeMenuButtons() {
    // Make menu buttons touch-friendly
    const menuButtons = document.querySelectorAll('.menu-btn, .enter-game-btn, .settings-btn, .instructions-btn, .leaderboard-btn, .sound-test-btn');
    menuButtons.forEach(button => {
      button.classList.add('mobile-touch-friendly');
      // Ensure minimum touch target size
      if (button.offsetHeight < 44) {
        button.style.minHeight = '44px';
      }
    });
  },

  optimizeMenuPanels() {
    // Optimize panel layouts for mobile
    const panels = document.querySelectorAll('.front-page-overlay, .main-menu-overlay, .settings-panel, .instructions-panel, .leaderboard-panel, .sound-test-panel');
    panels.forEach(panel => {
      panel.classList.add('mobile-optimized');
    });
  },

  optimizeMenuNavigation() {
    // Add mobile-specific navigation enhancements
    const backButtons = document.querySelectorAll('.settings-btn, .instructions-btn, .leaderboard-btn, .sound-test-btn');
    backButtons.forEach(button => {
      if (button.textContent.includes('Back') || button.textContent.includes('↩️')) {
        button.classList.add('mobile-back-button');
      }
    });
    
    // Optimize close buttons for mobile
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(button => {
      button.classList.add('mobile-close-btn');
      // Make close buttons larger and more touch-friendly
      button.style.minWidth = '44px';
      button.style.minHeight = '44px';
      button.style.fontSize = '1.5rem';
      button.style.borderRadius = '50%';
    });
  },

  addMobileMenuGestures() {
    // Add swipe gestures for menu navigation
    this.addSwipeGestures();
    this.addTouchFeedback();
  },

  addSwipeGestures() {
    // Add swipe-to-close functionality for panels
    const panels = document.querySelectorAll('.settings-panel, .instructions-panel, .leaderboard-panel, .sound-test-panel');
    
    panels.forEach(panel => {
      let startX = 0;
      let startY = 0;
      
      panel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      });
      
      panel.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Swipe left or up to close
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
          if (diffX > 0) { // Swipe left
            this.closeCurrentPanel();
          }
        } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 50) {
          if (diffY > 0) { // Swipe up
            this.closeCurrentPanel();
          }
        }
      });
    });
  },

  addTouchFeedback() {
    // Add visual feedback for touch interactions
    const menuButtons = document.querySelectorAll('.menu-btn, .enter-game-btn, .settings-btn, .instructions-btn, .leaderboard-btn, .sound-test-btn');
    
    menuButtons.forEach(button => {
      button.addEventListener('touchstart', () => {
        button.classList.add('mobile-touch-active');
      });
      
      button.addEventListener('touchend', () => {
        setTimeout(() => {
          button.classList.remove('mobile-touch-active');
        }, 150);
      });
    });
  },

  optimizeMenuStateManagement() {
    // Track menu state for mobile-specific behavior
    this.menuState = {
      currentPanel: null,
      isTransitioning: false,
      lastInteraction: Date.now()
    };
    
    // Add mobile-specific menu state tracking
    this.trackMenuInteractions();
  },

  trackMenuInteractions() {
    // Track menu interactions for mobile optimization
    const menuElements = document.querySelectorAll('.main-menu-overlay, .settings-panel, .instructions-panel, .leaderboard-panel, .sound-test-panel');
    
    menuElements.forEach(element => {
      element.addEventListener('touchstart', () => {
        this.menuState.lastInteraction = Date.now();
      });
    });
  },

  closeCurrentPanel() {
    // Close the currently open panel
    const openPanels = document.querySelectorAll('.settings-panel[style*="flex"], .instructions-panel[style*="flex"], .leaderboard-panel[style*="flex"], .sound-test-panel[style*="flex"]');
    
    openPanels.forEach(panel => {
      if (panel.style.display === 'flex') {
        // Call the appropriate hide function
        const panelId = panel.id;
        switch(panelId) {
          case 'settingsPanel':
            if (typeof hideSettings === 'function') hideSettings();
            break;
          case 'instructionsPanel':
            if (typeof hideInstructions === 'function') hideInstructions();
            break;
          case 'leaderboardPanel':
            if (typeof hideLeaderboard === 'function') hideLeaderboard();
            break;
          case 'soundTestPanel':
            if (typeof hideSoundTest === 'function') hideSoundTest();
            break;
        }
      }
    });
  },

  // Helper methods to identify stat/control types
  getStatType(statElement) {
    const text = statElement.textContent.toLowerCase();
    if (text.includes('distance')) return 'distance';
    if (text.includes('coins')) return 'coins';
    if (text.includes('status')) return 'status';
    return 'unknown';
  },

  getGameStatType(statElement) {
    const label = statElement.querySelector('.stat-label');
    if (!label) return 'unknown';
    
    const text = label.textContent.toLowerCase();
    if (text.includes('score')) return 'score';
    if (text.includes('magic orb level')) return 'orbLevel';
    if (text.includes('tier')) return 'tier';
    if (text.includes('bosses defeated')) return 'bossesDefeated';
    if (text.includes('force field')) return 'forceFieldLevel';
    if (text.includes('coin streak')) return 'coinStreak';
    return 'unknown';
  },

  getControlType(controlElement) {
    const text = controlElement.textContent.toLowerCase();
    if (text.includes('mouse')) return 'mouse';
    if (text.includes('pause')) return 'pause';
    if (text.includes('auto-fire')) return 'autofire';
    return 'unknown';
  },

  setupDeviceChangeListener() {
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleDeviceChange();
      }, 100);
    });
    
    // Listen for resize events
    window.addEventListener('resize', () => {
      this.handleDeviceChange();
    });
  },

  handleDeviceChange() {
    const newDeviceType = DeviceDetection.detectDeviceType();
    if (newDeviceType !== this.deviceType) {
      this.deviceType = newDeviceType;
      const newLayout = this.getLayoutForDevice(newDeviceType);
      this.applyLayout(newLayout);
      console.log(`📱 Device changed to ${newDeviceType}, applied ${newLayout} layout`);
    }
  },

  // Public API methods
  getCurrentLayout() {
    return this.currentLayout;
  },

  getLayoutConfig() {
    return this.layouts[this.currentLayout];
  },

  switchLayout(layoutName) {
    if (this.layouts[layoutName]) {
      this.applyLayout(layoutName);
    }
  },

  // Debug method
  getDebugInfo() {
    return {
      deviceType: this.deviceType,
      currentLayout: this.currentLayout,
      layoutConfig: this.layouts[this.currentLayout],
      isInitialized: this.isInitialized
    };
  }
};

console.log('📱 Mobile UI module loaded');
window.MobileUI = MobileUI;

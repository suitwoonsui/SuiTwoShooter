// ==========================================
// CONSUMABLE ITEMS SYSTEM
// ==========================================
// Manages consumable items that can be activated during gameplay
// Supports both keyboard shortcuts (desktop) and touch buttons (mobile)

const ConsumableSystem = {
  // Consumable item definitions
  items: {
    coinTractorBeam: {
      id: 'coinTractorBeam',
      name: 'Coin Tractor Beam',
      icon: '🧲',
      keyboardKey: 'M', // M for Magnet
      mobileButton: true,
      checkAvailable: function() {
        return game.coinTractorBeam && game.coinTractorBeam.usesRemaining > 0 && !game.coinTractorBeam.active;
      },
      activate: function() {
        if (typeof activateCoinTractorBeam === 'function') {
          activateCoinTractorBeam();
          // Consume item from inventory when activated
          this.consumeItem('coinTractorBeam', game.coinTractorBeam.level);
        }
      },
      consumeItem: function(itemId, level) {
        if (typeof removeItemFromInventory === 'function') {
          const walletAddress = typeof getWalletAddress === 'function' ? getWalletAddress() : null;
          removeItemFromInventory(itemId, level, 1, walletAddress);
          console.log(`✅ [CONSUMPTION] Consumed ${itemId} level ${level} when activated`);
        }
      }
    },
    slowTime: {
      id: 'slowTime',
      name: 'Slow Time',
      icon: '⏱️',
      keyboardKey: 'S', // S for Slow
      mobileButton: true,
      checkAvailable: function() {
        const available = game.slowTimePower && game.slowTimePower.usesRemaining > 0 && !game.slowTimePower.active;
        if (!available) {
          console.log('⏱️ [SLOW TIME] checkAvailable() returned false:', {
            exists: !!game.slowTimePower,
            usesRemaining: game.slowTimePower?.usesRemaining,
            active: game.slowTimePower?.active
          });
        }
        return available;
      },
      activate: function() {
        if (typeof activateSlowTime === 'function') {
          activateSlowTime();
          // Consume item from inventory when activated
          this.consumeItem('slowTime', game.slowTimePower.level);
        }
      },
      consumeItem: function(itemId, level) {
        if (typeof removeItemFromInventory === 'function') {
          const walletAddress = typeof getWalletAddress === 'function' ? getWalletAddress() : null;
          removeItemFromInventory(itemId, level, 1, walletAddress);
          console.log(`✅ [CONSUMPTION] Consumed ${itemId} level ${level} when activated`);
        }
      }
    },
    destroyAll: {
      id: 'destroyAll',
      name: 'Destroy All Enemies',
      icon: '💥',
      keyboardKey: 'D', // D for Destroy
      mobileButton: true,
      checkAvailable: function() {
        // Only available during regular levels (not during boss fights)
        return game.destroyAllPower && 
               game.destroyAllPower.usesRemaining > 0 && 
               !game.bossActive;
      },
      activate: function() {
        if (typeof activateDestroyAll === 'function') {
          activateDestroyAll();
          // Consume item from inventory when activated (single level item)
          this.consumeItem('destroyAll', 1);
        }
      },
      consumeItem: function(itemId, level) {
        if (typeof removeItemFromInventory === 'function') {
          const walletAddress = typeof getWalletAddress === 'function' ? getWalletAddress() : null;
          removeItemFromInventory(itemId, level, 1, walletAddress);
          console.log(`✅ [CONSUMPTION] Consumed ${itemId} level ${level} when activated`);
        }
      }
    },
    bossKillShot: {
      id: 'bossKillShot',
      name: 'Boss Kill Shot',
      icon: '🎯',
      keyboardKey: 'B', // B for Boss
      mobileButton: true,
      checkAvailable: function() {
        return game.bossKillShot && 
               game.bossKillShot.usesRemaining > 0 && 
               game.bossActive && 
               game.boss && 
               game.boss.vulnerable;
      },
      activate: function() {
        if (typeof activateBossKillShot === 'function') {
          activateBossKillShot();
          // Consume item from inventory when activated (single level item)
          this.consumeItem('bossKillShot', 1);
        }
      },
      consumeItem: function(itemId, level) {
        if (typeof removeItemFromInventory === 'function') {
          const walletAddress = typeof getWalletAddress === 'function' ? getWalletAddress() : null;
          removeItemFromInventory(itemId, level, 1, walletAddress);
          console.log(`✅ [CONSUMPTION] Consumed ${itemId} level ${level} when activated`);
        }
      }
    }
  },

  // Initialize consumable system
  initialize() {
    if (this._initialized) {
      console.log('🔧 [CONSUMABLES] Consumable system already initialized, skipping');
      return;
    }
    
    console.log('🔧 [CONSUMABLES] Initializing consumable system');
    
    // Don't initialize consumables here - wait for selectedItems to be set
    // They will be initialized in initializeConsumables() after item consumption
    
    // Setup keyboard shortcuts (desktop)
    this.setupKeyboardShortcuts();
    
    // Setup mobile footer buttons
    this.setupMobileFooter();
    
    this._initialized = true;
  },

  // Initialize consumable items from game.selectedItems
  initializeConsumables() {
    // Coin Tractor Beam
    if (game.selectedItems && game.selectedItems.coinTractorBeam) {
      const level = game.selectedItems.coinTractorBeam;
      const durations = { 1: 4, 2: 6, 3: 8 };
      const ranges = { 1: 0.3, 2: 0.6, 3: 0.9 };
      
      game.coinTractorBeam = {
        usesRemaining: 1,
        active: false,
        duration: durations[level],
        remainingTime: 0,
        level: level,
        range: ranges[level],
        pullSpeed: 10 // pixels per frame
      };
      console.log(`🧲 [CONSUMABLES] Coin Tractor Beam initialized - Level ${level}`);
    }

    // Slow Time Power
    if (game.selectedItems && game.selectedItems.slowTime) {
      const level = game.selectedItems.slowTime;
      const durations = { 1: 4, 2: 6, 3: 8 };
      
      game.slowTimePower = {
        usesRemaining: 1,
        active: false,
        duration: durations[level],
        remainingTime: 0,
        level: level,
        speedReduction: 0.5 // 50% reduction
      };
      console.log(`⏱️ [CONSUMABLES] Slow Time Power initialized - Level ${level}`);
    }

    // Destroy All Enemies
    if (game.selectedItems && game.selectedItems.destroyAll) {
      game.destroyAllPower = {
        usesRemaining: 1,
        active: false
      };
      console.log(`💥 [CONSUMABLES] Destroy All Enemies initialized`);
    }

    // Boss Kill Shot
    if (game.selectedItems && game.selectedItems.bossKillShot) {
      game.bossKillShot = {
        usesRemaining: 1,
        charging: false,
        chargeTime: 0,
        chargeDuration: 1.5 // 1.5 seconds charge time
      };
      console.log(`🎯 [CONSUMABLES] Boss Kill Shot initialized`);
    }
  },

  // Setup keyboard shortcuts for desktop
  setupKeyboardShortcuts() {
    // Only setup keyboard shortcuts if not on mobile
    if (typeof DeviceDetection !== 'undefined' && DeviceDetection.detectDeviceType() === 'mobile') {
      return; // Skip keyboard shortcuts on mobile
    }

    document.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Don't trigger if game is not running or is paused/over
      if (!game.gameRunning || game.paused || game.gameOver) {
        return;
      }

      // Check each consumable item
      Object.values(this.items).forEach(item => {
        if (e.key.toUpperCase() === item.keyboardKey) {
          e.preventDefault();
          console.log(`⌨️ [CONSUMABLES] Key ${item.keyboardKey} pressed for ${item.name}`);
          const isAvailable = item.checkAvailable();
          console.log(`⌨️ [CONSUMABLES] ${item.name} available:`, isAvailable);
          if (isAvailable) {
            console.log(`⌨️ [CONSUMABLES] Activating ${item.name}`);
            item.activate();
            this.updateButtonStates(); // Update UI immediately
          } else {
            console.log(`⌨️ [CONSUMABLES] ${item.name} not available - checkAvailable() returned false`);
            if (item.id === 'coinTractorBeam') {
              console.log(`⌨️ [CONSUMABLES] Debug coinTractorBeam:`, {
                exists: !!game.coinTractorBeam,
                usesRemaining: game.coinTractorBeam?.usesRemaining,
                active: game.coinTractorBeam?.active,
                level: game.coinTractorBeam?.level
              });
            }
            if (item.id === 'slowTime') {
              console.log(`⌨️ [CONSUMABLES] Debug slowTime:`, {
                exists: !!game.slowTimePower,
                usesRemaining: game.slowTimePower?.usesRemaining,
                active: game.slowTimePower?.active,
                level: game.slowTimePower?.level
              });
            }
            if (item.id === 'bossKillShot') {
              console.log(`⌨️ [CONSUMABLES] Debug bossKillShot:`, {
                exists: !!game.bossKillShot,
                usesRemaining: game.bossKillShot?.usesRemaining,
                charging: game.bossKillShot?.charging,
                bossActive: game.bossActive,
                boss: !!game.boss,
                bossVulnerable: game.boss?.vulnerable
              });
            }
          }
        }
      });
    });

    console.log('⌨️ [CONSUMABLES] Keyboard shortcuts initialized');
  },

  // Setup footer with buttons (mobile only - desktop uses game-footer)
  setupMobileFooter() {
    // Only create consumable footer on mobile devices
    // Desktop uses the game-footer with consumable items already included
    if (typeof DeviceDetection !== 'undefined' && DeviceDetection.detectDeviceType() === 'desktop') {
      console.log('📱 [CONSUMABLES] Skipping mobile footer on desktop (using game-footer instead)');
      return;
    }

    // Check if footer already exists
    let footer = document.getElementById('consumable-footer');
    if (!footer) {
      // Create footer element
      footer = document.createElement('div');
      footer.id = 'consumable-footer';
      footer.className = 'consumable-footer';
      
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'consumable-buttons';
      
      // Create buttons for each consumable item
      Object.values(this.items).forEach(item => {
        if (item.mobileButton) {
          const button = document.createElement('button');
          button.className = 'consumable-button';
          button.id = `consumable-btn-${item.id}`;
          button.setAttribute('data-item-id', item.id);
          // Add keyboard shortcut label for desktop
          const shortcutLabel = typeof DeviceDetection !== 'undefined' && DeviceDetection.detectDeviceType() !== 'mobile' 
            ? `<span class="keyboard-shortcut">${item.keyboardKey}</span>` 
            : '';
          button.innerHTML = `<span class="consumable-icon">${item.icon}</span>${shortcutLabel}`;
          button.title = `${item.name} (${item.keyboardKey})`;
          button.disabled = true; // Start disabled
          
          // Add click handler
          button.addEventListener('click', () => {
            if (item.checkAvailable() && game.gameRunning && !game.paused && !game.gameOver) {
              item.activate();
              this.updateButtonStates();
            }
          });
          
          buttonContainer.appendChild(button);
        }
      });
      
      footer.appendChild(buttonContainer);
      
      // Append to viewport container
      const viewportContainer = document.querySelector('.viewport-container');
      if (viewportContainer) {
        viewportContainer.appendChild(footer);
        console.log('📱 [CONSUMABLES] Mobile footer created');
      }
    }
  },

  // Update button states (available/unavailable)
  updateButtonStates() {
    Object.values(this.items).forEach(item => {
      // Update mobile/desktop consumable footer buttons
      if (item.mobileButton) {
        const button = document.getElementById(`consumable-btn-${item.id}`);
        if (button) {
          const available = item.checkAvailable() && game.gameRunning && !game.paused && !game.gameOver;
          button.disabled = !available;
          button.classList.toggle('available', available);
          button.classList.toggle('unavailable', !available);
        }
      }
      
      // Update desktop footer items (game-footer)
      const footerItem = document.querySelector(`.consumable-footer-item[data-item-id="${item.id}"]`);
      if (footerItem) {
        const available = item.checkAvailable() && game.gameRunning && !game.paused && !game.gameOver;
        footerItem.classList.toggle('available', available);
        footerItem.classList.toggle('unavailable', !available);
      }
    });
  },
  
  // Debug function to check boss kill shot state
  debugBossKillShot() {
    console.log('🎯 [DEBUG] Boss Kill Shot State:', {
      exists: !!game.bossKillShot,
      usesRemaining: game.bossKillShot?.usesRemaining,
      charging: game.bossKillShot?.charging,
      bossActive: game.bossActive,
      boss: !!game.boss,
      bossVulnerable: game.boss?.vulnerable,
      checkAvailable: this.items.bossKillShot.checkAvailable()
    });
  },

  // Start update loop for button states
  startUpdateLoop() {
    // Update button states every frame (will be called from game loop)
    // We'll call this from the main update function
  }
};

// Make globally accessible
if (typeof window !== 'undefined') {
  window.ConsumableSystem = ConsumableSystem;
}


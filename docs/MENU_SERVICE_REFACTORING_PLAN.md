# Menu Service Refactoring Plan

## Current State Analysis

### `menu-system.js` Statistics
- **Lines**: ~1,029
- **Functions**: 28+ functions
- **Responsibilities**:
  1. Menu visibility management (show/hide)
  2. Wallet connection/disconnection handlers
  3. Wallet UI updates
  4. Game lifecycle (start/stop)
  5. Panel management (settings, instructions)
  6. Game readiness checks
  7. Button enable/disable
  8. Stats updates
  9. Badge display loading

### Problems
1. **Too Many Responsibilities**: Menu system handles wallet, game lifecycle, UI updates
2. **Tight Coupling**: Directly manipulates DOM, calls multiple services
3. **Scattered Logic**: Menu visibility, wallet UI, game readiness all mixed together
4. **Hard to Test**: Functions depend on global state and DOM
5. **Difficult to Maintain**: Changes in one area affect others

## Proposed Architecture

### MenuService Structure

Following the pattern of `GameDataFlow` and `LoadingManager`:

```javascript
const MenuService = {
  // State
  _isVisible: false,
  _currentPanel: null, // 'settings' | 'instructions' | 'leaderboard' | 'store' | 'sound-test' | null
  
  // Dependencies (injected or accessed via window)
  _gameDataFlow: null,
  _gameState: null,
  
  /**
   * Initialize the menu service
   */
  init() {
    // Set up dependencies
    this._gameDataFlow = typeof GameDataFlow !== 'undefined' ? GameDataFlow : null;
    this._gameState = typeof uiGameState !== 'undefined' ? uiGameState : null;
    
    // Initialize menu state
    this.hide();
  },
  
  /**
   * Show the main menu
   */
  show() {
    if (this._isVisible) return;
    
    // Hide all panels first
    this.hideAllPanels();
    
    // Hide game container
    this._hideGameContainer();
    
    // Show menu overlay
    const mainMenu = document.getElementById('mainMenuOverlay');
    if (mainMenu) {
      mainMenu.classList.remove('main-menu-overlay-hidden');
      mainMenu.classList.add('main-menu-overlay-visible');
      this._isVisible = true;
    }
    
    // Update game state
    this._updateGameState({ isMenuVisible: true, isGameRunning: false });
    
    // Update stats (delegate to game-state-manager)
    if (typeof updateMenuStats === 'function') {
      updateMenuStats().catch(err => {
        console.warn('⚠️ [MENU] Failed to update menu stats:', err);
      });
    }
    
    // Close game (delegate to game system)
    if (typeof closeGame === 'function') {
      closeGame();
    }
    
    // Handle wallet state (delegate to GameDataFlow)
    if (this._gameDataFlow) {
      if (window.walletAPIInstance?.isConnected()) {
        const address = window.walletAPIInstance.getAddress();
        this._updateWalletUI(address);
        this._gameDataFlow.onReturnToMenu();
      } else {
        this._updateWalletUI(null);
        this._gameDataFlow.onWalletDisconnected();
      }
    }
  },
  
  /**
   * Hide the main menu
   */
  hide() {
    if (!this._isVisible) return;
    
    const mainMenu = document.getElementById('mainMenuOverlay');
    if (mainMenu) {
      mainMenu.classList.remove('main-menu-overlay-visible');
      mainMenu.classList.add('main-menu-overlay-hidden');
      this._isVisible = false;
    }
    
    this._updateGameState({ isMenuVisible: false });
  },
  
  /**
   * Show a panel (settings, instructions, etc.)
   */
  showPanel(panelName) {
    // Hide menu first
    this.hide();
    
    // Show the requested panel
    const panelMap = {
      'settings': 'settingsPanel',
      'instructions': 'instructionsPanel',
      'leaderboard': 'leaderboardModal',
      'store': 'storePanel',
      'sound-test': 'soundTestPanel'
    };
    
    const panelId = panelMap[panelName];
    if (!panelId) {
      console.warn(`⚠️ [MENU] Unknown panel: ${panelName}`);
      return;
    }
    
    const panel = document.getElementById(panelId);
    if (panel) {
      // Use appropriate visibility classes based on panel type
      if (panelName === 'leaderboard') {
        // Leaderboard creates its own modal, handled by leaderboard-system.js
        if (typeof showLeaderboard === 'function') {
          showLeaderboard();
        }
      } else if (panelName === 'store') {
        if (typeof showStore === 'function') {
          showStore();
        }
      } else if (panelName === 'sound-test') {
        if (typeof showSoundTest === 'function') {
          showSoundTest();
        }
      } else {
        // Settings and Instructions use standard panel classes
        panel.classList.remove(`${panelName}-panel-hidden`);
        panel.classList.add(`${panelName}-panel-visible`);
        this._currentPanel = panelName;
      }
    }
  },
  
  /**
   * Hide all panels
   */
  hideAllPanels() {
    const panels = [
      { id: 'settingsPanel', classes: ['settings-panel-visible', 'settings-panel-hidden'] },
      { id: 'instructionsPanel', classes: ['instructions-panel-visible', 'instructions-panel-hidden'] },
      { id: 'nameInputModal', classes: ['name-input-modal-visible', 'name-input-modal-hidden'] },
      { id: 'soundTestPanel', classes: ['sound-test-panel-visible', 'sound-test-panel-hidden'] }
    ];
    
    panels.forEach(({ id, classes }) => {
      const panel = document.getElementById(id);
      if (panel) {
        panel.classList.remove(classes[0]);
        panel.classList.add(classes[1]);
      }
    });
    
    this._currentPanel = null;
  },
  
  /**
   * Private: Update game state
   */
  _updateGameState(state) {
    if (this._gameState) {
      Object.assign(this._gameState, state);
    } else if (typeof gameState !== 'undefined') {
      Object.assign(gameState, state);
    }
  },
  
  /**
   * Private: Hide game container
   */
  _hideGameContainer() {
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.classList.remove('game-container-visible');
      gameContainer.classList.add('game-container-hidden');
    }
  },
  
  /**
   * Private: Update wallet UI (delegates to existing function)
   */
  _updateWalletUI(address) {
    if (typeof updateWalletUI === 'function') {
      updateWalletUI(address);
    }
  }
};
```

## Separation of Concerns

### MenuService Responsibilities
- ✅ Menu visibility (show/hide)
- ✅ Panel coordination (show/hide panels)
- ✅ Menu state management
- ✅ Delegating to other services

### Delegated Responsibilities
- ❌ Wallet connection → `WalletService` (to be created) or keep in menu-system.js
- ❌ Game lifecycle → `GameService` (to be created) or keep in menu-system.js
- ❌ Stats updates → `game-state-manager.js` (already exists)
- ❌ Badge display → `badge-ui.js` (already exists)
- ❌ Wallet UI updates → Keep in menu-system.js (wallet-specific UI)

## Migration Strategy

### Phase 1: Create MenuService (Non-Breaking)
1. Create `src/game/systems/ui/menu-service.js`
2. Implement basic show/hide functionality
3. Keep existing functions in `menu-system.js` as wrappers
4. Test that everything still works

### Phase 2: Move Panel Management
1. Move panel show/hide logic to MenuService
2. Update `showSettings()`, `showInstructions()` to use MenuService
3. Keep global function wrappers for HTML onclick handlers

### Phase 3: Extract Wallet Integration
1. Create `WalletService` for wallet connection/disconnection
2. MenuService delegates wallet operations to WalletService
3. Keep wallet UI updates in menu-system.js (or create WalletUIService)

### Phase 4: Extract Game Lifecycle
1. Create `GameService` for game start/stop
2. MenuService delegates game operations to GameService
3. Clean up menu-system.js

### Phase 5: Cleanup
1. Remove duplicate code
2. Update all references to use MenuService
3. Remove old functions from menu-system.js
4. Update documentation

## Benefits

1. **Single Responsibility**: MenuService only handles menu visibility and panel coordination
2. **Easier Testing**: Isolated service can be tested independently
3. **Better Maintainability**: Clear separation of concerns
4. **Reusability**: MenuService can be used from anywhere
5. **Consistency**: Follows same pattern as GameDataFlow, LoadingManager
6. **Flexibility**: Easy to add new panels or menu features

## File Structure

```
src/game/systems/ui/
├── menu-service.js          (NEW) - Menu visibility and panel coordination
├── menu-system.js            (REFACTORED) - Wallet UI, game readiness, button management
├── wallet-service.js         (FUTURE) - Wallet connection/disconnection
├── game-service.js           (FUTURE) - Game lifecycle management
├── game-data-flow.js         (EXISTS) - Data loading flow
├── game-data-state.js        (EXISTS) - Data state management
└── loading-manager.js        (EXISTS) - Loading modal management
```

## Backward Compatibility

- Keep global function wrappers (`window.showMainMenu`, `window.showSettings`, etc.)
- These will call MenuService internally
- No changes needed to HTML onclick handlers
- Gradual migration - old code continues to work


# Testing Checklist for MenuService and WalletService Refactoring

## ✅ Already Tested
- [x] Wallet login/logout
- [x] Badges display correctly
- [x] Loading screens work correctly
- [x] Leaderboards work

## Critical Tests Remaining

### 1. Menu Visibility and Navigation
- [ ] **Menu shows when clicking "Enter Game" from start screen**
  - Menu should appear with all buttons visible
  - No panels should be open initially
  
- [ ] **Menu hides when starting game**
  - Click "Start Game" button
  - Menu should disappear
  - Game container should become visible
  
- [ ] **Menu shows when returning from game**
  - Play a game (or exit early)
  - Return to menu
  - Menu should appear
  - Wallet should still be connected (if it was before)
  - Badge should still be displayed (if you had one)

### 2. Panel Management
- [ ] **Settings panel opens and closes**
  - Click "Settings" button
  - Settings panel should appear
  - Click close/X button
  - Panel should close and menu should reappear
  
- [ ] **How to Play panel opens and closes**
  - Click "How to Play" button
  - Instructions panel should appear
  - Click close/X button
  - Panel should close and menu should reappear
  
- [ ] **Sound Test panel opens and closes**
  - Click "Sound Test" button
  - Sound test panel should appear
  - Click close/X button
  - Panel should close and menu should reappear
  
- [ ] **Store opens and closes**
  - Click "Store" button
  - Store panel should appear
  - Close store
  - Menu should reappear

### 3. Wallet Integration (Beyond Login/Logout)
- [ ] **Balance displays correctly**
  - Connect wallet
  - Balance should appear below wallet address
  - Balance should show in green if ≥ 500K MEWS, red if < 500K MEWS
  
- [ ] **Start Game button state**
  - With wallet connected and balance ≥ 500K MEWS: Button should be **enabled**
  - With wallet connected but balance < 500K MEWS: Button should be **disabled**
  - Without wallet: Button should be **disabled**
  
- [ ] **Test Mode button state**
  - With wallet connected: Button should be **enabled** (bypasses balance check)
  - Without wallet: Button should be **disabled**
  
- [ ] **Wallet UI updates on disconnect**
  - Connect wallet
  - Click disconnect
  - Connect button should reappear
  - Balance should disappear
  - Badge should disappear
  - Start buttons should be disabled

### 4. Game Lifecycle
- [ ] **Start Game works**
  - Connect wallet with sufficient balance
  - Click "Start Game"
  - Game should initialize and start
  - Menu should hide
  
- [ ] **Test Mode works**
  - Connect wallet (balance doesn't matter)
  - Click "Start Game (Test Mode)"
  - Game should initialize and start
  - Menu should hide
  
- [ ] **Return to menu from game**
  - Start a game
  - Exit/end game
  - Menu should appear
  - Wallet should still be connected
  - Badge should reload/refresh (if you had one)
  - Stats should update

### 5. Badge Flows (If Applicable)
- [ ] **Badge migration (if you have old badge)**
  - Connect wallet that has old badge from previous contract
  - Migration modal should appear
  - Can click "Migrate Badge" or "Maybe Later"
  - If migrated, badge should appear in menu
  
- [ ] **Badge upgrade (if tier upgrade available)**
  - Connect wallet with badge that qualifies for tier upgrade
  - Upgrade modal should appear
  - Can upgrade or dismiss
  - Badge should update after upgrade

### 6. Menu Stats
- [ ] **Stats update when wallet connects**
  - Connect wallet
  - "Best Score" and "Games Played" should update from blockchain
  
- [ ] **Stats clear when wallet disconnects**
  - Connect wallet (stats show)
  - Disconnect wallet
  - Stats should show "--" or "0"

### 7. Edge Cases
- [ ] **Rapid connect/disconnect**
  - Quickly connect and disconnect wallet multiple times
  - UI should update correctly each time
  - No errors in console
  
- [ ] **Open panel, then start game**
  - Open Settings panel
  - Click "Start Game" (if enabled)
  - Panel should close, game should start
  
- [ ] **Multiple panel opens**
  - Open Settings
  - Close Settings
  - Open How to Play
  - Each panel should open/close independently

### 8. Console Verification
- [ ] **Check for service usage logs**
  - Open browser console
  - Look for: `✅ [MENU SERVICE]` and `✅ [WALLET SERVICE]` logs
  - Should see "USING NEW MENU SERVICE" and "USING NEW WALLET SERVICE" messages
  - Should NOT see "FALLBACK MODE" warnings (unless service fails to load)

- [ ] **Debug functions work**
  - In console, type: `checkMenuService()`
  - Should show MenuService status
  - In console, type: `checkWalletService()`
  - Should show WalletService status

## Quick Test Script

If you want to quickly verify the services are working:

```javascript
// In browser console:
// 1. Check MenuService
checkMenuService()

// 2. Check WalletService
checkWalletService()

// 3. Check if services are being used (look for these in console):
// ✅ [MENU SERVICE] ========== USING NEW MENU SERVICE ==========
// ✅ [WALLET SERVICE] ========== USING NEW WALLET SERVICE ==========
```

## Priority Tests

**High Priority** (Core functionality):
1. Menu show/hide
2. Start Game button enabling/disabling
3. Game start and return to menu
4. Panel open/close

**Medium Priority** (Integration):
5. Wallet UI updates
6. Balance display
7. Badge display on menu return
8. Stats updates

**Low Priority** (Edge cases):
9. Badge migration/upgrade flows
10. Rapid connect/disconnect
11. Multiple panel interactions

## What to Report

If you find any issues, please note:
- **What you were doing** (e.g., "Clicking Start Game button")
- **What happened** (e.g., "Button didn't enable even with sufficient balance")
- **What you expected** (e.g., "Button should be enabled")
- **Console errors** (if any)
- **Service logs** (whether you see "USING NEW SERVICE" or "FALLBACK MODE")


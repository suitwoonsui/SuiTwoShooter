# Testing Checklist - Post-Refactoring

## ✅ Main Menu Loaded Successfully
You've confirmed the main menu is loading. Now test these features:

---

## 🔌 Core Functionality

### 1. Wallet Connection
- [ ] **Connect Wallet Button** - Click and verify wallet extension opens
- [ ] **Wallet Connected State** - After connecting, verify:
  - [ ] Wallet address displays in UI
  - [ ] Token balances load (MEWS, SUI, USDC)
  - [ ] "Start Game" button becomes enabled
- [ ] **Disconnect Wallet** - Verify wallet disconnects cleanly
- [ ] **Reconnect** - Verify reconnection works

### 2. Configuration Loading
- [ ] **Browser Console** - Check for these logs:
  - [ ] `🔧 [BASE CONFIG] API Base URL: http://localhost:3000/api`
  - [ ] `🔧 [BASE CONFIG] Wallet Module URL: ...`
  - [ ] `🔧 [BASE CONTRACT CONFIG] Initialized`
  - [ ] `🔧 [GAME CONTRACT CONFIG] Merged with base config`
- [ ] **No 404 Errors** - Verify no 404s for:
  - [ ] Config files (`api-config.js`, `contract-config.js`)
  - [ ] Assets (images, sounds)
  - [ ] Wallet module

---

## 🎮 Menu Features

### 3. Start Game
- [ ] **Start Game Button** - Click and verify:
  - [ ] Game canvas loads
  - [ ] Game starts (enemies appear, player can move)
  - [ ] Controls work (arrow keys/WASD)
  - [ ] Shooting works (spacebar)
- [ ] **Test Mode Button** - Click and verify:
  - [ ] Game starts without wallet requirement
  - [ ] Gameplay works normally

### 4. Settings Panel
- [ ] **Open Settings** - Click "Settings" button
- [ ] **Settings Load** - Verify settings panel appears
- [ ] **Settings Options** - Test any available settings (volume, etc.)

### 5. How to Play
- [ ] **Open Instructions** - Click "How to Play" button
- [ ] **Content Loads** - Verify instructions display correctly
- [ ] **Close Instructions** - Verify you can return to menu

### 6. Leaderboard
- [ ] **Open Leaderboard** - Click "Leaderboard" button
- [ ] **Data Loads** - Verify leaderboard data appears (may be empty)
- [ ] **API Call** - Check Network tab for `/api/leaderboard` call
- [ ] **No Errors** - Verify no console errors

### 7. Tournaments
- [ ] **Open Tournaments** - Click "Tournaments" button
- [ ] **Tournament List** - Verify tournaments load (may be empty)
- [ ] **API Call** - Check Network tab for `/api/tournaments` call
- [ ] **No Errors** - Verify no console errors

### 8. Store & Inventory
- [ ] **Open Store** - Click "Store & Inventory" button
- [ ] **Store Loads** - Verify store modal appears
- [ ] **Items Display** - Verify store items load (if any)
- [ ] **API Call** - Check Network tab for `/api/store/items` call
- [ ] **Inventory Tab** - Switch to inventory and verify it loads
- [ ] **No Errors** - Verify no console errors

### 9. Sound Test
- [ ] **Open Sound Test** - Click "Sound Test" button
- [ ] **Sounds Play** - Test playing sounds
- [ ] **No Errors** - Verify no console errors

---

## 🎯 Gameplay Testing

### 10. Full Game Flow
- [ ] **Start Game** - Start a game session
- [ ] **Play Game** - Play for at least 30 seconds
- [ ] **Score Accumulation** - Verify score increases
- [ ] **Game Over** - Let game end (or die)
- [ ] **Score Submission** - Verify:
  - [ ] Score submission prompt appears
  - [ ] API call to `/api/scores/submit` succeeds
  - [ ] Success message displays
- [ ] **Return to Menu** - Verify return to main menu works

### 11. Achievement System
- [ ] **Achievement Check** - After submitting score, verify:
  - [ ] API call to `/api/achievements/check` succeeds
  - [ ] Any achievements earned are displayed
  - [ ] Achievement badges appear (if applicable)

---

## 🔍 API Integration

### 12. Backend Connectivity
- [ ] **Health Check** - Verify backend is running:
  - [ ] Open `http://localhost:3000/api/health` in browser
  - [ ] Should return `{"status":"ok"}`
- [ ] **API Calls** - Check Network tab for successful API calls:
  - [ ] `/api/health` - Health check
  - [ ] `/api/tokens/balance/[address]` - Token balance
  - [ ] `/api/leaderboard` - Leaderboard data
  - [ ] `/api/tournaments` - Tournament data
  - [ ] `/api/store/items` - Store items
  - [ ] `/api/scores/submit` - Score submission
  - [ ] `/api/achievements/check` - Achievement check

### 13. Error Handling
- [ ] **Backend Down** - Stop backend and verify:
  - [ ] Frontend handles errors gracefully
  - [ ] Error messages display (not crashes)
  - [ ] Game can still run in test mode

---

## 🎨 UI/UX Testing

### 14. Visual Elements
- [ ] **Images Load** - Verify all images display:
  - [ ] SuiTwo_Profile.webp (logo)
  - [ ] Game background
  - [ ] Menu buttons render correctly
- [ ] **CSS Loads** - Verify styling is correct:
  - [ ] Menu is styled properly
  - [ ] Buttons are clickable and styled
  - [ ] Responsive layout works

### 15. Responsive Design
- [ ] **Desktop** - Verify layout on desktop
- [ ] **Mobile** - If testing on mobile, verify:
  - [ ] Landscape orientation enforcement
  - [ ] Touch controls work
  - [ ] UI scales correctly

---

## 🐛 Console Checks

### 16. Browser Console
- [ ] **No Critical Errors** - Check for:
  - [ ] No `Uncaught SyntaxError`
  - [ ] No `Failed to load resource: 404`
  - [ ] No `TypeError` or `ReferenceError`
- [ ] **Expected Logs** - Verify these appear:
  - [ ] `[UI INIT]` logs
  - [ ] `[MENU SERVICE]` logs
  - [ ] `[WALLET SERVICE]` logs
  - [ ] `✅ Wallet bundle loaded`
  - [ ] Config initialization logs

### 17. Network Tab
- [ ] **All Requests Succeed** - Check Network tab:
  - [ ] Status codes are 200 (or 304 for cached)
  - [ ] No failed requests (red)
  - [ ] Config files load successfully
  - [ ] Assets load successfully

---

## 📊 Performance

### 18. Load Times
- [ ] **Initial Load** - Menu appears within 2-3 seconds
- [ ] **Script Loading** - No long delays when clicking buttons
- [ ] **Asset Loading** - Images load reasonably fast

---

## ✅ Success Criteria

**All Critical Tests Pass:**
- ✅ Main menu loads
- ✅ Wallet connects
- ✅ Game starts and plays
- ✅ Score submission works
- ✅ No console errors
- ✅ All API calls succeed
- ✅ All assets load

**If all critical tests pass, the refactoring is successful!** 🎉

---

## 🐛 If Issues Found

1. **Check Browser Console** - Look for error messages
2. **Check Network Tab** - See which requests are failing
3. **Check Server Console** - Look for 404 errors or path issues
4. **Review TROUBLESHOOTING.md** - Common issues and fixes
5. **Review SERVER_FIXES.md** - Recent fixes applied

---

**Last Updated:** 2025-01-04

# Phase 2: Game Loop Testing Checklist

## Quick Test (5 minutes)
**Just play the game and verify:**
- ✅ Game starts when you click "Start Game"
- ✅ Game runs smoothly (no freezing, no black screen)
- ✅ Game ends when you die
- ✅ You can return to main menu after game over

If all of the above work, **Phase 2 is working correctly!** ✅

---

## Comprehensive Test (15 minutes)

### 1. Game Start
- [ ] Click "Start Game" button
- [ ] Game canvas appears and game starts immediately
- [ ] No console errors about GameLoop
- [ ] Check browser console for: `✅ [GAME LOOP] GameLoop initialized in init()`
- [ ] Check browser console for: `🟢 [GAME LOOP] Starting game loop`

### 2. Game Running
- [ ] Game runs smoothly (60 FPS ideally)
- [ ] Check browser console for FPS logs: `🎯 [DEBUG] FPS≈` (should appear every second)
- [ ] Player can move and shoot
- [ ] Enemies spawn and move
- [ ] No performance issues or lag

### 3. Menu Visibility (Pause)
- [ ] While game is running, open Settings panel
- [ ] Check browser console for: `⏸️ Game loop paused - menu visible`
- [ ] Game should stop updating (enemies freeze)
- [ ] Close Settings panel
- [ ] Game should resume (enemies move again)
- [ ] Check browser console for: `🟢 [GAME LOOP] Starting game loop`

### 4. Game Over
- [ ] Let player die (or intentionally lose)
- [ ] Game over screen appears
- [ ] Game loop should continue running (to render game over screen)
- [ ] Check browser console - loop should still be active
- [ ] Submit score or skip
- [ ] Return to main menu
- [ ] Check browser console for: `🔴 [GAME LOOP] Stopped game loop`

### 5. Multiple Game Sessions
- [ ] Start a new game
- [ ] Play for a few seconds
- [ ] Return to menu
- [ ] Start another game
- [ ] Verify no console errors about duplicate RAF IDs
- [ ] Verify game loop starts cleanly each time

### 6. Console Checks
Open browser console (F12) and verify:
- [ ] No errors about `GameLoop not initialized`
- [ ] No errors about `gameLoop() called directly`
- [ ] FPS logs appear regularly: `🎯 [DEBUG] FPS≈`
- [ ] Loop entry logs appear: `🧪 [DEBUG] gameLoop entry count:`
- [ ] No warnings about RAF ID conflicts

---

## What to Look For

### ✅ Success Indicators
- Game starts and runs smoothly
- FPS tracking works (console logs every second)
- Menu visibility properly pauses/resumes loop
- Game over screen renders correctly
- No console errors

### ❌ Failure Indicators
- Game doesn't start (black screen)
- Game freezes or stutters
- Console errors about GameLoop
- Game loop doesn't stop when menu is visible
- Game over screen doesn't appear
- Multiple RAF IDs causing conflicts

---

## Quick Test Script

If you want to verify in console:

```javascript
// Check if GameLoop is loaded
typeof GameLoop !== 'undefined'  // Should be 'function'

// Check if game loop instance exists
typeof getGameLoop === 'function'  // Should be 'function'

// Get loop state (while game is running)
const loop = getGameLoop();
if (loop) {
  console.log('Loop state:', loop.getState());
  // Should show: { isRunning: true, rafId: <number>, frameCount: <number>, loopEntries: <number> }
}
```

---

## Expected Console Output

When game starts, you should see:
```
✅ [GAME LOOP] GameLoop module loaded
✅ [GAME LOOP] GameLoop module ready
✅ [GAME LOOP] GameLoop initialized in init()
🟢 [GAME LOOP] Starting game loop
🧪 [DEBUG] gameLoop entry count: 1 ...
🎯 [DEBUG] FPS≈ 60 | speed: 2.5 ...
```

When menu becomes visible:
```
⏸️ Game loop paused - menu visible
```

When game ends:
```
🔴 [GAME LOOP] Stopped game loop
```

---

## If Something Goes Wrong

### Game doesn't start
- Check console for errors
- Verify `game-loop.js` is loaded (check Network tab)
- Verify `init()` is being called

### Game freezes
- Check console for RAF ID conflicts
- Verify GameLoop instance is created
- Check if loop is being stopped unexpectedly

### Performance issues
- Check FPS logs - should be ~60 FPS
- Check for multiple game loops running
- Verify RAF IDs are being cleaned up

---

## Report Results

After testing, note:
- ✅ All tests passed
- ⚠️ Minor issues (describe)
- ❌ Major issues (describe)

**If all quick tests pass, Phase 2 is ready!** 🎉


# Insomnia Game - Testing Guide

## Quick Test Checklist

### 1. Basic Functionality ✅
- [ ] Game loads without errors
- [ ] "Start Game" button is visible and clickable
- [ ] Grid displays as 5x5 gray squares
- [ ] No console errors in browser dev tools

### 2. Wallet Connection ✅ NEW
- [ ] "Connect Sui Wallet" button is visible
- [ ] Click "Connect Sui Wallet" button
- [ ] Wallet connection dialog opens
- [ ] Select and approve wallet connection
- [ ] Wallet address is displayed (shortened format)
- [ ] SUI balance is displayed
- [ ] Network information is shown (Testnet/Mainnet)
- [ ] "Disconnect" button appears when connected

### 3. Game Setup Phase ✅
- [ ] Click "Start Game" button
- [ ] First block appears within 1 second
- [ ] Block has pulsing animation and white dot
- [ ] Block appears in random grid location
- [ ] **NEW**: First block stays visible indefinitely (no timeout)
- [ ] Console shows "First block spawned - NO timeout set, waiting for user click, game started: false"

### 4. Safe Exploration Phase ✅
- [ ] **NEW**: Click wrong tiles before game starts
- [ ] **NEW**: Wrong clicks are ignored (no game over)
- [ ] **NEW**: Console shows "Wrong click before game started - ignoring"
- [ ] First block remains visible and clickable

### 5. Game Start Phase ✅
- [ ] Click on the first block
- [ ] **NEW**: This officially starts the game
- [ ] Block disappears immediately
- [ ] Score increases from 0 to 1
- [ ] Green flash effect appears briefly
- [ ] Sound effect plays
- [ ] Console shows "First block clicked - starting game timer"
- [ ] Timer starts counting (was showing --:-- before)
- [ ] Console shows "Game started: true"

### 6. Active Gameplay Phase ✅
- [ ] New block spawns after 0.5 second delay
- [ ] **NEW**: Subsequent blocks now have timeouts and disappear if not clicked
- [ ] Console shows "Setting timeout for block: 1000 ms, game started: true"
- [ ] Score continues to increase with each click
- [ ] Time counter shows elapsed time (starts from 0:00)
- [ ] Speed level indicator shows current difficulty

### 7. Progressive Difficulty ✅
- [ ] First 30 seconds: 1 second block visibility
- [ ] After 30 seconds: 0.8 second visibility
- [ ] After 60 seconds: 0.6 second visibility
- [ ] After 90 seconds: 0.4 second visibility
- [ ] After 120 seconds: 0.3 second visibility

### 8. Game Over Conditions ✅
- [ ] **NEW**: Let a block time out (don't click it)
- [ ] Game ends automatically with reason "block_timeout"
- [ ] **NEW**: Click wrong tile after game has started
- [ ] Game ends with reason "wrong_click"
- [ ] Final score is displayed
- [ ] "Play Again" button appears

### 9. Game Over Screen ✅
- [ ] **NEW**: "Game Over!" message displayed
- [ ] **NEW**: Final score shown prominently
- [ ] **NEW**: Time survived displayed
- [ ] **NEW**: "Play Again" button functional
- [ ] Clicking "Play Again" starts fresh game

### 10. Restart Functionality ✅
- [ ] Click "Play Again" button
- [ ] **NEW**: All game state is properly reset
- [ ] **NEW**: First block appears with NO timeout again
- [ ] **NEW**: Wrong clicks before game start are ignored again
- [ ] Game flow repeats correctly

### 11. Visual Feedback ✅
- [ ] Active blocks: Theme-colored with pulsing animation
- [ ] Clicked blocks: Green flash effect
- [ ] Hover effects on grid cells
- [ ] Smooth transitions and animations

### 12. Audio System ✅
- [ ] Sound effects play on successful clicks
- [ ] Different sounds play randomly
- [ ] No audio errors in console

### 13. Mobile Responsiveness ✅
- [ ] Game works on mobile devices
- [ ] Touch input is responsive
- [ ] Grid size adapts to screen
- [ ] Buttons are touch-friendly

### 14. Wallet Integration ✅ NEW
- [ ] Wallet connection persists across game sessions
- [ ] Balance updates correctly after transactions
- [ ] Network switching works properly
- [ ] Disconnect/reconnect functionality works
- [ ] Multiple wallet accounts supported

## Console Debugging

Open browser dev tools (F12) and check the Console tab for these messages:

### Expected Messages (Wallet Connection):
```
🚀 Sui DApp Kit Providers initialized
📱 Wallet Provider ready
🎨 Theme Provider ready
🔍 WalletContext Debug: {wallets: Array(1), walletsLength: 1, ...}
🔍 Wallet State Debug: {wallets: Array(1), walletsLength: 1, ...}
```

### Expected Messages (Game Setup):
```
Start Game button clicked
Game state set, spawning first block in 1 second...
Timeout finished, calling spawnBlock...
spawnBlock called with: {gameActive: true, timeElapsed: 0, score: 0}
First block spawned - NO timeout set, waiting for user click, game started: false
```

### Expected Messages (Wrong Clicks Before Game Start):
```
Wrong click before game started - ignoring, clicked at: {x: X, y: Y}, but block was at: {x: X, y: Y}
```

### Expected Messages (Game Start):
```
Block clicked: {x: X, y: Y, currentBlock: {...}}
First block clicked - starting game timer
Successful click! Score: 1
Scheduling next block spawn, current score will be: 1
```

### Expected Messages (Subsequent Blocks):
```
spawnBlock called with: {gameActive: true, timeElapsed: 16, score: 1}
Setting timeout for block: 1000 ms, game started: true
```

### Expected Messages (Game Over):
```
Game ending with reason: block_timeout, final score: X
```
or
```
Game ending with reason: wrong_click, final score: X
```

### Error Messages to Watch For:
- Audio context errors
- React state update errors
- Timer/interval errors
- Wallet connection errors

## Performance Testing

### Frame Rate Check:
1. Open Dev Tools → Performance tab
2. Start recording
3. Play game for 10-15 seconds
4. Stop recording
5. Check for consistent 60 FPS

### Memory Usage:
1. Open Dev Tools → Memory tab
2. Take heap snapshot before game
3. Play game for 1-2 minutes
4. Take another snapshot
5. Check for memory leaks

## Known Issues & Workarounds

### Issue: Blocks not spawning
**Solution**: Check console for errors, ensure game is active

### Issue: Clicks not registering
**Solution**: Verify block is visible, check click coordinates

### Issue: Audio not working
**Solution**: Click somewhere on page first (browser audio policy)

### Issue: Game freezes
**Solution**: Refresh page, check for infinite loops in console

### Issue: Wallet not connecting
**Solution**: Ensure wallet extension is installed and unlocked, check network settings

### Issue: Balance not displaying
**Solution**: Verify wallet is connected to correct network (Testnet/Mainnet)

## Test Scenarios

### Scenario 1: New Player Experience
- Connect wallet and verify connection
- Start game and explore wrong tiles before clicking first block
- Verify wrong clicks are ignored
- Click first block to start game
- Verify subsequent wrong clicks end the game

### Scenario 2: Speed Run
- Start game and click as fast as possible
- Verify score increases correctly
- Check that speed progression works

### Scenario 3: Endurance Test
- Play for 2+ minutes
- Verify difficulty increases every 30 seconds
- Check performance remains stable

### Scenario 4: Restart Test
- Play game until game over
- Click "Play Again"
- Verify all state is reset correctly
- Verify first block has no timeout again

### Scenario 5: Mobile Test
- Test on mobile device or browser dev tools mobile mode
- Verify touch input works
- Check responsive design
- Test wallet connection on mobile

### Scenario 6: Wallet Integration Test
- Connect wallet and verify all information displays
- Disconnect and reconnect wallet
- Switch between different wallet accounts
- Test network switching
- Verify balance updates

### Scenario 7: Theme System Test
- Switch between all 4 themes
- Verify theme changes persist across game sessions
- Check theme-specific colors and animations
- Test theme switching during gameplay

## Success Criteria

The game is working correctly when:
- ✅ Wallet connects successfully and displays information
- ✅ First block spawns with no timeout
- ✅ Wrong clicks before game start are ignored
- ✅ Clicking first block starts the game
- ✅ Subsequent blocks have timeouts
- ✅ Wrong clicks after game start end the game
- ✅ Game over screen displays correctly
- ✅ Restart functionality works properly
- ✅ Performance is smooth (60 FPS)
- ✅ No console errors during gameplay
- ✅ All themes work correctly
- ✅ Audio system functions properly
- ✅ Mobile responsiveness is maintained

## Next Testing Phase

Once basic functionality is verified:
1. Test edge cases (rapid clicking, multiple clicks)
2. Performance testing on various devices
3. User experience testing with real players
4. **Web3 integration testing** ✅ (completed)
5. **Wallet compatibility testing** ✅ (completed)
6. Challenge system testing (when implemented)
7. Blockchain feature testing (when implemented)

## Wallet Testing Checklist

### Connection Testing:
- [ ] SlushWallet connects successfully
- [ ] Sui Wallet connects successfully
- [ ] Other Sui wallets connect successfully
- [ ] Connection persists across page refreshes
- [ ] Disconnect functionality works properly

### Information Display:
- [ ] Wallet address displays correctly (shortened format)
- [ ] SUI balance shows accurate amount
- [ ] Network information is correct
- [ ] Account switching works (if multiple accounts)

### Error Handling:
- [ ] Graceful handling of connection failures
- [ ] Clear error messages for users
- [ ] Fallback behavior when wallet unavailable
- [ ] Network switching error handling

### Performance:
- [ ] Wallet connection is fast (<2 seconds)
- [ ] Balance updates are responsive
- [ ] No performance impact on game mechanics
- [ ] Smooth transitions between wallet states

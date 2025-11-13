ui-initialization.js:13 🎯 [CLICK TRACKING] Global click detected: {tag: 'BUTTON', id: 'confirmConsumptionBtn', class: 'menu-btn primary', onclick: 'confirmItemConsumption()', textContent: '▶️ Start Game', …}
ui-initialization.js:26 🎯 [CLICK TRACKING] Name input modal check: {modalExists: true, isInside: false, modalVisible: false, modalHidden: true}
ui-initialization.js:49 🎯 [CLICK TRACKING] Click is OUTSIDE name input modal
ui-initialization.js:59 🎯 [CLICK TRACKING] Event path: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
item-consumption.js:239 ✅ [CONSUMPTION] Confirming item consumption
item-consumption.js:240 Selected items: {extraLives: null, forceField: null, orbLevel: null, slowTime: null, destroyAll: false, …}
item-consumption.js:284 💾 [CONSUMPTION] Checked out items for game (not consumed yet): {coinTractorBeam: 3}
consumable-system.js:150 🧲 [CONSUMABLES] Coin Tractor Beam initialized - Level 3
menu-system.js:455 ✅ Item consumption confirmed: {coinTractorBeam: 3}
menu-system.js:460 🎯 Calling initializeGame()
main.js:1314 🎮 Initializing game...
main.js:1134 🎯 Canvas found: YES <canvas id=​"gameCanvas" width=​"800" height=​"480">​
main.js:1135 🧪 [DEBUG] init() starting. Current speeds -> speed: 2.5 baseSpeed: 2.5 inc: 0.01 max: 6
main.js:1143 🎨 Canvas context created: YES
main.js:1144 📏 Canvas element dimensions: 800 x 480
main.js:1145 📏 Canvas computed size: 0 x 0
main.js:1151 📐 Using original game dimensions: 800 x 480
canvas-manager.js:46 📐 Responsive Canvas Manager initialized
main.js:1160 📐 Responsive Canvas system initialized
game-security.js:271 ✓ Security system initialized
game-security.js:271 👆 Using enhanced touch input system
game-security.js:271 Game initialized and starting game loop
game-security.js:271 🧪 [DEBUG] gameLoop entry count: 1 RAF id: undefined speed: 2.5
game-security.js:271 🔧 [CONSUMABLES] Initializing consumable system
game-security.js:271 ⌨️ [CONSUMABLES] Keyboard shortcuts initialized
game-security.js:271 📱 [CONSUMABLES] Skipping mobile footer on desktop (using game-footer instead)
game-security.js:271 🔧 [CONSUMABLES] Consumable system initialized
game-security.js:271 🎯 [DEBUG] FPS≈ 1 | speed: 2.51 base: 2.5 inc: 0.01 max: 6
game-security.js:271 ✅ GameState updated: {isMenuVisible: false, isGameRunning: true}
game-security.js:271 👁️ Main menu hidden
game-security.js:271 👁️ Game container shown
game-security.js:271 📐 Game container computed style: {display: 'flex', width: '1320px', height: '945px', visible: true, hidden: false}
game-security.js:271 📐 Canvas resized for current screen size
game-security.js:271 🔄 Calling restart()
game-security.js:271 🔄 Game restarting - starting new game
game-security.js:271 🧪 [DEBUG] restart() called. baseSpeed: 2.5 speedIncrement: 0.01 maxSpeed: 6
game-security.js:271 📊 Game state before restart: {gameRunning: true, gameOver: false, paused: false, hasCanvas: true, hasCtx: true}
game-security.js:271 🆔 [SESSION] Generated session ID: a137fb54-4cf4-438a-ab22-0f7b0b4b0455
game-security.js:271 🔄 [SECURITY] Resetting secureGame for new game
game-security.js:271 ✅ [SECURITY] secureGame reset complete
game-security.js:271 ✓ Security system reset for new game
game-security.js:271 🔮 [ORB LEVEL] Power-up cap set to Level 3 (starting at 1)
game-security.js:271 ✅ Game restarted. State: {gameRunning: true, gameOver: false, paused: false}
game-security.js:271 🎨 Canvas check: {exists: true, computedWidth: '1009.19px', computedHeight: '607.906px', offsetWidth: 1009, offsetHeight: 608}
game-security.js:271 🔄 Restarting game loop...
main.js:239 ⚠️ [DEBUG] restart() detected existing RAF id. Cancelling: 1
restart @ main.js:239
startGameInternal @ menu-system.js:508
await in startGameInternal
startGameTest @ menu-system.js:416
onclick @ index.html:193
game-security.js:271 🎵 playGameplayMusic() called
game-security.js:271 Switched to Theme 5
game-security.js:271 Music - playing layer: melody, patternKey: theme5Melody, pattern exists: true
game-security.js:271 Music - playing layer: bass, patternKey: theme5Bass, pattern exists: true
game-security.js:271 Music - playing layer: harmony, patternKey: theme5Harmony, pattern exists: true
game-security.js:158 Suspicious activity detected: devtools_detected
flagSuspiciousActivity @ game-security.js:158
(anonymous) @ game-security.js:301
setInterval
detectDevTools @ game-security.js:296
SecureShooterGame @ game-security.js:259
initializeSecureGame @ game-security.js:546
initSecurity @ main.js:36
init @ main.js:1166
window.initializeGame @ main.js:1315
startGameInternal @ menu-system.js:461
await in startGameInternal
startGameTest @ menu-system.js:416
onclick @ index.html:193
game-security.js:271 Security alert would be sent: {type: 'devtools_detected', timestamp: 1763049227237, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 🎯 [DEBUG] FPS≈ 56 | speed: 3.059999999999988 base: 2.5 inc: 0.01 max: 6
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 0 | New: 15 | Actions: 1
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=15 | Expected: 15 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049227796, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 0 | New: 15 | SecureGame score: 15
game-security.js:271 🎯 [DEBUG] FPS≈ 60 | speed: 3.6599999999999753 base: 2.5 inc: 0.01 max: 6
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 15 | New: 30 | Actions: 2
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=30 | Expected: 30 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049229097, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 15 | New: 30 | SecureGame score: 30
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 30 | New: 45 | Actions: 3
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=45 | Expected: 45 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049229281, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 30 | New: 45 | SecureGame score: 45
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 45 | New: 60 | Actions: 4
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=60 | Expected: 60 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049229647, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 45 | New: 60 | SecureGame score: 60
game-security.js:271 🎯 [DEBUG] FPS≈ 60 | speed: 4.2599999999999625 base: 2.5 inc: 0.01 max: 6
game-security.js:271 🎮 Drawing game content
game-security.js:271 🎯 [DEBUG] FPS≈ 61 | speed: 4.8699999999999495 base: 2.5 inc: 0.01 max: 6
game-security.js:271 ⌨️ [CONSUMABLES] Key M pressed for Coin Tractor Beam
game-security.js:271 ⌨️ [CONSUMABLES] Coin Tractor Beam available: true
game-security.js:271 ⌨️ [CONSUMABLES] Activating Coin Tractor Beam
game-security.js:271 🧲 [TRACTOR BEAM] Activation - Player center X: 77.5, Pull range: 720 (90% of 800px)
game-security.js:271 🧲 [TRACTOR BEAM] Pulling coin - Lane: 1, X: 490.9700000000064, Distance: 413.5
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range - Lane: 0, X: 1130.970000000007, Distance: 1053.5, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Activated - Level 3, 1 coins, 2 power-ups
game-security.js:271 ➖ [INVENTORY] Removing 1x coinTractorBeam_3
game-security.js:271 💾 [INVENTORY] Saved inventory: shootergame_inventory_default
game-security.js:271 ✅ [INVENTORY] Removed 1x coinTractorBeam_3. New total: 7
game-security.js:271 ✅ [CONSUMPTION] Consumed coinTractorBeam level 3 when activated
game-security.js:271 🔮 [ORB LEVEL] Reached cap at Level 3 (starting: 1)
game-security.js:271 Coin collected! Streak: 1 Force field level: 0 Active: false
game-security.js:271 Boss progress: 1001 / 5000
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 893.8400000000092, Distance: 816.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 888.4500000000093, Distance: 811.0, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 883.0500000000093, Distance: 805.6, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 877.6400000000093, Distance: 800.1, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 872.2200000000093, Distance: 794.7, Range: 720
game-security.js:271 🔮 [ORB LEVEL] Lucky upgrade! Level 4 exceeds cap 3 (power-up was already spawned)
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 866.7900000000094, Distance: 789.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 861.3500000000095, Distance: 783.9, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 855.9000000000095, Distance: 778.4, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 850.4400000000096, Distance: 772.9, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 844.9700000000097, Distance: 767.5, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 839.4900000000098, Distance: 762.0, Range: 720
game-security.js:271 🎯 [DEBUG] FPS≈ 61 | speed: 5.4799999999999365 base: 2.5 inc: 0.01 max: 6
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 834.0000000000099, Distance: 756.5, Range: 720
game-security.js:271 🧪 [DEBUG] gameLoop entry count: 301 RAF id: 300 speed: 5.489999999999936
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 828.50000000001, Distance: 751.0, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 822.99000000001, Distance: 745.5, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 817.47000000001, Distance: 740.0, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 811.9400000000101, Distance: 734.4, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 806.4000000000101, Distance: 728.9, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 800.8500000000101, Distance: 723.4, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 795.2900000000102, Distance: 717.8
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 789.7200000000103, Distance: 712.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 784.1400000000103, Distance: 706.6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 778.5500000000104, Distance: 701.1
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 60 | New: 75 | Actions: 5
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=75 | Expected: 75 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049231979, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 60 | New: 75 | SecureGame score: 75
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 772.9500000000105, Distance: 695.5
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 767.3400000000106, Distance: 689.8
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 761.7200000000107, Distance: 684.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 756.0900000000108, Distance: 678.6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 750.4500000000108, Distance: 673.0
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 744.8000000000109, Distance: 667.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 739.1400000000109, Distance: 661.6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 733.4700000000109, Distance: 656.0
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 727.790000000011, Distance: 650.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 722.100000000011, Distance: 644.6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 716.4000000000111, Distance: 638.9
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 710.6900000000112, Distance: 633.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 704.9700000000113, Distance: 627.5
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 699.2400000000114, Distance: 621.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 693.5000000000115, Distance: 616.0
game-security.js:271 Coin collected! Streak: 2 Force field level: 0 Active: false
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 687.7500000000116, Distance: 610.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 681.9900000000117, Distance: 604.5
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 676.2200000000117, Distance: 598.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 670.4400000000118, Distance: 592.9
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 664.6500000000118, Distance: 587.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 658.8500000000118, Distance: 581.4
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 653.0400000000119, Distance: 575.5
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 647.220000000012, Distance: 569.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 641.390000000012, Distance: 563.9
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 635.5500000000121, Distance: 558.1
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 629.7000000000122, Distance: 552.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 623.8400000000123, Distance: 546.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 617.9700000000124, Distance: 540.5
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 612.0900000000125, Distance: 534.6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 606.2000000000127, Distance: 528.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 600.3000000000127, Distance: 522.8
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 594.3900000000127, Distance: 516.9
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 588.4700000000128, Distance: 511.0
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 582.5400000000128, Distance: 505.0
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 576.6000000000129, Distance: 499.1
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 570.6500000000129, Distance: 493.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 564.690000000013, Distance: 487.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 558.7200000000131, Distance: 481.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 552.7400000000132, Distance: 475.2
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 546.7500000000133, Distance: 469.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 540.7500000000134, Distance: 463.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 534.7500000000134, Distance: 457.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 528.7500000000134, Distance: 451.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 522.7500000000134, Distance: 445.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 516.7500000000134, Distance: 439.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 510.75000000001336, Distance: 433.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 504.75000000001336, Distance: 427.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 498.75000000001336, Distance: 421.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 492.75000000001336, Distance: 415.3
game-security.js:271 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 486.75000000001336, Distance: 409.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 480.75000000001336, Distance: 403.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 474.75000000001336, Distance: 397.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 468.75000000001336, Distance: 391.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 462.75000000001336, Distance: 385.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 456.75000000001336, Distance: 379.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 450.75000000001336, Distance: 373.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 444.75000000001336, Distance: 367.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 438.75000000001336, Distance: 361.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 432.75000000001336, Distance: 355.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 426.75000000001336, Distance: 349.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 420.75000000001336, Distance: 343.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 414.75000000001336, Distance: 337.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 408.75000000001336, Distance: 331.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 402.75000000001336, Distance: 325.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 396.75000000001336, Distance: 319.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 390.75000000001336, Distance: 313.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 384.75000000001336, Distance: 307.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 378.75000000001336, Distance: 301.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 372.75000000001336, Distance: 295.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 366.75000000001336, Distance: 289.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 360.75000000001336, Distance: 283.3
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 75 | New: 90 | Actions: 6
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=90 | Expected: 90 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049233165, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 75 | New: 90 | SecureGame score: 90
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 354.75000000001336, Distance: 277.3
game-security.js:271 Music - playing layer: melody, patternKey: theme5Melody, pattern exists: true
game-security.js:271 Music - playing layer: bass, patternKey: theme5Bass, pattern exists: true
game-security.js:271 Music - playing layer: harmony, patternKey: theme5Harmony, pattern exists: true
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 348.75000000001336, Distance: 271.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 342.75000000001336, Distance: 265.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 336.75000000001336, Distance: 259.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 330.75000000001336, Distance: 253.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 324.75000000001336, Distance: 247.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 318.75000000001336, Distance: 241.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 312.75000000001336, Distance: 235.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 306.75000000001336, Distance: 229.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 300.75000000001336, Distance: 223.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 294.75000000001336, Distance: 217.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 288.75000000001336, Distance: 211.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 282.75000000001336, Distance: 205.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 276.75000000001336, Distance: 199.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 270.75000000001336, Distance: 193.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 264.75000000001336, Distance: 187.3
game-security.js:271 🔮 [ORB LEVEL] Lucky upgrade! Level 5 exceeds cap 3 (power-up was already spawned)
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 258.75000000001336, Distance: 181.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 252.75000000001336, Distance: 175.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 246.75000000001336, Distance: 169.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 240.75000000001336, Distance: 163.3
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 90 | New: 105 | Actions: 7
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=105 | Expected: 105 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049233507, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 90 | New: 105 | SecureGame score: 105
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 234.75000000001336, Distance: 157.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 228.75000000001336, Distance: 151.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 222.75000000001336, Distance: 145.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 216.75000000001336, Distance: 139.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 210.75000000001336, Distance: 133.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 204.75000000001336, Distance: 127.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 198.75000000001336, Distance: 121.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 192.75000000001336, Distance: 115.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 186.75000000001336, Distance: 109.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 180.75000000001336, Distance: 103.3
game-security.js:271 🎮 Drawing game content
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 174.75000000001336, Distance: 97.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 168.75000000001336, Distance: 91.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 162.75000000001336, Distance: 85.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 156.75000000001336, Distance: 79.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 150.75000000001336, Distance: 73.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 144.75000000001336, Distance: 67.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 138.75000000001336, Distance: 61.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 132.75000000001336, Distance: 55.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 126.75000000001336, Distance: 49.3
game-security.js:271 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 120.75000000001336, Distance: 43.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 114.75000000001336, Distance: 37.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 108.75000000001336, Distance: 31.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 102.75000000001336, Distance: 25.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 96.75000000001336, Distance: 19.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 90.75000000001336, Distance: 13.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 84.75000000001336, Distance: 7.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 78.75000000001336, Distance: 1.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 72.75000000001336, Distance: 4.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 66.75000000001336, Distance: 10.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 60.75000000001336, Distance: 16.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 54.75000000001336, Distance: 22.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 48.75000000001336, Distance: 28.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 42.75000000001336, Distance: 34.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 36.75000000001336, Distance: 40.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 30.750000000013358, Distance: 46.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 24.750000000013358, Distance: 52.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 18.750000000013358, Distance: 58.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 12.750000000013358, Distance: 64.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 6.750000000013358, Distance: 70.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 0.7500000000133582, Distance: 76.7
game-security.js:271 🎮 Drawing game content
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -5.249999999986642, Distance: 82.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -11.249999999986642, Distance: 88.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -17.249999999986642, Distance: 94.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -23.249999999986642, Distance: 100.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -29.249999999986642, Distance: 106.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -35.24999999998664, Distance: 112.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -41.24999999998664, Distance: 118.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -47.24999999998664, Distance: 124.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -53.24999999998664, Distance: 130.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -59.24999999998664, Distance: 136.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -65.24999999998664, Distance: 142.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -71.24999999998664, Distance: 148.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -77.24999999998664, Distance: 154.7
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 105 | New: 120 | Actions: 8
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=120 | Expected: 120 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049234390, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 105 | New: 120 | SecureGame score: 120
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -83.24999999998664, Distance: 160.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -89.24999999998664, Distance: 166.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -95.24999999998664, Distance: 172.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -101.24999999998664, Distance: 178.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -107.24999999998664, Distance: 184.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -113.24999999998664, Distance: 190.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -119.24999999998664, Distance: 196.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -125.24999999998664, Distance: 202.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -131.24999999998664, Distance: 208.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -137.24999999998664, Distance: 214.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -143.24999999998664, Distance: 220.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -149.24999999998664, Distance: 226.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -155.24999999998664, Distance: 232.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -161.24999999998664, Distance: 238.7
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: -167.24999999998664, Distance: 244.7
game-security.js:271 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 120 | New: 135 | Actions: 9
game-security.js:271 🔍 [SCORE DEBUG] After setter: actualNewScore=135 | Expected: 135 | Match: true
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
updateScore @ main.js:68
checkProjectileEnemyCollision @ main.js:721
(anonymous) @ main.js:749
(anonymous) @ main.js:747
(anonymous) @ main.js:746
update @ main.js:668
gameLoop @ main.js:1112
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
requestAnimationFrame
gameLoop @ main.js:1121
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763049234764, sessionKey: 'nxm4naqjgcjmhxlzlrw', gameState: {…}}
game-security.js:271 📈 [SCORE] +15 points | Previous: 120 | New: 135 | SecureGame score: 135
game-security.js:271 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 896.7500000000127, Distance: 819.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 890.7500000000127, Distance: 813.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 884.7500000000127, Distance: 807.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 878.7500000000127, Distance: 801.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 872.7500000000127, Distance: 795.3, Range: 720
game-security.js:271 🎮 Drawing game content
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 866.7500000000127, Distance: 789.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 860.7500000000127, Distance: 783.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 854.7500000000127, Distance: 777.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 848.7500000000127, Distance: 771.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 842.7500000000127, Distance: 765.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 836.7500000000127, Distance: 759.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 830.7500000000127, Distance: 753.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 824.7500000000127, Distance: 747.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 818.7500000000127, Distance: 741.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 812.7500000000127, Distance: 735.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 806.7500000000127, Distance: 729.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: 0, X: 800.7500000000127, Distance: 723.3, Range: 720
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 794.7500000000127, Distance: 717.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 788.7500000000127, Distance: 711.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 782.7500000000127, Distance: 705.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 776.7500000000127, Distance: 699.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 770.7500000000127, Distance: 693.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 764.7500000000127, Distance: 687.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 758.7500000000127, Distance: 681.3
game-security.js:271 🎮 Drawing game content
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 752.7500000000127, Distance: 675.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 746.7500000000127, Distance: 669.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 740.7500000000127, Distance: 663.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 734.7500000000127, Distance: 657.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 728.7500000000127, Distance: 651.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 722.7500000000127, Distance: 645.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 716.7500000000127, Distance: 639.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 710.7500000000127, Distance: 633.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 704.7500000000127, Distance: 627.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 698.7500000000127, Distance: 621.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 692.7500000000127, Distance: 615.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 686.7500000000127, Distance: 609.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 680.7500000000127, Distance: 603.3
game-security.js:271 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 674.7500000000127, Distance: 597.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 668.7500000000127, Distance: 591.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 662.7500000000127, Distance: 585.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 656.7500000000127, Distance: 579.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 650.7500000000127, Distance: 573.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 644.7500000000127, Distance: 567.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 638.7500000000127, Distance: 561.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 632.7500000000127, Distance: 555.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 626.7500000000127, Distance: 549.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 620.7500000000127, Distance: 543.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 614.7500000000127, Distance: 537.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 608.7500000000127, Distance: 531.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 602.7500000000127, Distance: 525.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 596.7500000000127, Distance: 519.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 590.7500000000127, Distance: 513.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 584.7500000000127, Distance: 507.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 578.7500000000127, Distance: 501.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 572.7500000000127, Distance: 495.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 566.7500000000127, Distance: 489.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 560.7500000000127, Distance: 483.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 554.7500000000127, Distance: 477.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 548.7500000000127, Distance: 471.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 542.7500000000127, Distance: 465.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 536.7500000000127, Distance: 459.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 530.7500000000127, Distance: 453.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 524.7500000000127, Distance: 447.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 518.7500000000127, Distance: 441.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 512.7500000000127, Distance: 435.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 506.75000000001273, Distance: 429.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 500.75000000001273, Distance: 423.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 494.75000000001273, Distance: 417.3
game-security.js:271 Boss progress: 2002 / 5000
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 488.75000000001273, Distance: 411.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 482.75000000001273, Distance: 405.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 476.75000000001273, Distance: 399.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 470.75000000001273, Distance: 393.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 464.75000000001273, Distance: 387.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 458.75000000001273, Distance: 381.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 452.75000000001273, Distance: 375.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 446.75000000001273, Distance: 369.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 440.75000000001273, Distance: 363.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 434.75000000001273, Distance: 357.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 428.75000000001273, Distance: 351.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 422.75000000001273, Distance: 345.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 416.75000000001273, Distance: 339.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 410.75000000001273, Distance: 333.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 404.75000000001273, Distance: 327.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 398.75000000001273, Distance: 321.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 392.75000000001273, Distance: 315.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 386.75000000001273, Distance: 309.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 380.75000000001273, Distance: 303.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 374.75000000001273, Distance: 297.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 368.75000000001273, Distance: 291.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 362.75000000001273, Distance: 285.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 356.75000000001273, Distance: 279.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 350.75000000001273, Distance: 273.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 344.75000000001273, Distance: 267.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 338.75000000001273, Distance: 261.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 332.75000000001273, Distance: 255.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 326.75000000001273, Distance: 249.3
game-security.js:271 🧪 [DEBUG] gameLoop entry count: 601 RAF id: 600 speed: 6
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 320.75000000001273, Distance: 243.3
game-security.js:271 🧲 [TRACTOR BEAM] New coin entered range - Lane: 0, X: 314.75000000001273, Distance: 237.3
game-security.js:271 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:271 ⏸️ Drawing pause overlay
game-security.js:271 Game paused, skipping update
game-security.js:271 ⏸️ Drawing pause overlay
game-security.js:271 ⏸️ Drawing pause overlay
game-security.js:271 ⏸️ Drawing pause overlay
game-security.js:271 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:271 Game paused, skipping update
game-security.js:271 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:271 Music - playing layer: melody, patternKey: theme5Melody, pattern exists: true
game-security.js:271 Music - playing layer: bass, patternKey: theme5Bass, pattern exists: true
game-security.js:271 Music - playing layer: harmony, patternKey: theme5Harmony, pattern exists: true
game-security.js:271 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6

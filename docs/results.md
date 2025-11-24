🎯 [CLICK TRACKING] Click is OUTSIDE name input modal
game-security.js:271 🎯 [CLICK TRACKING] Event path: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
game-security.js:271 🎮 [GAME OVER] User interaction detected: click - elapsed: 2877 ms
game-security.js:271 🎮 [GAME OVER] Minimum display time passed - proceeding
game-security.js:271 🎮 [GAME OVER] Game loop stopped - transitioning to next screen
game-security.js:271 ⏹️ Game loop stopped - game not running and not over
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
(anonymous) @ leaderboard-system.js:470
setTimeout
actuallyProceed @ leaderboard-system.js:468
handleInteraction @ leaderboard-system.js:495Understand this warning
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763952497653, sessionKey: '2hq13xdu3spmicjrg32', gameState: {…}}
game-security.js:271 🎮 [GAME OVER] Showing name input modal for score: 150
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
showNameInput @ leaderboard-system.js:73
(anonymous) @ leaderboard-system.js:471
setTimeout
actuallyProceed @ leaderboard-system.js:468
handleInteraction @ leaderboard-system.js:495Understand this warning
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763952497654, sessionKey: '2hq13xdu3spmicjrg32', gameState: {…}}
game-security.js:271 🔵 [VISIBILITY] showNameInput() called for score: 150
game-security.js:271 🔵 [VISIBILITY] Name input modal - was visible: false was hidden: true
game-security.js:271 🔵 [VISIBILITY] Name input modal SHOWN
game-security.js:271 🔵 [VISIBILITY] Game container - was visible: true was hidden: false
game-security.js:271 🔵 [VISIBILITY] Game container HIDDEN
game-security.js:271 🔵 [VISIBILITY] Save button event listeners attached
game-security.js:271 🔵 [VISIBILITY] Skip button event listeners attached
game-security.js:271 🎯 [CLICK TRACKING] Global click detected: {tag: 'BUTTON', id: '', class: 'menu-btn mobile-large', onclick: 'skipSave()', textContent: 'Skip', …}
game-security.js:271 🎯 [CLICK TRACKING] Name input modal check: {modalExists: true, isInside: true, modalVisible: true, modalHidden: false}
game-security.js:271 🎯 [CLICK TRACKING] ✅ Click is INSIDE name input modal
game-security.js:271 🎯 [CLICK TRACKING] ✅✅✅ Skip button clicked! onclick attribute: skipSave()
game-security.js:271 🎯 [CLICK TRACKING] Event path: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
game-security.js:271 🟡 [UI FLOW] skipSave() called
leaderboard-system.js:284 🟡 [UI FLOW] skipSave() stack trace
skipSave @ leaderboard-system.js:284
onclick @ (index):1
game-security.js:271 🔵 [VISIBILITY] hideNameInput() called
leaderboard-system.js:345 🔵 [VISIBILITY] hideNameInput() stack trace
hideNameInput @ leaderboard-system.js:345
skipSave @ leaderboard-system.js:286
onclick @ (index):1
game-security.js:271 🔵 [VISIBILITY] Name input modal element: <div class=​"name-input-modal name-input-modal-hidden" id=​"nameInputModal">​…​</div>​
game-security.js:271 🔵 [VISIBILITY] Name input modal - was visible: true was hidden: false
game-security.js:271 🔵 [VISIBILITY] Name input modal HIDDEN
game-security.js:271 🔵 [VISIBILITY] Settings panel state check - visible: false hidden: true
game-security.js:271 🟢 [UI FLOW] showMainMenu() called
menu-system.js:976 🟢 [UI FLOW] showMainMenu() stack trace
showMainMenu @ menu-system.js:976
skipSave @ leaderboard-system.js:289
onclick @ (index):1
game-security.js:271 🟢 [UI FLOW] Main menu element: <div class=​"main-menu-overlay main-menu-overlay-visible" id=​"mainMenuOverlay">​…​</div>​flex
game-security.js:271 🟢 [UI FLOW] Main menu current state - visible: false hidden: true
game-security.js:271 🟢 [UI FLOW] Main menu shown
game-security.js:271 🟢 [UI FLOW] Settings panel state check - visible: false hidden: true
game-security.js:271 Closing game completely
game-security.js:271 ⏭️ [MENU] Skipping badge load in showMainMenu - already loaded for this address
game-security.js:271 📝 [BLOCKCHAIN] Submitting game stats to blockchain (skipped name): {score: 150, distance: 3150, coins: 4, bossesDefeated: 0, enemiesDefeated: 10, …}
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
submitScoreToBlockchain @ score-submission.js:66
skipSave @ leaderboard-system.js:310
onclick @ (index):1Understand this warning
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763952499542, sessionKey: '2hq13xdu3spmicjrg32', gameState: {…}}
game-security.js:271 📝 [BLOCKCHAIN] Submitting score via backend: {score: 150, distance: 3150, coins: 4, bossesDefeated: 0, enemiesDefeated: 10, …} Name: (empty)
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
submitScoreToBlockchain @ score-submission.js:100
skipSave @ leaderboard-system.js:310
onclick @ (index):1Understand this warning
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763952499543, sessionKey: '2hq13xdu3spmicjrg32', gameState: {…}}
game-security.js:271 📤 [BLOCKCHAIN] Sending score data to backend: https://sui-two-shooter-backend-sui-integra.vercel.app/api/scores/submit
game-security.js:271 🟡 [UI FLOW] Skip button clicked via event listener
game-security.js:271 🟡 [UI FLOW] skipSave() called
leaderboard-system.js:284 🟡 [UI FLOW] skipSave() stack trace
skipSave @ leaderboard-system.js:284
(anonymous) @ leaderboard-system.js:129
game-security.js:271 🔵 [VISIBILITY] hideNameInput() called
leaderboard-system.js:345 🔵 [VISIBILITY] hideNameInput() stack trace
hideNameInput @ leaderboard-system.js:345
skipSave @ leaderboard-system.js:286
(anonymous) @ leaderboard-system.js:129
game-security.js:271 🔵 [VISIBILITY] Name input modal element: <div class=​"name-input-modal name-input-modal-hidden" id=​"nameInputModal">​…​</div>​
game-security.js:271 🔵 [VISIBILITY] Name input modal - was visible: false was hidden: true
game-security.js:271 🔵 [VISIBILITY] Name input modal HIDDEN
game-security.js:271 🔵 [VISIBILITY] Settings panel state check - visible: false hidden: true
game-security.js:271 🟢 [UI FLOW] showMainMenu() called
menu-system.js:976 🟢 [UI FLOW] showMainMenu() stack trace
showMainMenu @ menu-system.js:976
skipSave @ leaderboard-system.js:289
(anonymous) @ leaderboard-system.js:129
game-security.js:271 🟢 [UI FLOW] Main menu element: <div class=​"main-menu-overlay main-menu-overlay-visible" id=​"mainMenuOverlay">​…​</div>​flex
game-security.js:271 🟢 [UI FLOW] Main menu current state - visible: true hidden: false
game-security.js:271 🟢 [UI FLOW] Main menu shown
game-security.js:271 🟢 [UI FLOW] Settings panel state check - visible: false hidden: true
game-security.js:271 Closing game completely
game-security.js:271 ⏭️ [MENU] Skipping badge load in showMainMenu - already loaded for this address
game-security.js:271 📝 [BLOCKCHAIN] Submitting game stats to blockchain (skipped name): {score: 150, distance: 3150, coins: 4, bossesDefeated: 0, enemiesDefeated: 10, …}
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
submitScoreToBlockchain @ score-submission.js:66
skipSave @ leaderboard-system.js:310
(anonymous) @ leaderboard-system.js:129Understand this warning
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763952499545, sessionKey: '2hq13xdu3spmicjrg32', gameState: {…}}
game-security.js:271 📝 [BLOCKCHAIN] Submitting score via backend: {score: 150, distance: 3150, coins: 4, bossesDefeated: 0, enemiesDefeated: 10, …} Name: (empty)
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
submitScoreToBlockchain @ score-submission.js:100
skipSave @ leaderboard-system.js:310
(anonymous) @ leaderboard-system.js:129Understand this warning
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763952499545, sessionKey: '2hq13xdu3spmicjrg32', gameState: {…}}
game-security.js:271 📤 [BLOCKCHAIN] Sending score data to backend: https://sui-two-shooter-backend-sui-integra.vercel.app/api/scores/submit
game-security.js:271 ✅ [MENU] Stats updated from blockchain: {bestScore: 0, totalGames: 0}
game-security.js:271 ✅ [MENU] Stats updated from blockchain: {bestScore: 0, totalGames: 0}
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! {digest: 'BadXmk8rhzjiR3XNgxfhf4ZTYiUioP1NaHKwkUP7R3i9', playerAddress: '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', gasPaidBy: 'admin_wallet', badge: {…}}
game-security.js:271 🎖️ [BADGE] Player can mint badge
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! BadXmk8rhzjiR3XNgxfhf4ZTYiUioP1NaHKwkUP7R3i9
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! {digest: 'BadXmk8rhzjiR3XNgxfhf4ZTYiUioP1NaHKwkUP7R3i9', playerAddress: '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', gasPaidBy: 'admin_wallet', badge: {…}}
game-security.js:271 🎖️ [BADGE] Player can mint badge
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! BadXmk8rhzjiR3XNgxfhf4ZTYiUioP1NaHKwkUP7R3i9
2game-security.js:271 🎖️ [BADGE] Showing badge minting modal
game-security.js:271 🎯 [CLICK TRACKING] Global click detected: {tag: 'BUTTON', id: 'badgeMintBtn', class: 'badge-btn badge-btn-primary', onclick: null, textContent: 'Mint Badge ($0.10)', …}
game-security.js:271 🎯 [CLICK TRACKING] Name input modal check: {modalExists: true, isInside: false, modalVisible: false, modalHidden: true}
game-security.js:271 🎯 [CLICK TRACKING] Click is OUTSIDE name input modal
game-security.js:271 🎯 [CLICK TRACKING] Event path: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
game-security.js:271 💰 [BADGE] Using coin 0xb7da7807cdf448179e8cef185820439e0f6ebf56b9bb1fb2fbb92d1cfbbf3c2c for payment (0.15 SUI)
badge-service.js:264  POST https://sui-two-shooter-backend-sui-integra.vercel.app/api/badges/mint 400 (Bad Request)
buildMintBadgeTransaction @ badge-service.js:264
handleBadgeMint @ badge-ui.js:234Understand this error
badge-ui.js:253 ❌ [BADGE] Error minting badge: Error: No available gas coins. The payment coin cannot be used for gas. Please ensure you have additional SUI coins for gas fees.
    at HTMLButtonElement.handleBadgeMint (badge-ui.js:237:13)
handleBadgeMint @ badge-ui.js:253Understand this error
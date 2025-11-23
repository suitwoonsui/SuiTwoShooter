Security alert would be sent: {type: 'console_game_access', timestamp: 1763931394696, sessionKey: '0ktx54bo4zgmic777rn', gameState: {…}}
game-security.js:271 📝 [BLOCKCHAIN] Submitting score via backend: {score: 135, distance: 2443, coins: 4, bossesDefeated: 0, enemiesDefeated: 9, …} Name: (empty)
game-security.js:158 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:158
logConsoleActivity @ game-security.js:313
console.log @ game-security.js:270
submitScoreToBlockchain @ score-submission.js:100
skipSave @ leaderboard-system.js:310
(anonymous) @ leaderboard-system.js:129Understand this warning
game-security.js:271 Security alert would be sent: {type: 'console_game_access', timestamp: 1763931394697, sessionKey: '0ktx54bo4zgmic777rn', gameState: {…}}
game-security.js:271 📤 [BLOCKCHAIN] Sending score data to backend: https://sui-two-shooter-backend-sui-integra.vercel.app/api/scores/submit
game-security.js:271 ✅ [MENU] Stats updated from blockchain: {bestScore: 0, totalGames: 0}
game-security.js:271 ✅ [MENU] Stats updated from blockchain: {bestScore: 0, totalGames: 0}
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! {digest: '7ZdMVUE5rgJQHhp1W8HcLaKAvqYiX87ueWzSaS4DJYaL', playerAddress: '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', gasPaidBy: 'admin_wallet', badge: {…}}
game-security.js:271 🎖️ [BADGE] Player can mint badge
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! 7ZdMVUE5rgJQHhp1W8HcLaKAvqYiX87ueWzSaS4DJYaL
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! {digest: '7ZdMVUE5rgJQHhp1W8HcLaKAvqYiX87ueWzSaS4DJYaL', playerAddress: '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', gasPaidBy: 'admin_wallet', badge: {…}}
game-security.js:271 🎖️ [BADGE] Player can mint badge
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! 7ZdMVUE5rgJQHhp1W8HcLaKAvqYiX87ueWzSaS4DJYaL
2game-security.js:271 🎖️ [BADGE] Showing badge minting modal
game-security.js:271 🎯 [CLICK TRACKING] Global click detected: {tag: 'BUTTON', id: 'badgeMintBtn', class: 'badge-btn badge-btn-primary', onclick: null, textContent: 'Mint Badge ($0.10)', …}
game-security.js:271 🎯 [CLICK TRACKING] Name input modal check: {modalExists: true, isInside: false, modalVisible: false, modalHidden: true}
game-security.js:271 🎯 [CLICK TRACKING] Click is OUTSIDE name input modal
game-security.js:271 🎯 [CLICK TRACKING] Event path: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
badge-service.js:215 ❌ [BADGE] Error getting payment coin: TypeError: Failed to resolve module specifier '@mysten/sui/client'
    at Object.getPaymentCoin (badge-service.js:165:43)
    at HTMLButtonElement.handleBadgeMint (badge-ui.js:226:50)
getPaymentCoin @ badge-service.js:215
await in getPaymentCoin
handleBadgeMint @ badge-ui.js:226Understand this error
badge-ui.js:253 ❌ [BADGE] Error minting badge: Error: Failed to resolve module specifier '@mysten/sui/client'
    at HTMLButtonElement.handleBadgeMint (badge-ui.js:228:13)
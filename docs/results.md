🔍 [SCORE DEBUG] After setter: actualNewScore=49420 | Expected: 49420 | Match: true
game-security.js:115 ⚠️ [SECURITY VALIDATION] Score 49420 exceeds limits: max=1674940 (time-based=1674940, action-based=95000), actions=475, minActions=988, avgPerAction=104.0, likelyBossHits=true
validateScore @ game-security.js:115
incrementScore @ game-security.js:444
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 🔍 [SCORE DEBUG] Validation result: false | gameTime: 167494ms | actionsCount: 475 | increment: 15
game-security.js:448 ⚠️ [SECURITY] Score validation failed: +15 points | Old: 49405 | New: 49420 | Time: 167494ms | Actions: 475
incrementScore @ game-security.js:448
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:230 Suspicious activity detected: invalid_score_progression
flagSuspiciousActivity @ game-security.js:230
incrementScore @ game-security.js:449
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'invalid_score_progression', timestamp: 1762955287979, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 🔍 [SCORE DEBUG] Score reverted to: 49405
game-security.js:230 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:230
logConsoleActivity @ game-security.js:385
console.log @ game-security.js:342
updateScore @ main.js:53
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'console_game_access', timestamp: 1762955287979, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 📈 [SCORE] +15 points | Previous: 49405 | New: 49405 | SecureGame score: 49405
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 49405 | New: 49420 | Actions: 476
game-security.js:343 🔍 [SCORE DEBUG] After setter: actualNewScore=49420 | Expected: 49420 | Match: true
game-security.js:115 ⚠️ [SECURITY VALIDATION] Score 49420 exceeds limits: max=1676310 (time-based=1676310, action-based=95200), actions=476, minActions=988, avgPerAction=103.8, likelyBossHits=true
validateScore @ game-security.js:115
incrementScore @ game-security.js:444
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 🔍 [SCORE DEBUG] Validation result: false | gameTime: 167631ms | actionsCount: 476 | increment: 15
game-security.js:448 ⚠️ [SECURITY] Score validation failed: +15 points | Old: 49405 | New: 49420 | Time: 167631ms | Actions: 476
incrementScore @ game-security.js:448
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:230 Suspicious activity detected: invalid_score_progression
flagSuspiciousActivity @ game-security.js:230
incrementScore @ game-security.js:449
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'invalid_score_progression', timestamp: 1762955288116, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 🔍 [SCORE DEBUG] Score reverted to: 49405
game-security.js:230 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:230
logConsoleActivity @ game-security.js:385
console.log @ game-security.js:342
updateScore @ main.js:53
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'console_game_access', timestamp: 1762955288117, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 📈 [SCORE] +15 points | Previous: 49405 | New: 49405 | SecureGame score: 49405
game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 🔍 [SCORE DEBUG] incrementScore called: +45 | Old: 49405 | New: 49450 | Actions: 477
game-security.js:343 🔍 [SCORE DEBUG] After setter: actualNewScore=49450 | Expected: 49450 | Match: true
game-security.js:115 ⚠️ [SECURITY VALIDATION] Score 49450 exceeds limits: max=1688120 (time-based=1688120, action-based=95400), actions=477, minActions=989, avgPerAction=103.7, likelyBossHits=true
validateScore @ game-security.js:115
incrementScore @ game-security.js:444
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 🔍 [SCORE DEBUG] Validation result: false | gameTime: 168812ms | actionsCount: 477 | increment: 45
game-security.js:448 ⚠️ [SECURITY] Score validation failed: +45 points | Old: 49405 | New: 49450 | Time: 168812ms | Actions: 477
incrementScore @ game-security.js:448
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:230 Suspicious activity detected: invalid_score_progression
flagSuspiciousActivity @ game-security.js:230
incrementScore @ game-security.js:449
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'invalid_score_progression', timestamp: 1762955289296, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 🔍 [SCORE DEBUG] Score reverted to: 49405
game-security.js:230 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:230
logConsoleActivity @ game-security.js:385
console.log @ game-security.js:342
updateScore @ main.js:53
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'console_game_access', timestamp: 1762955289297, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 📈 [SCORE] +45 points | Previous: 49405 | New: 49405 | SecureGame score: 49405
game-security.js:343 🎮 Drawing game content
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 🔍 [SCORE DEBUG] incrementScore called: +45 | Old: 49405 | New: 49450 | Actions: 478
game-security.js:343 🔍 [SCORE DEBUG] After setter: actualNewScore=49450 | Expected: 49450 | Match: true
game-security.js:115 ⚠️ [SECURITY VALIDATION] Score 49450 exceeds limits: max=1702170 (time-based=1702170, action-based=95600), actions=478, minActions=989, avgPerAction=103.5, likelyBossHits=true
validateScore @ game-security.js:115
incrementScore @ game-security.js:444
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 🔍 [SCORE DEBUG] Validation result: false | gameTime: 170217ms | actionsCount: 478 | increment: 45
game-security.js:448 ⚠️ [SECURITY] Score validation failed: +45 points | Old: 49405 | New: 49450 | Time: 170217ms | Actions: 478
incrementScore @ game-security.js:448
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:230 Suspicious activity detected: invalid_score_progression
flagSuspiciousActivity @ game-security.js:230
incrementScore @ game-security.js:449
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'invalid_score_progression', timestamp: 1762955290701, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 🔍 [SCORE DEBUG] Score reverted to: 49405
game-security.js:230 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:230
logConsoleActivity @ game-security.js:385
console.log @ game-security.js:342
updateScore @ main.js:53
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'console_game_access', timestamp: 1762955290701, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 📈 [SCORE] +45 points | Previous: 49405 | New: 49405 | SecureGame score: 49405
game-security.js:343 🔍 [SCORE DEBUG] incrementScore called: +30 | Old: 49405 | New: 49435 | Actions: 479
game-security.js:343 🔍 [SCORE DEBUG] After setter: actualNewScore=49435 | Expected: 49435 | Match: true
game-security.js:115 ⚠️ [SECURITY VALIDATION] Score 49435 exceeds limits: max=1702180 (time-based=1702180, action-based=95800), actions=479, minActions=988, avgPerAction=103.2, likelyBossHits=true
validateScore @ game-security.js:115
incrementScore @ game-security.js:444
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 🔍 [SCORE DEBUG] Validation result: false | gameTime: 170218ms | actionsCount: 479 | increment: 30
game-security.js:448 ⚠️ [SECURITY] Score validation failed: +30 points | Old: 49405 | New: 49435 | Time: 170218ms | Actions: 479
incrementScore @ game-security.js:448
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:230 Suspicious activity detected: invalid_score_progression
flagSuspiciousActivity @ game-security.js:230
incrementScore @ game-security.js:449
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'invalid_score_progression', timestamp: 1762955290703, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 🔍 [SCORE DEBUG] Score reverted to: 49405
game-security.js:230 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:230
logConsoleActivity @ game-security.js:385
console.log @ game-security.js:342
updateScore @ main.js:53
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'console_game_access', timestamp: 1762955290703, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 📈 [SCORE] +30 points | Previous: 49405 | New: 49405 | SecureGame score: 49405
game-security.js:343 🔍 [SCORE DEBUG] incrementScore called: +45 | Old: 49405 | New: 49450 | Actions: 480
game-security.js:343 🔍 [SCORE DEBUG] After setter: actualNewScore=49450 | Expected: 49450 | Match: true
game-security.js:115 ⚠️ [SECURITY VALIDATION] Score 49450 exceeds limits: max=1704670 (time-based=1704670, action-based=96000), actions=480, minActions=989, avgPerAction=103.0, likelyBossHits=true
validateScore @ game-security.js:115
incrementScore @ game-security.js:444
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 🔍 [SCORE DEBUG] Validation result: false | gameTime: 170467ms | actionsCount: 480 | increment: 45
game-security.js:448 ⚠️ [SECURITY] Score validation failed: +45 points | Old: 49405 | New: 49450 | Time: 170467ms | Actions: 480
incrementScore @ game-security.js:448
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:230 Suspicious activity detected: invalid_score_progression
flagSuspiciousActivity @ game-security.js:230
incrementScore @ game-security.js:449
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'invalid_score_progression', timestamp: 1762955290952, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 🔍 [SCORE DEBUG] Score reverted to: 49405
game-security.js:230 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:230
logConsoleActivity @ game-security.js:385
console.log @ game-security.js:342
updateScore @ main.js:53
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'console_game_access', timestamp: 1762955290952, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 📈 [SCORE] +45 points | Previous: 49405 | New: 49405 | SecureGame score: 49405
game-security.js:343 🧪 [DEBUG] gameLoop entry count: 10201 RAF id: 10200 speed: 6
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 Boss progress: 4000 / 5000
game-security.js:343 🔍 [SCORE DEBUG] incrementScore called: +15 | Old: 49405 | New: 49420 | Actions: 481
game-security.js:343 🔍 [SCORE DEBUG] After setter: actualNewScore=49420 | Expected: 49420 | Match: true
game-security.js:115 ⚠️ [SECURITY VALIDATION] Score 49420 exceeds limits: max=1710680 (time-based=1710680, action-based=96200), actions=481, minActions=988, avgPerAction=102.7, likelyBossHits=true
validateScore @ game-security.js:115
incrementScore @ game-security.js:444
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 🔍 [SCORE DEBUG] Validation result: false | gameTime: 171068ms | actionsCount: 481 | increment: 15
game-security.js:448 ⚠️ [SECURITY] Score validation failed: +15 points | Old: 49405 | New: 49420 | Time: 171068ms | Actions: 481
incrementScore @ game-security.js:448
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:230 Suspicious activity detected: invalid_score_progression
flagSuspiciousActivity @ game-security.js:230
incrementScore @ game-security.js:449
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'invalid_score_progression', timestamp: 1762955291552, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 🔍 [SCORE DEBUG] Score reverted to: 49405
game-security.js:230 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:230
logConsoleActivity @ game-security.js:385
console.log @ game-security.js:342
updateScore @ main.js:53
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'console_game_access', timestamp: 1762955291553, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 📈 [SCORE] +15 points | Previous: 49405 | New: 49405 | SecureGame score: 49405
game-security.js:343 Music - playing layer: melody, patternKey: theme5Melody, pattern exists: true
game-security.js:343 Music - playing layer: bass, patternKey: theme5Bass, pattern exists: true
game-security.js:343 Music - playing layer: harmony, patternKey: theme5Harmony, pattern exists: true
game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 Force field blocked projectile! Level: 2
game-security.js:343 Force field damaged! New level: 1
game-security.js:343 🎮 Drawing game content
game-security.js:343 🔍 [SCORE DEBUG] incrementScore called: +45 | Old: 49405 | New: 49450 | Actions: 482
game-security.js:343 🔍 [SCORE DEBUG] After setter: actualNewScore=49450 | Expected: 49450 | Match: true
game-security.js:115 ⚠️ [SECURITY VALIDATION] Score 49450 exceeds limits: max=1721330 (time-based=1721330, action-based=96400), actions=482, minActions=989, avgPerAction=102.6, likelyBossHits=true
validateScore @ game-security.js:115
incrementScore @ game-security.js:444
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 🔍 [SCORE DEBUG] Validation result: false | gameTime: 172133ms | actionsCount: 482 | increment: 45
game-security.js:448 ⚠️ [SECURITY] Score validation failed: +45 points | Old: 49405 | New: 49450 | Time: 172133ms | Actions: 482
incrementScore @ game-security.js:448
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:230 Suspicious activity detected: invalid_score_progression
flagSuspiciousActivity @ game-security.js:230
incrementScore @ game-security.js:449
updateScore @ main.js:51
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'invalid_score_progression', timestamp: 1762955292618, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 🔍 [SCORE DEBUG] Score reverted to: 49405
game-security.js:230 Suspicious activity detected: console_game_access
flagSuspiciousActivity @ game-security.js:230
logConsoleActivity @ game-security.js:385
console.log @ game-security.js:342
updateScore @ main.js:53
checkProjectileEnemyCollision @ main.js:621
(anonymous) @ main.js:649
(anonymous) @ main.js:647
(anonymous) @ main.js:646
update @ main.js:572
gameLoop @ main.js:987
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996
requestAnimationFrame
gameLoop @ main.js:996Understand this warning
game-security.js:343 Security alert would be sent: {type: 'console_game_access', timestamp: 1762955292618, sessionKey: 'wykac9kwcymhw1ykx0', gameState: {…}}
game-security.js:343 📈 [SCORE] +45 points | Previous: 49405 | New: 49405 | SecureGame score: 49405
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 ⏸️ Drawing pause overlay
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 Game paused, skipping update
game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
3game-security.js:343 Game paused, skipping update
game-security.js:343 🧪 [DEBUG] gameLoop entry count: 10501 RAF id: 10500 speed: 6
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
2game-security.js:343 Game paused, skipping update
game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
2game-security.js:343 Game paused, skipping update
game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 Music - playing layer: melody, patternKey: theme5Melody, pattern exists: true
game-security.js:343 Music - playing layer: bass, patternKey: theme5Bass, pattern exists: true
game-security.js:343 Music - playing layer: harmony, patternKey: theme5Harmony, pattern exists: true
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 ⏸️ Drawing pause overlay
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 🧪 [DEBUG] gameLoop entry count: 10801 RAF id: 10800 speed: 6
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 ⏸️ Drawing pause overlay
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
2game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 Music - playing layer: melody, patternKey: theme5Melody, pattern exists: true
game-security.js:343 Music - playing layer: bass, patternKey: theme5Bass, pattern exists: true
game-security.js:343 Music - playing layer: harmony, patternKey: theme5Harmony, pattern exists: true
2game-security.js:343 Game paused, skipping update
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 ⏸️ Drawing pause overlay
2game-security.js:343 Game paused, skipping update
game-security.js:343 🧪 [DEBUG] gameLoop entry count: 11101 RAF id: 11100 speed: 6
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 Game paused, skipping update
game-security.js:343 ⏸️ Drawing pause overlay
game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 ⏸️ Drawing pause overlay
game-security.js:343 Game paused, skipping update
2game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 ⏸️ Drawing pause overlay
game-security.js:343 Game paused, skipping update
game-security.js:343 🎯 [DEBUG] FPS≈ 61 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 ⏸️ Drawing pause overlay
game-security.js:343 🧪 [DEBUG] gameLoop entry count: 11401 RAF id: 11400 speed: 6
game-security.js:343 Music - playing layer: melody, patternKey: theme5Melody, pattern exists: true
game-security.js:343 Music - playing layer: bass, patternKey: theme5Bass, pattern exists: true
game-security.js:343 Music - playing layer: harmony, patternKey: theme5Harmony, pattern exists: true
game-security.js:343 🎯 [DEBUG] FPS≈ 60 | speed: 6 base: 2.5 inc: 0.01 max: 6
game-security.js:343 Game paused, skipping update
game-security.js:343 ⏸️ Drawing pause overlay
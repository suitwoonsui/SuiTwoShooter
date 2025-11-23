{digest: 'EBbuhB8kv8sxYjx15hhzLAnTSWSSuXVKCDmp2nVF5Mn3', playerAddress: '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', gasPaidBy: 'admin_wallet', badge: {…}}
game-security.js:271 🎖️ [BADGE] Player can mint badge
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! EBbuhB8kv8sxYjx15hhzLAnTSWSSuXVKCDmp2nVF5Mn3
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! {digest: 'EBbuhB8kv8sxYjx15hhzLAnTSWSSuXVKCDmp2nVF5Mn3', playerAddress: '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3', gasPaidBy: 'admin_wallet', badge: {…}}
game-security.js:271 🎖️ [BADGE] Player can mint badge
game-security.js:271 ✅ [BLOCKCHAIN] Score submitted successfully! EBbuhB8kv8sxYjx15hhzLAnTSWSSuXVKCDmp2nVF5Mn3
2game-security.js:271 🎖️ [BADGE] Showing badge minting modal
game-security.js:271 🎯 [CLICK TRACKING] Global click detected: {tag: 'BUTTON', id: 'badgeMintBtn', class: 'badge-btn badge-btn-primary', onclick: null, textContent: 'Mint Badge ($0.10)', …}
game-security.js:271 🎯 [CLICK TRACKING] Name input modal check: {modalExists: true, isInside: false, modalVisible: false, modalHidden: true}
game-security.js:271 🎯 [CLICK TRACKING] Click is OUTSIDE name input modal
game-security.js:271 🎯 [CLICK TRACKING] Event path: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
game-security.js:271 💰 [BADGE] Using coin 0xb7da7807cdf448179e8cef185820439e0f6ebf56b9bb1fb2fbb92d1cfbbf3c2c for payment (0.15 SUI)
badge-service.js:264  POST https://sui-two-shooter-backend-sui-integra.vercel.app/api/badges/mint 400 (Bad Request)
buildMintBadgeTransaction @ badge-service.js:264
handleBadgeMint @ badge-ui.js:234Understand this error
badge-ui.js:253 ❌ [BADGE] Error minting badge: Error: No valid gas coins found for the transaction.
    at HTMLButtonElement.handleBadgeMint (badge-ui.js:237:13)
handleBadgeMint @ badge-ui.js:253Understand this error
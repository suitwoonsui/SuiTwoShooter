PS C:\Users\TheCe\onedrive\documents\shootergame> npm run dev:all

> shootergame@1.0.0 dev:all
> node scripts/dev-all.js

🚀 Starting all development services...

[PLATFORM] Building wallet bundle for platform backend...
[PLATFORM] Starting Aqueduct Platform backend on http://localhost:3000

> suitwo-platform-backend@1.0.0 build:wallet
> node ../scripts/build-wallet-for-backend.js


> suitwo-platform-backend@1.0.0 dev
> next dev -p 3000 --webpack

Building wallet module for platform backend...
[BACKEND] Starting game backend on http://localhost:3001
[FRONTEND] Starting frontend server on http://localhost:8000

✅ All services starting!
←[36m♪◙📋 Services:←[0m♪◙  • Platform: http://localhost:3000
  • Backend:  http://localhost:3001
  • Frontend: http://localhost:8000

💡 Tips:
  • Platform/backend auto-reload on file changes
  • Frontend: Refresh browser after changes
  • Wallet bundle: Run "cd \"Aqueduct Platform/backend\" && npm run build:wallet" after wallet module changes

Press Ctrl+C to stop all services


> shootergame-wallet@1.0.0 build
> vite build


> shootergame@1.0.0 dev
> node server.js


> suitwo-shooter-game-backend@1.0.0 dev
> next dev -p 3001 -p 3001

🚀 Server running at http://localhost:8000/
📁 Serving files from: C:\Users\TheCe\OneDrive\Documents\shootergame
🌐 Open your browser to: http://localhost:8000/index.html

✨ Slush Wallet should now be detected!

vite v8.0.3 building client environment for production...
✓ 541 modules transformed.
rendering chunks (1)...▲ Next.js 16.2.2 (webpack)
- Local:         http://localhost:3000
- Network:       http://10.5.0.2:3000
- Environments: .env
✓ Ready in 2.7s
GET /
computing gzip size...
dist/wallet-api.umd.cjs  488.89 kB │ gzip: 154.41 kB

✓ built in 704ms
GET /assets/SuiTwo_Profile.webp
GET /base-config/api-config.js
Copied wallet bundle to C:\Users\TheCe\OneDrive\Documents\shootergame\Aqueduct Platform\backend\public\wallet-api.umd.cjs
GET /base-config/contract-config.js
GET /src/config/contract-config.js
GET /src/game/systems/core/lazy-loader.js
GET /src/game/systems/ui/ui-initialization.js
GET /src/game/systems/device/device-detection.js
GET /src/game/systems/device/landscape-orientation.js
GET /src/game/systems/device/css-loader.js
GET /src/game/rendering/ui/badge-styles.css
GET /src/game/rendering/ui/loading-modal.css
GET /src/game/systems/device/footer-loader.js
GET /src/game/rendering/ui/game-pass-styles.css
GET /src/game/rendering/responsive/shared/shared-theme.css?v=1777172320441
GET /src/game/rendering/responsive/shared/shared-front-page.css?v=1777172320469
GET /src/game/rendering/responsive/shared/shared-base-styles.css?v=1777172320482
GET /src/game/rendering/responsive/shared/shared-components.css?v=1777172320489
GET /src/game/rendering/responsive/shared/shared-achievements.css?v=1777172320559
GET /src/game/rendering/responsive/shared/shared-ui-components.css?v=1777172320569
GET /src/game/rendering/responsive/shared/shared-ui-classes.css?v=1777172320577
GET /src/game/rendering/responsive/shared/shared-viewport-container.css?v=1777172320680
GET /src/game/rendering/ui/tournament-creation-modal.css?v=1777172320689
GET /src/game/rendering/ui/how-to-play-modal.css?v=1777172320698
GET /src/game/rendering/responsive/shared/shared-main-menu.css?v=1777172320707
GET /src/game/rendering/responsive/shared/shared-panel-settings.css?v=1777172320718
GET /src/game/rendering/responsive/shared/shared-panel-sound-test.css?v=1777172320736
GET /src/game/rendering/responsive/shared/shared-panel-instructions.css?v=1777172320748
GET /src/game/rendering/responsive/shared/shared-modal-leaderboard.css?v=1777172320757
GET /src/game/rendering/responsive/shared/shared-panels.css?v=1777172320769
GET /src/game/rendering/responsive/shared/shared-typography.css?v=1777172320785
GET /src/game/rendering/responsive/shared/shared-interactions.css?v=1777172320793
GET /src/game/rendering/responsive/shared/shared-responsive.css?v=1777172320804
GET /src/game/rendering/responsive/shared/shared-gameplay.css?v=1777172320814
GET /src/game/rendering/responsive/shared/shared-animations.css?v=1777172320823
GET /src/game/rendering/responsive/desktop-modules/desktop-game-ui.css?v=1777172320832
GET /src/game/rendering/ui/consumable-footer.css?v=1777172320841
   ▲ Next.js 15.5.9
   - Local:        http://localhost:3001
   - Network:      http://10.5.0.2:3001
   - Environments: .env

 ✓ Starting...
GET /src/game/systems/core/frontend-logger.js?v=1777172324201
GET /src/game/systems/core/api-request-cache.js?v=1777172324201
GET /src/game/systems/core/game-api.js?v=1777172324201
GET /src/game/systems/core/tournament-context.js?v=1777172324201
GET /src/game/systems/ui/stats-service.js?v=1777172324201
GET /src/game/systems/core/game-state-manager.js?v=1777172324201
GET /src/game/rendering/player/force-field-rendering.js?v=1777172324201
GET /src/game/systems/ui/menu-service.js?v=1777172324201
GET /src/game/systems/ui/wallet-service.js?v=1777172324201
GET /src/game/systems/ui/game-service.js?v=1777172324201
GET /src/game/systems/ui/store-context-rules.js?v=1777172324201
GET /src/game/systems/ui/store-service.js?v=1777172324201
GET /src/game/systems/ui/token-balance-utils.js?v=1777172324201
GET /src/game/systems/ui/store-utils.js?v=1777172324201
GET /src/game/systems/ui/store-offer-utils.js?v=1777172324201
GET /src/game/systems/ui/store-data-sources.js?v=1777172324201
GET /src/game/systems/ui/store-item-loader.js?v=1777172324201
GET /src/game/systems/ui/store-item-rendering.js?v=1777172324201
GET /src/game/systems/ui/player-inventory-cache.js?v=1777172324201
GET /src/game/systems/ui/store-inventory.js?v=1777172324201
GET /src/game/systems/ui/store-wallet-connection.js?v=1777172324201
GET /src/game/systems/ui/store-purchase-flow.js?v=1777172324201
GET /src/game/systems/ui/store-modal.js?v=1777172324201
GET /src/game/systems/ui/store-item-selection.js?v=1777172324201
GET /src/game/systems/ui/store-ui-updates.js?v=1777172324201
GET /src/game/systems/ui/game-pass-service.js?v=1777172324201
GET /src/game/systems/ui/game-pass-display.js?v=1777172324201
GET /src/game/systems/ui/end-demo-modal.js?v=1777172324201
GET /src/game/systems/ui/store-game-pass-tab.js?v=1777172324201
GET /src/game/systems/ui/store-tournament-tickets-tab.js?v=1777172324201
GET /src/game/systems/ui/store-bundles-tab.js?v=1777172324201
GET /src/game/systems/ui/store-inventory-tab.js?v=1777172324201
GET /src/game/systems/ui/leaderboard-service.js?v=1777172324201
GET /src/game/systems/ui/leaderboard-formatting.js?v=1777172324201
GET /src/game/systems/ui/leaderboard-categories.js?v=1777172324201
GET /src/game/systems/ui/leaderboard-pagination.js?v=1777172324201
GET /src/game/systems/ui/leaderboard-data.js?v=1777172324201
GET /src/game/systems/ui/leaderboard-score-submission.js?v=1777172324201
GET /src/game/systems/ui/achievement-popup.js?v=1777172324201
GET /src/game/systems/ui/achievement-progress.js?v=1777172324201
GET /src/game/systems/ui/leaderboard-modal.js?v=1777172324201
GET /src/game/systems/ui/leaderboard-ui.js?v=1777172324201
GET /src/game/systems/ui/tournament-modal.js?v=1777172324201
GET /src/game/systems/ui/tournament-creation-modal.js?v=1777172324201
GET /src/game/systems/ui/how-to-play-content-generator.js?v=1777172324201
GET /src/game/systems/ui/how-to-play-modal.js?v=1777172324201
GET /src/game/systems/ui/menu-system.js?v=1777172324201
GET /src/game/systems/ui/settings-management.js?v=1777172324201
GET /src/game/data/asset-sfx-manifest.js?v=1777172324201
GET /src/game/systems/ui/sound-test-system.js?v=1777172324201
GET /src/game/systems/ui/store-ui.js?v=1777172324201
GET /src/game/systems/ui/toast-notifications.js?v=1777172324201
GET /src/game/systems/ui/loading-modal.js?v=1777172324201
GET /src/game/systems/ui/menu-panel-loading.js?v=1777172324201
GET /src/game/systems/store/item-catalog.js?v=1777172324201
GET /src/game/systems/store/item-consumption.js?v=1777172324201
GET /src/game/systems/ui/badge-ui-service.js?v=1777172324201
GET /src/game/systems/ui/badge-ui-utils.js?v=1777172324201
GET /src/game/systems/ui/badge-ui-display.js?v=1777172324201
GET /src/game/systems/ui/badge-ui-modals.js?v=1777172324201
GET /src/game/systems/ui/badge-ui-mint.js?v=1777172324201
GET /src/game/systems/ui/badge-ui-upgrade.js?v=1777172324201
GET /src/game/blockchain/badge-service.js?v=1777172324201
GET /src/game/blockchain/score-submission.js?v=1777172324201
GET /src/game/systems/ui/game-data-state.js?v=1777172324201
GET /src/game/systems/ui/loading-manager.js?v=1777172324201
GET /src/game/systems/ui/game-data-flow-loaders.js?v=1777172324201
GET /src/game/systems/ui/game-data-flow-badge.js?v=1777172324201
GET /src/game/systems/ui/game-data-flow-ui.js?v=1777172324201
GET /src/game/systems/ui/game-data-flow-modals.js?v=1777172324201
GET /src/game/systems/ui/game-data-flow-wallet.js?v=1777172324201
GET /src/game/systems/ui/game-data-flow-service.js?v=1777172324201
GET /src/game/audio/core/audio-context.js?v=1777172324201
GET /src/game/audio/settings/audio-settings.js?v=1777172324201
GET /src/game/audio/music/music-patterns.js?v=1777172324201
GET /src/game/audio/music/music-composer.js?v=1777172324201
GET /src/game/audio/music/music-manager.js?v=1777172324201
GET /src/game/audio/effects/sound-effects.js?v=1777172324201
GET /src/game/audio/utils/audio-buffer-generator.js?v=1777172324201
GET /src/game/audio/utils/audio-sample-loader.js?v=1777172324201
GET /src/game/audio/utils/audio-sample-config.js?v=1777172324201
GET /src/game/audio/audio-manager.js?v=1777172324201
GET /src/game/audio/audio-integration.js?v=1777172324201
○ Compiling /instrumentation ...
 ○ Compiling /instrumentation ...
 ✓ Compiled /instrumentation in 2.8s (329 modules)
✅ PriceConverter initialized
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] Anchor registry warmup attempt start {
  attempt: 1,
  senderPrefix: '0xccf281e7...',
  corridorAdminCapPrefix: '0x99615fc6...'
}
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/anchor/registry',
  method: 'POST',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'options',
  apiKeyPresent: true,
  requestId: 'req-mof6ithy-1uqq0j',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
 ✓ Ready in 13.5s
 ○ Compiling /api/game-config ...
[Tide cron] Instrumentation loaded {
  scheduledBy: 'instrumentation.ts',
  defaultCronMinutes: 2,
  firstRunDelayMs: 60000
}
[Tide cron] Scheduled every 2 minute(s).

[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/station?status=upcoming',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6ivve-n99hqn',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/station?status=active',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6ivvn-uh1dgk',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/game-results?limit=200',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6iwpx-sakcdg',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
○ Compiling /api/hydroscope/game-results ...
 ✓ Compiled /api/warmup in 9.7s (918 modules)
✅ PriceConverter initialized
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/game-config?source=wallet_min_req',
  pathname: '/api/game-config',
  requestId: 'req-mof6j35g-d5fhua',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [APP_CONFIG] READ (game→platform API): corridor identity mode { source: 'X-Corridor-Capability-Object-Id' }
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/aquifer/definitions/badge_discounts_and_thresholds%3A2974962a-77a3-4430-a731-45d31d087811',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j36t-emp58f',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] [STORE CATALOG] Starting completeness fetch sequence { traceId: 'sc-mof6j3c8-p68b8e', attempts: 5 }
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/gauge',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j3cc-ctt2f5',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/terminal/store-catalog',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j3ci-3rvbe7',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/station?status=upcoming',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j3cr-zio5f1',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/station?status=active',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j3cw-ddwkcw',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/aquifer/definitions',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j3d3-d1ytd3',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/game-results?limit=100',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j3da-2pij5i',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[GAME_BACKEND_PROXY] Forwarding config request to platform API {
  route: '/api/config',
  target: '/api/config',
  source: 'wallet_init',
  ecosystemId: '(default-from-env)',
  cache: 'miss',
  forceRefresh: false
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/estuary/connect',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j3f6-lfi4ib',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] StationService initialized for testnet
 ○ Compiling /api/stats/[address] ...
[WAKE][EVENTS] queryEvents(StatsBatchSubmitted) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  limit: 200,
  eventType: '0x96c0b42ec03792bd93c9b4d7374dc96266fb275524b953d7e5d87807e5e15fb3::wake::StatsBatchSubmitted'
}
[WAKE][EVENTS] queryEvents(StatsBatchSubmitted) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  limit: 100,
  eventType: '0x96c0b42ec03792bd93c9b4d7374dc96266fb275524b953d7e5d87807e5e15fb3::wake::StatsBatchSubmitted'
}
 GET /api/hydroscope/leaderboard?limit=200 200 in 7.2s (next.js: 5.7s, application-code: 1517ms)
✅ AdminWalletService initialized
   Admin Address: 0x82c5f024eb22ff85596eaf8b2ddb4c9c1623d205f3b2202e0ab4c94ecd97952c
   Testnet RPC: https://fullnode.testnet.sui.io:443
   Mainnet RPC: https://fullnode.mainnet.sui.io:443
[WAKE][EVENTS] queryEvents(StatsBatchSubmitted) result { count: 2, firstPlayerPrefix: '0x6e30e535', firstScore: 285 }
 GET /api/hydroscope/game-results?limit=100 200 in 1420ms (next.js: 10ms, application-code: 1410ms)
[PLATFORM] AnchorService initialized for testnet
[CONFIG] Using explicit localhost URL: http://localhost:3000
[WAKE][EVENTS] queryEvents(StatsBatchSubmitted) result { count: 2, firstPlayerPrefix: '0x6e30e535', firstScore: 285 }
 GET /api/hydroscope/game-results?limit=200 200 in 10.2s (next.js: 8.3s, application-code: 1915ms)
[CONFIG] Using explicit localhost URL: http://localhost:3000
 POST /api/anchor/registry 200 in 13.0s (next.js: 10.7s, application-code: 2.3s)
[PLATFORM] Anchor registry warmup: no transaction returned (assuming initialized) { attempt: 1 }
[PLATFORM] App registry found {
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x66f043071db067318ec0a09bfbfefe08af4a8c79885e195a63da7cdff68585de',
  isShared: true
}
 GET /api/station?status=active 200 in 2.4s (next.js: 8ms, application-code: 2.4s)
 GET /api/station?status=active 200 in 12.5s (next.js: 9.7s, application-code: 2.9s)
 GET /api/station?status=upcoming 200 in 12.6s (next.js: 9.7s, application-code: 2.9s)
 GET /api/station?status=upcoming 200 in 2.5s (next.js: 28ms, application-code: 2.5s)
[PLATFORM] 🏆 [TOURNAMENT GET ACTIVE] Retrieved active tournaments via platform service { count: 0, appId: '2974962a-77a3-4430-a731-45d31d087811' }
[PLATFORM] 🏆 [TOURNAMENT GET ACTIVE] Retrieved active tournaments via platform service { count: 0, appId: '2974962a-77a3-4430-a731-45d31d087811' }
○ Compiling /api/hydroscope/[address] ...
 ✓ Compiled /api/stats/[address] in 3.6s (939 modules)
✅ PriceConverter initialized
[GAME_BACKEND_PROXY] Forwarding config request to platform API {
  route: '/api/config',
  target: '/api/config',
  source: 'server_warmup',
  ecosystemId: '(default-from-env)',
  cache: 'miss',
  forceRefresh: false
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/estuary/connect',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j7gw-8699m7',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
 GET /api/menu/player-warm?address=0x0000000000000000000000000000000000000000000000000000000000000000&source=server_warmup 200 in 5681ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/tournaments/my-tournaments?playerAddress=0x0000000000000000000000000000000000000000000000000000000000000000&source=server_warmup',
  pathname: '/api/tournaments/my-tournaments',
  requestId: 'req-mof6j80i-h5ilim',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/station?status=active',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6j80m-oh7lvs',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
 GET /api/tournaments/enter?source=server_warmup 405 in 6089ms
✅ PriceConverter initialized
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/game-pass/0x0000000000000000000000000000000000000000000000000000000000000000?source=server_warmup',
  pathname: '/api/game-pass/0x0000000000000000000000000000000000000000000000000000000000000000',
  requestId: 'req-mof6japj-23olzy',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[TICKET-FLOW] game-pass route: zero address, returning empty without calling platform
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/game-pass/0x0000000000000000000000000000000000000000000000000000000000000000',
  duration: '3ms',
  requestId: 'req-mof6japj-23olzy',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/game-pass/0x0000000000000000000000000000000000000000000000000000000000000000?source=server_warmup 200 in 9116ms
✅ PriceConverter initialized
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/badges/0x0000000000000000000000000000000000000000000000000000000000000000?source=server_warmup',
  pathname: '/api/badges/0x0000000000000000000000000000000000000000000000000000000000000000',
  requestId: 'req-mof6jats-eyuasq',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/shipyard/has-badge?address=0x0000000000000000000000000000000000000000000000000000000000000000',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6jaty-vhz9pt',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
✅ PriceConverter initialized
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/inventory/0x0000000000000000000000000000000000000000000000000000000000000000?source=server_warmup',
  pathname: '/api/inventory/0x0000000000000000000000000000000000000000000000000000000000000000',
  requestId: 'req-mof6javt-4az29h',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/reservoir/holdings/0x0000000000000000000000000000000000000000000000000000000000000000',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6javx-7hc7ow',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
✅ PriceConverter initialized
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/stats/0x0000000000000000000000000000000000000000000000000000000000000000?source=server_warmup',
  pathname: '/api/stats/0x0000000000000000000000000000000000000000000000000000000000000000',
  requestId: 'req-mof6jaz2-pqi6f5',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [STATS API] request {
  requestId: undefined,
  address: '0x00000000…000000',
  refresh: false,
  reconcileFromEvents: false
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/0x0000000000000000000000000000000000000000000000000000000000000000',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6jaz6-z1dxp9',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[GAME_BACKEND_PROXY] Platform config response received { route: '/api/config', success: true, network: 'testnet' }
 GET /api/estuary/connect 200 in 19.8s (next.js: 19.3s, application-code: 545ms)
 GET /api/estuary/connect 200 in 15.0s (next.js: 14.5s, application-code: 549ms)
 GET /api/config?source=wallet_init 200 in 29958ms
[GAME_BACKEND_PROXY] Platform config response received { route: '/api/config', success: true, network: 'testnet' }
 GET /api/config?source=server_warmup 200 in 20191ms
✅ PriceConverter initialized
📊 [PRICE] Fetching prices (GeckoTerminal using token CAs from config)...
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/stockroom/offers',
  error: 'Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1039ms',
  requestId: 'req-mof6jj1h-d2vgyt'
}
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/provisions/catalog',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1122ms',
  requestId: 'req-mof6jj1v-kuuupd'
}
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/event-fee',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1124ms',
  requestId: 'req-mof6jj1x-y2oa5y'
}
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/tournament-fee',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1131ms',
  requestId: 'req-mof6jj1z-xm8kqv'
}
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/barometer/event-fee',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1133ms',
  requestId: 'req-mof6jj20-iyz81t'
}
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/exchange/event-fee',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1135ms',
  requestId: 'req-mof6jj21-x7eqv9'
}
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/vault-fee',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1139ms',
  requestId: 'req-mof6jj22-61fg2l'
}
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/gas-payment-address',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1145ms',
  requestId: 'req-mof6jj23-94im3v'
}
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/default-sustain-config',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1150ms',
  requestId: 'req-mof6jj24-ho1exo'
}
 GET /api/stockroom/offers?source=platform_server_warmup 401 in 20.2s (next.js: 18.5s, application-code: 1716ms)
 GET /api/provisions/catalog?source=platform_server_warmup 401 in 20.2s (next.js: 18.5s, application-code: 1634ms)
 GET /api/regatta/event-fee?source=platform_server_warmup 401 in 20.1s (next.js: 18.5s, application-code: 1633ms)
 GET /api/regatta/tournament-fee?source=platform_server_warmup 401 in 20.1s (next.js: 18.5s, application-code: 1632ms)
 GET /api/barometer/event-fee?source=platform_server_warmup 401 in 20.1s (next.js: 18.5s, application-code: 1630ms)
 GET /api/exchange/event-fee?source=platform_server_warmup 401 in 20.1s (next.js: 18.5s, application-code: 1631ms)
 GET /api/regatta/vault-fee?source=platform_server_warmup 401 in 20.1s (next.js: 18.5s, application-code: 1630ms)
 GET /api/regatta/gas-payment-address?source=platform_server_warmup 401 in 20.1s (next.js: 18.5s, application-code: 1630ms)
 GET /api/regatta/default-sustain-config?source=platform_server_warmup 401 in 20.1s (next.js: 18.5s, application-code: 1628ms)
📊 [PRICE] Fetching prices (GeckoTerminal using token CAs from config)...
[PLATFORM] StationService initialized for testnet
[PLATFORM] ChannelService (Aqueduct Channel) initialized {
  network: 'testnet',
  rpcUrl: 'https://sui-testnet-rpc.publicnode.com',
  channelRpcDistinct: true
}
[PLATFORM] ShipyardService initialized for testnet
 GET /api/hydroscope/leaderboard?limit=10&source=platform_server_warmup 200 in 20.5s (next.js: 18.4s, application-code: 2.0s)
[PLATFORM] Aquifer chain read: registry resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x6ab8579ad108c260ea17278c8a23e37e5f6cfbec1961790665847cee5e86a041',
  appsTableId: '0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217'
}
✅ AdminWalletService initialized
   Admin Address: 0x82c5f024eb22ff85596eaf8b2ddb4c9c1623d205f3b2202e0ab4c94ecd97952c
   Testnet RPC: https://fullnode.testnet.sui.io:443
   Mainnet RPC: https://fullnode.mainnet.sui.io:443
✅ [PRICE] SUI price from GeckoTerminal (native token): $0.9362
✅ [PRICE] SUI price from GeckoTerminal (native token): $0.9362
 GET /api/shipyard/has-badge?address=0x0000000000000000000000000000000000000000000000000000000000000000 200 in 12.5s (next.js: 10.0s, application-code: 2.5s)
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/badges/0x0000000000000000000000000000000000000000000000000000000000000000',
  duration: '12793ms',
  requestId: 'req-mof6jats-eyuasq',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/badges/0x0000000000000000000000000000000000000000000000000000000000000000?source=server_warmup 200 in 22060ms
[PLATFORM] Aquifer chain read: raw app-row (getDynamicFieldObject) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  rawPayload: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","owner":{"ObjectOwner":"0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217"},"previousTransaction":"APghotvGMRNbhS6iVWX87ywsJRY88NWCB8GnhTp87f5B","storageRebate":"3024800","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: raw object at storeTableId (before resolve) {
  storeTableId: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  objectType: '0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore>',
  rawContent: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: resolved Field → entries Table {
  from: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  to: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2'
}
✅ [PRICE] Prices fetched successfully: { sui: '$0.9362', mews: '$0.000018850', usdc: '$1.00' }
 GET /api/gauge?source=platform_server_warmup 200 in 21.2s (next.js: 18.5s, application-code: 2.8s)
✅ [PRICE] Prices fetched successfully: { sui: '$0.9362', mews: '$0.000018850', usdc: '$1.00' }
 GET /api/gauge 200 in 22.1s (next.js: 19.4s, application-code: 2.8s)
📊 [PRICE] Using platform Gauge
[PLATFORM] Aquifer chain read: raw getDynamicFields(storeTableId) {
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  rawResponse: '{"data":"[array 17]","note":"aggregated pages"}',
  fieldCount: 17
}
[PLATFORM] Aquifer chain read: entries table resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  dynamicFieldCount: 17
}
 GET /api/helm 200 in 22.4s (next.js: 19.4s, application-code: 3.0s)
[PLATFORM] Aquifer chain read: success {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  definitionCount: 17,
  keys: [
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
    'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
    'milestone_definitions'
  ]
}
[PLATFORM] Aquifer GET definitions: identity from request context; result {
  result: {
    definitionCount: 17,
    keys: [
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
      'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
      'milestone_definitions'
    ]
  }
}
 GET /api/aquifer/definitions 200 in 22.3s (next.js: 19.3s, application-code: 3.0s)
 GET /api/helm?source=platform_server_warmup 200 in 22.6s (next.js: 18.5s, application-code: 4.1s)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/aquifer/definitions/badge_discounts_and_thresholds',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '4ms',
  requestId: 'req-mof6jlvw-yw57iq'
}
 GET /api/aquifer/definitions/badge_discounts_and_thresholds?source=platform_server_warmup 401 in 22.5s (next.js: 22.4s, application-code: 49ms)
[PLATFORM] Reservoir holdings: fetching {
  address: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  twoLevel: true
}
[PLATFORM] TerminalService initialized for testnet
[PLATFORM] Reservoir holdings: resolved corridor cap for app-scoped lookup {
  address: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  hasEcosystemRegistry: true,
  capIdPrefix: '0x240bd81ef3...'
}
[STORE] ReservoirService initialized for testnet
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/reservoir/holdings/0x0000000000000000000000000000000000000000000000000000000000000000',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '21ms',
  requestId: 'req-mof6jlx7-3g3hat'
}
 GET /api/reservoir/holdings/0x0000000000000000000000000000000000000000000000000000000000000000?contract=new&source=platform_server_warmup 401 in 22.5s (next.js: 22.5s, application-code: 58ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/reservoir/0x0000000000000000000000000000000000000000000000000000000000000000',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '3ms',
  requestId: 'req-mof6jm0z-lis511'
}
 GET /api/reservoir/0x0000000000000000000000000000000000000000000000000000000000000000?contract=new&source=platform_server_warmup 401 in 22.7s (next.js: 22.6s, application-code: 24ms)
[PLATFORM] App registry found {
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x66f043071db067318ec0a09bfbfefe08af4a8c79885e195a63da7cdff68585de',
  isShared: true
}
[PLATFORM] Aquifer chain read: registry resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x6ab8579ad108c260ea17278c8a23e37e5f6cfbec1961790665847cee5e86a041',
  appsTableId: '0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217'
}
 GET /api/station?status=active 200 in 17.3s (next.js: 12.9s, application-code: 4.4s)
[PLATFORM] 🏆 [PLAYER ENTERED] Found tournaments player has entered {
  playerAddress: '0x0000000000000000000000000000000000000000000000000000000000000000',
  tournamentIds: [],
  count: 0
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/tournaments/my-tournaments',
  duration: '18389ms',
  requestId: 'req-mof6j80i-h5ilim',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/tournaments/my-tournaments?playerAddress=0x0000000000000000000000000000000000000000000000000000000000000000&source=server_warmup 200 in 24155ms
[PLATFORM] Aquifer chain read: raw app-row (getDynamicFieldObject) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  rawPayload: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","owner":{"ObjectOwner":"0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217"},"previousTransaction":"APghotvGMRNbhS6iVWX87ywsJRY88NWCB8GnhTp87f5B","storageRebate":"3024800","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
 GET /api/reservoir/holdings/0x0000000000000000000000000000000000000000000000000000000000000000 200 in 14.3s (next.js: 13.9s, application-code: 417ms)
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/inventory/0x0000000000000000000000000000000000000000000000000000000000000000',
  duration: '14702ms',
  requestId: 'req-mof6javt-4az29h',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/inventory/0x0000000000000000000000000000000000000000000000000000000000000000?source=server_warmup 200 in 24034ms
[PLATFORM] Aquifer chain read: raw object at storeTableId (before resolve) {
  storeTableId: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  objectType: '0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore>',
  rawContent: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: resolved Field → entries Table {
  from: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  to: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2'
}
 GET /api/badges/0x0000000000000000000000000000000000000000000000000000000000000000?source=platform_server_warmup 404 in 23.0s (next.js: 21.7s, application-code: 1329ms)
 GET /api/game-pass/0x0000000000000000000000000000000000000000000000000000000000000000?contract=new&source=platform_server_warmup 404 in 23.0s (next.js: 21.7s, application-code: 1337ms)
[PLATFORM] Aquifer chain read: raw getDynamicFields(storeTableId) {
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  rawResponse: '{"data":"[array 17]","note":"aggregated pages"}',
  fieldCount: 17
}
[PLATFORM] Aquifer chain read: entries table resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  dynamicFieldCount: 17
}
[PLATFORM] Aquifer chain read: success {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  definitionCount: 17,
  keys: [
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
    'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
    'milestone_definitions'
  ]
}
 GET /api/aquifer/definitions/badge_discounts_and_thresholds%3A2974962a-77a3-4430-a731-45d31d087811 200 in 23.9s (next.js: 23.3s, application-code: 642ms)
 GET /api/hydroscope/0x0000000000000000000000000000000000000000000000000000000000000000?source=platform_server_warmup 200 in 23.3s (next.js: 22.6s, application-code: 766ms)
 GET /api/warmup?source=platform_server_warmup&dummyAddress=0x0000000000000000000000000000000000000000000000000000000000000000&leaderboardLimit=10 200 in 30.5s (next.js: 5.7s, application-code: 24.8s)
 GET /api/hydroscope/0x0000000000000000000000000000000000000000000000000000000000000000 200 in 14.9s (next.js: 14.0s, application-code: 853ms)
[PLATFORM] [STATS API] resolved (wake aggregate) {
  requestId: undefined,
  address: '0x00000000…000000',
  totalGames: 0,
  totals: {
    totalScore: 0,
    totalDistance: 0,
    totalCoins: 0,
    totalBossesDefeated: 0,
    totalEnemiesDefeated: 0,
    totalCoinStreak: 0
  }
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/stats/0x0000000000000000000000000000000000000000000000000000000000000000',
  duration: '15111ms',
  requestId: 'req-mof6jaz2-pqi6f5',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/stats/0x0000000000000000000000000000000000000000000000000000000000000000?source=server_warmup 200 in 24572ms
[PLATFORM] Stockroom offers read: loaded from chain {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  offerCount: 28
}
 GET /api/stockroom/offers 200 in 24.7s (next.js: 19.4s, application-code: 5.3s)
[PLATFORM] [APP_CONFIG] Packs/ticket bundles loaded from Stockroom { packCount: 4, ticketBundleCount: 3 }
[PLATFORM] Provisions catalog read: loaded from chain {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  itemCount: 9
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/game-config',
  duration: '25376ms',
  requestId: 'req-mof6j35g-d5fhua',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/game-config?source=wallet_min_req 200 in 36976ms
[PLATFORM] Stockroom offers read: loaded from chain {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  offerCount: 28
}
[PLATFORM] Terminal store-catalog {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  definitionCount: 9,
  stockroomSkuCount: 28,
  storeReady: true
}
 GET /api/terminal/store-catalog 200 in 24.7s (next.js: 19.4s, application-code: 5.3s)
[PLATFORM] [STORE CATALOG] Fresh payload fetched {
  totalElapsedMs: 25201,
  pricesFetchElapsedMs: 22650,
  terminalFetchElapsedMs: 25193,
  payloadAssemblyElapsedMs: 8,
  itemCount: 9,
  offerCount: 28,
  bundleAndPackSkuCount: 13,
  offerOrderPresent: true,
  offerOrderCount: 18,
  offerOrderPreview: [
    'extra_lives:l1',
    'orb_level:l1',
    'force_field:l1',
    'coin_tractor_beam:l1',
    'slow_time:l1',
    'destroy_all',
    'boss_kill_shot',
    'credits',
    'credit_pack_11',
    'credit_pack_60',
    'credit_pack_125',
    'credit_pack_275'
  ],
  terminalStoreReady: true,
  terminalMissing: [],
  terminalDefinitionCount: 9,
  catalogContentHashSlice: null
}
[PLATFORM] [STORE CATALOG] Attempt result {
  traceId: 'sc-mof6j3c8-p68b8e',
  attempt: 1,
  complete: true,
  elapsedMs: 25206,
  itemCount: 9,
  offerCount: 28,
  hasSingles: { credits: true, tickets: true },
  missingCoreIds: [],
  levelCounts: {
    extra_lives: 3,
    force_field: 3,
    orb_level: 3,
    coin_tractor_beam: 3,
    slow_time: 3
  },
  underleveled: []
}
[PLATFORM] [BOOTSTRAP] Menu bootstrap collected {
  milestonesOk: true,
  storeOk: true,
  tournamentsOk: true,
  leaderboardOk: true,
  gameConfigOk: true,
  ready: true,
  storeServedFromCache: false,
  tournamentsServedFromCache: false,
  gameConfigServedFromCache: false,
  milestonesServedFromCache: false,
  leaderboardServedFromCache: false
}
 GET /api/menu/bootstrap?ts=1777172320102 200 in 37085ms
 GET /api/menu/bootstrap?source=server_warmup 200 in 24978ms
[CONFIG] Using explicit localhost URL: http://localhost:3000
GET /assets/Music/GameLoops/Chillstep_2.wav
📊 [PRICE] Using cached prices
 GET /api/gauge?source=game_server_warmup 200 in 24ms (next.js: 8ms, application-code: 16ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/stockroom/offers',
  error: 'Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1ms',
  requestId: 'req-mof6jn2d-0yj8wp'
}
 GET /api/stockroom/offers?source=game_server_warmup 401 in 25ms (next.js: 9ms, application-code: 16ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/event-fee',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1ms',
  requestId: 'req-mof6jn3u-0anvwy'
}
 GET /api/regatta/event-fee?source=game_server_warmup 401 in 22ms (next.js: 7ms, application-code: 15ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/provisions/catalog',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1ms',
  requestId: 'req-mof6jnaw-218vh3'
}
 GET /api/provisions/catalog?source=game_server_warmup 401 in 20ms (next.js: 5ms, application-code: 15ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/tournament-fee',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1ms',
  requestId: 'req-mof6jnc3-wsjpc7'
}
 GET /api/regatta/tournament-fee?source=game_server_warmup 401 in 20ms (next.js: 5ms, application-code: 14ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/vault-fee',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1ms',
  requestId: 'req-mof6jnco-hwvjoy'
}
 GET /api/regatta/vault-fee?source=game_server_warmup 401 in 19ms (next.js: 7ms, application-code: 12ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/gas-payment-address',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1ms',
  requestId: 'req-mof6jnd8-3hwcqo'
}
 GET /api/regatta/gas-payment-address?source=game_server_warmup 401 in 19ms (next.js: 6ms, application-code: 13ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/regatta/default-sustain-config',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1ms',
  requestId: 'req-mof6jnds-6ml6eo'
}
 GET /api/regatta/default-sustain-config?source=game_server_warmup 401 in 18ms (next.js: 5ms, application-code: 13ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/reservoir/0x0000000000000000000000000000000000000000000000000000000000000000',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '2ms',
  requestId: 'req-mof6jnjd-311a5y'
}
 GET /api/reservoir/0x0000000000000000000000000000000000000000000000000000000000000000?contract=new&source=game_server_warmup 401 in 50ms (next.js: 31ms, application-code: 20ms)
[PLATFORM ERROR] API request failed (PlatformError) {
  method: 'GET',
  pathname: '/api/reservoir/holdings/0x0000000000000000000000000000000000000000000000000000000000000000',
  error: 'Unauthorized. Valid API key for this ecosystem required.',
  code: 'UNAUTHORIZED',
  duration: '1ms',
  requestId: 'req-mof6jnks-sxe2fx'
}
 GET /api/reservoir/holdings/0x0000000000000000000000000000000000000000000000000000000000000000?contract=new&source=game_server_warmup 401 in 47ms (next.js: 30ms, application-code: 18ms)
 GET /api/game-pass/0x0000000000000000000000000000000000000000000000000000000000000000?contract=new&source=game_server_warmup 404 in 675ms (next.js: 12ms, application-code: 662ms)
 GET /api/badges/0x0000000000000000000000000000000000000000000000000000000000000000?source=game_server_warmup 404 in 588ms (next.js: 9ms, application-code: 578ms)
 GET /api/helm?source=game_server_warmup 200 in 933ms (next.js: 7ms, application-code: 926ms)
 GET /api/hydroscope/0x0000000000000000000000000000000000000000000000000000000000000000?source=game_server_warmup 200 in 578ms (next.js: 29ms, application-code: 550ms)
 GET /api/hydroscope/leaderboard?limit=10&source=game_server_warmup 200 in 795ms (next.js: 7ms, application-code: 788ms)
 POST /api/warmup?source=game_server_warmup 200 in 1424ms (next.js: 143ms, application-code: 1281ms)
[PLATFORM] [WARMUP] Completed warm fan-out {
  okCount: 8,
  total: 9,
  elapsedMs: 26798,
  dummyAddressShort: '0x00000000…',
  platformWarmAttempted: true,
  platformWarmOk: true
}
 GET /api/warmup?source=server_warmup&dummyAddress=0x0000000000000000000000000000000000000000000000000000000000000000&limit=10&platform=1 200 in 34487ms
 ○ Compiling /api/tournaments ...
 ✓ Compiled /api/tournaments in 2.8s (933 modules)
✅ PriceConverter initialized
 OPTIONS /api/menu/player-warm?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 204 in 3063ms
 OPTIONS /api/menu/player-warm?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 204 in 4233ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/tournaments/my-tournaments?playerAddress=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/tournaments/my-tournaments',
  requestId: 'req-mof6jxpl-gd1ryp',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/station?status=active',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6jxpy-dys57w',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
 OPTIONS /api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new&_refresh=1 204 in 4386ms
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
 OPTIONS /api/badges/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?includePendingUpgrade=1 204 in 4491ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/tournaments?playerAddress=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/tournaments',
  requestId: 'req-mof6jy17-q9fi3j',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/station?status=upcoming',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6jy1c-7cg1qe',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
 GET /api/station?status=active 200 in 313ms (next.js: 7ms, application-code: 306ms)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6jyax-hhwrif',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[TICKET-FLOW] platform getGamePassStatus: parallel reservoir + ticket-units {
  path: 'api/reservoir/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new',
  playerAddress: '0x6e30e535...'
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/reservoir/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6jyax-hhwrif',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/reservoir/ticket-units/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6jyax-hhwrif',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] 🏆 [PLAYER ENTERED] Found tournaments player has entered {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  tournamentIds: [],
  count: 0
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/tournaments/my-tournaments',
  duration: '808ms',
  requestId: 'req-mof6jxpl-gd1ryp',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/tournaments/my-tournaments?playerAddress=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 5137ms
[PLATFORM] Fetching reservoir status {
  address: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  url: 'http://localhost:3000/api/reservoir/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new'
}
[STORE] ReservoirService initialized for testnet
[STORE] Querying reservoir status for 0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 {
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  useEcosystemOrTwoLevel: true
}
 GET /api/station?status=upcoming 200 in 578ms (next.js: 9ms, application-code: 569ms)
[PLATFORM] 🏆 [TOURNAMENT GET ACTIVE] Retrieved active tournaments via platform service { count: 0, appId: '2974962a-77a3-4430-a731-45d31d087811' }
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/tournaments',
  duration: '701ms',
  requestId: 'req-mof6jy17-q9fi3j',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/tournaments?playerAddress=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 5459ms
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new&_refresh=1',
  pathname: '/api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  requestId: 'req-mof6jymv-038hgc',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[TICKET-FLOW] game-pass route: calling platform { address: '0x6e30e535...', contract: 'new' }
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/badges/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?includePendingUpgrade=1',
  pathname: '/api/badges/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  requestId: 'req-mof6jynm-hwhaz7',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/shipyard/has-badge?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6jynq-1ky85x',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[STORE] Reservoir status loaded {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  balance: 4,
  itemCount: 13,
  hasPass: true
}
 GET /api/reservoir/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new 200 in 1999ms (next.js: 41ms, application-code: 1957ms)
 GET /api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 2.5s (next.js: 36ms, application-code: 2.5s)
✅ PriceConverter initialized
✅ PriceConverter initialized
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
○ Compiling /api/shipyard/has-badge ...
[PLATFORM] StationService initialized for testnet
[PLATFORM] ChannelService (Aqueduct Channel) initialized {
  network: 'testnet',
  rpcUrl: 'https://sui-testnet-rpc.publicnode.com',
  channelRpcDistinct: true
}
[PLATFORM] ShipyardService initialized for testnet
[Tide][Sonar] Master event registry getObject {
  id: '0x5734bd3b3502eba34df24e9ed7248213167f0e5b7aabd9fd2f5d20eb275b3790',
  success: true,
  hasData: true
}
[Tide][Sonar] Master registry parsed {
  ecosystemsTableId: '0x8e532a2c95860eb34b4b09363fb9b760a4b582116d9ac3c939de02fc7b23960a'
}
[Tide][Sonar] Master ecosystems table getDynamicFields {
  parentId: '0x8e532a2c95860eb34b4b09363fb9b760a4b582116d9ac3c939de02fc7b23960a',
  success: true,
  ecosystemCount: 2
}
[Tide][Sonar] Master getDynamicFields raw (first ecosystem) {
  ecosystemId: 'a7f3c91e-4b2d-4a8e-9f1c-6e0d5b3a2c84',
  dataTopLevelKeys: [ 'data', 'nextCursor', 'hasNextPage' ],
  firstKeyValueType: 'array',
  firstKeyArrayLength: 1,
  firstElementKeys: [
    'name',
    'bcsEncoding',
    'bcsName',
    'type',
    'objectType',
    'objectId',
    'version',
    'digest'
  ]
}
[Tide][Sonar] Master per-ecosystem {
  ecosystemId: 'a7f3c91e-4b2d-4a8e-9f1c-6e0d5b3a2c84',
  innerTableId: '0xc520b94435ed44f8dddf47a302d195ee2bebb11a4b74d392abbcfa0b51f957ee',
  getAppFieldsSuccess: true,
  appFieldCount: 1
}
 GET /api/shipyard/has-badge?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 12.8s (next.js: 9.2s, application-code: 3.5s)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] GameConfigService initialized (platform app-config only)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [APP_CONFIG] READ (game→platform API): corridor identity mode { source: 'X-Corridor-Capability-Object-Id' }
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/aquifer/definitions/badge_discounts_and_thresholds%3A2974962a-77a3-4430-a731-45d31d087811',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6k8n7-73scqw',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/sonar/batch',
  method: 'POST',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6k8ni-b4t1k9',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Fetching ticket units for player {
  address: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0'
}
[STORE] ReservoirService initialized for testnet
[STORE] Querying reservoir status for 0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 {
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  useEcosystemOrTwoLevel: true
}
[Tide][Sonar] Master per-ecosystem {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  innerTableId: '0x579e7018e68eb2f3cc85585f2c5204e5244a6785d844056851b8e02418ecb5d5',
  getAppFieldsSuccess: true,
  appFieldCount: 1
}
[Tide][Sonar] Master registry result {
  source: 'on-chain (Sonar)',
  corridorCount: 2,
  corridors: [
    {
      ecosystemId: 'a7f3c91e-4b2d-4a8e-9f1c-6e0d5b3a2c84',
      appId: 'd2e8f4a1-5c3b-4d9e-8a7f-1b0c9e6d4a32'
    },
    {
      ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
      appId: '2974962a-77a3-4430-a731-45d31d087811'
    }
  ]
}
✅ AdminWalletService initialized
   Admin Address: 0x82c5f024eb22ff85596eaf8b2ddb4c9c1623d205f3b2202e0ab4c94ecd97952c
   Testnet RPC: https://fullnode.testnet.sui.io:443
   Mainnet RPC: https://fullnode.mainnet.sui.io:443
[STORE] Reservoir status loaded {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  balance: 4,
  itemCount: 13,
  hasPass: true
}
[PLATFORM] App registry found {
  appId: 'd2e8f4a1-5c3b-4d9e-8a7f-1b0c9e6d4a32',
  registryId: '0x47f2f05cbc2a258fffdb904bafcbbe4a1db2d9ed73a227f25a4ea203e02cb0c6',
  isShared: true
}
 GET /api/helm 200 in 2.5s (next.js: 79ms, application-code: 2.5s)
[STORE] Found item unit IDs from Reservoir items {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  count: 13,
  unitIds: [
    14, 12,  8, 10, 13, 16,
     7,  9, 17, 19, 15, 11,
    18
  ]
}
[STORE] Found available item unit IDs {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  count: 13,
  unitIds: [
    14, 12,  8, 10, 13, 16,
     7,  9, 17, 19, 15, 11,
    18
  ]
}
○ Compiling /api/aquifer/definitions/[key] ...
 GET /api/reservoir/ticket-units/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 16.5s (next.js: 13.5s, application-code: 3.0s)
[TICKET-FLOW] platform reservoir response {
  success: true,
  balance: 4,
  itemCount: 13,
  ticketCount: 13,
  hasPass: true
}
[TICKET-FLOW] merge ticket-units into reservoir status { unitsCount: 13, reportedCount: 13, finalTicketCount: 13 }
[TICKET-FLOW] platform getGamePassStatus: returning { ticketCount: 13, gamesRemaining: 4 }
[PLATFORM] App registry found {
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x66f043071db067318ec0a09bfbfefe08af4a8c79885e195a63da7cdff68585de',
  isShared: true
}
[TICKET-FLOW] game-pass route: platform result {
  address: '0x6e30e535...',
  ticketCount: 13,
  gamesRemaining: 4,
  hasPass: true
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  duration: '16375ms',
  requestId: 'req-mof6jymv-038hgc',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new&_refresh=1 200 in 17052ms
 GET /api/menu/player-warm?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 17146ms
 GET /api/menu/player-warm?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 17143ms
 OPTIONS /api/stats/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 204 in 442ms
 OPTIONS /api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new&_refresh=1 204 in 449ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/stats/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/stats/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  requestId: 'req-mof6kbzq-a6w8jk',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [STATS API] request {
  requestId: undefined,
  address: '0x6e30e535…5459f0',
  refresh: false,
  reconcileFromEvents: false
}
[PLATFORM] [STATS API] resolved (wake aggregate) {
  requestId: undefined,
  address: '0x6e30e535…5459f0',
  totalGames: 2,
  totals: {
    totalScore: 540,
    totalDistance: 6590,
    totalCoins: 7,
    totalBossesDefeated: 0,
    totalEnemiesDefeated: 36,
    totalCoinStreak: 3
  }
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/stats/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  duration: '6ms',
  requestId: 'req-mof6kbzq-a6w8jk',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/stats/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 407ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new&_refresh=1',
  pathname: '/api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  requestId: 'req-mof6kc2i-bf2nm7',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[TICKET-FLOW] game-pass route: calling platform { address: '0x6e30e535...', contract: 'new' }
[CONFIG] Using explicit localhost URL: http://localhost:3000
[TICKET-FLOW] platform getGamePassStatus: parallel reservoir + ticket-units {
  path: 'api/reservoir/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new',
  playerAddress: '0x6e30e535...'
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/reservoir/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kc2m-ac165b',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/reservoir/ticket-units/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kc2m-ac165b',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Stockroom offers read: loaded from chain {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  offerCount: 28
}
 GET /api/stockroom/offers 200 in 4.8s (next.js: 72ms, application-code: 4.8s)
[PLATFORM] Upcoming-to-active executor complete { triggered: 0, errors: 1 }
✅ PriceConverter initialized
✅ PriceConverter initialized
[PLATFORM] Fetching ticket units for player {
  address: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0'
}
[PLATFORM] ChannelService (Aqueduct Channel) initialized {
  network: 'testnet',
  rpcUrl: 'https://sui-testnet-rpc.publicnode.com',
  channelRpcDistinct: true
}
[STORE] ReservoirService initialized for testnet
[STORE] Querying reservoir status for 0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 {
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  useEcosystemOrTwoLevel: true
}
[PLATFORM] Fetching reservoir status {
  address: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  url: 'http://localhost:3000/api/reservoir/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new'
}
[STORE] ReservoirService initialized for testnet
[STORE] Querying reservoir status for 0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 {
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  useEcosystemOrTwoLevel: true
}
[PLATFORM] Aquifer chain read: registry resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x6ab8579ad108c260ea17278c8a23e37e5f6cfbec1961790665847cee5e86a041',
  appsTableId: '0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217'
}
 POST /api/sonar/batch 200 in 8.2s (next.js: 7.7s, application-code: 479ms)
[PLATFORM] Aquifer chain read: raw app-row (getDynamicFieldObject) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  rawPayload: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","owner":{"ObjectOwner":"0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217"},"previousTransaction":"APghotvGMRNbhS6iVWX87ywsJRY88NWCB8GnhTp87f5B","storageRebate":"3024800","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: raw object at storeTableId (before resolve) {
  storeTableId: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  objectType: '0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore>',
  rawContent: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: resolved Field → entries Table {
  from: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  to: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2'
}
[PLATFORM] Aquifer chain read: raw getDynamicFields(storeTableId) {
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  rawResponse: '{"data":"[array 17]","note":"aggregated pages"}',
  fieldCount: 17
}
[PLATFORM] Aquifer chain read: entries table resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  dynamicFieldCount: 17
}
 ○ Compiling /api/achievements/progress ...
[STORE] Reservoir status loaded {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  balance: 4,
  itemCount: 13,
  hasPass: true
}
[PLATFORM] Aquifer chain read: success {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  definitionCount: 17,
  keys: [
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
    'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
    'milestone_definitions'
  ]
}
 GET /api/aquifer/definitions/badge_discounts_and_thresholds%3A2974962a-77a3-4430-a731-45d31d087811 200 in 8.4s (next.js: 7.7s, application-code: 740ms)
[STORE] Reservoir status loaded {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  balance: 4,
  itemCount: 13,
  hasPass: true
}
 GET /api/reservoir/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new 200 in 4.0s (next.js: 3.3s, application-code: 756ms)
[PLATFORM] [APP_CONFIG] Packs/ticket bundles loaded from Stockroom { packCount: 4, ticketBundleCount: 3 }
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/badges/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  duration: '21738ms',
  requestId: 'req-mof6jynm-hwhaz7',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/badges/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?includePendingUpgrade=1 200 in 22431ms
GET /Badges/Standard.webp
[STORE] Found item unit IDs from Reservoir items {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  count: 13,
  unitIds: [
    14, 12,  8, 10, 13, 16,
     7,  9, 17, 19, 15, 11,
    18
  ]
}
[STORE] Found available item unit IDs {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  count: 13,
  unitIds: [
    14, 12,  8, 10, 13, 16,
     7,  9, 17, 19, 15, 11,
    18
  ]
}
 GET /api/reservoir/ticket-units/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 5.1s (next.js: 3.3s, application-code: 1861ms)
[TICKET-FLOW] platform reservoir response {
  success: true,
  balance: 4,
  itemCount: 13,
  ticketCount: 13,
  hasPass: true
}
[TICKET-FLOW] merge ticket-units into reservoir status { unitsCount: 13, reportedCount: 13, finalTicketCount: 13 }
[TICKET-FLOW] platform getGamePassStatus: returning { ticketCount: 13, gamesRemaining: 4 }
[TICKET-FLOW] game-pass route: platform result {
  address: '0x6e30e535...',
  ticketCount: 13,
  gamesRemaining: 4,
  hasPass: true
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  duration: '5595ms',
  requestId: 'req-mof6kc2i-bf2nm7',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/game-pass/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new&_refresh=1 200 in 5956ms
 ✓ Compiled /api/insignia/[address]/sync-tier in 4.5s (941 modules)
[PLATFORM] Tide cycle complete {
  triggered: 0,
  upcomingToActiveTriggered: 0,
  endEventTriggered: 0,
  moveToPastTriggered: 0,
  distributionScheduled: 0,
  distributionTriggered: 0,
  errors: 1
}
[Tide] Corridors for bucket counts { source: 'master_registry', count: 2, hint: undefined }
✅ PriceConverter initialized
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/game-config',
  pathname: '/api/game-config',
  requestId: 'req-mof6kjaw-s4xa6q',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[PUBLIC] /api/game-config missing source tag {
  route: '/api/game-config',
  referer: 'http://localhost:8000/',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  secFetchDest: 'empty',
  secFetchMode: 'cors',
  secFetchSite: 'same-site'
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [APP_CONFIG] READ (game→platform API): corridor identity mode { source: 'X-Corridor-Capability-Object-Id' }
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/aquifer/definitions/badge_discounts_and_thresholds%3A2974962a-77a3-4430-a731-45d31d087811',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kjbj-sgc0py',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/inventory/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new',
  pathname: '/api/inventory/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  requestId: 'req-mof6kje2-0r4q9i',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/reservoir/holdings/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kje7-sfvqfv',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Aquifer chain read: registry resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x6ab8579ad108c260ea17278c8a23e37e5f6cfbec1961790665847cee5e86a041',
  appsTableId: '0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217'
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] Aquifer chain read: raw app-row (getDynamicFieldObject) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  rawPayload: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","owner":{"ObjectOwner":"0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217"},"previousTransaction":"APghotvGMRNbhS6iVWX87ywsJRY88NWCB8GnhTp87f5B","storageRebate":"3024800","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: raw object at storeTableId (before resolve) {
  storeTableId: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  objectType: '0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore>',
  rawContent: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: resolved Field → entries Table {
  from: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  to: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2'
}
[PLATFORM] Aquifer chain read: raw getDynamicFields(storeTableId) {
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  rawResponse: '{"data":"[array 17]","note":"aggregated pages"}',
  fieldCount: 17
}
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/achievements/progress',
  requestId: 'req-mof6kjls-odea6x',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[PLATFORM] Aquifer chain read: entries table resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  dynamicFieldCount: 17
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kjm4-6mfk6g',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Aquifer chain read: success {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  definitionCount: 17,
  keys: [
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
    'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
    'milestone_definitions'
  ]
}
 GET /api/aquifer/definitions/badge_discounts_and_thresholds%3A2974962a-77a3-4430-a731-45d31d087811 200 in 824ms (next.js: 29ms, application-code: 795ms)
 GET /api/helm 200 in 637ms (next.js: 171ms, application-code: 466ms)
 ○ Compiling /api/leaderboard ...
 ✓ Compiled /api/leaderboard in 1504ms (943 modules)
✅ PriceConverter initialized
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/leaderboard?limit=200',
  pathname: '/api/leaderboard',
  requestId: 'req-mof6klu0-y2lg9u',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/game-results?limit=200',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6klu5-0rel5d',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
✅ PriceConverter initialized
✅ PriceConverter initialized
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request received {
  method: 'POST',
  url: 'http://localhost:3001/api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0/sync-tier',
  pathname: '/api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0/sync-tier',
  requestId: 'req-mof6kmb6-pr7f68',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[PLATFORM] API request received {
  method: 'POST',
  url: 'http://localhost:3001/api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0/sync-tier',
  pathname: '/api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0/sync-tier',
  requestId: 'req-mof6kmb8-lnp9xz',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/shipyard/has-badge?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kmbf-l8wlb0',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/shipyard/has-badge?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kmbk-axx9wb',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Reservoir holdings: fetching {
  address: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  twoLevel: true
}
[PLATFORM] ChannelService (Aqueduct Channel) initialized {
  network: 'testnet',
  rpcUrl: 'https://sui-testnet-rpc.publicnode.com',
  channelRpcDistinct: true
}
[PLATFORM] TerminalService initialized for testnet
[PLATFORM] Reservoir holdings: resolved corridor cap for app-scoped lookup {
  address: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  hasEcosystemRegistry: true,
  capIdPrefix: '0x240bd81ef3...'
}
[STORE] ReservoirService initialized for testnet
[PLATFORM] Stockroom offers read: loaded from chain {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  offerCount: 28
}
 GET /api/stockroom/offers 200 in 5.0s (next.js: 156ms, application-code: 4.8s)
[PLATFORM] [APP_CONFIG] Packs/ticket bundles loaded from Stockroom { packCount: 4, ticketBundleCount: 3 }
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/game-config',
  duration: '5447ms',
  requestId: 'req-mof6kjaw-s4xa6q',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/game-config 200 in 10384ms
 OPTIONS /api/leaderboard?limit=200 204 in 196ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/game-config',
  pathname: '/api/game-config',
  requestId: 'req-mof6knug-5uc7mb',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[PUBLIC] /api/game-config missing source tag {
  route: '/api/game-config',
  referer: 'http://localhost:8000/',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  secFetchDest: 'empty',
  secFetchMode: 'cors',
  secFetchSite: 'same-site'
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [APP_CONFIG] READ (game→platform API): corridor identity mode { source: 'X-Corridor-Capability-Object-Id' }
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/aquifer/definitions/badge_discounts_and_thresholds%3A2974962a-77a3-4430-a731-45d31d087811',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6knuw-zzaqhu',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
 GET /api/reservoir/holdings/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new 200 in 5.2s (next.js: 4.2s, application-code: 1007ms)
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/inventory/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  duration: '6055ms',
  requestId: 'req-mof6kje2-0r4q9i',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/inventory/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?contract=new 200 in 10741ms
 GET /api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 6.0s (next.js: 4.2s, application-code: 1802ms)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/aquifer/definitions',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kooj-vu1h1h',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[WAKE][EVENTS] queryEvents(StatsBatchSubmitted) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  limit: 200,
  eventType: '0x96c0b42ec03792bd93c9b4d7374dc96266fb275524b953d7e5d87807e5e15fb3::wake::StatsBatchSubmitted'
}
[PLATFORM] ChannelService (Aqueduct Channel) initialized {
  network: 'testnet',
  rpcUrl: 'https://sui-testnet-rpc.publicnode.com',
  channelRpcDistinct: true
}
[PLATFORM] ShipyardService initialized for testnet
[WAKE][EVENTS] queryEvents(StatsBatchSubmitted) result { count: 2, firstPlayerPrefix: '0x6e30e535', firstScore: 285 }
 GET /api/hydroscope/game-results?limit=200 200 in 7.3s (next.js: 7.0s, application-code: 324ms)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/leaderboard',
  duration: '7818ms',
  requestId: 'req-mof6klu0-y2lg9u',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/leaderboard?limit=200 200 in 10329ms
[PLATFORM] Aquifer chain read: registry resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x6ab8579ad108c260ea17278c8a23e37e5f6cfbec1961790665847cee5e86a041',
  appsTableId: '0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217'
}
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/leaderboard?limit=200',
  pathname: '/api/leaderboard',
  requestId: 'req-mof6krzz-0j8d4w',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/leaderboard',
  duration: '1ms',
  requestId: 'req-mof6krzz-0j8d4w',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/leaderboard?limit=200 200 in 166ms
[PLATFORM] Aquifer chain read: registry resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x6ab8579ad108c260ea17278c8a23e37e5f6cfbec1961790665847cee5e86a041',
  appsTableId: '0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217'
}
 GET /api/shipyard/has-badge?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 6.0s (next.js: 5.3s, application-code: 672ms)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/sonar/batch',
  method: 'POST',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6ks46-e6tre6',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Aquifer chain read: raw app-row (getDynamicFieldObject) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  rawPayload: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","owner":{"ObjectOwner":"0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217"},"previousTransaction":"APghotvGMRNbhS6iVWX87ywsJRY88NWCB8GnhTp87f5B","storageRebate":"3024800","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: raw app-row (getDynamicFieldObject) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  rawPayload: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","owner":{"ObjectOwner":"0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217"},"previousTransaction":"APghotvGMRNbhS6iVWX87ywsJRY88NWCB8GnhTp87f5B","storageRebate":"3024800","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: raw object at storeTableId (before resolve) {
  storeTableId: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  objectType: '0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore>',
  rawContent: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: resolved Field → entries Table {
  from: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  to: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2'
}
 GET /api/shipyard/has-badge?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 6.1s (next.js: 5.3s, application-code: 836ms)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/sonar/batch',
  method: 'POST',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6ks8r-lgi8e7',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Aquifer chain read: raw object at storeTableId (before resolve) {
  storeTableId: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  objectType: '0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore>',
  rawContent: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: resolved Field → entries Table {
  from: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  to: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2'
}
 POST /api/sonar/batch 200 in 183ms (next.js: 67ms, application-code: 117ms)
[PLATFORM] Background Insignia tier sync requested {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  tier: 0
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kmbd-2gme6s',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
 POST /api/sonar/batch 200 in 62ms (next.js: 6ms, application-code: 56ms)
[PLATFORM] Background Insignia tier sync requested {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  tier: 0
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kmbk-o0lbmt',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Aquifer chain read: raw getDynamicFields(storeTableId) {
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  rawResponse: '{"data":"[array 17]","note":"aggregated pages"}',
  fieldCount: 17
}
[PLATFORM] Aquifer chain read: entries table resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  dynamicFieldCount: 17
}
[PLATFORM] Aquifer chain read: raw getDynamicFields(storeTableId) {
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  rawResponse: '{"data":"[array 17]","note":"aggregated pages"}',
  fieldCount: 17
}
[PLATFORM] Aquifer chain read: entries table resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  dynamicFieldCount: 17
}
[PLATFORM] Aquifer chain read: success {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  definitionCount: 17,
  keys: [
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
    'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
    'milestone_definitions'
  ]
}
[PLATFORM] Aquifer GET definitions: identity from request context; result {
  result: {
    definitionCount: 17,
    keys: [
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
      'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
      'milestone_definitions'
    ]
  }
}
 GET /api/aquifer/definitions 200 in 4.3s (next.js: 3.3s, application-code: 990ms)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?marks=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39%2C40%2C41%2C42%2C43%2C44%2C45%2C46%2C47%2C48%2C49%2C50%2C51%2C52%2C53%2C54%2C55%2C56%2C57%2C58%2C59%2C60%2C61%2C62%2C63%2C64%2C65%2C66%2C67%2C68%2C69%2C70%2C71%2C72%2C73%2C74%2C75%2C76%2C77',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6ksdx-3h32f3',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
 GET /api/helm 200 in 5.8s (next.js: 4.7s, application-code: 1050ms)
[PLATFORM] Aquifer chain read: success {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  definitionCount: 17,
  keys: [
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
    'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
    'milestone_definitions'
  ]
}
 GET /api/aquifer/definitions/badge_discounts_and_thresholds%3A2974962a-77a3-4430-a731-45d31d087811 200 in 5.7s (next.js: 4.7s, application-code: 1038ms)
[Tide] Tournament bucket counts [
  {
    ecosystemId: 'a7f3c91e-4b2d-4a8e-9f1c-6e0d5b3a2c84',
    appId: 'd2e8f4a1-5c3b-4d9e-8a7f-1b0c9e6d4a32',
    upcomingTournaments: 0,
    activeTournaments: 0,
    pendingDistributionTournaments: 0,
    pastTournaments: 0,
    ok: {
      upcoming: true,
      active: true,
      pendingDistribution: true,
      past: true
    },
    errors: undefined
  },
  {
    ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
    appId: '2974962a-77a3-4430-a731-45d31d087811',
    upcomingTournaments: 0,
    activeTournaments: 0,
    pendingDistributionTournaments: 8,
    pastTournaments: 1,
    ok: {
      upcoming: true,
      active: true,
      pendingDistribution: true,
      past: true
    },
    errors: undefined
  }
]
[Tide cron] Cycle ran {
  triggered: 0,
  upcomingToActive: 0,
  moveToPendingDistribution: 0,
  moveToPast: 0,
  distributionScheduled: 0,
  distributionTriggered: 0,
  errors: 1
}
[Tide cron] Error: Upcoming-to-active: Tide callback URL not set for a7f3c91e-4b2d-4a8e-9f1c-6e0d5b3a2c84/d2e8f4a1-5c3b-4d9e-8a7f-1b0c9e6d4a32. Set TIDE_CALLBACK_URL (platform .env) or Helm tide_callback_config for this app so Tide can POST to the game backend.
[PLATFORM] Tide cron cycle {
  triggered: 0,
  upcomingToActive: 0,
  moveToPendingDistribution: 0,
  moveToPast: 0,
  distributionScheduled: 0,
  distributionTriggered: 0,
  errors: 1
}
 GET /api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?marks=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39%2C40%2C41%2C42%2C43%2C44%2C45%2C46%2C47%2C48%2C49%2C50%2C51%2C52%2C53%2C54%2C55%2C56%2C57%2C58%2C59%2C60%2C61%2C62%2C63%2C64%2C65%2C66%2C67%2C68%2C69%2C70%2C71%2C72%2C73%2C74%2C75%2C76%2C77 200 in 1359ms (next.js: 90ms, application-code: 1268ms)
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/achievements/progress',
  duration: '12820ms',
  requestId: 'req-mof6kjls-odea6x',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 19042ms
[PLATFORM] Stockroom offers read: loaded from chain {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  offerCount: 28
}
 GET /api/stockroom/offers 200 in 7.4s (next.js: 4.8s, application-code: 2.6s)
[PLATFORM] [APP_CONFIG] Packs/ticket bundles loaded from Stockroom { packCount: 4, ticketBundleCount: 3 }
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/game-config',
  duration: '7512ms',
  requestId: 'req-mof6knug-5uc7mb',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/game-config 200 in 7739ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/achievements/progress',
  requestId: 'req-mof6ktp3-tw7vlt',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6ktpa-84yy1a',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/game-config',
  pathname: '/api/game-config',
  requestId: 'req-mof6ktu8-igulik',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[PUBLIC] /api/game-config missing source tag {
  route: '/api/game-config',
  referer: 'http://localhost:8000/',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  secFetchDest: 'empty',
  secFetchMode: 'cors',
  secFetchSite: 'same-site'
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/game-config',
  duration: '2ms',
  requestId: 'req-mof6ktu8-igulik',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/game-config 200 in 251ms
○ Compiling /_not-found ...
 GET /api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 404 in 8.2s (next.js: 7.6s, application-code: 578ms)
 GET /api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 404 in 8.1s (next.js: 7.5s, application-code: 582ms)
[PLATFORM] Insignia tier repair failed (non-fatal) {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  badgeTier: 0,
  error: '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack.js?v=1777172433986"/><script src="/_next/static/chunks/main-app.js?v=1777172433986" async=""></script><script src="/_next/static/chunks/app-pages-internals.js" async=""></script><script src="/_next/static/chunks/app/global-error.js" async=""></script><meta name="robots" content="noindex"/><title>404: This page could not be found.</title><title>Aqueduct Platform Backend</title><meta name="description" content="Platform backend API and admin interface for Aqueduct shared services"/><script src="/_next/static/chunks/polyfills.js" noModule=""></script></head><body style="margin:0;padding:0;font-family:system-ui, -apple-system, sans-serif"><div hidden=""><!--$--><!--/$--></div><div style="font-family:system-ui,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif,&quot;Apple Color Emoji&quot;,&quot;Segoe UI Emoji&quot;;height:100vh;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div><style>body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}</style><h1 class="next-error-h1" style="display:inline-block;margin:0 20px 0 0;padding:0 23px 0 0;font-size:24px;font-weight:500;vertical-align:top;line-height:49px">404</h1><div style="display:inline-block"><h2 style="font-size:14px;font-weight:400;line-height:49px;margin:0">This page could not be found.</h2></div></div></div><!--$--><!--/$--><script id="_R_">self.__next_r="K2lQphSNh83JCGUmtIHeQ"</script><script src="/_next/static/chunks/webpack.js?v=1777172433986" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"6:I[\\"(app-pages-browser)/./node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"SegmentViewNode\\"]\\n8:\\"$Sreact.fragment\\"\\n18:I[\\"(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"\\"]\\n1a:I[\\"(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"\\"]\\n35:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"OutletBoundary\\"]\\n37:\\"$Sreact.suspense\\"\\n46:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"ViewportBoundary\\"]\\n50:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"MetadataBoundary\\"]\\n56:I[\\"(app-pages-browser)/./app/global-error.tsx\\",[\\"app/global-error\\",\\"static/chunks/app/global-error.js\\"],\\"default\\"]\\n1:D\\"$3\\"\\n1:D\\"$2\\"\\n1:D\\"$4\\"\\n1:null\\n9:D\\"$13\\"\\n9:D\\"$a\\"\\n9:D\\"$15\\"\\n9:[\\"$\\",\\"html\\",null,{\\"lang\\":\\"en\\",\\"children\\":[\\"$\\",\\"body\\",null,{\\"style\\":{\\"margin\\":0,\\"padding\\":0,\\"fontFamily\\":\\"system-ui, -apple-system, sans-serif\\"},\\"children\\":[\\"$\\",\\"$L18\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"error\\":\\"$undefined\\",\\"errorStyles\\":\\"$undefined\\",\\"errorScripts\\":\\"$undefined\\",\\"template\\":[\\"$\\",\\"$L1a\\",null,{},null,\\"$19\\",1],\\"templateStyles\\":\\"$undefined\\",\\"templateScripts\\":\\"$undefined\\",\\"notFound\\":\\"$undefined\\",\\"forbidden\\":\\"$undefined\\",\\"unauthorized\\":\\"$undefined\\",\\"segmentViewBoundaries\\":[\\"$undefined\\",\\"$undefined\\",\\"$undefined\\",[\\"$\\",\\"$L6\\",null,{\\"type\\":\\"boundary:global-error\\",\\"pagePath\\":\\"global-error.tsx\\"},null,\\"$1b\\",1]]},null,\\"$17\\",1]},\\"$a\\",\\"$16\\",1]},\\"$a\\",\\"$14\\",1]\\n21:D\\"$25\\"\\n21:D\\"$22\\"\\n21:D\\"$27\\"\\n21:D\\"$26\\"\\n21:D\\"$28\\"\\n21:[[\\"$\\",\\"title\\",null,{\\"children\\":\\"404: This page could not be found.\\"},\\"$26\\",\\"$29\\",1],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"fontFamily\\":\\"system-ui,\\\\\\"Segoe UI\\\\\\",Roboto,Helvetica,Arial,sans-serif,\\\\\\"Apple Color Emoji\\\\\\",\\\\\\"Segoe UI Emoji\\\\\\"\\",\\"height\\":\\"100vh\\",\\"textAlign\\":\\"center\\",\\"display\\":\\"flex\\",\\"flexDirection\\":\\"column\\",\\"alignItems\\":\\"center\\",\\"justifyContent\\":\\"center\\"},\\"children\\":[\\"$\\",\\"div\\",null,{\\"children\\":[[\\"$\\",\\"style\\",null,{\\"dangerouslySetInnerHTML\\":{\\"__html\\":\\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\\"}},\\"$26\\",\\"$2c\\",1],[\\"$\\",\\"h1\\",null,{\\"className\\":\\"next-error-h1\\",\\"style\\":{\\"display\\":\\"inline-block\\",\\"margin\\":\\"0 20px 0 0\\",\\"padding\\":\\"0 23px 0 0\\",\\"fontSize\\":24,\\"fontWeight\\":500,\\"verticalAlign\\":\\"top\\",\\"lineHeight\\":\\"49px\\"},\\"children\\":404},\\"$26\\",\\"$2d\\",1],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"display\\":\\"inline-block\\"},\\"children\\":[\\"$\\",\\"h2\\",null,{\\"style\\":{\\"fontSize\\":14,\\"fontWeight\\":400,\\"lineHeight\\":\\"49px\\",\\"margin\\":0},\\"children\\":\\"This page could not be found.\\"},\\"$26\\",\\"$2f\\",1]},\\"$26\\",\\"$2e\\",1]]},\\"$26\\",\\"$2b\\",1]},\\"$26\\",\\"$2a\\",1]]\\n30:D\\"$32\\"\\n30:D\\"$31\\"\\n30:D\\"$34\\"\\n30:[\\"$\\",\\"$L35\\",null,{\\"children\\":[\\"$\\",\\"$37\\",null,{\\"name\\":\\"Next.MetadataOutlet\\",\\"children\\":\\"$@38\\"},\\"$31\\",\\"$36\\",1]},\\"$31\\",\\"$33\\",1]\\n3b:D\\"$3e\\"\\n3b:D\\"$3c\\"\\n3b:D\\"$40\\"\\n3b:[\\"$\\",\\"meta\\",null,{\\"name\\":\\"robots\\",\\"content\\":\\"noindex\\"},\\"$3c\\",\\"$3f\\",1]\\n41:D\\"$43\\"\\n41:D\\"$42\\"\\n41:D\\"$45\\"\\n47:D\\"$49\\"\\n47:D\\"$48\\"\\n41:[\\"$\\",\\"$L46\\",null,{\\"children\\":\\"$L47\\"},\\"$42\\",\\"$44\\",1]\\n4a:D\\"$4c\\"\\n4a:D\\"$4b\\"\\n4a:D\\"$4e\\"\\n52:D\\"$54\\"\\n52:D\\"$53\\"\\n4a:[\\"$\\",\\"div\\",null,{\\"hidden\\":true,\\"children\\":[\\"$\\",\\"$L50\\",null,{\\"children\\":[\\"$\\",\\"$37\\",null,{\\"name\\":\\"Next.Metadata\\",\\"children\\":\\"$L52\\"},\\"$4b\\",\\"$51\\",1]},\\"$4b\\",\\"$4f\\",1]},\\"$4b\\",\\"$4d\\",1]\\n55:[]\\n0:{\\"P\\":\\"$1\\",\\"c\\":[\\"\\",\\"api\\",\\"insignia\\",\\"0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0\\"],\\"q\\":\\"\\",\\"i\\":true,\\"f\\":[[[\\"\\",{\\"children\\":[\\"_not-found\\",{\\"children\\":[\\"__PAGE__\\",{}]}]},\\"$undefined\\",\\"$undefined\\",16],[[\\"$\\",\\"$L6\\",\\"layout\\",{\\"type\\":\\"layout\\",\\"pagePath\\":\\"layout.tsx\\",\\"children\\":[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[null,\\"$9\\"]},null,\\"$7\\",1]},null,\\"$5\\","])</script><script>self.__next_f.push([1,"0],{\\"children\\":[[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[null,[\\"$\\",\\"$L18\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"error\\":\\"$undefined\\",\\"errorStyles\\":\\"$undefined\\",\\"errorScripts\\":\\"$undefined\\",\\"template\\":[\\"$\\",\\"$L1a\\",null,{},null,\\"$1e\\",1],\\"templateStyles\\":\\"$undefined\\",\\"templateScripts\\":\\"$undefined\\",\\"notFound\\":\\"$undefined\\",\\"forbidden\\":\\"$undefined\\",\\"unauthorized\\":\\"$undefined\\",\\"segmentViewBoundaries\\":[\\"$undefined\\",\\"$undefined\\",\\"$undefined\\",\\"$undefined\\"]},null,\\"$1d\\",1]]},null,\\"$1c\\",0],{\\"children\\":[[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[[\\"$\\",\\"$L6\\",\\"c-page\\",{\\"type\\":\\"page\\",\\"pagePath\\":\\"__next_builtin__not-found.js\\",\\"children\\":\\"$21\\"},null,\\"$20\\",1],null,\\"$30\\"]},null,\\"$1f\\",0],{},null,false,null]},null,false,\\"$@39\\"]},null,false,null],[\\"$\\",\\"$8\\",\\"h\\",{\\"children\\":[\\"$3b\\",\\"$41\\",\\"$4a\\",null]},null,\\"$3a\\",0],false]],\\"m\\":\\"$W55\\",\\"G\\":[\\"$56\\",[\\"$\\",\\"$L6\\",\\"ge-svn\\",{\\"type\\":\\"global-error\\",\\"pagePath\\":\\"global-error.tsx\\",\\"children\\":[]},null,\\"$57\\",0]],\\"S\\":false,\\"h\\":null,\\"s\\":\\"$undefined\\",\\"l\\":\\"$undefined\\",\\"p\\":\\"$undefined\\",\\"d\\":\\"$undefined\\",\\"b\\":\\"development\\"}\\n58:[]\\n39:D\\"$59\\"\\n39:\\"$W58\\"\\n47:D\\"$5a\\"\\n47:[[\\"$\\",\\"meta\\",\\"0\\",{\\"charSet\\":\\"utf-8\\"},\\"$31\\",\\"$5b\\",0],[\\"$\\",\\"meta\\",\\"1\\",{\\"name\\":\\"viewport\\",\\"content\\":\\"width=device-width, initial-scale=1\\"},\\"$31\\",\\"$5c\\",0]]\\n38:D\\"$5d\\"\\n38:null\\n52:D\\"$5e\\"\\n52:[[\\"$\\",\\"title\\",\\"0\\",{\\"children\\":\\"Aqueduct Platform Backend\\"},\\"$31\\",\\"$5f\\",0],[\\"$\\",\\"meta\\",\\"1\\",{\\"name\\":\\"description\\",\\"content\\":\\"Platform backend API and admin interface for Aqueduct shared services\\"},\\"$31\\",\\"$60\\",0]]\\n"])</script></body></html>'
}
[PLATFORM] Background Insignia tier sync completed {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  tier: 0,
  success: false,
  repaired: false,
  error: '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack.js?v=1777172433986"/><script src="/_next/static/chunks/main-app.js?v=1777172433986" async=""></script><script src="/_next/static/chunks/app-pages-internals.js" async=""></script><script src="/_next/static/chunks/app/global-error.js" async=""></script><meta name="robots" content="noindex"/><title>404: This page could not be found.</title><title>Aqueduct Platform Backend</title><meta name="description" content="Platform backend API and admin interface for Aqueduct shared services"/><script src="/_next/static/chunks/polyfills.js" noModule=""></script></head><body style="margin:0;padding:0;font-family:system-ui, -apple-system, sans-serif"><div hidden=""><!--$--><!--/$--></div><div style="font-family:system-ui,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif,&quot;Apple Color Emoji&quot;,&quot;Segoe UI Emoji&quot;;height:100vh;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div><style>body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}</style><h1 class="next-error-h1" style="display:inline-block;margin:0 20px 0 0;padding:0 23px 0 0;font-size:24px;font-weight:500;vertical-align:top;line-height:49px">404</h1><div style="display:inline-block"><h2 style="font-size:14px;font-weight:400;line-height:49px;margin:0">This page could not be found.</h2></div></div></div><!--$--><!--/$--><script id="_R_">self.__next_r="K2lQphSNh83JCGUmtIHeQ"</script><script src="/_next/static/chunks/webpack.js?v=1777172433986" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"6:I[\\"(app-pages-browser)/./node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"SegmentViewNode\\"]\\n8:\\"$Sreact.fragment\\"\\n18:I[\\"(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"\\"]\\n1a:I[\\"(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"\\"]\\n35:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"OutletBoundary\\"]\\n37:\\"$Sreact.suspense\\"\\n46:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"ViewportBoundary\\"]\\n50:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"MetadataBoundary\\"]\\n56:I[\\"(app-pages-browser)/./app/global-error.tsx\\",[\\"app/global-error\\",\\"static/chunks/app/global-error.js\\"],\\"default\\"]\\n1:D\\"$3\\"\\n1:D\\"$2\\"\\n1:D\\"$4\\"\\n1:null\\n9:D\\"$13\\"\\n9:D\\"$a\\"\\n9:D\\"$15\\"\\n9:[\\"$\\",\\"html\\",null,{\\"lang\\":\\"en\\",\\"children\\":[\\"$\\",\\"body\\",null,{\\"style\\":{\\"margin\\":0,\\"padding\\":0,\\"fontFamily\\":\\"system-ui, -apple-system, sans-serif\\"},\\"children\\":[\\"$\\",\\"$L18\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"error\\":\\"$undefined\\",\\"errorStyles\\":\\"$undefined\\",\\"errorScripts\\":\\"$undefined\\",\\"template\\":[\\"$\\",\\"$L1a\\",null,{},null,\\"$19\\",1],\\"templateStyles\\":\\"$undefined\\",\\"templateScripts\\":\\"$undefined\\",\\"notFound\\":\\"$undefined\\",\\"forbidden\\":\\"$undefined\\",\\"unauthorized\\":\\"$undefined\\",\\"segmentViewBoundaries\\":[\\"$undefined\\",\\"$undefined\\",\\"$undefined\\",[\\"$\\",\\"$L6\\",null,{\\"type\\":\\"boundary:global-error\\",\\"pagePath\\":\\"global-error.tsx\\"},null,\\"$1b\\",1]]},null,\\"$17\\",1]},\\"$a\\",\\"$16\\",1]},\\"$a\\",\\"$14\\",1]\\n21:D\\"$25\\"\\n21:D\\"$22\\"\\n21:D\\"$27\\"\\n21:D\\"$26\\"\\n21:D\\"$28\\"\\n21:[[\\"$\\",\\"title\\",null,{\\"children\\":\\"404: This page could not be found.\\"},\\"$26\\",\\"$29\\",1],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"fontFamily\\":\\"system-ui,\\\\\\"Segoe UI\\\\\\",Roboto,Helvetica,Arial,sans-serif,\\\\\\"Apple Color Emoji\\\\\\",\\\\\\"Segoe UI Emoji\\\\\\"\\",\\"height\\":\\"100vh\\",\\"textAlign\\":\\"center\\",\\"display\\":\\"flex\\",\\"flexDirection\\":\\"column\\",\\"alignItems\\":\\"center\\",\\"justifyContent\\":\\"center\\"},\\"children\\":[\\"$\\",\\"div\\",null,{\\"children\\":[[\\"$\\",\\"style\\",null,{\\"dangerouslySetInnerHTML\\":{\\"__html\\":\\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\\"}},\\"$26\\",\\"$2c\\",1],[\\"$\\",\\"h1\\",null,{\\"className\\":\\"next-error-h1\\",\\"style\\":{\\"display\\":\\"inline-block\\",\\"margin\\":\\"0 20px 0 0\\",\\"padding\\":\\"0 23px 0 0\\",\\"fontSize\\":24,\\"fontWeight\\":500,\\"verticalAlign\\":\\"top\\",\\"lineHeight\\":\\"49px\\"},\\"children\\":404},\\"$26\\",\\"$2d\\",1],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"display\\":\\"inline-block\\"},\\"children\\":[\\"$\\",\\"h2\\",null,{\\"style\\":{\\"fontSize\\":14,\\"fontWeight\\":400,\\"lineHeight\\":\\"49px\\",\\"margin\\":0},\\"children\\":\\"This page could not be found.\\"},\\"$26\\",\\"$2f\\",1]},\\"$26\\",\\"$2e\\",1]]},\\"$26\\",\\"$2b\\",1]},\\"$26\\",\\"$2a\\",1]]\\n30:D\\"$32\\"\\n30:D\\"$31\\"\\n30:D\\"$34\\"\\n30:[\\"$\\",\\"$L35\\",null,{\\"children\\":[\\"$\\",\\"$37\\",null,{\\"name\\":\\"Next.MetadataOutlet\\",\\"children\\":\\"$@38\\"},\\"$31\\",\\"$36\\",1]},\\"$31\\",\\"$33\\",1]\\n3b:D\\"$3e\\"\\n3b:D\\"$3c\\"\\n3b:D\\"$40\\"\\n3b:[\\"$\\",\\"meta\\",null,{\\"name\\":\\"robots\\",\\"content\\":\\"noindex\\"},\\"$3c\\",\\"$3f\\",1]\\n41:D\\"$43\\"\\n41:D\\"$42\\"\\n41:D\\"$45\\"\\n47:D\\"$49\\"\\n47:D\\"$48\\"\\n41:[\\"$\\",\\"$L46\\",null,{\\"children\\":\\"$L47\\"},\\"$42\\",\\"$44\\",1]\\n4a:D\\"$4c\\"\\n4a:D\\"$4b\\"\\n4a:D\\"$4e\\"\\n52:D\\"$54\\"\\n52:D\\"$53\\"\\n4a:[\\"$\\",\\"div\\",null,{\\"hidden\\":true,\\"children\\":[\\"$\\",\\"$L50\\",null,{\\"children\\":[\\"$\\",\\"$37\\",null,{\\"name\\":\\"Next.Metadata\\",\\"children\\":\\"$L52\\"},\\"$4b\\",\\"$51\\",1]},\\"$4b\\",\\"$4f\\",1]},\\"$4b\\",\\"$4d\\",1]\\n55:[]\\n0:{\\"P\\":\\"$1\\",\\"c\\":[\\"\\",\\"api\\",\\"insignia\\",\\"0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0\\"],\\"q\\":\\"\\",\\"i\\":true,\\"f\\":[[[\\"\\",{\\"children\\":[\\"_not-found\\",{\\"children\\":[\\"__PAGE__\\",{}]}]},\\"$undefined\\",\\"$undefined\\",16],[[\\"$\\",\\"$L6\\",\\"layout\\",{\\"type\\":\\"layout\\",\\"pagePath\\":\\"layout.tsx\\",\\"children\\":[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[null,\\"$9\\"]},null,\\"$7\\",1]},null,\\"$5\\","])</script><script>self.__next_f.push([1,"0],{\\"children\\":[[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[null,[\\"$\\",\\"$L18\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"error\\":\\"$undefined\\",\\"errorStyles\\":\\"$undefined\\",\\"errorScripts\\":\\"$undefined\\",\\"template\\":[\\"$\\",\\"$L1a\\",null,{},null,\\"$1e\\",1],\\"templateStyles\\":\\"$undefined\\",\\"templateScripts\\":\\"$undefined\\",\\"notFound\\":\\"$undefined\\",\\"forbidden\\":\\"$undefined\\",\\"unauthorized\\":\\"$undefined\\",\\"segmentViewBoundaries\\":[\\"$undefined\\",\\"$undefined\\",\\"$undefined\\",\\"$undefined\\"]},null,\\"$1d\\",1]]},null,\\"$1c\\",0],{\\"children\\":[[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[[\\"$\\",\\"$L6\\",\\"c-page\\",{\\"type\\":\\"page\\",\\"pagePath\\":\\"__next_builtin__not-found.js\\",\\"children\\":\\"$21\\"},null,\\"$20\\",1],null,\\"$30\\"]},null,\\"$1f\\",0],{},null,false,null]},null,false,\\"$@39\\"]},null,false,null],[\\"$\\",\\"$8\\",\\"h\\",{\\"children\\":[\\"$3b\\",\\"$41\\",\\"$4a\\",null]},null,\\"$3a\\",0],false]],\\"m\\":\\"$W55\\",\\"G\\":[\\"$56\\",[\\"$\\",\\"$L6\\",\\"ge-svn\\",{\\"type\\":\\"global-error\\",\\"pagePath\\":\\"global-error.tsx\\",\\"children\\":[]},null,\\"$57\\",0]],\\"S\\":false,\\"h\\":null,\\"s\\":\\"$undefined\\",\\"l\\":\\"$undefined\\",\\"p\\":\\"$undefined\\",\\"d\\":\\"$undefined\\",\\"b\\":\\"development\\"}\\n58:[]\\n39:D\\"$59\\"\\n39:\\"$W58\\"\\n47:D\\"$5a\\"\\n47:[[\\"$\\",\\"meta\\",\\"0\\",{\\"charSet\\":\\"utf-8\\"},\\"$31\\",\\"$5b\\",0],[\\"$\\",\\"meta\\",\\"1\\",{\\"name\\":\\"viewport\\",\\"content\\":\\"width=device-width, initial-scale=1\\"},\\"$31\\",\\"$5c\\",0]]\\n38:D\\"$5d\\"\\n38:null\\n52:D\\"$5e\\"\\n52:[[\\"$\\",\\"title\\",\\"0\\",{\\"children\\":\\"Aqueduct Platform Backend\\"},\\"$31\\",\\"$5f\\",0],[\\"$\\",\\"meta\\",\\"1\\",{\\"name\\":\\"description\\",\\"content\\":\\"Platform backend API and admin interface for Aqueduct shared services\\"},\\"$31\\",\\"$60\\",0]]\\n"])</script></body></html>'
}
[PLATFORM] API request completed {
  method: 'POST',
  pathname: '/api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0/sync-tier',
  duration: '15978ms',
  requestId: 'req-mof6kmb6-pr7f68',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 POST /api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0/sync-tier 200 in 24408ms
[PLATFORM] Insignia tier repair failed (non-fatal) {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  badgeTier: 0,
  error: '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack.js?v=1777172433989"/><script src="/_next/static/chunks/main-app.js?v=1777172433989" async=""></script><script src="/_next/static/chunks/app-pages-internals.js" async=""></script><script src="/_next/static/chunks/app/global-error.js" async=""></script><meta name="robots" content="noindex"/><title>404: This page could not be found.</title><title>Aqueduct Platform Backend</title><meta name="description" content="Platform backend API and admin interface for Aqueduct shared services"/><script src="/_next/static/chunks/polyfills.js" noModule=""></script></head><body style="margin:0;padding:0;font-family:system-ui, -apple-system, sans-serif"><div hidden=""><!--$--><!--/$--></div><div style="font-family:system-ui,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif,&quot;Apple Color Emoji&quot;,&quot;Segoe UI Emoji&quot;;height:100vh;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div><style>body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}</style><h1 class="next-error-h1" style="display:inline-block;margin:0 20px 0 0;padding:0 23px 0 0;font-size:24px;font-weight:500;vertical-align:top;line-height:49px">404</h1><div style="display:inline-block"><h2 style="font-size:14px;font-weight:400;line-height:49px;margin:0">This page could not be found.</h2></div></div></div><!--$--><!--/$--><script id="_R_">self.__next_r="m914BC7E9g9qvzG5yhFFn"</script><script src="/_next/static/chunks/webpack.js?v=1777172433989" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"6:I[\\"(app-pages-browser)/./node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"SegmentViewNode\\"]\\n8:\\"$Sreact.fragment\\"\\n18:I[\\"(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"\\"]\\n1a:I[\\"(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"\\"]\\n35:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"OutletBoundary\\"]\\n37:\\"$Sreact.suspense\\"\\n46:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"ViewportBoundary\\"]\\n50:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"MetadataBoundary\\"]\\n56:I[\\"(app-pages-browser)/./app/global-error.tsx\\",[\\"app/global-error\\",\\"static/chunks/app/global-error.js\\"],\\"default\\"]\\n1:D\\"$3\\"\\n1:D\\"$2\\"\\n1:D\\"$4\\"\\n1:null\\n9:D\\"$13\\"\\n9:D\\"$a\\"\\n9:D\\"$15\\"\\n9:[\\"$\\",\\"html\\",null,{\\"lang\\":\\"en\\",\\"children\\":[\\"$\\",\\"body\\",null,{\\"style\\":{\\"margin\\":0,\\"padding\\":0,\\"fontFamily\\":\\"system-ui, -apple-system, sans-serif\\"},\\"children\\":[\\"$\\",\\"$L18\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"error\\":\\"$undefined\\",\\"errorStyles\\":\\"$undefined\\",\\"errorScripts\\":\\"$undefined\\",\\"template\\":[\\"$\\",\\"$L1a\\",null,{},null,\\"$19\\",1],\\"templateStyles\\":\\"$undefined\\",\\"templateScripts\\":\\"$undefined\\",\\"notFound\\":\\"$undefined\\",\\"forbidden\\":\\"$undefined\\",\\"unauthorized\\":\\"$undefined\\",\\"segmentViewBoundaries\\":[\\"$undefined\\",\\"$undefined\\",\\"$undefined\\",[\\"$\\",\\"$L6\\",null,{\\"type\\":\\"boundary:global-error\\",\\"pagePath\\":\\"global-error.tsx\\"},null,\\"$1b\\",1]]},null,\\"$17\\",1]},\\"$a\\",\\"$16\\",1]},\\"$a\\",\\"$14\\",1]\\n21:D\\"$25\\"\\n21:D\\"$22\\"\\n21:D\\"$27\\"\\n21:D\\"$26\\"\\n21:D\\"$28\\"\\n21:[[\\"$\\",\\"title\\",null,{\\"children\\":\\"404: This page could not be found.\\"},\\"$26\\",\\"$29\\",1],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"fontFamily\\":\\"system-ui,\\\\\\"Segoe UI\\\\\\",Roboto,Helvetica,Arial,sans-serif,\\\\\\"Apple Color Emoji\\\\\\",\\\\\\"Segoe UI Emoji\\\\\\"\\",\\"height\\":\\"100vh\\",\\"textAlign\\":\\"center\\",\\"display\\":\\"flex\\",\\"flexDirection\\":\\"column\\",\\"alignItems\\":\\"center\\",\\"justifyContent\\":\\"center\\"},\\"children\\":[\\"$\\",\\"div\\",null,{\\"children\\":[[\\"$\\",\\"style\\",null,{\\"dangerouslySetInnerHTML\\":{\\"__html\\":\\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\\"}},\\"$26\\",\\"$2c\\",1],[\\"$\\",\\"h1\\",null,{\\"className\\":\\"next-error-h1\\",\\"style\\":{\\"display\\":\\"inline-block\\",\\"margin\\":\\"0 20px 0 0\\",\\"padding\\":\\"0 23px 0 0\\",\\"fontSize\\":24,\\"fontWeight\\":500,\\"verticalAlign\\":\\"top\\",\\"lineHeight\\":\\"49px\\"},\\"children\\":404},\\"$26\\",\\"$2d\\",1],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"display\\":\\"inline-block\\"},\\"children\\":[\\"$\\",\\"h2\\",null,{\\"style\\":{\\"fontSize\\":14,\\"fontWeight\\":400,\\"lineHeight\\":\\"49px\\",\\"margin\\":0},\\"children\\":\\"This page could not be found.\\"},\\"$26\\",\\"$2f\\",1]},\\"$26\\",\\"$2e\\",1]]},\\"$26\\",\\"$2b\\",1]},\\"$26\\",\\"$2a\\",1]]\\n30:D\\"$32\\"\\n30:D\\"$31\\"\\n30:D\\"$34\\"\\n30:[\\"$\\",\\"$L35\\",null,{\\"children\\":[\\"$\\",\\"$37\\",null,{\\"name\\":\\"Next.MetadataOutlet\\",\\"children\\":\\"$@38\\"},\\"$31\\",\\"$36\\",1]},\\"$31\\",\\"$33\\",1]\\n3b:D\\"$3e\\"\\n3b:D\\"$3c\\"\\n3b:D\\"$40\\"\\n3b:[\\"$\\",\\"meta\\",null,{\\"name\\":\\"robots\\",\\"content\\":\\"noindex\\"},\\"$3c\\",\\"$3f\\",1]\\n41:D\\"$43\\"\\n41:D\\"$42\\"\\n41:D\\"$45\\"\\n47:D\\"$49\\"\\n47:D\\"$48\\"\\n41:[\\"$\\",\\"$L46\\",null,{\\"children\\":\\"$L47\\"},\\"$42\\",\\"$44\\",1]\\n4a:D\\"$4c\\"\\n4a:D\\"$4b\\"\\n4a:D\\"$4e\\"\\n52:D\\"$54\\"\\n52:D\\"$53\\"\\n4a:[\\"$\\",\\"div\\",null,{\\"hidden\\":true,\\"children\\":[\\"$\\",\\"$L50\\",null,{\\"children\\":[\\"$\\",\\"$37\\",null,{\\"name\\":\\"Next.Metadata\\",\\"children\\":\\"$L52\\"},\\"$4b\\",\\"$51\\",1]},\\"$4b\\",\\"$4f\\",1]},\\"$4b\\",\\"$4d\\",1]\\n55:[]\\n0:{\\"P\\":\\"$1\\",\\"c\\":[\\"\\",\\"api\\",\\"insignia\\",\\"0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0\\"],\\"q\\":\\"\\",\\"i\\":true,\\"f\\":[[[\\"\\",{\\"children\\":[\\"_not-found\\",{\\"children\\":[\\"__PAGE__\\",{}]}]},\\"$undefined\\",\\"$undefined\\",16],[[\\"$\\",\\"$L6\\",\\"layout\\",{\\"type\\":\\"layout\\",\\"pagePath\\":\\"layout.tsx\\",\\"children\\":[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[null,\\"$9\\"]},null,\\"$7\\",1]},null,\\"$5\\","])</script><script>self.__next_f.push([1,"0],{\\"children\\":[[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[null,[\\"$\\",\\"$L18\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"error\\":\\"$undefined\\",\\"errorStyles\\":\\"$undefined\\",\\"errorScripts\\":\\"$undefined\\",\\"template\\":[\\"$\\",\\"$L1a\\",null,{},null,\\"$1e\\",1],\\"templateStyles\\":\\"$undefined\\",\\"templateScripts\\":\\"$undefined\\",\\"notFound\\":\\"$undefined\\",\\"forbidden\\":\\"$undefined\\",\\"unauthorized\\":\\"$undefined\\",\\"segmentViewBoundaries\\":[\\"$undefined\\",\\"$undefined\\",\\"$undefined\\",\\"$undefined\\"]},null,\\"$1d\\",1]]},null,\\"$1c\\",0],{\\"children\\":[[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[[\\"$\\",\\"$L6\\",\\"c-page\\",{\\"type\\":\\"page\\",\\"pagePath\\":\\"__next_builtin__not-found.js\\",\\"children\\":\\"$21\\"},null,\\"$20\\",1],null,\\"$30\\"]},null,\\"$1f\\",0],{},null,false,null]},null,false,\\"$@39\\"]},null,false,null],[\\"$\\",\\"$8\\",\\"h\\",{\\"children\\":[\\"$3b\\",\\"$41\\",\\"$4a\\",null]},null,\\"$3a\\",0],false]],\\"m\\":\\"$W55\\",\\"G\\":[\\"$56\\",[\\"$\\",\\"$L6\\",\\"ge-svn\\",{\\"type\\":\\"global-error\\",\\"pagePath\\":\\"global-error.tsx\\",\\"children\\":[]},null,\\"$57\\",0]],\\"S\\":false,\\"h\\":null,\\"s\\":\\"$undefined\\",\\"l\\":\\"$undefined\\",\\"p\\":\\"$undefined\\",\\"d\\":\\"$undefined\\",\\"b\\":\\"development\\"}\\n58:[]\\n39:D\\"$59\\"\\n39:\\"$W58\\"\\n47:D\\"$5a\\"\\n47:[[\\"$\\",\\"meta\\",\\"0\\",{\\"charSet\\":\\"utf-8\\"},\\"$31\\",\\"$5b\\",0],[\\"$\\",\\"meta\\",\\"1\\",{\\"name\\":\\"viewport\\",\\"content\\":\\"width=device-width, initial-scale=1\\"},\\"$31\\",\\"$5c\\",0]]\\n38:D\\"$5d\\"\\n38:null\\n52:D\\"$5e\\"\\n52:[[\\"$\\",\\"title\\",\\"0\\",{\\"children\\":\\"Aqueduct Platform Backend\\"},\\"$31\\",\\"$5f\\",0],[\\"$\\",\\"meta\\",\\"1\\",{\\"name\\":\\"description\\",\\"content\\":\\"Platform backend API and admin interface for Aqueduct shared services\\"},\\"$31\\",\\"$60\\",0]]\\n"])</script></body></html>'
}
[PLATFORM] Background Insignia tier sync completed {
  playerAddress: '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  tier: 0,
  success: false,
  repaired: false,
  error: '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack.js?v=1777172433989"/><script src="/_next/static/chunks/main-app.js?v=1777172433989" async=""></script><script src="/_next/static/chunks/app-pages-internals.js" async=""></script><script src="/_next/static/chunks/app/global-error.js" async=""></script><meta name="robots" content="noindex"/><title>404: This page could not be found.</title><title>Aqueduct Platform Backend</title><meta name="description" content="Platform backend API and admin interface for Aqueduct shared services"/><script src="/_next/static/chunks/polyfills.js" noModule=""></script></head><body style="margin:0;padding:0;font-family:system-ui, -apple-system, sans-serif"><div hidden=""><!--$--><!--/$--></div><div style="font-family:system-ui,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif,&quot;Apple Color Emoji&quot;,&quot;Segoe UI Emoji&quot;;height:100vh;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div><style>body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}</style><h1 class="next-error-h1" style="display:inline-block;margin:0 20px 0 0;padding:0 23px 0 0;font-size:24px;font-weight:500;vertical-align:top;line-height:49px">404</h1><div style="display:inline-block"><h2 style="font-size:14px;font-weight:400;line-height:49px;margin:0">This page could not be found.</h2></div></div></div><!--$--><!--/$--><script id="_R_">self.__next_r="m914BC7E9g9qvzG5yhFFn"</script><script src="/_next/static/chunks/webpack.js?v=1777172433989" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"6:I[\\"(app-pages-browser)/./node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"SegmentViewNode\\"]\\n8:\\"$Sreact.fragment\\"\\n18:I[\\"(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"\\"]\\n1a:I[\\"(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"\\"]\\n35:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"OutletBoundary\\"]\\n37:\\"$Sreact.suspense\\"\\n46:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"ViewportBoundary\\"]\\n50:I[\\"(app-pages-browser)/./node_modules/next/dist/lib/framework/boundary-components.js\\",[\\"app-pages-internals\\",\\"static/chunks/app-pages-internals.js\\"],\\"MetadataBoundary\\"]\\n56:I[\\"(app-pages-browser)/./app/global-error.tsx\\",[\\"app/global-error\\",\\"static/chunks/app/global-error.js\\"],\\"default\\"]\\n1:D\\"$3\\"\\n1:D\\"$2\\"\\n1:D\\"$4\\"\\n1:null\\n9:D\\"$13\\"\\n9:D\\"$a\\"\\n9:D\\"$15\\"\\n9:[\\"$\\",\\"html\\",null,{\\"lang\\":\\"en\\",\\"children\\":[\\"$\\",\\"body\\",null,{\\"style\\":{\\"margin\\":0,\\"padding\\":0,\\"fontFamily\\":\\"system-ui, -apple-system, sans-serif\\"},\\"children\\":[\\"$\\",\\"$L18\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"error\\":\\"$undefined\\",\\"errorStyles\\":\\"$undefined\\",\\"errorScripts\\":\\"$undefined\\",\\"template\\":[\\"$\\",\\"$L1a\\",null,{},null,\\"$19\\",1],\\"templateStyles\\":\\"$undefined\\",\\"templateScripts\\":\\"$undefined\\",\\"notFound\\":\\"$undefined\\",\\"forbidden\\":\\"$undefined\\",\\"unauthorized\\":\\"$undefined\\",\\"segmentViewBoundaries\\":[\\"$undefined\\",\\"$undefined\\",\\"$undefined\\",[\\"$\\",\\"$L6\\",null,{\\"type\\":\\"boundary:global-error\\",\\"pagePath\\":\\"global-error.tsx\\"},null,\\"$1b\\",1]]},null,\\"$17\\",1]},\\"$a\\",\\"$16\\",1]},\\"$a\\",\\"$14\\",1]\\n21:D\\"$25\\"\\n21:D\\"$22\\"\\n21:D\\"$27\\"\\n21:D\\"$26\\"\\n21:D\\"$28\\"\\n21:[[\\"$\\",\\"title\\",null,{\\"children\\":\\"404: This page could not be found.\\"},\\"$26\\",\\"$29\\",1],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"fontFamily\\":\\"system-ui,\\\\\\"Segoe UI\\\\\\",Roboto,Helvetica,Arial,sans-serif,\\\\\\"Apple Color Emoji\\\\\\",\\\\\\"Segoe UI Emoji\\\\\\"\\",\\"height\\":\\"100vh\\",\\"textAlign\\":\\"center\\",\\"display\\":\\"flex\\",\\"flexDirection\\":\\"column\\",\\"alignItems\\":\\"center\\",\\"justifyContent\\":\\"center\\"},\\"children\\":[\\"$\\",\\"div\\",null,{\\"children\\":[[\\"$\\",\\"style\\",null,{\\"dangerouslySetInnerHTML\\":{\\"__html\\":\\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\\"}},\\"$26\\",\\"$2c\\",1],[\\"$\\",\\"h1\\",null,{\\"className\\":\\"next-error-h1\\",\\"style\\":{\\"display\\":\\"inline-block\\",\\"margin\\":\\"0 20px 0 0\\",\\"padding\\":\\"0 23px 0 0\\",\\"fontSize\\":24,\\"fontWeight\\":500,\\"verticalAlign\\":\\"top\\",\\"lineHeight\\":\\"49px\\"},\\"children\\":404},\\"$26\\",\\"$2d\\",1],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"display\\":\\"inline-block\\"},\\"children\\":[\\"$\\",\\"h2\\",null,{\\"style\\":{\\"fontSize\\":14,\\"fontWeight\\":400,\\"lineHeight\\":\\"49px\\",\\"margin\\":0},\\"children\\":\\"This page could not be found.\\"},\\"$26\\",\\"$2f\\",1]},\\"$26\\",\\"$2e\\",1]]},\\"$26\\",\\"$2b\\",1]},\\"$26\\",\\"$2a\\",1]]\\n30:D\\"$32\\"\\n30:D\\"$31\\"\\n30:D\\"$34\\"\\n30:[\\"$\\",\\"$L35\\",null,{\\"children\\":[\\"$\\",\\"$37\\",null,{\\"name\\":\\"Next.MetadataOutlet\\",\\"children\\":\\"$@38\\"},\\"$31\\",\\"$36\\",1]},\\"$31\\",\\"$33\\",1]\\n3b:D\\"$3e\\"\\n3b:D\\"$3c\\"\\n3b:D\\"$40\\"\\n3b:[\\"$\\",\\"meta\\",null,{\\"name\\":\\"robots\\",\\"content\\":\\"noindex\\"},\\"$3c\\",\\"$3f\\",1]\\n41:D\\"$43\\"\\n41:D\\"$42\\"\\n41:D\\"$45\\"\\n47:D\\"$49\\"\\n47:D\\"$48\\"\\n41:[\\"$\\",\\"$L46\\",null,{\\"children\\":\\"$L47\\"},\\"$42\\",\\"$44\\",1]\\n4a:D\\"$4c\\"\\n4a:D\\"$4b\\"\\n4a:D\\"$4e\\"\\n52:D\\"$54\\"\\n52:D\\"$53\\"\\n4a:[\\"$\\",\\"div\\",null,{\\"hidden\\":true,\\"children\\":[\\"$\\",\\"$L50\\",null,{\\"children\\":[\\"$\\",\\"$37\\",null,{\\"name\\":\\"Next.Metadata\\",\\"children\\":\\"$L52\\"},\\"$4b\\",\\"$51\\",1]},\\"$4b\\",\\"$4f\\",1]},\\"$4b\\",\\"$4d\\",1]\\n55:[]\\n0:{\\"P\\":\\"$1\\",\\"c\\":[\\"\\",\\"api\\",\\"insignia\\",\\"0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0\\"],\\"q\\":\\"\\",\\"i\\":true,\\"f\\":[[[\\"\\",{\\"children\\":[\\"_not-found\\",{\\"children\\":[\\"__PAGE__\\",{}]}]},\\"$undefined\\",\\"$undefined\\",16],[[\\"$\\",\\"$L6\\",\\"layout\\",{\\"type\\":\\"layout\\",\\"pagePath\\":\\"layout.tsx\\",\\"children\\":[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[null,\\"$9\\"]},null,\\"$7\\",1]},null,\\"$5\\","])</script><script>self.__next_f.push([1,"0],{\\"children\\":[[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[null,[\\"$\\",\\"$L18\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"error\\":\\"$undefined\\",\\"errorStyles\\":\\"$undefined\\",\\"errorScripts\\":\\"$undefined\\",\\"template\\":[\\"$\\",\\"$L1a\\",null,{},null,\\"$1e\\",1],\\"templateStyles\\":\\"$undefined\\",\\"templateScripts\\":\\"$undefined\\",\\"notFound\\":\\"$undefined\\",\\"forbidden\\":\\"$undefined\\",\\"unauthorized\\":\\"$undefined\\",\\"segmentViewBoundaries\\":[\\"$undefined\\",\\"$undefined\\",\\"$undefined\\",\\"$undefined\\"]},null,\\"$1d\\",1]]},null,\\"$1c\\",0],{\\"children\\":[[\\"$\\",\\"$8\\",\\"c\\",{\\"children\\":[[\\"$\\",\\"$L6\\",\\"c-page\\",{\\"type\\":\\"page\\",\\"pagePath\\":\\"__next_builtin__not-found.js\\",\\"children\\":\\"$21\\"},null,\\"$20\\",1],null,\\"$30\\"]},null,\\"$1f\\",0],{},null,false,null]},null,false,\\"$@39\\"]},null,false,null],[\\"$\\",\\"$8\\",\\"h\\",{\\"children\\":[\\"$3b\\",\\"$41\\",\\"$4a\\",null]},null,\\"$3a\\",0],false]],\\"m\\":\\"$W55\\",\\"G\\":[\\"$56\\",[\\"$\\",\\"$L6\\",\\"ge-svn\\",{\\"type\\":\\"global-error\\",\\"pagePath\\":\\"global-error.tsx\\",\\"children\\":[]},null,\\"$57\\",0]],\\"S\\":false,\\"h\\":null,\\"s\\":\\"$undefined\\",\\"l\\":\\"$undefined\\",\\"p\\":\\"$undefined\\",\\"d\\":\\"$undefined\\",\\"b\\":\\"development\\"}\\n58:[]\\n39:D\\"$59\\"\\n39:\\"$W58\\"\\n47:D\\"$5a\\"\\n47:[[\\"$\\",\\"meta\\",\\"0\\",{\\"charSet\\":\\"utf-8\\"},\\"$31\\",\\"$5b\\",0],[\\"$\\",\\"meta\\",\\"1\\",{\\"name\\":\\"viewport\\",\\"content\\":\\"width=device-width, initial-scale=1\\"},\\"$31\\",\\"$5c\\",0]]\\n38:D\\"$5d\\"\\n38:null\\n52:D\\"$5e\\"\\n52:[[\\"$\\",\\"title\\",\\"0\\",{\\"children\\":\\"Aqueduct Platform Backend\\"},\\"$31\\",\\"$5f\\",0],[\\"$\\",\\"meta\\",\\"1\\",{\\"name\\":\\"description\\",\\"content\\":\\"Platform backend API and admin interface for Aqueduct shared services\\"},\\"$31\\",\\"$60\\",0]]\\n"])</script></body></html>'
}
[PLATFORM] API request completed {
  method: 'POST',
  pathname: '/api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0/sync-tier',
  duration: '15993ms',
  requestId: 'req-mof6kmb8-lnp9xz',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 POST /api/insignia/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0/sync-tier 200 in 23096ms
[PLATFORM] ChannelService (Aqueduct Channel) initialized {
  network: 'testnet',
  rpcUrl: 'https://sui-testnet-rpc.publicnode.com',
  channelRpcDistinct: true
}
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/achievements/progress',
  requestId: 'req-mof6kzjs-3u9omz',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
 GET /api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 7.2s (next.js: 5.0s, application-code: 2.2s)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/aquifer/definitions',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'options',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6kzob-qgw71v',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
[PLATFORM] Aquifer chain read: registry resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  registryId: '0x6ab8579ad108c260ea17278c8a23e37e5f6cfbec1961790665847cee5e86a041',
  appsTableId: '0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217'
}
[PLATFORM] Aquifer chain read: raw app-row (getDynamicFieldObject) {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  rawPayload: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","owner":{"ObjectOwner":"0xdf1f8de62f6b0430e954d1257d8fda6d0c3225c477d5fbd6abee05e417da4217"},"previousTransaction":"APghotvGMRNbhS6iVWX87ywsJRY88NWCB8GnhTp87f5B","storageRebate":"3024800","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: raw object at storeTableId (before resolve) {
  storeTableId: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  objectType: '0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore>',
  rawContent: '{"data":{"objectId":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f","version":"835507682","digest":"BYqzLaFSUK8C8Ud7gtHeta2xBaaPRnuQLoSmxDvaXiNm","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","content":{"dataType":"moveObject","type":"0x2::dynamic_field::Field<0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope, 0xe9f02...","hasPublicTransfer":false,"fields":{"id":{"id":"0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f"},"name":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::AppScope","fields":{"app_id":"[maxDepth]","ecosystem_id":"[maxDepth]"}},"value":{"type":"0xe9f0226354a21d987f4cda9ba06b8ed3f887ce9dd4285f3a52c349ddc43868c1::aquifer::DefinitionStore","fields":{"entries":"[maxDepth]"}}}}}}'
}
[PLATFORM] Aquifer chain read: resolved Field → entries Table {
  from: '0x7449e5b6d9ac497616391cb9f54559e9aeac8ea5f20f1317e519e8751332e67f',
  to: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2'
}
[PLATFORM] Aquifer chain read: raw getDynamicFields(storeTableId) {
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  rawResponse: '{"data":"[array 17]","note":"aggregated pages"}',
  fieldCount: 17
}
[PLATFORM] Aquifer chain read: entries table resolved {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  storeTableId: '0x602001a09e342251236880a77f03682f07cd01942831e7fcf3797962485f35a2',
  dynamicFieldCount: 17
}
[PLATFORM] Aquifer chain read: success {
  ecosystemId: '6138350a-6f5c-4538-8f25-386b42141611',
  appId: '2974962a-77a3-4430-a731-45d31d087811',
  definitionCount: 17,
  keys: [
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
    'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
    'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
    'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
    'milestone_definitions'
  ]
}
[PLATFORM] Aquifer GET definitions: identity from request context; result {
  result: {
    definitionCount: 17,
    keys: [
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=1->3:hyper',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=2:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=1:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=0:path=2->3',
      'badge_discounts_and_thresholds:2974962a-77a3-4430-a731-45d31d087811',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->2',
      'reservoir_merge_recipe:inventory_merge:itemType=3:path=2->3',
      'reservoir_merge_recipe:inventory_merge:itemType=6:path=1->3:hyper',
      'milestone_definitions'
    ]
  }
}
 GET /api/aquifer/definitions 200 in 493ms (next.js: 125ms, application-code: 368ms)
[CONFIG] Using explicit localhost URL: http://localhost:3000
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] [CORRIDOR] Platform call headers resolved {
  path: 'api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?marks=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39%2C40%2C41%2C42%2C43%2C44%2C45%2C46%2C47%2C48%2C49%2C50%2C51%2C52%2C53%2C54%2C55%2C56%2C57%2C58%2C59%2C60%2C61%2C62%2C63%2C64%2C65%2C66%2C67%2C68%2C69%2C70%2C71%2C72%2C73%2C74%2C75%2C76%2C77',
  method: 'GET',
  baseUrl: 'http://localhost:3000',
  corridorCapabilityObjectId: '0x240bd81ef3f6fd38fbf4ec544c679ef9d5091582293ff886c0467bdd347a0ac2',
  corridorCapabilitySource: 'config',
  corridorAdminCapabilityObjectId: '0x99615fc6805c833650831a33bad4fc1ec752857f021f0db68ccbbaca190f3eae',
  corridorAdminCapabilitySource: 'config',
  apiKeyPresent: true,
  requestId: 'req-mof6l02f-es6hf5',
  headerKeys: [
    'Content-Type',
    'X-Request-Id',
    'X-Corridor-Capability-Object-Id',
    'X-Corridor-Admin-Capability-Object-Id',
    'X-API-Key'
  ]
}
 GET /api/hydroscope/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0?marks=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39%2C40%2C41%2C42%2C43%2C44%2C45%2C46%2C47%2C48%2C49%2C50%2C51%2C52%2C53%2C54%2C55%2C56%2C57%2C58%2C59%2C60%2C61%2C62%2C63%2C64%2C65%2C66%2C67%2C68%2C69%2C70%2C71%2C72%2C73%2C74%2C75%2C76%2C77 200 in 399ms (next.js: 8ms, application-code: 391ms)
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/achievements/progress',
  duration: '8681ms',
  requestId: 'req-mof6ktp3-tw7vlt',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/achievements/progress',
  duration: '1098ms',
  requestId: 'req-mof6kzjs-3u9omz',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 8937ms
 GET /api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 1273ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/achievements/progress',
  requestId: 'req-mof6l0k0-2f7gfc',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/achievements/progress',
  duration: '3ms',
  requestId: 'req-mof6l0k0-2f7gfc',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 199ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/achievements/progress',
  requestId: 'req-mof6l0pg-0fak3s',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/achievements/progress',
  duration: '2ms',
  requestId: 'req-mof6l0pg-0fak3s',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 187ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/achievements/progress',
  requestId: 'req-mof6l5k4-f8x2tn',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/achievements/progress',
  duration: '2ms',
  requestId: 'req-mof6l5k4-f8x2tn',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 187ms
[PLATFORM] API request received {
  method: 'GET',
  url: 'http://localhost:3001/api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  pathname: '/api/achievements/progress',
  requestId: 'req-mof6l6y1-wicudj',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
[CONFIG] Using explicit localhost URL: http://localhost:3000
[PLATFORM] API request completed {
  method: 'GET',
  pathname: '/api/achievements/progress',
  duration: '2ms',
  requestId: 'req-mof6l6y1-wicudj',
  corridorCapabilityObjectId: null,
  corridorAdminCapabilityObjectId: null
}
 GET /api/achievements/progress?address=0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0 200 in 186ms
[CONFIG] Using explicit localhost URL: http://localhost:3000
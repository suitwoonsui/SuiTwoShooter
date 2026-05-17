# Game Backend Environment Variables
# Copy this content to apps/shooter-game/backend/.env
#
# Contract and on-chain object/package IDs belong in config/contracts.<network>.json (or CONTRACT_CONFIG_PATH),
# not in .env. See config/contracts.testnet.json and docs/deployment/shooter-game/CONTRACT_IDS.md.
#
# Platform-related vars accept brand names (Terminal, Regatta, Reservoir, etc.; see
# Aqueduct Platform Product Naming.md) with legacy fallback (PREMIUM_STORE_*, TOURNAMENT_*, etc.).
#
# MVP: Platform only. Config, catalog, tournaments, score, achievements, badges
# come from the platform (Helm, Terminal, Regatta). No game contract IDs in .env.

# =============================================================================
# Platform connection (required)
# =============================================================================
# For production: set PLATFORM_BACKEND_URL in Vercel → Project → Settings → Environment Variables.
PLATFORM_BACKEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000

# App identity (no defaults)
APP_ID=
ECOSYSTEM_ID=

# Per-app API key (required for most platform modules). Copy from Aqueduct Platform/backend/.env
ECOSYSTEM_6138350a_6f5c_4538_8f25_386b42141611_APP_2974962a_77a3_4430_a731_45d31d087811_API_KEY=
# Ecosystem-wide key (optional fallback; some routes accept either key)
ECOSYSTEM_6138350a_6f5c_4538_8f25_386b42141611_API_KEY=

# Sui Network
SUI_NETWORK=testnet

# Sui RPC (optional; defaults by network — can also set in contracts JSON for non-secret defaults)
SUI_MAINNET_NETWORK=mainnet
SUI_TESTNET_NETWORK=testnet
SUI_MAINNET_RPC_URL=https://fullnode.mainnet.sui.io:443
SUI_TESTNET_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_GAS_BUDGET=10000000

# Admin wallet (for signing: store admin, platform proxy tx)
GAME_WALLET_PRIVATE_KEY=

# Token gatekeeping (optional; MEWS/USDC type strings may also live in contracts JSON)
MIN_TOKEN_BALANCE=500000000

# =============================================================================
# Server
# =============================================================================
PORT=3001
NODE_ENV=development
CORS_ORIGIN=*
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
JWT_SECRET=your-jwt-secret-here

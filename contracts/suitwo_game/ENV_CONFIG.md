# Complete .env Configuration for Testnet

## 📋 All Contract Addresses and Object IDs

Copy these to your `backend/.env.local` file:

```env
# ==========================================
# Network Configuration
# ==========================================
SUI_TESTNET_NETWORK=testnet

# ==========================================
# Contract Package ID (Latest Deployment)
# ==========================================
# This is the main package containing:
# - score_submission module
# - premium_store module  
# - mews module (token)
GAME_SCORE_CONTRACT_TESTNET=0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a

# ==========================================
# Score Submission Module
# ==========================================
# Session Registry (shared object for duplicate prevention)
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x197d223a387443fbbe2e1f3e9ac37c4394d54fd4dbd7ae47ec1d4cae754df636

# Admin Capability (allows admin to submit scores on behalf of players)
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xf3f601a12345677efd29c7abc4b3d4d66d24d97a4de28f658275181b656083e4

# ==========================================
# Premium Store Module
# ==========================================
# Premium Store Contract (package ID - same as GAME_SCORE_CONTRACT_TESTNET)
PREMIUM_STORE_CONTRACT_TESTNET=0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a

# Premium Store (shared object managing player inventories)
PREMIUM_STORE_OBJECT_ID_TESTNET=0x9b5c134fcc5473f59aefb61dacfa070b38c503a36d1696ebce609f6774abd3af

# Premium Store Admin Capability (allows admin to consume items)
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x79340a11ed331412f232ebab5206cb083544b442eb146abb1310b5aac052257b

# ==========================================
# MEWS Token (Testnet)
# ==========================================
# MEWS Token Type ID (for balance checks, transfers, etc.)
MEWS_TOKEN_TYPE_ID_TESTNET=0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS

# MEWS TreasuryCap (for minting testnet tokens - keep secure!)
MEWS_TREASURY_CAP_OBJECT_ID_TESTNET=0x5f39df4a95196b95954100357d74f8405969e0cb4c3e16b1ca41bcbb8ddb7dba

# ==========================================
# Admin Wallet (Required)
# ==========================================
# Private key of the admin wallet (must own TreasuryCap and AdminCapabilities)
GAME_WALLET_PRIVATE_KEY=suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m

# ==========================================
# Token Configuration (Optional - for gatekeeping)
# ==========================================
# Minimum MEWS balance required to play (in raw units, 9 decimals)
# Example: 500000000 = 500,000 MEWS
MIN_TOKEN_BALANCE=500000000

# ==========================================
# Server Configuration (Optional)
# ==========================================
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

## 📝 Quick Copy-Paste Version

```env
SUI_TESTNET_NETWORK=testnet
GAME_SCORE_CONTRACT_TESTNET=0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x197d223a387443fbbe2e1f3e9ac37c4394d54fd4dbd7ae47ec1d4cae754df636
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xf3f601a12345677efd29c7abc4b3d4d66d24d97a4de28f658275181b656083e4
PREMIUM_STORE_CONTRACT_TESTNET=0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a
PREMIUM_STORE_OBJECT_ID_TESTNET=0x9b5c134fcc5473f59aefb61dacfa070b38c503a36d1696ebce609f6774abd3af
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x79340a11ed331412f232ebab5206cb083544b442eb146abb1310b5aac052257b
MEWS_TOKEN_TYPE_ID_TESTNET=0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS
MEWS_TREASURY_CAP_OBJECT_ID_TESTNET=0x5f39df4a95196b95954100357d74f8405969e0cb4c3e16b1ca41bcbb8ddb7dba
GAME_WALLET_PRIVATE_KEY=suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m
MIN_TOKEN_BALANCE=500000000
```

## 🔍 Verification

### Transaction Digests:
- **Latest Deployment**: `2Wfr3rUdC3mTiKGPLNyYswFHLuPdjEt7Eu2kZa22UK5D`
- **Score Submission Admin Capability**: `9KxF4Udt37Ah415tMspfgcECN13Ab2NYo9eFAu384hKx`
- **Premium Store Admin Capability**: `2rEetQGJGT5JDqwbafYUGWr5KGdrPk2rdXvEytJmbXkk`

### View on Sui Explorer:
- **Package**: https://suiexplorer.com/object/0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a?network=testnet
- **Latest Deployment**: https://suiexplorer.com/txblock/2Wfr3rUdC3mTiKGPLNyYswFHLuPdjEt7Eu2kZa22UK5D?network=testnet

## 📚 What Each Variable Does

| Variable | Purpose |
|----------|---------|
| `GAME_SCORE_CONTRACT_TESTNET` | Package ID - used to call score submission functions |
| `SESSION_REGISTRY_OBJECT_ID_TESTNET` | Prevents duplicate score submissions |
| `ADMIN_CAPABILITY_OBJECT_ID_TESTNET` | Allows admin to submit scores on behalf of players |
| `PREMIUM_STORE_CONTRACT_TESTNET` | Package ID - used to call premium store functions (same as GAME_SCORE_CONTRACT_TESTNET) |
| `PREMIUM_STORE_OBJECT_ID_TESTNET` | Manages player item inventories |
| `PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET` | Allows admin to consume items when players use them |
| `MEWS_TOKEN_TYPE_ID_TESTNET` | Used for balance checks and token transfers |
| `MEWS_TREASURY_CAP_OBJECT_ID_TESTNET` | Used for minting testnet MEWS tokens (keep secure!) |
| `GAME_WALLET_PRIVATE_KEY` | Admin wallet private key (signs transactions, pays gas) |
| `MIN_TOKEN_BALANCE` | Minimum MEWS balance required to play (in raw units) |

## ⚠️ Important Notes

1. **TreasuryCap Security**: The `MEWS_TREASURY_CAP_OBJECT_ID_TESTNET` controls minting. Keep it secure!
2. **Admin Capabilities**: Only the wallet that owns these can perform admin actions
3. **Network**: All IDs are for **testnet**. You'll need different IDs for mainnet
4. **Private Key**: Never commit the private key to version control!


# Current Deployment IDs (Most Recent)

**Last Updated:** Based on deployment transaction `GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG`

## 📦 Package IDs

### Main Package (All Modules)
- **Package ID:** `0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449`
- **Contains:** `score_submission`, `premium_store`, `badge_system` modules (excluding `mews`)

## 🎮 Score Submission Module

- **Session Registry:** `0x489662603b75f067d844ab813a4147430fd2cd96e4924582817849176e23b668`
- **Admin Capability:** `0xec8c392b8aac4a21e3086254104c3905a679dfbdd7de0385c4f5e74e933603c8`

## 🛒 Premium Store Module

- **Premium Store Object:** `0x5d81ea74fc508baace4a3b05ba1f856f841a487e4af7525d3a376ad05ee90d5c`
- **Admin Capability:** `0x11ff91a99bc6605cb775f1df01239560474507a3c8a45505132aac9f9e7de78a`

## 🏅 Badge System Module

- **Badge Registry:** `0x0b0f0629c311b64db45ad7b88f702a3ca311216332e8b8b25c9301da659a5981`
- **Publisher:** `0xf88aa1988898e4aaceae61297df3408957e11c41014cbecc05804e8df3cca802`
- **Display:** `0xd07a60a23e3d84c72ce14a76312a11fbf11a7c813ee3196d7508155af01773a7`

## 💰 MEWS Token (Old - Still in Use)

- **Token Type ID:** `0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS`
- **TreasuryCap:** `0x5f39df4a95196b95954100357d74f8405969e0cb4c3e16b1ca41bcbb8ddb7dba`

## 📝 Complete .env Configuration

```env
SUI_TESTNET_NETWORK=testnet

# Main Package ID (used for all modules)
GAME_SCORE_CONTRACT_TESTNET=0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449

# Score Submission Module
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x489662603b75f067d844ab813a4147430fd2cd96e4924582817849176e23b668
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xec8c392b8aac4a21e3086254104c3905a679dfbdd7de0385c4f5e74e933603c8

# Premium Store Module
PREMIUM_STORE_CONTRACT_TESTNET=0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449
PREMIUM_STORE_OBJECT_ID_TESTNET=0x5d81ea74fc508baace4a3b05ba1f856f841a487e4af7525d3a376ad05ee90d5c
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x11ff91a99bc6605cb775f1df01239560474507a3c8a45505132aac9f9e7de78a

# Badge System Module
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x0b0f0629c311b64db45ad7b88f702a3ca311216332e8b8b25c9301da659a5981
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0xf88aa1988898e4aaceae61297df3408957e11c41014cbecc05804e8df3cca802
BADGE_DISPLAY_OBJECT_ID_TESTNET=0xd07a60a23e3d84c72ce14a76312a11fbf11a7c813ee3196d7508155af01773a7

# MEWS Token (Old - Still in Use)
MEWS_TOKEN_TYPE_ID_TESTNET=0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS
MEWS_TREASURY_CAP_OBJECT_ID_TESTNET=0x5f39df4a95196b95954100357d74f8405969e0cb4c3e16b1ca41bcbb8ddb7dba

# Admin Wallet
GAME_WALLET_PRIVATE_KEY=suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m

# Optional Configuration
MIN_TOKEN_BALANCE=500000000
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

## ⚠️ Outdated Package IDs (Do Not Use)

- `0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed` (Previous deployment)
- `0x2ecb8d9a29816e1d8359b17adb62b4bffb9a34c8d0540f81c54729a8d6c14e4e` (Older deployment)
- `0xad85b74ca43ff929e5ad6a96d30ce979e7fc83a5f2ac65dd4dac0aeff0782be2` (Even older)

## 🔗 Transaction References

- **Deployment Transaction:** `GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG`
- **Score Admin Capability:** `6kxmv7eQJXEHnaM2eQkCXokyKj5zfLEEhbshydDNwsac`
- **Store Admin Capability:** `3EgYakmB6rXM8nyh9zEjbxqVjYhqnpToRcjcmcJGa9yP`
- **Badge Registry Init:** `FNChhLzYgEkXegeswPUSLc7NWucU5F2tN4DKWsCpQJxz`

## 🔍 View on Sui Explorer

- **Package:** https://suiexplorer.com/object/0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449?network=testnet
- **Deployment:** https://suiexplorer.com/txblock/GPsvcwadr6kQ6i2GvwsNVcZn5HSHqJ2KAMgEof5UswTG?network=testnet


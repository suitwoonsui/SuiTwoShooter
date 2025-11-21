# Current Deployment IDs (Most Recent)

**Last Updated:** Based on deployment transaction `EEpwYW2EN566p3x3onsApw7cJrq1MHdYRHQzeq4GYR5F`

## 📦 Package IDs

### Main Package (All Modules)
- **Package ID:** `0xe854820fb67bea5736cede2314d9f9eb4e4e58c3d0444d7d9ad7c5f402f21607`
- **Contains:** `score_submission`, `premium_store`, `badge_system` modules (excluding `mews`)
- **Changes:** Updated `badge_system` module with `image_url` field in Display object

## 🎮 Score Submission Module

- **Session Registry:** `0x633c18fc9eccfa124507189045e82d6251fde7e69b31a8f6e5a182b7387c96c0`
- **Statistics Registry:** `0x64d873a89bbe606440f1075c369d1acd01514bb1b907982ebb99587f40173ad5`
- **Admin Capability:** `0x94975792365e0131a0765839a614bd91529095a72a6dddc2a7b1bf19c51e20e1`

## 🛒 Premium Store Module

- **Premium Store Object:** `0xcded0251b322695955227ed8b8f2ba47b4da11d7b81666aaa88389c0e49d381c`
- **Admin Capability:** `0x147a9450fe11b1d78c4fd3abd0eaab2d59ea1ee4357174c36533ce6a646929c6`

## 🏅 Badge System Module

- **Badge Registry:** `0x34f6768a126e82c0cfba188cd1fe132eb8d5ff23f99b611a52bb4f300fa61420`
- **Publisher:** `0x790c4f16b75f687298762914c39acdbf7370cfec5f4559040c70a5c56d067899`
- **Display:** `0xd07a60a23e3d84c72ce14a76312a11fbf11a7c813ee3196d7508155af01773a7` (from previous deployment - may need to recreate)

## 💰 MEWS Token (Old - Still in Use)

- **Token Type ID:** `0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS`
- **TreasuryCap:** `0x5f39df4a95196b95954100357d74f8405969e0cb4c3e16b1ca41bcbb8ddb7dba`

## 📝 Complete .env Configuration

```env
SUI_TESTNET_NETWORK=testnet

# Main Package ID (used for all modules)
GAME_SCORE_CONTRACT_TESTNET=0xe854820fb67bea5736cede2314d9f9eb4e4e58c3d0444d7d9ad7c5f402f21607

# Score Submission Module
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x633c18fc9eccfa124507189045e82d6251fde7e69b31a8f6e5a182b7387c96c0
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x64d873a89bbe606440f1075c369d1acd01514bb1b907982ebb99587f40173ad5
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x94975792365e0131a0765839a614bd91529095a72a6dddc2a7b1bf19c51e20e1

# Premium Store Module
PREMIUM_STORE_CONTRACT_TESTNET=0xe854820fb67bea5736cede2314d9f9eb4e4e58c3d0444d7d9ad7c5f402f21607
PREMIUM_STORE_OBJECT_ID_TESTNET=0xcded0251b322695955227ed8b8f2ba47b4da11d7b81666aaa88389c0e49d381c
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x147a9450fe11b1d78c4fd3abd0eaab2d59ea1ee4357174c36533ce6a646929c6

# Badge System Module
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x34f6768a126e82c0cfba188cd1fe132eb8d5ff23f99b611a52bb4f300fa61420
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0x790c4f16b75f687298762914c39acdbf7370cfec5f4559040c70a5c56d067899
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

- `0x584da464e9e5fabb5989a4abc1afa6e8eeef866cddc9db7ca97988e1d9624449` (Previous deployment)
- `0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed` (Older deployment)
- `0x2ecb8d9a29816e1d8359b17adb62b4bffb9a34c8d0540f81c54729a8d6c14e4e` (Even older)
- `0xad85b74ca43ff929e5ad6a96d30ce979e7fc83a5f2ac65dd4dac0aeff0782be2` (Oldest)

## 🔗 Transaction References

- **Deployment Transaction:** `EEpwYW2EN566p3x3onsApw7cJrq1MHdYRHQzeq4GYR5F`
- **Score Admin Capability:** `9Mz8Lb96QH6oamvju6qewB2GuALdkRDo26vEC3puQUXi`
- **Store Admin Capability:** `8oyjgMuVWjutzJrf68H3NpiAYaooxkNSLvAuGLinT3TJ`
- **Badge Registry Init:** `EWNMWRcwz2dzv4p42jArcPVHMCJ6YCN75xQ7whuxv6Sr`

## 🔍 View on Sui Explorer

- **Package:** https://suiexplorer.com/object/0xe854820fb67bea5736cede2314d9f9eb4e4e58c3d0444d7d9ad7c5f402f21607?network=testnet
- **Deployment:** https://suiexplorer.com/txblock/EEpwYW2EN566p3x3onsApw7cJrq1MHdYRHQzeq4GYR5F?network=testnet


# Current Deployment IDs - Testnet

**Deployment Date:** 2025-01-21  
**Transaction Digest:** FiFL46L99TqY3h91EfNLy2pbu8uLR7yFEPC6kZStQRTo

## Package ID
```
GAME_SCORE_CONTRACT_TESTNET=0xa235c3069ff0f2cd158ab6ecd9eccc436c094f064e3b5625957f88e3f47e0884
```

## Core Objects

### Session Registry
```
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x35d516af310214cbf38f0c35501aed67935edca9358015a4697b7676f35b3dca
```

### Statistics Registry
```
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0xc571745efd08026b227adbde98912b73fa8b560a4f4ba6eaf99253b2e95e51f1
```

### Premium Store
```
PREMIUM_STORE_OBJECT_ID_TESTNET=0x128dc80fdb1da719228386a8a6f1f59e986034ab78825bf10e36df562ac56d55
```

## Badge System

### Badge Registry
```
BADGE_REGISTRY_OBJECT_ID_TESTNET=0xf5c540640b3d63877c2c249656bd1c18c45e9d319bf05a89ef74cc75951be36d
```

### Badge Publisher
```
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0x8e687b671148061b67c3ecbeb76f27b095064454d9381abf00f01ff9eec60b22
```

### Badge Display
```
BADGE_DISPLAY_OBJECT_ID_TESTNET=0x9301a8b5f64f7ef5dbee5347f375d7af53654a3811b5255ba7d9fe8bac9e1bf2
```

## Admin Capabilities

### Score Submission Admin Capability
```
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x5c4ae89cfc61de3c021ee3561d68bf8d587be9b3cba1363b35e34dd5c4eb6b4b
```

### Premium Store Admin Capability
```
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x846c2e9e2788b6c53f9c8522d6e146fb4420eb3c8940814acf92e8474bafcf96
```

## Complete .env Configuration

Copy these to your `backend/.env.local`:

```env
# Package IDs
GAME_SCORE_CONTRACT_TESTNET=0xa235c3069ff0f2cd158ab6ecd9eccc436c094f064e3b5625957f88e3f47e0884
PREMIUM_STORE_CONTRACT_TESTNET=0xa235c3069ff0f2cd158ab6ecd9eccc436c094f064e3b5625957f88e3f47e0884

# Core Objects
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x35d516af310214cbf38f0c35501aed67935edca9358015a4697b7676f35b3dca
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0xc571745efd08026b227adbde98912b73fa8b560a4f4ba6eaf99253b2e95e51f1
PREMIUM_STORE_OBJECT_ID_TESTNET=0x128dc80fdb1da719228386a8a6f1f59e986034ab78825bf10e36df562ac56d55

# Badge System
BADGE_REGISTRY_OBJECT_ID_TESTNET=0xf5c540640b3d63877c2c249656bd1c18c45e9d319bf05a89ef74cc75951be36d
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0x8e687b671148061b67c3ecbeb76f27b095064454d9381abf00f01ff9eec60b22
BADGE_DISPLAY_OBJECT_ID_TESTNET=0x9301a8b5f64f7ef5dbee5347f375d7af53654a3811b5255ba7d9fe8bac9e1bf2

# Admin Capabilities
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x5c4ae89cfc61de3c021ee3561d68bf8d587be9b3cba1363b35e34dd5c4eb6b4b
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x846c2e9e2788b6c53f9c8522d6e146fb4420eb3c8940814acf92e8474bafcf96
```

## Transaction Links

- **Deployment:** https://suiexplorer.com/txblock/FiFL46L99TqY3h91EfNLy2pbu8uLR7yFEPC6kZStQRTo?network=testnet
- **Badge Registry Init:** https://suiexplorer.com/txblock/8SxAqZNRcSyuxaJZA6JhiCkkCYmp7hKryFGgHEahHsoE?network=testnet
- **Badge Display:** https://suiexplorer.com/txblock/7APN5GfyjgSPKgATNFVGk8Dyqgp7kmpjhtHzKkymW8c5?network=testnet
- **Admin Capabilities:** 
  - Score: https://suiexplorer.com/txblock/GrMBUERfF9SteehmXGveuwBW1DvQrTT7vsHc6TyD5yeQ?network=testnet
  - Store: https://suiexplorer.com/txblock/7uPrRsRL68tULaDiD7wFwPivbx81Vr6oYT6c8xAxzd1r?network=testnet

## Changes in This Deployment

1. ✅ Added `image: String` field to `EarlySupporterBadge` struct for Display support
2. ✅ Updated Display template to use `{image}` placeholder (data URI)
3. ✅ Updated `mint_badge`, `admin_mint_badge`, and `update_badge_tier` to accept `image_data_uri` parameter
4. ✅ Backend now generates data URI from image bytes and passes it to mint functions
5. ✅ Fixed all unused variable/constant warnings
6. ✅ Batched chunk uploads into single transaction (reduces 5 transactions to 2)

## Next Steps

1. Update your `backend/.env.local` with the IDs above
2. Restart your backend server
3. Test badge minting - images should now display in Slush Wallet and SuiVision!

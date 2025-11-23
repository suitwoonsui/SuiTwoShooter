# Current Deployment IDs - Testnet

**Deployment Date:** 2025-01-22  
**Transaction Digest:** 28Pt6vgDgpvm8ocKibmbigEj6nJhPsv4nrfPvQdoC2Hb

## Package ID
```
GAME_SCORE_CONTRACT_TESTNET=0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b
```

## Core Objects

### Session Registry
```
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x71600b432df127784a133b819efb46c399d54020926419a6b4f8f7f4a035a42a
```

### Statistics Registry
```
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x4615f449ebbc41df8c9ed234b86c25b07dd0dbb25672cb043c17e05483b5c48f
```

### Premium Store
```
PREMIUM_STORE_OBJECT_ID_TESTNET=0x5d2b4aaabf7b79632e67e7aac77a1e692f3af18ccbfaaea5f9719de0b1eff81b
```

## Badge System

### Badge Registry
```
BADGE_REGISTRY_OBJECT_ID_TESTNET=0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf
```

### Badge Publisher
```
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0xbea00530109982af37b5134fc7236a040735869d67341ce9b953167dc49aee43
```

### Badge Display
```
BADGE_DISPLAY_OBJECT_ID_TESTNET=0xb54e2d9581fbb539115c624a3601b16ddc2643999d12dab2de7020662b130c8d
```

## Admin Capabilities

### Score Submission Admin Capability
```
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x234f6dfacb9b4e9ff7e78aac754ec741af7786d76cd9cf3f7b7c7b2626782118
```

### Premium Store Admin Capability
```
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xd3a5d0f63617e4bdfca0b3e2eb32e78e9994ffb26d5a98ff88536daccf5e55d1
```

## Complete .env Configuration

Copy these to your `backend/.env.local`:

```env
# Package IDs
GAME_SCORE_CONTRACT_TESTNET=0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b
PREMIUM_STORE_CONTRACT_TESTNET=0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b

# Core Objects
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x71600b432df127784a133b819efb46c399d54020926419a6b4f8f7f4a035a42a
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x4615f449ebbc41df8c9ed234b86c25b07dd0dbb25672cb043c17e05483b5c48f
PREMIUM_STORE_OBJECT_ID_TESTNET=0x5d2b4aaabf7b79632e67e7aac77a1e692f3af18ccbfaaea5f9719de0b1eff81b

# Badge System
BADGE_REGISTRY_OBJECT_ID_TESTNET=0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0xbea00530109982af37b5134fc7236a040735869d67341ce9b953167dc49aee43
BADGE_DISPLAY_OBJECT_ID_TESTNET=0xb54e2d9581fbb539115c624a3601b16ddc2643999d12dab2de7020662b130c8d

# Admin Capabilities
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x234f6dfacb9b4e9ff7e78aac754ec741af7786d76cd9cf3f7b7c7b2626782118
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xd3a5d0f63617e4bdfca0b3e2eb32e78e9994ffb26d5a98ff88536daccf5e55d1
```

## Transaction Links

- **Deployment:** https://suiexplorer.com/txblock/28Pt6vgDgpvm8ocKibmbigEj6nJhPsv4nrfPvQdoC2Hb?network=testnet
- **Badge Registry Init:** https://suiexplorer.com/txblock/484Jg77m5rKY16dK3g85fYpXZbLVkEyNzuPD5732zuKk?network=testnet
- **Badge Display:** https://suiexplorer.com/txblock/7dHNiqwZkEbvD4sy2yD6pJ2pfKDDLYQbgBMRD5GFxypu?network=testnet
- **Admin Capabilities:** 
  - Score: https://suiexplorer.com/txblock/GT2UKqcpefqtGfjRcudjHXj3CNn26P156xTcEtza9HYo?network=testnet
  - Store: https://suiexplorer.com/txblock/5aTbuzSVmdA7UFUDSBf9EVmraJGdhUxoXyuNL5xX1PbY?network=testnet

## Changes in This Deployment

1. ✅ Contract changes as specified by user
2. ✅ All object IDs extracted and verified
3. ✅ Badge system initialized and Display created
4. ✅ Admin capabilities created for both modules

## Next Steps

1. Update your `backend/.env.local` with the IDs above
2. Restart your backend server
3. Test badge minting and other functionality

# Current Deployment IDs - Testnet

**Deployment Date:** 2025-01-22  
**Transaction Digest:** B8rJBJXm6voZfCXtJwpARKuL38HZxYv8vd9S4Er2iFTF

## Package ID
```
GAME_SCORE_CONTRACT_TESTNET=0x9b981a5b3d2acbee7ed3989e1707de1c5868d9e1ff89b6b14a107cff9fac96b1
```

## Core Objects

### Session Registry
```
SESSION_REGISTRY_OBJECT_ID_TESTNET=0xffc2fb76cd7577e727290ea6d3e19aa77c37bc12488d2f36a662bc9607b49961
```

### Statistics Registry
```
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x0149889ecbe3a016311948a0bfe085a786084cabfa3d0bd90de04392850563d0
```

### Premium Store
```
PREMIUM_STORE_OBJECT_ID_TESTNET=0x0e1dbffe710228fdfd97f756c039561734ebb2449ddac7ed8707f42f3a80afe8
```

## Badge System

### Badge Registry
```
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x1cb677b4137bc11d769a7c3535fd5dbace039d5c3970de651f1993aa30cfd6da
```

### Badge Publisher
```
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0xc77412f3ab618a37ad3d2d8f3e07ba02596baefbeabc47daad68f1d99c730830
```

### Badge Display
```
BADGE_DISPLAY_OBJECT_ID_TESTNET=0x7332465bcf83287e5ecbe48c6edf97f6a58b26583778269aea8994ca6412f787
```

## Admin Capabilities

### Score Submission Admin Capability
```
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xbe64cb86c5b1bdb6407d5582c26b2bdf8dbbe8d4a12c9fc3a41d4c6b9ab863ef
```

### Premium Store Admin Capability
```
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xa8e67ae41ebf85b982ef8ff3dd99a42db6675ccf6704f6531215ff212d5d6307
```

## Complete .env Configuration

Copy these to your `backend/.env.local`:

```env
# Package IDs
GAME_SCORE_CONTRACT_TESTNET=0x9b981a5b3d2acbee7ed3989e1707de1c5868d9e1ff89b6b14a107cff9fac96b1
PREMIUM_STORE_CONTRACT_TESTNET=0x9b981a5b3d2acbee7ed3989e1707de1c5868d9e1ff89b6b14a107cff9fac96b1

# Core Objects
SESSION_REGISTRY_OBJECT_ID_TESTNET=0xffc2fb76cd7577e727290ea6d3e19aa77c37bc12488d2f36a662bc9607b49961
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x0149889ecbe3a016311948a0bfe085a786084cabfa3d0bd90de04392850563d0
PREMIUM_STORE_OBJECT_ID_TESTNET=0x0e1dbffe710228fdfd97f756c039561734ebb2449ddac7ed8707f42f3a80afe8

# Badge System
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x1cb677b4137bc11d769a7c3535fd5dbace039d5c3970de651f1993aa30cfd6da
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0xc77412f3ab618a37ad3d2d8f3e07ba02596baefbeabc47daad68f1d99c730830
BADGE_DISPLAY_OBJECT_ID_TESTNET=0x7332465bcf83287e5ecbe48c6edf97f6a58b26583778269aea8994ca6412f787

# Admin Capabilities
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xbe64cb86c5b1bdb6407d5582c26b2bdf8dbbe8d4a12c9fc3a41d4c6b9ab863ef
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xa8e67ae41ebf85b982ef8ff3dd99a42db6675ccf6704f6531215ff212d5d6307
```

## Transaction Links

- **Deployment:** https://suiexplorer.com/txblock/B8rJBJXm6voZfCXtJwpARKuL38HZxYv8vd9S4Er2iFTF?network=testnet
- **Badge Registry Init:** https://suiexplorer.com/txblock/7f3tHdK4Uth4iiKbFNWbUriC2AejnVYjgspzSTRLVbt2?network=testnet
- **Badge Display:** https://suiexplorer.com/txblock/5Y8TLNnXq4ei6p5vNN56FkKEsvh25jNUsr5xXHGMQV9K?network=testnet
- **Admin Capabilities:** 
  - Score: https://suiexplorer.com/txblock/DfQDN2k5gLZ1q2VQNVmPNNqi3CjqRwuEPpfmMc1zz8HA?network=testnet
  - Store: https://suiexplorer.com/txblock/HUxJ1ErWVM2yjRB99viANDLGPitE1NH1SHJ9kxmRe8y3?network=testnet

## Changes in This Deployment

1. ✅ Contract changes as specified by user
2. ✅ All object IDs extracted and verified
3. ✅ Badge system initialized and Display created
4. ✅ Admin capabilities created for both modules

## Next Steps

1. Update your `backend/.env.local` with the IDs above
2. Restart your backend server
3. Test badge minting and other functionality

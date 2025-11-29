# 🎯 DEPLOYMENT IDs - SINGLE SOURCE OF TRUTH

**⚠️ THIS IS THE ONLY FILE YOU NEED FOR CONTRACT IDs**

**Latest Deployment Date:** 2025-11-29  
**Transaction Digest:** 51j6wKCrvqN7y4af2hmNjZ9wFuqq55MNAT5VtFSpC5vc

---

## 📋 Copy This to `backend/.env.local`

```env
# ==========================================
# Main Package ID (contains all modules: score_submission, premium_store, badge_system)
# ==========================================
GAME_SCORE_CONTRACT_TESTNET=0x7b109d8d984b8eb98ea4d7062e9096a2215f38931c4948379cc9d4bb405deb2a
OLD_GAME_SCORE_CONTRACT_TESTNET=0xa3ffec0c56b0dce661b42b1fec391d5d148bb6975d6e3fb2ce9dbb7239fb2aed

# ==========================================
# Score Submission Module
# ==========================================
SESSION_REGISTRY_OBJECT_ID_TESTNET=0xb485b5ad10150938c10c231f964d4bcc8593b35d1647b5f13c3fd89d504ec014
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x44283e1d2fab3c8c66ef46ff0d8024fdd077fa45ccf15d5a3ef657144d83426c
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x131f1cb551bea1cff12a0d3db9c3a9422aa60dfc00d773cbe43c0362d442648f
OLD_SESSION_REGISTRY_OBJECT_ID_TESTNET=0x1010db249420f842e9dc7c6d2c76e19e23b7486e8833fdfd3199b9713f99dfba
OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0xbb4e4c42aefc7cfcc0bc7bc3e83124318fbe99f788e183ee240077fd463ad37e
OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xc4e5d0122be95d7d1b2fb3200c0006b4c0b8f56b7e501f43d9406b2c0b1c8bfd

# ==========================================
# Premium Store Module
# ==========================================
PREMIUM_STORE_CONTRACT_TESTNET=0x7b109d8d984b8eb98ea4d7062e9096a2215f38931c4948379cc9d4bb405deb2a
PREMIUM_STORE_OBJECT_ID_TESTNET=0x3f75df2b72d776a6f0a8fd6dcf145cbbd0f7a8158a969fc91c842c188344fcc9
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x5d91bf04a5eebbe8d99b014b5ea1d885bdb8e2690eecbf073f1d7f6bff230909
OLD_PREMIUM_STORE_CONTRACT_TESTNET=0xa3ffec0c56b0dce661b42b1fec391d5d148bb6975d6e3fb2ce9dbb7239fb2aed
OLD_PREMIUM_STORE_OBJECT_ID_TESTNET=0x1f566ccc883e126d822f3f457ec377198b5b8e1ca96e92f623e864950a6ba1bc
OLD_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xe8dbc5cfcb3f21ec35dd1a9162c64adc0fc7ede15d91ab99a605477f2a1639fb

# ==========================================
# Badge System Module
# ==========================================
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x1e84e8028c34082de5a7dcd786f70bdaeb596cd82059cf3093e29b6399f8cd3b
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0xab4b373c78eae42c2c0455fabc72cbbd358a083c6b1649e4bc274b069296df72
BADGE_DISPLAY_OBJECT_ID_TESTNET=0x4ce1ed3df4d00755eb4c59a75647648eb3c0910520232b797aa5c007d5a3b0f3
OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=0x3505946853a6f673adc02a3004fc501fdadc7ab8eb2da6a08943a7f101ede851
OLD_BADGE_PUBLISHER_OBJECT_ID_TESTNET=0x6e45666d306b38ae992bb697f34fa3a86bdd1f6afc9727c38c54e9438b4e938d
OLD_BADGE_DISPLAY_OBJECT_ID_TESTNET=0x9d00893d78de798aaddeb2db702e95458c84b48764ed4d6c5fe428b605d8bc20
```

---

## 🔗 Transaction Links

- **Latest Deployment:** https://suiexplorer.com/txblock/51j6wKCrvqN7y4af2hmNjZ9wFuqq55MNAT5VtFSpC5vc?network=testnet
- **Package:** https://suiexplorer.com/object/0x7b109d8d984b8eb98ea4d7062e9096a2215f38931c4948379cc9d4bb405deb2a?network=testnet
- **Note:** Specific initialization transactions (Badge Registry, Display, Admin Capabilities) can be found by examining the object creation transactions on Sui Explorer

---

## ✅ Verification Checklist

- ✅ Package deployed: `0x7b109d8d984b8eb98ea4d7062e9096a2215f38931c4948379cc9d4bb405deb2a`
- ✅ Session Registry initialized
- ✅ Statistics Registry initialized
- ✅ Premium Store initialized
- ✅ Badge Registry initialized
- ✅ Badge Display created with `{image}` template
- ✅ Admin capabilities created for both modules

---

## 📜 Deployment History (All Package IDs)

All deployments in reverse chronological order (newest to oldest) - **Verified by blockchain timestamps**:

### 1. Current Deployment (2025-11-29 02:08:00 UTC) ⭐ **ACTIVE**
**Package ID:** `0x7b109d8d984b8eb98ea4d7062e9096a2215f38931c4948379cc9d4bb405deb2a`  
**Transaction:** `51j6wKCrvqN7y4af2hmNjZ9wFuqq55MNAT5VtFSpC5vc`  
**Status:** ✅ Active

### 2. Previous Deployment (2025-11-29 00:09:42 UTC) ⭐ **OLD_ VALUES SOURCE**
**Package ID:** `0xa3ffec0c56b0dce661b42b1fec391d5d148bb6975d6e3fb2ce9dbb7239fb2aed`  
**Transaction:** `zngPr8tHgTgYs3cjTiBCXBuokKe8fbL64nyfZg6sgEQ`  
**Status:** ⚠️ Deprecated  
**Note:** ✅ **All `OLD_` prefixed IDs in the config above are from this deployment**

### 3. Unused Deployment (2025-11-29 02:46:06 UTC)
**Package ID:** `0x10666e8f2da2023c89e5d3b5259fa6e091a10ddd862536afdd1eedad4e53591b`  
**Transaction:** `ACuUuNH4f3aa3m3eQw2DGQMCGzbcvkScTPHN2bcYTHki`  
**Status:** ⚠️ Not in use (Deployment process not suitable - reverted)  
**Note:** This was deployed after the current deployment but was reverted

### 4. Earlier Deployment (2025-11-26)
**Package ID:** `0x93bef2e0ab5e8ea8df5a210e47204a68083d1d437966dc4121cd048bda6358ef`  
**Transaction:** `EUB1sJcRHB5RY6G1zZstbLRkagWrfesUUM5XZz91ZaQT`  
**Status:** ⚠️ Deprecated

### 4. Earlier Deployment (2025-11-26 13:20:31 UTC)
**Package ID:** `0x8fd0510821f3cd408347bb6f851a358ae9db80d93c4f5b580d65d0304b60c4cb`  
**Transaction:** `2LZ3PRuGAgN45icUpbMgj18NtpWKN1kv5Ab6EuFGvKxD`  
**Status:** ⚠️ Deprecated

### 5. Earlier Deployment (2025-11-25 21:19:52 UTC)
**Package ID:** `0x5a4d10695a27145386b510797c2305bf0de82e2dc94e0c19c9717f490d40f110`  
**Transaction:** `5T5W2rcT2sGGRpFcczkkZR2T8m3CJ1a2vTry9FBHRZyu`  
**Status:** ⚠️ Deprecated

### 6. Earlier Deployment (2025-11-23 15:47:22 UTC) - **COMPLETE BADGE SYSTEM**
**Package ID:** `0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b`  
**Transaction:** `28Pt6vgDgpvm8ocKibmbigEj6nJhPsv4nrfPvQdoC2Hb`  
**Status:** ⚠️ Deprecated  
**Note:** ✅ **This package has ALL required objects for badge operations:**
- Session Registry: `0x71600b432df127784a133b819efb46c399d54020926419a6b4f8f7f4a035a42a`
- Statistics Registry: `0x4615f449ebbc41df8c9ed234b86c25b07dd0dbb25672cb043c17e05483b5c48f`
- Premium Store: `0x5d2b4aaabf7b79632e67e7aac77a1e692f3af18ccbfaaea5f9719de0b1eff81b`
- Badge Registry: `0xd49058b5bfdb6c05890e68d869ad4ff98ab3b7a681593e0c5d8e6486f42917bf`
- Badge Publisher: `0xbea00530109982af37b5134fc7236a040735869d67341ce9b953167dc49aee43`
- Admin Capability: `0x234f6dfacb9b4e9ff7e78aac754ec741af7786d76cd9cf3f7b7c7b2626782118`
- Premium Store Admin Capability: `0xd3a5d0f63617e4bdfca0b3e2eb32e78e9994ffb26d5a98ff88536daccf5e55d1`

### 5. Earlier Deployment (2025-11-21 17:38:00 UTC)
**Package ID:** `0x6df4ec20614cbf2b407de12997bb5fa689f7ec2833a3df3ea84cd9986f3f448d`  
**Transaction:** `Du1xBYhNtksBN9G6hNb4tmNLQRzbARmDaDMLgfvw6TZk`  
**Status:** ⚠️ Deprecated

### 6. Earlier Deployment (2025-11-19 16:50:59 UTC)
**Package ID:** `0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed`  
**Transaction:** `vDN8wgCwvv26iJAJfkEM5nqB5ugpvoVRdgo7WxTFiL9`  
**Status:** ⚠️ Deprecated

### 7. Earlier Deployment (2025-11-14 21:07:21 UTC)
**Package ID:** `0x6e2cb689422cb1a2d4d3ed3817242e2f298ee6e5ab7afbcbb548475118834faa`  
**Transaction:** `5G2YjAjG2UPwSVFod6Lx2VDvPTTLxnwg3ybUYaeWhoX2`  
**Status:** ⚠️ Deprecated

### 8. Earlier Deployment - MEWS Token (2025-11-14 14:45:29 UTC)
**Package ID:** `0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a`  
**Transaction:** `2Wfr3rUdC3mTiKGPLNyYswFHLuPdjEt7Eu2kZa22UK5D`  
**Status:** ⚠️ Deprecated (MEWS token from earlier deployment)

---

## 📝 Notes

1. **This is the ONLY file with current deployment IDs** - All other files are outdated
2. **Copy the entire `.env` section above** to your `backend/.env.local`
3. **Restart your backend server** after updating the `.env` file
4. **All `OLD_` prefixed IDs are from the previous deployment** (`0xa3ffec0c56b0dce661b42b1fec391d5d148bb6975d6e3fb2ce9dbb7239fb2aed`) - The deployment before the current active deployment
5. **Deployment `0x10666e8f2da2023c89e5d3b5259fa6e091a10ddd862536afdd1eedad4e53591b` is not in use** - It was deployed but reverted due to process incompatibility
6. **Deployment History:** Use the section above to reference any previous deployment package ID if needed


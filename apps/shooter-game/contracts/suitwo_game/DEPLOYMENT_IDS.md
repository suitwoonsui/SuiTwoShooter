# 🎯 DEPLOYMENT IDs - SINGLE SOURCE OF TRUTH

**⚠️ THIS IS THE ONLY FILE YOU NEED FOR CONTRACT IDs**

**Latest Deployment Date:** 2025-12-30  
**Transaction Digest:** Ebff5a7dR75ZPrXyroj2JAg5qBLnPNRWCwr7fSaztiTV

---

## ⚠️ **CRITICAL: Update Your Backend Environment Variables**

**After this deployment, you MUST update your `backend/.env` (or `backend/.env.local`) file with the new IDs below.**

**IMPORTANT:** The OLD_ variables point to the **previous deployment** (2025-12-30 deployment `0xea5767f2e72096e637f2f64175aa8931c6cd3fde3dc7cc450dc9399ec1daf4c6`) so you can migrate data FROM the old contracts TO the new contracts. Use the migration functions (`migrate_player_stats()`, `migrate_game_pass()`, etc.) to transfer data.

**Restart your backend server after updating the `.env` file.**

---

## 📋 Copy This to `backend/.env` (or `backend/.env.local`)

```env
# ==========================================
# Main Package ID (contains all modules: score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments)
# CURRENT: 2025-12-30 deployment (Latest)
# OLD: 2025-12-28 deployment (Previous deployment - migrate FROM this)
# ==========================================
GAME_SCORE_CONTRACT_TESTNET=0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c
OLD_GAME_SCORE_CONTRACT_TESTNET=0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352

# ==========================================
# Score Submission Module
# CURRENT: 2025-12-30 deployment
# OLD: 2025-12-28 deployment (Previous deployment - migrate FROM this)
# ==========================================
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x311eeee18667dfc79d975c169eb13fc5095e1c1e2a7902d93d70f00afb36b4f8
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x35ebc1b5ba57f4d644fe4f079437b1d803e006af83cafd8459d104ab0ded20de
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x4665e4056c0733ffd677f7bf99dde38d551760fba1f7288203493b91d7b0ea83
OLD_SESSION_REGISTRY_OBJECT_ID_TESTNET=0x2bc7c3ef2b4f82d97e1d9d2e7fd77030c233de3b9bcbb91d53effe7ca8a8b5c9
OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x1e8e0cd84fbe743a73f94c36d812cbda2e8e5038fcf3198daf1239b8893859ff
OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x9dd5b65e66d5183a17e872ecbf505867d48b5f282f5e91db9256e28e9aeedd6b

# ==========================================
# Premium Store Module
# CURRENT: 2025-12-30 deployment
# OLD: 2025-12-28 deployment (Previous deployment - migrate FROM this)
# ==========================================
PREMIUM_STORE_CONTRACT_TESTNET=0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c
PREMIUM_STORE_OBJECT_ID_TESTNET=0x08d63266cbbcc94732452e4d5a066293bcb6da05507d3ab64d3e76e61873e611
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x4f07bc6864ad205ef3f326b22e6e8978b273a00ad18e0a1c425862a46c5ac4af
OLD_PREMIUM_STORE_CONTRACT_TESTNET=0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352
OLD_PREMIUM_STORE_OBJECT_ID_TESTNET=0x2919169a7ebadd3c95f4c9c1b2c4c9b9a5c9185ef69a3208b1866f9c81df8559
OLD_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x72bc9ca7955b1aaabbe8559fb52b624fadcabcb2f3a3ceebd71c69b7e36b1fb1

# ==========================================
# Badge System Module
# CURRENT: 2025-12-30 deployment
# OLD: 2025-12-23 deployment (Previous deployment - migrate FROM this)
# ==========================================
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x579d8a1a230e5677ca35c5c6a990ca6ab63381dcade99f3d61b45b417bb18d90
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0x113479f89399eed5b6245f3baa725f398023aafc417373bc5aad4db275fdd42f
BADGE_DISPLAY_OBJECT_ID_TESTNET=0x7cf41aac01fd0549f2f56815ea4eb984d45cdbc4bb418d729cf353cf2cc2866d
OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=0xffe8897a143f156d7818a192f45980f775e706d260da654384f022541fa4c54f
OLD_BADGE_PUBLISHER_OBJECT_ID_TESTNET=0x113479f89399eed5b6245f3baa725f398023aafc417373bc5aad4db275fdd42f
OLD_BADGE_DISPLAY_OBJECT_ID_TESTNET=0x7cf41aac01fd0549f2f56815ea4eb984d45cdbc4bb418d729cf353cf2cc2866d

# ==========================================
# Achievement System Module
# CURRENT: 2025-12-30 deployment
# OLD: 2025-12-23 deployment (Previous deployment - migrate FROM this)
# NOTE: Removed deprecated claimed_milestones table - now only uses claimed_milestone_ids for stable tracking
# ==========================================
ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET=0x4e3c1de8910099460fe7c04af40b72ed998f48781bfa8a2efa6a07c141f3e088
ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xea7dac1c80d7bc7d003bd8b3dd66650be17ec567968dd72a747bc816711c72ab
OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET=0xfc76f5ab60dd46d791dcbd08188f6ff78324708ed3b136c7f6e00b4aee19826d
OLD_ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x4e7e80aa1caf3e92b42217c9e9da73441cb861606a52368bab4029450c6c4150

# ==========================================
# Game Pass Module
# CURRENT: 2025-12-30 deployment
# OLD: 2025-12-28 deployment (Previous deployment - migrate FROM this)
# ==========================================
GAME_PASS_CONTRACT_TESTNET=0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c
GAME_PASS_SYSTEM_OBJECT_ID_TESTNET=0x20339cbeb9382c6a5e9f0ec9415f92490dc2c2c6eb60e5911b54d348bebdf173
OLD_GAME_PASS_CONTRACT_TESTNET=0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352
OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET=0x2cae3046a912fdc95ea69098181c4125c72f6a601a55b3e0197eb2dd359475aa

# ==========================================
# Tournament Module
# CURRENT: 2025-12-30 deployment
# OLD: Previous 2025-12-30 deployment (Previous deployment - migrate FROM this)
# OLD_OLD: Even older deployment (if needed)
# ==========================================
TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET=0xe1ddf8ecdbfbf9d2f3c848e5481c1bbd7729db4cb3e326d99ece9d24de2af530
TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x4cdc7a4f3d6f9edb7ff88d5c71a1bd30d58f2b782317f8be04d5fd106e11a703
OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET=0x160a5611d94a131a6d5076312fc063d57cada0ae5e8e55ed47f4b2c23967d63b
OLD_TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xac645ea965a7207627e7fc5a02609b999a70a133c73157ab903e61b6a0e88bf2
OLD_OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET=0x221cbe8738cfc33e2fa68afe59a0fa60747358116675b1b11324cce464121498
OLD_OLD_TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x10553df7e99b3d7156d3e2b0e022df0fac0ccbbee94e4383880a0d12dc9923a6
```

---

## 🔗 Transaction Links

- **Latest Deployment (Package Publish):** https://suiexplorer.com/txblock/Ebff5a7dR75ZPrXyroj2JAg5qBLnPNRWCwr7fSaztiTV?network=testnet
- **Package:** https://suiexplorer.com/object/0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c?network=testnet
- **Admin Capabilities:** Created in separate transactions (Score, Premium Store, Tournament, Achievement)

---

## ✅ Verification Checklist

- ✅ Package deployed: `0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c`
- ✅ Session Registry initialized: `0x311eeee18667dfc79d975c169eb13fc5095e1c1e2a7902d93d70f00afb36b4f8`
- ✅ Statistics Registry initialized: `0x35ebc1b5ba57f4d644fe4f079437b1d803e006af83cafd8459d104ab0ded20de`
- ✅ Premium Store initialized: `0x08d63266cbbcc94732452e4d5a066293bcb6da05507d3ab64d3e76e61873e611`
- ✅ Badge Registry initialized: `0x579d8a1a230e5677ca35c5c6a990ca6ab63381dcade99f3d61b45b417bb18d90`
- ✅ Badge Publisher: `0x113479f89399eed5b6245f3baa725f398023aafc417373bc5aad4db275fdd42f` (persistent from previous deployment)
- ✅ Badge Display: `0x7cf41aac01fd0549f2f56815ea4eb984d45cdbc4bb418d729cf353cf2cc2866d` (persistent from previous deployment)
- ✅ Achievement Registry initialized: `0x4e3c1de8910099460fe7c04af40b72ed998f48781bfa8a2efa6a07c141f3e088`
- ✅ Achievement Admin Capability created: `0xea7dac1c80d7bc7d003bd8b3dd66650be17ec567968dd72a747bc816711c72ab`
- ✅ Score Admin Capability created: `0x4665e4056c0733ffd677f7bf99dde38d551760fba1f7288203493b91d7b0ea83`
- ✅ Premium Store Admin Capability created: `0x4f07bc6864ad205ef3f326b22e6e8978b273a00ad18e0a1c425862a46c5ac4af`
- ✅ Tournament Admin Capability created: `0x4cdc7a4f3d6f9edb7ff88d5c71a1bd30d58f2b782317f8be04d5fd106e11a703`
- ✅ Game Pass System initialized: `0x20339cbeb9382c6a5e9f0ec9415f92490dc2c2c6eb60e5911b54d348bebdf173`
- ✅ Tournament Registry initialized: `0xe1ddf8ecdbfbf9d2f3c848e5481c1bbd7729db4cb3e326d99ece9d24de2af530`
- ✅ All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) properly initialized
- ✅ Removed deprecated `claimed_milestones` table from AchievementRegistry - now only uses `claimed_milestone_ids` for stable tracking
- ✅ Added `migrate_game_pass()` function to game_pass module for contract migration support
- ✅ Added `set_ticket_count()` and `admin_add_tickets()` admin functions to game_pass module
- ✅ Added `migrate_player_stats()` function to score_submission module for migrating player statistics
- ✅ Added `clear_player_stats()` and `clear_session_id()` admin functions to score_submission module
- ✅ Enhanced tournament migration functions: Added `admin_set_created_by()`, `admin_set_creation_fee_paid()`, `admin_set_creator_reward_usd_cents()`, `admin_set_creator_reward_paid()` to preserve new tournament fields during migration
- ✅ Updated `admin_restore_leaderboard()` to preserve player names during migration

---

## 📜 Deployment History (All Package IDs)

All deployments in reverse chronological order (newest to oldest) - **Verified by blockchain timestamps**:

### 1. Current Deployment (2025-12-30) ⭐ **ACTIVE**
**Package ID:** `0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c`  
**Transaction:** `Ebff5a7dR75ZPrXyroj2JAg5qBLnPNRWCwr7fSaztiTV`  
**Status:** ✅ Active  
**Note:** Full contract redeployment with latest tournament module updates. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 2. Previous Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0xea5767f2e72096e637f2f64175aa8931c6cd3fde3dc7cc450dc9399ec1daf4c6`  
**Transaction:** `3L4xSGwbwYYoGdcukt8LQeMj3NE5qVcMBWnUDxsr8Zyu`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with tournament module fix. **Fixed missing error constant** `E_TOURNAMENT_NOT_FOUND` in tournaments.move. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 3. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0x7406dc825f706a249e72b087bd971889a54b7a4f37a372827ad83bfce1c88e49`  
**Transaction:** `HYgPNo1MD4FcnqJBHXcQmcbJxbTPcb4hLpjcurEXJA3c`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with latest tournament migration enhancements. **Enhanced tournament migration** with new admin functions: `admin_set_created_by()`, `admin_set_creation_fee_paid()`, `admin_set_creator_reward_usd_cents()`, `admin_set_creator_reward_paid()` to preserve new tournament fields during migration. Updated `admin_restore_leaderboard()` to preserve player names during migration. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 4. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0x987bfff631bbbda273e7c5adb472cb9500252171768ac38cecc51d643753b4d5`  
**Transaction:** `EYkkw25KVMRbFNiVPQaoW9yNrxEDuSJRjNQxA66jSLND`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with score_submission and tournaments module updates. **Added migration and admin functions** to score_submission module: `migrate_player_stats()` for migrating player statistics between contract versions, `clear_player_stats()` for resetting player stats, and `clear_session_id()` for clearing session IDs. Updated tournaments module with latest changes. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 5. Earlier Deployment (2025-12-28) ⭐ **OLD_ VALUES SOURCE**
**Package ID:** `0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352`  
**Transaction:** `4obHCdHkUt88yLKYzzQiADFsBk1FVU1ZwDWChBefDgSL`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with game_pass module updates. **Added migration support functions** to game_pass module: `migrate_game_pass()` for migrating game passes between contract versions, `set_ticket_count()` for admin ticket count corrections, and `admin_add_tickets()` for admin ticket grants. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments. **This is the deployment to use for OLD_ values for Inventory, Stats, and Game Pass.**

### 5. Earlier Deployment (2025-12-22)
**Package ID:** `0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0`  
**Transaction:** `H1TLvsCcs3BhkXEnNGuzorN3nRcbWAewU2sxzq2e4eoZ`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with milestone system cleanup. **Removed deprecated `claimed_milestones` table** from AchievementRegistry - now only uses `claimed_milestone_ids` for stable milestone tracking. Removed old functions: `get_claimed_milestones_for_player`, `get_category_claimed`, `is_milestone_claimed_in_registry`. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 6. Earlier Deployment (2025-12-21)
**Package ID:** `0x09b63ced8a7af6aaf620e8baba1c5d8840524eb1767cca70b679c1a6961d1b08`  
**Transaction:** `BFADbRbdqGHqY93qGs5SM2N7s6rxSdAAKVnTdCNQYD3a`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with achievement system initialization. Achievement Registry and Admin Capability were re-initialized for this deployment to ensure they are properly linked to the new package. Deploy script updated to automatically initialize Achievement Registry and create Achievement Admin Capability. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created.

### 7. Earlier Deployment (2025-12-21)
**Package ID:** `0x7b88de48e0c2d699da4fe6180c91b7ff229b222115f851bff3092888da38cd7e`  
**Transaction:** `Ab75BDuoa2f9dZCqzi9kTSAy5co4rTT2JCXrdFJBU15u`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with milestone ID tracking updates. Added `get_claimed_milestone_ids_for_player()` and `is_milestone_id_claimed()` functions to achievement_system for stable milestone tracking. Updated backend to use milestone IDs for eligibility checking instead of levels/thresholds. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created.

### 8. Earlier Deployment (2025-12-17)
**Package ID:** `0x25b5142a89b49e973b983c7de0f808078f2e0ba7b1b4bba0def6eca6ebfa0d3a`  
**Transaction:** `EghpdEfZXP2F854imXoYMoMJ313LdxZMqsZ8pDdJ82ux`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with updates. Fixed Move compilation errors in achievement_system (added missing fields to AchievementRegistry initialization: `next_milestone_id`, `milestone_by_id`, `claimed_milestone_ids`; fixed MilestoneLocation struct usage instead of tuples; fixed return type in `get_milestone_by_id`; fixed temp_storage table destruction). All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. Badge Display and Achievement Registry initialized. All admin capabilities created. **All `OLD_` prefixed IDs in the config above are from this deployment.**

### 9. Earlier Deployment (2025-12-17)
**Package ID:** `0xd7f7faf4aaf1ab2326e9550adaeba0b47e3ecb4939e211ecfa07b4edc1aea722`  
**Transaction:** `B2EPuXWqMrCtYvDwpf1n1TV2NmwPyBymytAyDZJJxots`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with updates. Fixed Move syntax errors in achievement_system (removed `let mut`, fixed nested function). All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. Badge Display and Achievement Registry initialized. All admin capabilities created.

### 10. Earlier Deployment (2025-12-16)
**Package ID:** `0x8053eb09104f372b2d48591168a951819ddd13e208b29077b9c79989fe646650`  
**Transaction:** `D3NNkFuFJRg4Cah8nz79Rs8DT2z5PH3kp7CuVkZgThi5`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment. All modules (score_submission, premium_store, badge_system, game_pass, tournaments) redeployed. All objects initialized correctly. All admin capabilities created for all modules.

### 11. Earlier Deployment (2025-12-09)
**Package ID:** `0x6a2d1d8c86b9cf0e7d0c669c1f544723f2102fcb0312e64936c6d6135d9e83ec`  
**Transaction:** `2eMGqJvxyQSoDBTs3DcLtASasE4dMQSNkPCUZjdLNfNz`  
**Status:** ⚠️ Deprecated  
**Note:** Added `tournaments` module with TournamentRegistry, Tournament struct, and tournament management functions. Added `consume_tournament_ticket` to `game_pass` module. All objects initialized correctly.

### 12. Earlier Deployment (2025-12-09)
**Package ID:** `0xa0763684543959c4965870d531a09ce2ea621e6e7e8e1b88e7d6ca26a36dd82a`  
**Transaction:** `8MMgYGr2DXVQkJ8duPNbH1CKoWsUhEFt5DEpTFLyi5fC`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment. All modules (score_submission, premium_store, badge_system, game_pass, tournaments) redeployed. All objects initialized correctly. Fixed tournament service transaction signing issues.

### 9. Earlier Deployment (2025-12-09)
**Package ID:** `0xc99f61a5d10c48896ff5463099a72e096a73fb7758f34a607ff97b3144a3999b`  
**Transaction:** `6dJoey4qKdBveUk2ett1RPxmir43fS66nGgNcKt4efVN`  
**Status:** ⚠️ Deprecated  
**Note:** Added `tournaments` module with TournamentRegistry, Tournament struct, and tournament management functions. Added `consume_tournament_ticket` to `game_pass` module. All objects initialized correctly.

### 9. Earlier Deployment (2025-12-09)
**Package ID:** `0x0002418d1fe21df1ce311c2e448f6694b594f879437b62854ced0a125002e86c`  
**Transaction:** `5quF1swS36tGYDb3SAYQCk7Mbx2HRqJTr24B44Ewhimr`  
**Status:** ⚠️ Deprecated  
**Note:** Added `merge_items` function to `premium_store.move` for item merging functionality.

### 10. Earlier Deployment (2025-12-05)
**Package ID:** `0x262634988ab966ef39dadcace74637e1e30193943ec1afe475ff67bbb528f966`  
**Transaction:** `E8BvuknQMYt3y9wreXExdpysgTa48RdDUHQr1ugQsqUU`  
**Status:** ⚠️ Deprecated

### 10. Earlier Deployment (2025-12-05)
**Package ID:** `0x2716e2c661ff8c5be2ebb893fd94d8846bb5bffb6fc02377e32883c7fe1ba6e5`  
**Transaction:** `7iLmttuBmovFPoBofGesKwZDS3onaSeyN6G7aRQHKzGN`  
**Status:** ⚠️ Deprecated

### 13. Earlier Deployment (2025-12-05)
**Package ID:** `0x55d41f538c96a26737847cb78b304b8a590c6926f1303ebae269ec453e48f335`  
**Transaction:** `AYhdEsET7EfYKdMbxty6HoqsEFQnoBdDWTsTXUistaYY`  
**Status:** ⚠️ Deprecated

### 14. Earlier Deployment (2025-11-29 00:09:42 UTC)
**Package ID:** `0xa3ffec0c56b0dce661b42b1fec391d5d148bb6975d6e3fb2ce9dbb7239fb2aed`  
**Transaction:** `zngPr8tHgTgYs3cjTiBCXBuokKe8fbL64nyfZg6sgEQ`  
**Status:** ⚠️ Deprecated

### 15. Unused Deployment (2025-11-29 02:46:06 UTC)
**Package ID:** `0x10666e8f2da2023c89e5d3b5259fa6e091a10ddd862536afdd1eedad4e53591b`  
**Transaction:** `ACuUuNH4f3aa3m3eQw2DGQMCGzbcvkScTPHN2bcYTHki`  
**Status:** ⚠️ Not in use (Deployment process not suitable - reverted)  
**Note:** This was deployed but reverted due to process incompatibility

### 16. Earlier Deployment (2025-11-26)
**Package ID:** `0x93bef2e0ab5e8ea8df5a210e47204a68083d1d437966dc4121cd048bda6358ef`  
**Transaction:** `EUB1sJcRHB5RY6G1zZstbLRkagWrfesUUM5XZz91ZaQT`  
**Status:** ⚠️ Deprecated

### 17. Earlier Deployment (2025-11-26 13:20:31 UTC)
**Package ID:** `0x8fd0510821f3cd408347bb6f851a358ae9db80d93c4f5b580d65d0304b60c4cb`  
**Transaction:** `2LZ3PRuGAgN45icUpbMgj18NtpWKN1kv5Ab6EuFGvKxD`  
**Status:** ⚠️ Deprecated

### 18. Earlier Deployment (2025-11-25 21:19:52 UTC)
**Package ID:** `0x5a4d10695a27145386b510797c2305bf0de82e2dc94e0c19c9717f490d40f110`  
**Transaction:** `5T5W2rcT2sGGRpFcczkkZR2T8m3CJ1a2vTry9FBHRZyu`  
**Status:** ⚠️ Deprecated

### 19. Earlier Deployment (2025-11-23 15:47:22 UTC) - **COMPLETE BADGE SYSTEM**
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

### 20. Earlier Deployment (2025-11-21 17:38:00 UTC)
**Package ID:** `0x6df4ec20614cbf2b407de12997bb5fa689f7ec2833a3df3ea84cd9986f3f448d`  
**Transaction:** `Du1xBYhNtksBN9G6hNb4tmNLQRzbARmDaDMLgfvw6TZk`  
**Status:** ⚠️ Deprecated

### 21. Earlier Deployment (2025-11-19 16:50:59 UTC)
**Package ID:** `0xf4ebdb147f861f925a2129f39f983867b34fa64575b7e9245189407a78f475ed`  
**Transaction:** `vDN8wgCwvv26iJAJfkEM5nqB5ugpvoVRdgo7WxTFiL9`  
**Status:** ⚠️ Deprecated

### 22. Earlier Deployment (2025-11-14 21:07:21 UTC)
**Package ID:** `0x6e2cb689422cb1a2d4d3ed3817242e2f298ee6e5ab7afbcbb548475118834faa`  
**Transaction:** `5G2YjAjG2UPwSVFod6Lx2VDvPTTLxnwg3ybUYaeWhoX2`  
**Status:** ⚠️ Deprecated

### 23. Earlier Deployment - MEWS Token (2025-11-14 14:45:29 UTC)
**Package ID:** `0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a`  
**Transaction:** `2Wfr3rUdC3mTiKGPLNyYswFHLuPdjEt7Eu2kZa22UK5D`  
**Status:** ⚠️ Deprecated (MEWS token from earlier deployment)

---

## 📝 Notes

1. **This is the ONLY file with current deployment IDs** - All other files are outdated
2. **Copy the entire `.env` section above** to your `backend/.env` (or `backend/.env.local`)
3. **Restart your backend server** after updating the `.env` file
4. **All `OLD_` prefixed package IDs for Inventory, Stats, and Game Pass are from the 2025-12-28 deployment** (`0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352`) - **This is the previous deployment to migrate FROM**. Use the migration functions to transfer data to the new contracts. Note: Badge and Achievement OLD_ values are from 2025-12-23 deployment.
5. **Current contracts** are from the 2025-12-30 deployment (`0xf3cfc480ff9b5f469cb4f281145b0a440a32e995e72df975738d53d55f3cad76`) - The latest active deployment with enhanced tournament migration functions
5. **Deployment `0x10666e8f2da2023c89e5d3b5259fa6e091a10ddd862536afdd1eedad4e53591b` is not in use** - It was deployed but reverted due to process incompatibility
6. **Deployment History:** Use the section above to reference any previous deployment package ID if needed
7. **Badge Registry and Display:** These are persistent objects that don't change with each package deployment. The IDs shown are from previous deployments and remain valid.

## 🔧 What Changed in This Deployment

- ✅ **Latest tournament module updates** - Full contract redeployment with latest changes to tournaments.move
- ✅ **Full contract redeployment** - All modules redeployed with latest updates
- ✅ **All modules complete** - score_submission, premium_store, badge_system, achievement_system, game_pass, and tournaments all properly initialized
- ✅ **Admin capabilities created** - New admin capabilities created for all modules (score_submission, premium_store, tournaments, achievement_system)

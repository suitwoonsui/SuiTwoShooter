# 📜 Deployment History (All Package IDs)

Archive of past deployments. **Current IDs are in [DEPLOYMENT_IDS.md](./DEPLOYMENT_IDS.md).**

All deployments in reverse chronological order (newest to oldest) - **Verified by blockchain timestamps**:

## Platform Package History

### 1. Current Platform Deployment (2026-01-23) ⭐ **ACTIVE - RENAMED PACKAGE**
**Package ID:** `0xe88f376136404809795e1e6744066757fe75d691817a89e54ef6249c648488d0`  
**Transaction:** `2iEbVCoGumCqmFkefMHBz7cXYj9xBW1kDrBd7NoAvDcJ`  
**UpgradeCap:** `0x9929fdc4b0d225b4aa58f9676d89bb536573d82e63190353302285ddcfb20554`  
**Status:** ✅ Active (Renamed Package - Fresh Deploy)  
**Note:** Platform package renamed from `suitwo_platform` to `platform`. Fresh deployment with new package ID. Package is configured for upgrades. Object IDs: GamePassSystem (`0xd81339e8eb98e36d2585c3ca9cb7ca34d10b5c80d9365619fea00f8d44dda63e`), PremiumStore (`0xf0949cbeed7cbb4532de887b19f7413f0867612052b3595ed7f40ffb8eee2262`), MasterEventRegistry (`0xc984bf136fe598e6fee3962469359f782c47bee8e6aae9f8d25a753fff2d6b2d`).

### 2. Previous Platform Deployment (2026-01-21) ⚠️ **SUPERSEDED BY RENAME**
**Original Package ID:** `0x8ea932e65b05098743d0348aa1d35e35b5f00a85b4590c21801c8ba2ec429d33`  
**Latest Version Package ID:** `0x799b62b369bdb96d8b963eae6b1adeee9113538f3cbe2b659bc62892a1029026`  
**Transaction:** `HMUpikjCpkUJQURb6YQMuHgs9BYNtZJussTy4Shb3mcq`  
**Status:** ⚠️ Superseded (package renamed to `platform`)  
**Note:** Previous platform package (`suitwo_platform`) upgraded using Sui's native upgrade mechanism. This package was renamed to `platform` on 2026-01-23. Use OLD_ values for migration if needed.

### 3. First Platform Deployment (2026-01-16) ⚠️ **SUPERSEDED BY RENAME**
**Package ID:** `0x8ea932e65b05098743d0348aa1d35e35b5f00a85b4590c21801c8ba2ec429d33`  
**Transaction:** `98HHH4juBGzAsb7QiJR8kPN4frc9yprW7jEmkshVnjQg`  
**Status:** ⚠️ Superseded (package renamed to `platform`)  
**Note:** First platform package deployment (`suitwo_platform`). This package was renamed to `platform` on 2026-01-23. Use OLD_ values for migration if needed.

## Tournament Extension Package History

### 1. Current Tournament Extension Deployment (2026-01-23) ⭐ **ACTIVE**
**Package ID:** `0x5dfa6880d315da37f61d3c78a85fcb5276c8b6b7c18e447ba73ec2031edc731c`  
**Transaction:** `2zteGHq7GyCW9VoM31k2Uff7RiLh1kgXsLHzdgJnjfvR`  
**UpgradeCap:** `0xbf2a770514f52fe309160dcca7b5c44cd6d127b40fda2c9516a3690692d2badb`  
**Status:** ✅ Active (Fresh Deploy)  
**Note:** Tournament extension package that extends platform events. Depends on platform package (`0xe88f376136404809795e1e6744066757fe75d691817a89e54ef6249c648488d0`). Package is configured for upgrades.

## Game Package History

### 1. Current Game Deployment (2025-12-30) ⭐ **ACTIVE - UPGRADE READY**
**Original Package ID:** `0xe7bb0aeb498b664eeec0f9a5730c620eaf4536280836e976327cb8304c5596e1`  
**Transaction:** `5WfcqcH13xm8CU45TLnGmzE4RWeBostV4KVbjXQSDBuN`  
**UpgradeCap ID:** `0x667c647cccf9f816740ce4102877208e1374a4cd01ca8875402d429acae7e837`  
**UpgradeCap Created:** 2026-01-22  
**Status:** ✅ Active (UpgradeCap ready for future upgrades)  
**Note:** Full contract redeployment after **consolidating contract sources**. Fixed all compilation errors from consolidation: Updated `game_config` module (validate_pack_type allows any u8, admin_set_min_token_balance function, min_token_balance field), fixed `badge_system` module (removed Option wrapper from configs, fixed table update patterns), fixed `item_catalog` module (fixed borrow conflicts, vector dereferencing), and fixed `game_pass` module (updated to use getter functions). All modules (score_submission, badge_system, achievement_system, tournaments, **item_catalog**, **game_config**) redeployed. All registries and Admin Capabilities initialized. Badge Publisher and Display are persistent objects from previous deployments. **Note:** Platform contracts (events, game_pass, premium_store) have been moved to separate platform package. Game package now references platform package. **UpgradeCap created on 2026-01-22** - package is ready for future upgrades using Sui's native upgrade mechanism.

### 2. Previous Game Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0x1e3edde37965bbbea4c8d7afc948d29aa37355a876b5d190e9d6eeb544948038`  
**Transaction:** `3ZGrwuDRhaNTQhitxio7zybzrg8Y3pe6Hm73T5SjKAzE`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with **game_config module updates**: Updated `validate_pack_type` to allow any u8 value (0-255), added `admin_set_min_token_balance` function, added `min_token_balance` field to GameConfigRegistry, and added `MinTokenBalanceUpdated` event. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments, **item_catalog**, **game_config**) redeployed. All registries and Admin Capabilities initialized. Badge Publisher and Display are persistent objects from previous deployments.

### 3. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0x2ed7fe761353b287823473d872b4b445803c465f1ecb322cc803756ba1839504`  
**Transaction:** `9ReCVYQG8V5qK5o3JqjLJtReNEyKXLYtwuo9XimEqeW5`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with contract updates. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments, **item_catalog**, **game_config**) redeployed. All registries and Admin Capabilities initialized. Badge Publisher and Display are persistent objects from previous deployments.

### 4. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0x4399e0c77cf022dccd27f73a2a6c98aa01058b4f6a4cd68d0e3e1266081832b2`  
**Transaction:** `4u4n1euHMnzh7b2BeAjMfhvNK4CPEv9MpDomrxrJc4NF`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with contract updates. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments, **item_catalog**, **game_config**) redeployed. All registries and Admin Capabilities initialized. Badge Publisher and Display are persistent objects from previous deployments.

### 5. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0x45db8163c96936e664acf512346ec507ff5fc83f10867c885344e11b83898bcc`  
**Transaction:** `8awXhX1ryYxyn46RZxe6JGqA4f9wvhYaQAJRwVPU4cvX`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with **Item Catalog** and **Game Config** modules added. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments, **item_catalog**, **game_config**) redeployed. Item Catalog Registry, Game Config Registry, and all Admin Capabilities initialized. Badge Publisher and Display are persistent objects from previous deployments.

### 5. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED** (Premature - Not Ready)
**Package ID:** `0x438071d326ad69d85bcaa75c78f32063749db26e7a76141763fd02843d6fbecb`  
**Transaction:** `2u52gFjnatUFxxx3v4umHYg699NdT3NVAj3wrN6p6bdn`  
**Status:** ⚠️ Deprecated (Premature deployment - not ready)  
**Note:** Full contract redeployment with **Item Catalog module** added. This deployment was premature and not ready for production use. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments, **item_catalog**) redeployed. Item Catalog Registry and Admin Capability initialized. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 5. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED** (Premature - Not Ready)
**Package ID:** `0xafaf9524be5ad5994670cabd7832b20b2b877495d1c355ce567a83afa6f20d10`  
**Transaction:** `6Duh7HTzk9ncvMpARPdGspB79qigw1M5Lzpe4839rSzM`  
**Status:** ⚠️ Deprecated (Premature deployment - not ready)  
**Note:** Full contract redeployment with **Item Catalog module** added. This deployment was premature and not ready for production use. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments, **item_catalog**) redeployed. Item Catalog Registry and Admin Capability initialized. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 6. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c`  
**Transaction:** `Ebff5a7dR75ZPrXyroj2JAg5qBLnPNRWCwr7fSaztiTV`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with latest tournament module updates. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments. **This is the deployment to use for OLD_ values.**

### 7. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0xea5767f2e72096e637f2f64175aa8931c6cd3fde3dc7cc450dc9399ec1daf4c6`  
**Transaction:** `3L4xSGwbwYYoGdcukt8LQeMj3NE5qVcMBWnUDxsr8Zyu`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with tournament module fix. **Fixed missing error constant** `E_TOURNAMENT_NOT_FOUND` in tournaments.move. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 8. Earlier Deployment (2025-12-30) ⚠️ **DEPRECATED**
**Package ID:** `0x987bfff631bbbda273e7c5adb472cb9500252171768ac38cecc51d643753b4d5`  
**Transaction:** `EYkkw25KVMRbFNiVPQaoW9yNrxEDuSJRjNQxA66jSLND`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with score_submission and tournaments module updates. **Added migration and admin functions** to score_submission module: `migrate_player_stats()` for migrating player statistics between contract versions, `clear_player_stats()` for resetting player stats, and `clear_session_id()` for clearing session IDs. Updated tournaments module with latest changes. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 9. Earlier Deployment (2025-12-28) ⭐ **OLD_ VALUES SOURCE**
**Package ID:** `0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352`  
**Transaction:** `4obHCdHkUt88yLKYzzQiADFsBk1FVU1ZwDWChBefDgSL`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with game_pass module updates. **Added migration support functions** to game_pass module: `migrate_game_pass()` for migrating game passes between contract versions, `set_ticket_count()` for admin ticket count corrections, and `admin_add_tickets()` for admin ticket grants. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments. **This is the deployment to use for OLD_ values for Inventory, Stats, and Game Pass.**

### 8. Earlier Deployment (2025-12-22)
**Package ID:** `0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0`  
**Transaction:** `H1TLvsCcs3BhkXEnNGuzorN3nRcbWAewU2sxzq2e4eoZ`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with milestone system cleanup. **Removed deprecated `claimed_milestones` table** from AchievementRegistry - now only uses `claimed_milestone_ids` for stable milestone tracking. Removed old functions: `get_claimed_milestones_for_player`, `get_category_claimed`, `is_milestone_claimed_in_registry`. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created. Badge Publisher and Display are persistent objects from previous deployments.

### 6. Earlier Deployment (2025-12-21)
**Package ID:** `0x09b63ced8a7af6aaf620e8baba1c5d8840524eb1767cca70b679c1a6961d1b08`  
**Transaction:** `BFADbRbdqGHqY93qGs5SM2N7s6rxSdAAKVnTdCNQYD3a`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with achievement system initialization. Achievement Registry and Admin Capability were re-initialized for this deployment to ensure they are properly linked to the new package. Deploy script updated to automatically initialize Achievement Registry and create Achievement Admin Capability. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created.

### 10. Earlier Deployment (2025-12-21)
**Package ID:** `0x7b88de48e0c2d699da4fe6180c91b7ff229b222115f851bff3092888da38cd7e`  
**Transaction:** `Ab75BDuoa2f9dZCqzi9kTSAy5co4rTT2JCXrdFJBU15u`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with milestone ID tracking updates. Added `get_claimed_milestone_ids_for_player()` and `is_milestone_id_claimed()` functions to achievement_system for stable milestone tracking. Updated backend to use milestone IDs for eligibility checking instead of levels/thresholds. All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. All admin capabilities created.

### 11. Earlier Deployment (2025-12-17)
**Package ID:** `0x25b5142a89b49e973b983c7de0f808078f2e0ba7b1b4bba0def6eca6ebfa0d3a`  
**Transaction:** `EghpdEfZXP2F854imXoYMoMJ313LdxZMqsZ8pDdJ82ux`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with updates. Fixed Move compilation errors in achievement_system (added missing fields to AchievementRegistry initialization: `next_milestone_id`, `milestone_by_id`, `claimed_milestone_ids`; fixed MilestoneLocation struct usage instead of tuples; fixed return type in `get_milestone_by_id`; fixed temp_storage table destruction). All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. Badge Display and Achievement Registry initialized. All admin capabilities created. **All `OLD_` prefixed IDs in the config above are from this deployment.**

### 12. Earlier Deployment (2025-12-17)
**Package ID:** `0xd7f7faf4aaf1ab2326e9550adaeba0b47e3ecb4939e211ecfa07b4edc1aea722`  
**Transaction:** `B2EPuXWqMrCtYvDwpf1n1TV2NmwPyBymytAyDZJJxots`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment with updates. Fixed Move syntax errors in achievement_system (removed `let mut`, fixed nested function). All modules (score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments) redeployed. Badge Display and Achievement Registry initialized. All admin capabilities created.

### 13. Earlier Deployment (2025-12-16)
**Package ID:** `0x8053eb09104f372b2d48591168a951819ddd13e208b29077b9c79989fe646650`  
**Transaction:** `D3NNkFuFJRg4Cah8nz79Rs8DT2z5PH3kp7CuVkZgThi5`  
**Status:** ⚠️ Deprecated  
**Note:** Full contract redeployment. All modules (score_submission, premium_store, badge_system, game_pass, tournaments) redeployed. All objects initialized correctly. All admin capabilities created for all modules.

### 14. Earlier Deployment (2025-12-09)
**Package ID:** `0x6a2d1d8c86b9cf0e7d0c669c1f544723f2102fcb0312e64936c6d6135d9e83ec`  
**Transaction:** `2eMGqJvxyQSoDBTs3DcLtASasE4dMQSNkPCUZjdLNfNz`  
**Status:** ⚠️ Deprecated  
**Note:** Added `tournaments` module with TournamentRegistry, Tournament struct, and tournament management functions. Added `consume_tournament_ticket` to `game_pass` module. All objects initialized correctly.

### 15. Earlier Deployment (2025-12-09)
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

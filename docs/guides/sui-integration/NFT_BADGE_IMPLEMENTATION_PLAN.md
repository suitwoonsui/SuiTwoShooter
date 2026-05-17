# NFT Badge System - Implementation Plan

## 📋 Overview

This document outlines the step-by-step implementation plan for the NFT Badge System. Tasks are organized into phases with clear dependencies and priorities.

**Status**: Planning Phase  
**Last Updated**: November 2025  
**Related Documents**: 
- `NFT_BADGE_SYSTEM_PLAN.md` - System design and specifications
- `NFT_BADGE_DESIGN_BRIEF.md` - Visual design specifications for artist

---

## 🎯 Implementation Phases

### Phase 1: Foundation & Infrastructure
**Goal**: Set up statistics tracking and prepare infrastructure for badge system

**Dependencies**: None (foundation phase)

**Tasks**:

#### 1.1 Enhance Statistics System (score_submission.move)
- [ ] **Task**: Add `PlayerStats` struct to track `total_games` per player
  - **File**: `contracts/suitwo_game/sources/score_submission.move`
  - **Details**:
    - Create `PlayerStats` struct with `has key, store`
    - Fields: `id: UID`, `player: address`, `total_games: u64`
    - Create `StatisticsRegistry` shared object to store player stats
    - Add function to initialize `PlayerStats` for new players
    - Add function to increment `total_games` after score submission
  - **Estimated Time**: 2-3 hours
  - **Priority**: Critical (required for badge progression)

- [ ] **Task**: Update `submit_game_session_for_player` to track total games
  - **File**: `contracts/suitwo_game/sources/score_submission.move`
  - **Details**:
    - After creating `GameSession`, increment `total_games` in `PlayerStats`
    - Ensure demo mode games are excluded (already handled - demo games don't create GameSession)
    - Add idempotency check using session ID (already exists)
  - **Estimated Time**: 1-2 hours
  - **Priority**: Critical

- [ ] **Task**: Add view function `get_player_stats(player: address): PlayerStats`
  - **File**: `contracts/suitwo_game/sources/score_submission.move`
  - **Details**:
    - Public view function to query player statistics
    - Returns `PlayerStats` object or error if not found
    - Used by backend to check games played for badge updates
  - **Estimated Time**: 30 minutes
  - **Priority**: High

- [ ] **Task**: Update tier threshold constants (if needed)
  - **File**: `contracts/suitwo_game/sources/score_submission.move`
  - **Details**:
    - Verify/update tier thresholds match badge system:
      - `THRESHOLD_COMMON: u64 = 6`
      - `THRESHOLD_UNCOMMON: u64 = 16`
      - `THRESHOLD_RARE: u64 = 36`
      - `THRESHOLD_EPIC: u64 = 76`
      - `THRESHOLD_LEGENDARY: u64 = 150`
  - **Estimated Time**: 15 minutes
  - **Priority**: Medium

- [ ] **Task**: Test statistics system updates
  - **Details**:
    - Write unit tests for `PlayerStats` creation and updates
    - Test `total_games` increment logic
    - Verify demo mode exclusion
    - Test idempotency (same session ID doesn't double-count)
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

#### 1.2 Backend Statistics Integration
- [ ] **Task**: Update backend to query `PlayerStats` from blockchain
  - **File**: `backend/lib/sui/admin-wallet-service.ts` (or new service)
  - **Details**:
    - Add function to query `get_player_stats` from smart contract
    - Cache results if needed (with TTL)
    - Handle errors gracefully
  - **Estimated Time**: 1-2 hours
  - **Priority**: High

- [ ] **Task**: Update score submission endpoint to track statistics
  - **File**: `backend/app/api/scores/submit/route.ts`
  - **Details**:
    - After successful score submission, verify `PlayerStats` was updated
    - Log statistics updates for monitoring
    - No changes needed to existing flow (statistics update happens in contract)
  - **Estimated Time**: 30 minutes
  - **Priority**: Medium

**Phase 1 Deliverables**:
- ✅ Enhanced `score_submission.move` with `PlayerStats` tracking
- ✅ Backend can query player statistics
- ✅ Statistics system tested and verified

**Phase 1 Estimated Time**: 7-11 hours

---

### Phase 2: Badge Smart Contract Implementation
**Goal**: Create Move contract for badge minting, updates, and tier management

**Dependencies**: Phase 1 (statistics system)

**Tasks**:

#### 2.1 Create Badge System Contract
- [ ] **Task**: Create `badge_system.move` contract structure
  - **File**: `contracts/suitwo_game/sources/badge_system.move`
  - **Details**:
    - Define tier constants (TIER_STARTER through TIER_LEGENDARY)
    - Define tier thresholds (THRESHOLD_COMMON through THRESHOLD_LEGENDARY)
    - Define `EarlySupporterBadge` struct (soulbound - `has key` only, no `store`)
    - Define `BadgeRegistry` shared object
    - Define events (`BadgeMinted`, `BadgeTierUpgraded`)
  - **Estimated Time**: 2-3 hours
  - **Priority**: Critical

- [ ] **Task**: Implement `mint_badge` function
  - **File**: `contracts/suitwo_game/sources/badge_system.move`
  - **Details**:
    - Validate player doesn't already have a badge
    - Validate game was NOT in demo mode (reject if `is_demo_mode === true`)
    - Create `EarlySupporterBadge` with Starter tier (tier 0)
    - Set `image_data` to Starter tier badge image (vector<u8>)
    - Set `mint_date` and `last_updated` timestamps
    - Transfer badge to player (using `transfer::transfer`)
    - Register badge in `BadgeRegistry`
    - Emit `BadgeMinted` event
  - **Estimated Time**: 2-3 hours
  - **Priority**: Critical

- [ ] **Task**: Implement `update_badge_tier` function
  - **File**: `contracts/suitwo_game/sources/badge_system.move`
  - **Details**:
    - Validate game was NOT in demo mode (reject if `is_demo_mode === true`)
    - Validate session ID not already counted (idempotency check)
    - Calculate new tier from `games_played`
    - If tier increased, update badge:
      - Update `tier` field
      - Update `image_data` to new tier's badge image
      - Update `last_updated` timestamp
    - Update `games_played` count
    - Mark session ID as counted in `BadgeRegistry`
    - Emit `BadgeTierUpgraded` event if tier changed
  - **Estimated Time**: 3-4 hours
  - **Priority**: Critical

- [ ] **Task**: Implement helper functions
  - **File**: `contracts/suitwo_game/sources/badge_system.move`
  - **Details**:
    - `get_badge_tier(games_played: u64): u8` - Calculate tier from games played
    - `get_discount_store(tier: u8): u8` - Return store discount percentage
    - `get_discount_gameplay(tier: u8): u8` - Return gameplay discount percentage
    - `has_badge(registry: &BadgeRegistry, player: address): bool` - Check if player has badge
    - `get_badge_id(registry: &BadgeRegistry, player: address): Option<ID>` - Get badge ID for player
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Implement Sui Object Display configuration
  - **File**: `contracts/suitwo_game/sources/badge_system.move` (or separate Display setup)
  - **Details**:
    - Configure Display object for badge metadata
    - Set up template strings for name, description, attributes
    - Reference struct fields using `{field_name}` syntax
    - Configure once per badge type (shared Display object)
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Write unit tests for badge contract
  - **File**: `contracts/suitwo_game/sources/badge_system_test.move` (or test file)
  - **Details**:
    - Test badge minting (first-time player)
    - Test duplicate minting prevention
    - Test demo mode rejection
    - Test tier calculation logic
    - Test tier upgrades at each threshold
    - Test idempotency (same session ID doesn't double-count)
    - Test discount calculation functions
  - **Estimated Time**: 4-6 hours
  - **Priority**: High

**Phase 2 Deliverables**:
- ✅ `badge_system.move` contract with all functions
- ✅ Badge minting and tier update logic
- ✅ Sui Object Display configuration
- ✅ Unit tests passing

**Phase 2 Estimated Time**: 15-22 hours

---

### Phase 3: Badge Image Assets
**Goal**: Prepare badge images for on-chain storage

**Dependencies**: None (can be done in parallel with Phase 2)

**Tasks**:

#### 3.1 Badge Image Generation
- [ ] **Task**: Send design brief to artist
  - **File**: `docs/sui-integration/NFT_BADGE_DESIGN_BRIEF.md`
  - **Details**: Provide design brief with all specifications
  - **Estimated Time**: 1 hour (communication)
  - **Priority**: High

- [ ] **Task**: Receive and review badge images from artist
  - **Details**:
    - Verify all 6 tiers are provided (Starter, Common, Uncommon, Rare, Epic, Legendary)
    - Check format: WebP, 512x512px
    - Verify file sizes: <200KB per image
    - Review visual quality and tier progression
  - **Estimated Time**: 1-2 hours
  - **Priority**: High

- [ ] **Task**: Optimize badge images if needed
  - **Details**:
    - Use image optimization tools (TinyPNG, ImageOptim, etc.)
    - Ensure WebP format, 512x512px resolution
    - Target <200KB per image (ideally 40-80KB)
    - Test image quality at target size
  - **Estimated Time**: 1-2 hours
  - **Priority**: Medium

- [ ] **Task**: Convert images to `vector<u8>` format for Move
  - **Details**:
    - Create script to read WebP files and convert to hex/base64
    - Generate Move test data or constants for image bytes
    - Store images in contract or separate module
    - Consider: Store as constants vs. pass as parameters
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Create image storage/retrieval system
  - **Details**:
    - Decide: Store images as constants in contract vs. pass during mint/update
    - If constants: Create `badge_images.move` module with image data
    - If parameters: Backend loads images and passes to contract
    - Recommendation: Pass as parameters (more flexible, smaller contract)
  - **Estimated Time**: 2-3 hours
  - **Priority**: Medium

**Phase 3 Deliverables**:
- ✅ 6 badge images (one per tier) in WebP format
- ✅ Images optimized and ready for on-chain storage
- ✅ Image loading/encoding system for backend

**Phase 3 Estimated Time**: 7-11 hours (mostly waiting on artist)

---

### Phase 4: Backend Integration
**Goal**: Integrate badge system with backend API and game completion flow

**Dependencies**: Phase 1 (statistics), Phase 2 (badge contract), Phase 3 (images)

**Tasks**:

#### 4.1 Badge Service Implementation
- [ ] **Task**: Create badge service module
  - **File**: `backend/lib/sui/badge-service.ts` (or similar)
  - **Details**:
    - Service to interact with badge smart contract
    - Functions: `mintBadge()`, `updateBadgeTier()`, `getBadge()`, `hasBadge()`
    - Handle image data encoding/decoding
    - Error handling and retry logic
  - **Estimated Time**: 4-6 hours
  - **Priority**: Critical

- [ ] **Task**: Implement badge minting logic
  - **File**: `backend/lib/sui/badge-service.ts`
  - **Details**:
    - Check if player already has badge
    - Load Starter tier badge image
    - Call `mint_badge` on smart contract
    - Handle errors and retries
    - Return badge ID and transaction digest
  - **Estimated Time**: 2-3 hours
  - **Priority**: Critical

- [ ] **Task**: Implement badge tier update logic
  - **File**: `backend/lib/sui/badge-service.ts`
  - **Details**:
    - Query `PlayerStats` to get `total_games`
    - Query current badge tier
    - Calculate new tier
    - If tier increased, load new tier's badge image
    - Call `update_badge_tier` on smart contract
    - Handle errors and retries
  - **Estimated Time**: 3-4 hours
  - **Priority**: Critical

- [ ] **Task**: Implement retry queue system
  - **File**: `backend/lib/sui/badge-service.ts` (or separate queue service)
  - **Details**:
    - Queue failed badge updates
    - Retry with exponential backoff
    - Persist queue (database or Redis)
    - Process queue periodically
    - Handle idempotency (check session ID before retry)
  - **Estimated Time**: 4-6 hours
  - **Priority**: High

- [ ] **Task**: Implement image loading system
  - **File**: `backend/lib/sui/badge-service.ts` (or separate image service)
  - **Details**:
    - Load badge images from file system or storage
    - Convert WebP to `vector<u8>` format
    - Cache images in memory (if needed)
    - Handle image encoding errors
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

#### 4.2 API Endpoints
- [ ] **Task**: Create badge minting endpoint
  - **File**: `backend/app/api/badges/mint/route.ts`
  - **Details**:
    - POST endpoint for badge minting
    - Validates player address
    - Validates game completion (not demo mode)
    - Calls badge service to mint badge
    - Returns badge ID and transaction digest
  - **Estimated Time**: 2-3 hours
  - **Priority**: Critical

- [ ] **Task**: Create badge update endpoint
  - **File**: `backend/app/api/badges/update/route.ts`
  - **Details**:
    - POST endpoint for badge tier updates
    - Validates player address and session ID
    - Validates game completion (not demo mode)
    - Calls badge service to update tier
    - Returns update result
  - **Estimated Time**: 2-3 hours
  - **Priority**: Critical

- [ ] **Task**: Create badge query endpoint
  - **File**: `backend/app/api/badges/[address]/route.ts`
  - **Details**:
    - GET endpoint to query player's badge
    - Returns badge data (tier, games_played, image, etc.)
    - Handles case where player has no badge
  - **Estimated Time**: 1-2 hours
  - **Priority**: High

- [ ] **Task**: Integrate badge updates into score submission flow
  - **File**: `backend/app/api/scores/submit/route.ts`
  - **Details**:
    - After successful score submission, check if badge update needed
    - If first game: Call badge minting
    - If subsequent game: Check if tier upgrade needed, call update
    - Handle errors gracefully (don't fail score submission if badge update fails)
    - Queue badge updates for retry if needed
  - **Estimated Time**: 3-4 hours
  - **Priority**: Critical

- [ ] **Task**: Create badge reconciliation endpoint (optional)
  - **File**: `backend/app/api/badges/reconcile/route.ts`
  - **Details**:
    - Admin endpoint to reconcile badge state with statistics
    - Compare `PlayerStats.total_games` with badge `games_played`
    - Update badge if discrepancy found
    - Useful for fixing missed updates
  - **Estimated Time**: 2-3 hours
  - **Priority**: Medium

#### 4.3 Error Handling & Monitoring
- [ ] **Task**: Implement comprehensive error handling
  - **Details**:
    - Handle network errors gracefully
    - Handle contract errors (demo mode, duplicate session, etc.)
    - Log errors for monitoring
    - Return user-friendly error messages
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Add monitoring and logging
  - **Details**:
    - Log badge minting events
    - Log tier upgrade events
    - Log errors and retries
    - Track badge update success/failure rates
  - **Estimated Time**: 1-2 hours
  - **Priority**: Medium

**Phase 4 Deliverables**:
- ✅ Badge service with minting and update logic
- ✅ API endpoints for badge operations
- ✅ Integration with score submission flow
- ✅ Retry queue system
- ✅ Error handling and monitoring

**Phase 4 Estimated Time**: 26-38 hours

---

### Phase 5: Frontend Integration
**Goal**: Display badges in game UI and apply discounts

**Dependencies**: Phase 4 (backend integration)

**Tasks**:

#### 5.1 Badge Display Components
- [ ] **Task**: Create badge display component
  - **File**: `src/components/badge/BadgeDisplay.jsx` (or similar)
  - **Details**:
    - Component to display badge image
    - Show tier name and games played
    - Handle loading states
    - Display badge from on-chain data or cached data
  - **Estimated Time**: 3-4 hours
  - **Priority**: High

- [ ] **Task**: Create badge tier indicator component
  - **File**: `src/components/badge/BadgeTierIndicator.jsx`
  - **Details**:
    - Small badge icon for header/profile
    - Shows tier color/icon
    - Hover/tap to show full badge
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Create badge upgrade notification component
  - **File**: `src/components/badge/BadgeUpgradeNotification.jsx`
  - **Details**:
    - Show notification when badge tier upgrades
    - Display upgrade animation/transition
    - Show new tier benefits (discounts)
  - **Estimated Time**: 3-4 hours
  - **Priority**: Medium

- [ ] **Task**: Create badge viewer/modal component
  - **File**: `src/components/badge/BadgeViewer.jsx`
  - **Details**:
    - Full badge display modal
    - Show badge image, tier, games played, mint date
    - Show tier progression (how many games to next tier)
    - Display badge benefits (discounts)
  - **Estimated Time**: 4-5 hours
  - **Priority**: Medium

#### 5.2 Badge Integration Points
- [ ] **Task**: Add badge display to game header/profile
  - **File**: `src/game/ui/Header.jsx` (or similar)
  - **Details**:
    - Display badge tier indicator next to player name
    - Link to badge viewer on click
  - **Estimated Time**: 1-2 hours
  - **Priority**: High

- [ ] **Task**: Add badge display to store interface
  - **File**: `src/game/ui/Store.jsx` (or similar)
  - **Details**:
    - Display badge prominently in store
    - Show current discount percentage
    - Display "Your [Tier] badge saves you X%!" message
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Add badge display to main menu
  - **File**: `src/game/ui/MainMenu.jsx` (or similar)
  - **Details**:
    - Show badge in player profile section
    - Link to badge viewer
  - **Estimated Time**: 1-2 hours
  - **Priority**: Medium

- [ ] **Task**: Add badge to leaderboard display
  - **File**: `src/game/ui/Leaderboard.jsx` (or similar)
  - **Details**:
    - Show badge icon next to player names
    - Indicates supporter status
  - **Estimated Time**: 1-2 hours
  - **Priority**: Low

#### 5.3 Discount Application
- [ ] **Task**: Implement store discount logic
  - **File**: `src/game/store/StoreService.js` (or similar)
  - **Details**:
    - Query player's badge tier from backend/blockchain
    - Calculate discount percentage from tier
    - Apply discount to store purchases
    - Display discounted price in UI
  - **Estimated Time**: 3-4 hours
  - **Priority**: High

- [ ] **Task**: Implement gameplay discount logic
  - **File**: `src/game/main.js` (or game start logic)
  - **Details**:
    - Query player's badge tier before game start
    - Calculate discount percentage from tier
    - Apply discount to game start cost
    - Display discounted cost in UI
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Add discount display to UI
  - **Details**:
    - Show discount percentage in store
    - Show discount percentage before game start
    - Display "Badge discount applied!" message
  - **Estimated Time**: 1-2 hours
  - **Priority**: Medium

#### 5.4 Badge State Management
- [ ] **Task**: Create badge state management
  - **File**: `src/game/state/BadgeState.js` (or similar, or use existing state management)
  - **Details**:
    - Store badge data in game state
    - Fetch badge data on game load
    - Update badge state after tier upgrades
    - Cache badge data to reduce API calls
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Handle badge update events
  - **Details**:
    - Listen for badge tier upgrade events (from backend or blockchain)
    - Update badge state when tier upgrades
    - Trigger upgrade notification
    - Refresh badge display
  - **Estimated Time**: 2-3 hours
  - **Priority**: Medium

- [ ] **Task**: Handle badge loading errors
  - **Details**:
    - Handle case where player has no badge
    - Handle network errors when fetching badge
    - Show fallback UI (no badge icon)
  - **Estimated Time**: 1-2 hours
  - **Priority**: Medium

**Phase 5 Deliverables**:
- ✅ Badge display components
- ✅ Badge integrated into game UI
- ✅ Discount application logic
- ✅ Badge state management

**Phase 5 Estimated Time**: 26-36 hours

---

### Phase 6: Testing & Deployment
**Goal**: Test entire system and deploy to production

**Dependencies**: All previous phases

**Tasks**:

#### 6.1 Integration Testing
- [ ] **Task**: Test end-to-end badge flow
  - **Details**:
    - Test first game → badge minting
    - Test tier progression (each threshold)
    - Test demo mode exclusion
    - Test idempotency (same session ID)
    - Test error handling and retries
  - **Estimated Time**: 4-6 hours
  - **Priority**: Critical

- [ ] **Task**: Test discount application
  - **Details**:
    - Test store discounts at each tier
    - Test gameplay discounts at each tier
    - Verify discount calculations are correct
    - Test discount display in UI
  - **Estimated Time**: 2-3 hours
  - **Priority**: High

- [ ] **Task**: Test edge cases
  - **Details**:
    - Test network errors during badge update
    - Test duplicate session ID handling
    - Test badge update retry logic
    - Test reconciliation endpoint
  - **Estimated Time**: 3-4 hours
  - **Priority**: High

- [ ] **Task**: Load testing
  - **Details**:
    - Test badge minting under load
    - Test badge updates under load
    - Test retry queue performance
    - Monitor gas costs
  - **Estimated Time**: 2-3 hours
  - **Priority**: Medium

#### 6.2 Deployment Preparation
- [ ] **Task**: Deploy smart contracts to testnet
  - **Details**:
    - Deploy `score_submission.move` with statistics updates
    - Deploy `badge_system.move` contract
    - Verify contract addresses and object IDs
    - Test on testnet before mainnet
  - **Estimated Time**: 2-3 hours
  - **Priority**: Critical

- [ ] **Task**: Update environment configuration
  - **Details**:
    - Add badge contract addresses to config
    - Add badge image paths to config
    - Update API endpoints if needed
  - **Estimated Time**: 1 hour
  - **Priority**: High

- [ ] **Task**: Create deployment documentation
  - **Details**:
    - Document contract addresses
    - Document deployment steps
    - Document rollback procedures
  - **Estimated Time**: 1-2 hours
  - **Priority**: Medium

#### 6.3 Production Deployment
- [ ] **Task**: Deploy to mainnet
  - **Details**:
    - Deploy contracts to Sui mainnet
    - Verify deployment success
    - Monitor initial badge minting
  - **Estimated Time**: 2-3 hours
  - **Priority**: Critical

- [ ] **Task**: Monitor production system
  - **Details**:
    - Monitor badge minting success rate
    - Monitor tier upgrade success rate
    - Monitor error rates
    - Monitor gas costs
  - **Estimated Time**: Ongoing
  - **Priority**: High

- [ ] **Task**: Create user documentation
  - **Details**:
    - Document badge system for users
    - Explain tier progression
    - Explain discounts
    - Explain soulbound nature
  - **Estimated Time**: 2-3 hours
  - **Priority**: Medium

**Phase 6 Deliverables**:
- ✅ All tests passing
- ✅ Contracts deployed to mainnet
- ✅ System monitoring in place
- ✅ User documentation

**Phase 6 Estimated Time**: 18-26 hours

---

## 📊 Implementation Summary

### Total Estimated Time
- **Phase 1**: 7-11 hours
- **Phase 2**: 15-22 hours
- **Phase 3**: 7-11 hours (mostly waiting on artist)
- **Phase 4**: 26-38 hours
- **Phase 5**: 26-36 hours
- **Phase 6**: 18-26 hours
- **Total**: **99-144 hours** (~12-18 working days)

### Critical Path
1. Phase 1 (Foundation) → Phase 2 (Badge Contract) → Phase 4 (Backend) → Phase 5 (Frontend) → Phase 6 (Testing)
2. Phase 3 (Images) can be done in parallel with Phase 2

### Parallel Work Opportunities
- **Phase 3** (Badge Images) can be done in parallel with Phase 2 (Badge Contract)
- **Phase 5** (Frontend) can start after Phase 4 backend endpoints are ready
- **Testing** can be done incrementally as each phase completes

---

## 🎯 Priority Order

### Must-Have (MVP)
1. ✅ Phase 1: Statistics system
2. ✅ Phase 2: Badge contract (minting and tier updates)
3. ✅ Phase 3: Badge images (at least Starter tier for MVP)
4. ✅ Phase 4: Backend integration (minting and updates)
5. ✅ Phase 5: Basic badge display and discount application
6. ✅ Phase 6: Testing and deployment

### Nice-to-Have (Post-MVP)
- Badge upgrade notifications (Phase 5)
- Badge viewer modal (Phase 5)
- Badge reconciliation endpoint (Phase 4)
- Leaderboard badge display (Phase 5)
- User documentation (Phase 6)

---

## 🔄 Iterative Development Approach

### Sprint 1: Foundation (Week 1)
- Phase 1: Statistics system
- Phase 2: Basic badge contract structure

### Sprint 2: Core Badge System (Week 2)
- Phase 2: Complete badge contract
- Phase 3: Badge images (in parallel)
- Phase 4: Backend badge service

### Sprint 3: Integration (Week 3)
- Phase 4: API endpoints and score submission integration
- Phase 5: Frontend badge display

### Sprint 4: Polish & Deploy (Week 4)
- Phase 5: Discount application and UI polish
- Phase 6: Testing and deployment

---

## 📝 Notes

### Development Considerations
- **Demo Mode**: Critical to exclude demo mode games from badge progression
- **Idempotency**: Use session IDs to prevent duplicate counting
- **Error Handling**: Robust retry logic is essential for reliability
- **Gas Costs**: Monitor gas costs, especially for badge updates
- **Image Size**: Ensure badge images stay under 200KB for on-chain storage

### Risk Mitigation
- **Network Errors**: Implement retry queue with exponential backoff
- **Contract Errors**: Comprehensive error handling and user feedback
- **Image Loading**: Cache images and handle loading errors gracefully
- **Statistics Sync**: Reconciliation endpoint to fix missed updates

### Future Enhancements
- Badge history/provenance tracking
- Badge fusion/combination (if implemented)
- Special edition badges
- Cross-game badge integration
- Badge animation (if wallet support improves)

---

## ✅ Checklist

Use this checklist to track progress:

- [ ] Phase 1: Foundation & Infrastructure
- [ ] Phase 2: Badge Smart Contract
- [ ] Phase 3: Badge Image Assets
- [ ] Phase 4: Backend Integration
- [ ] Phase 5: Frontend Integration
- [ ] Phase 6: Testing & Deployment

---

**Last Updated**: November 2025  
**Next Review**: After Phase 1 completion


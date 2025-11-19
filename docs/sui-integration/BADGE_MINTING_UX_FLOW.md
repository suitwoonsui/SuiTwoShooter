# Badge Minting UX Flow - Final Design

## Overview

This document outlines the final user experience flow for minting true soulbound badges, with player education and consent before minting.

## User Experience Flow

### Step 1: First Game Completion
**Trigger**: Player completes their first non-demo game
- Score is successfully submitted to blockchain
- Statistics system records `total_games = 1`
- Backend detects: Player has no badge yet AND has completed first game
- **Game Over screen displays** (normal game over flow)

### Step 2: Badge Minting Modal (Overlay on Game Over Screen)
**Display**: Show congratulatory modal **immediately after game over screen appears**
- Modal overlays the game over screen (semi-transparent backdrop)
- Player can see game over screen behind modal
- When modal is dismissed, returns to game over screen

**Modal Layout**:
```
┌─────────────────────────────────────────┐
│  🎉 Congratulations on Your First Game! │
│                                         │
│  ┌─────────────┐                      │
│  │             │                       │
│  │ Badge      │  [Badge Preview]     │
│  │ Preview     │  512x512px image     │
│  │ (Starter)   │                      │
│  │             │                       │
│  └─────────────┘                      │
│                                         │
│  You've unlocked the Early Supporter   │
│  Badge!                                 │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  How It Works:                          │
│  • Badge evolves as you play more games │
│  • 6 tiers: Starter → Legendary        │
│  • Tier based on games played           │
│  • Badge image updates automatically    │
│                                         │
│  Perks & Benefits:                     │
│  • Store discounts: 0% → 25%           │
│  • Gameplay discounts: 0% → 20%        │
│  • Exclusive early supporter status     │
│                                         │
│  Important:                             │
│  • Soulbound NFT (non-transferable)    │
│  • Permanently bound to your wallet    │
│  • Cannot be sold or traded             │
│  • Represents personal achievement      │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  [Mint Badge]  [Maybe Later]           │
└─────────────────────────────────────────┘
```

**Modal Elements**:
1. **Badge Preview**: Large 512x512px image of Starter tier badge (centered, prominent)
2. **Congratulations Message**: "🎉 Congratulations on Your First Game!"
3. **Badge Description**: "You've unlocked the Early Supporter Badge!"
4. **How It Works Section**: Brief explanation of tier progression
5. **Perks & Benefits Section**: Discount percentages and benefits
6. **Important Section**: Soulbound nature explanation
7. **Action Buttons**:
   - **"Mint Badge"** (Primary, prominent)
   - **"Maybe Later"** (Secondary, less prominent)

**No "Learn More" Button**: Keep it simple. Can add later if needed.

### Step 3: Player Decision

#### Option A: Player Clicks "Mint Badge"
1. **Wallet Prompt**: Player's wallet prompts for transaction signature
2. **Transaction Details**: Show gas fee estimate (if user pays)
3. **Player Signs**: Player approves transaction
4. **Minting Process**: Badge is minted on-chain
5. **Success Animation**: 
   - Badge preview animates (glow effect, particle effects)
   - "Badge Minted Successfully!" message
   - Badge appears in wallet
6. **Modal Dismisses**: Returns to game over screen

#### Option B: Player Clicks "Maybe Later"
1. **Modal Dismisses**: Returns to game over screen
2. **Backend Tracks**: Player has seen badge offer but not minted
3. **Future Prompts**: Show modal again on next game completion (until minted)

### Step 4: Return to Game Over Screen
- Normal game over screen functionality
- Player can see their score, stats, etc.
- Badge minting is complete (if they chose to mint)

## Gas Fee Strategy Discussion

### Option 1: User Pays Gas Fees (RECOMMENDED)
**Implementation**: Player pays for mint transaction gas fees

**Pros**:
- ✅ **User owns the transaction** - Player is the transaction signer
- ✅ **True soulbound** - Badge created directly in player's wallet
- ✅ **No admin costs** - Admin doesn't pay for every mint
- ✅ **Standard practice** - Users expect to pay for NFT mints
- ✅ **Prevents spam** - Small cost barrier prevents abuse
- ✅ **User commitment** - Paying shows genuine interest

**Cons**:
- ⚠️ **Friction** - User must have SUI for gas fees
- ⚠️ **Abandonment risk** - Some users might skip if they don't want to pay
- ⚠️ **First-time user barrier** - New users might not have SUI

**Gas Fee Estimate**:
- Sui transaction fees are very low (~$0.001 - $0.01)
- Badge minting is a simple transaction
- Should be affordable for most users

**UX Considerations**:
- Show gas fee estimate in modal: "Mint fee: ~$0.01"
- Make it clear this is a one-time cost
- Emphasize the value (badge + discounts worth more than mint fee)

### Option 2: Admin Sponsors Gas Fees
**Implementation**: Admin wallet sponsors transaction using Sui's sponsored transaction feature

**Pros**:
- ✅ **No user friction** - Free for users
- ✅ **Higher adoption** - More users will mint
- ✅ **Better UX** - No payment barrier

**Cons**:
- ❌ **Admin costs** - Admin pays for every mint (scales with users)
- ❌ **Spam risk** - No cost barrier, potential for abuse
- ❌ **More complex** - Requires sponsored transaction setup
- ❌ **Less commitment** - Users might mint without understanding value

**Cost Estimate**:
- If 1,000 users mint: ~$1-10 in gas fees
- If 10,000 users mint: ~$10-100 in gas fees
- Scales linearly with user adoption

## ✅ DECISION: User Pays Gas Fees

**Rationale**:
1. **True Soulbound**: Player signs transaction, badge created in their wallet
2. **Low Cost**: Sui gas fees are very low (~$0.01)
3. **User Commitment**: Paying shows genuine interest
4. **No Admin Burden**: Admin doesn't pay for every mint
5. **Standard Practice**: Users expect to pay for NFT mints
6. **Prevents Spam**: Small cost barrier prevents abuse

**Implementation**:
- Show gas fee estimate in modal: "Mint fee: ~$0.01 (one-time)"
- Make it clear this is a small, one-time cost
- Emphasize value: "Get discounts worth more than the mint fee!"
- If user doesn't have SUI, show helpful message: "You need a small amount of SUI for gas fees"

**Status**: ✅ **FINALIZED** - User pays gas fees for badge minting

## "Maybe Later" Behavior

**Implementation**:
- Backend tracks: `has_seen_badge_offer: true` for player
- Backend tracks: `has_minted_badge: false` for player
- On next game completion, if `has_seen_badge_offer && !has_minted_badge`:
  - Show modal again
- Continue prompting until player mints or explicitly dismisses

**Considerations**:
- Don't spam - maybe limit to once per session?
- Or show every game until minted?
- Could add "Don't show again" option (but then they can't mint later)

**Recommendation**: Show modal on every game completion until minted (but not more than once per game session).

## Technical Implementation Notes

### Backend Detection
```typescript
// After score submission
const playerStats = await getPlayerStats(playerAddress);
const hasBadge = await checkIfPlayerHasBadge(playerAddress);

if (playerStats.total_games === 1 && !hasBadge) {
  // Show badge minting modal
  return { showBadgeModal: true };
}
```

### Frontend Modal
- React/Vue component that overlays game over screen
- Shows badge preview image (Starter tier)
- Handles "Mint Badge" and "Maybe Later" actions
- Integrates with wallet for transaction signing

### Minting Transaction
- Player signs transaction
- Calls `mint_badge()` function
- Badge created directly in player's wallet
- Success animation and confirmation

## Summary

**Final Flow**:
1. ✅ Game over screen appears
2. ✅ Badge modal overlays immediately
3. ✅ Modal shows badge preview, explanation, perks
4. ✅ Player chooses: "Mint Badge" or "Maybe Later"
5. ✅ If "Mint Badge": Player pays gas fees, badge minted
6. ✅ If "Maybe Later": Modal dismissed, will prompt again next game
7. ✅ Return to game over screen

**Gas Fee Decision**: ✅ **User Pays** (FINALIZED)
- Low cost (~$0.01)
- True soulbound
- User commitment
- No admin burden

**Minting Fee Decision**: ✅ **$0.10 Dollar-Pegged** (FINALIZED)
- Frontend calculates SUI amount based on current price
- Contract validates minimum payment (safety net)
- Fee recipient: **Admin wallet** (receives all minting fees)
- Total cost: ~$0.11 ($0.10 minting fee + $0.01 gas)
- **IMPORTANT**: Update `FEE_RECIPIENT` constant in contract to admin wallet address before deployment

---

**Status**: Final Design  
**Date**: November 2025  
**Next Step**: Implementation (Phase 4 - Backend Integration)


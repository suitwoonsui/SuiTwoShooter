# Game Pass & Paywall Implementation Plan

## Overview

This document outlines the implementation plan for the game pass/credit system and post-first-boss paywall, adapted from the Insomnia game system to fit the shooter game's monetization strategy.

## Key Requirements from Monetization Strategy

1. **Demo Mode**: Free first level (through first boss) - "Play Demo" button
2. **Full Game Mode**: Consumes credit at game start - "Play Game" button
3. **Post-Demo Paywall**: After defeating first boss in demo, show "End Demo" modal → ask to continue
4. **Credit Packs**: 4 tiers (Starter: 10, Regular: 50, Value: 100, Mega: 250 games)
5. **Pay-Per-Game**: Single game option ($0.10 base)
6. **Payment Methods**: SUI, MEWS, or USDC (all supported)
7. **Badge Discounts**: 0-25% based on badge tier (queried when showing purchase screen, like store)
8. **Credit Consumption**: 
   - Demo mode: No credit consumed (free through first boss)
   - Full game mode: Consume 1 credit at game start
   - After demo: Consume credit when continuing past first boss
9. **Stacking Purchases**: Allow multiple purchases, batch transactions, graceful failure handling
10. **Refund/Admin Functions**: Admin can grant credits, refund failed transactions

---

## Phase 1: Smart Contract - Game Pass System

### Contract Structure (`game_pass.move`)

Adapt the Insomnia `GamePass.move` contract with shooter game pricing:

```move
module suitwo_game::game_pass {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::event;
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};

    // Credit Pack Types (matching MONETIZATION_STRATEGY.md)
    const PACK_STARTER: u8 = 1;    // 10 games
    const PACK_REGULAR: u8 = 2;    // 50 games
    const PACK_VALUE: u8 = 3;      // 100 games
    const PACK_MEGA: u8 = 4;       // 250 games

    // Base Pricing in MIST (1 SUI = 1,000,000,000 MIST)
    // Base prices (before badge discounts)
    // Note: Frontend calculates exact SUI amount based on current price to maintain $0.10 per game
    const STARTER_PRICE: u64 = 1_000_000_000;      // $1.00 (10 games @ $0.10)
    const REGULAR_PRICE: u64 = 4_500_000_000;     // $4.50 (50 games @ $0.09)
    const VALUE_PRICE: u64 = 8_500_000_000;      // $8.50 (100 games @ $0.085)
    const MEGA_PRICE: u64 = 20_000_000_000;       // $20.00 (250 games @ $0.08)

    // Games per pack
    const STARTER_GAMES: u64 = 10;
    const REGULAR_GAMES: u64 = 50;
    const VALUE_GAMES: u64 = 100;
    const MEGA_GAMES: u64 = 250;

    // Errors
    const E_INVALID_PACK_TYPE: u64 = 0;
    const E_INSUFFICIENT_PAYMENT: u64 = 1;
    const E_PASS_EXPIRED: u64 = 2;
    const E_NO_GAMES_REMAINING: u64 = 3;
    const E_NOT_AUTHORIZED: u64 = 4;

    /// Tournament ticket with value tracking
    /// Only USD is tracked (stable reference). MIST is calculated on-the-fly when needed for on-chain operations.
    public struct TournamentTicket has store {
        ticket_id: u64,              // Unique ticket ID
        value_paid_usd: u64,         // Value paid in USD (cents, e.g., 250 = $2.50)
        purchased_at: u64,           // Timestamp when purchased
    }
    
    /// Game Pass - tracks player's game credits and tournament tickets
    public struct GamePass has key, store {
        id: sui::object::UID,
        pack_type: u8,              // Which pack was purchased (for stacking)
        games_remaining: u64,        // Game credits remaining
        tournament_tickets: Table<u64, TournamentTicket>,  // Tournament tickets with values (ticket_id -> ticket)
        next_ticket_id: u64,         // Next ticket ID counter
        purchased_at: u64,            // Timestamp when purchased
        is_active: bool,              // Whether pass is active
    }

    /// System for managing all game passes
    public struct GamePassSystem has key {
        id: sui::object::UID,
        admin: address,               // Game owner/admin address
        total_passes_sold: u64,
        total_revenue: u64,
        active_passes: Table<address, sui::object::ID>,  // player -> GamePass ID
    }

    // Events
    public struct PassPurchased has copy, drop {
        buyer: address,
        pack_type: u8,
        games_included: u64,
        price_paid: u64,
        timestamp: u64,
    }

    public struct GamePlayed has copy, drop {
        player: address,
        games_remaining: u64,
        timestamp: u64,
    }

    public struct AdditionalGamesPurchased has copy, drop {
        buyer: address,
        pass_id: sui::object::ID,
        additional_games: u64,
        total_games_remaining: u64,
        price_paid: u64,
        timestamp: u64,
    }

    public struct FreeCreditsAdded has copy, drop {
        player: address,
        amount: u64,
        total_games_remaining: u64,
        timestamp: u64,
    }

    // ===== INITIALIZATION =====
    
    fun init(ctx: &mut TxContext) {
        let game_pass_system = GamePassSystem {
            id: sui::object::new(ctx),
            admin: tx_context::sender(ctx),
            total_passes_sold: 0,
            total_revenue: 0,
            active_passes: table::new(ctx),
        };
        transfer::share_object(game_pass_system);
    }

    // ===== PURCHASE FUNCTIONS =====

    /// Purchase a credit pack
    /// Supports SUI, MEWS, or USDC payment
    /// Frontend calculates exact payment amount based on:
    /// 1. Base pack price
    /// 2. Badge tier discount (0-25%)
    /// 3. Current token price (to maintain USD pricing)
    /// Note: This function handles SUI. Separate functions for MEWS/USDC or use generic coin type
    #[allow(lint(self_transfer))]
    public entry fun purchase_game_pass(
        system: &mut GamePassSystem,
        pack_type: u8,
        payment: Coin<SUI>,  // For SUI payments
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validate pack type and get pricing
        let (required_price, games_included) = match (pack_type) {
            PACK_STARTER => (STARTER_PRICE, STARTER_GAMES),
            PACK_REGULAR => (REGULAR_PRICE, REGULAR_GAMES),
            PACK_VALUE => (VALUE_PRICE, VALUE_GAMES),
            PACK_MEGA => (MEGA_PRICE, MEGA_GAMES),
            _ => abort E_INVALID_PACK_TYPE,
        };

        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= required_price, E_INSUFFICIENT_PAYMENT);

        // Create game pass
        let game_pass = GamePass {
            id: sui::object::new(ctx),
            pack_type,
            games_remaining: games_included,
            tournament_tickets: table::new(ctx),
            next_ticket_id: 1,
            purchased_at: current_time,
            is_active: true,
        };

        // Check if player already has an active pass
        if (table::contains(&system.active_passes, buyer)) {
            // Player has existing pass - add games to it
            let existing_pass_id = *table::borrow(&system.active_passes, buyer);
            
            // Update system stats
            system.total_revenue = system.total_revenue + payment_amount;
            
            // Emit event (backend will handle adding games to existing pass)
            event::emit(AdditionalGamesPurchased {
                buyer,
                pass_id: existing_pass_id,
                additional_games: games_included,
                total_games_remaining: 0,  // Backend calculates
                price_paid: payment_amount,
                timestamp: current_time,
            });
            
            // Destroy new pass (backend adds games to existing)
            let GamePass { id, pack_type: _, games_remaining: _, purchased_at: _, is_active: _ } = game_pass;
            sui::object::delete(id);
            
            // Transfer payment to admin
            transfer::public_transfer(payment, system.admin);
        } else {
            // First time buyer
            table::add(&mut system.active_passes, buyer, sui::object::id(&game_pass));
            
            // Update system stats
            system.total_passes_sold = system.total_passes_sold + 1;
            system.total_revenue = system.total_revenue + payment_amount;
            
            // Transfer payment to admin
            transfer::public_transfer(payment, system.admin);
            
            // Make pass shared (admin can consume credits)
            transfer::share_object(game_pass);
        };

        // Emit purchase event
        event::emit(PassPurchased {
            buyer,
            pack_type,
            games_included,
            price_paid: payment_amount,
            timestamp: current_time,
        });
    }

    /// Pay-per-game purchase (single game session)
    /// Frontend calculates exact payment based on badge discount
    public entry fun purchase_single_game(
        system: &mut GamePassSystem,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Base price: $0.10 per game (frontend applies badge discount)
        // Minimum payment check (frontend should send exact amount)
        let payment_amount = coin::value(&payment);
        // Note: Frontend calculates exact amount, this is just a safety check
        // At $1.00/SUI: 0.1 SUI = 100_000_000 MIST minimum
        
        // Check if player has existing pass
        if (table::contains(&system.active_passes, buyer)) {
            // Add 1 game to existing pass
            // Backend will handle this via add_games_to_existing_pass()
            system.total_revenue = system.total_revenue + payment_amount;
            
            // Emit event (backend adds 1 game)
            event::emit(AdditionalGamesPurchased {
                buyer,
                pass_id: *table::borrow(&system.active_passes, buyer),
                additional_games: 1,
                total_games_remaining: 0,
                price_paid: payment_amount,
                timestamp: current_time,
            });
        } else {
            // Create new pass with 1 game
            let game_pass = GamePass {
                id: sui::object::new(ctx),
                pack_type: PACK_STARTER,  // Single game uses starter type
                games_remaining: 1,
                tournament_tickets: table::new(ctx),
                next_ticket_id: 1,
                purchased_at: current_time,
                is_active: true,
            };
            
            table::add(&mut system.active_passes, buyer, sui::object::id(&game_pass));
            system.total_passes_sold = system.total_passes_sold + 1;
            system.total_revenue = system.total_revenue + payment_amount;
            
            transfer::public_transfer(payment, system.admin);
            transfer::share_object(game_pass);
            
            event::emit(PassPurchased {
                buyer,
                pack_type: PACK_STARTER,
                games_included: 1,
                price_paid: payment_amount,
                timestamp: current_time,
            });
        };
    }

    // ===== CREDIT CONSUMPTION =====

    /// Admin function to consume a game credit (called by backend)
    public fun consume_game_credit_for_user(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        player_address: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let game_owner = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Verify caller is admin
        assert!(game_owner == system.admin, E_NOT_AUTHORIZED);
        
        // Check pass is active
        assert!(pass.is_active, E_PASS_EXPIRED);
        
        // Check games remaining
        assert!(pass.games_remaining > 0, E_NO_GAMES_REMAINING);
        
        // Deduct 1 credit
        pass.games_remaining = pass.games_remaining - 1;
        
        // Deactivate if no games remaining
        if (pass.games_remaining == 0) {
            pass.is_active = false;
        };

        // Emit event
        event::emit(GamePlayed {
            player: player_address,
            games_remaining: pass.games_remaining,
            timestamp: current_time,
        });
    }

    // ===== ADMIN FUNCTIONS =====

    /// Add games to existing pass (for stacking purchases or rewards)
    public fun add_games_to_existing_pass(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        additional_games: u64,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == system.admin, E_NOT_AUTHORIZED);
        
        pass.games_remaining = pass.games_remaining + additional_games;
        pass.is_active = true;
    }

    /// Add free credits (for achievement rewards or admin grants)
    public fun add_free_credits(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == system.admin, E_NOT_AUTHORIZED);
        
        pass.games_remaining = pass.games_remaining + amount;
        pass.is_active = true;
        
        event::emit(FreeCreditsAdded {
            player: pass.owner,  // Note: Need to track owner in GamePass
            amount,
            total_games_remaining: pass.games_remaining,
            timestamp: clock::timestamp_ms(clock),
        });
    }
    
    /// Refund credits (for failed transactions or admin refunds)
    /// Admin can refund credits to player's GamePass
    public fun refund_credits(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == system.admin, E_NOT_AUTHORIZED);
        
        pass.games_remaining = pass.games_remaining + amount;
        pass.is_active = true;
        
        event::emit(FreeCreditsAdded {  // Reuse event for refunds
            player: pass.owner,
            amount,
            total_games_remaining: pass.games_remaining,
            timestamp: clock::timestamp_ms(clock),
        });
    }
    
    // ===== TOURNAMENT TICKET FUNCTIONS =====
    
    /// Purchase tournament ticket(s) with value tracking
    /// Only USD value is stored. MIST is calculated on-the-fly when needed for on-chain operations.
    public entry fun purchase_tournament_tickets(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        quantity: u64,                    // Number of tickets to purchase
        value_per_ticket_usd: u64,       // Value paid per ticket in USD (cents, e.g., 250 = $2.50)
        payment: Coin<SUI>,              // Payment in SUI (frontend converts USD to SUI based on current price)
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validate payment amount (frontend should send correct amount based on USD price)
        let payment_amount = coin::value(&payment);
        // Note: Frontend calculates exact MIST amount from USD value using current SUI price
        
        // Create tickets with USD value only
        let mut i = 0;
        while (i < quantity) {
            let ticket_id = pass.next_ticket_id;
            pass.next_ticket_id = pass.next_ticket_id + 1;
            
            let ticket = TournamentTicket {
                ticket_id,
                value_paid_usd: value_per_ticket_usd,  // Only USD is stored
                purchased_at: current_time,
            };
            
            table::add(&mut pass.tournament_tickets, ticket_id, ticket);
            i = i + 1;
        };
        
        // Update system revenue
        system.total_revenue = system.total_revenue + payment_amount;
        
        // Transfer payment to admin
        transfer::public_transfer(payment, system.admin);
        
        // Emit event (USD only)
        event::emit(TournamentTicketsPurchased {
            buyer,
            quantity,
            value_per_ticket_usd,
            total_paid: payment_amount,  // MIST amount paid (for reference)
            timestamp: current_time,
        });
    }
    
    /// Get available tournament tickets for a player
    public fun get_tournament_tickets(pass: &GamePass): vector<TournamentTicket> {
        // Return all tickets (frontend will filter/display)
        // Note: This is a view function, returns copy of tickets
    }
    
    /// Get ticket count (for quick checks)
    public fun get_ticket_count(pass: &GamePass): u64 {
        table::size(&pass.tournament_tickets)
    }

    // ===== VIEW FUNCTIONS =====

    public fun has_active_pass(system: &GamePassSystem, player: address): bool {
        table::contains(&system.active_passes, player)
    }

    public fun get_player_pass_id(system: &GamePassSystem, player: address): sui::object::ID {
        assert!(table::contains(&system.active_passes, player), E_PASS_EXPIRED);
        *table::borrow(&system.active_passes, player)
    }

    public fun get_pass_info(pass: &GamePass): (u8, u64, bool) {
        (pass.pack_type, pass.games_remaining, pass.is_active)
    }
}
```

### Key Differences from Insomnia

1. **No Unlimited Pass**: Removed unlimited pass type (not in monetization strategy)
2. **4 Pack Types**: Starter, Regular, Value, Mega (matching strategy)
3. **Pay-Per-Game**: Added `purchase_single_game()` function
4. **Free Credits**: Added `add_free_credits()` for achievement rewards
5. **Simplified**: No time-based expiration (only game-based)

---

## Phase 2: Backend Service - Game Pass Management

### Service Structure (`game-pass-service.ts`)

```typescript
export class GamePassService {
  /**
   * Check if player has active game pass and credits
   */
  async checkPlayerGamePass(playerAddress: string): Promise<{
    success: boolean;
    hasPass: boolean;
    gamesRemaining: number;
    gamePassId?: string;
    error?: string;
  }>;

  /**
   * Purchase credit pack(s) - supports stacking multiple purchases
   * Calculates price with badge discount
   * Supports SUI, MEWS, or USDC payment
   */
  async purchaseCreditPacks(
    playerAddress: string,
    purchases: Array<{
      packType: 'starter' | 'regular' | 'value' | 'mega';
      quantity: number; // Allow multiple of same pack
    }>,
    badgeTier: number,  // 0-5 (Standard to Legendary) - queried when showing purchase screen
    paymentToken: 'SUI' | 'MEWS' | 'USDC'
  ): Promise<{
    success: boolean;
    gamePassId?: string;
    totalGamesAdded?: number;
    transactionDigest?: string;
    error?: string;
  }>;

  /**
   * Purchase single game (pay-per-game)
   * Calculates price with badge discount
   * Supports SUI, MEWS, or USDC payment
   */
  async purchaseSingleGame(
    playerAddress: string,
    badgeTier: number,  // Queried when showing purchase screen
    paymentToken: 'SUI' | 'MEWS' | 'USDC'
  ): Promise<{
    success: boolean;
    gamePassId?: string;
    gamesAdded?: number;
    transactionDigest?: string;
    error?: string;
  }>;
  
  /**
   * Batch purchase (multiple packs in one transaction)
   * Graceful failure handling - if backend fails after payment, provide refund
   */
  async batchPurchasePacks(
    playerAddress: string,
    purchases: Array<{
      packType: 'starter' | 'regular' | 'value' | 'mega';
      quantity: number;
    }>,
    badgeTier: number,
    paymentToken: 'SUI' | 'MEWS' | 'USDC'
  ): Promise<{
    success: boolean;
    gamePassId?: string;
    totalGamesAdded?: number;
    transactionDigest?: string;
    error?: string;
    refundRequired?: boolean; // If true, admin should process refund
  }>;
  
  /**
   * Admin function: Grant credits to player
   */
  async grantCredits(
    playerAddress: string,
    amount: number
  ): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  /**
   * Admin function: Process refund (for failed transactions)
   */
  async processRefund(
    playerAddress: string,
    transactionDigest: string,
    refundAmount: number,
    refundToken: 'SUI' | 'MEWS' | 'USDC'
  ): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Consume a game credit (called when game starts)
   */
  async consumeGameCredit(playerAddress: string): Promise<{
    success: boolean;
    gamesRemaining?: number;
    error?: string;
  }>;

  /**
   * Add games to existing pass (for stacking purchases)
   */
  async addGamesToPass(
    playerAddress: string,
    additionalGames: number
  ): Promise<{
    success: boolean;
    gamesRemaining?: number;
    error?: string;
  }>;
  
  /**
   * Purchase tournament tickets with value tracking
   * Only USD value is stored. MIST is calculated on-the-fly when needed.
   */
  async purchaseTournamentTickets(
    playerAddress: string,
    quantity: number,
    valuePerTicketUSD: number,  // USD value per ticket (e.g., 2.50 for $2.50)
    badgeTier: number,          // For discount calculation
    paymentToken: 'SUI' | 'MEWS' | 'USDC'
  ): Promise<{
    success: boolean;
    ticketsPurchased?: number;
    ticketIds?: number[];
    error?: string;
  }>;
  
  /**
   * Get available tournament tickets for a player
   * Returns tickets with USD value only
   */
  async getTournamentTickets(playerAddress: string): Promise<{
    success: boolean;
    tickets?: Array<{
      ticketId: number;
      valuePaidUSD: number;  // USD value in cents
      purchasedAt: number;
    }>;
    error?: string;
  }>;
}
```

### Pricing Calculation

```typescript
// Badge tier discounts (0-25% range)
const BADGE_DISCOUNTS = {
  0: 0.00,  // Standard (0%)
  1: 0.00,  // Common (0%)
  2: 0.05,  // Uncommon (5%)
  3: 0.10,  // Rare (10%)
  4: 0.15,  // Epic (15%)
  5: 0.20,  // Legendary (20%) - can go up to 25% based on badge system
};

/**
 * Get badge tier and discount (query when showing purchase screen, like store)
 */
async function getBadgeTierAndDiscount(playerAddress: string): Promise<{
  tier: number;
  discount: number; // 0-25%
}> {
  // Query badge system (same as store)
  const badgeService = getBadgeService();
  const badge = await badgeService.getBadge(playerAddress);
  
  if (badge && badge.tier >= 0) {
    const discount = BADGE_DISCOUNTS[badge.tier] || 0;
    return { tier: badge.tier, discount };
  }
  
  return { tier: 0, discount: 0 };
}

// Base pack prices (in USD)
const PACK_PRICES = {
  starter: { price: 1.00, games: 10 },      // $0.10 per game
  regular: { price: 4.50, games: 50 },     // $0.09 per game
  value: { price: 8.50, games: 100 },      // $0.085 per game
  mega: { price: 20.00, games: 250 },      // $0.08 per game
};

// Pay-per-game base price
const PAY_PER_GAME_PRICE = 0.10;  // $0.10

/**
 * Calculate final price with badge discount
 */
function calculatePrice(basePrice: number, badgeTier: number): number {
  const discount = BADGE_DISCOUNTS[badgeTier] || 0;
  return basePrice * (1 - discount);
}

/**
 * Convert USD price to token amount (SUI, MEWS, or USDC)
 * Uses same price converter as store
 */
async function usdToToken(
  usdPrice: number,
  token: 'SUI' | 'MEWS' | 'USDC'
): Promise<number> {
  // Use same price converter as store
  const priceConverter = getPriceConverter();
  const result = await priceConverter.convertUSDToToken(usdPrice, token);
  
  if (!result.success || !result.tokenAmount) {
    throw new Error(`Failed to convert USD to ${token}: ${result.error}`);
  }
  
  return parseFloat(result.tokenAmount);
}
```

---

## Phase 3: Demo Mode & Paywall Integration

### Two Game Modes

**1. Demo Mode** ("Play Demo" button)
- Free first level (through first boss)
- No credit consumed
- After first boss defeat: Show "End Demo" modal
- Player can choose to continue (requires payment) or end game

**2. Full Game Mode** ("Play Game" button)
- Consumes 1 credit at game start
- Requires active GamePass with credits > 0
- If no credits: Show paywall modal before starting

### Demo Flow (After First Boss)

**Flow**:
```
1. Player clicks "Play Demo" button
   ↓
2. Game starts (no credit consumed)
   ↓
3. Player defeats first boss
   ↓
4. Show "End Demo" modal:
   - "Congratulations! You've completed the demo."
   - "Would you like to continue playing?"
   - [Continue] button → Check credits
   - [End Game] button → Return to menu
   ↓
5. If player clicks [Continue]:
   a. Check if player has credits:
      - If YES && credits > 0: Consume 1 credit, continue game
      - If NO || credits === 0: Show paywall modal
   ↓
6. Paywall modal shows:
   - Credit pack options (with badge discount)
   - Pay-per-game option
   - Current balance/credits display
   - Badge tier and discount info
   - [Cancel] button → Returns to "End Demo" modal
   ↓
7. After purchase:
   - Consume 1 credit
   - Continue game from where demo ended
```

### Full Game Flow

**Flow**:
```
1. Player clicks "Play Game" button
   ↓
2. Check if player has credits:
   - If NO || credits === 0: Show paywall modal (don't start game)
   - If YES && credits > 0: Continue to step 3
   ↓
3. Consume 1 credit at game start
   ↓
4. Start game
   ↓
5. Player plays full game (no interruptions)
```

### Implementation in Game Code

```javascript
// In game-update.js or boss-handler.js

let gameMode = 'demo'; // 'demo' or 'full'

// When player clicks "Play Demo"
function startDemoMode() {
  gameMode = 'demo';
  game.start(); // No credit check, no credit consumption
}

// When player clicks "Play Game"
async function startFullGameMode() {
  gameMode = 'full';
  
  // Check credits before starting
  const gamePassStatus = await checkPlayerGamePass(playerAddress);
  
  if (!gamePassStatus.hasPass || gamePassStatus.gamesRemaining === 0) {
    // No credits - show store modal (Game Pass tab only) before starting
    showStoreModal({
      context: 'gameplay-paywall',  // Only show Game Pass tab
      activeTab: 'gamePass',
      visibleTabs: ['gamePass'],     // Only Game Pass visible
      onCancel: () => {
        // Cancel - don't start game
        hideStoreModal();
      },
      onPurchaseComplete: async () => {
        // After purchase, consume credit and start game
        const consumeResult = await consumeGameCredit(playerAddress);
        if (consumeResult.success) {
          hideStoreModal();
          game.start();
        }
      },
    });
    return; // Don't start game
  }
  
  // Has credits - consume and start
  const consumeResult = await consumeGameCredit(playerAddress);
  if (consumeResult.success) {
    game.start();
  } else {
    showError('Failed to start game. Please try again.');
  }
}

async function handleBossDefeat(bossTier) {
  // ... existing boss defeat logic ...
  
  // Check if this is first boss (tier 1) AND in demo mode
  if (bossTier === 1 && gameMode === 'demo') {
    // Demo completed - show "End Demo" modal
    showEndDemoModal({
      onContinue: async () => {
        // Player wants to continue
        const gamePassStatus = await checkPlayerGamePass(playerAddress);
        
        if (gamePassStatus.hasPass && gamePassStatus.gamesRemaining > 0) {
          // Has credits - consume and continue
          const consumeResult = await consumeGameCredit(playerAddress);
          if (consumeResult.success) {
            hideEndDemoModal();
            continueGameplay(); // Continue from where demo ended
          }
        } else {
          // No credits - show store modal (Game Pass tab only)
          hideEndDemoModal();
          showStoreModal({
            context: 'gameplay-paywall',  // Only show Game Pass tab
            activeTab: 'gamePass',
            visibleTabs: ['gamePass'],     // Only Game Pass visible
            onCancel: () => {
              // Cancel - return to "End Demo" modal
              hideStoreModal();
              showEndDemoModal({ onContinue, onEndGame });
            },
            onPurchaseComplete: async () => {
              // Purchase complete - consume credit and continue
              const consumeResult = await consumeGameCredit(playerAddress);
              if (consumeResult.success) {
                hideStoreModal();
                continueGameplay();
              }
            },
          });
        }
      },
      onEndGame: () => {
        // Player ends demo - return to menu
        hideEndDemoModal();
        game.end();
        showMainMenu();
      },
    });
    
    // Pause game until decision
    game.pause();
  }
}
```

### Store Modal Integration (Unified Purchase System)

**All purchases go through the Store Modal** - Game Pass and Tournament Tickets use the same store modal with tabs.

#### Store Modal Tabs

```typescript
// Store modal has tabs for different purchase types
interface StoreModalTabs {
  items: 'Items';           // Game items (existing)
  gamePass: 'Game Pass';    // Credit packs and pay-per-game
  tickets: 'Tournament Tickets'; // Tournament ticket purchases
}

// Context-aware tab visibility:
// - Main Menu: All tabs visible (Items, Game Pass, Tickets)
// - During Gameplay (Paywall): Only Game Pass tab visible
// - Tournament Section: Only Tickets tab visible
```

#### Store Modal Structure (Enhanced)

```typescript
// Enhanced store modal with tabs
interface StoreModalProps {
  // Context determines which tabs are visible
  context: 'main-menu' | 'gameplay-paywall' | 'tournament';
  
  // Tab visibility (based on context)
  visibleTabs: Array<'items' | 'gamePass' | 'tickets'>;
  
  // Active tab (default based on context)
  activeTab: 'items' | 'gamePass' | 'tickets';
  
  // Callbacks
  onClose: () => void;
  onCancel?: () => void; // Returns to previous modal (End Demo, etc.)
  
  // Shared state (same as current store)
  badgeTier: number;
  badgeDiscount: number;  // 0-25%
  paymentToken: 'sui' | 'mews' | 'usdc';
  walletBalance: {
    sui: number;
    mews: number;
    usdc: number;
  };
}

// Store Modal HTML Structure:
// - Header: "Premium Store" (or context-specific title)
// - Tab Navigation: Items | Game Pass | Tournament Tickets (context-aware)
// - Payment Method Selector: SUI / $MEWS / USDC (shared across all tabs)
// - Balance Display: Current wallet balance for selected token (shared)
// - Badge Display: Show badge tier and discount percentage (shared)
// - Tab Content Area:
//   - Items Tab: Existing item catalog
//   - Game Pass Tab: Credit packs and pay-per-game options
//   - Tickets Tab: Tournament ticket purchase options
// - Footer: [Cancel] / [Back] button (context-aware)
```

#### Game Pass Tab Content

```typescript
// Game Pass tab in store modal
interface GamePassTabContent {
  // Current Credits Display
  creditsRemaining: number;
  hasPass: boolean;
  
  // Credit Pack Options (with badge discount)
  packs: Array<{
    type: 'starter' | 'regular' | 'value' | 'mega';
    name: string;
    games: number;
    originalPrice: number;      // USD
    discountedPrice: number;    // USD (with badge discount)
    tokenAmount: number;        // In selected payment token
    tokenSymbol: string;       // SUI / $MEWS / USDC
  }>;
  
  // Pay-Per-Game Option
  payPerGame: {
    originalPrice: number;      // $0.10 USD
    discountedPrice: number;   // With badge discount
    tokenAmount: number;
    tokenSymbol: string;
  };
  
  // Purchase Actions
  onPurchasePack: (packType: string, quantity?: number) => Promise<void>;
  onPurchaseSingleGame: () => Promise<void>;
  onStackPurchases: (purchases: Array<{packType: string, quantity: number}>) => Promise<void>;
}
```

#### Tournament Tickets Tab Content

```typescript
// Tournament Tickets tab in store modal
interface TournamentTicketsTabContent {
  // Current Tickets Display
  ticketsRemaining: number;
  
  // Ticket Purchase Options (with badge discount)
  // Purchase flow is the same as other purchases (Items, Game Pass)
  // Players can buy single tickets or bundles with bulk discounts
  ticketOptions: Array<{
    quantity: number;            // 1, 5, 10, 20 tickets
    name: string;                // "Single Ticket", "5 Ticket Bundle", etc.
    originalPrice: number;      // USD per ticket or bundle
    bundleDiscount: number;     // Percentage discount for bundles (0-20%)
    badgeDiscount: number;      // Badge tier discount (0-20%)
    finalPrice: number;         // USD (after bundle + badge discounts)
    tokenAmount: number;         // In selected payment token (SUI/$MEWS/USDC)
    tokenSymbol: string;
    savings: string;             // "Save 15%" for bundles
  }>;
  
  // Purchase Actions
  onPurchaseTickets: (quantity: number) => Promise<void>;
}

// Ticket Bundle Structure (similar to credit packs):
// - Single Ticket: $1 (no bundle discount)
// - 5 Ticket Bundle: $4.50 (10% discount) = $0.90 per ticket
// - 10 Ticket Bundle: $8.50 (15% discount) = $0.85 per ticket
// - 20 Ticket Bundle: $16.00 (20% discount) = $0.80 per ticket
// Badge discount applies on top of bundle discount
```

### End Demo Modal UI

```typescript
// components/EndDemoModal.tsx

interface EndDemoModalProps {
  isOpen: boolean;
  onContinue: () => void; // Check credits, show paywall if needed
  onEndGame: () => void; // Return to main menu
}

// Display:
// - "Congratulations! You've completed the demo."
// - "Would you like to continue playing?"
// - [Continue Playing] button → Check credits, show paywall if needed
// - [End Game] button → Return to main menu
```

---

## Phase 4: Credit Consumption Timing

### When to Consume Credits

**Demo Mode**: No credit consumed (free through first boss)

**Full Game Mode**: Consume credit at game start (before game begins)

**After Demo**: Consume credit when player chooses to continue (after first boss)

### Implementation

```javascript
// In game-service.js or game-start handler

// Demo Mode - No credit consumption
function startDemoMode() {
  // No credit check, no credit consumption
  game.start();
  gameMode = 'demo';
}

// Full Game Mode - Consume at start
async function startFullGameMode() {
  // Check credits before starting
  const gamePassStatus = await checkPlayerGamePass(playerAddress);
  
  if (!gamePassStatus.hasPass || gamePassStatus.gamesRemaining === 0) {
    // No credits - show paywall
    showPaywallModal({
      onCancel: () => {
        hidePaywallModal();
        // Don't start game
      },
    });
    return;  // Don't start game
  }
  
  // Consume 1 credit before starting
  const consumeResult = await consumeGameCredit(playerAddress);
  
  if (!consumeResult.success) {
    // Failed to consume - show error
    showError('Failed to start game. Please try again.');
    return;
  }
  
  // Credit consumed - start game
  game.start();
  gameMode = 'full';
  
  // Display remaining credits
  updateCreditsDisplay(consumeResult.gamesRemaining);
}

// After Demo - Consume when continuing
async function continueAfterDemo() {
  const gamePassStatus = await checkPlayerGamePass(playerAddress);
  
  if (gamePassStatus.hasPass && gamePassStatus.gamesRemaining > 0) {
    // Has credits - consume and continue
    const consumeResult = await consumeGameCredit(playerAddress);
    
    if (consumeResult.success) {
      // Continue game from where demo ended
      continueGameplay();
      gameMode = 'full'; // Switch to full game mode
    } else {
      showError('Failed to continue. Please try again.');
    }
  } else {
    // No credits - show paywall
    showPaywallModal({
      onPurchaseComplete: async () => {
        // After purchase, consume credit and continue
        const consumeResult = await consumeGameCredit(playerAddress);
        if (consumeResult.success) {
          continueGameplay();
          gameMode = 'full';
        }
      },
    });
  }
}
```

---

## Phase 5: Frontend Integration - Store Modal Integration

### Unified Store Modal Architecture

**All purchases use the Store Modal with tabs:**

1. **Store Modal Tabs:**
   - **Items Tab**: Game items (existing functionality)
   - **Game Pass Tab**: Credit packs and pay-per-game
   - **Tournament Tickets Tab**: Tournament ticket purchases

2. **Context-Aware Tab Visibility:**
   - **Main Menu**: All tabs visible (Items, Game Pass, Tickets)
   - **During Gameplay (Paywall)**: Only Game Pass tab visible
   - **Tournament Section**: Only Tickets tab visible

3. **Shared Components (All Tabs):**
   - Payment method selector (SUI/$MEWS/USDC)
   - Balance display
   - Badge tier and discount display
   - Purchase flow (same transaction handling)

### Store Modal Enhancement

**File:** `src/game/systems/ui/store-modal.js` (enhance existing)

```javascript
// Enhanced store modal with tabs
function showStoreModal(options = {}) {
  const {
    context = 'main-menu',        // 'main-menu' | 'gameplay-paywall' | 'tournament'
    activeTab = null,              // Auto-select based on context if null
    visibleTabs = null,            // Auto-determine based on context if null
    onCancel = null,               // Optional cancel callback
    onPurchaseComplete = null,     // Optional purchase complete callback
  } = options;
  
  // Determine visible tabs based on context
  const tabs = visibleTabs || getVisibleTabsForContext(context);
  
  // Determine active tab
  const tab = activeTab || getDefaultTabForContext(context);
  
  // Create/store modal with tabs
  // ... existing store modal creation ...
  
  // Add tab navigation
  addTabNavigation(tabs, tab);
  
  // Load appropriate tab content
  loadTabContent(tab, context);
}

function getVisibleTabsForContext(context) {
  switch (context) {
    case 'main-menu':
      return ['items', 'gamePass', 'tickets'];
    case 'gameplay-paywall':
      return ['gamePass'];
    case 'tournament':
      return ['tickets'];
    default:
      return ['items', 'gamePass', 'tickets'];
  }
}

function getDefaultTabForContext(context) {
  switch (context) {
    case 'gameplay-paywall':
      return 'gamePass';
    case 'tournament':
      return 'tickets';
    default:
      return 'items';
  }
}
```

### Game Pass Context

```typescript
// contexts/GamePassContext.tsx

interface GamePassContextType {
  // State
  gamePass: GamePass | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshGamePass: () => Promise<void>;
  purchaseCreditPack: (packType: string) => Promise<boolean>;
  purchaseSingleGame: () => Promise<boolean>;
  consumeGameCredit: () => Promise<boolean>;
  
  // Computed
  hasActivePass: boolean;
  gamesRemaining: number;
}
```

### Paywall Modal Component

```typescript
// components/PaywallModal.tsx

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchasePack: (packType: string) => Promise<void>;
  onPayPerGame: () => Promise<void>;
  badgeTier: number;
  gamesRemaining: number;  // 0 if no pass
}

// Features:
// - Display credit pack options with badge-discounted pricing
// - Display pay-per-game option
// - Show current credits (if any)
// - "Continue Playing" messaging
// - Close button (cancels game)
```

### Credit Display

```typescript
// components/CreditsDisplay.tsx

// Show in:
// - Main menu: "X credits remaining"
// - Game HUD: "Credits: X" (during gameplay)
// - Post-game screen: "X credits remaining"
```

---

## Phase 6: API Endpoints

### Backend Routes

```typescript
// routes/game-pass.ts

// GET /api/game-pass/:address
// Get player's game pass status
router.get('/:address', async (req, res) => {
  const { address } = req.params;
  const status = await gamePassService.checkPlayerGamePass(address);
  res.json(status);
});

// POST /api/game-pass/purchase-pack
// Purchase credit pack
router.post('/purchase-pack', async (req, res) => {
  const { playerAddress, packType, badgeTier } = req.body;
  const result = await gamePassService.purchaseCreditPack(
    playerAddress,
    packType,
    badgeTier
  );
  res.json(result);
});

// POST /api/game-pass/purchase-single
// Pay-per-game purchase
router.post('/purchase-single', async (req, res) => {
  const { playerAddress, badgeTier } = req.body;
  const result = await gamePassService.purchaseSingleGame(
    playerAddress,
    badgeTier
  );
  res.json(result);
});

// POST /api/game-pass/consume-credit
// Consume game credit
router.post('/consume-credit', async (req, res) => {
  const { playerAddress } = req.body;
  const result = await gamePassService.consumeGameCredit(playerAddress);
  res.json(result);
});
```

---

## Phase 7: Implementation Steps

### Step 1: Smart Contract
1. Create `game_pass.move` contract
2. Deploy and initialize `GamePassSystem`
3. Test purchase flows
4. Test credit consumption
5. Test stacking purchases

### Step 2: Backend Service
1. Create `game-pass-service.ts`
2. Implement pricing calculation with badge discounts
3. Implement SUI price fetching/conversion
4. Add API endpoints
5. Test all purchase flows

### Step 3: Paywall Integration
1. Detect first boss defeat
2. Check credits after first boss
3. Show paywall modal if no credits
4. Handle purchase flows
5. Resume game after purchase

### Step 4: Credit Consumption
1. Implement credit check at game start
2. Consume credit before game starts
3. Handle first game free play
4. Display remaining credits
5. Handle edge cases (no credits, failed consumption)

### Step 5: Frontend UI
1. Create "Play Demo" and "Play Game" buttons in main menu
2. Create `EndDemoModal` component
3. Create `PaywallModal` component (similar to store modal)
   - Payment method selector (SUI/$MEWS/USDC)
   - Balance display
   - Badge tier and discount display
   - Credit pack options with discounted pricing
   - Pay-per-game option
   - Current credits display
   - Cancel button (returns to previous modal)
4. Create `CreditsDisplay` component
5. Create `GamePassContext` (with badge querying)
6. Integrate with demo flow
7. Integrate with full game flow
8. Integrate with boss defeat flow

### Step 6: Testing
1. Test demo mode (free first level)
2. Test full game mode (credit consumption at start)
3. Test "End Demo" modal after first boss
4. Test paywall when continuing after demo (no credits)
5. Test paywall when starting full game (no credits)
6. Test credit pack purchases (single and multiple)
7. Test pay-per-game purchases
8. Test payment methods (SUI, MEWS, USDC)
9. Test badge discounts (query when showing purchase screen)
10. Test stacking purchases (multiple packs)
11. Test batch transactions
12. Test graceful failure handling (backend fails after payment)
13. Test refund mechanism
14. Test admin functions (grant credits, process refunds)
15. Test credit consumption (demo vs full game)
16. Test edge cases (no credits, expired pass, failed transactions, etc.)

---

## Data Flow Diagrams

### Purchase Credit Pack Flow (Through Store Modal)

```
1. Player opens store modal (context determines visible tabs)
   - Main Menu: All tabs visible
   - Gameplay Paywall: Only Game Pass tab visible
   - Tournament: Only Tickets tab visible
   ↓
2. Player navigates to Game Pass tab (or it's the only visible tab)
   ↓
3. Badge tier queried when tab is shown (like store items)
   ↓
4. Player selects credit pack(s)
   - Can select multiple packs (stacking)
   - Shows original price, discounted price, token amount
   ↓
5. Frontend: Calculate total price with badge discount
   - Apply discount to each pack
   - Sum total USD
   ↓
6. Frontend: Player selects payment method (SUI/$MEWS/USDC)
   - Same payment selector as Items tab
   ↓
7. Frontend: Convert USD to selected token (based on current price)
   ↓
8. Frontend: Player signs transaction (batched if multiple packs)
   ↓
9. Blockchain: purchase_game_pass() called (or batch function)
   ↓
10. Blockchain: Payment transferred to admin
   ↓
11. Blockchain: GamePass created/updated
   ↓
12. Backend: Listen for PassPurchased/AdditionalGamesPurchased events
   ↓
13. Backend: If existing pass, add games via add_games_to_existing_pass()
   ↓
14. If backend fails after payment:
    - Mark transaction for refund
    - Log refund requirement
    - Admin processes refund manually
   ↓
15. Frontend: Refresh game pass status
   ↓
16. Frontend: Close store modal, resume game (or continue after demo)
```

### Credit Consumption Flow

**Demo Mode:**
```
1. Player clicks "Play Demo"
   ↓
2. Game starts (no credit check, no credit consumed)
   ↓
3. Player defeats first boss
   ↓
4. Show "End Demo" modal
   ↓
5. If player clicks "Continue":
   a. Check game pass status
   b. If has credits: Consume 1 credit, continue game
   c. If no credits: Show paywall modal
   ↓
6. After purchase: Consume 1 credit, continue game
```

**Full Game Mode:**
```
1. Player clicks "Play Game"
   ↓
2. Frontend: Check game pass status
   ↓
3. If no credits: Show paywall (don't start game)
   ↓
4. If has credits: Call consumeGameCredit()
   ↓
5. Backend: consume_game_credit_for_user() on blockchain
   ↓
6. Blockchain: Deduct 1 credit, emit GamePlayed event
   ↓
7. Backend: Return updated games_remaining
   ↓
8. Frontend: Start game, display remaining credits
```

### Demo & Paywall Flow

```
1. Player clicks "Play Demo"
   ↓
2. Game starts (no credit consumed)
   ↓
3. Player defeats first boss
   ↓
4. Show "End Demo" modal:
   - "Congratulations! You've completed the demo."
   - "Would you like to continue playing?"
   - [Continue] / [End Game]
   ↓
5. If player clicks [Continue]:
   a. Check game pass status
   b. If has credits: Consume 1 credit, continue game
   c. If no credits: Show paywall modal
   ↓
6. Paywall modal shows:
   - Payment method selector (SUI/$MEWS/USDC)
   - Balance display
   - Badge tier and discount info
   - Credit pack options (with discounted prices)
   - Pay-per-game option
   - Current credits (if any)
   - [Cancel] → Returns to "End Demo" modal
   ↓
7. Player purchases:
   - Can select multiple packs (stacking)
   - Batch transaction (one transaction for all)
   ↓
8. After purchase: Consume 1 credit, continue game
```

---

## Security Considerations

1. **Admin-Only Functions**: Only admin can consume credits (prevents cheating)
2. **Payment Verification**: Contract verifies payment amount
3. **Badge Discount Verification**: Backend calculates, but contract can verify if needed
4. **Idempotency**: Prevent duplicate credit consumption (use session IDs)
5. **Gas Costs**: Backend pays gas for credit consumption (standard pattern)

---

## Performance Considerations

1. **Caching**: Cache game pass status (refresh after purchase/consumption)
2. **Lazy Loading**: Only check credits when needed (game start, after boss)
3. **Batch Operations**: If multiple purchases, batch blockchain calls
4. **SUI Price Caching**: Cache SUI price (update every 5-10 minutes)

---

## Testing Checklist

- [ ] Demo mode works (free first level, no credit consumed)
- [ ] Full game mode works (credit consumed at start)
- [ ] "End Demo" modal appears after first boss
- [ ] Paywall appears when continuing after demo (if no credits)
- [ ] Paywall appears when starting full game (if no credits)
- [ ] Credit pack purchase works (single pack)
- [ ] Stacking purchases work (multiple packs)
- [ ] Batch transactions work (one transaction for multiple packs)
- [ ] Pay-per-game purchase works
- [ ] Payment methods work (SUI, MEWS, USDC)
- [ ] Badge tier queried when showing purchase screen (like store)
- [ ] Badge discounts apply correctly (0-25%)
- [ ] Price display shows original and discounted (like store)
- [ ] Credit consumption works (demo continue, full game start)
- [ ] Credits display correctly
- [ ] Game resumes after purchase
- [ ] Cancel button returns to previous modal
- [ ] Graceful failure handling (backend fails after payment)
- [ ] Refund mechanism works
- [ ] Admin functions work (grant credits, process refunds)
- [ ] Edge cases (no credits, expired pass, failed transactions, etc.)

---

## Estimated Timeline

- **Phase 1 (Contract)**: 2-3 days
- **Phase 2 (Backend)**: 2-3 days
- **Phase 3 (Paywall)**: 2 days
- **Phase 4 (Consumption)**: 1-2 days
- **Phase 5 (Frontend)**: 3-4 days
- **Phase 6 (Testing)**: 2-3 days
- **Total**: ~2-3 weeks

---

## Dependencies

- `badge_system.move` - For badge tier lookup (discount calculation)
- `score_submission.move` - For checking total_games (first game detection)
- Backend services already in place
- Frontend framework ready

---

## Notes

- **Demo Mode**: Free first level (through first boss) - "Play Demo" button
- **Full Game Mode**: Consumes credit at game start - "Play Game" button
- **No First Game Free**: Demo replaces the concept of "first game free"
- **Badge Discounts**: Queried when showing purchase screen (like store), 0-25% range
- **Payment Methods**: Support SUI, MEWS, and USDC (all payment methods)
- **Stacking Purchases**: Players can purchase multiple packs, batch in one transaction
- **Graceful Failure**: If backend fails after payment, mark for refund, admin processes
- **Refund/Admin Functions**: Admin can grant credits and process refunds
- **Paywall Modal**: Similar to store modal - shows balance, badge, discount, payment methods
- **Cancel Button**: Returns to previous modal (End Demo or Main Menu)


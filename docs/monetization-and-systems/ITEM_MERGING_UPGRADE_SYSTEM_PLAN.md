# Item Merging & Upgrade System Plan

## Overview

Allow players to merge lower-level items into higher-level items for a fee. This provides value for unused lower-level items and creates an additional revenue stream.

**Note:** This system integrates with the Inventory System (`INVENTORY_SYSTEM_IMPLEMENTATION_PLAN.md`). The inventory system manages all item storage and provides the foundation for merge operations.

---

## System Design

### Core Concept

Players can combine multiple lower-level items of the same type to create one higher-level item. The merge requires:
- **Multiple lower-level items** (e.g., 3x Level 1 items)
- **Merge fee** (paid in SUI or credits)
- **Result:** 1x higher-level item

### Merge Ratios

#### Standard Merge Ratio (3:1)
- **3x Level 1** → **1x Level 2** + Fee
- **3x Level 2** → **1x Level 3** + Fee

#### Direct Merge (Skip Level 2)
- **9x Level 1** → **1x Level 3** (skip Level 2, premium fee for convenience)
  - Equivalent to: 3x (3x Level 1 → 1x Level 2) = 3x Level 2, then 3x Level 2 → 1x Level 3
  - Requires 9x Level 1 items (3×3)
  - Standard path cost: 3 × $0.25 + $0.50 = $1.25
  - Direct path cost: $1.50 (20% premium for skipping intermediate step)

**Finalized Ratios:**
- **3x Level 1** → **1x Level 2** (standard)
- **3x Level 2** → **1x Level 3** (standard)
- **9x Level 1** → **1x Level 3** (direct, skip Level 2, premium fee)

---

## Merge Fees

### Fee Structure (Finalized)

**Fixed Fee Per Merge (USD-Pegged)**

- **Level 1 → Level 2:** $0.25 USD
  - Requires: 3x Level 1 items
  - Fee: $0.25 (converted to SUI/$MEWS/USDC at current rates)

- **Level 2 → Level 3:** $0.50 USD
  - Requires: 3x Level 2 items
  - Fee: $0.50 (converted to SUI/$MEWS/USDC at current rates)

- **Level 1 → Level 3 (direct, skip Level 2):** $1.50 USD
  - Requires: 9x Level 1 items
  - Fee: $1.50 (premium option for convenience)
  - Standard path: 3 × $0.25 (for 3x L1→L2 merges) + $0.50 (for 1x L2→L3 merge) = $1.25 total
  - Direct path: $1.50 (20% premium for skipping intermediate step)

**Fee Calculation:**
- Standard path (L1→L2→L3): 3 × $0.25 + $0.50 = $1.25 total (uses 9x L1 items)
- Direct path (L1→L3): $1.50 (20% premium for convenience, uses 9x L1 items)

**Payment Methods:**
- Players can pay in **SUI**, **$MEWS**, or **USDC**
- Fees are calculated in USD and converted to selected token at current market rates
- Same conversion system as premium store purchases

### Gas Fees

**Who Pays for Gas:**
- ✅ **Admin wallet pays all Sui network gas fees**
- ✅ **Player only pays the merge fee** (no additional SUI needed for gas)
- ✅ **Consistent with store purchase flow** - same pattern for smooth UX

**Payment Breakdown:**
- **Player pays:** Merge fee ($0.25, $0.50, or $1.50) in chosen token (SUI/$MEWS/USDC)
- **Admin wallet pays:** Sui network transaction gas fees (~$0.001-0.01 per transaction)

**Benefits:**
- ✅ Smooth UX - players don't need SUI for gas, only payment token
- ✅ Consistent experience - same pattern as item purchases
- ✅ Lower barrier to entry - players only need the merge fee amount
- ✅ Gas costs factored into merge fee pricing

**Transaction Flow:**
1. Player pays merge fee to admin wallet (in SUI/$MEWS/USDC)
2. Admin wallet receives payment
3. Admin wallet signs merge transaction and pays gas fees
4. Player receives merged item without needing SUI for gas

### Badge Discounts

Apply badge tier discounts to merge fees (same as store purchases):
- **Standard (1-4 games):** 0% discount
- **Common (5-14 games):** 5% discount
- **Uncommon (15-34 games):** 10% discount
- **Rare (35-74 games):** 15% discount
- **Epic (75-149 games):** 20% discount
- **Legendary (150+ games):** 25% discount

**Discount Application:**
- Discounts apply to the base fee before token conversion
- Example: Legendary player merging L1→L2
  - Base fee: $0.25
  - Discount (25%): -$0.0625
  - Final fee: $0.1875 USD
  - Converted to SUI/$MEWS/USDC at current rates

---

## Supported Items

### Items with Levels (Can Merge)
1. **Extra Lives** (Levels 1-3)
2. **Force Field** (Levels 1-3)
3. **Orb Level** (Levels 1-3)
4. **Slow Time** (Levels 1-3)
5. **Coin Tractor Beam** (Levels 1-3)

### Single-Level Items (Cannot Merge)
- **Destroy All** (Single level only)
- **Boss Kill Shot** (Single level only)

---

## Data Structure

### On-Chain: Item Merge Event

```move
module suitwo_game::item_merging {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use suitwo_game::premium_store::{Self, PremiumStore, PlayerInventory};
    
    // Item type constants (matching premium_store)
    const ITEM_EXTRA_LIVES: u8 = 0;
    const ITEM_FORCE_FIELD: u8 = 1;
    const ITEM_ORB_LEVEL: u8 = 2;
    const ITEM_SLOW_TIME: u8 = 3;
    const ITEM_COIN_TRACTOR_BEAM: u8 = 6;
    
    // Merge fee constants (in USD, converted to tokens dynamically)
    // Fees are USD-pegged and converted to SUI/$MEWS/USDC at current rates
    // Base fees (before badge discounts):
    const MERGE_FEE_L1_TO_L2_USD: u64 = 25;      // $0.25 USD (in cents)
    const MERGE_FEE_L2_TO_L3_USD: u64 = 50;      // $0.50 USD (in cents)
    const MERGE_FEE_L1_TO_L3_USD: u64 = 150;     // $1.50 USD (in cents, 2x premium)
    
    // Note: Actual token amounts calculated dynamically based on current prices
    
    // Errors
    const E_INVALID_ITEM_TYPE: u64 = 0;
    const E_INSUFFICIENT_ITEMS: u64 = 1;
    const E_INSUFFICIENT_PAYMENT: u64 = 2;
    const E_INVALID_MERGE_PATH: u64 = 3;
    
    /// Event emitted when items are merged
    struct ItemsMerged has copy, drop {
        player: address,
        item_type: u8,
        source_level: u8,      // Level of items being merged (1 or 2)
        target_level: u8,      // Level of resulting item (2 or 3)
        items_consumed: u64,   // Number of items consumed (3 for standard, 9 for direct L1→L3)
        items_created: u64,    // Always 1
        fee_paid: u64,         // Fee paid in token amount (MIST)
        fee_paid_usd: u64,     // Fee paid in USD (cents, e.g., 25 = $0.25)
        payment_method: u8,    // 0=SUI, 1=$MEWS, 2=USDC
        badge_tier: u8,        // Badge tier when merge occurred
        badge_discount: u8,    // Discount percentage applied (0-25)
        timestamp: u64,
    }
}
```

### Backend: Merge Service

```typescript
interface ItemMergeRequest {
  itemType: string;  // 'extraLives', 'forceField', etc.
  sourceLevel: number;  // 1 or 2
  targetLevel: number;  // 2 or 3
  quantity: number;  // How many merges to perform (default: 1)
  paymentMethod: 'sui' | 'mews' | 'usdc';  // Payment method
}

interface ItemMergeResult {
  success: boolean;
  itemsConsumed: number;
  itemsCreated: number;
  feePaid: number;
  newInventory: Inventory;
  error?: string;
}
```

---

## Implementation Plan

### Phase 1: Smart Contract Functions

#### 1.1 Merge Function

```move
// In item_merging.move or premium_store.move

/// Merge items (3x Level 1 → 1x Level 2, or 3x Level 2 → 1x Level 3)
/// Uses inventory system to check and update items
public entry fun merge_items(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    player: address,
    item_type: u8,
    source_level: u8,
    target_level: u8,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // 1. Get player inventory from PremiumStore
    // 2. Validate item type (must be mergeable)
    // 3. Validate merge path (L1→L2 or L2→L3)
    // 4. Check inventory has sufficient items (3x source_level)
    // 5. Validate payment amount (merge fee + badge discount)
    // 6. Remove 3x source_level items (via inventory system)
    // 7. Add 1x target_level item (via inventory system)
    // 8. Process payment
    // 9. Emit ItemsMerged event
    
    // See INVENTORY_SYSTEM_IMPLEMENTATION_PLAN.md for inventory integration details
    assert!(
        (source_level == 1 && target_level == 2) ||
        (source_level == 2 && target_level == 3) ||
        (source_level == 1 && target_level == 3),
        E_INVALID_MERGE_PATH
    );
    
    // Determine items needed
    let items_needed = if (source_level == 1 && target_level == 2) {
        3  // Standard: 3x Level 1 → 1x Level 2
    } else if (source_level == 2 && target_level == 3) {
        3  // Standard: 3x Level 2 → 1x Level 3
    } else {  // source_level == 1 && target_level == 3 (direct, skip Level 2)
        9  // Premium: 9x Level 1 → 1x Level 3 (equivalent to 3x Level 2)
    };
    
    // Note: Fee validation happens in backend before calling this function
    // Backend calculates fee in USD, applies badge discount, converts to payment token
    // Payment amount is validated against the converted fee amount
    
    // Check inventory and consume items
    let items_available = get_item_count(inventory, item_type, source_level);
    assert!(items_available >= items_needed, E_INSUFFICIENT_ITEMS);
    
    // Consume source items
    consume_items(inventory, item_type, source_level, items_needed);
    
    // Create target item
    add_item(inventory, item_type, target_level, 1);
    
    // Transfer payment to admin
    transfer::public_transfer(payment, store.admin);
    
    // Emit event
    event::emit(ItemsMerged {
        player,
        item_type,
        source_level,
        target_level,
        items_consumed: items_needed,
        items_created: 1,
        fee_paid: payment_amount,
        timestamp: current_time,
    });
}

/// Helper function to get item count
fun get_item_count(
    inventory: &PlayerInventory,
    item_type: u8,
    level: u8
): u64 {
    if (item_type == ITEM_EXTRA_LIVES) {
        if (level == 1) { inventory.extra_lives_level_1 }
        else if (level == 2) { inventory.extra_lives_level_2 }
        else { inventory.extra_lives_level_3 }
    } else if (item_type == ITEM_FORCE_FIELD) {
        if (level == 1) { inventory.force_field_level_1 }
        else if (level == 2) { inventory.force_field_level_2 }
        else { inventory.force_field_level_3 }
    } else if (item_type == ITEM_ORB_LEVEL) {
        if (level == 1) { inventory.orb_level_1 }
        else if (level == 2) { inventory.orb_level_2 }
        else { inventory.orb_level_3 }
    } else if (item_type == ITEM_SLOW_TIME) {
        if (level == 1) { inventory.slow_time_level_1 }
        else if (level == 2) { inventory.slow_time_level_2 }
        else { inventory.slow_time_level_3 }
    } else if (item_type == ITEM_COIN_TRACTOR_BEAM) {
        if (level == 1) { inventory.coin_tractor_beam_level_1 }
        else if (level == 2) { inventory.coin_tractor_beam_level_2 }
        else { inventory.coin_tractor_beam_level_3 }
    } else {
        0
    }
}

/// Helper function to consume items
fun consume_items(
    inventory: &mut PlayerInventory,
    item_type: u8,
    level: u8,
    quantity: u64
) {
    if (item_type == ITEM_EXTRA_LIVES) {
        if (level == 1) { inventory.extra_lives_level_1 = inventory.extra_lives_level_1 - quantity; }
        else if (level == 2) { inventory.extra_lives_level_2 = inventory.extra_lives_level_2 - quantity; }
        else { inventory.extra_lives_level_3 = inventory.extra_lives_level_3 - quantity; }
    }
    // ... similar for other item types
}

/// Helper function to add item
fun add_item(
    inventory: &mut PlayerInventory,
    item_type: u8,
    level: u8,
    quantity: u64
) {
    if (item_type == ITEM_EXTRA_LIVES) {
        if (level == 1) { inventory.extra_lives_level_1 = inventory.extra_lives_level_1 + quantity; }
        else if (level == 2) { inventory.extra_lives_level_2 = inventory.extra_lives_level_2 + quantity; }
        else { inventory.extra_lives_level_3 = inventory.extra_lives_level_3 + quantity; }
    }
    // ... similar for other item types
}
```

### Phase 2: Backend Service

#### 2.1 Merge Service

```typescript
// services/item-merge-service.ts

export class ItemMergeService {
  /**
   * Calculate merge fee with badge discount
   */
  async calculateMergeFee(
    sourceLevel: number,
    targetLevel: number,
    badgeTier: number,
    paymentToken: 'sui' | 'mews' | 'usdc' = 'sui'
  ): Promise<{
    feeUsd: number;
    feeInToken: number;
    feeDisplay: string;
    discountApplied: number;
  }> {
    // Base fees (in USD)
    const baseFees: Record<string, number> = {
      '1-2': 0.25,  // Level 1 → Level 2: $0.25
      '2-3': 0.50,  // Level 2 → Level 3: $0.50
      '1-3': 1.50,  // Level 1 → Level 3 (direct, skip Level 2): $1.50
    };
    
    const key = `${sourceLevel}-${targetLevel}`;
    const baseFeeUsd = baseFees[key] || 0;
    
    // Apply badge discount (same as store purchases: 0-25%)
    const badgeDiscounts = [0, 0.05, 0.10, 0.15, 0.20, 0.25];  // 0-5 (Standard to Legendary)
    const discount = badgeDiscounts[badgeTier] || 0;
    const discountedFeeUsd = baseFeeUsd * (1 - discount);
    
    // Convert to selected token (SUI/$MEWS/USDC) based on current price
    const tokenPrice = await this.getTokenPrice(paymentToken);
    const feeInToken = discountedFeeUsd / tokenPrice;
    
    return {
      feeUsd: discountedFeeUsd,
      feeInToken,
      feeDisplay: feeInToken.toFixed(6),
      discountApplied: discount * 100
    };
  }
  
  /**
   * Merge items
   */
  async mergeItems(
    playerAddress: string,
    request: ItemMergeRequest
  ): Promise<ItemMergeResult> {
    // Validate request
    if (!this.isValidMergePath(request.sourceLevel, request.targetLevel)) {
      return {
        success: false,
        itemsConsumed: 0,
        itemsCreated: 0,
        feePaid: 0,
        newInventory: {},
        error: 'Invalid merge path'
      };
    }
    
    // Check inventory
    const inventory = await this.getInventory(playerAddress);
    const itemsNeeded = request.sourceLevel === 1 && request.targetLevel === 3 ? 9 : 3;  // 9x for direct L1→L3, 3x for standard
    const itemsAvailable = this.getItemCount(inventory, request.itemType, request.sourceLevel);
    
    if (itemsAvailable < itemsNeeded * request.quantity) {
      return {
        success: false,
        itemsConsumed: 0,
        itemsCreated: 0,
        feePaid: 0,
        newInventory: {},
        error: `Insufficient items. Need ${itemsNeeded * request.quantity}, have ${itemsAvailable}`
      };
    }
    
    // Calculate fee
    const badgeTier = await this.getBadgeTier(playerAddress);
    const fee = this.calculateMergeFee(
      request.sourceLevel,
      request.targetLevel,
      badgeTier
    );
    
    // Process payment
    if (request.paymentMethod === 'sui') {
      // Player signs transaction with SUI payment
      // Backend calls merge_items() on blockchain with SUI payment
    } else if (request.paymentMethod === 'mews') {
      // Player signs transaction with $MEWS payment
      // Backend calls merge_items() on blockchain with $MEWS payment
    } else if (request.paymentMethod === 'usdc') {
      // Player signs transaction with USDC payment
      // Backend calls merge_items() on blockchain with USDC payment
    }
    
    // Perform merge on blockchain
    const result = await this.executeMergeOnChain(
      playerAddress,
      request,
      fee
    );
    
    if (result.success) {
      // Refresh inventory
      const newInventory = await this.getInventory(playerAddress);
      
      return {
        success: true,
        itemsConsumed: itemsNeeded * request.quantity,
        itemsCreated: request.quantity,
        feePaid: fee,
        newInventory
      };
    } else {
      return {
        success: false,
        itemsConsumed: 0,
        itemsCreated: 0,
        feePaid: 0,
        newInventory: {},
        error: result.error
      };
    }
  }
  
  /**
   * Check if merge path is valid
   */
  private isValidMergePath(sourceLevel: number, targetLevel: number): boolean {
    return (
      (sourceLevel === 1 && targetLevel === 2) ||
      (sourceLevel === 2 && targetLevel === 3) ||
      (sourceLevel === 1 && targetLevel === 3)
    );
  }
  
  /**
   * Get items needed for merge
   */
  getItemsNeeded(sourceLevel: number, targetLevel: number): number {
    if (sourceLevel === 1 && targetLevel === 3) {
      return 9;  // Direct merge (skip Level 2) - requires 9x Level 1 items
    }
    return 3;  // Standard merge (3x Level 1 → Level 2, or 3x Level 2 → Level 3)
  }
}
```

#### 2.2 API Endpoints

```typescript
// routes/item-merge.ts

// POST /api/items/merge
router.post('/merge', async (req, res) => {
  const { playerAddress, itemType, sourceLevel, targetLevel, quantity, paymentMethod } = req.body;
  
  const result = await itemMergeService.mergeItems(playerAddress, {
    itemType,
    sourceLevel,
    targetLevel,
    quantity: quantity || 1,
    paymentMethod: paymentMethod || 'sui'
  });
  
  res.json(result);
});

// GET /api/items/merge/fee
router.get('/merge/fee', async (req, res) => {
  const { sourceLevel, targetLevel, badgeTier } = req.query;
  
  const fee = itemMergeService.calculateMergeFee(
    parseInt(sourceLevel),
    parseInt(targetLevel),
    parseInt(badgeTier)
  );
  
  res.json({ fee, feeInSui: fee, feeInUsd: fee * await getSuiPrice() });
});
```

### Phase 3: Frontend UI

#### 3.1 Item Merge Modal

```typescript
// components/ItemMergeModal.tsx

interface ItemMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: string;
  inventory: Inventory;
  badgeTier: number;
}

export const ItemMergeModal: React.FC<ItemMergeModalProps> = ({
  isOpen,
  onClose,
  itemType,
  inventory,
  badgeTier
}) => {
  const [sourceLevel, setSourceLevel] = useState<1 | 2>(1);
  const [targetLevel, setTargetLevel] = useState<2 | 3>(2);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'sui' | 'mews' | 'usdc'>('sui');
  const [fee, setFee] = useState(0);
  
  // Calculate available merges
  const itemsNeeded = sourceLevel === 1 && targetLevel === 3 ? 9 : 3;
  const itemsAvailable = getItemCount(inventory, itemType, sourceLevel);
  const maxMerges = Math.floor(itemsAvailable / itemsNeeded);
  
  // Calculate fee
  useEffect(() => {
    calculateFee(sourceLevel, targetLevel, badgeTier).then(setFee);
  }, [sourceLevel, targetLevel, badgeTier]);
  
  const handleMerge = async () => {
    const result = await mergeItems({
      itemType,
      sourceLevel,
      targetLevel,
      quantity,
      paymentMethod
    });
    
    if (result.success) {
      // Show success message
      // Refresh inventory
      onClose();
    } else {
      // Show error
      alert(result.error);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="item-merge-modal">
        <h2>🔧 Merge Items</h2>
        
        <div className="merge-preview">
          <div className="source-items">
            <span className="count">{itemsNeeded * quantity}x</span>
            <span className="item">{getItemName(itemType)} Level {sourceLevel}</span>
          </div>
          
          <div className="arrow">→</div>
          
          <div className="target-items">
            <span className="count">{quantity}x</span>
            <span className="item">{getItemName(itemType)} Level {targetLevel}</span>
          </div>
        </div>
        
        <div className="merge-options">
          <label>
            Merge Path:
            <select 
              value={`${sourceLevel}-${targetLevel}`}
              onChange={(e) => {
                const [src, tgt] = e.target.value.split('-').map(Number);
                setSourceLevel(src as 1 | 2);
                setTargetLevel(tgt as 2 | 3);
              }}
            >
              <option value="1-2">Level 1 → Level 2 (3 items, $0.25)</option>
              <option value="2-3">Level 2 → Level 3 (3 items, $0.50)</option>
              <option value="1-3">Level 1 → Level 3 (9 items, $1.50, direct)</option>
            </select>
          </label>
          
          <label>
            Quantity:
            <input
              type="number"
              min={1}
              max={maxMerges}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
            />
            <span className="hint">Max: {maxMerges} merges</span>
          </label>
          
          <label>
            Payment Method:
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'sui' | 'mews' | 'usdc')}
            >
              <option value="sui">SUI</option>
              <option value="mews">$MEWS</option>
              <option value="usdc">USDC</option>
            </select>
          </label>
        </div>
        
        <div className="fee-display">
          <div className="fee-amount">
            Fee: {fee.toFixed(4)} SUI
            {badgeTier >= 2 && (
              <span className="discount">({getBadgeDiscount(badgeTier)}% discount applied)</span>
            )}
          </div>
          <div className="fee-breakdown">
            Base: {baseFee.toFixed(4)} SUI
            {badgeTier >= 2 && (
              <> - Discount: {(baseFee * getBadgeDiscount(badgeTier) / 100).toFixed(4)} SUI</>
            )}
          </div>
        </div>
        
        <div className="inventory-check">
          <div className="available">
            Available: {itemsAvailable}x Level {sourceLevel}
          </div>
          <div className="needed">
            Needed: {itemsNeeded * quantity}x Level {sourceLevel}
          </div>
          {itemsAvailable < itemsNeeded * quantity && (
            <div className="error">❌ Insufficient items</div>
          )}
        </div>
        
        <button
          onClick={handleMerge}
          disabled={itemsAvailable < itemsNeeded * quantity || quantity < 1}
          className="merge-button"
        >
          Merge Items
        </button>
      </div>
    </Modal>
  );
};
```

#### 3.2 Merge Button in Store/Inventory

```typescript
// Add "Merge" button next to items in inventory
// When clicked, opens ItemMergeModal with that item type pre-selected
```

---

## Daily Login Rewards (Item-Focused)

### Reward Structure

**Note:** This matches MONETIZATION_STRATEGY.md and DAILY_LOGIN_REWARD_SYSTEM_PLAN.md

#### Daily Login Rewards (Per Day)
- **Day 1:** 1x Orb Level (Level 1)
- **Day 2:** 1x Force Field (Level 1)
- **Day 3:** 1x Extra Lives (Level 1)
- **Day 4:** 1x Slow Time (Level 1)
- **Day 5:** 1x Coin Tractor Beam (Level 1)
- **Day 6:** 1x Orb Level (Level 1) + 1x Force Field (Level 1)
- **Day 7:** 1x Extra Lives (Level 1) + 1x Slow Time (Level 1) OR 1x Coin Tractor Beam (Level 1) - alternates weekly

#### Weekly Bonus (7-Day Streak)
- **7 Days:** Same as Day 7 reward (1x Extra Lives Level 1 + alternating Slow Time/Coin Tractor Beam)

#### Monthly Bonus (30-Day Streak)
- **30 Days:** 1x Extra Lives (Level 3) + 1x Force Field (Level 3) + 1x Orb Level (Level 2) + 1x Slow Time (Level 2) + 1x Coin Tractor Beam (Level 2)

### Rationale
- **Items are more valuable** than credits (can be used immediately)
- **Variety** - Different items each day keeps it interesting
- **Progression** - Higher levels on later days
- **Merge incentive** - Lower level items can be merged into higher levels
- **Sustainable** - Items are digital, no cost to create

---

## Merge Statistics Tracking

### What to Track

#### Basic Merge Data
- **Item Type** - Which item was merged (Extra Lives, Force Field, etc.)
- **Source Level** - Level of items being merged (1 or 2)
- **Target Level** - Level of resulting item (2 or 3)
- **Items Consumed** - Number of items consumed (3 or 9)
- **Items Created** - Always 1
- **Fee Paid** - Merge fee amount (in USD and token)
- **Payment Method** - SUI, $MEWS, or USDC
- **Badge Discount** - Discount percentage applied
- **Timestamp** - When merge occurred
- **Player Address** - Who performed the merge

#### Merge Patterns
- **Merge Frequency** - How often players merge items
- **Preferred Merge Path** - L1→L2→L3 vs. direct L1→L3
- **Item Type Preferences** - Which items are merged most often
- **Payment Method Preferences** - Which payment method is most popular
- **Badge Tier Distribution** - Which badge tiers merge most often

#### Economic Metrics
- **Total Merges** - Total number of merges performed
- **Total Revenue** - Total fees collected from merges
- **Average Fee** - Average fee per merge
- **Revenue by Item Type** - Revenue per item type
- **Revenue by Merge Path** - Revenue per merge path

### Data Structure

#### On-Chain: ItemsMerged Event (Already Defined)

The existing `ItemsMerged` event captures:
```move
struct ItemsMerged has copy, drop {
    player: address,
    item_type: u8,
    source_level: u8,      // Level of items being merged (1 or 2)
    target_level: u8,      // Level of resulting item (2 or 3)
    items_consumed: u64,   // Number of items consumed (3 or 9)
    items_created: u64,    // Always 1
    fee_paid: u64,         // Fee paid in token amount
    timestamp: u64,
}
```

#### Backend: Merge Statistics Service

```typescript
interface MergeStatistics {
  // Per-player statistics
  playerStats: {
    totalMerges: number;
    totalFeesPaid: number;
    averageFee: number;
    mergesByItemType: {
      [itemType: string]: number;
    };
    mergesByPath: {
      '1-2': number;  // Level 1 → Level 2
      '2-3': number;  // Level 2 → Level 3
      '1-3': number;  // Direct Level 1 → Level 3
    };
    paymentMethodDistribution: {
      sui: number;
      mews: number;
      usdc: number;
    };
    badgeDiscountUsage: {
      [tier: number]: number;  // Merges per badge tier
    };
  };
  
  // Global statistics
  globalStats: {
    totalMerges: number;
    totalRevenue: number;
    averageFee: number;
    mostMergedItem: string;
    mostPopularPath: string;
    mostPopularPaymentMethod: string;
  };
  
  // Trends
  trends: {
    mergesPerDay: Array<{ date: string; count: number }>;
    revenuePerDay: Array<{ date: string; amount: number }>;
    itemTypeTrends: {
      [itemType: string]: Array<{ date: string; count: number }>;
    };
  };
}
```

### Implementation Plan

#### Phase 1: Event Tracking (Already Implemented)
- ✅ `ItemsMerged` event emitted on-chain
- ✅ Event includes all necessary data

#### Phase 2: Backend Statistics Service

```typescript
// services/merge-stats-service.ts

export class MergeStatsService {
  /**
   * Get player merge statistics
   */
  async getPlayerMergeStats(playerAddress: string): Promise<MergeStatistics['playerStats']> {
    // Query on-chain events for player
    const events = await this.queryMergeEvents(playerAddress);
    
    return {
      totalMerges: events.length,
      totalFeesPaid: events.reduce((sum, e) => sum + e.fee_paid, 0),
      averageFee: events.length > 0 
        ? events.reduce((sum, e) => sum + e.fee_paid, 0) / events.length 
        : 0,
      mergesByItemType: this.groupByItemType(events),
      mergesByPath: this.groupByPath(events),
      paymentMethodDistribution: await this.getPaymentMethodDistribution(events),
      badgeDiscountUsage: await this.getBadgeDiscountUsage(events)
    };
  }
  
  /**
   * Get global merge statistics
   */
  async getGlobalMergeStats(): Promise<MergeStatistics['globalStats']> {
    // Query all merge events
    const allEvents = await this.queryAllMergeEvents();
    
    return {
      totalMerges: allEvents.length,
      totalRevenue: allEvents.reduce((sum, e) => sum + e.fee_paid, 0),
      averageFee: allEvents.length > 0
        ? allEvents.reduce((sum, e) => sum + e.fee_paid, 0) / allEvents.length
        : 0,
      mostMergedItem: this.getMostMergedItem(allEvents),
      mostPopularPath: this.getMostPopularPath(allEvents),
      mostPopularPaymentMethod: await this.getMostPopularPaymentMethod(allEvents)
    };
  }
  
  /**
   * Query merge events from blockchain
   */
  private async queryMergeEvents(playerAddress?: string): Promise<ItemsMergedEvent[]> {
    // Query Sui events for ItemsMerged
    // Filter by player address if provided
  }
}
```

#### Phase 3: API Endpoints

```typescript
// routes/item-merge.ts

// GET /api/items/merge/stats/:address
router.get('/merge/stats/:address', async (req, res) => {
  const { address } = req.params;
  const stats = await mergeStatsService.getPlayerMergeStats(address);
  res.json(stats);
});

// GET /api/items/merge/stats/global
router.get('/merge/stats/global', async (req, res) => {
  const stats = await mergeStatsService.getGlobalMergeStats();
  res.json(stats);
});
```

### Statistics Use Cases

#### 1. Revenue Analysis
- **Total revenue from merges** - Track merge system profitability
- **Revenue trends** - Are merges increasing or decreasing?
- **Revenue by item type** - Which items generate most revenue?

#### 2. Player Behavior
- **Merge frequency** - How often do players merge?
- **Preferred merge paths** - Do players prefer standard or direct merges?
- **Payment method preferences** - Which payment method is most popular?

#### 3. System Optimization
- **Most merged items** - Which items are merged most often?
- **Merge path popularity** - Is direct merge (L1→L3) popular?
- **Badge discount impact** - Do discounts increase merge frequency?

#### 4. Economic Insights
- **Average fee per merge** - Is pricing appropriate?
- **Revenue per player** - How much revenue per merging player?
- **Merge-to-purchase ratio** - How many merges vs. direct purchases?

### Database Schema (Optional - for faster queries)

```sql
CREATE TABLE merge_statistics (
  id SERIAL PRIMARY KEY,
  player_address VARCHAR(66) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  source_level INT NOT NULL,
  target_level INT NOT NULL,
  items_consumed INT NOT NULL,
  fee_paid_usd DECIMAL(10, 2) NOT NULL,
  fee_paid_token DECIMAL(18, 8) NOT NULL,
  payment_method VARCHAR(10) NOT NULL,
  badge_tier INT,
  badge_discount DECIMAL(5, 2),
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_merge_stats_player ON merge_statistics(player_address);
CREATE INDEX idx_merge_stats_item_type ON merge_statistics(item_type);
CREATE INDEX idx_merge_stats_timestamp ON merge_statistics(timestamp);
```

### Implementation Timeline

- **Phase 1:** ✅ Already implemented (on-chain events)
- **Phase 2:** Backend statistics service (Week 1)
- **Phase 3:** API endpoints (Week 1)
- **Phase 4:** Optional database for faster queries (Week 2)
- **Phase 5:** Admin dashboard (Week 3)

---

## Benefits

### Item Merging System
- **Value for unused items** - Players can upgrade lower-level items
- **Additional revenue stream** - Merge fees generate income
- **Inventory management** - Players can consolidate items
- **Player progression** - Upgrade path for items
- **Engagement** - Another system to interact with

### Item-Focused Daily Rewards
- **More valuable** - Items are more useful than credits
- **Variety** - Different items each day
- **Merge synergy** - Lower level items can be merged
- **Progression** - Higher levels on later days
- **Sustainable** - Digital items, no cost

---

## Implementation Timeline

### Week 1: Item Merging System
- Smart contract functions
- Backend service
- API endpoints

### Week 2: Frontend UI
- Merge modal component
- Inventory integration
- Payment flow

### Week 3: Daily Login Rewards (Updated)
- Update reward structure (items instead of credits)
- Update backend service
- Update frontend UI

### Week 4: Testing & Polish
- Test merge functionality
- Test daily login rewards
- UI/UX polish
- Analytics integration

---

## Next Steps

1. **Review merge ratios** - Confirm 3:1 ratio is good
2. **Review merge fees** - Confirm fee structure
3. **Review daily rewards** - Confirm item-focused rewards
4. **Implement merging** - Start with smart contract
5. **Update daily login** - Switch to item rewards


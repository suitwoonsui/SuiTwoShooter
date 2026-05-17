# Inventory System Implementation Plan

## Overview

Comprehensive inventory system for managing player items on-chain, integrated with the merge system, reward distribution, and item consumption. The inventory system serves as the central hub for all item-related operations.

---

## Current State

### Existing Infrastructure

**Smart Contract:** `premium_store.move`
- `PlayerInventory` struct already exists
- Tracks item quantities per player
- Supports all item types and levels
- Events for purchases and consumption

**Frontend:** `inventory-manager.js`
- LocalStorage-based inventory management
- Basic add/remove functions
- Not yet integrated with blockchain

---

## System Architecture

### On-Chain Inventory (Source of Truth)

**Location:** `contracts/suitwo_game/sources/premium_store.move`

```move
/// Player inventory - stores all items for a player
struct PlayerInventory has key, store {
    id: UID,
    player: address,
    
    // Extra Lives (3 levels)
    extra_lives_level_1: u64,
    extra_lives_level_2: u64,
    extra_lives_level_3: u64,
    
    // Force Field Start (3 levels)
    force_field_level_1: u64,
    force_field_level_2: u64,
    force_field_level_3: u64,
    
    // Orb Level Start (3 levels)
    orb_level_1: u64,
    orb_level_2: u64,
    orb_level_3: u64,
    
    // Slow Time Power (3 levels)
    slow_time_level_1: u64,
    slow_time_level_2: u64,
    slow_time_level_3: u64,
    
    // Coin Tractor Beam (3 levels)
    coin_tractor_beam_level_1: u64,
    coin_tractor_beam_level_2: u64,
    coin_tractor_beam_level_3: u64,
    
    // Destroy All Enemies (single level)
    destroy_all_enemies: u64,
    
    // Boss Kill Shot (single level)
    boss_kill_shot: u64,
}
```

### Key Functions Needed

```move
/// Get player inventory (view function)
public fun get_inventory(
    store: &PremiumStore,
    player: address
): &PlayerInventory {
    // Return player's inventory object
}

/// Add items to inventory (for purchases, rewards, etc.)
public entry fun add_items(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    player: address,
    item_type: u8,
    item_level: u8,
    quantity: u64,
    ctx: &mut TxContext
) {
    // Get or create inventory
    // Add items
    // Emit InventoryUpdated event
}

/// Remove items from inventory (for consumption, merging, etc.)
public entry fun remove_items(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    player: address,
    item_type: u8,
    item_level: u8,
    quantity: u64,
    ctx: &mut TxContext
) {
    // Get inventory
    // Validate sufficient quantity
    // Remove items
    // Emit InventoryUpdated event
}

/// Transfer items between inventories (for trading, if needed in future)
public entry fun transfer_items(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    from_player: address,
    to_player: address,
    item_type: u8,
    item_level: u8,
    quantity: u64,
    ctx: &mut TxContext
) {
    // Remove from source
    // Add to destination
    // Emit transfer events
}

/// Get item count (view function)
public fun get_item_count(
    inventory: &PlayerInventory,
    item_type: u8,
    item_level: u8
): u64 {
    // Return quantity of specific item
}

/// Get all items (view function - for frontend display)
public fun get_all_items(
    inventory: &PlayerInventory
): vector<(u8, u8, u64)> {
    // Return all items with quantities > 0
    // Format: (item_type, item_level, quantity)
}
```

---

## Integration with Merge System

### Merge System Requirements

The merge system needs to:
1. **Check inventory** - Verify player has enough items to merge
2. **Remove source items** - Deduct lower-level items
3. **Add result item** - Add higher-level item
4. **Process payment** - Collect merge fee

### Merge Function Integration

```move
module suitwo_game::item_merging {
    use suitwo_game::premium_store::{Self, PremiumStore, PlayerInventory, AdminCapability};
    
    /// Merge items (3:1 ratio)
    public entry fun merge_items(
        admin_cap: &AdminCapability,
        store: &mut PremiumStore,
        player: address,
        item_type: u8,
        source_level: u8,
        target_level: u8,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // 1. Validate merge (3:1 ratio, valid item type, valid levels)
        // 2. Check inventory has 3x source_level items
        // 3. Validate payment amount (merge fee + badge discount)
        // 4. Remove 3x source_level items from inventory
        // 5. Add 1x target_level item to inventory
        // 6. Process payment
        // 7. Emit ItemMerged event
    }
    
    /// Direct merge (5x L1 → 1x L3)
    public entry fun merge_items_direct(
        admin_cap: &AdminCapability,
        store: &mut PremiumStore,
        player: address,
        item_type: u8,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Similar to merge_items but 5:1 ratio
    }
}
```

### Inventory Checks for Merging

```move
/// Check if player can merge items
public fun can_merge(
    inventory: &PlayerInventory,
    item_type: u8,
    source_level: u8,
    target_level: u8,
    ratio: u64  // 3 for 3:1, 5 for 5:1
): bool {
    let source_count = get_item_count(inventory, item_type, source_level);
    return source_count >= ratio;
}

/// Get mergeable items (for UI display)
public fun get_mergeable_items(
    inventory: &PlayerInventory,
    item_type: u8
): vector<(u8, u64)> {
    // Return list of (level, quantity) that can be merged
    // Example: If player has 5x L1, return [(1, 5)] (can do 1x 3:1 merge)
}
```

---

## Integration with Reward Systems

### Tournament Rewards

```move
/// Add tournament reward items to inventory
public entry fun add_tournament_rewards(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    player: address,
    rewards: vector<TournamentItemReward>,
    ctx: &mut TxContext
) {
    // For each reward item:
    // - Add to player inventory
    // - Emit InventoryUpdated event
}
```

### Achievement Rewards

```move
/// Add achievement reward items to inventory
public entry fun add_achievement_rewards(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    player: address,
    rewards: vector<AchievementItemReward>,
    ctx: &mut TxContext
) {
    // Batch add items from achievement rewards
}
```

### Daily Login Rewards

```move
/// Add daily login reward items to inventory
public entry fun add_daily_login_rewards(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    player: address,
    reward: DailyLoginReward,
    ctx: &mut TxContext
) {
    // Add items from daily login reward
}
```

---

## Frontend Integration

### Inventory Service

**File:** `src/services/inventory-service.ts`

```typescript
import { SuiClient } from '@mysten/sui.js/client';

export interface InventoryItem {
  itemType: string;
  level: number;
  quantity: number;
}

export interface PlayerInventory {
  playerAddress: string;
  items: InventoryItem[];
  lastUpdated: number;
}

export class InventoryService {
  private suiClient: SuiClient;
  private premiumStoreObjectId: string;
  
  /**
   * Get player inventory from blockchain
   */
  async getInventory(playerAddress: string): Promise<PlayerInventory> {
    // Query blockchain for PlayerInventory object
    // Parse and return formatted inventory
  }
  
  /**
   * Get item count for specific item
   */
  async getItemCount(
    playerAddress: string,
    itemType: string,
    level: number
  ): Promise<number> {
    const inventory = await this.getInventory(playerAddress);
    const item = inventory.items.find(
      i => i.itemType === itemType && i.level === level
    );
    return item?.quantity || 0;
  }
  
  /**
   * Check if player can merge items
   */
  async canMerge(
    playerAddress: string,
    itemType: string,
    sourceLevel: number,
    targetLevel: number,
    ratio: number = 3
  ): Promise<boolean> {
    const count = await this.getItemCount(playerAddress, itemType, sourceLevel);
    return count >= ratio;
  }
  
  /**
   * Get mergeable items (for UI)
   */
  async getMergeableItems(
    playerAddress: string,
    itemType: string
  ): Promise<Array<{ level: number; quantity: number; canMerge: boolean }>> {
    const inventory = await this.getInventory(playerAddress);
    const items = inventory.items.filter(i => i.itemType === itemType);
    
    return items.map(item => ({
      level: item.level,
      quantity: item.quantity,
      canMerge: item.quantity >= 3  // Can merge if 3+ items
    }));
  }
  
  /**
   * Refresh inventory (query blockchain)
   */
  async refreshInventory(playerAddress: string): Promise<PlayerInventory> {
    // Query latest from blockchain
    // Update local cache
    return this.getInventory(playerAddress);
  }
}
```

### Inventory UI Component

**File:** `src/components/inventory/InventoryDisplay.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { InventoryService, PlayerInventory } from '../../services/inventory-service';
import { MergeModal } from './MergeModal';

export const InventoryDisplay: React.FC<{ playerAddress: string }> = ({ playerAddress }) => {
  const [inventory, setInventory] = useState<PlayerInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{ type: string; level: number } | null>(null);
  
  useEffect(() => {
    loadInventory();
  }, [playerAddress]);
  
  const loadInventory = async () => {
    setLoading(true);
    const inv = await inventoryService.getInventory(playerAddress);
    setInventory(inv);
    setLoading(false);
  };
  
  const handleMerge = (itemType: string, level: number) => {
    setSelectedItem({ type: itemType, level });
  };
  
  if (loading) {
    return <div>Loading inventory...</div>;
  }
  
  return (
    <div className="inventory-display">
      <h2>Your Inventory</h2>
      
      {inventory?.items.map(item => (
        <div key={`${item.itemType}_${item.level}`} className="inventory-item">
          <span>{getItemName(item.itemType)} Level {item.level}</span>
          <span>Quantity: {item.quantity}</span>
          {item.quantity >= 3 && item.level < 3 && (
            <button onClick={() => handleMerge(item.itemType, item.level)}>
              Merge (3 → 1)
            </button>
          )}
        </div>
      ))}
      
      {selectedItem && (
        <MergeModal
          itemType={selectedItem.type}
          sourceLevel={selectedItem.level}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => {
            loadInventory(); // Refresh after merge
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};
```

### Merge Modal Component

**File:** `src/components/inventory/MergeModal.tsx`

```typescript
import React, { useState } from 'react';
import { mergeItems } from '../../services/merge-service';

interface MergeModalProps {
  itemType: string;
  sourceLevel: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  itemType,
  sourceLevel,
  onClose,
  onSuccess
}) => {
  const [merging, setMerging] = useState(false);
  const targetLevel = sourceLevel + 1;
  const mergeFee = getMergeFee(sourceLevel, targetLevel);
  
  const handleMerge = async () => {
    setMerging(true);
    try {
      await mergeItems(itemType, sourceLevel, targetLevel, mergeFee);
      onSuccess();
    } catch (error) {
      console.error('Merge failed:', error);
      // Show error message
    } finally {
      setMerging(false);
    }
  };
  
  return (
    <div className="merge-modal overlay">
      <div className="modal-content">
        <h3>Merge Items</h3>
        <p>Merge 3x {getItemName(itemType)} Level {sourceLevel}</p>
        <p>→ 1x {getItemName(itemType)} Level {targetLevel}</p>
        <p>Fee: {formatSUI(mergeFee)} SUI</p>
        
        <div className="merge-actions">
          <button onClick={handleMerge} disabled={merging}>
            {merging ? 'Merging...' : 'Confirm Merge'}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
```

---

## Backend Service Integration

### Inventory API Endpoints

**File:** `backend/src/routes/inventory.ts`

```typescript
import express from 'express';
import { InventoryService } from '../services/inventory-service';

const router = express.Router();
const inventoryService = new InventoryService();

/**
 * GET /api/inventory/:playerAddress
 * Get player inventory
 */
router.get('/:playerAddress', async (req, res) => {
  try {
    const inventory = await inventoryService.getInventory(req.params.playerAddress);
    res.json({ inventory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/inventory/:playerAddress/item/:itemType/:level
 * Get specific item count
 */
router.get('/:playerAddress/item/:itemType/:level', async (req, res) => {
  try {
    const count = await inventoryService.getItemCount(
      req.params.playerAddress,
      req.params.itemType,
      parseInt(req.params.level)
    );
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/inventory/:playerAddress/mergeable/:itemType
 * Get mergeable items for UI
 */
router.get('/:playerAddress/mergeable/:itemType', async (req, res) => {
  try {
    const mergeable = await inventoryService.getMergeableItems(
      req.params.playerAddress,
      req.params.itemType
    );
    res.json({ mergeable });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Integration Points

### 1. Item Purchase Flow

```
Player purchases item
  ↓
Backend processes payment
  ↓
Backend calls add_items() on smart contract
  ↓
Inventory updated on-chain
  ↓
Frontend refreshes inventory display
```

### 2. Item Consumption Flow

```
Player uses item in game
  ↓
Frontend calls consume_item() API
  ↓
Backend calls remove_items() on smart contract
  ↓
Inventory updated on-chain
  ↓
Frontend refreshes inventory display
```

### 3. Item Merge Flow

```
Player clicks "Merge" button
  ↓
Frontend checks can_merge() via API
  ↓
Player confirms merge and pays fee
  ↓
Backend calls merge_items() on smart contract
  ↓
Smart contract:
  - Validates inventory
  - Removes 3x source items
  - Adds 1x target item
  - Processes payment
  ↓
Inventory updated on-chain
  ↓
Frontend refreshes inventory display
```

### 4. Reward Distribution Flow

```
Tournament/Achievement/Daily Login reward
  ↓
Backend calls add_items() for each reward item
  ↓
Inventory updated on-chain
  ↓
Player sees notification
  ↓
Player views inventory (items already there)
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  Smart Contract │
│  (PremiumStore) │
│                 │
│ PlayerInventory │
└────────┬────────┘
         │
         │ (read/write)
         │
┌────────▼────────┐
│  Backend API    │
│                 │
│ - getInventory  │
│ - addItems      │
│ - removeItems   │
│ - mergeItems    │
└────────┬────────┘
         │
         │ (HTTP requests)
         │
┌────────▼────────┐
│  Frontend UI    │
│                 │
│ - InventoryView │
│ - MergeModal    │
│ - ItemDisplay   │
└─────────────────┘
```

---

## Smart Contract Enhancements

### Additional Helper Functions

```move
/// Batch add items (for reward distribution)
public entry fun batch_add_items(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    player: address,
    items: vector<(u8, u8, u64)>,  // (item_type, item_level, quantity)
    ctx: &mut TxContext
) {
    // Add multiple items in one transaction
    // More efficient than individual calls
}

/// Batch remove items (for consumption)
public entry fun batch_remove_items(
    admin_cap: &AdminCapability,
    store: &mut PremiumStore,
    player: address,
    items: vector<(u8, u8, u64)>,
    ctx: &mut TxContext
) {
    // Remove multiple items in one transaction
}

/// Get total item value (for analytics)
public fun get_total_item_value(
    inventory: &PlayerInventory
): u64 {
    // Calculate total USD value of all items
    // Useful for analytics and player value calculation
}

/// Check if inventory is empty
public fun is_inventory_empty(
    inventory: &PlayerInventory
): bool {
    // Return true if player has no items
}
```

---

## Frontend Caching Strategy

### Local Cache with Blockchain Sync

```typescript
class InventoryCache {
  private cache: Map<string, { inventory: PlayerInventory; timestamp: number }> = new Map();
  private CACHE_TTL = 30_000; // 30 seconds
  
  /**
   * Get inventory (from cache or blockchain)
   */
  async getInventory(playerAddress: string, forceRefresh = false): Promise<PlayerInventory> {
    const cached = this.cache.get(playerAddress);
    const now = Date.now();
    
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.inventory;
    }
    
    // Fetch from blockchain
    const inventory = await inventoryService.getInventory(playerAddress);
    this.cache.set(playerAddress, { inventory, timestamp: now });
    return inventory;
  }
  
  /**
   * Invalidate cache (after item changes)
   */
  invalidate(playerAddress: string) {
    this.cache.delete(playerAddress);
  }
  
  /**
   * Optimistic update (update cache before blockchain confirms)
   */
  optimisticUpdate(
    playerAddress: string,
    itemType: string,
    level: number,
    quantityChange: number
  ) {
    const cached = this.cache.get(playerAddress);
    if (cached) {
      // Update cache optimistically
      const item = cached.inventory.items.find(
        i => i.itemType === itemType && i.level === level
      );
      if (item) {
        item.quantity += quantityChange;
      } else if (quantityChange > 0) {
        cached.inventory.items.push({ itemType, level, quantity: quantityChange });
      }
      this.cache.set(playerAddress, { ...cached, timestamp: Date.now() });
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

- Test inventory add/remove functions
- Test merge validation
- Test batch operations
- Test edge cases (empty inventory, insufficient items)

### Integration Tests

- Test purchase → inventory update
- Test consumption → inventory update
- Test merge → inventory update
- Test reward distribution → inventory update

### End-to-End Tests

- Complete purchase flow
- Complete merge flow
- Complete reward claim flow
- Inventory display and refresh

---

## Implementation Timeline

### Week 1: Smart Contract Enhancements
- Add helper functions (batch operations, merge checks)
- Add merge integration functions
- Test contract functions

### Week 2: Backend Service
- Create inventory service
- Add API endpoints
- Integrate with merge system
- Test API endpoints

### Week 3: Frontend Integration
- Create inventory service (TypeScript)
- Build inventory display component
- Build merge modal component
- Integrate with existing UI

### Week 4: Testing & Polish
- Integration testing
- UI/UX polish
- Performance optimization
- Documentation

---

## Success Criteria

- ✅ Players can view their inventory
- ✅ Inventory updates in real-time after purchases/consumption
- ✅ Merge system can check and update inventory
- ✅ Reward systems can add items to inventory
- ✅ Inventory queries are fast (< 1 second)
- ✅ Optimistic updates work smoothly
- ✅ All item types and levels supported

---

## Future Enhancements

1. **Inventory Filters** - Filter by item type, level, mergeable
2. **Inventory Search** - Search for specific items
3. **Bulk Operations** - Merge multiple items at once
4. **Inventory History** - Track item changes over time
5. **Trading System** - Transfer items between players (if needed)
6. **Inventory Analytics** - Show total value, most used items, etc.

---

## Related Documents

- `ITEM_MERGING_UPGRADE_SYSTEM_PLAN.md` - Merge system design
- `GAME_PASS_AND_PAYWALL_IMPLEMENTATION_PLAN.md` - Payment system
- `WEEKLY_TOURNAMENT_IMPLEMENTATION_PLAN.md` - Tournament rewards
- `ACHIEVEMENT_REWARD_IMPLEMENTATION_PLAN.md` - Achievement rewards
- `DAILY_LOGIN_REWARD_SYSTEM_PLAN.md` - Daily login rewards


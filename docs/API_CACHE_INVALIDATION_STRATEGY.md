# API Cache Invalidation Strategy - Ensuring Cache Accuracy

## 🎯 The Challenge

When blockchain state changes (badge upgrade, purchase, item consumption), we need to ensure the cache reflects the new state. Since blockchain transactions take time to be indexed, we need a multi-layered invalidation strategy.

---

## ✅ Current State

### What Already Works

1. **BadgeService Cache Clearing** ✅
   - `window.BadgeService.clearBadgeCache()` is called after badge transactions
   - Clears badge cache immediately after transaction
   - Clears again after waiting for indexing

2. **Store Purchase Reload** ✅
   - Inventory is reloaded after purchase completes
   - Balance is refreshed after purchase

3. **Transaction Completion Hooks** ✅
   - Badge upgrade: Clears cache after transaction
   - Badge mint: Clears cache after transaction
   - Badge migration: Clears cache after transaction

---

## 🔧 Proposed Cache Invalidation Strategy

### 1. **Event-Driven Invalidation** (Primary Method)

Invalidate cache immediately when transactions complete, before waiting for indexing.

#### Implementation Pattern

```javascript
// After transaction completes successfully
async function onTransactionComplete(transactionType, walletAddress) {
  // Immediately invalidate relevant cache entries
  apiCache.invalidateByPattern(`${transactionType}:${walletAddress}`);
  
  // Also invalidate related data
  switch (transactionType) {
    case 'badge_upgrade':
    case 'badge_mint':
    case 'badge_migration':
      apiCache.invalidate(`badge:${walletAddress}`);
      apiCache.invalidate(`stats:${walletAddress}`); // Stats may have changed
      break;
      
    case 'store_purchase':
      apiCache.invalidate(`inventory:${walletAddress}`);
      apiCache.invalidate(`balance:${walletAddress}`);
      // Store items don't change, so don't invalidate
      break;
      
    case 'item_consume':
      apiCache.invalidate(`inventory:${walletAddress}`);
      // Stats may have changed (games played, etc.)
      apiCache.invalidate(`stats:${walletAddress}`);
      break;
  }
}
```

#### Integration Points

**Badge Upgrade** (`badge-ui-upgrade.js`):
```javascript
// After transaction succeeds
if (txResult.success) {
  // Invalidate cache immediately
  if (window.apiCache) {
    window.apiCache.invalidate(`badge:${walletAddress}`);
    window.apiCache.invalidate(`stats:${walletAddress}`);
  }
  
  // Clear BadgeService cache (existing)
  window.BadgeService.clearBadgeCache();
  
  // Wait for indexing...
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Force refresh (bypasses cache)
  const freshBadge = await window.BadgeService.getBadge(walletAddress, { bypassCache: true });
}
```

**Store Purchase** (`store-purchase-flow.js`):
```javascript
// After purchase completes
if (confirmed) {
  // Invalidate cache immediately
  if (window.apiCache) {
    window.apiCache.invalidate(`inventory:${walletAddress}`);
    window.apiCache.invalidate(`balance:${walletAddress}`);
  }
  
  // Reload data (will fetch fresh, bypassing cache)
  await loadInventoryDisplay();
  await updateStoreBalance();
}
```

**Item Consumption** (`item-consumption.js`):
```javascript
// After items are consumed
if (result.success) {
  // Invalidate cache immediately
  if (window.apiCache) {
    window.apiCache.invalidate(`inventory:${walletAddress}`);
    window.apiCache.invalidate(`stats:${walletAddress}`);
  }
  
  // Reload inventory
  await loadInventoryDisplay();
}
```

---

### 2. **Transaction Digest Tracking** (Verification Method)

Track transaction digests and verify cache freshness against blockchain state.

#### Implementation

```javascript
class ApiRequestCache {
  constructor() {
    this.cache = new Map();
    this.transactionDigests = new Map(); // walletAddress → [digest1, digest2, ...]
  }
  
  /**
   * Record a transaction digest for a wallet
   */
  recordTransaction(walletAddress, digest, transactionType) {
    if (!this.transactionDigests.has(walletAddress)) {
      this.transactionDigests.set(walletAddress, []);
    }
    
    this.transactionDigests.get(walletAddress).push({
      digest,
      type: transactionType,
      timestamp: Date.now()
    });
    
    // Invalidate relevant cache entries
    this.invalidateByTransaction(transactionType, walletAddress);
  }
  
  /**
   * Check if cache is stale based on recent transactions
   */
  isCacheStale(key, walletAddress) {
    const cached = this.cache.get(key);
    if (!cached) return true;
    
    // Check if there were transactions after cache was created
    const transactions = this.transactionDigests.get(walletAddress) || [];
    const relevantTransactions = transactions.filter(tx => 
      tx.timestamp > cached.timestamp &&
      this.isTransactionRelevant(tx.type, key)
    );
    
    return relevantTransactions.length > 0;
  }
  
  /**
   * Get data, but verify it's not stale
   */
  async get(key, fetcher, options = {}) {
    const walletAddress = options.walletAddress;
    
    // Check if cache exists and is not stale
    if (walletAddress && this.isCacheStale(key, walletAddress)) {
      // Cache is stale due to recent transaction, force refresh
      this.cache.delete(key);
    }
    
    // Continue with normal cache logic...
    return this._getFromCacheOrFetch(key, fetcher);
  }
}
```

---

### 3. **Blockchain Indexing Delay Handling**

Since blockchain transactions take time to be indexed, we need a two-phase approach:

#### Phase 1: Immediate Invalidation (Optimistic)
- Invalidate cache immediately when transaction completes
- User sees loading state while waiting for indexing
- Prevents showing stale cached data

#### Phase 2: Verification & Refresh (After Indexing)
- Wait for blockchain indexing (3-5 seconds)
- Force refresh with `bypassCache: true` flag
- Update cache with fresh data

#### Implementation

```javascript
async function handleBadgeUpgrade(upgradeData) {
  // ... transaction execution ...
  
  if (txResult.success) {
    // PHASE 1: Immediate invalidation
    apiCache.invalidate(`badge:${walletAddress}`);
    apiCache.recordTransaction(walletAddress, txResult.digest, 'badge_upgrade');
    
    // Show loading state
    showLoadingModal('Waiting for transaction to be indexed...');
    
    // PHASE 2: Wait for indexing, then refresh
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Force refresh (bypasses cache)
    const freshBadge = await window.BadgeService.getBadge(walletAddress, {
      bypassCache: true
    });
    
    // Update cache with fresh data
    apiCache.set(`badge:${walletAddress}`, freshBadge, 60000);
    
    // Update UI
    displayBadge(freshBadge);
  }
}
```

---

### 4. **Manual Invalidation Methods**

Provide explicit methods for invalidating cache when needed.

#### Cache API

```javascript
class ApiRequestCache {
  /**
   * Invalidate specific cache entry
   */
  invalidate(key) {
    this.cache.delete(key);
  }
  
  /**
   * Invalidate all entries matching pattern
   */
  invalidateByPattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Invalidate all entries for a wallet address
   */
  invalidateByWallet(walletAddress) {
    this.invalidateByPattern(walletAddress);
  }
  
  /**
   * Invalidate by transaction type
   */
  invalidateByTransaction(transactionType, walletAddress) {
    switch (transactionType) {
      case 'badge_upgrade':
      case 'badge_mint':
      case 'badge_migration':
        this.invalidate(`badge:${walletAddress}`);
        this.invalidate(`stats:${walletAddress}`);
        break;
        
      case 'store_purchase':
        this.invalidate(`inventory:${walletAddress}`);
        this.invalidate(`balance:${walletAddress}`);
        break;
        
      case 'item_consume':
        this.invalidate(`inventory:${walletAddress}`);
        this.invalidate(`stats:${walletAddress}`);
        break;
    }
  }
  
  /**
   * Clear all cache (e.g., on wallet disconnect)
   */
  clear() {
    this.cache.clear();
    this.transactionDigests.clear();
  }
}
```

---

### 5. **Cache Refresh on User Actions**

Force refresh cache when user explicitly requests fresh data.

#### Implementation

```javascript
// User clicks "Refresh" button
async function refreshBadge() {
  // Invalidate cache
  apiCache.invalidate(`badge:${walletAddress}`);
  
  // Fetch fresh data
  const freshBadge = await window.BadgeService.getBadge(walletAddress, {
    bypassCache: true
  });
  
  // Update cache
  apiCache.set(`badge:${walletAddress}`, freshBadge, 60000);
  
  // Update UI
  displayBadge(freshBadge);
}
```

---

### 6. **TTL-Based Expiration with Stale-While-Revalidate**

Use stale cache while fetching fresh data in background.

#### Implementation

```javascript
async function get(key, fetcher, options = {}) {
  const cached = this.cache.get(key);
  const now = Date.now();
  const ttl = options.ttl || this.defaultTTL;
  const isStale = cached && (now - cached.timestamp > ttl);
  
  // If cache exists and is fresh, return it
  if (cached && !isStale) {
    return cached.data;
  }
  
  // If cache is stale but exists, return it immediately and refresh in background
  if (cached && isStale && options.staleWhileRevalidate) {
    // Return stale data immediately
    const staleData = cached.data;
    
    // Refresh in background (don't await)
    fetcher().then(freshData => {
      this.set(key, freshData, ttl);
      // Optionally notify listeners of fresh data
      if (options.onFreshData) {
        options.onFreshData(freshData);
      }
    }).catch(error => {
      log.warn('Background refresh failed, using stale data', error);
    });
    
    return staleData;
  }
  
  // No cache or not using stale-while-revalidate, fetch fresh
  try {
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  } catch (error) {
    // Fallback to stale cache if available
    if (cached) {
      log.warn('API error, using stale cache', error);
      return cached.data;
    }
    throw error;
  }
}
```

---

## 📊 Cache Invalidation Matrix

| Transaction Type | Invalidates | Reason |
|-----------------|-------------|--------|
| **Badge Upgrade** | `badge:${address}`, `stats:${address}` | Badge tier changed, stats may have changed |
| **Badge Mint** | `badge:${address}`, `stats:${address}` | New badge created, stats updated |
| **Badge Migration** | `badge:${address}`, `stats:${address}` | Badge migrated, stats may have changed |
| **Store Purchase** | `inventory:${address}`, `balance:${address}` | Inventory increased, balance decreased |
| **Item Consumption** | `inventory:${address}`, `stats:${address}` | Inventory decreased, stats updated |
| **Wallet Disconnect** | All cache entries | User switched wallets |

---

## 🔄 Complete Flow Example: Badge Upgrade

### Step-by-Step Cache Invalidation

```
1. User clicks "Upgrade Badge"
   ↓
2. Transaction built and signed
   ↓
3. Transaction submitted to blockchain
   ↓
4. Transaction confirmed (txResult.success = true)
   ↓
5. IMMEDIATE: Invalidate cache
   - apiCache.invalidate(`badge:${walletAddress}`)
   - apiCache.invalidate(`stats:${walletAddress}`)
   - apiCache.recordTransaction(walletAddress, digest, 'badge_upgrade')
   - window.BadgeService.clearBadgeCache()
   ↓
6. Show loading modal: "Waiting for transaction to be indexed..."
   ↓
7. Wait 5 seconds for blockchain indexing
   ↓
8. FORCE REFRESH: Fetch fresh data (bypasses cache)
   - const freshBadge = await BadgeService.getBadge(address, { bypassCache: true })
   ↓
9. UPDATE CACHE: Store fresh data
   - apiCache.set(`badge:${walletAddress}`, freshBadge, 60000)
   ↓
10. Update UI with fresh badge data
```

---

## ✅ Safety Mechanisms

### 1. **Bypass Cache Flag**

Allow explicit cache bypass for critical operations:

```javascript
// Force fresh data fetch
const badge = await apiCache.get(
  `badge:${address}`,
  () => BadgeService.getBadge(address),
  { bypassCache: true } // Always fetch fresh
);
```

### 2. **Cache Versioning**

Track cache version to detect stale data:

```javascript
class ApiRequestCache {
  constructor() {
    this.version = 0; // Increment on major invalidation
  }
  
  invalidateByTransaction(type, address) {
    this.version++; // Increment version
    // ... invalidate cache entries ...
  }
  
  get(key, fetcher, options) {
    const cached = this.cache.get(key);
    if (cached && cached.version !== this.version) {
      // Cache is from old version, invalid
      this.cache.delete(key);
    }
    // ... continue with normal logic ...
  }
}
```

### 3. **Transaction Digest Verification**

Verify cache freshness against recent transactions:

```javascript
isCacheStale(key, walletAddress) {
  const cached = this.cache.get(key);
  if (!cached) return true;
  
  // Check for transactions after cache timestamp
  const recentTransactions = this.getRecentTransactions(walletAddress, cached.timestamp);
  return recentTransactions.length > 0;
}
```

---

## 🎯 Summary

### Cache Accuracy Guarantees

1. ✅ **Immediate Invalidation**: Cache invalidated when transaction completes
2. ✅ **Transaction Tracking**: Track transaction digests to detect stale cache
3. ✅ **Force Refresh**: Bypass cache after blockchain indexing delay
4. ✅ **Manual Invalidation**: Explicit methods for clearing cache
5. ✅ **TTL Expiration**: Automatic expiration of old cache entries
6. ✅ **Stale-While-Revalidate**: Use stale cache while fetching fresh data

### Integration Points

- ✅ Badge upgrade: Invalidate + force refresh
- ✅ Badge mint: Invalidate + force refresh
- ✅ Store purchase: Invalidate + reload
- ✅ Item consumption: Invalidate + reload
- ✅ Wallet disconnect: Clear all cache

### Result

**Cache is always accurate** because:
- Invalidated immediately on state changes
- Force refreshed after blockchain indexing
- Tracked against transaction history
- Automatically expires after TTL

---

**Status**: Ready for implementation


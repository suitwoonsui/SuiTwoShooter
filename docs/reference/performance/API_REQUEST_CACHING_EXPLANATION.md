# API Request Caching - How It Will Help

## 🎯 Current State Analysis

### What We Have Now

1. **GameDataFlowService Deduplication** ✅
   - Prevents duplicate **simultaneous** calls (in-flight requests)
   - Uses `_activeLoads` Map to track ongoing requests
   - **Limitation**: Only prevents duplicates during the same load operation
   - **Doesn't cache**: Same data fetched again if requested later

2. **Backend BadgeRequestCache** ✅
   - Backend has caching for badge requests
   - **Limitation**: Only for badge service, not frontend-wide

3. **No Frontend Response Caching** ❌
   - Every API call goes to the network
   - Same data fetched multiple times
   - No TTL-based invalidation
   - No graceful fallback on errors

---

## 🔍 Current Problems

### Problem 1: Redundant API Calls

**Example Scenario**: User opens store, then opens leaderboard, then opens store again

```
1. Store opens → Fetches inventory (API call #1)
2. User clicks leaderboard → Fetches leaderboard (API call #2)
3. User closes leaderboard, opens store again → Fetches inventory AGAIN (API call #3) ❌
```

**Current Behavior**: 3 API calls  
**With Caching**: 2 API calls (inventory cached, reused on second store open)

---

### Problem 2: Multiple Components Fetch Same Data

**Example**: Badge data fetched in multiple places

```javascript
// game-data-flow-loaders.js
const badgeData = await window.BadgeService.getBadge(address); // API call

// badge-ui-display.js (later, same session)
const badgeData = await window.BadgeService.getBadge(address); // API call AGAIN ❌

// store-modal.js (later, same session)
const badgeData = await window.BadgeService.getBadge(address); // API call AGAIN ❌
```

**Current Behavior**: 3 API calls for the same data  
**With Caching**: 1 API call (first call cached, others use cache)

---

### Problem 3: No Error Resilience

**Example**: Network error during badge fetch

```javascript
// Current: If API fails, user sees error, no fallback
try {
  const badgeData = await fetch('/api/badge/...');
} catch (error) {
  // ❌ No cached data to fall back to
  showError('Failed to load badge');
}
```

**With Caching**: If API fails but we have cached data from 30 seconds ago, use that instead of showing error.

---

### Problem 4: Slow UI Updates

**Example**: Opening store requires waiting for inventory API call

```
User clicks "Store" button
  ↓
Show loading modal
  ↓
Wait for API call (200-500ms network latency)
  ↓
Display store
```

**With Caching**: If inventory was fetched recently, show immediately from cache (0ms), update in background.

---

## ✅ How API Request Caching Will Help

### 1. **Reduce API Calls by 30-50%**

**Before Caching**:
```
User session (5 minutes):
- Opens store 3 times → 3 inventory API calls
- Opens leaderboard 2 times → 2 leaderboard API calls
- Badge displayed 5 times → 5 badge API calls
- Stats checked 4 times → 4 stats API calls
Total: 14 API calls
```

**After Caching** (30-second TTL):
```
User session (5 minutes):
- Opens store 3 times → 1 inventory API call (cached for 30s)
- Opens leaderboard 2 times → 1 leaderboard API call (cached for 30s)
- Badge displayed 5 times → 1 badge API call (cached for 30s)
- Stats checked 4 times → 1 stats API call (cached for 30s)
Total: 4 API calls (71% reduction)
```

---

### 2. **Faster UI Responsiveness**

**Before Caching**:
```
User clicks "Store"
  ↓
Loading modal shows
  ↓
Wait 200-500ms for API
  ↓
Store displays
Total: 200-500ms perceived latency
```

**After Caching**:
```
User clicks "Store"
  ↓
Check cache (instant)
  ↓
If cached: Show immediately (0ms)
  ↓
Update in background if cache expired
Total: 0ms perceived latency (if cached)
```

**Impact**: **Instant UI updates** for recently viewed data

---

### 3. **Better Error Handling**

**Before Caching**:
```javascript
try {
  const data = await fetch('/api/inventory/...');
} catch (error) {
  // ❌ Show error, no data available
  showError('Failed to load inventory');
}
```

**After Caching**:
```javascript
try {
  const data = await fetch('/api/inventory/...');
  cache.set('inventory', data); // Cache successful response
} catch (error) {
  // ✅ Try cache first
  const cached = cache.get('inventory');
  if (cached) {
    showData(cached); // Use cached data
    log.warn('Using cached data due to API error');
  } else {
    showError('Failed to load inventory');
  }
}
```

**Impact**: **Graceful degradation** - users see data even if API is temporarily down

---

### 4. **Reduce Backend Load**

**Current**: Every UI interaction = API call  
**With Caching**: Only fetch when cache expires or invalidated

**Example**: 100 users browsing store
- **Before**: 100 API calls per second (if each user opens store)
- **After**: ~30 API calls per second (70% cached)

**Impact**: **Lower server costs**, better scalability

---

### 5. **Offline Resilience**

**Before Caching**: No data available offline  
**With Caching**: Recently viewed data available offline (until cache expires)

**Impact**: **Better mobile experience** (handles network interruptions)

---

## 📊 Real-World Scenarios

### Scenario 1: Store Browsing

**User Flow**:
1. Opens store → Fetches inventory (API call)
2. Browses items (30 seconds)
3. Opens leaderboard → Fetches leaderboard (API call)
4. Returns to store → **Uses cached inventory** (0ms, no API call) ✅

**Savings**: 1 API call, instant store display

---

### Scenario 2: Badge Display

**User Flow**:
1. Wallet connects → Loads badge (API call)
2. Badge shown in menu
3. User opens store → Badge shown in store header → **Uses cached badge** ✅
4. User opens settings → Badge shown again → **Uses cached badge** ✅

**Savings**: 2 API calls, instant badge display

---

### Scenario 3: Network Error Recovery

**User Flow**:
1. Opens store → Fetches inventory (API call, cached)
2. Network disconnects
3. User closes and reopens store → **Uses cached inventory** ✅
4. User still sees their items (graceful degradation)

**Impact**: Better UX during network issues

---

## 🎯 Implementation Strategy

### Cache TTL (Time To Live) Recommendations

| Data Type | TTL | Reason |
|-----------|-----|--------|
| **Inventory** | 30 seconds | Changes when items are purchased |
| **Badge Data** | 60 seconds | Rarely changes |
| **Stats** | 30 seconds | Updates after each game |
| **Leaderboard** | 60 seconds | Updates periodically |
| **Store Items** | 300 seconds (5 min) | Rarely changes |
| **Token Balance** | 10 seconds | Changes with transactions |

### Cache Invalidation

**Automatic**:
- Cache expires after TTL
- Cache invalidated on mutations (purchase, badge upgrade, etc.)

**Manual**:
- `cache.invalidate('inventory')` after purchase
- `cache.invalidate('badge')` after badge upgrade
- `cache.clear()` on wallet disconnect

---

## 📈 Expected Impact

### Performance Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **API Calls** | 14 per session | 4-6 per session | **60-70% reduction** |
| **Store Load Time** | 200-500ms | 0ms (cached) | **Instant** |
| **Error Rate** | 100% on API failure | 0% (uses cache) | **100% improvement** |
| **Backend Load** | High | Low | **60-70% reduction** |

### User Experience

- ✅ **Instant UI updates** for recently viewed data
- ✅ **Works offline** (with cached data)
- ✅ **Graceful error handling** (falls back to cache)
- ✅ **Lower data usage** (fewer network requests)

---

## 🔧 Technical Implementation

### Proposed Solution

Create `ApiRequestCache` utility class:

```javascript
class ApiRequestCache {
  constructor(defaultTTL = 30000) {
    this.cache = new Map(); // key → { data, timestamp, ttl }
    this.defaultTTL = defaultTTL;
  }
  
  async get(key, fetcher, ttl = null) {
    const cached = this.cache.get(key);
    const now = Date.now();
    const cacheTTL = ttl || this.defaultTTL;
    
    // Return cached if valid
    if (cached && (now - cached.timestamp < cacheTTL)) {
      return cached.data;
    }
    
    // Fetch fresh data
    try {
      const data = await fetcher();
      this.set(key, data, cacheTTL);
      return data;
    } catch (error) {
      // Fallback to stale cache if available
      if (cached) {
        log.warn('API error, using stale cache', { key, error });
        return cached.data;
      }
      throw error;
    }
  }
  
  set(key, data, ttl = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }
  
  invalidate(pattern) {
    // Invalidate matching keys
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear() {
    this.cache.clear();
  }
}
```

### Integration Points

1. **Store Inventory** (`store-inventory.js`)
   ```javascript
   const inventory = await apiCache.get(
     `inventory:${walletAddress}`,
     () => fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`),
     30000 // 30 second TTL
   );
   ```

2. **Badge Data** (`game-data-flow-loaders.js`)
   ```javascript
   const badgeData = await apiCache.get(
     `badge:${address}`,
     () => window.BadgeService.getBadge(address),
     60000 // 60 second TTL
   );
   ```

3. **Leaderboard** (`leaderboard-data.js`)
   ```javascript
   const leaderboard = await apiCache.get(
     `leaderboard:${category}:${page}`,
     () => fetch(`${API_BASE_URL}/leaderboard/${category}?page=${page}`),
     60000 // 60 second TTL
   );
   ```

---

## ✅ Summary

**API Request Caching will help by**:

1. ✅ **Reducing API calls by 60-70%** (fewer network requests)
2. ✅ **Instant UI updates** (0ms for cached data)
3. ✅ **Better error handling** (graceful fallback to cache)
4. ✅ **Lower backend load** (better scalability)
5. ✅ **Offline resilience** (works with cached data)
6. ✅ **Better mobile experience** (handles network interruptions)

**Effort**: Medium (need to integrate into existing API calls)  
**Impact**: High (significant performance and UX improvements)

---

## 🔄 Cache Invalidation & Accuracy

**Critical Question**: How do we ensure cache is accurate when blockchain state changes?

**Answer**: Multi-layered invalidation strategy (see `docs/API_CACHE_INVALIDATION_STRATEGY.md` for full details):

1. **Event-Driven Invalidation**: Immediately invalidate cache when transactions complete
2. **Transaction Digest Tracking**: Track transaction digests to detect stale cache
3. **Blockchain Indexing Delay Handling**: Two-phase approach (immediate invalidation + force refresh after indexing)
4. **Manual Invalidation Methods**: Explicit methods for clearing cache
5. **TTL-Based Expiration**: Automatic expiration of old cache entries
6. **Stale-While-Revalidate**: Use stale cache while fetching fresh data in background

**Example Flow (Badge Upgrade)**:
```
Transaction completes → Invalidate cache immediately → 
Wait for blockchain indexing (5s) → Force refresh (bypass cache) → 
Update cache with fresh data → Update UI
```

**Result**: Cache is always accurate because it's invalidated on state changes and force refreshed after blockchain indexing.

---

**Status**: Ready for implementation

**Related Documentation**: `docs/API_CACHE_INVALIDATION_STRATEGY.md`


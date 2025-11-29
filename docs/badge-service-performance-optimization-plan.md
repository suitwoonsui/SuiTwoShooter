# Badge Service Performance Optimization Plan

## 🎯 Goal
Improve response times by 30-50% through batching queries and optimizing data fetching.

## 📊 Current Performance Issues

### Issue 1: Sequential Object Queries in `buildMintBadgeTransaction`
**Location**: Lines ~1074-1092
**Problem**: Two separate `getObject` calls run sequentially
```typescript
const registryObj = await client.getObject({...});  // Wait...
const statsObj = await client.getObject({...});     // Then wait...
```
**Impact**: ~200-400ms wasted (network latency × 2)

### Issue 2: Sequential devInspect Calls in `getBadge`
**Location**: Lines ~608, 675, 731
**Problem**: Three sequential `devInspectTransactionBlock` calls
```typescript
const result1 = await client.devInspectTransactionBlock({...});  // Wait...
const result2 = await client.devInspectTransactionBlock({...});  // Then wait...
const result3 = await client.devInspectTransactionBlock({...});  // Then wait...
```
**Impact**: ~300-600ms wasted (network latency × 3)

### Issue 3: Redundant `hasBadge` Check in `getBadge`
**Location**: Line ~589
**Problem**: `getBadge` calls `hasBadge` first, then makes the same query again
**Impact**: ~100-200ms wasted

## ✅ Optimization Opportunities

### 1. Batch Object Queries with `Promise.all()`
**Files**: `buildMintBadgeTransaction`, `buildUpgradeBadgeTransaction`
**Benefit**: 30-40% faster (parallel instead of sequential)
**Risk**: Low - simple change

### 2. Combine Multiple devInspect Calls
**Files**: `getBadge`, `hasBadge`
**Benefit**: 40-50% faster (single query instead of multiple)
**Risk**: Medium - need to combine transaction blocks

### 3. Remove Redundant Queries
**Files**: `getBadge`
**Benefit**: 20-30% faster (eliminate duplicate query)
**Risk**: Low - just remove redundant call

### 4. Add Request-Level Caching
**Benefit**: 80-90% faster for repeated requests
**Risk**: Medium - need cache invalidation strategy

## 🚀 Recommended Implementation Order

### Phase 1: Quick Wins (30-60 minutes)
1. ✅ Batch object queries with `Promise.all()` - Easy, high impact
2. ✅ Remove redundant `hasBadge` check - Easy, medium impact

### Phase 2: Medium Complexity (1-2 hours)
3. ✅ Combine devInspect calls where possible - Medium, high impact
4. ✅ Add simple request-level caching - Medium, very high impact

### Phase 3: Advanced (2-3 hours)
5. ⏳ Optimize image loading - Complex, medium impact
6. ⏳ Add query result caching - Complex, high impact

## 📈 Expected Results

**Before:**
- `getBadge`: ~800-1200ms
- `buildMintBadgeTransaction`: ~600-900ms
- `buildUpgradeBadgeTransaction`: ~500-800ms

**After Phase 1:**
- `getBadge`: ~600-900ms (25% faster)
- `buildMintBadgeTransaction`: ~400-600ms (33% faster)
- `buildUpgradeBadgeTransaction`: ~350-550ms (30% faster)

**After Phase 2:**
- `getBadge`: ~200-400ms (60% faster, with cache hits)
- `buildMintBadgeTransaction`: ~300-500ms (40% faster)
- `buildUpgradeBadgeTransaction`: ~250-450ms (40% faster)

## 🎯 Recommendation

**Start with Phase 1** - Quick wins that provide immediate 25-35% improvement with minimal risk.

Would you like me to proceed with Phase 1 optimizations?


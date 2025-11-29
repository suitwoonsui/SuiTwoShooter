# Badge Service Architecture: Current vs Proposed

## Current Architecture

```
badge-service.ts (3,877 lines)
│
├── Image Handling (200 lines)
│   ├── loadBadgeImage()
│   ├── createPlaceholderImage()
│   ├── imageToHex()
│   └── createImageDataObjectChunked()
│
├── Old Contract Support (400 lines)
│   ├── hasBadgeOldContract()
│   ├── getBadgeOldContract()
│   └── adminBurnBadgeOldContract()
│
├── Query Operations (300 lines)
│   ├── hasBadge()
│   ├── getBadge()
│   └── getBadgeImageUrl()
│
├── Mint Operations (600 lines)
│   ├── getMintBadgeTransactionData()
│   ├── buildMintBadgeTransaction()
│   └── adminMintBadge()
│
├── Upgrade Operations (500 lines)
│   ├── buildUpgradeBadgeTransaction()
│   ├── checkAndBuildBadgeUpdate()
│   └── calculateTierFromGames()
│
├── Admin Operations (400 lines)
│   ├── adminCleanupOrphanedEntry()
│   ├── adminBurnBadge()
│   └── updateBadgeImageUrl()
│
├── Migration Support (300 lines)
│   ├── buildMigrateBadgeTransaction()
│   └── findOldContractObjects()
│
└── Utilities (scattered)
    ├── getClient()
    ├── getDiscounts()
    └── Various helpers
```

**Issues:**
- ❌ Single massive file
- ❌ Mixed concerns
- ❌ Hard to test
- ❌ High cognitive load
- ❌ Merge conflicts

---

## Proposed Architecture

```
badge-service/
│
├── index.ts (200 lines) - Main orchestrator
│   ├── Re-exports from modules
│   └── Singleton pattern
│
├── badge-query.ts (300 lines)
│   ├── hasBadge()
│   ├── getBadge()
│   └── getBadgeId()
│
├── badge-mint.ts (400 lines)
│   ├── buildMintBadgeTransaction()
│   ├── getMintBadgeTransactionData()
│   └── adminMintBadge()
│
├── badge-upgrade.ts (400 lines)
│   ├── buildUpgradeBadgeTransaction()
│   ├── checkAndBuildBadgeUpdate()
│   └── calculateTierFromGames()
│
├── badge-image.ts (300 lines)
│   ├── loadBadgeImage()
│   ├── createPlaceholderImage()
│   ├── createImageDataObjectChunked()
│   └── getBadgeImageUrl()
│
├── badge-admin.ts (300 lines)
│   ├── adminMintBadge()
│   ├── adminBurnBadge()
│   ├── adminCleanupOrphanedEntry()
│   └── updateBadgeImageUrl()
│
├── badge-migration.ts (400 lines) - Deprecated
│   ├── hasBadgeOldContract()
│   ├── getBadgeOldContract()
│   ├── buildMigrateBadgeTransaction()
│   └── findOldContractObjects()
│
├── badge-transaction.ts (200 lines)
│   ├── BadgeTransactionBuilder class
│   ├── createBaseTransaction()
│   ├── validateConfig()
│   └── serializeTransaction()
│
├── badge-validators.ts (150 lines)
│   ├── BadgeValidators class
│   ├── validateAddress()
│   ├── validateTier()
│   └── validateBadgeId()
│
├── badge-logger.ts (100 lines)
│   ├── BadgeLogger class
│   ├── debug()
│   ├── info()
│   ├── error()
│   └── warn()
│
├── badge-errors.ts (100 lines)
│   ├── BadgeError class
│   ├── BadgeErrorCode enum
│   └── Error utilities
│
├── badge-cache.ts (200 lines)
│   ├── BadgeImageCache class
│   ├── getImage()
│   ├── setImage()
│   └── clearCache()
│
├── types.ts (200 lines)
│   ├── BadgeData interface
│   ├── BadgeConfig interface
│   ├── BadgeTier type
│   └── All shared types
│
└── utils.ts (150 lines)
    ├── getClient()
    ├── getDiscounts()
    └── Helper functions
```

**Benefits:**
- ✅ Focused modules (< 500 lines each)
- ✅ Clear separation of concerns
- ✅ Easy to test
- ✅ Lower cognitive load
- ✅ Reduced merge conflicts

---

## Data Flow Comparison

### Current: Query Badge Flow

```
API Route
  ↓
badge-service.ts (3,877 lines)
  ↓
hasBadge() → getBadgeId() → getBadgeData()
  ↓
Multiple sequential blockchain calls
  ↓
Return result
```

**Issues:**
- Sequential calls (slow)
- Hard to trace flow
- Mixed with other operations

### Proposed: Query Badge Flow

```
API Route
  ↓
badge-service/index.ts (orchestrator)
  ↓
badge-query.ts (focused module)
  ↓
BadgeQueryService.getBadge()
  ├── BadgeValidators.validateAddress()
  ├── BadgeLogger.debug()
  ├── Promise.all([hasBadge(), getBadgeId()]) // Batched
  └── getBadgeData()
  ↓
Return BadgeResult<BadgeData>
```

**Benefits:**
- Parallel calls (faster)
- Clear flow
- Focused responsibility

---

## Error Handling Comparison

### Current: Inconsistent Patterns

```typescript
// Pattern 1: Return object
async getBadge(): Promise<{success: boolean, error?: string}>

// Pattern 2: Throw exception
async hasBadge(): Promise<boolean> // throws on error

// Pattern 3: Return null
async getBadge(): Promise<BadgeData | null>
```

**Issues:**
- Inconsistent return types
- Unpredictable error handling
- Hard to handle errors uniformly

### Proposed: Standardized Pattern

```typescript
// All methods use Result type
type BadgeResult<T> = 
  | { success: true; data: T }
  | { success: false; error: BadgeError };

// Consistent error handling
async getBadge(): Promise<BadgeResult<BadgeData>>
async hasBadge(): Promise<BadgeResult<boolean>>

// Usage
const result = await badgeService.getBadge(address);
if (!result.success) {
  // Handle error consistently
  console.error(result.error.code, result.error.message);
  return;
}
const badge = result.data;
```

**Benefits:**
- Consistent error handling
- Type-safe errors
- Better error messages

---

## Testing Comparison

### Current: Hard to Test

```typescript
// badge-service.ts (3,877 lines)
// - Hard to mock dependencies
// - Hard to test in isolation
// - No test files visible
```

### Proposed: Easy to Test

```typescript
// badge-query.test.ts
describe('BadgeQueryService', () => {
  let service: BadgeQueryService;
  let mockClient: jest.Mocked<SuiClient>;
  
  beforeEach(() => {
    mockClient = createMockClient();
    service = new BadgeQueryService(mockClient, config);
  });
  
  it('should return badge data', async () => {
    mockClient.devInspectTransactionBlock.mockResolvedValue({
      results: [/* mock data */]
    });
    
    const result = await service.getBadge('0x...');
    
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      badgeId: expect.any(String),
      tier: expect.any(Number),
    });
  });
});
```

**Benefits:**
- Easy to mock
- Isolated tests
- Better coverage

---

## Performance Comparison

### Current: Sequential Operations

```typescript
// Sequential calls
const hasBadge = await this.hasBadge(address);      // ~150ms
const badgeId = await this.getBadgeId(address);     // ~150ms
const badgeData = await this.getBadgeData(badgeId); // ~150ms
// Total: ~450ms
```

### Proposed: Parallel Operations

```typescript
// Parallel calls
const [hasBadge, badgeId] = await Promise.all([
  this.hasBadge(address),      // ~150ms
  this.getBadgeId(address),    // ~150ms (parallel)
]); // Total: ~150ms

if (!hasBadge || !badgeId) return null;

const badgeData = await this.getBadgeData(badgeId); // ~150ms
// Total: ~300ms (33% faster)
```

**Benefits:**
- 30-50% faster queries
- Better user experience
- Lower gas costs (fewer transactions)

---

## Code Metrics Comparison

| Metric | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| Largest file | 3,877 lines | < 500 lines | 87% reduction |
| Cyclomatic complexity | High | Low | Significant |
| Test coverage | 0% | > 80% | Critical |
| Code duplication | High | Low | Significant |
| Average response time | ~500ms | < 200ms | 60% faster |
| Maintainability index | Low | High | Significant |

---

## Migration Path

### Phase 1: Extract Utilities (Non-Breaking)
1. Create `badge-logger.ts`
2. Create `badge-errors.ts`
3. Create `badge-validators.ts`
4. Update imports in main service

### Phase 2: Split Modules (Backward Compatible)
1. Create `badge-service/` directory
2. Move methods to new modules
3. Keep main service as wrapper
4. Update internal calls

### Phase 3: Optimize (Non-Breaking)
1. Add batching
2. Improve caching
3. Add monitoring

### Phase 4: Clean Up (Breaking)
1. Remove old service file
2. Update all imports
3. Update documentation

---

## Risk Assessment

| Change | Risk Level | Mitigation |
|--------|-----------|------------|
| Extract utilities | Low | Non-breaking, easy to test |
| Split modules | Medium | Keep wrapper, gradual migration |
| Batch queries | Medium | Test thoroughly, monitor |
| Error handling | Medium | Update all call sites |
| Remove old code | High | Ensure migration complete |

---

## Conclusion

The proposed architecture provides:

1. **Better Organization**: Focused modules with clear responsibilities
2. **Improved Performance**: Batching and caching reduce response times
3. **Enhanced Reliability**: Consistent error handling and testing
4. **Easier Maintenance**: Smaller files, clearer structure
5. **Future-Proof**: Supports new features and scaling

**Next Steps**: Start with quick wins (logging, validators, errors) then gradually split into modules.


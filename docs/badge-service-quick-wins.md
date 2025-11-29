# Badge Service - Quick Wins & Immediate Improvements

## Quick Wins (Can Implement Today)

### 1. Extract Logging Utility ⚡ (30 minutes)

**Problem**: 26 instances of `DEBUG_BADGE_LOOKUP` checks scattered throughout code

**Solution**: Create a simple logger utility

**File**: `backend/lib/sui/badge-logger.ts`
```typescript
export class BadgeLogger {
  private static debugEnabled = process.env.DEBUG_BADGE === 'true';
  
  static debug(message: string, data?: any): void {
    if (this.debugEnabled) {
      console.log(`[BADGE DEBUG] ${message}`, data);
    }
  }
  
  static info(message: string, data?: any): void {
    console.log(`[BADGE] ${message}`, data);
  }
  
  static error(message: string, error?: any): void {
    console.error(`[BADGE ERROR] ${message}`, error);
  }
  
  static warn(message: string, data?: any): void {
    console.warn(`[BADGE WARN] ${message}`, data);
  }
}
```

**Impact**: Cleaner code, easier to control logging

---

### 2. Extract Common Error Types ⚡ (1 hour)

**Problem**: Inconsistent error handling patterns

**Solution**: Create standardized error types

**File**: `backend/lib/sui/badge-errors.ts`
```typescript
export enum BadgeErrorCode {
  BADGE_NOT_FOUND = 'BADGE_NOT_FOUND',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_TIER = 'INVALID_TIER',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONFIG_MISSING = 'CONFIG_MISSING',
  BADGE_ALREADY_EXISTS = 'BADGE_ALREADY_EXISTS',
}

export class BadgeError extends Error {
  constructor(
    public code: BadgeErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BadgeError';
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
```

**Impact**: Consistent error handling, better error messages

---

### 3. Extract Address Validation ⚡ (30 minutes)

**Problem**: Address validation repeated in multiple places

**Solution**: Create validation utility

**File**: `backend/lib/sui/badge-validators.ts`
```typescript
export class BadgeValidators {
  static validateAddress(address: string): void {
    if (!address || typeof address !== 'string') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Address is required'
      );
    }
    
    if (!address.startsWith('0x') || address.length !== 66) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `Invalid address format: ${address}. Must be 0x followed by 64 hex characters`
      );
    }
  }
  
  static validateTier(tier: number): void {
    if (tier === undefined || tier === null || typeof tier !== 'number') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        'Tier is required'
      );
    }
    
    if (!Number.isInteger(tier) || tier < 0 || tier > 5) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        `Invalid tier: ${tier}. Must be an integer between 0 and 5`
      );
    }
  }
  
  static validateBadgeId(badgeId: string): void {
    this.validateAddress(badgeId); // Same format as address
  }
}
```

**Impact**: DRY principle, consistent validation

---

### 4. Improve Image Cache with TTL ⚡ (1 hour)

**Problem**: Image cache has no expiration, could grow unbounded

**Solution**: Add TTL and size limits

**In `badge-service.ts`, replace imageCache:**
```typescript
interface CachedImage {
  data: Uint8Array;
  timestamp: number;
  tier: number;
}

private imageCache: Map<string, CachedImage> = new Map();
private readonly IMAGE_CACHE_TTL = 3600000; // 1 hour
private readonly MAX_CACHE_SIZE = 100;

private getCachedImage(tier: number): Uint8Array | null {
  const cacheKey = `tier_${tier}`;
  const cached = this.imageCache.get(cacheKey);
  
  if (!cached) return null;
  
  // Check TTL
  const age = Date.now() - cached.timestamp;
  if (age > this.IMAGE_CACHE_TTL) {
    this.imageCache.delete(cacheKey);
    return null;
  }
  
  return cached.data;
}

private setCachedImage(tier: number, data: Uint8Array): void {
  // Implement LRU eviction if cache is full
  if (this.imageCache.size >= this.MAX_CACHE_SIZE) {
    // Remove oldest entry
    const oldestKey = Array.from(this.imageCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    this.imageCache.delete(oldestKey);
  }
  
  this.imageCache.set(`tier_${tier}`, {
    data,
    timestamp: Date.now(),
    tier,
  });
}
```

**Impact**: Better memory management, prevents memory leaks

---

### 5. Extract Transaction Building Utilities ⚡ (2 hours)

**Problem**: Transaction building code duplicated across methods

**Solution**: Create transaction builder utility

**File**: `backend/lib/sui/badge-transaction-builder.ts`
```typescript
export class BadgeTransactionBuilder {
  static createBaseTransaction(config: Config): Transaction {
    const txb = new Transaction();
    txb.setGasBudget(config.sui.gasBudget);
    return txb;
  }
  
  static validateConfig(config: Config): void {
    if (!config.contracts.badgeRegistry) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'BadgeRegistry object ID not configured'
      );
    }
    
    if (!config.contracts.gameScore) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'GameScore package ID not configured'
      );
    }
  }
  
  static serializeTransaction(txb: Transaction): string {
    return txb.serialize({
      maxSizeBytes: 128 * 1024, // 128KB max
    });
  }
}
```

**Impact**: DRY, easier to maintain transaction building logic

---

## Medium-Term Improvements (This Week)

### 6. Split Service into Modules (4-6 hours)

**Priority**: High

**Steps**:
1. Create `badge-service/` directory
2. Move query methods to `badge-query.ts`
3. Move mint methods to `badge-mint.ts`
4. Move upgrade methods to `badge-upgrade.ts`
5. Move image methods to `badge-image.ts`
6. Keep main service as orchestrator

**See**: `docs/badge-service-improvements.md` for detailed structure

---

### 7. Add Input Validation to API Routes (2 hours)

**Problem**: Validation scattered across routes

**Solution**: Create validation middleware

**File**: `backend/lib/sui/badge-api-validators.ts`
```typescript
export function validateMintRequest(body: any): {
  playerAddress: string;
  paymentCoinId?: string;
} {
  if (!body.playerAddress) {
    throw new BadgeError(
      BadgeErrorCode.INVALID_ADDRESS,
      'playerAddress is required'
    );
  }
  
  BadgeValidators.validateAddress(body.playerAddress);
  
  return {
    playerAddress: body.playerAddress,
    paymentCoinId: body.paymentCoinId,
  };
}
```

**Impact**: Consistent validation, better error messages

---

### 8. Batch Blockchain Queries (3-4 hours)

**Problem**: Sequential blockchain calls slow down operations

**Solution**: Use Promise.all for parallel queries

**Example**:
```typescript
// Before
const hasBadge = await this.hasBadge(playerAddress);
if (!hasBadge) return null;
const badgeId = await this.getBadgeId(playerAddress);
const badgeData = await this.getBadgeData(badgeId);

// After
const [hasBadge, badgeId] = await Promise.all([
  this.hasBadge(playerAddress),
  this.getBadgeId(playerAddress),
]);

if (!hasBadge || !badgeId) return null;

const badgeData = await this.getBadgeData(badgeId);
```

**Impact**: 30-50% faster query operations

---

## Long-Term Improvements (This Month)

### 9. Add Unit Tests (8-10 hours)

**Priority**: Critical for refactoring safety

**Start with**:
- Badge query operations
- Address validation
- Tier calculation
- Image caching

**See**: `docs/badge-service-improvements.md` Phase 5

---

### 10. Performance Monitoring (2-3 hours)

**Add metrics**:
- Response time tracking
- Error rate tracking
- Cache hit rate
- Transaction success rate

**Implementation**:
```typescript
class BadgeMetrics {
  static recordQueryTime(duration: number): void {
    // Log to monitoring service
  }
  
  static recordError(error: BadgeError): void {
    // Track error rates
  }
  
  static recordCacheHit(tier: number): void {
    // Track cache performance
  }
}
```

---

## Code Quality Improvements

### 11. Remove Dead Code

**Find and remove**:
- Unused methods
- Commented-out code
- Deprecated old contract methods (if migration complete)

**Command**:
```bash
# Find unused exports
npx ts-prune

# Find dead code
npx unimported
```

---

### 12. Add JSDoc Comments

**Priority**: Medium

**Focus on**:
- Public methods
- Complex algorithms
- Error conditions

**Example**:
```typescript
/**
 * Get badge data for a player
 * 
 * @param playerAddress - Player's wallet address (must be valid Sui address)
 * @returns Badge data if player has badge, null otherwise
 * @throws {BadgeError} If address is invalid or query fails
 */
async getBadge(playerAddress: string): Promise<BadgeData | null>
```

---

## Recommended Implementation Order

### Week 1: Quick Wins
1. ✅ Extract logging utility (#1)
2. ✅ Extract error types (#2)
3. ✅ Extract validators (#3)
4. ✅ Improve image cache (#4)

### Week 2: Structure
5. ✅ Extract transaction builder (#5)
6. ✅ Split service into modules (#6)
7. ✅ Add API validation (#7)

### Week 3: Performance
8. ✅ Batch blockchain queries (#8)
9. ✅ Add performance monitoring (#10)

### Week 4: Quality
10. ✅ Add unit tests (#9)
11. ✅ Remove dead code (#11)
12. ✅ Add JSDoc (#12)

---

## Success Metrics

### Before
- File size: 3,877 lines
- Test coverage: 0%
- Average response: ~500ms
- Code duplication: High

### After (Target)
- Largest file: < 500 lines
- Test coverage: > 80%
- Average response: < 200ms
- Code duplication: Low

---

## Notes

- Start with quick wins to build momentum
- Add tests as you refactor (don't wait)
- Keep backward compatibility during migration
- Document breaking changes clearly
- Review each PR carefully before merging


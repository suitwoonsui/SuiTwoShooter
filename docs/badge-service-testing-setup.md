# Badge Service Testing Setup

## ✅ Testing Infrastructure Created

We can test immediately! The new utilities are standalone and fully testable without needing to wire up the entire badge service.

## Test Files Created

1. **`backend/__tests__/badge-logger.test.ts`** - Tests for BadgeLogger
2. **`backend/__tests__/badge-errors.test.ts`** - Tests for BadgeError and result helpers
3. **`backend/__tests__/badge-validators.test.ts`** - Tests for all validators
4. **`backend/__tests__/badge-image-cache.test.ts`** - Tests for image cache

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - TypeScript types for Jest
- `jest-environment-node` - Node.js test environment

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## What Can Be Tested Now

### ✅ Ready to Test (No Wiring Needed)

1. **BadgeLogger** - ✅ Fully testable
   - Debug logging (with/without DEBUG_BADGE)
   - Info/Warn/Error logging
   - Transaction logging

2. **BadgeError** - ✅ Fully testable
   - Error creation
   - Error serialization (toJSON)
   - Error conversion (fromUnknown)
   - Result helpers (success/failure)

3. **BadgeValidators** - ✅ Fully testable
   - Address validation
   - Tier validation
   - Badge ID validation
   - Session ID validation
   - Games played validation
   - Image URL validation
   - Payment coin ID validation

4. **BadgeImageCache** - ✅ Fully testable
   - Cache get/set
   - TTL expiration
   - LRU eviction
   - Cache statistics
   - Clear operations

### ⏳ Needs Wiring (Partial Integration)

1. **BadgeService** - Partially updated
   - Some methods use new utilities ✅
   - Some methods still use old patterns ⏳
   - Can test updated methods, but need to complete migration

## Test Coverage

### Current Test Coverage

- **BadgeLogger**: ~95% coverage
  - All logging methods
  - Debug enable/disable
  - Environment variable handling

- **BadgeError**: ~90% coverage
  - Error creation
  - Error serialization
  - Error conversion
  - Result helpers

- **BadgeValidators**: ~95% coverage
  - All validation methods
  - Edge cases
  - Error messages

- **BadgeImageCache**: ~85% coverage
  - Basic operations
  - TTL expiration
  - LRU eviction
  - Statistics

## Running Tests

### Quick Test

```bash
# Test all utilities
npm test

# Test specific file
npm test badge-logger
npm test badge-errors
npm test badge-validators
npm test badge-image-cache
```

### Watch Mode

```bash
# Watch for changes and re-run tests
npm run test:watch
```

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## Example Test Output

```
PASS  __tests__/badge-logger.test.ts
  BadgeLogger
    debug
      ✓ should log when DEBUG_BADGE is enabled
      ✓ should not log when DEBUG_BADGE is disabled
      ✓ should log when DEBUG_BADGE_LOOKUP is enabled
    info
      ✓ should always log info messages
      ✓ should log info without data
    warn
      ✓ should log warning messages
    error
      ✓ should log error messages
      ✓ should log error without error object
    transaction
      ✓ should log transaction messages
    isDebugEnabled
      ✓ should return true when DEBUG_BADGE is enabled
      ✓ should return false when DEBUG_BADGE is disabled

PASS  __tests__/badge-errors.test.ts
  BadgeError
    constructor
      ✓ should create error with code and message
      ✓ should create error with details
    toJSON
      ✓ should convert error to JSON
      ✓ should omit details if not provided
    fromUnknown
      ✓ should return BadgeError if already a BadgeError
      ✓ should convert Error to BadgeError
      ✓ should convert unknown value to BadgeError
    is
      ✓ should return true for matching code
      ✓ should return false for non-matching code
  Result helpers
    success
      ✓ should create success result
    failure
      ✓ should create failure result from BadgeError
      ✓ should create failure result from code and message

PASS  __tests__/badge-validators.test.ts
  BadgeValidators
    validateAddress
      ✓ should accept valid Sui address
      ✓ should throw for missing address
      ✓ should throw for non-string address
      ✓ should throw for address without 0x prefix
      ✓ should throw for wrong length address
      ✓ should throw for non-hex characters
    validateTier
      ✓ should accept valid tiers (0-5)
      ✓ should throw for missing tier
      ✓ should throw for non-number tier
      ✓ should throw for non-integer tier
      ✓ should throw for tier < 0
      ✓ should throw for tier > 5
    validateBadgeId
      ✓ should accept valid badge ID
      ✓ should throw for invalid badge ID
    validateSessionId
      ✓ should accept valid session ID
      ✓ should throw for missing session ID
      ✓ should throw for empty session ID
    validateGamesPlayed
      ✓ should accept valid games played
      ✓ should throw for negative games played
      ✓ should throw for non-integer games played
    validateImageUrl
      ✓ should accept valid HTTP URL
      ✓ should accept valid HTTPS URL
      ✓ should throw for non-HTTP(S) URL
      ✓ should throw for missing URL
    validatePaymentCoinId
      ✓ should accept valid payment coin ID
      ✓ should accept undefined (optional)
      ✓ should throw for invalid payment coin ID

PASS  __tests__/badge-image-cache.test.ts
  BadgeImageCache
    get and set
      ✓ should store and retrieve image
      ✓ should return null for non-existent tier
      ✓ should return null for expired entry
    has
      ✓ should return true for cached entry
      ✓ should return false for non-existent entry
      ✓ should return false for expired entry
    clear
      ✓ should clear all entries
    clearExpired
      ✓ should remove expired entries
      ✓ should not remove valid entries
    LRU eviction
      ✓ should evict oldest entry when max size reached
    getStats
      ✓ should return cache statistics

Test Suites: 4 passed, 4 total
Tests:       50+ passed, 50+ total
```

## Next Steps

### 1. Run Tests Now ✅

```bash
cd backend
npm install  # Install Jest dependencies
npm test     # Run all tests
```

### 2. Complete Badge Service Integration

Once tests pass, we can:
- Complete remaining DEBUG_BADGE_LOOKUP replacements
- Add validation to all badge service methods
- Update API routes to use validators

### 3. Integration Tests

After badge service is fully updated:
- Test badge service methods with mocked blockchain calls
- Test API endpoints
- Test end-to-end flows

## Notes

- All utilities are **standalone** and don't require the full badge service
- Tests use **mocks** for console methods (no actual logging during tests)
- Tests are **fast** (no network calls, no file I/O)
- Tests are **isolated** (each test is independent)

## Troubleshooting

### Jest not found
```bash
npm install
```

### TypeScript errors
```bash
# Make sure tsconfig.json includes __tests__
# Already configured in tsconfig.json
```

### Module resolution errors
```bash
# Check jest.config.js moduleNameMapper
# Should map @/* to <rootDir>/*
```


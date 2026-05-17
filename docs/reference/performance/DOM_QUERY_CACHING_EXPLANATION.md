# DOM Query Caching - Explanation & Implementation Guide

## 🎯 What is DOM Query Caching?

**DOM Query Caching** is a performance optimization technique where you store frequently accessed DOM elements in variables instead of querying the DOM multiple times.

### The Problem

Every time you call `document.getElementById()` or `querySelector()`, the browser must:
1. Traverse the DOM tree
2. Search for the matching element
3. Return the element reference

**This is expensive**, especially when:
- The same element is queried multiple times
- Queries happen in frequently called functions (like update loops)
- The DOM is large or complex

### The Solution

Cache the element reference after the first query, then reuse it.

---

## 📊 Performance Impact

### Before Caching
```javascript
// Function called 60 times per second (game loop)
function updateUI() {
  const menu = document.getElementById('mainMenuOverlay');  // DOM query #1
  const menu = document.getElementById('mainMenuOverlay');  // DOM query #2 (duplicate!)
  const menu = document.getElementById('mainMenuOverlay');  // DOM query #3 (duplicate!)
  // ... 60 queries per second for the same element
}
```

### After Caching
```javascript
// Cache once, reuse forever
let _mainMenuCache = null;
function getMainMenu() {
  if (!_mainMenuCache) {
    _mainMenuCache = document.getElementById('mainMenuOverlay');
  }
  return _mainMenuCache;
}

function updateUI() {
  const menu = getMainMenu();  // First call: 1 query, subsequent: 0 queries
  const menu = getMainMenu();  // Uses cache
  const menu = getMainMenu();  // Uses cache
  // ... 0 queries after first call
}
```

**Performance Gain**: 2-5% overall, but can be 10-20% in UI-heavy operations

---

## 🔍 Examples from Your Codebase

### Example 1: Repeated Queries in Same Function

**File**: `src/game/systems/ui/leaderboard-modal.js`

**Before** (Multiple queries):
```javascript
function showLeaderboard() {
  const mainMenu = document.getElementById('mainMenuOverlay');  // Query #1
  // ... later in same function ...
  const mainMenu = document.getElementById('mainMenuOverlay');  // Query #2 (duplicate!)
}
```

**After** (Cached):
```javascript
// At module level
let _mainMenuCache = null;
function getMainMenu() {
  if (!_mainMenuCache) {
    _mainMenuCache = document.getElementById('mainMenuOverlay');
  }
  return _mainMenuCache;
}

function showLeaderboard() {
  const mainMenu = getMainMenu();  // Uses cache
  // ... later ...
  const mainMenu = getMainMenu();  // Uses cache (no query)
}
```

---

### Example 2: Queries in Frequently Called Functions

**File**: `src/game/systems/ui/menu-service.js`

**Before**:
```javascript
const MenuService = {
  show() {
    const mainMenu = document.getElementById('mainMenuOverlay');  // Query every time
    // ...
  },
  
  hide() {
    const mainMenu = document.getElementById('mainMenuOverlay');  // Query again!
    // ...
  },
  
  updateStats() {
    const mainMenu = document.getElementById('mainMenuOverlay');  // Query again!
    // ...
  }
};
```

**After**:
```javascript
const MenuService = {
  // Cache at service level
  _mainMenuCache: null,
  
  _getMainMenu() {
    if (!this._mainMenuCache) {
      this._mainMenuCache = document.getElementById('mainMenuOverlay');
    }
    return this._mainMenuCache;
  },
  
  show() {
    const mainMenu = this._getMainMenu();  // Uses cache
    // ...
  },
  
  hide() {
    const mainMenu = this._getMainMenu();  // Uses cache
    // ...
  },
  
  updateStats() {
    const mainMenu = this._getMainMenu();  // Uses cache
    // ...
  }
};
```

---

### Example 3: Queries in Event Handlers

**File**: `src/game/systems/ui/store-ui-updates.js`

**Before**:
```javascript
async function updateStoreUI() {
  const summary = document.getElementById('storeSelectedSummary');      // Query #1
  const selectedList = document.getElementById('selectedItemsList');     // Query #2
  const totalElement = document.getElementById('storeTotal');           // Query #3
  const proceedBtn = document.getElementById('proceedToPurchaseBtn');    // Query #4
  
  // Called multiple times during store interactions
}
```

**After**:
```javascript
// Cache at module level
const _storeUICache = {
  summary: null,
  selectedList: null,
  totalElement: null,
  proceedBtn: null
};

function getStoreElement(id) {
  const cacheKey = id.replace('store', '').replace(/([A-Z])/g, (m) => m.toLowerCase());
  if (!_storeUICache[cacheKey]) {
    _storeUICache[cacheKey] = document.getElementById(id);
  }
  return _storeUICache[cacheKey];
}

async function updateStoreUI() {
  const summary = getStoreElement('storeSelectedSummary');      // Cached
  const selectedList = getStoreElement('selectedItemsList');     // Cached
  const totalElement = getStoreElement('storeTotal');           // Cached
  const proceedBtn = getStoreElement('proceedToPurchaseBtn');    // Cached
}
```

---

## 🛠️ Implementation Patterns

### Pattern 1: Module-Level Cache

**Best for**: Elements accessed across multiple functions in the same module

```javascript
// At top of module
let _elementCache = null;

function getElement() {
  if (!_elementCache) {
    _elementCache = document.getElementById('elementId');
  }
  return _elementCache;
}

// Use in functions
function doSomething() {
  const element = getElement();
  // ...
}
```

---

### Pattern 2: Service-Level Cache

**Best for**: Elements accessed by a service/class

```javascript
const MyService = {
  _elementCache: null,
  
  _getElement() {
    if (!this._elementCache) {
      this._elementCache = document.getElementById('elementId');
    }
    return this._elementCache;
  },
  
  method1() {
    const element = this._getElement();
    // ...
  },
  
  method2() {
    const element = this._getElement();
    // ...
  }
};
```

---

### Pattern 3: Cache Object for Multiple Elements

**Best for**: Multiple related elements

```javascript
const _cache = {
  menu: null,
  container: null,
  canvas: null
};

function getCachedElement(key) {
  if (!_cache[key]) {
    const elementMap = {
      menu: 'mainMenuOverlay',
      container: 'gameContainer',
      canvas: 'gameCanvas'
    };
    _cache[key] = document.getElementById(elementMap[key]);
  }
  return _cache[key];
}

// Usage
const menu = getCachedElement('menu');
const container = getCachedElement('container');
```

---

### Pattern 4: Lazy Initialization with Invalidation

**Best for**: Elements that might be removed/recreated

```javascript
let _elementCache = null;
let _cacheValid = false;

function getElement() {
  if (!_cacheValid || !_elementCache) {
    _elementCache = document.getElementById('elementId');
    _cacheValid = true;
  }
  return _elementCache;
}

function invalidateCache() {
  _cacheValid = false;
  _elementCache = null;
}

// Call invalidateCache() when element is removed/recreated
```

---

## ⚠️ When NOT to Cache

### 1. Elements That Change Frequently
```javascript
// BAD: Element is recreated each time
function createDynamicElement() {
  const element = document.createElement('div');
  // ... element is added to DOM
  // Don't cache this - it's a new element each time
}
```

### 2. Elements That Are Removed/Recreated
```javascript
// BAD: Element might be removed
function showModal() {
  const modal = document.getElementById('modal');  // Might not exist
  // If modal is removed from DOM, cache becomes stale
}
```

**Solution**: Invalidate cache when element is removed

### 3. QuerySelector with Dynamic Selectors
```javascript
// BAD: Selector changes based on state
function getItemCard(itemId) {
  return document.querySelector(`[data-item-id="${itemId}"]`);  // Different element each time
}
```

---

## 📋 Files to Update (Priority Order)

### High Priority (Frequently Accessed)
1. **`src/game/systems/ui/menu-service.js`**
   - `mainMenuOverlay` - accessed in show(), hide(), updateStats()
   
2. **`src/game/systems/ui/game-service.js`**
   - `gameContainer` - accessed in startGame(), stopGame()
   - `canvas` - accessed in initialization
   
3. **`src/game/systems/ui/store-modal.js`**
   - `storeModal` - accessed in show(), hide()
   - `viewportContainer` - accessed in show()

### Medium Priority
4. **`src/game/systems/ui/store-ui-updates.js`**
   - `storeSelectedSummary`, `selectedItemsList`, `storeTotal`, `proceedToPurchaseBtn`
   
5. **`src/game/systems/ui/leaderboard-modal.js`**
   - `leaderboardModal`, `mainMenuOverlay`, `modalLeaderboardList`

6. **`src/game/systems/ui/badge-ui-modals.js`**
   - `badgeMintingModal`, `badgeUpgradeModal`, `viewportContainer`

---

## 🎯 Expected Results

### Performance Improvements
- **2-5% overall performance boost**
- **10-20% improvement** in UI-heavy operations
- **Reduced DOM traversal overhead** (especially on mobile)

### Code Quality
- **Cleaner code** - less repetition
- **Better maintainability** - single source of truth for element access
- **Easier debugging** - centralized element access

---

## 🧪 Testing Checklist

After implementing caching:
- [ ] All UI functions work correctly
- [ ] No "element is null" errors
- [ ] Elements are found correctly after DOM changes
- [ ] Performance improvement measurable (use browser DevTools Performance tab)
- [ ] No memory leaks (cached elements don't prevent garbage collection)

---

## 💡 Best Practices

1. **Cache at the right level**: Module-level for module-wide access, service-level for service-wide access
2. **Invalidate when needed**: Clear cache when elements are removed/recreated
3. **Use descriptive names**: `_mainMenuCache` not `_cache`
4. **Document cache invalidation**: Comment when/why cache is cleared
5. **Test thoroughly**: Ensure cached elements don't become stale

---

## 📚 Related Documentation

- `docs/PERFORMANCE_IMPROVEMENTS.md` - Overall performance plan
- `docs/OPTIMIZATION_STATUS.md` - Current optimization status

---

**Next Step**: Would you like me to implement DOM query caching for the high-priority files?


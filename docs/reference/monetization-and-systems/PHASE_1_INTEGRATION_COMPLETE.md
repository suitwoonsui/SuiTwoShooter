# Phase 1 Integration - Ready for Testing

## ✅ Completed Integration

All core components have been integrated! The system is ready for testing.

### What's Been Integrated

1. **Script Loading** ✅
   - Added game pass scripts to `lazy-loader.js`
   - Scripts load when menu loads

2. **Demo Mode Detection** ✅
   - Integrated in `GameService.startGame()`
   - Checks game pass status before starting
   - Consumes credit if player has active pass
   - Sets `isDemoMode` flag in game state

3. **Boss Defeat Detection** ✅
   - Added to `game-update.js` `_handleBossDefeat()`
   - Shows End Demo modal after first boss in demo mode
   - Handles continue/purchase/close actions

4. **Credit Display** ✅
   - Added to main menu footer
   - Refreshes when menu is shown
   - Updates after purchases/consumption

5. **Game Pass Tab** ✅
   - Created `store-game-pass-tab.js` component
   - Ready to integrate into store modal

---

## 🔧 Remaining Integration Steps

### 1. Add Tabs to Store Modal

**File:** `src/game/systems/ui/store-modal.js`

**Location:** Around line 187 (in `storeContent.innerHTML`)

**Add after store header:**
```javascript
<!-- Store Tabs -->
<div class="store-tabs">
  <button class="store-tab active" onclick="switchStoreTab('items')" id="storeTabItems">Items</button>
  <button class="store-tab" onclick="switchStoreTab('gamePass')" id="storeTabGamePass">Game Pass</button>
</div>

<!-- Tab Content Container -->
<div class="store-tab-content-container">
  <!-- Items Tab Content (existing) -->
  <div class="store-tab-content active" id="storeTabContentItems">
    <!-- Existing store items container -->
    <div class="store-items-container" id="storeItemsContainer">
      <!-- ... existing content ... -->
    </div>
  </div>
  
  <!-- Game Pass Tab Content (new) -->
  <div class="store-tab-content" id="storeTabContentGamePass">
    <div id="storeGamePassTabContent">
      <!-- Will be populated by StoreGamePassTab.render() -->
    </div>
  </div>
</div>
```

**Add tab switching function:**
```javascript
// Add to store-modal.js or store-ui.js
function switchStoreTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.store-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all tabs
  document.querySelectorAll('.store-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab
  if (tabName === 'items') {
    document.getElementById('storeTabContentItems')?.classList.add('active');
    document.getElementById('storeTabItems')?.classList.add('active');
  } else if (tabName === 'gamePass') {
    document.getElementById('storeTabContentGamePass')?.classList.add('active');
    document.getElementById('storeTabGamePass')?.classList.add('active');
    
    // Load Game Pass tab content
    if (window.StoreGamePassTab) {
      const walletAddress = getWalletAddress();
      const paymentToken = StoreService.getPaymentToken() || 'mews';
      
      // Get badge discount
      let badgeDiscount = 0;
      if (window.BadgeService) {
        const badge = await window.BadgeService.getBadge(walletAddress);
        if (badge && badge.success && badge.hasBadge && badge.badge) {
          const discounts = window.BadgeService.getDiscounts(badge.badge.tier);
          badgeDiscount = discounts.store || 0;
        }
      }
      
      // Get game pass status
      let gamePassStatus = null;
      if (window.GamePassService) {
        const status = await window.GamePassService.getGamePassStatus(walletAddress);
        if (status.success) {
          gamePassStatus = status;
        }
      }
      
      await window.StoreGamePassTab.render(walletAddress, paymentToken, badgeDiscount, gamePassStatus);
    }
  }
}

// Make available globally
window.switchStoreTab = switchStoreTab;
```

**Update `showStoreInternal()` to handle context:**
```javascript
async function showStoreInternal(context = 'main-menu') {
  // ... existing code ...
  
  // If context is 'gamePass', switch to Game Pass tab after modal loads
  if (context === 'gamePass') {
    setTimeout(() => {
      switchStoreTab('gamePass');
    }, 100);
  }
}
```

### 2. Add CSS Styles

**File:** Create `src/game/rendering/ui/game-pass-styles.css`

**Content:**
```css
/* Credit Display in Menu */
#gamePassCreditsDisplay {
  display: flex;
  align-items: center;
  gap: 8px;
}

#gamePassCreditsValue {
  font-weight: bold;
  color: #FFD700;
}

/* End Demo Modal */
.end-demo-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.end-demo-modal-visible {
  opacity: 1;
}

.end-demo-modal-hidden {
  opacity: 0;
  pointer-events: none;
}

.end-demo-modal-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #FFD700;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.end-demo-modal-header h2 {
  color: #FFD700;
  margin: 0 0 8px 0;
  font-size: 28px;
}

.end-demo-subtitle {
  color: #ccc;
  margin: 0 0 24px 0;
}

.end-demo-stats {
  display: flex;
  justify-content: space-around;
  margin: 24px 0;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.end-demo-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.end-demo-stat-label {
  color: #999;
  font-size: 14px;
}

.end-demo-stat-value {
  color: #FFD700;
  font-size: 24px;
  font-weight: bold;
}

.end-demo-message {
  margin: 24px 0;
  color: #ccc;
  line-height: 1.6;
}

.end-demo-has-pass {
  color: #4CAF50;
  font-weight: bold;
}

.end-demo-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

/* Store Tabs */
.store-tabs {
  display: flex;
  gap: 8px;
  margin: 16px 0;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.store-tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #999;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.store-tab:hover {
  color: #fff;
}

.store-tab.active {
  color: #FFD700;
  border-bottom-color: #FFD700;
}

.store-tab-content-container {
  margin-top: 16px;
}

.store-tab-content {
  display: none;
}

.store-tab-content.active {
  display: block;
}

/* Game Pass Tab */
.game-pass-tab-content {
  padding: 16px 0;
}

.game-pass-status {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: center;
}

.game-pass-status-label {
  color: #999;
  font-size: 14px;
  margin-bottom: 8px;
}

.game-pass-status-value {
  color: #FFD700;
  font-size: 32px;
  font-weight: bold;
}

.game-pass-section {
  margin-bottom: 32px;
}

.game-pass-section h3 {
  color: #FFD700;
  margin-bottom: 16px;
  font-size: 20px;
}

.game-pass-packs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.game-pass-pack-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.game-pass-pack-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #FFD700;
  transform: translateY(-2px);
}

.pack-header {
  margin-bottom: 12px;
}

.pack-header h3 {
  color: #FFD700;
  margin: 0 0 8px 0;
  font-size: 20px;
}

.pack-games {
  color: #999;
  font-size: 14px;
}

.pack-description {
  color: #ccc;
  font-size: 12px;
  margin-bottom: 16px;
  min-height: 32px;
}

.pack-pricing {
  margin-bottom: 16px;
  position: relative;
}

.pack-price {
  color: #FFD700;
  font-size: 24px;
  font-weight: bold;
}

.pack-price-original {
  color: #999;
  font-size: 16px;
  text-decoration: line-through;
  margin-bottom: 4px;
}

.pack-price-discounted {
  color: #FFD700;
  font-size: 24px;
  font-weight: bold;
}

.pack-discount-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #4CAF50;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.pack-purchase-btn {
  width: 100%;
}

.pay-per-game-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.pay-per-game-info {
  flex: 1;
}

.pay-per-game-label {
  color: #FFD700;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.pay-per-game-price {
  margin-bottom: 8px;
}

.pay-per-game-price .price {
  color: #FFD700;
  font-size: 24px;
  font-weight: bold;
}

.pay-per-game-price .price-original {
  color: #999;
  font-size: 16px;
  text-decoration: line-through;
  margin-right: 8px;
}

.pay-per-game-price .price-discounted {
  color: #FFD700;
  font-size: 24px;
  font-weight: bold;
}

.pay-per-game-description {
  color: #999;
  font-size: 14px;
}

@media (max-width: 600px) {
  .pay-per-game-card {
    flex-direction: column;
    text-align: center;
  }
  
  .game-pass-packs-grid {
    grid-template-columns: 1fr;
  }
}
```

**Add to `index.html` in `<head>` or load via CSS loader:**
```html
<link rel="stylesheet" href="src/game/rendering/ui/game-pass-styles.css">
```

### 3. Initialize Services

**File:** `src/game/systems/ui/menu-service.js` (in `init()` method)

**Add:**
```javascript
init() {
  // ... existing init code ...
  
  // Initialize Game Pass services
  if (window.GamePassService) {
    window.GamePassService.init();
  }
  if (window.GamePassDisplay) {
    window.GamePassDisplay.init();
  }
  if (window.EndDemoModal) {
    window.EndDemoModal.init();
  }
}
```

---

## 🧪 Testing Checklist

### Basic Flow
- [ ] Connect wallet
- [ ] Start game without pass → Should start in demo mode
- [ ] Defeat first boss → Should show End Demo modal
- [ ] Click "Get Game Pass" → Should open store with Game Pass tab
- [ ] Purchase credit pack → Should build transaction
- [ ] Sign transaction → Should complete purchase
- [ ] Check credit display → Should show updated credits
- [ ] Start game with pass → Should consume credit and start full game

### Credit Display
- [ ] Main menu shows credits when pass is active
- [ ] Credits update after purchase
- [ ] Credits update after consumption
- [ ] Credits hidden when no active pass

### Store Integration
- [ ] Store shows Items and Game Pass tabs
- [ ] Game Pass tab shows credit packs
- [ ] Game Pass tab shows pay-per-game option
- [ ] Badge discount applied to prices
- [ ] Current credits displayed in tab

---

## 📝 Notes

- All backend APIs are ready
- Frontend services are complete
- Integration points are documented
- CSS styles need to be added
- Store modal tabs need to be added

Once the CSS and store modal tabs are added, the system will be fully functional!


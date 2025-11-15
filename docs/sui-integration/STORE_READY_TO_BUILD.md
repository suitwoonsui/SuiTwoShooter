# Store Implementation - Ready to Build Checklist

## ✅ Decisions Made (Ready to Implement)

### Architecture Decisions:
1. ✅ **Admin wallet accepts payment and pays gas** - Consistent with pay-to-play
2. ✅ **USD pricing with token conversion** - Supports SUI, $MEWS, future USDC
3. ✅ **Manual refunds** - Case-by-case basis
4. ✅ **No inventory limits** - Unlimited capacity
5. ✅ **Multi-item purchases** - Batch transactions supported
6. ✅ **One item type per game** - Only one item of each type can be selected per game (frontend validation)
7. ✅ **Consumption patterns** - Static start items (game start) vs Consumable power items (when used)
8. ✅ **No locking needed** - Check-out is frontend-only tracking
9. ✅ **No latency in gameplay** - Async blockchain calls, power activates immediately
10. ✅ **Coin Tractor Beam** - Terminology and visual description finalized

### Payment Flow (Recommended - Need Confirmation):
- **Payment Timing:** Option 2 - Create purchase request first, then user sends payment
- **Payment Matching:** Amount + player address + timestamp window
- **Price Conversion:** Lock price at request creation (user pays exact amount)
- **Payment Verification:** Poll admin wallet transactions
- **Multi-Token Wallet:** Single admin wallet (backend tracks token type)

---

## ❓ Questions to Answer Before Phase 5 (Backend API)

### Can Start Phase 1-4 Without These:

**Phase 1-4 (UI, Catalog, Mock Purchase, Game Code):**
- ✅ Can start immediately
- ✅ Don't need payment flow details yet
- ✅ Can use mock data and localStorage

### Need Answers Before Phase 5 (Backend API):

#### 1. Payment Flow UX
**Question:** How should the purchase flow work from user's perspective?

**Recommended Flow:**
```
1. User clicks "Purchase" button
2. Modal shows:
   - Selected items
   - Total price (USD + converted token amount)
   - Admin wallet address (for payment)
   - Payment instructions
3. User sends payment to admin wallet (via their wallet)
4. User clicks "I've Sent Payment" button
5. Backend monitors and matches payment
6. Purchase completes when payment matched
```

**Alternative:** Should we show payment address immediately, or only after clicking purchase?

#### 2. Price Conversion Service
**Question:** Which price API should we use?

**Options:**
- CoinGecko API (free tier available)
- CoinMarketCap API
- Custom solution

**Recommendation:** CoinGecko (free, reliable, supports SUI and tokens)

#### 3. Database for Purchase Requests
**Question:** Do we need a database, or can we use in-memory storage initially?

**Options:**
- PostgreSQL/MySQL (persistent, production-ready)
- SQLite (simple, file-based)
- In-memory (Redis, simple object) - for MVP/testing
- No database (match payments immediately, no queue)

**Recommendation:** Start with in-memory for MVP, add database later if needed

#### 4. Payment Matching Window
**Question:** How long should purchase requests be valid?

**Recommendation:** 10 minutes (allows for blockchain confirmation delays)

#### 5. Admin Wallet Monitoring
**Question:** How often should we poll for new payments?

**Recommendation:** Every 5-10 seconds (balance between responsiveness and API rate limits)

---

## 🚀 Ready to Start: Phase 1 (UI)

**We can start building the store UI now!** 

The following can be built without answering payment flow questions:
- ✅ Store modal/UI
- ✅ Item catalog structure
- ✅ Mock purchase flow (localStorage)
- ✅ Game code integration

**Payment flow questions can be answered as we approach Phase 5 (Backend API).**

---

## 📋 Implementation Phases Summary

### Phase 1: UI Foundation ✅ **COMPLETED**
- Build store modal
- Item catalog display
- **Item selection validation** (one item type per game)
- Mock interactions
- Payment method selector (SUI/MEWS)
- Selected items summary
- **Status:** Fully implemented and tested

### Phase 2: Item Catalog ✅ **COMPLETED**
- Define data structure
- Create catalog file (`item-catalog.js`)
- All 7 item types defined with levels and prices
- **Status:** Fully implemented

### Phase 3: Mock Purchase ✅ **COMPLETED**
- localStorage inventory (`inventory-manager.js`)
- Purchase flow (mock)
- Inventory display with "Owned" badges
- **Status:** Fully implemented and tested

### Phase 4: Game Code ✅ **COMPLETED**
- Implement items in game
- All 7 items fully functional:
  - ✅ Extra Lives (gold hearts)
  - ✅ Force Field (Level 3 with orbiting particles)
  - ✅ Orb Level Start (Level 10 max, power curve mapped)
  - ✅ Coin Tractor Beam (Level 3 pulls power-ups, visual effects)
  - ✅ Slow Time (affects all game elements)
  - ✅ Destroy All Enemies (seeking missiles, magical visuals)
  - ✅ Boss Kill Shot (charge sequence, viewport flash)
- Item consumption flow implemented
- Mobile and desktop consumable footers
- **Status:** Fully implemented and tested

### Phase 5: Backend API ✅ **COMPLETED**
- ✅ Direct on-chain payment flow implemented
- ✅ Price conversion service (CoinGecko + GeckoTerminal + env fallback)
- ✅ All API endpoints implemented and tested
- ✅ Batch consumption support
- ✅ Retry logic for object lock conflicts
- **Status:** Fully implemented and tested

### Phase 6: Smart Contract ✅ **COMPLETED**
- ✅ `premium_store.move` contract deployed
- ✅ All functions implemented (purchase, consume, query, migrate)
- ✅ Events emitted correctly
- ✅ Admin capability system working
- **Status:** Deployed and tested on testnet

### Phase 7: Backend Integration ✅ **COMPLETED**
- ✅ Backend connected to smart contract
- ✅ Transaction building and execution working
- ✅ Error handling and retry logic implemented
- ✅ Package ID management and network sync
- **Status:** Fully integrated and tested

### Phase 8: Frontend Integration ✅ **COMPLETED**
- ✅ Frontend connected to backend API
- ✅ Wallet integration for purchases
- ✅ Transaction signing and execution
- ✅ Batch consumption for start items
- ✅ Network configuration sync
- ✅ Item selection clearing between games
- **Status:** Fully integrated and tested

---

## 🎯 Current Status

**Phases 1-8: ✅ COMPLETED**

All core implementation phases are complete:
1. ✅ Store UI built and functional
2. ✅ Item catalog defined
3. ✅ Mock purchase flow tested
4. ✅ All items integrated into game code
5. ✅ Backend API fully implemented
6. ✅ Smart contract deployed
7. ✅ Backend connected to blockchain
8. ✅ Frontend connected to backend

**Phase 9: ⏳ IN PROGRESS**

Currently working on:
- Final testing and edge cases
- Performance optimization
- Error handling improvements
- UX polish
- Documentation updates

---

## 📝 Quick Answers Needed (Optional - Can Decide Later)

If you want to answer now, these are the key questions:

1. **Payment Flow UX:** Show payment address immediately or after clicking purchase?
2. **Price API:** CoinGecko okay? (or prefer different service?)
3. **Database:** Start with in-memory for MVP, or need persistent storage?
4. **Payment Window:** 10 minutes expiration okay?
5. **Polling Frequency:** Check for payments every 5-10 seconds okay?

**But these can wait!** We can start building the UI now and answer these as we approach backend implementation.

---

**Current Focus: Phase 9 (Polish & Testing)** ✨

Next steps:
- End-to-end testing
- Error handling improvements
- Performance optimization
- UX polish
- Production readiness


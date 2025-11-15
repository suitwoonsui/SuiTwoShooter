# Premium Store Backend API - Implementation Plan

## 🎯 Overview

This document outlines the **implementation plan** for the backend API, based on the decision to use **Direct On-Chain Payment**.

**Status:** Ready for Implementation  
**Payment Flow:** Direct On-Chain Payment (Option B) ✅

---

## 📋 API Endpoints to Implement

### 1. GET `/api/store/items`
**Status:** Ready to implement  
**Purpose:** Get item catalog with current prices

**Implementation:**
- Read from `item-catalog.js` (or database if migrated)
- Convert USD prices to SUI/MEWS using CoinGecko API
- Cache prices for 1-5 minutes
- Return all items with current token prices

**Files to Create:**
- `backend/app/api/store/items/route.ts`

---

### 2. GET `/api/store/inventory/:address`
**Status:** Ready to implement  
**Purpose:** Get player's inventory from blockchain

**Implementation:**
- Query `PlayerInventory` object from blockchain (via Sui Client)
- Parse inventory counts
- Return formatted inventory
- Cache for 10-30 seconds (reduce blockchain queries)

**Files to Create:**
- `backend/app/api/store/inventory/[address]/route.ts`
- `backend/lib/sui/store-service.ts` (new service for store operations)

---

### 3. POST `/api/store/purchase`
**Status:** Ready to implement  
**Purpose:** Build purchase transaction (payment + purchase)

**Implementation:**
1. Validate request (items exist, quantities valid)
2. Calculate total price (USD → token conversion, lock price)
3. Get contract address and object IDs from config
4. Build Sui transaction using `TransactionBuilder`:
   ```typescript
   const txb = new Transaction();
   
   // Transfer payment token from player → contract
   txb.transferObjects([
     txb.splitCoins(txb.gas, [totalTokenAmount])
   ], contractAddress);
   
   // Call purchase_item() function
   txb.moveCall({
     target: `${packageId}::premium_store::purchase_item`,
     arguments: [
       txb.object(contractObjectId),
       txb.pure.address(playerAddress),
       txb.pure.string(itemId),
       txb.pure.u64(level),
       txb.pure.u64(quantity)
     ]
   });
   
   // Set gas budget
   txb.setGasBudget(gasEstimate);
   ```
5. Return unsigned transaction to frontend
6. Frontend signs and submits using wallet API

**Files to Create:**
- `backend/app/api/store/purchase/route.ts`
- `backend/lib/sui/store-service.ts` (add `buildPurchaseTransaction()` method)

**Dependencies:**
- Sui SDK (`@mysten/sui.js`)
- Contract address and object IDs in config
- Price conversion service

---

### 4. GET `/api/store/transaction/:digest` (Optional)
**Status:** Optional  
**Purpose:** Check transaction status

**Implementation:**
- Query transaction from Sui blockchain
- Return transaction status and effects
- Frontend can use this to poll for confirmation

**Files to Create:**
- `backend/app/api/store/transaction/[digest]/route.ts`

**Note:** Frontend can also poll directly using Sui Client, this is optional convenience.

---

### 5. POST `/api/store/consume`
**Status:** Ready to implement  
**Purpose:** Consume items from inventory (admin wallet)

**Implementation:**
- Validate items exist in inventory (query blockchain first)
- Admin wallet calls `consume_item()` on smart contract
- Decrement inventory counts
- Return updated inventory

**Files to Create:**
- `backend/app/api/store/consume/route.ts`
- `backend/lib/sui/store-service.ts` (add `consumeItems()` method)

**Pattern:** Follows score submission pattern (admin signs, admin pays gas)

---

## 🔧 Supporting Services

### 1. Price Conversion Service
**File:** `backend/lib/services/price-converter.ts`

**Implementation:**
```typescript
class PriceConverter {
  private cache: Map<string, { price: number, timestamp: number }>;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  async getTokenPrice(token: 'SUI' | 'MEWS'): Promise<number> {
    // Check cache first
    const cached = this.cache.get(token);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.price;
    }

    // Fetch from CoinGecko
    const price = await this.fetchFromCoinGecko(token);
    
    // Update cache
    this.cache.set(token, { price, timestamp: Date.now() });
    
    return price;
  }

  convertUSDToToken(usdAmount: number, token: 'SUI' | 'MEWS'): Promise<number> {
    // Implementation
  }
}
```

**Features:**
- CoinGecko API integration
- Caching (1-5 minutes)
- Fallback to last known price if API fails
- Error handling and logging

---

### 2. Store Service
**File:** `backend/lib/sui/store-service.ts`

**Methods:**
- `getInventory(playerAddress: string)` - Query inventory from blockchain
- `buildPurchaseTransaction(...)` - Build purchase transaction
- `consumeItems(playerAddress, items)` - Consume items (admin wallet)

**Pattern:** Similar to `AdminWalletService` but for store operations

---

## 📦 Dependencies

### New Dependencies:
- `@mysten/sui.js` - Sui SDK (already have for score submission)
- CoinGecko API client (or use fetch)

### Configuration:
- Contract address: `PREMIUM_STORE_CONTRACT_ADDRESS`
- Package ID: `PREMIUM_STORE_PACKAGE_ID`
- CoinGecko API key (optional, free tier works)

---

## 🔄 Frontend Integration

### Changes Needed in Frontend:

1. **Update `store-ui.js`:**
   - Remove localStorage purchase logic
   - Call `POST /api/store/purchase` to get transaction
   - Use wallet API to sign and submit transaction
   - Poll for transaction confirmation

2. **Update `inventory-manager.js`:**
   - Call `GET /api/store/inventory/:address` instead of localStorage
   - Cache inventory for 10-30 seconds

3. **Add Transaction Handling:**
   - Sign transaction using wallet API
   - Submit transaction to blockchain
   - Poll for confirmation
   - Update UI on success

---

## 🧪 Testing Strategy

### Unit Tests:
- Price conversion service
- Transaction building logic
- Inventory parsing

### Integration Tests:
- API endpoints
- Transaction building and validation
- Inventory queries

### End-to-End Tests:
- Full purchase flow (frontend → backend → blockchain)
- Consumption flow
- Error handling

---

## 📝 Implementation Order

1. **Price Conversion Service** (1-2 hours)
   - CoinGecko integration
   - Caching
   - Error handling

2. **Store Service** (2-3 hours)
   - Inventory query
   - Transaction building
   - Consumption logic

3. **API Endpoints** (3-4 hours)
   - GET /items
   - GET /inventory/:address
   - POST /purchase
   - POST /consume

4. **Frontend Integration** (2-3 hours)
   - Update store UI
   - Wallet integration
   - Transaction handling

5. **Testing** (2-3 hours)
   - Unit tests
   - Integration tests
   - End-to-end tests

**Total Estimated Time:** 10-15 hours

---

## 🚀 Next Steps

1. **Create price conversion service**
2. **Create store service**
3. **Implement API endpoints**
4. **Update frontend**
5. **Test end-to-end**

**Ready to start implementation!** 🎯


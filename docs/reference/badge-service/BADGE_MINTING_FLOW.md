# Badge Minting Flow - Complete Documentation

## Overview

Badge minting is now **fully client-side** with no backend API calls required. The wallet module handles all transaction building, coin selection, and fee calculation.

## Architecture

```
User Click → badge-ui.js → badge-service.js → wallet-api.jsx → Sui Blockchain
```

**No backend involved** - All logic runs in the browser.

## Flow Diagram

```
1. User clicks "Mint Badge ($0.10)"
   ↓
2. badge-ui.js: handleBadgeMint()
   - Validates wallet connection
   - Calls BadgeService.buildMintBadgeTransaction()
   ↓
3. badge-service.js: buildMintBadgeTransaction()
   - Validates wallet API available
   - Validates contract config loaded
   - Calls walletAPIInstance.buildBadgeMintTransaction(address)
   ↓
4. wallet-api.jsx: buildBadgeMintTransaction()
   - Validates contract config
   - Estimates gas: 0.01 SUI
   - Calculates fee: 0.1 SUI - 0.01 SUI = 0.09 SUI
   - Finds coin with ≥0.1 SUI balance
   - Sets coin as gas payment
   - Splits fee amount from coin
   - Constructs image URL: /Badges/Standard.webp
   - Builds transaction with contract addresses
   ↓
5. badge-service.js: signAndExecuteBadgeTransaction()
   - Signs transaction with wallet
   - Executes on Sui blockchain
   ↓
6. Success → Clear cache → Show success message
```

## Key Components

### 1. Contract Configuration (`src/config/contract-config.js`)

Stores contract addresses for client-side transaction building:
- `packageId`: Game contract package ID
- `badgeRegistry`: Badge registry object ID
- `statisticsRegistry`: Statistics registry object ID
- `clock`: Sui Clock object (0x6)

**Network-aware**: Automatically selects testnet/mainnet config based on wallet network.

### 2. Badge Service (`src/game/blockchain/badge-service.js`)

**Functions:**
- `buildMintBadgeTransaction()`: Orchestrates transaction building
- `signAndExecuteBadgeTransaction()`: Signs and executes transaction
- `getBadge()`: Queries player's badge
- `hasBadge()`: Checks if player has badge
- `clearBadgeCache()`: Clears badge cache

**Removed (no longer needed):**
- ❌ `getPaymentCoin()` - Wallet module handles coin selection
- ❌ `calculateMintingFee()` - Fee calculated in wallet module

### 3. Wallet Module (`wallet-module/src/wallet-api.jsx`)

**Function:** `buildBadgeMintTransaction(playerAddress)`

**Process:**
1. Validates contract config
2. Estimates gas: 0.01 SUI (10,000,000 MIST)
3. Calculates fee: 0.1 SUI - gas = 0.09 SUI
4. Finds coin with ≥0.1 SUI balance
5. Sets coin as gas payment
6. Splits fee from coin
7. Constructs image URL
8. Builds transaction

**Transaction Structure:**
```javascript
txb.moveCall({
  target: `${packageId}::badge_system::mint_badge`,
  arguments: [
    badgeRegistry,      // Object reference
    statisticsRegistry, // Object reference
    clock,              // Object reference (0x6)
    feeCoin,           // Split coin (0.09 SUI)
    imageUrl           // String: "/Badges/Standard.webp"
  ]
});
```

### 4. Badge UI (`src/game/systems/ui/badge-ui.js`)

**Function:** `handleBadgeMint()`

**Responsibilities:**
- UI state management (button disabled/loading)
- Error handling and user feedback
- Success flow (clear cache, hide modal)

## Fee Calculation

**Formula:** `fee = totalPayment - gas`

- **Total Payment:** 0.1 SUI (100,000,000 MIST) - Fixed
- **Gas Estimate:** 0.01 SUI (10,000,000 MIST) - Standard
- **Fee Amount:** 0.09 SUI (90,000,000 MIST) - Variable

**Example:**
- If gas = 0.01 SUI → fee = 0.09 SUI ✅
- If gas = 0.015 SUI → fee = 0.085 SUI ✅
- If gas > 0.1 SUI → Error (gas exceeds total) ❌

## Coin Selection

1. Query all SUI coins in wallet
2. Find first coin with balance ≥ 0.1 SUI
3. Use that coin for:
   - Gas payment (set explicitly)
   - Fee splitting (split 0.09 SUI from it)
   - Remainder used for gas automatically

**If no coin found:**
- Check total balance across all coins
- Return error with required vs available amounts

## Error Handling

### Validation Errors
- Wallet not connected
- Contract config not loaded
- Missing contract addresses
- Invalid player address

### Balance Errors
- No SUI coins found
- Insufficient balance (< 0.1 SUI)
- Gas exceeds total payment

### Transaction Errors
- Transaction build failure
- Signing failure
- Execution failure

All errors are caught and displayed to user with clear messages.

## Configuration

### Contract Addresses

**Testnet:**
```javascript
{
  packageId: '0x6df4ec20614cbf2b407de12997bb5fa689f7ec2833a3df3ea84cd9986f3f448d',
  badgeRegistry: '0xe47d097edec0fa01aec081cf8cf59cb9c191fea487ed42daf5fadf24a630a286',
  statisticsRegistry: '0xec2f3ac00be49a5c4f2b2874b15c73e57c0de952b4e59f648b990b704e384571',
  clock: '0x6'
}
```

**Mainnet:**
- TODO: Add when deployed

### Image URL

Constructed from API base URL:
```
${baseUrl}/Badges/Standard.webp
```

Example: `https://sui-two-shooter-backend.vercel.app/Badges/Standard.webp`

## Benefits of Client-Side Approach

1. **No Backend Dependency** - Works offline (after initial load)
2. **Faster** - No API round-trip
3. **Simpler** - Fewer moving parts
4. **More Secure** - No server-side coin validation needed
5. **Better UX** - Immediate feedback

## Testing Checklist

- [ ] Wallet connected
- [ ] Contract config loaded
- [ ] Sufficient SUI balance (≥0.1 SUI)
- [ ] Transaction builds successfully
- [ ] Transaction signs successfully
- [ ] Transaction executes successfully
- [ ] Badge appears in wallet
- [ ] Badge cache cleared after mint

## Troubleshooting

### "Contract configuration not found"
- Ensure `contract-config.js` is loaded in `index.html`
- Check browser console for config initialization logs

### "Insufficient SUI balance"
- User needs at least 0.1 SUI in wallet
- Check total balance across all coins

### "Wallet API not available"
- Ensure wallet module is loaded
- Check wallet connection status

### "Transaction failed"
- Check gas budget is sufficient
- Verify contract addresses are correct
- Check network (testnet vs mainnet)


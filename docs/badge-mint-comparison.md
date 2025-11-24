# Badge Minting: Admin vs Player Flow Comparison

## Key Differences

### 1. **Function Called**
- **Admin**: `admin_mint_badge` - No payment required, admin capability needed
- **Player**: `mint_badge` - Requires payment coin, no admin capability

### 2. **Transaction Building**

#### Admin Mint (Backend):
```typescript
const txb = new Transaction();
txb.moveCall({
  target: `${packageId}::badge_system::admin_mint_badge`,
  arguments: [
    txb.object(adminCapabilityObjectId),  // Admin capability
    txb.object(registryObjectId),         // Badge registry
    txb.object(statsRegistryObjectId),     // Statistics registry
    txb.object('0x6'),                     // Clock
    txb.pure.address(playerAddress),      // Player address (pure)
    txb.pure.u8(tier),                    // Tier (pure)
    txb.pure.string(imageUrl),           // Image URL (pure)
  ],
});
txb.setGasBudget(this.config.sui.gasBudget);
// No gas payment set - wallet auto-selects
```

#### Player Mint (Frontend):
```javascript
const txb = new Transaction();
txb.setGasPayment([paymentCoin.coinObjectId]); // Explicitly set gas coin
const splitFeeCoin = txb.splitCoins(txb.gas, [feeAmount]);
txb.moveCall({
  target: `${packageId}::badge_system::mint_badge`,
  arguments: [
    txb.object(badgeRegistry),      // Badge registry
    txb.object(statisticsRegistry),  // Statistics registry
    txb.object(clock),               // Clock
    splitFeeCoin,                    // Payment coin (split from gas)
    txb.pure.string(imageUrl),       // Image URL
  ],
});
txb.setSender(playerAddress);
txb.setGasBudget(Number(GAS_BUDGET_MIST));
```

### 3. **Contract Function Signatures**

#### `admin_mint_badge`:
```move
public entry fun admin_mint_badge(
    _admin_cap: &AdminCapability,
    registry: &mut BadgeRegistry,
    stats_registry: &StatisticsRegistry,
    clock: &Clock,
    player: address,        // Pure address parameter
    tier: u8,              // Pure tier parameter
    image_url: String,      // Pure string parameter
    ctx: &mut TxContext
)
```

#### `mint_badge`:
```move
public entry fun mint_badge(
    registry: &mut BadgeRegistry,
    stats_registry: &StatisticsRegistry,
    clock: &Clock,
    payment: Coin<SUI>,     // Payment coin (consumed)
    image_url: String,      // Pure string parameter
    ctx: &mut TxContext     // Player is ctx.sender()
)
```

### 4. **Key Differences in Contract Logic**

| Aspect | Admin Mint | Player Mint |
|--------|-----------|-------------|
| Payment | None | Required (validated >= MIN_MINT_FEE_MIST) |
| Player Identity | Passed as `address` parameter | From `tx_context::sender(ctx)` |
| Tier | Can mint any tier (0-5) | Always Standard tier (0) |
| Badge Transfer | Transferred to admin wallet | Transferred to player wallet |
| Validation | Checks admin capability | Checks payment amount |

### 5. **Potential Issues with Player Mint**

The transaction is failing on-chain. Possible causes:

1. **Payment Validation Failure**: 
   - Contract checks: `coin::value(&payment) >= MIN_MINT_FEE_MIST`
   - If the split coin amount is less than minimum, transaction fails

2. **Player Already Has Badge**:
   - Contract checks: `assert!(!has_badge(registry, player), E_PLAYER_ALREADY_HAS_BADGE)`
   - If player already has a badge, transaction fails

3. **Gas Payment Issue**:
   - If the gas payment coin doesn't have enough balance after splitting fee
   - Or if the coin is used incorrectly in the transaction

4. **Clock Object**:
   - Admin uses `'0x6'` (standard Sui Clock)
   - Frontend uses `contracts.clock` from config
   - If this is wrong, transaction fails

5. **Transaction Sender**:
   - Admin: Uses admin wallet keypair directly
   - Player: Uses wallet extension (dapp-kit)
   - If sender doesn't match ctx.sender(), validation fails

## What We Need to Check

1. **Decode the transaction effects** to see the actual error code
2. **Verify the payment coin amount** matches MIN_MINT_FEE_MIST
3. **Check if player already has a badge** (the logs show migration modal, so they might)
4. **Verify clock object ID** is correct
5. **Check transaction sender** matches the player address


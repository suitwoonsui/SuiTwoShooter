# Transaction Deserialization for Store Purchases

## Problem Statement

The backend builds a Sui transaction and serializes it to bytes (base64), but the frontend wallet API expects a `Transaction` object to sign and execute. We need to deserialize the bytes back into a `Transaction` object.

## Current Flow

1. **Backend** (`store-service.ts`):
   - Creates `Transaction` object using `new Transaction()`
   - Builds transaction: `await txb.build({ client: this.client })`
   - Returns `Uint8Array` (serialized bytes)
   - Converts to base64: `Buffer.from(transactionBytes).toString('base64')`
   - Sends base64 string to frontend

2. **Frontend** (`store-ui.js`):
   - Receives base64 string
   - Decodes to `Uint8Array`: `Uint8Array.from(atob(base64), ...)`
   - Needs to deserialize back to `Transaction` object
   - Passes to wallet API: `walletAPIInstance.signAndExecuteTransaction(transaction)`

3. **Wallet API** (`wallet-api.jsx`):
   - Uses `useSignAndExecuteTransaction` from `@mysten/dapp-kit`
   - Expects a `Transaction` object (or `TransactionBlock` in older versions)

## The Challenge

**Sui SDK Versions:**
- **Old API**: `TransactionBlock` (deprecated)
- **New API**: `Transaction` (current)

**@mysten/dapp-kit Compatibility:**
- May support both `Transaction` and `TransactionBlock`
- Needs to deserialize bytes to the correct type

## Solution Options

### Option 1: Deserialize in Frontend (Recommended)

**If Sui SDK is available in frontend:**

```javascript
import { Transaction } from '@mysten/sui/transactions';

// In store-ui.js
const transactionBytes = Uint8Array.from(atob(purchaseData.transaction), c => c.charCodeAt(0));
const transaction = Transaction.fromBytes(transactionBytes);
const signResult = await window.walletAPIInstance.signAndExecuteTransaction(transaction);
```

**Pros:**
- Clean separation of concerns
- Backend doesn't need to know about frontend wallet details
- Standard approach

**Cons:**
- Requires Sui SDK in frontend (adds bundle size)
- Need to ensure SDK version compatibility

### Option 2: Return Transaction JSON Instead of Bytes

**Backend returns transaction data as JSON:**

```typescript
// Backend: Instead of serializing, return transaction data
return {
  success: true,
  transaction: {
    kind: 'moveCall',
    data: {
      package: packageId,
      module: 'premium_store',
      function: 'purchase_item',
      arguments: [...],
      // ... other transaction data
    }
  },
  // ... other fields
};
```

**Frontend builds transaction from JSON:**

```javascript
import { Transaction } from '@mysten/sui/transactions';

const txb = new Transaction();
// Rebuild transaction from JSON data
txb.moveCall({
  target: `${data.transaction.data.package}::${data.transaction.data.module}::${data.transaction.data.function}`,
  arguments: data.transaction.data.arguments,
  // ...
});

const signResult = await window.walletAPIInstance.signAndExecuteTransaction(txb);
```

**Pros:**
- No deserialization needed
- More readable/debuggable
- Can validate transaction structure before signing

**Cons:**
- More complex - need to rebuild transaction
- Larger payload size
- Need to handle all transaction types

### Option 3: Use TransactionBlock (Legacy)

**If @mysten/dapp-kit still uses TransactionBlock:**

```typescript
// Backend: Use TransactionBlock instead
import { TransactionBlock } from '@mysten/sui/transactions';

const txb = new TransactionBlock();
// ... build transaction
const bytes = await txb.build({ client: this.client });
```

**Frontend:**

```javascript
import { TransactionBlock } from '@mysten/sui/transactions';

const transactionBytes = Uint8Array.from(atob(purchaseData.transaction), c => c.charCodeAt(0));
const transactionBlock = TransactionBlock.fromBytes(transactionBytes);
const signResult = await window.walletAPIInstance.signAndExecuteTransaction(transactionBlock);
```

**Pros:**
- Works with older wallet adapters
- Well-documented

**Cons:**
- Uses deprecated API
- May not work with newer Sui features

### Option 4: Wallet API Handles Deserialization

**Update wallet API to accept bytes and deserialize internally:**

```javascript
// wallet-api.jsx
async signAndExecuteTransaction(transactionBytes) {
  // Check if it's already a Transaction object
  if (transactionBytes instanceof Transaction) {
    transaction = transactionBytes;
  } else {
    // Deserialize bytes
    const bytes = transactionBytes instanceof Uint8Array 
      ? transactionBytes 
      : Uint8Array.from(atob(transactionBytes), c => c.charCodeAt(0));
    
    // Try Transaction first (new API), fallback to TransactionBlock
    try {
      const { Transaction } = await import('@mysten/sui/transactions');
      transaction = Transaction.fromBytes(bytes);
    } catch {
      const { TransactionBlock } = await import('@mysten/sui/transactions');
      transaction = TransactionBlock.fromBytes(bytes);
    }
  }
  
  // Sign and execute
  const result = await walletAPIState._signAndExecuteTransaction.mutateAsync({
    transaction: transaction,
    // ...
  });
}
```

**Pros:**
- Frontend doesn't need to know about deserialization
- Centralized logic
- Handles both Transaction and TransactionBlock

**Cons:**
- Requires updating wallet API
- Need to ensure SDK is available in wallet module

## Recommended Approach

**For MVP: Option 4 (Wallet API handles deserialization)**

1. Update `wallet-api.jsx` to accept bytes and deserialize internally
2. This keeps the frontend store code simple
3. Centralizes transaction handling logic
4. Can handle both Transaction and TransactionBlock for compatibility

**Implementation Steps:**

1. Update `wallet-api.jsx`:
   ```javascript
   async signAndExecuteTransaction(transactionInput) {
     let transaction;
     
     // If already a Transaction object, use it
     if (transactionInput && typeof transactionInput === 'object' && 'kind' in transactionInput) {
       transaction = transactionInput;
     } else {
       // Deserialize bytes
       const bytes = transactionInput instanceof Uint8Array
         ? transactionInput
         : Uint8Array.from(atob(transactionInput), c => c.charCodeAt(0));
       
       // Import and deserialize
       const { Transaction } = await import('@mysten/sui/transactions');
       transaction = Transaction.fromBytes(bytes);
     }
     
     // Sign and execute
     const result = await walletAPIState._signAndExecuteTransaction.mutateAsync({
       transaction: transaction,
       options: { showEffects: true, showEvents: true }
     });
     
     return {
       success: true,
       digest: result.digest,
       effects: result.effects,
       events: result.events
     };
   }
   ```

2. Update `store-ui.js`:
   ```javascript
   // Simply pass the bytes - wallet API will deserialize
   const transactionBytes = Uint8Array.from(atob(purchaseData.transaction), c => c.charCodeAt(0));
   const signResult = await window.walletAPIInstance.signAndExecuteTransaction(transactionBytes);
   ```

## Testing

After implementation, test:
1. Transaction bytes are correctly deserialized
2. Wallet can sign the deserialized transaction
3. Transaction executes successfully on blockchain
4. Error handling for invalid bytes

## References

- [Sui Transaction API](https://sui-typescript-docs.vercel.app/transactions)
- [@mysten/dapp-kit Documentation](https://sui-typescript-docs.vercel.app/dapp-kit)
- [Transaction Serialization](https://sui-typescript-docs.vercel.app/transactions/building-transactions)


# Wallet Connection Examples

## Overview
This directory contains comprehensive examples of **wallet integration** with Sui blockchain using Next.js and TypeScript. Learn how to connect wallets, handle transactions, and manage user authentication.

## 🎯 Learning Objectives
- **Wallet Integration**: Connect various Sui wallets
- **Transaction Handling**: Sign and submit transactions
- **User Authentication**: Manage user sessions
- **Error Handling**: Graceful error management
- **State Management**: Wallet state persistence

## 📋 Key Concepts Demonstrated

### 1. **Wallet Connection**
```typescript
const { wallets, currentWallet, selectWallet, disconnect } = useWalletKit();
```
- **Multi-Wallet Support**: Connect to various Sui wallets
- **Wallet Selection**: Choose preferred wallet
- **Connection State**: Track connection status
- **Auto-Reconnection**: Persistent connections

### 2. **Transaction Signing**
```typescript
const txb = new TransactionBlock();
const result = await signAndExecuteTransactionBlock({
    transactionBlock: txb,
    options: { showEffects: true }
});
```
- **Transaction Building**: Create transaction blocks
- **Signing Process**: User wallet signing
- **Execution**: Submit to blockchain
- **Result Handling**: Process transaction outcomes

### 3. **User Authentication**
```typescript
const { currentAccount } = useCurrentAccount();
const isConnected = !!currentAccount;
```
- **Account Management**: Track current user account
- **Connection Status**: Monitor wallet state
- **Address Retrieval**: Get user wallet address
- **Session Persistence**: Maintain connection state

## 🏗️ Implementation Architecture

### **Core Components**
- `WalletConnection.tsx`: Main wallet connection component
- `WalletContext.tsx`: Wallet state management
- `useWalletKit`: Sui wallet integration hook
- `useCurrentAccount`: Current account management

### **Key Features**
- **Multi-Wallet Support**: Sui Wallet, Suiet, etc.
- **Transaction Signing**: Secure transaction execution
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during operations

## 🔒 Security Features

### **Wallet Security**
- **User-Controlled**: Private keys stay in user's wallet
- **No Key Storage**: Never store private keys
- **Secure Signing**: All transactions signed by user
- **Permission-Based**: User approves all actions

### **Transaction Safety**
- **User Confirmation**: All transactions require user approval
- **Gas Estimation**: Automatic gas calculation
- **Error Prevention**: Validation before submission
- **Rollback Support**: Failed transaction handling

## 🚀 Usage Examples

### **Connecting a Wallet**
```typescript
import { WalletConnection } from '@/components/WalletConnection';

function App() {
    return (
        <div>
            <WalletConnection />
        </div>
    );
}
```

### **Signing a Transaction**
```typescript
const handleTransaction = async () => {
    try {
        const txb = new TransactionBlock();
        // Add transaction operations
        txb.transferObjects([coin], recipient);
        
        const result = await signAndExecuteTransactionBlock({
            transactionBlock: txb,
            options: { showEffects: true }
        });
        
        console.log('Transaction successful:', result);
    } catch (error) {
        console.error('Transaction failed:', error);
    }
};
```

### **Checking Connection Status**
```typescript
const { currentAccount } = useCurrentAccount();
const isConnected = !!currentAccount;

if (isConnected) {
    console.log('Connected to:', currentAccount.address);
} else {
    console.log('Not connected to wallet');
}
```

## 🎓 Educational Value

This implementation teaches:
- **Wallet Integration**: Connecting to Sui wallets
- **Transaction Management**: Building and signing transactions
- **State Management**: Managing wallet connection state
- **Error Handling**: Graceful error management
- **User Experience**: Creating smooth wallet interactions

## 🔧 Customization Ideas

- **Custom Wallets**: Add support for new wallet types
- **Transaction Templates**: Pre-built transaction types
- **Batch Transactions**: Multiple operations in one transaction
- **Gas Optimization**: Advanced gas management
- **Transaction History**: Track user transaction history

## 📊 Features

### **Wallet Management**
- Connect to multiple wallet types
- Switch between connected wallets
- Disconnect and reconnect
- Wallet status monitoring

### **Transaction Features**
- Build complex transactions
- Sign and execute transactions
- Handle transaction results
- Error recovery

### **User Experience**
- Loading states and feedback
- Error messages and recovery
- Connection persistence
- Smooth wallet interactions

## 🎯 Use Cases

### **DeFi Applications**
- Token swaps and transfers
- Liquidity provision
- Yield farming
- Staking operations

### **NFT Platforms**
- NFT minting and trading
- Marketplace interactions
- Collection management
- Royalty distribution

### **Gaming Applications**
- In-game asset management
- Player rewards
- Tournament participation
- Achievement systems

## 📚 Related Examples

- **Contract Interaction**: Uses wallet for contract calls
- **Session Management**: Integrates with user sessions
- **Statistics System**: Tracks user activity

This implementation serves as a foundation for any Sui application requiring wallet integration, transaction management, and user authentication.
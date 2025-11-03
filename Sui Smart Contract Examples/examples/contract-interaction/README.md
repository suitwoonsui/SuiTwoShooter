# Contract Interaction Examples

## Overview
This directory contains comprehensive examples of **smart contract interaction** with Sui blockchain using Next.js and TypeScript. Learn how to call contract functions, handle responses, and manage contract state.

## 🎯 Learning Objectives
- **Contract Calls**: Interact with deployed smart contracts
- **Function Invocation**: Call contract functions with parameters
- **Response Handling**: Process contract responses and events
- **Error Management**: Handle contract call failures
- **State Updates**: Manage contract state changes

## 📋 Key Concepts Demonstrated

### 1. **Contract Function Calls**
```typescript
const txb = new TransactionBlock();
txb.moveCall({
    target: `${PACKAGE_ID}::session_management::start_session`,
    arguments: [txb.object(CLOCK_OBJECT_ID)]
});
```
- **Move Call Integration**: Call Sui Move functions
- **Parameter Passing**: Pass arguments to contract functions
- **Object References**: Reference shared objects
- **Transaction Building**: Build complex transaction blocks

### 2. **Contract State Queries**
```typescript
const { data: sessionData } = useSuiClientQuery('getObject', {
    id: sessionId,
    options: { showContent: true }
});
```
- **Object Queries**: Retrieve contract objects
- **State Reading**: Read contract state
- **Real-Time Updates**: React to state changes
- **Data Processing**: Parse contract responses

### 3. **Event Handling**
```typescript
const { data: events } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::session_management::SessionStarted` }
});
```
- **Event Queries**: Listen to contract events
- **Real-Time Monitoring**: Track contract activity
- **Event Processing**: Parse and handle events
- **User Notifications**: Notify users of changes

## 🏗️ Implementation Architecture

### **Core Components**
- `ContractInteraction.tsx`: Main contract interaction component
- `useSuiClient`: Sui client integration
- `useSuiClientQuery`: Contract data queries
- `TransactionBlock`: Transaction building

### **Key Features**
- **Function Calls**: Call any contract function
- **State Queries**: Read contract state
- **Event Monitoring**: Track contract events
- **Error Handling**: Graceful error management

## 🔒 Security Features

### **Transaction Security**
- **User Approval**: All transactions require user approval
- **Parameter Validation**: Validate function parameters
- **Gas Estimation**: Automatic gas calculation
- **Error Prevention**: Prevent invalid transactions

### **Data Integrity**
- **State Validation**: Verify contract state
- **Event Verification**: Validate event data
- **Response Processing**: Safe data handling
- **Error Recovery**: Handle failed operations

## 🚀 Usage Examples

### **Starting a Session**
```typescript
const handleStartSession = async () => {
    try {
        const txb = new TransactionBlock();
        txb.moveCall({
            target: `${PACKAGE_ID}::session_management::start_session`,
            arguments: [txb.object(CLOCK_OBJECT_ID)]
        });

        const result = await signAndExecuteTransactionBlock({
            transactionBlock: txb,
            options: { showEffects: true }
        });

        console.log('Session started:', result);
    } catch (error) {
        console.error('Failed to start session:', error);
    }
};
```

### **Submitting a Score**
```typescript
const handleSubmitScore = async (score: number, level: number) => {
    try {
        const txb = new TransactionBlock();
        txb.moveCall({
            target: `${PACKAGE_ID}::session_management::submit_score`,
            arguments: [
                txb.object(sessionId),
                txb.object(statisticsSystemId),
                txb.pure.u64(score),
                txb.pure.u8(level),
                txb.object(CLOCK_OBJECT_ID)
            ]
        });

        const result = await signAndExecuteTransactionBlock({
            transactionBlock: txb,
            options: { showEffects: true }
        });

        console.log('Score submitted:', result);
    } catch (error) {
        console.error('Failed to submit score:', error);
    }
};
```

### **Querying User Statistics**
```typescript
const { data: userStats } = useSuiClientQuery('getObject', {
    id: userStatsId,
    options: { showContent: true }
});

if (userStats?.data?.content) {
    const stats = userStats.data.content.fields;
    console.log('User stats:', stats);
}
```

### **Monitoring Events**
```typescript
const { data: events } = useSuiClientQuery('queryEvents', {
    query: { 
        MoveEventType: `${PACKAGE_ID}::session_management::SessionStarted` 
    }
});

useEffect(() => {
    if (events?.data) {
        events.data.forEach(event => {
            console.log('New session started:', event);
        });
    }
}, [events]);
```

## 🎓 Educational Value

This implementation teaches:
- **Contract Integration**: Interacting with Sui Move contracts
- **Transaction Management**: Building and executing transactions
- **State Management**: Reading and updating contract state
- **Event Handling**: Monitoring contract events
- **Error Management**: Handling contract call failures

## 🔧 Customization Ideas

- **Custom Functions**: Add new contract function calls
- **Batch Operations**: Multiple function calls in one transaction
- **State Caching**: Cache contract state for performance
- **Event Filters**: Filter events by specific criteria
- **Transaction Templates**: Pre-built transaction patterns

## 📊 Features

### **Contract Functions**
- Call any contract function
- Pass complex parameters
- Handle function responses
- Manage function errors

### **State Management**
- Read contract objects
- Monitor state changes
- Update local state
- Cache contract data

### **Event System**
- Monitor contract events
- Process event data
- Update UI based on events
- Handle event errors

## 🎯 Use Cases

### **DeFi Applications**
- Token contract interactions
- Liquidity pool operations
- Yield farming contracts
- Staking mechanisms

### **NFT Platforms**
- NFT contract calls
- Marketplace interactions
- Collection management
- Royalty distribution

### **Gaming Applications**
- Game contract interactions
- Player progress tracking
- Achievement systems
- Reward distribution

## 📚 Related Examples

- **Wallet Connection**: Uses wallet for contract calls
- **Session Management**: Integrates with session contracts
- **Statistics System**: Tracks user statistics

This implementation serves as a foundation for any Sui application requiring smart contract interaction, state management, and event handling.
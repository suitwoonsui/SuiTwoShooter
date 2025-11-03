# Sui Smart Contract Examples

A comprehensive repository demonstrating real-world Sui Move smart contract patterns, Next.js frontend integration, and wallet connectivity. This repository serves as both a learning resource and a practical reference for blockchain developers.

## 🎯 Learning Objectives

By studying these examples, you will learn:

- **Smart Contract Architecture**: Modular, maintainable smart contract design patterns
- **Sui Object Model**: Understanding UID, key abilities, and object ownership
- **Payment Processing**: Handling SUI token payments and refunds
- **State Management**: Using Tables, shared objects, and capabilities
- **Security Patterns**: Anti-cheat mechanisms, access control, and validation
- **Event Systems**: Emitting events for transparency and frontend integration
- **Administrative Controls**: Managing system parameters and emergency functions
- **Wallet Integration**: Connecting wallets, signing transactions, and managing accounts
- **Frontend-Blockchain Integration**: Next.js + TypeScript + Sui patterns

## 📚 Smart Contract Examples

### 1. **Session Management System** (`contracts/examples/session-management/`)
**Concepts**: Session lifecycle, anti-cheat validation, time-based mechanics

**Key Features**:
- Game session creation and management
- Anti-cheat validation (rate limiting, duration checks)
- Event emission for session lifecycle
- Integration with scoring system

**Learning Points**:
- How to validate user actions against realistic constraints
- Time-based validation using Sui's Clock object
- Session ownership and security

### 2. **Statistics & Scoring System** (`contracts/examples/statistics-system/`)
**Concepts**: Complex state management, skill tier calculation, leaderboards

**Key Features**:
- Player statistics tracking (personal bests, averages)
- Dynamic skill tier calculation
- Comprehensive event system
- Authorized contract access control

**Learning Points**:
- Managing complex player data structures
- Calculating dynamic metrics and tiers
- Implementing access control patterns
- Event-driven architecture

### 3. **Administrative System** (`contracts/examples/admin-controls/`)
**Concepts**: Administrative controls, parameter management, capability patterns

**Key Features**:
- Admin-only parameter updates
- Game configuration management
- Event logging for administrative actions

**Learning Points**:
- Implementing administrative capabilities
- Managing system-wide parameters
- Audit trails through events

### 4. **Game Pass System** (`contracts/examples/nft-payments/`)
**Concepts**: NFT creation, payment processing, subscription models

**Key Features**:
- NFT-based game pass creation
- SUI token payment processing
- Multiple pass tiers and pricing
- Credit consumption and validation

**Learning Points**:
- Creating and managing NFTs
- Processing cryptocurrency payments
- Implementing subscription-based models
- Cross-object access patterns

## 🔧 Frontend Integration Examples

### **Wallet Connection** (`examples/wallet-connection/`)
- Sui wallet integration using `@mysten/dapp-kit`
- Account management and balance checking
- Transaction signing and execution
- Error handling and user experience patterns

### **Contract Interaction** (`examples/contract-interaction/`)
- Calling smart contract functions from Next.js
- Reading contract state and object data
- Building complex transactions
- Type-safe contract interactions

### **Transaction Examples** (`examples/transaction-examples/`)
- Multi-step transaction patterns
- Payment processing workflows
- Batch operations and gas optimization
- Transaction monitoring and status tracking

### **Event Monitoring** (`examples/event-monitoring/`)
- Real-time contract event listening
- Event filtering and processing
- Frontend state synchronization
- Error handling and reconnection logic

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Sui CLI installed and configured
- Basic understanding of TypeScript and React
- Sui testnet coins for deployment

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd sui-smart-contract-examples

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Smart Contract Deployment
```bash
# Navigate to contracts directory
cd contracts/InsomniaGame

# Build contracts
sui move build

# Deploy to testnet
sui client publish --gas-budget 10000000

# Initialize systems
sui client call --package <PACKAGE_ID> --module score_system --function init --gas-budget 1000000
sui client call --package <PACKAGE_ID> --module admin_system --function init --gas-budget 1000000
sui client call --package <PACKAGE_ID> --module game_pass --function init --gas-budget 1000000
```

## 📖 Study Guide

### **Beginner Level**
1. Start with `AdminSystem.move` - simplest contract with basic admin patterns
2. Study `GameCore.move` - learn session management and validation
3. Explore wallet connection examples
4. Deploy contracts and test basic functionality

### **Intermediate Level**
1. Explore `ScoreSystem.move` - complex state management and calculations
2. Understand the event system and how contracts communicate
3. Practice contract interaction patterns
4. Implement custom skill tier calculations

### **Advanced Level**
1. Master `GamePass.move` - NFT creation and payment processing
2. Study cross-contract interactions and shared object patterns
3. Build complex frontend integrations
4. Implement your own extensions and modifications

## 🛠️ Development Workflow

1. **Study**: Read the contract code and documentation
2. **Deploy**: Use the deployment guides to deploy on testnet
3. **Test**: Interact with contracts using the provided examples
4. **Modify**: Experiment with parameters and logic
5. **Extend**: Build your own features on top of the examples

## 📁 Repository Structure

```
Sui Smart Contract Examples/
├── contracts/
│   ├── examples/                    # Educational smart contract examples
│   │   ├── session-management/     # GameCore contract + docs
│   │   ├── statistics-system/      # ScoreSystem contract + docs  
│   │   ├── admin-controls/         # AdminSystem contract + docs
│   │   └── nft-payments/          # GamePass contract + docs
│   ├── InsomniaGame/              # Original contract source
│   ├── deployment/                # Deployment scripts & guides
│   ├── interactions/              # Example interactions & tests
│   └── documentation/             # Comprehensive tutorials
├── src/                           # Next.js frontend
│   ├── contexts/
│   │   └── WalletContext.tsx      # Wallet connection context
│   ├── lib/
│   │   └── services/
│   │       └── wallet/            # Wallet utilities
│   ├── hooks/
│   │   └── wallet/               # Wallet hooks
│   └── components/
│       └── wallet/               # Wallet interaction components
├── examples/                      # Complete integration examples
│   ├── wallet-connection/         # Wallet setup and connection
│   ├── contract-interaction/     # Calling smart contract functions
│   ├── transaction-examples/     # Transaction patterns
│   └── event-monitoring/         # Listening to contract events
└── README.md                      # This file
```

## 🔗 Additional Resources

- [Sui Documentation](https://docs.sui.io/)
- [Move Language Book](https://move-language.github.io/move/)
- [Sui Examples Repository](https://github.com/MystenLabs/sui/tree/main/sui_programmability/examples)
- [DappKit Documentation](https://docs.sui.io/guides/developer/getting-started/dapp-kit)

## 🤝 Contributing

Contributions are welcome! Please feel free to:
- Add new smart contract examples
- Improve documentation and explanations
- Create additional integration examples
- Share your own modifications and extensions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you have questions or need help:
- Check the documentation in each example directory
- Review the code comments and examples
- Open an issue for specific problems
- Join the Sui developer community for broader support

---

**Happy coding! 🚀**
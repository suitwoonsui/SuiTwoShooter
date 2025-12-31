# 🏗️ INSOMNIA GAME - REFACTORING PLAN
## Modularization & Separation of Concerns

---

## 📋 **EXECUTIVE SUMMARY**

This document outlines a comprehensive refactoring plan to improve the Insomnia game project's architecture by implementing proper modularization, separation of concerns, and a clean service layer. The goal is to prevent future code loss and create a maintainable, scalable codebase.

---

## 🚨 **CURRENT ISSUES IDENTIFIED**

### **1. Monolithic Architecture**
- **`blockchain.ts`**: 624 lines doing too many things
- **Mixed responsibilities**: Business logic, blockchain operations, and configuration all in one file
- **Tight coupling**: Components directly importing from large files

### **2. Poor Separation of Concerns**
- **No clear service layer**: Business logic scattered throughout
- **Configuration hardcoded**: Network config mixed with business logic
- **Type definitions scattered**: Interfaces mixed with implementation

### **3. Maintenance Challenges**
- **Difficult to test**: Large files with multiple responsibilities
- **Hard to debug**: Logic spread across multiple concerns
- **Risk of code loss**: Large files make it easy to accidentally delete working code

---

## 🎯 **REFACTORING OBJECTIVES**

1. **🔄 Single Responsibility Principle** - Each file has one clear purpose
2. **🧩 Modularity** - Easy to import only what you need
3. **🔧 Maintainability** - Changes isolated to specific modules
4. **🧪 Testability** - Each service can be tested independently
5. **📚 Reusability** - Services can be reused across components
6. **⚙️ Configuration Management** - Centralized config, easy to change
7. **📖 Documentation** - Clear structure makes code self-documenting

---

## 🏛️ **PROPOSED NEW STRUCTURE**

```
src/
├── lib/
│   ├── config/                          # Configuration Management
│   │   ├── networks.ts                  # Network configurations
│   │   ├── contracts.ts                 # Contract addresses & ABIs
│   │   ├── constants.ts                 # App constants
│   │   └── index.ts                     # Config exports
│   ├── types/                           # Type Definitions
│   │   ├── blockchain.ts                # Blockchain-related types
│   │   ├── game.ts                      # Game-related types
│   │   ├── wallet.ts                    # Wallet-related types
│   │   └── index.ts                     # Type exports
│   ├── services/                        # Business Logic Layer
│   │   ├── blockchain/
│   │   │   ├── base.ts                  # Base blockchain service
│   │   │   ├── gamePass.ts              # GamePass operations
│   │   │   ├── scoreSystem.ts           # Score operations
│   │   │   ├── adminSystem.ts           # Admin operations
│   │   │   └── index.ts                 # Service exports
│   │   ├── game/
│   │   │   ├── gameState.ts             # Game state management
│   │   │   ├── audio.ts                 # Audio management
│   │   │   ├── leaderboard.ts           # Leaderboard operations
│   │   │   └── index.ts                 # Game service exports
│   │   └── wallet/
│   │       ├── walletService.ts         # Wallet operations
│   │       └── index.ts                 # Wallet service exports
│   ├── utils/                           # Utility Functions
│   │   ├── blockchain.ts                # Blockchain utilities
│   │   ├── formatting.ts                # Data formatting
│   │   ├── validation.ts                # Input validation
│   │   └── index.ts                     # Utility exports
│   └── providers/                       # Context Providers
│       ├── blockchainProvider.tsx       # Blockchain context
│       ├── gameProvider.tsx             # Game context
│       └── index.ts                     # Provider exports
├── hooks/                               # Custom Hooks
│   ├── blockchain/
│   │   ├── useGamePass.ts               # GamePass hooks
│   │   ├── useScoreSystem.ts            # Score system hooks
│   │   └── index.ts                     # Hook exports
│   ├── game/
│   │   ├── useGameState.ts              # Game state hooks
│   │   ├── useGameAudio.ts              # Audio hooks
│   │   └── index.ts                     # Game hook exports
│   └── wallet/
│       ├── useWallet.ts                 # Wallet hooks
│       └── index.ts                     # Wallet hook exports
└── contexts/                            # React Contexts (Simplified)
    ├── WalletContext.tsx                # Simplified wallet context
    ├── GameContext.tsx                  # Unified game context
    └── ThemeContext.tsx                 # Theme context
```

---

## 🔄 **MIGRATION STRATEGY**

### **Phase 1: Foundation & Types** ⏱️ **Week 1**
- [ ] Create new directory structure
- [ ] Extract and organize type definitions
- [ ] Create configuration management system
- [ ] Set up base interfaces and contracts

### **Phase 2: Service Extraction** ⏱️ **Week 2**
- [ ] Extract GamePass service from blockchain.ts
- [ ] Extract ScoreSystem service from blockchain.ts
- [ ] Extract AdminSystem service from blockchain.ts
- [ ] Create base blockchain service class

### **Phase 3: Context Refactoring** ⏱️ **Week 3**
- [ ] Refactor WalletContext to use new services
- [ ] Refactor GameModeContext to use new services
- [ ] Create unified GameContext
- [ ] Update context providers

### **Phase 4: Component Updates** ⏱️ **Week 4**
- [ ] Update components to use new service layer
- [ ] Implement proper error boundaries
- [ ] Add loading states and error handling
- [ ] Update import statements throughout

### **Phase 5: Testing & Cleanup** ⏱️ **Week 5**
- [ ] Test all functionality
- [ ] Remove old files
- [ ] Update documentation
- [ ] Performance optimization

---

## 🧩 **DETAILED MODULE BREAKDOWN**

### **1. Configuration Layer (`/lib/config/`)**

#### **networks.ts**
```typescript
export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: { /* config */ },
  testnet: { /* config */ },
  devnet: { /* config */ },
  localnet: { /* config */ }
};
```

#### **contracts.ts**
```typescript
export interface ContractConfig {
  packageId: string;
  modules: {
    gameCore: string;
    scoreSystem: string;
    adminSystem: string;
    gamePass: string;
  };
  systemIds: {
    scoreSystem: string;
    adminSystem: string;
    gamePassSystem: string;
    clock: string;
  };
}
```

### **2. Service Layer (`/lib/services/`)**

#### **Base Blockchain Service**
```typescript
export abstract class BaseBlockchainService {
  protected client: SuiClient;
  protected config: ContractConfig;
  
  constructor(config: ContractConfig) {
    this.config = config;
    this.client = new SuiClient({ url: this.getNetworkUrl() });
  }
  
  protected abstract getNetworkUrl(): string;
}
```

#### **GamePass Service**
```typescript
export class GamePassService extends BaseBlockchainService {
  async purchaseGamePass(passType: PassType): Promise<TransactionResult>;
  async getGamePassStatus(playerAddress: string): Promise<GamePass | null>;
  async consumeGameCredit(gamePassId: string): Promise<boolean>;
}
```

### **3. Hook Layer (`/hooks/`)**

#### **useGamePass Hook**
```typescript
export const useGamePass = () => {
  const [gamePass, setGamePass] = useState<GamePass | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const purchasePass = useCallback(async (passType: PassType) => {
    // Implementation using GamePassService
  }, []);
  
  return { gamePass, isLoading, purchasePass };
};
```

---

## 🔧 **IMPLEMENTATION PRINCIPLES**

### **1. Dependency Injection**
- Services receive dependencies via constructor
- Easy to mock for testing
- Clear dependency graph

### **2. Interface Segregation**
- Small, focused interfaces
- No fat interfaces
- Clear contracts between modules

### **3. Factory Pattern**
- Service creation with proper configuration
- Centralized instantiation
- Easy to swap implementations

### **4. Error Boundaries**
- Proper error handling at service level
- User-friendly error messages
- Graceful degradation

### **5. Type Safety**
- Strong typing throughout the system
- No `any` types
- Comprehensive interface definitions

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests**
- Each service tested independently
- Mocked dependencies
- Clear test coverage

### **Integration Tests**
- Service interaction testing
- End-to-end workflows
- Real blockchain interactions (testnet)

### **Component Tests**
- React component testing
- Hook testing
- Context testing

---

## 📊 **SUCCESS METRICS**

### **Code Quality**
- [ ] Reduce file sizes to <200 lines
- [ ] Achieve >90% test coverage
- [ ] Zero `any` types
- [ ] Clear separation of concerns

### **Maintainability**
- [ ] Easy to locate specific functionality
- [ ] Clear dependency relationships
- [ ] Simple to add new features
- [ ] Easy to debug issues

### **Performance**
- [ ] No unnecessary re-renders
- [ ] Efficient service instantiation
- [ ] Optimized bundle size
- [ ] Fast development builds

---

## 🚀 **BENEFITS OF REFACTORING**

### **Immediate Benefits**
1. **Easier debugging** - Issues isolated to specific modules
2. **Better code organization** - Clear file structure
3. **Improved developer experience** - Easy to find and modify code

### **Long-term Benefits**
1. **Scalability** - Easy to add new features
2. **Team collaboration** - Clear ownership and responsibilities
3. **Code reuse** - Services can be shared across components
4. **Testing** - Each module can be tested independently

### **Risk Mitigation**
1. **Prevent code loss** - Small, focused files
2. **Easier rollbacks** - Changes isolated to specific modules
3. **Better error handling** - Proper error boundaries
4. **Configuration management** - Easy to change settings

---

## ⚠️ **RISKS & MITIGATION**

### **Risks**
1. **Breaking changes** during refactoring
2. **Temporary functionality loss**
3. **Increased complexity** during transition

### **Mitigation Strategies**
1. **Incremental refactoring** - One module at a time
2. **Comprehensive testing** - Verify functionality at each step
3. **Rollback plan** - Git branches for each phase
4. **Documentation** - Clear migration guides

---

## 📅 **TIMELINE & MILESTONES**

| Week | Phase | Deliverables | Success Criteria |
|------|-------|--------------|------------------|
| 1 | Foundation | Directory structure, types, config | All types extracted and organized |
| 2 | Services | Service layer implementation | All blockchain operations working |
| 3 | Contexts | Refactored React contexts | All contexts using new services |
| 4 | Components | Updated components | All functionality preserved |
| 5 | Testing | Testing and cleanup | 90%+ test coverage, clean codebase |

---

## 🎯 **NEXT STEPS**

1. **Review this plan** - Ensure alignment with project goals
2. **Approve timeline** - Confirm 5-week schedule
3. **Begin Phase 1** - Start with foundation and types
4. **Regular check-ins** - Weekly progress reviews
5. **Testing at each phase** - Verify functionality preservation

---

## 📞 **CONTACT & SUPPORT**

- **Project Lead**: [Your Name]
- **Technical Lead**: [Technical Lead Name]
- **Review Schedule**: Weekly on [Day] at [Time]
- **Document Version**: 1.0
- **Last Updated**: [Current Date]

---

*This refactoring plan represents a significant investment in the long-term health and maintainability of the Insomnia game project. The modular architecture will prevent future code loss and create a foundation for scalable development.*

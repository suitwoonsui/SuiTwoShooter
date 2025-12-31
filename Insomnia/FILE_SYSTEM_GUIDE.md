# 📁 **INSOMNIA GAME - FILE SYSTEM GUIDE**

## 📋 **OVERVIEW**

This document provides a comprehensive guide to the Insomnia Game project file system, explaining the purpose and organization of every file and directory. The project follows a modular, feature-based architecture with clear separation of concerns.

## 🗂️ **ROOT DIRECTORY STRUCTURE**

```
Insomnia/
├── 📁 src/                    # Source code directory
├── 📁 public/                 # Static assets and public files
├── 📁 backend/                # Backend service (Node.js/Express)
├── 📁 contracts/              # Sui Move smart contracts
├── 📁 docs/                   # Documentation files
├── 📁 .next/                  # Next.js build output (auto-generated)
├── 📁 node_modules/           # Dependencies (auto-generated)
├── 📄 package.json            # Project dependencies and scripts
├── 📄 next.config.js          # Next.js configuration
├── 📄 tailwind.config.js      # Tailwind CSS configuration
├── 📄 tsconfig.json           # TypeScript configuration
├── 📄 .env.local              # Local environment variables
└── 📄 README.md               # Project overview and setup
```

## 📁 **SOURCE CODE DIRECTORY (`src/`)**

### **📁 `src/app/` - Next.js App Router**
```
src/app/
├── 📁 layout.tsx              # Root layout component
├── 📁 page.tsx                # Home page component
├── 📁 globals.css             # Global CSS styles
├── 📁 game/                   # Game page route
│   ├── 📄 page.tsx            # Game page component
│   └── 📄 GamePageClient.tsx  # Client-side game logic
└── 📁 not-found.tsx           # 404 error page
```

**Purpose**: Next.js 13+ App Router structure for file-based routing and layouts.

### **📁 `src/components/` - React Components**
```
src/components/
├── 📄 AccessibilityProvider.tsx    # Accessibility context provider
├── 📄 ErrorBoundary.tsx            # React error boundary component
├── 📄 Game.tsx                     # Main game component
├── 📄 GameControls.tsx             # Game control buttons
├── 📄 GameGrid.tsx                 # 5x5 game grid component
├── 📄 GameOverModal.tsx            # Game over modal dialog
├── 📄 GamePassPurchase.tsx         # Game pass purchase modal
├── 📄 GameStats.tsx                # Game statistics display
├── 📄 Header.tsx                   # Application header
├── 📄 LazyComponents.tsx           # Lazy-loaded component wrappers
├── 📄 LoadingSpinner.tsx           # Loading indicator component
├── 📄 Providers.tsx                # Context providers wrapper
├── 📄 SEOHead.tsx                  # SEO meta tags component
└── 📄 ThemeToggle.tsx              # Theme switching component
```

**Purpose**: Reusable React components organized by feature and functionality.

### **📁 `src/contexts/` - React Context Providers**
```
src/contexts/
├── 📄 BlockchainContext.tsx        # Blockchain services context
├── 📄 GameModeContext.tsx          # Game mode management context
├── 📄 GamePassContext.tsx          # Game pass operations context
├── 📄 ThemeContext.tsx             # Theme management context
└── 📄 WalletContext.tsx            # Wallet connection context
```

**Purpose**: Global state management using React Context API for cross-component data sharing.

### **📁 `src/hooks/` - Custom React Hooks**
```
src/hooks/
├── 📄 useCachedBlockchainData.ts   # Blockchain data caching hook
├── 📄 useGameAudio.ts               # Game audio management hook
├── 📄 useGameState.ts               # Game state management hook
├── 📄 useGameWorker.ts              # Web Worker integration hook
├── 📄 useMobileOptimization.ts     # Mobile device optimization hook
├── 📄 usePerformanceMonitor.ts     # Performance monitoring hook
└── 📄 useSSRSafe.ts                 # SSR safety utilities hook
```

**Purpose**: Custom React hooks that encapsulate reusable logic and state management.

### **📁 `src/lib/` - Core Library and Utilities**
```
src/lib/
├── 📁 config/                      # Configuration management
│   ├── 📄 constants.ts             # Application constants
│   ├── 📄 contracts.ts             # Smart contract configuration
│   ├── 📄 index.ts                 # Configuration exports
│   ├── 📄 networks.ts              # Network configuration
│   └── 📄 security.ts              # Security configuration
├── 📁 services/                    # Business logic services
│   └── 📁 blockchain/              # Blockchain-related services
│       ├── 📄 base.ts              # Base blockchain service class
│       ├── 📄 gamePass.ts          # Game pass service
│       ├── 📄 index.ts             # Service exports
│       └── 📄 scoreSystem.ts       # Score system service
├── 📁 types/                       # TypeScript type definitions
│   ├── 📄 blockchain.ts            # Blockchain-related types
│   ├── 📄 game.ts                  # Game-related types
│   ├── 📄 index.ts                 # Type exports
│   └── 📄 wallet.ts                # Wallet-related types
├── 📁 utils/                       # Utility functions
│   ├── 📄 blockchain.ts            # Blockchain utility functions
│   └── 📄 errorHandler.ts          # Error handling utilities
└── 📄 index.ts                     # Main library exports
```

**Purpose**: Core business logic, services, types, and utilities organized by domain.

### **📁 `src/styles/` - CSS and Styling**
```
src/styles/
├── 📄 accessibility.css             # Accessibility-specific styles
├── 📄 globals.css                   # Global CSS variables and styles
└── 📄 themes.css                    # Theme-specific styling
```

**Purpose**: CSS styles, theme definitions, and accessibility enhancements.

## 📁 **PUBLIC DIRECTORY (`public/`)**

```
public/
├── 📄 favicon.ico                  # Website favicon
├── 📄 gameWorker.js                # Web Worker script
├── 📄 manifest.json                # PWA manifest file
├── 📁 images/                      # Image assets
│   ├── 📄 icon-72.png             # PWA icon (72x72)
│   ├── 📄 icon-96.png             # PWA icon (96x96)
│   ├── 📄 icon-128.png            # PWA icon (128x128)
│   ├── 📄 icon-144.png            # PWA icon (144x144)
│   ├── 📄 icon-152.png            # PWA icon (152x152)
│   ├── 📄 icon-192.png            # PWA icon (192x192)
│   ├── 📄 icon-384.png            # PWA icon (384x384)
│   ├── 📄 icon-512.png            # PWA icon (512x512)
│   ├── 📄 screenshot-1.png        # Mobile screenshot
│   └── 📄 screenshot-2.png        # Desktop screenshot
└── 📁 sounds/                      # Audio assets
    ├── 📄 click.mp3                # Click sound effect
    ├── 📄 gameOver.mp3             # Game over sound
    └── 📄 success.mp3              # Success sound effect
```

**Purpose**: Static assets, PWA configuration, and public files served directly by the web server.

## 📁 **BACKEND DIRECTORY (`backend/`)**

```
backend/
├── 📄 package.json                 # Backend dependencies
├── 📄 start.bat                    # Windows startup script
├── 📄 env.example                  # Environment variables template
├── 📄 README.md                    # Backend setup documentation
├── 📁 src/                         # Backend source code
│   ├── 📄 server.js                # Express server setup
│   ├── 📁 routes/                  # API route handlers
│   │   └── 📄 consumeCredit.js     # Credit consumption API
│   └── 📁 services/                # Backend services
│       └── 📄 gameOwnerWallet.js   # Game owner wallet service
└── 📁 node_modules/                # Backend dependencies
```

**Purpose**: Node.js/Express backend service for secure blockchain operations and game credit management.

## 📁 **CONTRACTS DIRECTORY (`contracts/`)**

```
contracts/
└── 📁 InsomniaGame/                # Sui Move smart contracts
    ├── 📄 Move.toml                # Move package configuration
    ├── 📄 sources/                 # Move source files
    │   ├── 📄 admin_system.move    # Admin system module
    │   ├── 📄 game_pass.move       # Game pass system module
    │   └── 📄 score_system.move    # Score system module
    ├── 📄 build/                   # Compiled contracts (auto-generated)
    └── 📄 deploy.md                # Deployment instructions
```

**Purpose**: Sui Move smart contracts that handle game logic, game passes, and score management on the blockchain.

## 📄 **CONFIGURATION FILES**

### **📄 `package.json`**
- **Purpose**: Project dependencies, scripts, and metadata
- **Key Scripts**: `dev`, `build`, `start`, `lint`
- **Dependencies**: Next.js, React, TypeScript, Tailwind CSS, Sui SDK

### **📄 `next.config.js`**
- **Purpose**: Next.js configuration and build optimization
- **Features**: Bundle analyzer, security headers, PWA support, webpack optimization

### **📄 `tailwind.config.js`**
- **Purpose**: Tailwind CSS configuration and custom theme
- **Features**: Custom color palette, responsive breakpoints, component variants

### **📄 `tsconfig.json`**
- **Purpose**: TypeScript compiler configuration
- **Features**: Strict type checking, path mapping, module resolution

### **📄 `.env.local`**
- **Purpose**: Local environment variables (not committed to git)
- **Variables**: Backend URL, API keys, network configuration

## 📄 **DOCUMENTATION FILES**

### **📄 `README.md`**
- **Purpose**: Project overview, setup instructions, and basic information
- **Content**: Installation, development, deployment, and contribution guidelines

### **📄 `REFACTORING_PLAN.md`**
- **Purpose**: Detailed refactoring roadmap and implementation phases
- **Content**: Phase-by-phase breakdown of the modularization process

### **📄 `PROJECT_ARCHITECTURE.md`**
- **Purpose**: High-level architectural overview and design decisions
- **Content**: System architecture, technology stack, and scalability considerations

### **📄 `COMPREHENSIVE_AUDIT_REPORT.md`**
- **Purpose**: Security, accessibility, and performance audit results
- **Content**: Compliance status, optimization metrics, and deployment readiness

### **📄 `FILE_SYSTEM_GUIDE.md`** (This File)
- **Purpose**: Comprehensive file system documentation and organization guide
- **Content**: Detailed explanation of every file and directory in the project

## 🔄 **FILE ORGANIZATION PRINCIPLES**

### **1. Feature-Based Organization**
- Each feature has its own directory with related components, hooks, and utilities
- Related functionality is grouped together for easy navigation and maintenance

### **2. Separation of Concerns**
- **Components**: Pure UI components with minimal business logic
- **Hooks**: Reusable logic and state management
- **Services**: Business logic and external API integration
- **Types**: TypeScript interfaces and type definitions
- **Utils**: Helper functions and utilities

### **3. Modular Architecture**
- **Lib Directory**: Core business logic and services
- **Contexts**: Global state management
- **Hooks**: Reusable logic encapsulation
- **Components**: UI component library

### **4. Clear Naming Conventions**
- **Files**: PascalCase for components, camelCase for utilities
- **Directories**: kebab-case for multi-word directories
- **Types**: PascalCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE

## 🎯 **FILE PURPOSE SUMMARY**

### **Core Application Files**
- **`src/app/`**: Next.js routing and page components
- **`src/components/`**: Reusable React components
- **`src/contexts/`**: Global state management
- **`src/hooks/`**: Custom React hooks
- **`src/lib/`**: Business logic and services

### **Configuration Files**
- **`next.config.js`**: Next.js build optimization
- **`tailwind.config.js`**: CSS framework configuration
- **`tsconfig.json`**: TypeScript compiler settings
- **`.env.local`**: Environment variables

### **Documentation Files**
- **`README.md`**: Project overview and setup
- **`REFACTORING_PLAN.md`**: Development roadmap
- **`PROJECT_ARCHITECTURE.md`**: System architecture
- **`COMPREHENSIVE_AUDIT_REPORT.md`**: Audit results
- **`FILE_SYSTEM_GUIDE.md`**: This comprehensive guide

### **Backend and Contracts**
- **`backend/`**: Node.js/Express API service
- **`contracts/`**: Sui Move smart contracts
- **`public/`**: Static assets and PWA configuration

## 🚀 **DEVELOPMENT WORKFLOW**

### **Adding New Features**
1. **Create Feature Directory**: `src/features/[feature-name]/`
2. **Add Components**: Place in `src/components/` or feature directory
3. **Create Hooks**: Add to `src/hooks/` for reusable logic
4. **Define Types**: Add to `src/types/` for TypeScript interfaces
5. **Update Documentation**: Modify relevant documentation files

### **File Naming Conventions**
- **Components**: `ComponentName.tsx`
- **Hooks**: `useHookName.ts`
- **Types**: `featureName.ts`
- **Services**: `FeatureService.ts`
- **Utils**: `featureUtils.ts`

### **Import Organization**
```typescript
// 1. External libraries
import React from 'react';
import { useState } from 'react';

// 2. Internal components
import { GameGrid } from '@/components/GameGrid';

// 3. Internal hooks
import { useGameState } from '@/hooks/useGameState';

// 4. Internal utilities
import { formatScore } from '@/lib/utils/gameUtils';

// 5. Types
import type { GameState } from '@/types/game';
```

---

*This file system guide provides a comprehensive understanding of the Insomnia Game project structure, organization principles, and the purpose of every file and directory.*

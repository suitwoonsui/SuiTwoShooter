# Overview & Architecture

## 📋 Executive Summary

This document provides a comprehensive guide for integrating Sui Blockchain technology into the SuiTwo Shooter Game. The game currently operates as a client-side HTML5/JavaScript application with localStorage-based leaderboards. This integration will enable:

- **On-chain leaderboards** with verified scores
- **Wallet connection** for player authentication
- **NFT/Token rewards** for achievements
- **Provable gameplay** with transaction receipts
- **Cross-device progress** synchronization

---

## 🏗️ Architecture Overview

### Current Architecture

```
┌─────────────────────────────────────┐
│         Client (Browser)            │
│  ┌───────────────────────────────┐  │
│  │   HTML5 Canvas Game           │  │
│  │   - Game Logic (JavaScript)   │  │
│  │   - Rendering System         │  │
│  │   - Audio System             │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   Data Storage (localStorage) │  │
│  │   - Leaderboard (top 10)      │  │
│  │   - Game Settings            │  │
│  │   - Game Stats               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Proposed Architecture with Sui Integration (Separate Backend)

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Game Application (HTML5/JS)                   │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐ │  │
│  │  │  Game Logic      │  │  Sui Wallet Adapter      │ │  │
│  │  │  (Existing)      │  │  - Connect Wallet        │ │  │
│  │  └──────────────────┘  │  - Sign Transactions      │ │  │
│  │                        │  - Read Chain Data       │ │  │
│  │  ┌──────────────────┐  └──────────────────────────┘ │  │
│  │  │  API Client      │                               │  │
│  │  │  - Submit Scores │                               │  │
│  │  │  - Fetch Leaderboard│                           │  │
│  │  │  - Check Token Balance                          │  │
│  │  └──────────────────┘                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Service (Render)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Server (Your Existing Backend Framework)        │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐  │  │
│  │  │  REST API        │  │  Sui SDK Integration     │  │  │
│  │  │  - /api/scores   │  │  - Transaction Builder   │  │  │
│  │  │  - /api/leaderboard│  │  - Move Call Signer   │  │  │
│  │  │  - /api/tokens   │  │  - Event Subscriber     │  │  │
│  │  └──────────────────┘  └──────────────────────────┘  │  │
│  │                                                       │  │
│  │  Optional: In-Memory Cache (Leaderboard)             │  │
│  │  - Query blockchain directly                          │  │
│  │  - Cache for performance (Redis/Memory)             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │ RPC
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sui Blockchain                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Smart Contracts (Move)                               │  │
│  │  - Score Submission Contract                          │  │
│  │  - Leaderboard Registry (on-chain)                   │  │
│  │  - Token Gatekeeping Contract                        │  │
│  │  - Reward/NFT Distribution                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Deployment:**
- **Frontend:** Vercel (or static hosting)
- **Backend:** Render (your existing backend framework in `backend/` directory)
- **Separation:** Clean separation of concerns, independent scaling

### 🗄️ Database Question: Do You Need One?

**Short Answer: For MVP, NO database is required!**

#### Why You DON'T Need a Database (MVP Approach):
1. **All data on-chain** - Scores, leaderboards stored in smart contracts
2. **Query blockchain directly** - Use Sui RPC to read contract state
3. **Simpler architecture** - Less infrastructure to manage
4. **Faster MVP** - Get to launch quicker

#### When You MIGHT Want a Database (Later):
1. **Performance** - Querying blockchain can be slow (200-500ms vs 10ms for DB)
2. **Complex queries** - Sorting/filtering leaderboards easier with DB
3. **Analytics** - Track user behavior, game metrics
4. **Temporary data** - Cache frequently accessed data

#### Recommended MVP Approach:
- **No database initially** ✅
- **Query blockchain directly** for leaderboards
- **Optional:** Add in-memory cache (like Redis) if performance becomes an issue
- **Optional:** Add database later if you need analytics or faster queries

#### Performance Comparison:
```
Blockchain Query: 200-500ms (depends on network)
Database Query:   10-50ms (much faster)
In-Memory Cache:  1-5ms (fastest, but limited)

For MVP: Blockchain is fine! You can optimize later.
```

---

## ✅ Project Context & Priorities

### **Your Setup:**
- **Framework:** Next.js (full-stack)
- **Smart Contracts:** You have examples in `Sui Smart Contract Examples/`
- **Timeline:** MVP launch within 1 month
- **Wallet:** Required to play (no optional mode for MVP)
- **Database:** Not needed for MVP (query blockchain directly)

### **Priority Ranking (Your Goals):**

1. **🥇 Community Building** - Build engaged community around the game
2. **🥈 Monetization Opportunities** - Generate revenue through token mechanics
3. **🥉 Token Gatekeeping** - Require tokens to play (access control)
4. **Verified Leaderboards** - Anti-cheat through on-chain verification
5. **NFT/Token Rewards** - Reward players with tokens/NFTs
6. **Burn Mechanics & Incentives** - Additional community incentives

### **Key Decisions:**
- ✅ **Wallet Required** - No play without wallet connection
- ✅ **Verified Scores Only** - Show only on-chain verified scores
- ✅ **Graceful Failure** - If blockchain submission fails, handle elegantly
- ✅ **No Database** - Query blockchain directly for MVP
- ✅ **No Cross-Device Sync** - Not needed (one-time play sessions)

### **What to Build:**

1. **Backend Service (Separate):** Copy your existing backend code into `backend/` directory
   - Add `/api/scores` endpoint - Submit scores to blockchain
   - Add `/api/leaderboard` endpoint - Query blockchain for leaderboard
   - Add `/api/tokens` endpoint - Check token balance for gatekeeping
   - Use whatever framework your existing backend uses
   - Deploy to Render

2. **Sui SDK Integration:** Backend service connects to Sui blockchain
   - Add Sui service module (adapt to your backend's structure)
   - Leverage patterns from `Sui Smart Contract Examples/`
   - Adapt session management, scoring, and admin patterns
   - Handle transaction building and submission

3. **Frontend Integration:** Connect wallet and call backend API
   - Use `@mysten/dapp-kit` (like in your examples)
   - Check token balance via backend API before allowing gameplay
   - Submit scores via backend API after game ends
   - **⚠️ Important:** User pays gas fees (~$0.001) when submitting score (see [05a. Gas Fees](./05a-gas-fees-and-payments.md))
   - Frontend makes HTTP requests to backend service

4. **Smart Contracts:** Deploy Move contracts for:
   - Score submission and verification
   - Leaderboard storage (on-chain)
   - Token gatekeeping validation
   - Reward distribution (future)

---

## ✅ Your Specific Configuration

### **Confirmed Details:**
- **Framework:** Next.js with App Router (`app/api/` structure)
- **Token:** $Mews - minimum 500,000 required (configurable)
- **Smart Contracts:** Adapt from `Sui Smart Contract Examples/`
- **Deployment:** Vercel for Next.js (frontend + API routes)
- **Database:** None for MVP - query blockchain directly
- **Timeline:** MVP launch in 1 month

### **Important Notes:**
- **Wallet Required:** No optional mode - must connect to play
- **Verified Scores Only:** Show only on-chain verified scores
- **Graceful Failure:** Handle blockchain submission failures elegantly
- **No Cross-Device Sync:** Not needed for one-time play sessions

---

## 🔄 Next Steps

1. Review [02. Backend Setup](./02-backend-setup.md) - Updated for Next.js (skip database)
2. Check [03. Sui SDK Integration](./03-sui-sdk-integration.md) - Next.js API routes
3. Priority: [07. Token Gatekeeping](./07-token-gatekeeping.md) - Critical for your MVP

---

**Related Documents:**
- [Backend Setup](./02-backend-setup.md) - Next.js setup
- [Token Gatekeeping](./07-token-gatekeeping.md) - Your #1 priority feature
- [Security Considerations](./08-security-considerations.md)


# Quick Start Guide

## 🚀 Running the Game Locally

### Prerequisites
- Node.js 18+ and npm
- Sui wallet extension (for blockchain features)

### Step 1: Install Dependencies

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Wallet module dependencies
cd base/wallet-module && npm install && cd ../..
```

### Step 2: Start All Services

**Option A: Run Everything at Once (Recommended)**
```bash
npm run dev:all
```

This starts:
- ✅ Backend API on `http://localhost:3000`
- ✅ Frontend game on `http://localhost:8000`
- ✅ Builds wallet module

**Option B: Run Services Individually**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### Step 3: Open the Game

Open your browser to: **http://localhost:8000**

The game will automatically:
- ✅ Detect localhost and use `http://localhost:3000/api` for backend
- ✅ Load wallet module from `base/wallet-module/dist/`
- ✅ Connect to Sui testnet

## 🎮 What to Expect

1. **Game loads** - You'll see the main menu
2. **Connect wallet** - Click "Connect Wallet" to connect your Sui wallet
3. **Play game** - Start playing and submit scores to the blockchain
4. **Check leaderboard** - View your scores and rankings
5. **Visit store** - Browse and purchase items

## ⚙️ Configuration

The game automatically detects localhost and uses local services. No configuration needed!

For production deployment, see [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)

## 🐛 Troubleshooting

### Backend not starting?
- Check that port 3000 is not in use
- Verify `backend/.env.local` exists with required variables
- See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for details

### Frontend not loading?
- Check that port 8000 is not in use
- Verify `apps/shooter-game/frontend/index.html` exists
- Check browser console for errors

### Wallet not connecting?
- Ensure Sui wallet extension is installed
- Check that wallet is unlocked
- Verify network is set to testnet

## 📚 More Information

- **[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)** - Detailed development setup
- **[README.md](README.md)** - Project overview and architecture
- **[SKELETON_README.md](SKELETON_README.md)** - Structure reference

---

**Ready to play?** Run `npm run dev:all` and open `http://localhost:8000`! 🎮

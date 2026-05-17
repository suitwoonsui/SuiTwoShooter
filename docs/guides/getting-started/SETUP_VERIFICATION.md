# Setup Verification

## ✅ Yes, Your Workflow Still Works!

You can run the dev servers exactly as before:

### Step 1: Start Frontend (from root)
```bash
cd shootergame
npm run dev
```
This starts the frontend server on `http://localhost:8000` serving from `apps/shooter-game/frontend/`

### Step 2: Start Backend (in separate terminal)
```bash
cd backend
npm run dev
```
This starts the Next.js backend on `http://localhost:3000`

### Step 3: Build Wallet Module (one-time, or when changed)
```bash
cd base/wallet-module
npm run build
```

## What Changed

1. **Frontend location**: Now serves from `apps/shooter-game/frontend/` instead of root
2. **Wallet module location**: Now in `base/wallet-module/` instead of `wallet-module/`
3. **Auto-detection**: Config automatically detects localhost and uses correct paths

## Quick Verification

After starting both servers, open `http://localhost:8000` and check the browser console. You should see:
- ✅ `🔧 [BASE CONFIG] API Base URL: http://localhost:3000/api`
- ✅ `🔧 [BASE CONFIG] Wallet Module URL: ../../../base/wallet-module/dist/wallet-api.umd.cjs`
- ✅ All scripts loading successfully

## Alternative: Use `npm run dev:all`

If you prefer, you can still use the all-in-one command:
```bash
npm run dev:all
```

This starts everything automatically (backend, builds wallet, frontend).

---

**Your workflow is unchanged - just run the servers as before!** 🚀

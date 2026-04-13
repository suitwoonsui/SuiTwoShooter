# 🚀 Deployment Quick Start

## For Agents: Simple 3-Step Process

### Step 1: Navigate and Install
```bash
cd contracts/suitwo_game
npm install
```

### Step 2: Run Robust Deployment
```bash
node robust-deploy.js
```

### Step 3: Copy Output IDs
Copy all the IDs from the output and provide them to the user.

---

## What Makes This Different?

✅ **Automatically tests connections** - No more "unable to connect" errors  
✅ **Retries on failure** - Network hiccups won't stop deployment  
✅ **Multiple RPC endpoints** - Tries alternatives if one fails  
✅ **Clear error messages** - Know exactly what went wrong  

---

## Expected Output

You should see:
1. ✅ Connection testing (finds working RPC endpoint)
2. ✅ Wallet balance check
3. ✅ Contract build
4. ✅ Package publish
5. ✅ Badge system initialization
6. ✅ Admin capabilities creation
7. ✅ Complete summary with all IDs

---

## If It Still Fails

1. **Check internet connection** - The script tests this automatically
2. **Verify wallet balance** - Need at least 0.5 SUI
3. **Check Sui testnet status** - May be experiencing issues
4. **Try again** - The script will retry automatically

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "All RPC endpoints failed" | Check internet, try again later |
| "Insufficient balance" | Get SUI from Discord faucet |
| "Build failed" | Check Move contract syntax |
| "Timeout" | Wait for retries, check network |

---

## Full Documentation

See `ROBUST_DEPLOYMENT_GUIDE.md` for complete details.


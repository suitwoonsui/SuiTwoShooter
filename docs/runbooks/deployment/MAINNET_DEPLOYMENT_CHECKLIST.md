# Mainnet Deployment Checklist

**⚠️ CRITICAL: Read this entire document before deploying to mainnet!**

This checklist covers all steps required to deploy your contracts from Sui Testnet to Sui Mainnet.

---

## 🚨 Pre-Deployment Verification (MUST COMPLETE ALL)

### 1. Testnet Testing Verification ✅

Before even considering mainnet, verify ALL of these on testnet:

- [ ] **All contract functions tested and working**
  - [ ] Score submission works correctly
  - [ ] Badge system functions properly
  - [ ] Premium store purchases work
  - [ ] Tournament creation and management works
  - [ ] Achievement system works
  - [ ] Game pass system works
  - [ ] All admin functions work correctly

- [ ] **Transaction flows tested**
  - [ ] Users can submit scores successfully
  - [ ] Badges are minted correctly
  - [ ] Store purchases complete successfully
  - [ ] Tournament participation works
  - [ ] All payment flows work (if applicable)

- [ ] **Edge cases tested**
  - [ ] Error handling works correctly
  - [ ] Gas estimation is accurate
  - [ ] Large transactions work
  - [ ] Concurrent transactions handled properly

- [ ] **Security review completed**
  - [ ] No critical vulnerabilities found
  - [ ] Access controls verified
  - [ ] Admin capabilities properly secured
  - [ ] No unauthorized access possible

### 2. Wallet & Funding Preparation 💰

- [ ] **Mainnet wallet prepared**
  - [ ] Create or verify mainnet wallet address
  - [ ] **IMPORTANT**: Use a separate wallet for mainnet (NOT the testnet wallet)
  - [ ] Verify wallet has sufficient SUI for deployment (recommend 5-10 SUI minimum)
  - [ ] Store private key securely (use environment variable, NOT hardcoded)

- [ ] **Gas budget calculated**
  - [ ] Estimate total gas needed (deployment script uses ~500M gas budget)
  - [ ] Add 50% buffer for safety
  - [ ] Ensure wallet has enough SUI (1 SUI = 1 billion MIST)

### 3. Configuration Changes Required 🔧

#### A. Deployment Script Modifications

The current `deploy.js` script is hardcoded for testnet. You need to:

- [ ] **Update RPC endpoints** - Change from testnet to mainnet endpoints
- [ ] **Update private key handling** - Use environment variable instead of hardcoded key
- [ ] **Update network references** - Change all "testnet" references to "mainnet"
- [ ] **Update explorer URLs** - Change Sui Explorer links to mainnet

#### B. Backend Configuration

- [ ] **Environment variables** - Update all backend `.env` files:
  - [ ] `SUI_NETWORK=mainnet` (or `SUI_MAINNET_NETWORK=mainnet`)
  - [ ] `SUI_MAINNET_RPC_URL=https://fullnode.mainnet.sui.io:443`
  - [ ] Update all contract address variables (package IDs, object IDs, etc.)

#### C. Frontend Configuration

- [ ] **Contract addresses** - Update `src/config/contract-config.js`:
  - [ ] Add mainnet package ID
  - [ ] Add mainnet badge registry ID
  - [ ] Add mainnet statistics registry ID
  - [ ] Add mainnet USDC token type ID (if using)
  - [ ] Add all other mainnet object IDs

- [ ] **Network detection** - Ensure frontend can detect and switch to mainnet

#### D. Vercel/Deployment Platform Configuration

- [ ] **Vercel environment variables** (if using Vercel):
  - [ ] `SUI_MAINNET_NETWORK=mainnet`
  - [ ] `SUI_MAINNET_RPC_URL=https://fullnode.mainnet.sui.io:443`
  - [ ] All mainnet contract addresses
  - [ ] Update any testnet-specific variables

### 4. Code Review & Documentation 📝

- [ ] **Code review completed**
  - [ ] All team members reviewed the contracts
  - [ ] No outstanding issues or TODOs
  - [ ] All comments and documentation updated

- [ ] **Documentation updated**
  - [ ] Deployment guide updated with mainnet instructions
  - [ ] Contract addresses documented
  - [ ] Network configuration documented
  - [ ] Rollback procedures documented

### 5. Backup & Recovery Planning 🔄

- [ ] **Backup testnet deployment**
  - [ ] Document all testnet contract addresses
  - [ ] Save testnet transaction digests
  - [ ] Keep testnet environment running for reference

- [ ] **Recovery plan prepared**
  - [ ] Know how to rollback if issues occur
  - [ ] Have testnet as fallback option
  - [ ] Document emergency procedures

---

## 📋 Deployment Steps (After Checklist Complete)

### Step 1: Modify Deployment Script

1. **Create mainnet version of deploy.js** (recommended: `deploy-mainnet.js`)
   - Copy `deploy.js` to `deploy-mainnet.js`
   - Update RPC endpoints to mainnet:
     ```javascript
     const MAINNET_RPC_ENDPOINTS = [
       'https://fullnode.mainnet.sui.io:443',
       'https://sui-mainnet-rpc.allthatnode.com',
       'https://mainnet.suiet.app',
       'https://rpc-mainnet.suiscan.xyz',
     ];
     ```
   - Update private key to use environment variable:
     ```javascript
     const privateKey = process.env.MAINNET_PRIVATE_KEY || process.env.SUI_PRIVATE_KEY;
     if (!privateKey) {
       throw new Error('MAINNET_PRIVATE_KEY environment variable required');
     }
     ```
   - Update all explorer URLs from `testnet` to `mainnet`
   - Update console messages to indicate mainnet deployment

### Step 2: Verify Sui CLI Configuration

```bash
# Switch to mainnet
sui client switch --env mainnet

# Verify you're on mainnet
sui client active-env  # Should show "mainnet"

# Check your mainnet address
sui client active-address

# Check mainnet balance
sui client gas
```

### Step 3: Set Environment Variables

```bash
# Set mainnet private key (DO NOT commit this!)
export MAINNET_PRIVATE_KEY="suiprivkey1..."

# Or create .env file in contracts/suitwo_game/
echo "MAINNET_PRIVATE_KEY=suiprivkey1..." > .env
```

### Step 4: Build Contracts

```bash
cd contracts/suitwo_game
sui move build
```

Verify build succeeds with no errors.

### Step 5: Run Mainnet Deployment

```bash
# Make sure you're in the right directory
cd contracts/suitwo_game

# Run mainnet deployment script
node deploy-mainnet.js
```

**⚠️ This will cost REAL SUI - make sure you're ready!**

### Step 6: Verify Deployment

After deployment completes:

- [ ] **Check transaction on Sui Explorer**
  - [ ] Verify package was published
  - [ ] Verify all objects were created
  - [ ] Check all object IDs match script output

- [ ] **Test critical functions**
  - [ ] Initialize badge registry (if not auto-initialized)
  - [ ] Test score submission
  - [ ] Test badge minting
  - [ ] Verify admin capabilities work

### Step 7: Update All Configuration Files

- [ ] **Backend `.env` files**
  - [ ] Update all contract addresses
  - [ ] Update network to mainnet
  - [ ] Update RPC URL to mainnet

- [ ] **Frontend `contract-config.js`**
  - [ ] Add all mainnet addresses
  - [ ] Verify network detection works

- [ ] **Vercel/Deployment platform**
  - [ ] Update all environment variables
  - [ ] Redeploy backend with new config
  - [ ] Redeploy frontend with new config

### Step 8: Test Production Environment

- [ ] **Test on production frontend**
  - [ ] Connect wallet to mainnet
  - [ ] Verify contract addresses are correct
  - [ ] Test score submission
  - [ ] Test badge minting
  - [ ] Test store purchases
  - [ ] Test tournament participation

- [ ] **Monitor for issues**
  - [ ] Check backend logs
  - [ ] Monitor transaction success rates
  - [ ] Watch for errors

---

## 🔐 Security Considerations

### Private Key Security

- [ ] **NEVER commit private keys to git**
  - [ ] Use environment variables
  - [ ] Add `.env` to `.gitignore`
  - [ ] Use secure key management (consider using a hardware wallet or key management service)

- [ ] **Use separate wallets**
  - [ ] Testnet wallet ≠ Mainnet wallet
  - [ ] Consider using a multi-sig wallet for mainnet admin operations

### Access Control

- [ ] **Admin capabilities**
  - [ ] Store admin capability objects securely
  - [ ] Document who has access
  - [ ] Consider using a secure vault for admin objects

- [ ] **Upgrade capabilities**
  - [ ] Store upgrade capability securely
  - [ ] Document upgrade procedures
  - [ ] Plan for future upgrades

---

## 📊 Post-Deployment Tasks

### 1. Documentation

- [ ] **Update deployment documentation**
  - [ ] Record all mainnet contract addresses
  - [ ] Document deployment date and transaction digests
  - [ ] Update `DEPLOYMENT_IDS.md` with mainnet addresses

- [ ] **Create deployment summary**
  - [ ] Package ID
  - [ ] All object IDs
  - [ ] Transaction digests
  - [ ] Deployment date/time
  - [ ] Network: mainnet

### 2. Monitoring Setup

- [ ] **Set up monitoring**
  - [ ] Monitor transaction success rates
  - [ ] Set up alerts for failures
  - [ ] Track gas usage
  - [ ] Monitor contract interactions

### 3. Communication

- [ ] **Notify team**
  - [ ] Share mainnet addresses
  - [ ] Update team documentation
  - [ ] Communicate any changes needed

- [ ] **Update users** (if applicable)
  - [ ] Announce mainnet launch
  - [ ] Provide migration instructions (if needed)
  - [ ] Update documentation/website

---

## ⚠️ Important Warnings

1. **Mainnet is PERMANENT**
   - Once deployed, contracts cannot be "undone"
   - Addresses are permanent
   - Make sure everything is correct before deploying

2. **Real Money**
   - Mainnet uses real SUI (not test tokens)
   - All transactions cost real gas fees
   - Be careful with gas budgets

3. **No Testnet Faucet**
   - You need real SUI for mainnet
   - Get SUI from exchanges or other sources
   - Plan for sufficient SUI reserves

4. **Network Differences**
   - Mainnet may have different performance characteristics
   - Gas prices may differ
   - RPC endpoints may have different rate limits

---

## 🆘 Emergency Procedures

### If Deployment Fails

1. **Don't panic** - Check the error message
2. **Verify wallet balance** - Ensure you have enough SUI
3. **Check network status** - Sui mainnet may be experiencing issues
4. **Retry** - The script has retry logic, but you can also retry manually
5. **Check logs** - Review transaction details on Sui Explorer

### If Issues Found After Deployment

1. **Document the issue** - Record what's wrong
2. **Assess severity** - Is it critical or minor?
3. **Plan fix** - Determine if upgrade is needed
4. **Test fix on testnet** - Always test upgrades on testnet first
5. **Deploy upgrade** - Use upgrade capability to fix issues

---

## ✅ Final Checklist Before Deploying

Before you run the mainnet deployment script, verify:

- [ ] All testnet tests passed
- [ ] Security review completed
- [ ] Mainnet wallet funded with sufficient SUI
- [ ] Deployment script modified for mainnet
- [ ] Environment variables set correctly
- [ ] Sui CLI configured for mainnet
- [ ] All configuration files ready to update
- [ ] Team notified and ready
- [ ] Backup plan in place
- [ ] Monitoring ready
- [ ] Documentation updated

**Only proceed when ALL items above are checked!**

---

## 📞 Support Resources

- **Sui Documentation**: https://docs.sui.io
- **Sui Discord**: https://discord.gg/sui
- **Sui Explorer**: https://suiexplorer.com
- **Sui Status**: https://status.sui.io

---

**Last Updated**: 2025-01-01  
**Version**: 1.0

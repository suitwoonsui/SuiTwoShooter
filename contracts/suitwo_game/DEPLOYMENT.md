# Contract Deployment Guide

## Prerequisites

### 1. **Sui CLI Installation**

**Important:** You need the Sui CLI tool to deploy contracts. The CLI is a command-line tool (like `git` or `npm`), not a programming language.

**Installation Options:**

#### Option A: Install via Rust/Cargo (Standard Method)

This is the most common way. Rust is just used to build/install the CLI - you don't write Rust code:

```bash
# Install Rust first (if needed)
# On Windows, download from: https://rustup.rs/
# Or use PowerShell:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Sui CLI via Cargo (Rust's package manager)
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# Verify installation
sui --version
```

#### Option B: Pre-built Binaries (If Available)

Check Sui's GitHub releases for pre-built Windows binaries:
- Visit: https://github.com/MystenLabs/sui/releases
- Download the Windows binary if available
- Add to your PATH

#### Option C: Chocolatey (Windows Package Manager) ✅ **RECOMMENDED FOR WINDOWS**

If you installed Sui CLI via Chocolatey (like you did), update it with:

```powershell
# Run PowerShell as Administrator, then:
choco upgrade sui -y
```

**To check if you have Chocolatey version:**
```powershell
where.exe sui
# If it shows: C:\ProgramData\chocolatey\bin\sui.exe
# Then you installed via Chocolatey
```

**Note:** Chocolatey is a Windows package manager (like `apt` on Linux or `brew` on Mac). It doesn't deploy contracts itself - it just installs the Sui CLI tool, which you then use to deploy contracts.

**What You Actually Use:**

Once Sui CLI is installed, you use these commands (no Rust coding needed):
- `sui move build` - Builds your Move contract
- `sui client publish` - Deploys your contract
- `sui client call` - Calls contract functions

**The contracts themselves are written in Move language** (not Rust), which is Sui's smart contract language.

### 2. **Wallet Setup** ✅ **REQUIRED**

**Yes, you need a wallet for deployment!** Here's why:

- **Gas Fees**: The wallet pays for deployment transaction gas
- **Publisher Address**: Your wallet address becomes the package publisher
- **Ownership**: You own the published package (can upgrade if needed)

#### Create a New Wallet (if you don't have one):

**Option 1: Interactive Setup (Recommended)**

Run this command in your terminal:

```bash
sui client
```

When prompted:
1. "Do you want to connect to a Sui Full node server [y/N]?" → Type `y` and press Enter
2. "Sui Full node server URL" → Press Enter (defaults to testnet: `https://fullnode.testnet.sui.io:443`)
3. "Select key scheme to generate keypair" → Type `0` for ed25519 and press Enter

This will initialize the client and create a default address.

**Option 2: Create Address Directly**

If the client is already initialized:

```bash
# Create a new Ed25519 address
sui client new-address ed25519

# This will:
# 1. Generate a new keypair
# 2. Create a new address
# 3. Save it to your Sui keystore
# 4. Display the address and recovery phrase (SAVE THIS!)
```

**⚠️ IMPORTANT**: 
- **Save your recovery phrase securely!** You'll need it to recover your wallet.
- The recovery phrase is your private key - keep it secret!
- Write it down and store it safely - you cannot recover it if lost.

#### Switch to Testnet:

```bash
# Switch to testnet environment
sui client switch --env testnet

# Verify you're on testnet
sui client active-env
```

#### Get Testnet SUI (for gas):

You need testnet SUI to pay for deployment. Get it from:

1. **Sui Testnet Faucet** (Discord):
   - Join: https://discord.gg/sui
   - Go to: `#testnet-faucet` channel
   - Use command: `!faucet <YOUR_ADDRESS>`

2. **Or use the web faucet**:
   - Visit: https://discord.com/channels/916379725201563759/971488439931392130
   - Request SUI for your address

3. **Check your balance**:
   ```bash
   sui client gas
   ```

   You need at least **~0.1 SUI** for deployment (gas budget is 10,000,000 MIST = 0.01 SUI, but having extra is safer).

---

## Deployment Steps

### Step 1: Build the Contract

```bash
cd contracts/suitwo_game
sui move build
```

This should complete without errors. If you see warnings, they're okay (like unused constants).

### Step 2: Deploy to Testnet

```bash
# Deploy with gas budget (increased for init function)
sui client publish --gas-budget 50000000
```

**What happens:**
1. Sui CLI builds your contract
2. Creates a transaction to publish the package
3. **The `init` function automatically runs**, creating the `SessionRegistry` shared object
4. Signs it with your wallet
5. Submits to testnet
6. Waits for confirmation
7. Returns package information

### Step 3: Save the Output

After deployment, you'll see output like:

```
Published Objects:
 ┌──
 │ PackageID: 0xabc123def456789...
 │ Version: 1
 │ Digest: 7xK8mN...
 └──

Transaction Digest: 9xK7mN...
```

**Save these values:**
- **Package ID**: `0xabc123def456789...` ← **REQUIRED!**
- **Transaction Digest**: For verification and extracting Session Registry ID

### Step 4: Extract Session Registry Object ID (NEW)

The `init` function creates a `SessionRegistry` shared object. You need to extract its Object ID:

**Method 1: From Sui Explorer (Easiest)**
1. Visit: https://suiexplorer.com/txblock/<TRANSACTION_DIGEST>?network=testnet
2. Look at the "Object Changes" section
3. Find the object with type containing `SessionRegistry`
4. Copy its Object ID

**Method 2: From CLI**
```bash
# Get full transaction details
sui client tx <TRANSACTION_DIGEST>

# Look for created objects with type containing "SessionRegistry"
```

**Method 3: Query Package**
```bash
# Query all objects created by the package
sui client objects --package <PACKAGE_ID>

# Look for SessionRegistry in the output
```

**Save this value:**
- **Session Registry Object ID**: `0x...` ← **REQUIRED!** (for backend config)

### Step 5: Verify on Sui Explorer

1. Visit: https://suiexplorer.com/?network=testnet
2. Paste your **Transaction Digest** or **Package ID**
3. Verify the package is published correctly
4. Verify the `SessionRegistry` object was created (check Object Changes)

### Step 6: Update Backend Environment Variables

Add both IDs to your backend `.env` file:

```bash
GAME_SCORE_CONTRACT_TESTNET=0x<PACKAGE_ID>
SESSION_REGISTRY_OBJECT_ID=0x<REGISTRY_OBJECT_ID>
```

**Both are required** for the backend to submit scores successfully.

---

## Ownership & Package Information

### What Gets Created:

1. **Package Object**: 
   - Owned by your wallet address (the publisher)
   - Contains all your Move modules
   - Immutable (cannot be changed after publishing)

2. **Publisher Address**:
   - Your wallet address is recorded as the publisher
   - Visible on Sui Explorer
   - Used for package upgrades (if needed later)

### Important Notes:

- **Package is Immutable**: Once published, the code cannot be changed
- **Upgrades**: If you need to upgrade, you publish a new package version
- **Ownership**: The package is owned by your publisher address
- **Public Access**: Anyone can call your contract functions (that's the point!)

---

## Update Frontend Configuration

After deployment, update your frontend to use the new package ID:

### Option 1: Set in Browser Console (Temporary)

```javascript
// In browser console after page loads
window.setContractPackageId('0xYOUR_PACKAGE_ID_HERE');
```

### Option 2: Add to index.html (Permanent)

Add this script tag in `index.html` after the wallet API loads:

```html
<script>
  // Set contract package ID after deployment
  if (typeof window.setContractPackageId === 'function') {
    window.setContractPackageId('0xYOUR_PACKAGE_ID_HERE');
  }
</script>
```

### Option 3: Create Config File (Recommended)

Create `public/config.js`:

```javascript
// Contract configuration
window.GAME_CONTRACT_CONFIG = {
  packageId: '0xYOUR_PACKAGE_ID_HERE',
  module: 'score_submission',
  function: 'submit_game_session'
};
```

Then load it in `index.html`:

```html
<script src="config.js"></script>
```

And update `score-submission.js` to read from config:

```javascript
const GAME_CONTRACT_PACKAGE_ID = window.GAME_CONTRACT_CONFIG?.packageId || null;
```

---

## Testing the Deployment

### Test Score Submission:

```bash
# Call the contract function directly
sui client call \
  --package 0xYOUR_PACKAGE_ID \
  --module score_submission \
  --function submit_game_session \
  --args 0x6 5000 10000 50 2 10 5 \
  --gas-budget 10000000
```

**Arguments:**
- `0x6` - Clock object ID (standard Sui Clock)
- `5000` - score
- `10000` - distance
- `50` - coins
- `2` - bosses_defeated
- `10` - enemies_defeated
- `5` - longest_coin_streak

### Verify Events:

Check Sui Explorer for `ScoreSubmitted` events emitted by your contract.

---

## Troubleshooting

### "Insufficient gas" error:
- Get more testnet SUI from the faucet
- Increase gas budget: `--gas-budget 20000000`

### "Package already exists" error:
- This shouldn't happen - each publish creates a new package
- Check you're using the correct network

### "Module not found" error:
- Verify module name matches: `score_submission`
- Check package ID is correct
- Ensure you're on the right network (testnet)

### Wallet not found:
- List your addresses: `sui client addresses`
- Set active address: `sui client active-address <ADDRESS>`

---

## Next Steps

After successful deployment:

1. ✅ Save package ID
2. ✅ Update frontend configuration
3. ✅ Test score submission from game
4. ✅ Verify events on Sui Explorer
5. ✅ Update documentation with package ID

---

## Mainnet Deployment (Later)

When ready for mainnet:

1. **Switch to mainnet**:
   ```bash
   sui client switch --env mainnet
   ```

2. **Get mainnet SUI** (you'll need real SUI):
   - Buy from an exchange
   - Transfer to your wallet

3. **Deploy**:
   ```bash
   sui client publish --gas-budget 10000000
   ```

4. **Update all configurations** to use mainnet package ID

**⚠️ WARNING**: Only deploy to mainnet after thorough testnet testing!


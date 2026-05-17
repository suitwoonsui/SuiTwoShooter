# Fix for repeated upgrade failure (FeatureNotYetSupported / File lock)

## What’s going wrong

1. **`node deploy.js`** – SDK path fails with **FeatureNotYetSupported in command 1** because the SDK’s upgrade transaction format doesn’t match what testnet 1.64.x expects.
2. **`sui client upgrade`** – Can fail with:
   - **Client/Server api version mismatch** (upgrade Sui CLI to 1.64.x).
   - **Unable to save config** (file lock on `client.yaml` – use `run-upgrade.ps1` with writable config dir).
   - **FeatureNotYetSupported in command 1** – **Network limitation**: testnet is rejecting the upgrade transaction because a feature used in the upgrade flow (command 1) is not yet enabled on testnet. This is a known issue: [MystenLabs/sui#24616](https://github.com/MystenLabs/sui/issues/24616). The **command and wallet are correct**; you must wait for testnet to enable the feature or try mainnet if the feature is enabled there.

## What you need to do (one-time)

### 1. Upgrade Sui CLI to 1.64.x

Your CLI must match testnet. Use one of:

**Option A – suiup (recommended)**  
If you have [suiup](https://docs.sui.io/guides/developer/getting-started/sui-install):

```powershell
suiup install sui@1.64
```

**Option B – Chocolatey**

```powershell
choco upgrade sui -y
```

**Option C – Manual**  
Download the Windows binary for 1.64.x from [Sui releases](https://github.com/MystenLabs/sui/releases), extract it, and add it to your PATH.

Check:

```powershell
sui --version
```

You want something like `1.64.x`.

### 2. Run the upgrade from a normal terminal

- Use **PowerShell outside Cursor** (not the Cursor terminal).

From the contract directory:

```powershell
cd C:\Users\TheCe\OneDrive\Documents\shootergame\apps\shooter-game\contracts\suitwo_game
.\run-upgrade.ps1
```

**`run-upgrade.ps1`** now uses the **same key as deploy.js** (UpgradeCap owner: `0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3`). If the Sui config in `%LOCALAPPDATA%\SuiUpgrade` doesn’t have that address, the script imports the key from `deploy.js` and switches to it before running the upgrade. You don’t need to copy or import the key yourself.

**If you previously ran the script and answered Y to “create one”:** that created a new random key (wrong address). Run `.\run-upgrade.ps1` again; it will detect the wrong active address, import the deploy.js key, switch to the UpgradeCap owner, and run the upgrade.

## Summary

| Step | Action |
|------|--------|
| 1 | Upgrade Sui CLI to **1.64.x** (suiup / choco / manual). |
| 2 | Open **PowerShell outside Cursor**, `cd` to `apps\shooter-game\contracts\suitwo_game`. |
| 3 | Set **SUI_CONFIG_DIR** to a **writable** dir that has the UpgradeCap owner as the active address. |
| 4 | Run **sui client upgrade --upgrade-capability &lt;CAP&gt; --gas-budget 500000000 .** |

After a successful upgrade, the on-chain package will expose `add_milestone_definition_entries` and the backend can use the batch; no backend or env changes are required.

---

## Unblocking upgrades when testnet blocks (FeatureNotYetSupported)

Testnet is currently rejecting upgrade transactions (FeatureNotYetSupported in command 1). That blocks both this upgrade (batching) and future upgrades on testnet until the network enables the feature. You have two deployment options:

### Option A: Wait for testnet

- Follow [MystenLabs/sui#24616](https://github.com/MystenLabs/sui/issues/24616) and Sui testnet release notes.
- When the feature is enabled, run `.\run-upgrade.ps1` again from the contract dir (same command, same wallet). No script changes needed.
- Until then, your backend keeps using the single-entry fallback; batching will work after a successful upgrade.

### Option B: Deploy / upgrade on mainnet

If you need batching and future upgrades soon and are ready to use mainnet:

1. **One-time mainnet setup** (same wallet can hold both testnet and mainnet state):
   - `$env:SUI_CONFIG_DIR = "$env:LOCALAPPDATA\SuiUpgrade"`
   - `sui client switch --env mainnet`
   - Ensure the UpgradeCap owner address has **mainnet SUI** for gas.

2. **If this is your first mainnet deployment:**  
   Run a **full publish** on mainnet from the contract dir (e.g. use `deploy.js` against mainnet RPC, or publish via CLI and record the new package ID and UpgradeCap). That gives you a mainnet package and UpgradeCap. Then backend and env must use **mainnet** package/object IDs and mainnet RPC.

3. **If you already have a mainnet package and UpgradeCap:**  
   From the contract dir, with active env = mainnet and the same key that owns the mainnet UpgradeCap:
   - `.\run-upgrade.ps1`
   (Update the UpgradeCap ID in `run-upgrade.ps1` if your mainnet cap is different from testnet.)

4. **After a successful mainnet upgrade:**  
   Point your backend to mainnet (package ID, object IDs, RPC). The on-chain package will expose `add_milestone_definition_entries`; future upgrades on mainnet use the same `sui client upgrade` flow.

**Summary:** Testnet is blocked by a protocol/feature limitation, not by your command or wallet. You can wait for testnet to enable the feature (Option A) or move deployment/upgrades to mainnet (Option B). The same upgrade command and scripts work once the network supports the feature.

### Option C: Fresh deploy on testnet (no upgrade)

If you stay on testnet and don’t want to wait for the upgrade feature, you can **publish a new package** instead of upgrading. Publish uses a different transaction type than upgrade, so testnet may accept it.

**Tradeoffs:**

- You get a **new package ID** and **new object IDs** (registries, UpgradeCap, etc.). The new bytecode includes `add_milestone_definition_entries` from day one, so batching works.
- You must **update backend .env** (and `DEPLOYMENT_IDS.md`) with all new IDs from the deploy output.
- The **old package and its objects** stay on-chain but you’ll be using the new package. Any state tied to the old package (scores, achievements, etc.) would require migration if you need to keep it.
- You get a **new UpgradeCap** for the new package. Future upgrades of this package will still hit the same testnet limitation until the feature is enabled; when it is, you can upgrade this new package normally.

**Steps:**

1. **Force a fresh publish** (so the script doesn’t use the existing UpgradeCap):
   - In the contract dir, rename the cap file so deploy doesn’t see it:
     - `Rename-Item UPGRADE_CAP.json UPGRADE_CAP.json.bak.testnet`
   - (Optional) Keep the old file for reference; you can restore it later if you want to try upgrade again.

2. **Run full deploy** (same wallet, testnet):
   - From the contract dir: `node deploy.js`
   - Use PowerShell/CMD outside Cursor if the build hits file locks.
   - The script will do a **publish** (not upgrade), create a new package, and print the new package ID and object IDs.

3. **Update config and backend:**
   - Copy the new **Package ID**, **UpgradeCap**, and all **registry / object IDs** from the deploy output.
   - Update `apps/shooter-game/backend` `.env` (e.g. `GAME_SCORE_CONTRACT_TESTNET`, `STATISTICS_REGISTRY_OBJECT_ID_TESTNET`, `ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET`, etc.) with these values.
   - Update `DEPLOYMENT_IDS.md` with the new IDs so they’re the single source of truth.

4. **Re-run init / migrations** if needed (deploy.js runs badge/achievement/config init; if you use separate scripts for milestones or catalog, run them with the new env).

After that, the app uses the new package and batching works. When testnet enables the upgrade feature, you can upgrade this new package with `.\run-upgrade.ps1` (and a new `UPGRADE_CAP.json` produced by this fresh deploy).

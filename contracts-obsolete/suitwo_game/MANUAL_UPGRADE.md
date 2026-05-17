# Manual Game Package Upgrade

When the deploy script cannot complete the upgrade (e.g. SDK returns `FeatureNotYetSupported`, or CLI config save fails due to file lock), run the upgrade manually as below.

## Prerequisites

1. **Published package ID in Move.toml**  
   For upgrades, `[addresses]` in `Move.toml` must set the package name to the **on-chain package ID** (not `0x0`). Example:
   ```toml
   [addresses]
   suitwo_game = "0x4430e6c44ccced43dbb57e8a6cf135dd9cf71b75b1ff3f16d0a6e2cf40e033da"
   ```
   Otherwise you get: **"Cannot upgrade package without having a published id"**.

2. **Sui client config**  
   Ensure `%USERPROFILE%\.sui\sui_config\client.yaml` exists and is valid YAML (not empty, no parse errors). It should contain:
   - `active_address`, `active_env`, `keystore` (path to your keystore), and `envs` (testnet rpc/ws).

3. **Sui CLI version (recommended)**  
   Testnet is on API 1.64.x. If you see "Client/Server api version mismatch", update the CLI:
   - **Chocolatey (run PowerShell as Administrator):**  
     `choco upgrade sui -y`
   - **suiup:**  
     `suiup install sui@testnet`  
   - Or install from: https://docs.sui.io/build/install

4. **File lock**  
   If you get "Unable to save config ... (os error 33)" or "another process has locked":
   - Run the upgrade from a **standalone terminal** (e.g. Windows Terminal or PowerShell **outside** Cursor/IDE).
   - Optionally pause OneDrive sync for the `.sui` folder, or use a config dir that isn’t synced.

## If you get "FeatureNotYetSupported in command 1" (or upgrades used to work and now don't)

The **chain** rejected the upgrade transaction. This can happen if the **CLI version** sends a transaction format that testnet doesn't support yet.

1. **Try older Sui CLI (1.60.0)** – If you upgraded to 1.64.1 and upgrades stopped working, the newer CLI may use a different tx format. Downgrade and retry (PowerShell as Administrator):
   ```powershell
   choco uninstall sui -y
   choco install sui --version=1.60.0 -y
   ```
   Then run the upgrade command again. **Keep** `Move.toml` with `suitwo_game = "0x4430e6c44ccced43dbb57e8a6cf135dd9cf71b75b1ff3f16d0a6e2cf40e033da"` (required for upgrade).

2. **Switch to an alternate testnet RPC** (your config has `testnet-alt`):
   ```powershell
   sui client switch --env testnet-alt
   ```
   Then run the upgrade again.

3. **Wait for testnet protocol upgrade** – Sui testnet upgrades weekly. Check Sui Discord **#testnet-updates** or [Sui GitHub](https://github.com/MystenLabs/sui).

4. **If you need the upgrade urgently** – Consider mainnet, where the Upgrade command is supported.

## Upgrade command

From a terminal (not necessarily as Administrator):

```powershell
cd "C:\Users\TheCe\OneDrive\Documents\shootergame\apps\shooter-game\contracts\suitwo_game"
sui client upgrade --upgrade-capability 0x80a034908bc77f58c9404ba586462187973dea15cba01d112bff082cf2f5e093 --gas-budget 500000000 .
```

Or use the project path relative to your machine.

## After a successful upgrade

1. **Restart the game backend** (so it uses the new package).
2. In the admin **Milestones** tab, run **Initialize** (uses the new batch `add_milestone_definition_entries`).

## Current IDs (for reference)

- **UpgradeCap:** `0x80a034908bc77f58c9404ba586462187973dea15cba01d112bff082cf2f5e093`
- **Package ID:** `0x4430e6c44ccced43dbb57e8a6cf135dd9cf71b75b1ff3f16d0a6e2cf40e033da`

These are also in `UPGRADE_CAP.json` in this directory.

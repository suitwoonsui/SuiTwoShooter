# Fix OneDrive File Locking Issue

The Sui CLI config file is being locked by OneDrive sync. Here's how to fix it:

## Solution: Exclude .sui folder from OneDrive

1. **Right-click on the `.sui` folder** at: `C:\Users\TheCe\.sui`
2. **Select "OneDrive" → "Always keep on this device"** (or "Free up space" if it's synced)
3. **OR exclude it from sync:**
   - Open OneDrive settings
   - Go to "Sync and backup" → "Advanced settings"
   - Click "Choose folders"
   - Uncheck the `.sui` folder

## Alternative: Move .sui outside OneDrive

If excluding doesn't work, you can move the entire `.sui` folder outside OneDrive:

```powershell
# Move .sui folder to a non-OneDrive location
Move-Item C:\Users\TheCe\.sui C:\Users\TheCe\AppData\Local\.sui
```

Then update the Sui CLI to use the new location (if possible) or create a symlink.

## Quick Test

After excluding from OneDrive, try:
```bash
cd contracts/suitwo_game
sui client publish --gas-budget 10000000
```


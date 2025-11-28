# SuiTwo Game Contracts

## 🎯 **IMPORTANT: Use This File for Contract IDs**

**👉 See `DEPLOYMENT_IDS.md` for the current deployment IDs**

That file contains the **ONLY** source of truth for all contract and object IDs. All other files may contain outdated information.

---

## Quick Start

1. **Get Contract IDs:** Open `DEPLOYMENT_IDS.md` and copy the `.env` configuration
2. **Update Backend:** Paste into `backend/.env.local`
3. **Restart Server:** Restart your backend server

---

## File Structure

- **`DEPLOYMENT_IDS.md`** ⭐ - **THE ONLY FILE YOU NEED** - Contains current deployment IDs
- **`DEPLOYMENT.md`** - Deployment instructions and guide
- **`DEPLOYMENT_CHECKLIST.md`** - Step-by-step deployment checklist
- **`sources/`** - Move contract source files
- **`deploy.js`** - Deployment script
- **`setup-badge-system.js`** - Badge system initialization script
- **`create-admin-capability.js`** - Admin capability creation script

---

## Deployment Scripts

All scripts are in the `contracts/suitwo_game/` directory:

- `node deploy.js` - Deploy contracts
- `node extract-deployment-ids.js` - Extract object IDs from deployment
- `node setup-badge-system.js <PUBLISHER_ID>` - Initialize badge system
- `node create-admin-capability.js` - Create admin capabilities

---

## ⚠️ Warning

**DO NOT** use IDs from:
- `DEPLOYMENT_COMPLETE.md` (outdated)
- `PACKAGE_UPDATE_SUMMARY.md` (outdated)
- `COMPLETE_ENV_CONFIG.txt` (outdated)
- Any other file except `DEPLOYMENT_IDS.md`

**Always use `DEPLOYMENT_IDS.md` for current contract IDs.**

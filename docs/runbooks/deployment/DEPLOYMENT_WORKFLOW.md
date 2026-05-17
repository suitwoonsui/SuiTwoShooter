# Deployment Workflow - Step by Step

## 🚀 Recommended Workflow

### Option 1: Update Settings First (Recommended)

**Best for:** Ensuring the first deployment succeeds

1. **Update Vercel Settings (Before Pushing)**
   - Go to Vercel Dashboard → Your Frontend Project → Settings → General
   - Update **Root Directory**: `apps/shooter-game/frontend` (if not already set)
   - Go to Settings → Build & Development Settings
   - Update **Build Command**: `cd ../.. && npm run build:frontend`
   - Update **Install Command**: `cd ../.. && npm install`
   - Save settings

2. **Commit and Push to GitHub**
   ```bash
   git add .
   git commit -m "Add build system for Vercel deployment compatibility"
   git push
   ```

3. **Vercel Auto-Deploys**
   - Vercel detects the push
   - Runs install command
   - Runs build command
   - Deploys with correct settings ✅

### Option 2: Push First, Then Update

**Best for:** If you want to see what happens with current settings

1. **Commit and Push to GitHub**
   ```bash
   git add .
   git commit -m "Add build system for Vercel deployment compatibility"
   git push
   ```

2. **Vercel Auto-Deploys** (may fail or have issues)

3. **Update Vercel Settings**
   - Go to Vercel Dashboard → Your Frontend Project → Settings
   - Update Root Directory: `apps/shooter-game/frontend`
   - Update Build Command: `cd ../.. && npm run build:frontend`
   - Update Install Command: `cd ../.. && npm install`
   - Save settings

4. **Redeploy**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - OR push another commit to trigger auto-deploy

## 📋 Settings Checklist

### Frontend Project Settings

**General Settings:**
- ✅ Root Directory: `apps/shooter-game/frontend`

**Build & Development Settings:**
- ✅ Framework Preset: Other (or Static Site)
- ✅ Build Command: `cd ../.. && npm run build:frontend` (⚠️ **CRITICAL:** Make sure there's a space: `cd ../..` not `cd../..`)
- ✅ Output Directory: `.` (or leave blank - means current directory)
- ✅ Install Command: `cd ../.. && npm install` (⚠️ **CRITICAL:** Make sure there's a space: `cd ../..` not `cd../..`)

**OR use vercel.json (Recommended - Prevents Typo Issues):**
- ✅ Created `apps/shooter-game/frontend/vercel.json` with correct settings
- Vercel will automatically use these settings
- This prevents copy-paste errors in the dashboard

**Why `cd ../..`?**
- Vercel's root directory is `apps/shooter-game/frontend`
- The build script is in the project root
- `../..` goes up to project root where `package.json` and `scripts/` are

## 🔍 Verification Steps

After deployment, verify:

1. **Check Build Logs:**
   - Go to Deployment → Build Logs
   - Should see: `🔨 Building frontend for production...`
   - Should see: `✅ Copied: api-config.js`
   - Should see: `✅ Copied: contract-config.js`

2. **Check Deployed Site:**
   - Open your Vercel URL
   - Open browser console
   - Should see: `🔧 [BASE CONFIG] API Base URL: ...`
   - Should NOT see 404 errors for `base-config/...` files

3. **Check Network Tab:**
   - `base-config/api-config.js` should load (200 status)
   - `base-config/contract-config.js` should load (200 status)

## 🐛 Troubleshooting

### Build Fails: "npm: command not found"
- **Fix:** Make sure Install Command runs first
- **Fix:** Check that Node.js version is set in Vercel (should be 18+)

### Build Fails: "Cannot find module"
- **Fix:** Install Command should be: `cd ../.. && npm install`
- **Fix:** Build Command should be: `cd ../.. && npm run build:frontend`

### 404 for base-config files
- **Fix:** Verify Build Command ran successfully (check logs)
- **Fix:** Verify Root Directory is `apps/shooter-game/frontend`
- **Fix:** Check that `base-config/` directory exists in deployment

### Config not loading
- **Fix:** Check browser console for errors
- **Fix:** Verify meta tags are set correctly in `index.html`
- **Fix:** Check that backend URL is correct

## 📝 Quick Reference

**Settings to Update:**
```
Root Directory: apps/shooter-game/frontend
Build Command: cd ../.. && npm run build:frontend
Install Command: cd ../.. && npm install
```

**Commands to Run:**
```bash
# Local (before pushing)
npm run build:frontend  # Optional - tests build
git add .
git commit -m "Your message"
git push

# Vercel will auto-deploy
```

---

**Last Updated:** 2025-01-04

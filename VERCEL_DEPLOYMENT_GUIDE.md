# Vercel Deployment Guide

This guide explains how to deploy both the frontend and backend to Vercel with the new multi-app architecture.

## Overview

- **Frontend**: Static site (`apps/shooter-game/frontend/`) - serves the game with wallet connection
- **Backend**: Next.js API (`backend/` directory) - handles SUI blockchain interactions
- **Base Infrastructure**: Shared code in `base/` (included in deployments)

## Option 1: Two Separate Vercel Projects (Recommended)

This is the cleanest approach - deploy frontend and backend as separate projects.

### Step 1: Deploy Backend

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `suitwoonsui/SuiTwoShooter`
4. Configure the project:
   - **Project Name**: `suitwo-backend` (or your preferred name)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `backend`
   - **Branch**: `sui-integration`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

5. **Environment Variables** (Add these in Vercel dashboard):
   ```
   SUI_NETWORK=testnet
   SUI_RPC_URL=https://fullnode.testnet.sui.io:443
   ADMIN_WALLET_ADDRESS=your_admin_wallet_address
   ADMIN_WALLET_PRIVATE_KEY=your_admin_wallet_private_key
   GAME_OWNER_ADDRESS=your_game_owner_address
   PACKAGE_ID=your_package_id
   SCORE_SUBMISSION_MODULE=score_submission
   PREMIUM_STORE_MODULE=premium_store
   MEWS_MODULE=mews
   TREASURY_CAP_ID=your_treasury_cap_id
   STORE_REGISTRY_ID=your_store_registry_id
   ```

6. Click **"Deploy"**

7. **Note the backend URL** (e.g., `https://suitwo-backend.vercel.app`)

### Step 2: Deploy Frontend

1. In Vercel Dashboard, click **"Add New..."** → **"Project"** again
2. Import the same repository: `suitwoonsui/SuiTwoShooter`
3. Configure the project:
   - **Project Name**: `suitwo-game` (or your preferred name)
   - **Framework Preset**: Other (static site)
   - **Root Directory**: `apps/shooter-game/frontend`
   - **Branch**: `sui-integration` (or your main branch)
   - **Build Command**: Leave empty (static site)
   - **Output Directory**: `.` (serves from root directory)
   - **Install Command**: Leave empty or `npm install` if needed

4. **Environment Variables** (Optional - the frontend will auto-detect):
   - The frontend automatically detects the backend URL based on the hostname
   - For custom configuration, you can add a meta tag in `index.html`:
     ```html
     <meta name="backend-url" content="https://suitwo-backend.vercel.app/api">
     ```
   - The base config is in `base/frontend/src/config/api-config.js` (loaded automatically)

5. **Backend URL Configuration**:
   - The frontend uses `base/frontend/src/config/api-config.js` for base configuration
   - App-specific config is in `apps/shooter-game/frontend/src/config/contract-config.js`
   - All API calls use `window.GAME_CONFIG.API_BASE_URL`
   - Production automatically detects from meta tags or uses configured URLs
   - Development uses `http://localhost:3000/api`

6. Click **"Deploy"**

### Step 3: Verify Configuration

The frontend is already configured to use the backend URL automatically:
- `base/frontend/src/config/api-config.js` handles backend URL detection (base config)
- `apps/shooter-game/frontend/src/config/contract-config.js` handles app-specific contracts
- All API calls use `window.GAME_CONFIG.API_BASE_URL`
- Production automatically uses meta tags or configured URLs
- Development uses `http://localhost:3000/api`

**Important**: After deploying the backend, update the backend URL via meta tag in `apps/shooter-game/frontend/index.html` or ensure the base config detects it correctly.

## Option 2: Single Vercel Project with Monorepo

Alternatively, you can use Vercel's monorepo support:

1. Create a single project in Vercel
2. Use `vercel.json` at root to configure both
3. Set up rewrites to proxy API calls to backend

This is more complex but keeps everything in one project.

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables set correctly
- [ ] Frontend can connect to backend API
- [ ] Wallet connection works
- [ ] SUI blockchain interactions work
- [ ] CORS configured correctly (backend allows frontend origin)
- [ ] Test score submission
- [ ] Test store functionality
- [ ] Test leaderboard

## Troubleshooting

### CORS Issues
If you see CORS errors, check `backend/lib/cors.ts` and ensure it allows your frontend domain.

### Environment Variables
Make sure all required environment variables are set in Vercel dashboard for the backend project.

### Build Errors
- Check Node.js version (should be >= 18.0.0)
- Ensure all dependencies are in `package.json`
- Check build logs in Vercel dashboard

### API Not Found
- Verify backend URL is correct
- Check that base API routes are in `base/backend/app/api/` directory
- Check that game API routes are in `apps/shooter-game/backend/app/api/` directory
- Ensure Next.js build completed successfully
- Verify imports use correct relative paths to base services

## Custom Domains

After deployment, you can add custom domains in Vercel dashboard:
- Frontend: `game.yourdomain.com`
- Backend: `api.yourdomain.com`

## Continuous Deployment

Both projects will automatically deploy when you push to the `sui-integration` branch (or merge to main when ready).


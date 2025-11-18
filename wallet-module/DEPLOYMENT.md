# Wallet Module Vercel Deployment

This guide explains how to deploy the wallet-module as a standalone Vercel project.

## Deployment Steps

1. **Go to Vercel Dashboard**
   - Visit [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **"Add New..."** → **"Project"**

2. **Import Repository**
   - Import your GitHub repository: `suitwoonsui/SuiTwoShooter`
   - Select the **`sui-integration`** branch

3. **Configure Project**
   - **Project Name**: `suitwo-wallet-module` (or your preferred name)
   - **Framework Preset**: Other (or Vite if detected)
   - **Root Directory**: `wallet-module`
   - **Build Command**: `npm install && npm run build` (or leave empty, vercel.json has it)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install` (or leave empty, vercel.json has it)

4. **Environment Variables**
   - No environment variables needed for the wallet module build
   - The module is network-agnostic and works with any Sui network

5. **Deploy**
   - Click **"Deploy"**
   - Wait for the build to complete

## After Deployment

Once deployed, your wallet module will be available at:
- `https://your-project-name.vercel.app/wallet-api.umd.cjs`

## Update Frontend to Use Deployed Module

After deployment, update your frontend `index.html` to use the deployed URL:

```html
<!-- Replace this: -->
<script src="wallet-module/dist/wallet-api.umd.cjs"></script>

<!-- With this: -->
<script src="https://your-project-name.vercel.app/wallet-api.umd.cjs"></script>
```

Or use a relative path if deploying from the same monorepo.

## Build Output

The build process will:
1. Install dependencies (including React, ReactDOM, @mysten/dapp-kit)
2. Run `vite build` to create the UMD bundle
3. Output `dist/wallet-api.umd.cjs` which is served as a static file

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure Node.js version is >= 18.0.0
- Check build logs in Vercel dashboard

### Module Not Loading
- Verify the file is accessible at the deployed URL
- Check browser console for CORS errors
- Ensure the Content-Type header is set to `application/javascript`

### React Errors
- The module bundles React internally, so no external React is needed
- If you see React errors, check that the bundle loaded correctly


# Frontend Configuration Guide

This guide explains how to configure the frontend to connect to your deployed backend and wallet module.

## Quick Setup

After deploying your backend and wallet module to Vercel, you need to update the frontend configuration with the actual URLs.

## Method 1: Update Default URLs in Code (Recommended for Quick Setup)

Edit `src/config/api-config.js` and update these lines with your actual Vercel URLs:

```javascript
// Line 34: Update with your backend URL
config.backendUrl = isProduction 
  ? 'https://YOUR-BACKEND-PROJECT.vercel.app/api'  // Replace with your actual backend URL
  : 'http://localhost:3000/api';

// Line 41: Update with your wallet module URL  
config.walletModuleUrl = isProduction
  ? 'https://YOUR-WALLET-MODULE-PROJECT.vercel.app/wallet-api.umd.cjs'  // Replace with your actual wallet module URL
  : 'wallet-module/dist/wallet-api.umd.cjs';
```

## Method 2: Use Meta Tags (Recommended for Production)

Add meta tags to `index.html` in the `<head>` section:

```html
<head>
  <!-- ... existing head content ... -->
  
  <!-- Backend API URL -->
  <meta name="backend-url" content="https://YOUR-BACKEND-PROJECT.vercel.app/api">
  
  <!-- Wallet Module URL -->
  <meta name="wallet-module-url" content="https://YOUR-WALLET-MODULE-PROJECT.vercel.app/wallet-api.umd.cjs">
  
  <!-- ... rest of head content ... -->
</head>
```

Meta tags take precedence over default values, so this is the cleanest way to configure production URLs.

## Finding Your Vercel URLs

1. **Backend URL:**
   - Go to your backend Vercel project dashboard
   - Copy the "Production" URL (e.g., `https://suitwo-backend.vercel.app`)
   - Add `/api` to the end: `https://suitwo-backend.vercel.app/api`

2. **Wallet Module URL:**
   - Go to your wallet module Vercel project dashboard
   - Copy the "Production" URL (e.g., `https://suitwo-wallet-module.vercel.app`)
   - Add `/wallet-api.umd.cjs` to the end: `https://suitwo-wallet-module.vercel.app/wallet-api.umd.cjs`

## Verification

After updating the configuration:

1. Deploy the frontend to Vercel
2. Open the browser console on your deployed frontend
3. You should see:
   ```
   🔧 API Base URL: https://your-backend.vercel.app/api
   🔧 Wallet Module URL: https://your-wallet-module.vercel.app/wallet-api.umd.cjs
   📦 Loading wallet module from: https://your-wallet-module.vercel.app/wallet-api.umd.cjs
   ✅ Wallet bundle loaded
   ✅ Wallet API initialized
   ```

## Troubleshooting

### Wallet Module Not Loading
- Check that the wallet module URL is correct and accessible
- Verify the wallet module deployment succeeded
- Check browser console for CORS errors
- Ensure the file path is correct: `/wallet-api.umd.cjs`

### Backend API Not Responding
- Verify the backend URL is correct
- Check that CORS is configured on the backend to allow your frontend domain
- Test the backend URL directly in browser: `https://your-backend.vercel.app/api/health`

### CORS Errors
- Make sure your backend's CORS configuration includes your frontend domain
- Check `backend/lib/cors.ts` for CORS settings
- Add your frontend URL to allowed origins if needed


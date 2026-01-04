# Local Development Setup

This guide explains how to run the entire application locally instead of deploying to Vercel for testing.

## Architecture

The application consists of three main components:

1. **Frontend** - Static HTML/JS game (port 8000)
2. **Backend** - Next.js API server (port 3000)
3. **Wallet Module** - Vite-built UMD bundle (served from frontend or separate dev server)

## Quick Start

### Option 1: Run All Services (Recommended)

Use the provided script to start all services:

```bash
npm run dev:all
```

This will:
- Start the backend on `http://localhost:3000`
- Build and watch the wallet module
- Start the frontend on `http://localhost:8000`

### Option 2: Run Services Individually

#### 1. Start Backend API Server

```bash
cd backend
npm install  # First time only
npm run dev
```

Backend will run on `http://localhost:3000`

#### 2. Build Wallet Module (for local serving)

```bash
cd wallet-module
npm install  # First time only
npm run build
```

This creates `wallet-module/dist/wallet-api.umd.cjs` which the frontend will serve.

**For development with hot reload:**
```bash
cd wallet-module
npm run dev
```
This runs Vite dev server on `http://localhost:5173`. You'll need to update the frontend config to use this URL.

#### 3. Start Frontend Server

```bash
npm install  # First time only
npm run dev
```

Frontend will run on `http://localhost:8000`

Open `http://localhost:8000` in your browser.

## Configuration

### Automatic Localhost Detection

The frontend automatically detects when running on `localhost` and:
- Uses `http://localhost:3000/api` for backend API
- Uses `wallet-module/dist/wallet-api.umd.cjs` for wallet module (local file)

No configuration needed! Just run the services and open `http://localhost:8000`.

### Manual Override (if needed)

If you need to override the URLs, you can add meta tags to `index.html`:

```html
<meta name="backend-url" content="http://localhost:3000/api">
<meta name="wallet-module-url" content="wallet-module/dist/wallet-api.umd.cjs">
```

Or for Vite dev server:
```html
<meta name="wallet-module-url" content="http://localhost:5173/wallet-api.umd.cjs">
```

## Environment Variables

### Backend

Create `backend/.env.local`:

```env
# Sui Network (testnet or mainnet)
SUI_NETWORK=testnet

# RPC URL (optional, uses default if not set)
# SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# CORS Origin (optional, defaults to * for development)
# CORS_ORIGIN=http://localhost:8000

# API Base URL (optional, defaults to localhost:3000 for local dev)
# API_BASE_URL=http://localhost:3000
```

### Frontend

No environment variables needed - it auto-detects localhost.

## Troubleshooting

### Wallet Module Not Loading

1. Make sure you've built the wallet module:
   ```bash
   cd wallet-module && npm run build
   ```

2. Check browser console for errors

3. Verify the file exists: `wallet-module/dist/wallet-api.umd.cjs`

### Backend API Not Responding

1. Check backend is running: `http://localhost:3000/api/config`
2. Check CORS settings in `backend/config/config.ts`
3. Verify backend logs for errors

### CORS Errors

The backend should allow `localhost:8000` by default. If you see CORS errors:
1. Check `backend/config/config.ts` - `corsOrigin` should be `*` or include your origin
2. Restart the backend server

### Port Already in Use

If port 3000 or 8000 is already in use:

**Backend (port 3000):**
```bash
PORT=3001 cd backend && npm run dev
```

**Frontend (port 8000):**
Edit `server.js` and change `PORT = 8000` to another port.

## Development Workflow

1. **Start all services:**
   ```bash
   npm run dev:all
   ```

2. **Make changes:**
   - Frontend: Edit files in `src/` - refresh browser
   - Backend: Edit files in `backend/` - Next.js auto-reloads
   - Wallet Module: Edit files in `wallet-module/src/` - rebuild with `npm run build`

3. **Test locally:**
   - Open `http://localhost:8000`
   - Connect wallet
   - Play game and test badge minting

4. **When ready to deploy:**
   - Commit changes
   - Push to trigger Vercel deployment

## Hot Reload Options

### Backend (Next.js)
- Auto-reloads on file changes ✅

### Frontend
- Manual refresh needed (static server)
- Consider using a file watcher or live reload tool

### Wallet Module
- **Option A:** Rebuild after changes: `cd wallet-module && npm run build`
- **Option B:** Use Vite dev server and update frontend config to use `http://localhost:5173/wallet-api.umd.cjs`

## Notes

- The frontend automatically detects `localhost` and switches to local URLs
- Backend defaults to `localhost:3000` when not on Vercel
- Wallet module must be built before frontend can use it
- All services can run simultaneously on different ports


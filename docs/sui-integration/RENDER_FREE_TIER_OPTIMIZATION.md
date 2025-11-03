# Render Free Tier Optimization

## ⚠️ Render Free Tier Limitations

**Important:** Render's free tier has limitations that affect your backend:

1. **Automatic Spin-Down:** Services spin down after 15 minutes of inactivity
2. **Cold Starts:** First request after spin-down takes 30-60 seconds (slow response)
3. **Resource Limits:** Limited CPU/RAM (may affect performance)
4. **Usage Limits:** Limited requests per month (check Render's current limits)

**Impact on Your Game:**
- Users experience slow first request after inactivity
- Leaderboard may be slow to load
- Score submission may time out on cold start

---

## 🎯 Optimization Strategies

### 1. Keep-Alive Service (Prevent Spin-Down)

**Strategy:** Use an external service to ping your backend every 10-14 minutes to keep it alive.

#### Option A: UptimeRobot (Free - Recommended)

**Setup:**
1. Sign up at [UptimeRobot.com](https://uptimerobot.com) (free tier: 50 monitors)
2. Add a new HTTP(s) monitor:
   - **URL:** `https://your-backend.onrender.com/health`
   - **Type:** HTTP(s)
   - **Interval:** 5 minutes (check every 5 minutes)
   - **Alert Contacts:** Your email (optional)
3. Monitor will ping your backend every 5 minutes
4. **Result:** Backend stays alive, no cold starts!

**Pros:**
- ✅ Free (50 monitors)
- ✅ Automatic (set it and forget it)
- ✅ Prevents spin-down
- ✅ No code changes needed

**Cons:**
- ⚠️ Uses external service (dependency)
- ⚠️ Free tier limits (50 monitors)

#### Option B: GitHub Actions (Free - Advanced)

**Setup:** Create a GitHub Actions workflow that pings your backend:

`.github/workflows/keep-alive.yml`:
```yaml
name: Keep Render Alive

on:
  schedule:
    # Run every 10 minutes
    - cron: '*/10 * * * *'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Backend
        run: |
          curl -f https://your-backend.onrender.com/health || exit 1
```

**Pros:**
- ✅ Free (unlimited GitHub Actions minutes for public repos)
- ✅ No external service dependency
- ✅ Fully automated

**Cons:**
- ⚠️ Requires GitHub repository
- ⚠️ More complex setup

---

### 2. Client-Side Caching (Reduce API Calls)

**Strategy:** Cache API responses on the frontend to reduce backend requests.

#### Leaderboard Caching

**Update `src/game/blockchain/api-client.js`:**

```javascript
// Add caching to reduce API calls
const API_CACHE = {
  leaderboard: {
    data: null,
    timestamp: 0,
    ttl: 60000, // 60 seconds cache
  },
  tokenBalance: {
    data: {},
    timestamp: {},
    ttl: 30000, // 30 seconds cache per address
  }
};

// Cached leaderboard fetch
async function fetchLeaderboard(useCache = true) {
  const now = Date.now();
  const cache = API_CACHE.leaderboard;
  
  // Return cached data if still valid
  if (useCache && cache.data && (now - cache.timestamp < cache.ttl)) {
    console.log('📦 Using cached leaderboard');
    return cache.data;
  }
  
  // Fetch fresh data
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
    const data = await response.json();
    
    // Update cache
    cache.data = data;
    cache.timestamp = now;
    
    return data;
  } catch (error) {
    // Fallback to cache if available
    if (cache.data) {
      console.warn('⚠️ API error, using cached leaderboard');
      return cache.data;
    }
    throw error;
  }
}

// Cached token balance check
async function checkTokenBalance(address, useCache = true) {
  const now = Date.now();
  const cache = API_CACHE.tokenBalance;
  
  // Return cached data if still valid
  if (useCache && cache.data[address] && (now - (cache.timestamp[address] || 0) < cache.ttl)) {
    console.log(`📦 Using cached balance for ${address}`);
    return cache.data[address];
  }
  
  // Fetch fresh data
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens/balance/${address}`);
    const data = await response.json();
    
    // Update cache
    cache.data[address] = data;
    cache.timestamp[address] = now;
    
    return data;
  } catch (error) {
    // Fallback to cache if available
    if (cache.data[address]) {
      console.warn('⚠️ API error, using cached balance');
      return cache.data[address];
    }
    throw error;
  }
}
```

**Benefits:**
- ✅ Reduces API calls by 80-90%
- ✅ Faster response times (instant from cache)
- ✅ Works even if backend is slow/cold
- ✅ Graceful fallback to cache on errors

---

### 3. Batch Requests (Reduce API Calls)

**Strategy:** Combine multiple checks into single requests when possible.

#### Example: Check Balance + Subscription Status

**Backend: Add combined endpoint (`backend/src/routes/tokens.js`):**

```javascript
/**
 * GET /api/tokens/status/:walletAddress
 * Combined check: token balance + subscription status
 */
router.get('/status/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Check both in parallel
    const [balance, subscription] = await Promise.all([
      suiService.getTokenBalance(walletAddress),
      subscriptionService.checkSubscription(walletAddress), // If you have this
    ]);
    
    res.json({
      address: walletAddress,
      balance: balance,
      subscription: subscription,
      canPlay: balance.hasMinimumBalance || subscription.isActive,
    });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Frontend: Use combined endpoint:**

```javascript
// Instead of 2 separate calls:
// const balance = await checkTokenBalance(address);
// const subscription = await checkSubscription(address);

// Use 1 combined call:
const status = await fetch(`${API_BASE_URL}/api/tokens/status/${address}`);
const { balance, subscription, canPlay } = await status.json();
```

**Benefits:**
- ✅ Reduces API calls by 50% (2 calls → 1 call)
- ✅ Faster overall (parallel processing)
- ✅ Less backend load

---

### 4. Optimize Backend Response Times

**Strategy:** Make backend responses faster to reduce timeout risk during cold starts.

#### Add Health Check Endpoint (Fast Response)

**Backend (`backend/src/routes/health.js`):**

```javascript
const express = require('express');
const router = express.Router();

/**
 * GET /health
 * Fast health check (no blockchain queries)
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'suitwo-backend',
    timestamp: Date.now(),
    // Don't query blockchain here (keep it fast)
  });
});

module.exports = router;
```

**Use for keep-alive:** UptimeRobot pings `/health` (fast, no blockchain queries)

#### Optimize Leaderboard Query

**Backend: Limit query size and add caching:**

```javascript
// In backend/src/services/sui-service.js
let leaderboardCache = {
  data: null,
  timestamp: 0,
  ttl: 60000, // 60 seconds
};

async getLeaderboard(limit = 100) {
  const now = Date.now();
  
  // Return cached data if still valid
  if (leaderboardCache.data && (now - leaderboardCache.timestamp < leaderboardCache.ttl)) {
    return leaderboardCache.data;
  }
  
  // Query blockchain (limit to top N)
  const events = await this.client.queryEvents({
    query: {
      MoveModule: {
        package: this.gameScoreContract.split('::')[0],
        module: 'game',
      },
    },
    limit: limit, // Only fetch what you need
    order: 'descending',
  });
  
  // Parse and cache
  const scores = events.data.map(/* ... */);
  leaderboardCache.data = scores;
  leaderboardCache.timestamp = now;
  
  return scores;
}
```

**Benefits:**
- ✅ Faster responses (cached data)
- ✅ Less blockchain queries (reduces RPC calls)
- ✅ Lower backend load

---

### 5. Graceful Degradation (Handle Cold Starts)

**Strategy:** Frontend handles slow/cold backend gracefully.

#### Frontend: Add Timeout and Retry Logic

**Update `src/game/blockchain/api-client.js`:**

```javascript
// Add timeout and retry for cold starts
async function fetchWithRetry(url, options = {}, retries = 3) {
  const timeout = 30000; // 30 second timeout
  
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Use in API calls
async function fetchLeaderboard() {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/leaderboard`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch leaderboard after retries:', error);
    // Fallback to cached data or show error
    return { leaderboard: [], error: 'Backend unavailable' };
  }
}
```

**Benefits:**
- ✅ Handles cold starts gracefully (retries)
- ✅ User experience doesn't break
- ✅ Automatic recovery

---

### 6. Reduce Score Submission Calls

**Strategy:** Only submit scores when necessary (not on every game over).

**Current Flow:** Game ends → Always submit to blockchain

**Optimized Flow:**
- Submit only if score qualifies (top 100, personal best, etc.)
- Or batch submissions (submit multiple scores at once)

**Example: Batch Score Submission (Future Enhancement)**

```javascript
// Store scores locally, submit in batches
const PENDING_SCORES = [];

function queueScoreSubmission(scoreData) {
  PENDING_SCORES.push(scoreData);
  
  // Submit immediately if queue is full (batch)
  if (PENDING_SCORES.length >= 5) {
    submitBatchScores();
  }
}

async function submitBatchScores() {
  if (PENDING_SCORES.length === 0) return;
  
  const batch = PENDING_SCORES.splice(0, 5); // Submit 5 at once
  
  // Backend endpoint: POST /api/scores/batch
  await fetch(`${API_BASE_URL}/api/scores/batch`, {
    method: 'POST',
    body: JSON.stringify({ scores: batch }),
  });
}
```

**Note:** For MVP, keep simple (submit immediately). Add batching later if needed.

---

## 📊 Request Optimization Summary

### Before Optimization:
- **Leaderboard:** Every page load (1 request)
- **Token Balance:** Every wallet connection (1 request)
- **Score Submission:** Every game over (1 request)
- **Total:** ~3-5 requests per user session

### After Optimization:
- **Leaderboard:** Cached (1 request per 60 seconds)
- **Token Balance:** Cached (1 request per 30 seconds per address)
- **Score Submission:** Only when needed (1 request per game)
- **Total:** ~1-2 requests per user session (60% reduction)

---

## 🎯 Recommended Setup for Free Tier

### Minimum Setup (Easy):

1. ✅ **UptimeRobot keep-alive** (5 minute intervals)
   - Prevents spin-down
   - Free, easy setup

2. ✅ **Client-side caching** (leaderboard, token balance)
   - Reduces API calls
   - Faster responses

3. ✅ **Fast health check endpoint** (`/health`)
   - Used for keep-alive
   - No blockchain queries

### Enhanced Setup (Better Performance):

1. ✅ All minimum setup items
2. ✅ **Backend caching** (leaderboard cache)
3. ✅ **Batch requests** (combined status check)
4. ✅ **Retry logic** (handle cold starts)

---

## 📈 Monitoring

### Track These Metrics:

- **Cold Start Frequency:** How often backend spins down
- **API Response Times:** Average response time
- **Request Count:** Total requests per day
- **Error Rate:** Failed requests (timeouts, cold starts)

### Render Dashboard:

- Monitor service uptime
- Check request counts
- Watch for cold start warnings
- Track resource usage

---

## 💰 Upgrading to Paid Tier

**When to Upgrade:**
- User base growing (more requests)
- Cold starts causing issues
- Need better performance
- Need more resources

**Render Paid Tier Benefits:**
- ✅ No automatic spin-down
- ✅ Better performance (more resources)
- ✅ Higher request limits
- ✅ Better support

**Cost:** ~$7-25/month (depending on plan)

---

## 🔗 Related Documents

- [02. Backend Setup](./02-backend-setup.md) - Backend configuration
- [06. Testing & Deployment](./06-testing-deployment.md) - Render deployment
- [03. Sui SDK Integration](./03-sui-sdk-integration.md) - API endpoints


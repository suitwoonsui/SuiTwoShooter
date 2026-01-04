# Technical Architecture for SaaS Platform

## Overview

This document outlines the technical architecture needed to transform the current tournament system into a multi-tenant SaaS platform that supports multiple games, creators, and API consumers.

## Core Principles

1. **Multi-Tenant Architecture**: Support multiple games/organizations
2. **API-First Design**: All functionality accessible via API
3. **Blockchain-Native**: Smart contracts remain core infrastructure
4. **Scalable**: Handle thousands of concurrent tournaments
5. **Secure**: Proper authentication, authorization, rate limiting

---

## Architecture Layers

### 1. Blockchain Layer (Sui)

**Current State:**
- Single game contract
- Tournament registry per game
- Direct integration with game

**SaaS Requirements:**
- **Option A: Shared Contracts with Tenant IDs**
  - Single tournament contract for all tenants
  - Tenant ID stored in tournament metadata
  - Lower gas costs, simpler deployment
  - Risk: Single point of failure

- **Option B: Per-Tenant Contract Deployment**
  - Each tenant gets their own contract
  - Complete isolation
  - Higher gas costs, more complex
  - Better for enterprise/white-label

**Recommendation: Start with Option A, migrate to Option B for enterprise**

**Contract Updates Needed:**
```move
struct Tournament has key {
    // ... existing fields ...
    tenant_id: vector<u8>,        // NEW: Tenant identifier
    game_id: vector<u8>,           // NEW: Game identifier
    api_key_hash: vector<u8>,     // NEW: API key hash (optional)
}
```

---

### 2. API Layer

**Current State:**
- REST APIs for game-specific tournaments
- Admin endpoints
- User endpoints

**SaaS Requirements:**
- **Multi-Tenant API**
  - Tenant identification via API key
  - Game identification via game_id
  - Rate limiting per tenant
  - Usage tracking per tenant

**API Structure:**
```
/api/v1/tournaments
  - Tenant identified via API key header
  - Game identified via game_id parameter
  - All endpoints support multi-tenancy
```

**Authentication:**
- API keys for programmatic access
- OAuth 2.0 for user-facing apps (future)
- Wallet signatures for Web3 integration

---

### 3. Database Layer

**Current State:**
- Single database for one game
- Tournament data, leaderboards, participants

**SaaS Requirements:**
- **Multi-Tenant Database Schema**

**Option A: Shared Database with Tenant ID**
```sql
-- All tables include tenant_id
CREATE TABLE tournaments (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    game_id VARCHAR(255) NOT NULL,
    tournament_id BIGINT NOT NULL,
    -- ... existing fields ...
    UNIQUE(tenant_id, game_id, tournament_id)
);

CREATE INDEX idx_tenant_game ON tournaments(tenant_id, game_id);
```

**Option B: Separate Database per Tenant**
- Complete isolation
- Better for enterprise
- More complex to manage
- Higher infrastructure costs

**Recommendation: Start with Option A**

---

### 4. Application Layer

**Current State:**
- Next.js backend
- Game-specific services
- Direct blockchain integration

**SaaS Requirements:**
- **Multi-Tenant Service Layer**

**Service Architecture:**
```typescript
// Tenant-aware service wrapper
class TournamentService {
  constructor(tenantId: string, gameId: string) {
    this.tenantId = tenantId;
    this.gameId = gameId;
  }

  async createTournament(config: TournamentConfig) {
    // Validate tenant has permission
    // Create tournament with tenant_id and game_id
    // Track usage for billing
  }
}

// API middleware
function withTenant(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const tenant = await getTenantByApiKey(apiKey);
  req.tenant = tenant;
  req.gameId = req.query.game_id || req.body.game_id;
  next();
}
```

---

## API Design

### Authentication

**API Key Authentication:**
```
Header: X-API-Key: <api_key>
```

**API Key Structure:**
- Format: `sk_live_<random_32_chars>` or `sk_test_<random_32_chars>`
- Stored as hash in database
- Rate limits per key
- Usage tracking per key

**Key Management:**
- Users can create multiple API keys
- Keys can be revoked
- Keys have scopes (read, write, admin)
- Keys can have rate limits

---

### Rate Limiting

**Free Tier (Default):**
- 100 requests/minute
- 10,000 requests/day
- 100 tournaments/month

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

**Implementation:**
- Redis for rate limit tracking
- Sliding window algorithm
- Per-API-key limits

---

### API Endpoints

**Base URL:** `https://api.tournament-platform.com/v1`

**Tournament Management:**
```
POST   /tournaments                    # Create tournament
GET    /tournaments                    # List tournaments
GET    /tournaments/:id                # Get tournament
PUT    /tournaments/:id                # Update tournament (before start)
DELETE /tournaments/:id                # Cancel tournament
POST   /tournaments/:id/enter          # Enter tournament
GET    /tournaments/:id/leaderboard    # Get leaderboard
POST   /tournaments/:id/submit-score   # Submit score
POST   /tournaments/:id/end            # End tournament
POST   /tournaments/:id/distribute     # Distribute rewards
```

**Query Parameters:**
- `game_id`: Required for all endpoints
- `status`: Filter by status (active, ended, cancelled)
- `category`: Filter by category
- `limit`, `offset`: Pagination

**Example Request:**
```bash
curl -X POST https://api.tournament-platform.com/v1/tournaments \
  -H "X-API-Key: sk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "game_id": "my-game",
    "name": "Weekly Tournament",
    "category": "highestScore",
    "start_time": 1640995200000,
    "end_time": 1641600000000,
    "entry_fee_tickets": 1,
    "reward_config": null,
    "starting_ante_usd_cents": 0
  }'
```

---

## Multi-Tenancy Implementation

### Tenant Isolation

**Data Isolation:**
- All queries filtered by tenant_id
- Database row-level security (if supported)
- API middleware enforces tenant context

**Code Example:**
```typescript
// Middleware
async function tenantMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const tenant = await db.tenants.findOne({ api_key_hash: hash(apiKey) });
  if (!tenant) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.tenant = tenant;
  next();
}

// Service usage
app.post('/tournaments', tenantMiddleware, async (req, res) => {
  const service = new TournamentService(req.tenant.id, req.body.game_id);
  const tournament = await service.createTournament(req.body);
  res.json(tournament);
});
```

---

## Scalability Considerations

### Database Scaling

**Current:** Single database
**SaaS:** 
- Read replicas for leaderboard queries
- Connection pooling
- Query optimization with proper indexes
- Partitioning by tenant_id (if needed)

### Caching Strategy

**Redis Cache:**
- Tournament metadata: 5-minute TTL
- Leaderboards: 30-second TTL
- Active tournaments list: 1-minute TTL
- API key validation: 5-minute TTL

### Queue System

**Background Jobs:**
- Reward distribution (async)
- Leaderboard updates (batched)
- Tournament end processing
- Usage tracking

**Implementation:**
- Bull (Redis-based queue)
- Separate queues per priority
- Retry logic for failed jobs

---

## Security

### API Security

1. **API Key Validation**
   - Hash comparison (never store plain keys)
   - Rate limiting per key
   - Revocation support

2. **Input Validation**
   - Schema validation (Zod/Joi)
   - Sanitization
   - SQL injection prevention (parameterized queries)

3. **Rate Limiting**
   - Per-API-key limits
   - Global rate limits
   - DDoS protection

4. **CORS**
   - Whitelist allowed origins
   - Per-tenant CORS settings (future)

### Blockchain Security

1. **Transaction Validation**
   - Verify tournament ownership
   - Validate entry fees
   - Prevent double-spending

2. **Smart Contract Security**
   - Audit contracts
   - Upgrade mechanism (if needed)
   - Emergency pause (if needed)

---

## Monitoring & Observability

### Metrics to Track

1. **API Metrics**
   - Request rate per tenant
   - Error rate per endpoint
   - Response times
   - Rate limit hits

2. **Business Metrics**
   - Tournaments created per tenant
   - Active tournaments per tenant
   - Entry fees collected
   - Revenue per tenant

3. **Infrastructure Metrics**
   - Database query performance
   - Cache hit rates
   - Queue processing times
   - Blockchain transaction costs

### Logging

- Structured logging (JSON)
- Log aggregation (Datadog/LogRocket)
- Error tracking (Sentry)
- Audit logs for all tournament operations

---

## Deployment Architecture

### Current: Single Deployment
- Next.js on Vercel
- Single database
- Direct blockchain connection

### SaaS: Multi-Region (Future)

**Phase 1: Single Region**
- Vercel/Cloudflare for API
- Managed database (Supabase/PlanetScale)
- Redis for caching/queues

**Phase 2: Multi-Region**
- CDN for static assets
- Database replication
- Regional API endpoints
- Blockchain RPC load balancing

---

## Migration Strategy

### From Current System to SaaS

**Step 1: Add Tenant Support**
- Add tenant_id to database schema
- Add tenant_id to API endpoints
- Migrate existing data (default tenant)

**Step 2: API Key System**
- Create API key management
- Add authentication middleware
- Add rate limiting

**Step 3: Multi-Game Support**
- Add game_id to all tables
- Update services to be game-aware
- Update API to require game_id

**Step 4: Usage Tracking**
- Track API calls per tenant
- Track tournament creation per tenant
- Build billing system

**Step 5: Dashboard**
- Tenant dashboard
- API key management UI
- Usage analytics
- Billing portal

---

## Technology Stack

### Backend
- **Framework**: Next.js (current) or Express/Fastify
- **Database**: PostgreSQL (Supabase/PlanetScale)
- **Cache/Queue**: Redis (Upstash)
- **Blockchain**: Sui SDK

### Infrastructure
- **Hosting**: Vercel/Cloudflare Workers
- **Database**: Managed PostgreSQL
- **CDN**: Cloudflare
- **Monitoring**: Datadog/Sentry

### Development
- **TypeScript**: Type safety
- **Testing**: Jest/Vitest
- **CI/CD**: GitHub Actions
- **Documentation**: OpenAPI/Swagger

---

## Next Steps

1. Design API key system
2. Create multi-tenant database schema
3. Build authentication middleware
4. Implement rate limiting
5. Create tenant management API
6. Build usage tracking system
7. Design billing integration

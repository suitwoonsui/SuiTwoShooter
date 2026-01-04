# API Design Specification

## Overview

This document specifies the API design for the tournament platform SaaS, including authentication, endpoints, rate limiting, and usage tracking.

## Core Principles

1. **Free API Access**: No subscription required, revenue from tournament fees
2. **API Key Authentication**: Simple, secure authentication
3. **RESTful Design**: Standard HTTP methods and status codes
4. **JSON Responses**: All responses in JSON format
5. **Versioning**: API versioned via URL path
6. **Rate Limiting**: Per-API-key limits to prevent abuse

---

## Base URL

**Production:** `https://api.tournament-platform.com/v1`  
**Staging:** `https://api-staging.tournament-platform.com/v1`

---

## Authentication

### API Keys

**Format:**
- Live: `sk_live_<32_random_chars>`
- Test: `sk_test_<32_random_chars>`

**Header:**
```
X-API-Key: sk_live_abc123def456...
```

**Security:**
- Keys stored as hashes in database (never plain text)
- Keys can be revoked
- Keys have scopes (read, write, admin)
- Keys can have custom rate limits

---

### Key Management

**Create API Key:**
```
POST /api-keys
Authorization: Bearer <user_token>

Response:
{
  "success": true,
  "api_key": "sk_live_abc123...",
  "key_id": "key_123",
  "created_at": "2024-01-01T00:00:00Z",
  "scopes": ["read", "write"],
  "rate_limit": {
    "requests_per_minute": 100,
    "requests_per_day": 10000
  }
}
```

**List API Keys:**
```
GET /api-keys

Response:
{
  "success": true,
  "keys": [
    {
      "key_id": "key_123",
      "prefix": "sk_live_abc...",
      "created_at": "2024-01-01T00:00:00Z",
      "last_used": "2024-01-15T10:30:00Z",
      "scopes": ["read", "write"]
    }
  ]
}
```

**Revoke API Key:**
```
DELETE /api-keys/:key_id

Response:
{
  "success": true,
  "message": "API key revoked"
}
```

---

## Rate Limiting

### Default Limits (Free Tier)

- **100 requests per minute**
- **10,000 requests per day**
- **100 tournaments per month**

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

**Status:** `429 Too Many Requests`

```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retry_after": 60
}
```

---

## Endpoints

### Tournament Management

#### Create Tournament

```
POST /tournaments
```

**Headers:**
- `X-API-Key`: Required
- `Content-Type: application/json`

**Body:**
```json
{
  "game_id": "my-game",                    // Required: Game identifier
  "name": "Weekly High Score Tournament",   // Required: Tournament name
  "category": "highestScore",              // Required: Tournament category
  "start_time": 1640995200000,             // Required: Unix timestamp (ms)
  "end_time": 1641600000000,               // Required: Unix timestamp (ms)
  "entry_fee_tickets": 1,                  // Required: Tickets required to enter
  "reward_config": null,                   // Optional: Custom reward config
  "starting_ante_usd_cents": 0,            // Optional: Starting prize pool
  "payment_token": "MEWS"                  // Optional: Payment token (default: MEWS)
}
```

**Response:**
```json
{
  "success": true,
  "tournament": {
    "tournament_id": 123,
    "name": "Weekly High Score Tournament",
    "category": "highestScore",
    "status": "active",
    "start_time": 1640995200000,
    "end_time": 1641600000000,
    "entry_fee_tickets": 1,
    "prize_pool_usd_cents": 0,
    "participants": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "created_by": "0x1234...",
    "object_id": "0xabc...",
    "transaction_hash": "0xdef..."
  },
  "payment": {
    "creation_fee_usd_cents": 500,
    "starting_ante_usd_cents": 0,
    "reward_cost_usd_cents": 0,
    "total_usd_cents": 500,
    "transaction": "base64_encoded_transaction"
  }
}
```

**Errors:**
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Invalid API key
- `402 Payment Required`: Insufficient balance
- `429 Too Many Requests`: Rate limit exceeded

---

#### List Tournaments

```
GET /tournaments
```

**Query Parameters:**
- `game_id`: Required - Game identifier
- `status`: Optional - Filter by status (active, ended, cancelled)
- `category`: Optional - Filter by category
- `limit`: Optional - Results per page (default: 20, max: 100)
- `offset`: Optional - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "tournaments": [
    {
      "tournament_id": 123,
      "name": "Weekly High Score Tournament",
      "category": "highestScore",
      "status": "active",
      "start_time": 1640995200000,
      "end_time": 1641600000000,
      "entry_fee_tickets": 1,
      "prize_pool_usd_cents": 5000,
      "participants": 25,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

#### Get Tournament

```
GET /tournaments/:id
```

**Query Parameters:**
- `game_id`: Required - Game identifier

**Response:**
```json
{
  "success": true,
  "tournament": {
    "tournament_id": 123,
    "name": "Weekly High Score Tournament",
    "category": "highestScore",
    "status": "active",
    "start_time": 1640995200000,
    "end_time": 1641600000000,
    "entry_fee_tickets": 1,
    "prize_pool_usd_cents": 5000,
    "starting_ante_usd_cents": 0,
    "participants": 25,
    "created_at": "2024-01-01T00:00:00Z",
    "created_by": "0x1234...",
    "reward_config": null,
    "reward_token": "MEWS"
  }
}
```

---

#### Enter Tournament

```
POST /tournaments/:id/enter
```

**Query Parameters:**
- `game_id`: Required - Game identifier

**Body:**
```json
{
  "player_address": "0x5678...",  // Required: Player wallet address
  "player_name": "Player1"         // Optional: Player name
}
```

**Response:**
```json
{
  "success": true,
  "entry": {
    "tournament_id": 123,
    "player_address": "0x5678...",
    "player_name": "Player1",
    "entered_at": "2024-01-01T12:00:00Z",
    "transaction_hash": "0xghi..."
  }
}
```

---

#### Submit Score

```
POST /tournaments/:id/submit-score
```

**Query Parameters:**
- `game_id`: Required - Game identifier

**Body:**
```json
{
  "player_address": "0x5678...",     // Required
  "player_name": "Player1",          // Optional
  "score": 50000,                    // Required: Primary metric
  "coins": 100,                       // Optional: For tie-breaking
  "distance": 5000,                   // Optional: For tie-breaking
  "bosses_defeated": 2,               // Optional: For tie-breaking
  "enemies_defeated": 50,             // Optional: For tie-breaking
  "longest_coin_streak": 10           // Optional: For tie-breaking
}
```

**Response:**
```json
{
  "success": true,
  "submission": {
    "tournament_id": 123,
    "player_address": "0x5678...",
    "rank": 5,
    "value": 50000,
    "submitted_at": "2024-01-01T12:00:00Z",
    "transaction_hash": "0xjkl..."
  }
}
```

---

#### Get Leaderboard

```
GET /tournaments/:id/leaderboard
```

**Query Parameters:**
- `game_id`: Required - Game identifier
- `limit`: Optional - Number of results (default: 10, max: 100)
- `offset`: Optional - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "player_address": "0xabcd...",
      "player_name": "TopPlayer",
      "value": 100000,
      "tie_breaker": {
        "coins": 500,
        "distance": 10000
      }
    }
  ],
  "tournament": {
    "tournament_id": 123,
    "name": "Weekly High Score Tournament",
    "category": "highestScore",
    "participants": 25
  }
}
```

---

#### End Tournament

```
POST /tournaments/:id/end
```

**Query Parameters:**
- `game_id`: Required - Game identifier

**Response:**
```json
{
  "success": true,
  "tournament": {
    "tournament_id": 123,
    "status": "ended",
    "ended_at": "2024-01-01T23:59:59Z"
  }
}
```

---

#### Distribute Rewards

```
POST /tournaments/:id/distribute
```

**Query Parameters:**
- `game_id`: Required - Game identifier

**Response:**
```json
{
  "success": true,
  "distribution": {
    "tournament_id": 123,
    "distributed_at": "2024-01-01T23:59:59Z",
    "player_rewards": 10,
    "creator_reward": 1,
    "total_distributed": 11,
    "transaction_hashes": ["0x...", "0x..."]
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "additional error details"
  }
}
```

### Common Error Codes

- `invalid_api_key`: API key is invalid or revoked
- `rate_limit_exceeded`: Rate limit exceeded
- `invalid_input`: Request body validation failed
- `tournament_not_found`: Tournament doesn't exist
- `tournament_ended`: Tournament has already ended
- `insufficient_balance`: Insufficient balance for operation
- `unauthorized`: Not authorized for this operation
- `server_error`: Internal server error

---

## Webhooks (Future)

### Webhook Events

- `tournament.created`
- `tournament.ended`
- `tournament.entry.created`
- `tournament.score.submitted`
- `tournament.rewards.distributed`

### Webhook Payload

```json
{
  "event": "tournament.score.submitted",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "tournament_id": 123,
    "player_address": "0x5678...",
    "rank": 5,
    "value": 50000
  }
}
```

---

## SDKs (Future)

### Planned SDKs

- **JavaScript/TypeScript**: `npm install @tournament-platform/sdk`
- **Python**: `pip install tournament-platform`
- **Unity**: Unity package
- **Unreal**: Unreal plugin

### Example Usage (JavaScript)

```javascript
import { TournamentPlatform } from '@tournament-platform/sdk';

const client = new TournamentPlatform({
  apiKey: 'sk_live_abc123...',
  gameId: 'my-game'
});

// Create tournament
const tournament = await client.tournaments.create({
  name: 'Weekly Tournament',
  category: 'highestScore',
  startTime: Date.now() + 86400000,
  endTime: Date.now() + 604800000,
  entryFeeTickets: 1
});

// Enter tournament
await client.tournaments.enter(tournament.tournament_id, {
  playerAddress: '0x5678...',
  playerName: 'Player1'
});

// Submit score
await client.tournaments.submitScore(tournament.tournament_id, {
  playerAddress: '0x5678...',
  score: 50000,
  coins: 100
});

// Get leaderboard
const leaderboard = await client.tournaments.getLeaderboard(tournament.tournament_id);
```

---

## Usage Tracking

### Tracked Metrics

- API calls per key
- Tournaments created per key
- Entries per tournament
- Revenue per key
- Error rate per key

### Usage Endpoint

```
GET /usage
```

**Response:**
```json
{
  "success": true,
  "usage": {
    "period": "2024-01",
    "api_calls": 1500,
    "tournaments_created": 25,
    "rate_limit_remaining": 8500,
    "revenue": {
      "creation_fees": 125.00,
      "platform_fees": 37.50,
      "total": 162.50
    }
  }
}
```

---

## Next Steps

1. Implement API key system
2. Build authentication middleware
3. Create API endpoints
4. Implement rate limiting
5. Build usage tracking
6. Create API documentation site
7. Build SDKs
8. Implement webhooks

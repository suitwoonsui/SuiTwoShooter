# Security Considerations

## 🔒 Overview

Security is critical when integrating blockchain technology. This section covers essential security practices for your Sui integration.

**Your Architecture:**
- **Primary Security Layer:** Smart contract validation (on-chain)
- **Secondary Security Layer:** Backend transaction verification
- **No Database:** All data on-chain (simpler, more secure)
- **Testnet First:** Always test on testnet before mainnet deployment

---

## 1. Wallet Signature Verification

### Transaction-Based Verification (Recommended)

**Your setup: Users sign transactions directly** - no need for separate signature verification:

- ✅ **Transactions are signed by wallet:** User signs with their wallet (Sui Wallet extension)
- ✅ **On-chain verification:** Sui blockchain verifies signature automatically
- ✅ **Backend verifies transaction:** Backend checks transaction hash exists and succeeded

### Implementation

```javascript
// Backend verifies transaction (not signature directly)
async function verifyTransaction(transactionHash, expectedPlayerAddress) {
  const tx = await suiClient.getTransactionBlock({
    digest: transactionHash,
    options: {
      showEffects: true,
      showEvents: true,
      showInput: true,
    },
  });

  // Check transaction succeeded
  if (tx.effects?.status?.status !== 'success') {
    return { valid: false, reason: 'Transaction failed' };
  }

  // Verify player address from transaction sender
  const sender = tx.transaction?.data?.sender;
  if (sender?.toLowerCase() !== expectedPlayerAddress?.toLowerCase()) {
    return { valid: false, reason: 'Address mismatch' };
  }

  return { valid: true, transaction: tx };
}
```

**Note:** In your flow, users sign transactions on the frontend, then backend verifies the transaction hash. The blockchain itself verifies the signature.

---

## 2. Score Validation

### Primary: On-Chain Validation (Smart Contract)

**Your smart contract is the primary security layer** - it validates all game data before accepting submissions:

- ✅ **Tier Validation:** `tier == bossesDefeated + 1` (exact match, no overlap)
- ✅ **Distance Validation:** Minimum 35 units traveled (prevents instant submissions)
- ✅ **Exact Score Calculation:** Uses enemy types, boss tiers, and boss hits for precise validation
  - Enemy score: `15 × enemy.type` for each enemy (exact calculation)
  - Boss score: `5000 × boss.tier` for each boss defeated (exact calculation)
  - Boss hit score: Total damage dealt (points = damage per hit, bossHits is total damage, not count)
  - Expected score = enemy component + boss component + boss hit component
  - Minimum threshold: 90% of expected score (tightened from 25% → 75% → 80% → 90% as score system consistently achieves 100% accuracy)
  - Maximum threshold: 20× expected score (prevents exploitation)
- ✅ **Tier Progression Validation:** Tier must match boss count (anti-cheat)
- ✅ **Lives Validation:** Lives remaining must be 0-3
- ✅ **Projectile Level Validation:** Must be 1-6
- ✅ **Coin Limit:** Coins cannot exceed 1000 (prevents exploitation)

**All validation happens on-chain** - backend only verifies the transaction was successful.

### Client-Side Security (Anti-Cheat)

**Client-side security system** (`game-security.js`) provides additional protection:

- ✅ **Boss Defeat Bonus Whitelist:** Allows specific boss defeat bonuses (5000, 10000, 15000, 20000) without rate limiting
- ✅ **Score Change Validation:** Validates score progression patterns, but allows legitimate boss bonuses
- ✅ **Rate Limiting Bypass:** Boss defeat bonuses skip per-second rate limiting (they're one-time rewards)
- ✅ **Exact Tracking:** Tracks enemy types, boss tiers, and boss hits for accurate score calculation
- ✅ **Validation Accuracy:** 98.8% accuracy (within acceptable variance for real-time gameplay)

**Implementation Details:**
- Boss defeat bonuses are whitelisted in `validateScoreChange()` method
- `incrementScore()` method skips rate limiting validation for boss bonuses
- Score validation uses exact calculations matching the smart contract

### Backend Verification (Secondary)

**Backend verifies transactions, not game data:**

```javascript
// Example: Verify transaction on-chain
async function verifyScoreSubmission(transactionHash) {
  const tx = await suiClient.getTransactionBlock({
    digest: transactionHash,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  // Check transaction succeeded
  if (tx.effects?.status?.status !== 'success') {
    return { valid: false, reason: 'Transaction failed on-chain' };
  }

  // Check for ScoreSubmitted event
  const scoreEvent = tx.events?.find(
    e => e.type === 'ScoreSubmitted'
  );

  if (!scoreEvent) {
    return { valid: false, reason: 'Score event not found' };
  }

  return { valid: true, scoreData: scoreEvent.parsedJson };
}
```

### Rate Limiting (Prevent Spam)

- Implement rate limiting for score submissions
- Track submission patterns per wallet address
- Prevent DoS attacks

---

## 3. API Security

### Essential Practices

- **Use HTTPS everywhere**
  - Never expose API keys or secrets
  - Use environment variables for sensitive data
  
- **Implement API key authentication**
  - Require API keys for sensitive endpoints
  - Rotate keys regularly
  
- **Rate limiting per wallet address**
  - Prevent abuse and DoS attacks
  - Set reasonable limits per endpoint
  
- **Input validation and sanitization**
  - Validate all inputs (wallet addresses, transaction hashes)
  - Sanitize user-provided data
  - Note: Game data validation happens on-chain (smart contract), not in backend
  
- **CORS configuration**
  - Restrict CORS to specific origins
  - Don't use wildcard (`*`) in production

### Example: Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const scoreSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each wallet to 10 requests per windowMs
  keyGenerator: (req) => req.body.walletAddress,
  message: 'Too many score submissions, please try again later.',
});

router.post('/submit', scoreSubmissionLimiter, async (req, res) => {
  // ... score submission logic
});
```

---

## 4. Smart Contract Security (Primary Security Layer)

### Your Contract's Anti-Cheat Validation

**Your smart contract (`score_submission.move`) is the primary security layer** - it validates all game data:

### ✅ Validation Checks in Contract

1. **Distance Validation:**
   ```move
   assert!(validate_distance_minimum(distance), 1); // Error 1: Distance too low
   // Minimum 35 units (prevents instant submissions)
   ```

2. **Score Logic Validation:**
   ```move
   assert!(validate_score_logic(score, coins, bosses_defeated, distance), 2);
   // Score must make sense based on actions
   ```

3. **Tier Progression Validation:**
   ```move
   assert!(validate_tier_progression(tier, bosses_defeated), 3);
   // Tier must exactly match bossesDefeated + 1 (no overlap)
   ```

4. **Lives Validation:**
   ```move
   assert!(lives_remaining <= 3, 4); // Error 4: Invalid lives
   ```

5. **Projectile Level Validation:**
   ```move
   assert!(projectile_level >= 1 && projectile_level <= 6, 5);
   ```

6. **Coin Limit:**
   ```move
   assert!(coins <= 1000, 6); // Error 6: Coin count too high
   ```

### Best Practices

- **Test contracts thoroughly**
  - Write comprehensive unit tests (`game.test.move`)
  - Test valid and invalid score submissions
  - Test edge cases (minimum distance, maximum coins, tier boundaries)
  - **Test on testnet before mainnet deployment**
  
- **Validate all inputs** (Already implemented ✅)
  - All validations happen in `submit_game_session` function
  - Clear error codes for debugging
  
- **Handle edge cases** (Already implemented ✅)
  - Overflow protection (Sui Move has built-in overflow checks)
  - Boundary checks (tier 1-4, lives 0-3, etc.)
  
- **Ownership Validation** (Built into Sui)
  - `tx_context::sender(ctx)` cannot be faked
  - Player address is cryptographically verified

### ✅ Admin-Only Access Control (Prevents Unauthorized Submissions)

**Critical Security Feature:** Only the admin wallet can submit scores on behalf of players.

- ✅ **AdminCapability Pattern:** Uses Sui's capability-based access control
  - `AdminCapability` struct is created and owned by the admin wallet
  - `submit_game_session_for_player()` requires `&AdminCapability` as first parameter
  - Sui's type system enforces that only the capability owner can pass it
  - Prevents unauthorized users from calling the contract directly

- ✅ **Prevents Direct Contract Calls:**
  - Without the `AdminCapability`, users cannot submit scores directly to the contract
  - All score submissions must go through the backend API
  - Backend validates and submits using the admin wallet

- ✅ **Setup Required:**
  - After contract deployment, call `create_admin_capability(admin_address)`
  - This creates the `AdminCapability` object and transfers it to the admin wallet
  - Store the `AdminCapability` object ID in backend environment variables
  - Backend passes this object ID when submitting scores

**Implementation:**
```move
// Admin capability - only admin wallet can submit scores
struct AdminCapability has key, store {
    id: UID,
}

// Function requires admin capability (proves caller is admin)
public entry fun submit_game_session_for_player(
    _admin_cap: &AdminCapability,  // Only admin can provide this
    registry: &mut SessionRegistry,
    player: address,
    // ... other parameters
) { /* ... */ }
```

**Security Benefits:**
- ✅ Prevents unauthorized score submissions
- ✅ Ensures all submissions go through validated backend API
- ✅ Admin wallet pays gas fees (centralized control)
- ✅ Cannot be bypassed - Sui's type system enforces ownership

---

## 5. On-Chain Data Security (No Database for MVP)

### Your Setup: Query Blockchain Directly

**You don't use a database for MVP** - all data is on-chain:

- ✅ **Leaderboard:** Queries `ScoreSubmitted` events from blockchain
- ✅ **Player Scores:** Queries events filtered by wallet address
- ✅ **Token Balance:** Queries blockchain directly via Sui SDK
- ✅ **Burn Statistics:** Queries `BurnStats` object from blockchain

### Security Benefits

- **Immutability:** Once submitted, scores can't be altered
- **Transparency:** All data is publicly verifiable
- **No Database Attacks:** No SQL injection, no database compromise risk
- **Single Source of Truth:** Blockchain is authoritative

### Future: If Adding Database (Optional)

If you later add a database for caching/performance:
- Use parameterized queries (prevent SQL injection)
- Encrypt sensitive data if storing PII
- Limit database access (least privilege)
- Cache can be invalidated/regenerated from blockchain

---

## 6. Environment Variables

### Security

- **Never commit secrets to git**
  - Use `.env` files (add to `.gitignore`)
  - Use secrets management services in production
  - Rotate secrets regularly

### Production Secrets Management

- **Use secure secret storage**
  - AWS Secrets Manager
  - HashiCorp Vault
  - Environment-specific configuration

---

## 7. Token Gatekeeping Security

### Additional Considerations

- **Verify token balance on-chain**
  - Don't rely solely on cached data
  - Re-verify for critical operations
  
- **Handle race conditions**
  - Consider token transfers during check
  - Use atomic operations where possible

---

## Security Checklist

### ✅ Smart Contract Security (Primary Layer)
- [ ] Smart contract validates tier progression (tier == bossesDefeated + 1)
- [ ] Smart contract validates minimum distance (35 units)
- [ ] Smart contract validates score logic (score vs. actions)
- [ ] Smart contract validates all bounds (lives, projectile level, coins)
- [ ] Smart contract unit tests written and passing
- [ ] Smart contract tested on **testnet** before mainnet
- [ ] Smart contract error codes are clear and helpful

### ✅ Backend Security
- [ ] Transaction verification implemented (verify transaction hash)
- [ ] API rate limiting configured (per wallet address)
- [ ] HTTPS enforced in production
- [ ] CORS properly configured (restrict to Vercel frontend origin)
- [ ] Environment variables secured (no secrets in code)
- [ ] Error messages don't leak sensitive info
- [ ] Logging configured (no secrets in logs)

### ✅ Frontend Security
- [ ] Wallet connection uses official Sui Wallet extension
- [ ] No sensitive data in client-side code
- [ ] Transaction signing handled by wallet (user controls private key)
- [ ] Token balance checked before allowing game start

### ✅ Deployment Security
- [ ] Testnet testing completed before mainnet
- [ ] Environment variables set in Render (backend) and Vercel (frontend)
- [ ] Monitoring and alerting set up (if available)
- [ ] Rollback plan documented

---

## Incident Response

### Preparation

- **Document response procedures**
- **Have rollback plans ready**
- **Monitor for suspicious activity**
- **Keep audit logs**

### If Compromised

1. Immediately disable affected endpoints
2. Analyze attack vector
3. Patch vulnerabilities
4. Notify affected users if necessary
5. Review and strengthen security measures

---

## 🔄 Next Steps

- [09. Migration Strategy](./09-migration-strategy.md) - Plan secure rollout
- [06. Testing & Deployment](./06-testing-deployment.md) - Include security testing

---

**Related Documents:**
- [Overview & Architecture](./01-overview-and-architecture.md)
- [Testing & Deployment](./06-testing-deployment.md)


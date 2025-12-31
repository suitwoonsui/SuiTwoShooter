# 🎮 Insomnia Game Backend

Backend service for Insomnia Game with game owner wallet integration for consuming game credits.

## 🚀 Features

- **Game Owner Wallet Integration**: Secure wallet management for blockchain transactions
- **Credit Consumption API**: Deduct game credits without user wallet intervention
- **Security**: Rate limiting, CORS, helmet security headers
- **Health Monitoring**: Health check endpoints and graceful shutdown

## 🏗️ Architecture

```
Frontend → Backend API → Game Owner Wallet → Sui Blockchain
```

- **Frontend**: Calls `/api/consume-credit` when user starts game
- **Backend**: Validates request and manages game owner wallet
- **Game Owner Wallet**: Signs transactions and pays gas fees
- **Sui Blockchain**: Executes `consume_game_credit_for_user` function

## 📋 Prerequisites

- Node.js 18+ 
- Sui CLI installed
- Game owner wallet with SUI balance for gas fees
- Updated smart contract with `consume_game_credit_for_user` function

## 🔧 Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   - `GAME_OWNER_PRIVATE_KEY`: Your game owner wallet private key
   - `PACKAGE_ID`: Your deployed smart contract package ID
   - `GAME_PASS_SYSTEM_ID`: Your deployed GamePassSystem object ID

3. **Deploy Updated Smart Contract**
   ```bash
   cd ../contracts/InsomniaGame
   sui client publish --gas-budget 10000000
   ```
   
   Update the package ID in `.env` after deployment.

## 🚀 Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📡 API Endpoints

### POST `/api/consume-credit`
Consume a game credit for a user.

**Request Body:**
```json
{
  "gamePassId": "0x...",
  "playerAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Game credit consumed successfully",
  "transactionDigest": "0x...",
  "gamePassStatus": {
    "gamesRemaining": 9,
    "isActive": true
  }
}
```

### GET `/api/consume-credit/status/:gamePassId`
Get current status of a game pass.

## 🔐 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend origin only
- **Helmet**: Security headers
- **Input Validation**: Request body validation
- **Private Key Protection**: Environment variable only

## 🧪 Testing

```bash
npm test
```

## 📊 Monitoring

- **Health Check**: `GET /health`
- **Logs**: Console output with emojis for easy reading
- **Transaction Tracking**: Full transaction details and events

## 🚨 Important Notes

1. **Never commit private keys** to version control
2. **Ensure sufficient SUI balance** in game owner wallet
3. **Update smart contract** before running backend
4. **Monitor gas fees** and wallet balance

## 🔄 Integration with Frontend

The frontend will call the backend API when a user starts a game:

```typescript
// Frontend calls this when first block is clicked
const response = await fetch('/api/consume-credit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ gamePassId, playerAddress })
});

if (response.ok) {
  const result = await response.json();
  // Credit consumed, update UI
}
```

## 🎯 Next Steps

1. Deploy updated smart contract
2. Set up environment variables
3. Test backend service
4. Update frontend to call backend API
5. Test end-to-end credit consumption

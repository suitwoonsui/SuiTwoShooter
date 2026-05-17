# Admin Add Items - Authentication Setup & Usage

## 🎯 Quick Start Options

### Option 1: Web UI (Recommended - No API Key Needed)

The easiest way to add items is through the web UI with wallet authentication:

**Access:** `http://localhost:8000/admin-add-items.html`

- ✅ No API key needed (handled server-side)
- ✅ Wallet authentication (connect admin wallet)
- ✅ Visual form interface
- ✅ Automatic transaction signing

**See:** [STORE_ADMIN_WEB_UI.md](./STORE_ADMIN_WEB_UI.md) for detailed guide

### Option 2: Direct API (For Scripts/Automation)

Use the API endpoint with API key authentication for automated scripts or integrations.

**See:** Setup instructions below

---

## 🔐 Setup (For Direct API Access)

### 1. Generate an API Key

Generate a secure random API key:

**Using OpenSSL:**
```bash
openssl rand -hex 32
```

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 2. Add to Environment Variables

Add the API key to your `.env.local` file in the `backend/` directory:

```bash
API_KEY=your-generated-api-key-here
```

**⚠️ Security:** Never commit this to version control!

### 3. Restart Backend

Restart your backend server to load the new environment variable:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## 📝 Usage

### PowerShell Example

```powershell
# Set your API key
$apiKey = "your-api-key-here"

# Set the request body
$body = @{
    playerAddress = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0"
    items = @(
        @{
            itemId = "extraLives"
            level = 2
            quantity = 5
        },
        @{
            itemId = "forceField"
            level = 3
            quantity = 1
        }
    )
} | ConvertTo-Json

# Make the request with API key in Authorization header
Invoke-RestMethod -Uri "http://localhost:3000/api/store/admin/add-items" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $apiKey"
    } `
    -Body $body
```

### Alternative: Using X-API-Key Header

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/store/admin/add-items" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "X-API-Key" = $apiKey
    } `
    -Body $body
```

### curl Example

```bash
# Set your API key
export API_KEY="your-api-key-here"

# Make the request
curl -X POST http://localhost:3000/api/store/admin/add-items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "playerAddress": "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0",
    "items": [
      {
        "itemId": "extraLives",
        "level": 2,
        "quantity": 5
      }
    ]
  }'
```

## ✅ Success Response

```json
{
  "success": true,
  "digest": "0x...",
  "message": "Successfully added 1 item(s) to inventory"
}
```

## ❌ Error Responses

### Unauthorized (401)
```json
{
  "success": false,
  "error": "Unauthorized. Valid API key required."
}
```

**Causes:**
- Missing `Authorization` or `X-API-Key` header
- Invalid API key
- API key not configured in backend `.env.local`

### Invalid Request (400)
```json
{
  "success": false,
  "error": "Invalid playerAddress. Must be a valid Sui address."
}
```

## 🔍 Testing

### Test Authentication

```powershell
# Test without API key (should fail)
Invoke-RestMethod -Uri "http://localhost:3000/api/store/admin/add-items" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body '{"playerAddress":"0x...","items":[]}'
# Expected: 401 Unauthorized

# Test with invalid API key (should fail)
Invoke-RestMethod -Uri "http://localhost:3000/api/store/admin/add-items" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer wrong-key"
    } `
    -Body '{"playerAddress":"0x...","items":[]}'
# Expected: 401 Unauthorized

# Test with valid API key (should succeed)
# Use the example from above with your actual API key
```

## 🛡️ Security Best Practices

1. **Use Strong Keys:** Generate keys with at least 32 random characters
2. **Rotate Regularly:** Change API keys periodically
3. **Limit Access:** Only share API keys with trusted admins
4. **Monitor Logs:** Check backend logs for unauthorized access attempts
5. **Use HTTPS:** In production, always use HTTPS to protect API keys in transit
6. **Environment Separation:** Use different API keys for testnet and mainnet

## 📊 Logging

The backend logs all admin operations:

**Successful Request:**
```
🔐 [ADMIN ADD API] Authenticated admin request from <IP>
🎁 [ADMIN ADD API] Received request to add items
   Admin: <IP>
   Player: 0x...
   Items: [...]
✅ [ADMIN ADD] Items added successfully!
```

**Failed Authentication:**
```
⚠️ [AUTH] Unauthorized admin access attempt
   IP: <IP>
   Path: /api/store/admin/add-items
```

## 🚨 Troubleshooting

### "Unauthorized. Valid API key required."
- **Check:** Is `API_KEY` set in `.env.local`?
- **Check:** Did you restart the backend after adding the API key?
- **Check:** Is the API key in the request header correct?
- **Check:** Are you using `Authorization: Bearer <key>` or `X-API-Key: <key>`?

### "API_KEY not configured in environment variables"
- **Solution:** Add `API_KEY=...` to your `.env.local` file
- **Solution:** Restart the backend server

### API key works locally but not in production
- **Check:** Is the API key set in your production environment?
- **Check:** Are you using the correct environment variable name?
- **Check:** Is the backend reading from the correct `.env` file?

---

**Remember:** Keep your API key secret and secure! 🔐


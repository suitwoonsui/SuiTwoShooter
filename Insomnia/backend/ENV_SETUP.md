# 🔧 Environment Setup for Contract Migration

## 📋 **Required Environment Variables**

### **Backend `.env` File**

```env
# Sui Network Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Game Owner Wallet (for paying gas fees during migration)
GAME_OWNER_PRIVATE_KEY=your_private_key_here

# OLD Contract IDs (for migration FROM)
# These are your current deployed contracts with player data
OLD_SCORE_SYSTEM_ID=0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3
OLD_GAME_PASS_SYSTEM_ID=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
OLD_ADMIN_SYSTEM_ID=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890

# NEW Contract IDs (for migration TO and active use)
# These are your newly deployed contracts with leaderboard features
PACKAGE_ID=0x766b2e22af48c70f218c664e7793ddb5a153668077ebf6e32afaa9723fc8a6de
SCORE_SYSTEM_ID=0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14
GAME_PASS_SYSTEM_ID=0xeb28c8cf9b90b98dddf4e90ec62e274fa8e68fe1fabf7e16b5796d6c3099e074
ADMIN_SYSTEM_ID=0x01493433bea557b8c0334e6d9b56b2c2f9eae58dcc85fe7c738f63b8d8f1b341

# Migration Configuration
MIGRATION_BATCH_SIZE=10
MIGRATION_DELAY_MS=1000
```

### **Frontend `.env.local` File**

```env
# NEW Contract IDs (active use after migration)
NEXT_PUBLIC_SCORE_SYSTEM_ID=0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14
NEXT_PUBLIC_GAME_PASS_SYSTEM_ID=0xeb28c8cf9b90b98dddf4e90ec62e274fa8e68fe1fabf7e16b5796d6c3099e074
NEXT_PUBLIC_ADMIN_SYSTEM_ID=0x01493433bea557b8c0334e6d9b56b2c2f9eae58dcc85fe7c738f63b8d8f1b341

# OLD Contract IDs (for migration status display only)
NEXT_PUBLIC_OLD_SCORE_SYSTEM_ID=0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3
NEXT_PUBLIC_OLD_GAME_PASS_SYSTEM_ID=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
NEXT_PUBLIC_OLD_ADMIN_SYSTEM_ID=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

## 🔄 **Migration Workflow**

### **Phase 1: Deploy New Contracts**
1. Deploy new contracts with leaderboard features
2. Save new contract IDs
3. Update environment files with new IDs

### **Phase 2: Configure Migration**
1. Add OLD contract IDs to backend `.env`
2. Add OLD contract IDs to frontend `.env.local` (optional)
3. Restart backend to load new configuration

### **Phase 3: Run Migration**
1. Use migration tool to transfer data
2. Verify migration success
3. Test new contracts with migrated data

### **Phase 4: Switch to New Contracts**
1. Frontend automatically uses new contracts
2. Backend uses new contracts for active operations
3. Old contracts can be deprecated

## ⚠️ **Important Notes**

- **Backend needs OLD contracts** to read data during migration
- **Frontend uses NEW contracts** for all operations
- **Game passes are critical** - ensure they're migrated first
- **Test migration** with small dataset before full migration
- **Keep old contracts running** until migration is verified

## 🔍 **Verification Commands**

```bash
# Check migration status
curl "http://localhost:3001/api/migration/status?oldContracts=%7B%22scoreSystem%22%3A%220xOLD_SCORE%22%7D&newContracts=%7B%22scoreSystem%22%3A%220xNEW_SCORE%22%7D"

# Verify migration
curl -X POST http://localhost:3001/api/migration/verify \
  -H "Content-Type: application/json" \
  -d '{"oldContracts":{"scoreSystem":"0xOLD_SCORE"},"newContracts":{"scoreSystem":"0xNEW_SCORE"}}'
```

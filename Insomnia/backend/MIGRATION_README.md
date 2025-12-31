# 🔄 Complete Contract Migration System

The Insomnia Game Complete Contract Migration System allows you to migrate **ALL** data from old contracts to new contracts without losing any user progress, achievements, game passes, admin permissions, or active sessions.

## 🎯 **What It Migrates**

- **🏆 ScoreSystem** - Player statistics, achievements, and skill tiers
- **🎫 GamePassSystem** - Player game passes and access permissions  
- **👑 AdminSystem** - Admin accounts and role permissions
- **🎮 GameCore** - Active game sessions and current game state

## 🚀 **Quick Start**

### **1. Complete Migration (All Contracts)**

```bash
cd backend
node migrate-contracts.js '{"scoreSystem":"0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3","gamePassSystem":"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"}' '{"scoreSystem":"0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14","gamePassSystem":"0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"}'
```

### **2. Simple Migration (ScoreSystem Only)**

```bash
cd backend
node migrate-contracts.js --simple 0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3 0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14
```

### **3. Use API Endpoints**

```bash
# Complete migration
curl -X POST http://localhost:3001/api/migration/start \
  -H "Content-Type: application/json" \
  -d '{
    "oldContracts": {
      "scoreSystem": "0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3",
      "gamePassSystem": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    },
    "newContracts": {
      "scoreSystem": "0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14",
      "gamePassSystem": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    }
  }'

# Check migration status
curl "http://localhost:3001/api/migration/status?oldContracts=%7B%22scoreSystem%22%3A%220xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3%22%7D&newContracts=%7B%22scoreSystem%22%3A%220x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14%22%7D"

# Verify migration
curl -X POST http://localhost:3001/api/migration/verify \
  -H "Content-Type: application/json" \
  -d '{
    "oldContracts": {
      "scoreSystem": "0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3"
    },
    "newContracts": {
      "scoreSystem": "0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14"
    }
  }'

# Legacy ScoreSystem-only migration
curl -X POST http://localhost:3001/api/migration/score-system \
  -H "Content-Type: application/json" \
  -d '{
    "oldContractId": "0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3",
    "newContractId": "0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14"
  }'
```

## 📊 **Migration Process**

### **Phase 1: Data Reading & Validation**
- Connects to all old contracts
- Reads all player data, game passes, admin permissions, and active sessions
- Validates data integrity across all systems

### **Phase 2: Complete Data Migration**
- **ScoreSystem**: Migrates player statistics, achievements, and skill tiers
- **GamePassSystem**: Migrates game passes and access permissions
- **AdminSystem**: Migrates admin accounts and role permissions  
- **GameCore**: Migrates active game sessions and current state

### **Phase 3: Comprehensive Verification**
- Compares data counts across all contract types
- Ensures no data loss during migration
- Reports any migration failures with detailed error tracking

## 🔧 **Configuration**

### **Environment Variables Required**

```env
# Sui Network
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Game Owner Wallet (for paying gas fees)
GAME_OWNER_PRIVATE_KEY=your_private_key_here

# New Contract IDs (after deployment)
PACKAGE_ID=0x766b2e22af48c70f218c664e7793ddb5a153668077ebf6e32afaa9723fc8a6de
SCORE_SYSTEM_ID=0x106303247d0d0e2c27eae19558bcf394b656aab3c36b3e349d98bf08edfc6b14
GAME_PASS_SYSTEM_ID=0xeb28c8cf9b90b98dddf4e90ec62e274fa8e68fe1fabf7e16b5796d6c3099e074
ADMIN_SYSTEM_ID=0x01493433bea557b8c0334e6d9b56b2c2f9eae58dcc85fe7c738f63b8d8f1b341
```

## 📋 **API Reference**

### **POST /api/migration/start**
Starts the complete migration process for all contract types.

**Request Body:**
```json
{
  "oldContracts": {
    "scoreSystem": "0x...",
    "gamePassSystem": "0x...",
    "adminSystem": "0x...",
    "gameCore": "0x..."
  },
  "newContracts": {
    "scoreSystem": "0x...",
    "gamePassSystem": "0x...",
    "adminSystem": "0x...",
    "gameCore": "0x..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Complete migration completed successfully",
  "results": {
    "scoreSystem": {
      "totalPlayers": 25,
      "migratedPlayers": 24,
      "failedMigrations": 1
    },
    "gamePassSystem": {
      "totalGamePasses": 15,
      "migratedGamePasses": 15,
      "failedMigrations": 0
    },
    "adminSystem": {
      "totalAdmins": 3,
      "migratedAdmins": 3,
      "failedMigrations": 0
    },
    "gameCore": {
      "totalSessions": 5,
      "migratedSessions": 5,
      "failedMigrations": 0
    },
    "totalPlayers": 25,
    "totalGamePasses": 15,
    "totalAdmins": 3,
    "totalSessions": 5
  }
}
```

### **GET /api/migration/status**
Checks the current migration status for all contract types.

**Query Parameters:**
- `oldContracts`: JSON string of old contract IDs
- `newContracts`: JSON string of new contract IDs

**Response:**
```json
{
  "success": true,
  "status": {
    "scoreSystem": {
      "oldCount": 25,
      "newCount": 24,
      "progressPercentage": 96,
      "isComplete": false
    },
    "gamePassSystem": {
      "oldCount": 15,
      "newCount": 15,
      "progressPercentage": 100,
      "isComplete": true
    },
    "adminSystem": {
      "oldCount": 3,
      "newCount": 3,
      "progressPercentage": 100,
      "isComplete": true
    },
    "gameCore": {
      "oldCount": 5,
      "newCount": 5,
      "progressPercentage": 100,
      "isComplete": true
    },
    "overall": {
      "progressPercentage": 99,
      "isComplete": false
    }
  }
}
```

### **POST /api/migration/verify**
Verifies that complete migration was successful across all contract types.

**Request Body:**
```json
{
  "oldContracts": {
    "scoreSystem": "0x...",
    "gamePassSystem": "0x..."
  },
  "newContracts": {
    "scoreSystem": "0x...",
    "gamePassSystem": "0x..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "verification": {
    "scoreSystem": {
      "success": true,
      "oldCount": 25,
      "newCount": 25
    },
    "gamePassSystem": {
      "success": true,
      "oldCount": 15,
      "newCount": 15
    },
    "overall": {
      "success": true,
      "warnings": []
    }
  }
}
```

### **POST /api/migration/score-system**
Legacy endpoint for ScoreSystem-only migration (backward compatibility).

**Request Body:**
```json
{
  "oldContractId": "0x...",
  "newContractId": "0x..."
}
```

## ⚠️ **Important Notes**

### **Before Migration**
- ✅ Ensure new contracts are deployed and working
- ✅ Verify game owner wallet has sufficient SUI for gas fees
- ✅ Test migration with a small dataset first
- ✅ Backup old contract data (if possible)
- ✅ **Game passes are critical** - players will lose access without them!

### **During Migration**
- ⏱️ Migration can take several minutes for large datasets
- 💰 Each migration operation costs gas (paid by game owner)
- 🔄 Process can be interrupted and resumed
- 📊 Progress is tracked and reported for each contract type
- 🎫 **Game passes are migrated first** to maintain player access

### **After Migration**
- 🔍 Always verify migration success across all contract types
- 📊 Compare data counts between old and new contracts
- 🧪 Test new contracts with migrated data
- 📝 Document any migration failures
- 🎮 **Test game access** to ensure game passes work correctly

## 🚨 **Troubleshooting**

### **Common Issues**

**1. "Game owner wallet not initialized"**
- Check `GAME_OWNER_PRIVATE_KEY` environment variable
- Ensure wallet has sufficient SUI balance

**2. "No data found in old contracts to migrate"**
- Verify old contract IDs are correct
- Check if old contracts actually have data
- Ensure you're connecting to the right network

**3. "Migration verification failed"**
- Check for failed migrations in the results
- Verify both old and new contracts are accessible
- Ensure new contracts have proper permissions

**4. "Game passes not working after migration"**
- Verify GamePassSystem migration was successful
- Check that new contract has proper game pass logic
- Ensure player addresses match between old and new systems

**5. "Insufficient gas"**
- Increase gas budget in migration script
- Check game owner wallet balance
- Consider migrating in smaller batches

### **Recovery Options**

- **Partial Migration**: Failed migrations are reported and can be retried
- **Resume Migration**: Run migration again to catch missed data
- **Selective Migration**: Migrate only specific contract types if needed
- **Manual Verification**: Use API endpoints to check specific data

## 🔮 **Future Enhancements**

- **Batch Migration**: Process multiple operations in single transactions
- **Rollback Support**: Ability to revert migrations if needed
- **Migration History**: Track all migrations for audit purposes
- **Automated Testing**: Pre-migration validation of contract compatibility
- **Progress Persistence**: Resume interrupted migrations
- **Selective Migration**: Choose which contract types to migrate
- **Data Validation**: Pre-migration data integrity checks

## 📞 **Support**

If you encounter issues with the complete migration system:

1. Check the backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure both old and new contracts are accessible
4. Test with a small dataset first
5. **Pay special attention to game pass migration** - this affects player access

The complete migration system is designed to be safe and reliable, preserving **ALL** your game data during contract upgrades. Always test thoroughly before running on production data!

## 🎯 **Migration Priority**

When migrating, the system follows this priority order:

1. **🎫 GamePassSystem** - Players need access to play
2. **👑 AdminSystem** - Admins need to manage the system
3. **🏆 ScoreSystem** - Player progress and achievements
4. **🎮 GameCore** - Active game sessions

This ensures that players maintain access to the game throughout the migration process.

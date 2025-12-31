const { SuiClient } = require('@mysten/sui/client');

class ContractMigrationService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.client = new SuiClient({
        url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
      });
      this.isInitialized = true;
      console.log('✅ Contract migration service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migration service:', error);
      throw error;
    }
  }

  /**
   * Migrate ALL data from old contracts to new contracts
   */
  async migrateAllContracts(oldContracts, newContracts, gameOwnerWallet) {
    if (!this.isInitialized) {
      throw new Error('Migration service not initialized');
    }

    try {
      console.log('🔄 Starting complete contract migration...');
      console.log('📤 Old Contracts:', Object.keys(oldContracts));
      console.log('📥 New Contracts:', Object.keys(newContracts));
      console.log('');

      const results = {
        scoreSystem: null,
        gamePassSystem: null,
        adminSystem: null,
        gameCore: null,
        totalPlayers: 0,
        totalGamePasses: 0,
        totalAdmins: 0,
        totalSessions: 0
      };

      // 1. Migrate ScoreSystem (Player Statistics)
      if (oldContracts.scoreSystem && newContracts.scoreSystem) {
        console.log('🏆 Migrating ScoreSystem...');
        results.scoreSystem = await this.migratePlayerData(
          oldContracts.scoreSystem, 
          newContracts.scoreSystem, 
          gameOwnerWallet
        );
        if (results.scoreSystem.success) {
          results.totalPlayers = results.scoreSystem.totalPlayers;
        }
        console.log('');
      }

      // 2. Migrate GamePassSystem (Player Access)
      if (oldContracts.gamePassSystem && newContracts.gamePassSystem) {
        console.log('🎫 Migrating GamePassSystem...');
        results.gamePassSystem = await this.migrateGamePasses(
          oldContracts.gamePassSystem, 
          newContracts.gamePassSystem, 
          gameOwnerWallet
        );
        if (results.gamePassSystem.success) {
          results.totalGamePasses = results.gamePassSystem.totalGamePasses;
        }
        console.log('');
      }

      // 3. Migrate AdminSystem (Admin Permissions)
      if (oldContracts.adminSystem && newContracts.adminSystem) {
        console.log('👑 Migrating AdminSystem...');
        results.adminSystem = await this.migrateAdmins(
          oldContracts.adminSystem, 
          newContracts.adminSystem, 
          gameOwnerWallet
        );
        if (results.adminSystem.success) {
          results.totalAdmins = results.adminSystem.totalAdmins;
        }
        console.log('');
      }

      // 4. Migrate GameCore (Active Sessions)
      if (oldContracts.gameCore && newContracts.gameCore) {
        console.log('🎮 Migrating GameCore...');
        results.gameCore = await this.migrateGameSessions(
          oldContracts.gameCore, 
          newContracts.gameCore, 
          gameOwnerWallet
        );
        if (results.gameCore.success) {
          results.totalSessions = results.gameCore.totalSessions;
        }
        console.log('');
      }

      console.log('🎯 Complete migration summary:');
      console.log(`   Players migrated: ${results.totalPlayers}`);
      console.log(`   Game passes migrated: ${results.totalGamePasses}`);
      console.log(`   Admins migrated: ${results.totalAdmins}`);
      console.log(`   Sessions migrated: ${results.totalSessions}`);

      return {
        success: true,
        results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Complete migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Migrate player data from old ScoreSystem to new ScoreSystem
   */
  async migratePlayerData(oldScoreSystemId, newScoreSystemId, gameOwnerWallet) {
    try {
      console.log(`   📊 Migrating player statistics...`);
      
      // Read all player data from old contract
      const oldPlayerData = await this.readAllPlayerData(oldScoreSystemId);
      console.log(`   📊 Found ${oldPlayerData.length} players to migrate`);

      if (oldPlayerData.length === 0) {
        console.log('   ⚠️  No player data found to migrate');
        return { success: true, migratedPlayers: 0, totalPlayers: 0, errors: [] };
      }

      // Migrate each player to new contract
      const results = await this.migratePlayers(oldPlayerData, newScoreSystemId, gameOwnerWallet);
      
      console.log(`   ✅ ScoreSystem migration completed`);
      console.log(`      Successfully migrated: ${results.successful}`);
      console.log(`      Failed migrations: ${results.failed}`);

      return {
        success: true,
        totalPlayers: oldPlayerData.length,
        migratedPlayers: results.successful,
        failedMigrations: results.failed,
        errors: results.errors
      };

    } catch (error) {
      console.error(`   ❌ ScoreSystem migration failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Migrate game passes from old GamePassSystem to new GamePassSystem
   */
  async migrateGamePasses(oldGamePassSystemId, newGamePassSystemId, gameOwnerWallet) {
    try {
      console.log(`   🎫 Migrating game passes...`);
      
      // Read all game passes from old contract
      const oldGamePasses = await this.readAllGamePasses(oldGamePassSystemId);
      console.log(`   🎫 Found ${oldGamePasses.length} game passes to migrate`);

      if (oldGamePasses.length === 0) {
        console.log('   ⚠️  No game passes found to migrate');
        return { success: true, migratedGamePasses: 0, totalGamePasses: 0, errors: [] };
      }

      // Migrate each game pass to new contract
      const results = await this.migrateGamePassesData(oldGamePasses, newGamePassSystemId, gameOwnerWallet);
      
      console.log(`   ✅ GamePassSystem migration completed`);
      console.log(`      Successfully migrated: ${results.successful}`);
      console.log(`      Failed migrations: ${results.failed}`);

      return {
        success: true,
        totalGamePasses: oldGamePasses.length,
        migratedGamePasses: results.successful,
        failedMigrations: results.failed,
        errors: results.errors
      };

    } catch (error) {
      console.error(`   ❌ GamePassSystem migration failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Migrate admin permissions from old AdminSystem to new AdminSystem
   */
  async migrateAdmins(oldAdminSystemId, newAdminSystemId, gameOwnerWallet) {
    try {
      console.log(`   👑 Migrating admin permissions...`);
      
      // Read all admin data from old contract
      const oldAdmins = await this.readAllAdmins(oldAdminSystemId);
      console.log(`   👑 Found ${oldAdmins.length} admins to migrate`);

      if (oldAdmins.length === 0) {
        console.log('   ⚠️  No admin data found to migrate');
        return { success: true, migratedAdmins: 0, totalAdmins: 0, errors: [] };
      }

      // Migrate each admin to new contract
      const results = await this.migrateAdminsData(oldAdmins, newAdminSystemId, gameOwnerWallet);
      
      console.log(`   ✅ AdminSystem migration completed`);
      console.log(`      Successfully migrated: ${results.successful}`);
      console.log(`      Failed migrations: ${results.failed}`);

      return {
        success: true,
        totalAdmins: oldAdmins.length,
        migratedAdmins: results.successful,
        failedMigrations: results.failed,
        errors: results.errors
      };

    } catch (error) {
      console.error(`   ❌ AdminSystem migration failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Migrate game sessions from old GameCore to new GameCore
   */
  async migrateGameSessions(oldGameCoreId, newGameCoreId, gameOwnerWallet) {
    try {
      console.log(`   🎮 Migrating game sessions...`);
      
      // Read all active sessions from old contract
      const oldSessions = await this.readAllGameSessions(oldGameCoreId);
      console.log(`   🎮 Found ${oldSessions.length} game sessions to migrate`);

      if (oldSessions.length === 0) {
        console.log('   ⚠️  No game sessions found to migrate');
        return { success: true, migratedSessions: 0, totalSessions: 0, errors: [] };
      }

      // Migrate each session to new contract
      const results = await this.migrateGameSessionsData(oldSessions, newGameCoreId, gameOwnerWallet);
      
      console.log(`   ✅ GameCore migration completed`);
      console.log(`      Successfully migrated: ${results.successful}`);
      console.log(`      Failed migrations: ${results.failed}`);

      return {
        success: true,
        totalSessions: oldSessions.length,
        migratedSessions: results.successful,
        failedMigrations: results.failed,
        errors: results.errors
      };

    } catch (error) {
      console.error(`   ❌ GameCore migration failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Read all player data from old ScoreSystem contract
   */
  async readAllPlayerData(oldScoreSystemId) {
    try {
      // First, get the ScoreSystem object to find the player_stats_table
      const scoreSystem = await this.client.getObject({
        id: oldScoreSystemId,
        options: { showContent: true }
      });

      if (!scoreSystem.data?.content?.dataType === 'moveObject') {
        console.warn('⚠️  ScoreSystem object not found or invalid format');
        return [];
      }

      const fields = scoreSystem.data.content.fields;
      console.log(`   🔍 ScoreSystem fields:`, Object.keys(fields));
      
      const playerStatsTableId = fields.player_stats_table?.fields?.id?.id;
      console.log(`   🔍 Player stats table field:`, fields.player_stats_table);

      if (!playerStatsTableId) {
        console.warn('⚠️  Player stats table not found in ScoreSystem');
        console.log(`   🔍 Available fields:`, JSON.stringify(fields, null, 2));
        return [];
      }

      console.log(`   📊 Found player stats table: ${playerStatsTableId}`);

      // Get all entries from the player stats table using getDynamicFields
      const result = await this.client.getDynamicFields({
        parentId: playerStatsTableId,
        options: { showContent: true }
      });

      if (!result.data || result.data.length === 0) {
        console.log('   📊 No player entries found in table');
        return [];
      }

      const players = [];
      
      // Read each player's stats from the table
      for (const entry of result.data) {
        try {
          const playerStats = await this.client.getObject({
            id: entry.objectId,
            options: { showContent: true }
          });

          if (playerStats.data?.content?.dataType === 'moveObject') {
            const stats = playerStats.data.content.fields;
            console.log(`      🔍 Player stats fields:`, Object.keys(stats));
            console.log(`      🔍 Player stats data:`, JSON.stringify(stats, null, 2));
            
            // Check if this is a table entry or actual PlayerStats
            if (stats.name && stats.value) {
              // This is a table entry with embedded PlayerStats data
              console.log(`      🔍 Found table entry with embedded PlayerStats data`);
              
              const playerAddress = stats.name;
              const playerStatsData = stats.value.fields;
              
              console.log(`      🔍 Player address: ${playerAddress}`);
              console.log(`      🔍 PlayerStats fields:`, Object.keys(playerStatsData));
              
              players.push({
                address: playerAddress,
                bestScore: parseInt(playerStatsData.personal_best_score || 0),
                bestTime: parseInt(playerStatsData.personal_best_time || 0),
                bestClicks: parseInt(playerStatsData.personal_best_clicks || 0),
                bestEfficiency: parseInt(playerStatsData.personal_best_efficiency || 0),
                avgScore: parseInt(playerStatsData.average_score || 0),
                avgTime: parseInt(playerStatsData.average_time_per_game || 0),
                avgClicks: parseInt(playerStatsData.average_clicks_per_game || 0),
                avgEfficiency: parseInt(playerStatsData.average_efficiency || 0),
                skillTier: parseInt(playerStatsData.current_skill_tier || 0),
                totalGames: parseInt(playerStatsData.total_games || 0),
                lastPlayed: parseInt(playerStatsData.last_played || 0)
              });
            } else {
              // This might be the actual PlayerStats object
              console.log(`      🔍 This appears to be PlayerStats object directly`);
              players.push({
                address: stats.player,
                bestScore: parseInt(stats.personal_best_score || 0),
                bestTime: parseInt(stats.personal_best_time || 0),
                bestClicks: parseInt(stats.personal_best_clicks || 0),
                bestEfficiency: parseInt(stats.personal_best_efficiency || 0),
                avgScore: parseInt(stats.average_score || 0),
                avgTime: parseInt(stats.average_time_per_game || 0),
                avgClicks: parseInt(stats.average_clicks_per_game || 0),
                avgEfficiency: parseInt(stats.average_efficiency || 0),
                skillTier: parseInt(stats.current_skill_tier || 0),
                totalGames: parseInt(stats.total_games || 0),
                lastPlayed: parseInt(stats.last_played || 0)
              });
            }
          }
        } catch (error) {
          console.warn(`      ⚠️  Failed to read player stats for ${entry.objectId}:`, error);
          continue;
        }
      }

      console.log(`   📊 Successfully read ${players.length} players from table`);
      return players;

    } catch (error) {
      console.error('❌ Failed to read player data:', error);
      throw error;
    }
  }

  /**
   * Read all game passes from old GamePassSystem contract
   */
  async readAllGamePasses(oldGamePassSystemId) {
    try {
      // First, get the GamePassSystem object to find the active_passes table
      const gamePassSystem = await this.client.getObject({
        id: oldGamePassSystemId,
        options: { showContent: true }
      });

      if (!gamePassSystem.data?.content?.dataType === 'moveObject') {
        console.warn('⚠️  GamePassSystem object not found or invalid format');
        return [];
      }

      const fields = gamePassSystem.data.content.fields;
      const activePassesTableId = fields.active_passes?.fields?.id?.id;

      if (!activePassesTableId) {
        console.warn('⚠️  Active passes table not found in GamePassSystem');
        return [];
      }

      console.log(`   🎫 Found active passes table: ${activePassesTableId}`);

      // Get all entries from the active passes table
      const result = await this.client.getDynamicFields({
        parentId: activePassesTableId,
        options: { showContent: true }
      });

      if (!result.data || result.data.length === 0) {
        console.log('   🎫 No game pass entries found in table');
        return [];
      }

      const gamePasses = [];
      
      // Read each game pass entry from the table
      for (const entry of result.data) {
        try {
          // The entry.name is an object with the player address in the value field
          const playerAddress = entry.name.value;
          const gamePassId = entry.objectId;
          
          console.log(`      🔍 Found game pass for player: ${playerAddress}, GamePass ID: ${gamePassId}`);
          console.log(`      🔍 Entry structure:`, JSON.stringify(entry, null, 2));
          
          // The GamePass object ID is in entry.objectId, but this is just a table entry
          // The actual GamePass object is at the ID stored in the value field
          const tableEntry = await this.client.getObject({
            id: entry.objectId,
            options: { showContent: true }
          });

          if (tableEntry.data?.content?.dataType === 'moveObject') {
            const entryData = tableEntry.data.content.fields;
            console.log(`      🔍 Table entry data:`, JSON.stringify(entryData, null, 2));
            
            // The actual GamePass object ID is in entryData.value
            const actualGamePassId = entryData.value;
            console.log(`      🔍 Actual GamePass object ID: ${actualGamePassId}`);
            
            // Now get the actual GamePass object
            const gamePass = await this.client.getObject({
              id: actualGamePassId,
              options: { showContent: true }
            });

            if (gamePass.data?.content?.dataType === 'moveObject') {
              const pass = gamePass.data.content.fields;
              console.log(`      🔍 GamePass fields:`, Object.keys(pass));
              console.log(`      🔍 GamePass data:`, JSON.stringify(pass, null, 2));
              
              gamePasses.push({
                address: playerAddress,
                passType: parseInt(pass.pass_type || 1),
                gamesRemaining: parseInt(pass.games_remaining || 0),
                expiresAt: parseInt(pass.expires_at || 0),
                isActive: pass.is_active || false,
                purchasedAt: parseInt(pass.purchased_at || 0)
              });
            }
          }
        } catch (error) {
          console.warn(`      ⚠️  Failed to read game pass for ${entry.objectId}:`, error);
          continue;
        }
      }

      console.log(`   🎫 Successfully read ${gamePasses.length} game passes from table`);
      return gamePasses;

    } catch (error) {
      console.error('❌ Failed to read game pass data:', error);
      throw error;
    }
  }

  /**
   * Read all admin data from old AdminSystem contract
   */
  async readAllAdmins(oldAdminSystemId) {
    try {
      // Get all dynamic fields (admin addresses)
      const result = await this.client.getDynamicFields({
        parentId: oldAdminSystemId,
        options: { showContent: true }
      });

      if (!result.data || result.data.length === 0) {
        return [];
      }

      const admins = [];
      
      // Read each admin
      for (const field of result.data) {
        try {
          const admin = await this.client.getObject({
            id: field.objectId,
            options: { showContent: true }
          });

          if (admin.data?.content?.dataType === 'moveObject') {
            const adminData = admin.data.content.fields;
            
            admins.push({
              address: adminData.admin,
              role: adminData.role || 'moderator',
              permissions: adminData.permissions || [],
              addedAt: parseInt(adminData.added_at || 0)
            });
          }
        } catch (error) {
          console.warn(`      ⚠️  Failed to read admin for ${field.objectId}:`, error);
          continue;
        }
      }

      return admins;

    } catch (error) {
      console.error('❌ Failed to read admin data:', error);
      throw error;
    }
  }

  /**
   * Read all game sessions from old GameCore contract
   */
  async readAllGameSessions(oldGameCoreId) {
    try {
      // Get all dynamic fields (active game sessions)
      const result = await this.client.getDynamicFields({
        parentId: oldGameCoreId,
        options: { showContent: true }
      });

      if (!result.data || result.data.length === 0) {
        return [];
      }

      const sessions = [];
      
      // Read each session
      for (const field of result.data) {
        try {
          const session = await this.client.getObject({
            id: field.objectId,
            options: { showContent: true }
          });

          if (session.data?.content?.dataType === 'moveObject') {
            const sessionData = session.data.content.fields;
            
            sessions.push({
              player: sessionData.player,
              startTime: parseInt(sessionData.start_time || 0),
              score: parseInt(sessionData.score || 0),
              clicks: parseInt(sessionData.clicks || 0),
              isActive: sessionData.is_active || false
            });
          }
        } catch (error) {
          console.warn(`      ⚠️  Failed to read session for ${field.objectId}:`, error);
          continue;
        }
      }

      return sessions;

    } catch (error) {
      console.error('❌ Failed to read game session data:', error);
      throw error;
    }
  }

  /**
   * Migrate players to new contract
   */
  async migratePlayers(players, newScoreSystemId, gameOwnerWallet) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      
      try {
        console.log(`      [${i + 1}/${players.length}] Migrating ${player.address}...`);
        
        // Use the game owner wallet to submit the player's best score
        // submitScore parameters: (playerAddress, finalScore, clicks, clicks, timeElapsed)
        // The second clicks parameter is misleadingly named "enduranceLevel" in the method signature
        const result = await gameOwnerWallet.submitScore(
          player.address,
          player.bestScore,
          player.bestClicks,      // clicks (misleadingly named "enduranceLevel")
          player.bestClicks,      // clicks
          player.bestTime         // timeElapsed (time in seconds)
        );

        if (result.success) {
          console.log(`      ✅ Successfully migrated ${player.address}`);
          results.successful++;
        } else {
          console.error(`      ❌ Failed to migrate ${player.address}:`, result.error);
          results.failed++;
          results.errors.push({
            address: player.address,
            error: result.error
          });
        }

        // Add delay to avoid overwhelming the blockchain
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`      ❌ Error migrating ${player.address}:`, error);
        results.failed++;
        results.errors.push({
          address: player.address,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Migrate game passes to new contract
   */
  async migrateGamePassesData(gamePasses, newGamePassSystemId, gameOwnerWallet) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < gamePasses.length; i++) {
      const gamePass = gamePasses[i];
      
      try {
        console.log(`      [${i + 1}/${gamePasses.length}] Migrating game pass for ${gamePass.address}...`);
        
        // Actually migrate the game pass using the new admin function
        console.log(`      📋 Migrating Game Pass Data:`);
        console.log(`         Address: ${gamePass.address}`);
        console.log(`         Pass Type: ${gamePass.passType}`);
        console.log(`         Games Remaining: ${gamePass.gamesRemaining}`);
        console.log(`         Expires At: ${gamePass.expiresAt}`);
        console.log(`         Purchased At: ${gamePass.purchasedAt}`);
        console.log(`         Is Active: ${gamePass.isActive}`);
        
        // Call the admin function to create the game pass
        const result = await gameOwnerWallet.adminCreateGamePassForMigration(
          gamePass.address,
          gamePass.passType,
          gamePass.gamesRemaining,
          gamePass.expiresAt,
          gamePass.purchasedAt
        );

        if (result.success) {
          console.log(`      ✅ Successfully migrated game pass for ${gamePass.address}`);
          results.successful++;
        } else {
          console.error(`      ❌ Failed to migrate game pass for ${gamePass.address}:`, result.error);
          results.failed++;
          results.errors.push({
            address: gamePass.address,
            error: result.error
          });
        }

        // Add delay to avoid overwhelming the blockchain
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`      ❌ Error migrating game pass for ${gamePass.address}:`, error);
        results.failed++;
        results.errors.push({
          address: gamePass.address,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Migrate admins to new contract
   */
  async migrateAdminsData(admins, newAdminSystemId, gameOwnerWallet) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i];
      
      try {
        console.log(`      [${i + 1}/${admins.length}] Migrating admin ${admin.address}...`);
        
        // Use the game owner wallet to set up the game admin
        const result = await gameOwnerWallet.setupGameAdmin(admin.address);

        if (result.success) {
          console.log(`      ✅ Successfully migrated admin ${admin.address}`);
          results.successful++;
        } else {
          console.error(`      ❌ Failed to migrate admin ${admin.address}:`, result.error);
          results.failed++;
          results.errors.push({
            address: admin.address,
            error: result.error
          });
        }

        // Add delay to avoid overwhelming the blockchain
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`      ❌ Error migrating admin ${admin.address}:`, error);
        results.failed++;
        results.errors.push({
          address: admin.address,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Migrate game sessions to new contract
   */
  async migrateGameSessionsData(sessions, newGameCoreId, gameOwnerWallet) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      
      try {
        console.log(`      [${i + 1}/${sessions.length}] Migrating session for ${session.player}...`);
        
        // Use the game owner wallet to create the session
        const result = await gameOwnerWallet.createGameSession(
          session.player,
          session.startTime,
          session.score,
          session.clicks
        );

        if (result.success) {
          console.log(`      ✅ Successfully migrated session for ${session.player}`);
          results.successful++;
        } else {
          console.error(`      ❌ Failed to migrate session for ${session.player}:`, result.error);
          results.failed++;
          results.errors.push({
            address: session.player,
            error: result.error
          });
        }

        // Add delay to avoid overwhelming the blockchain
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`      ❌ Error migrating session for ${session.player}:`, error);
        results.failed++;
        results.errors.push({
          address: session.player,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Verify complete migration by comparing all contract data
   */
  async verifyCompleteMigration(oldContracts, newContracts) {
    try {
      console.log('🔍 Verifying complete migration...');
      
      const verification = {
        scoreSystem: null,
        gamePassSystem: null,
        adminSystem: null,
        gameCore: null,
        overall: { success: true, warnings: [] }
      };

      // Verify ScoreSystem
      if (oldContracts.scoreSystem && newContracts.scoreSystem) {
        const oldPlayers = await this.readAllPlayerData(oldContracts.scoreSystem);
        const newPlayers = await this.readAllPlayerData(newContracts.scoreSystem);
        verification.scoreSystem = {
          success: oldPlayers.length === newPlayers.length,
          oldCount: oldPlayers.length,
          newCount: newPlayers.length
        };
        
        if (!verification.scoreSystem.success) {
          verification.overall.success = false;
          verification.overall.warnings.push(`ScoreSystem: ${oldPlayers.length} → ${newPlayers.length} players`);
        }
      }

      // Verify GamePassSystem
      if (oldContracts.gamePassSystem && newContracts.gamePassSystem) {
        const oldPasses = await this.readAllGamePasses(oldContracts.gamePassSystem);
        const newPasses = await this.readAllGamePasses(newContracts.gamePassSystem);
        verification.gamePassSystem = {
          success: oldPasses.length === newPasses.length,
          oldCount: oldPasses.length,
          newCount: newPasses.length
        };
        
        if (!verification.gamePassSystem.success) {
          verification.overall.success = false;
          verification.overall.warnings.push(`GamePassSystem: ${oldPasses.length} → ${newPasses.length} passes`);
        }
      }

      // Verify AdminSystem
      if (oldContracts.adminSystem && newContracts.adminSystem) {
        const oldAdmins = await this.readAllAdmins(oldContracts.adminSystem);
        const newAdmins = await this.readAllAdmins(newContracts.adminSystem);
        verification.adminSystem = {
          success: oldAdmins.length === newAdmins.length,
          oldCount: oldAdmins.length,
          newCount: newAdmins.length
        };
        
        if (!verification.adminSystem.success) {
          verification.overall.success = false;
          verification.overall.warnings.push(`AdminSystem: ${oldAdmins.length} → ${newAdmins.length} admins`);
        }
      }

      // Verify GameCore
      if (oldContracts.gameCore && newContracts.gameCore) {
        const oldSessions = await this.readAllGameSessions(oldContracts.gameCore);
        const newSessions = await this.readAllGameSessions(newContracts.gameCore);
        verification.gameCore = {
          success: oldSessions.length === newSessions.length,
          oldCount: oldSessions.length,
          newCount: newSessions.length
        };
        
        if (!verification.gameCore.success) {
          verification.overall.success = false;
          verification.overall.warnings.push(`GameCore: ${oldSessions.length} → ${newSessions.length} sessions`);
        }
      }

      if (verification.overall.success) {
        console.log('✅ Complete migration verification successful!');
      } else {
        console.log('⚠️  Complete migration verification failed:');
        verification.overall.warnings.forEach(warning => {
          console.log(`   ${warning}`);
        });
      }

      return verification;
      
    } catch (error) {
      console.error('❌ Complete migration verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get complete migration status and progress
   */
  async getCompleteMigrationStatus(oldContracts, newContracts) {
    try {
      const status = {
        scoreSystem: null,
        gamePassSystem: null,
        adminSystem: null,
        gameCore: null,
        overall: { progressPercentage: 0, isComplete: false }
      };

      // Check ScoreSystem status
      if (oldContracts.scoreSystem && newContracts.scoreSystem) {
        const oldPlayers = await this.readAllPlayerData(oldContracts.scoreSystem);
        const newPlayers = await this.readAllPlayerData(newContracts.scoreSystem);
        const progress = oldPlayers.length > 0 ? (newPlayers.length / oldPlayers.length) * 100 : 0;
        
        status.scoreSystem = {
          oldCount: oldPlayers.length,
          newCount: newPlayers.length,
          progressPercentage: Math.round(progress),
          isComplete: newPlayers.length >= oldPlayers.length
        };
      }

      // Check GamePassSystem status
      if (oldContracts.gamePassSystem && newContracts.gamePassSystem) {
        const oldPasses = await this.readAllGamePasses(oldContracts.gamePassSystem);
        const newPasses = await this.readAllGamePasses(newContracts.gamePassSystem);
        const progress = oldPasses.length > 0 ? (newPasses.length / oldPasses.length) * 100 : 0;
        
        status.gamePassSystem = {
          oldCount: oldPasses.length,
          newCount: newPasses.length,
          progressPercentage: Math.round(progress),
          isComplete: newPasses.length >= oldPasses.length
        };
      }

      // Check AdminSystem status
      if (oldContracts.adminSystem && newContracts.adminSystem) {
        const oldAdmins = await this.readAllAdmins(oldContracts.adminSystem);
        const newAdmins = await this.readAllAdmins(newContracts.adminSystem);
        const progress = oldAdmins.length > 0 ? (newAdmins.length / oldAdmins.length) * 100 : 0;
        
        status.adminSystem = {
          oldCount: oldAdmins.length,
          newCount: newAdmins.length,
          progressPercentage: Math.round(progress),
          isComplete: newAdmins.length >= oldAdmins.length
        };
      }

      // Check GameCore status
      if (oldContracts.gameCore && newContracts.gameCore) {
        const oldSessions = await this.readAllGameSessions(oldContracts.gameCore);
        const newSessions = await this.readAllGameSessions(newContracts.gameCore);
        const progress = oldSessions.length > 0 ? (newSessions.length / oldSessions.length) * 100 : 0;
        
        status.gameCore = {
          oldCount: oldSessions.length,
          newCount: newSessions.length,
          progressPercentage: Math.round(progress),
          isComplete: newSessions.length >= oldSessions.length
        };
      }

      // Calculate overall progress
      const allSystems = [status.scoreSystem, status.gamePassSystem, status.adminSystem, status.gameCore].filter(Boolean);
      if (allSystems.length > 0) {
        const totalProgress = allSystems.reduce((sum, system) => sum + system.progressPercentage, 0);
        status.overall.progressPercentage = Math.round(totalProgress / allSystems.length);
        status.overall.isComplete = allSystems.every(system => system.isComplete);
      }

      return status;
      
    } catch (error) {
      console.error('❌ Failed to get complete migration status:', error);
      return { error: error.message };
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up migration service...');
    this.isInitialized = false;
  }
}

module.exports = { ContractMigrationService };

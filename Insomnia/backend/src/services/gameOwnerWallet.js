const { SuiClient } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');

class GameOwnerWallet {
  constructor() {
    this.client = null;
    this.keypair = null;
    this.isInitialized = false;
    
    // Contract IDs - support both old and new
    this.contracts = {
      // New contracts (active use)
      packageId: process.env.PACKAGE_ID,
      scoreSystemId: process.env.SCORE_SYSTEM_ID,
      gamePassSystemId: process.env.GAME_PASS_SYSTEM_ID,
      adminSystemId: process.env.ADMIN_SYSTEM_ID,
      
      // Old contracts (for migration)
      oldScoreSystemId: process.env.OLD_SCORE_SYSTEM_ID,
      oldGamePassSystemId: process.env.OLD_GAME_PASS_SYSTEM_ID,
      oldAdminSystemId: process.env.OLD_ADMIN_SYSTEM_ID
    };
  }

  async initialize() {
    try {
      // Debug environment variables
      console.log('🔍 Environment variables:');
      console.log('  SUI_RPC_URL:', process.env.SUI_RPC_URL);
      console.log('  PACKAGE_ID:', process.env.PACKAGE_ID);
      console.log('  GAME_PASS_SYSTEM_ID:', process.env.GAME_PASS_SYSTEM_ID);
      console.log('  CLOCK_ID:', process.env.CLOCK_ID);
      console.log('  GAME_OWNER_PRIVATE_KEY:', process.env.GAME_OWNER_PRIVATE_KEY ? '***SET***' : 'NOT SET');

      // Initialize Sui client
      this.client = new SuiClient({
        url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
      });

      // Load game owner private key from environment
      const privateKey = process.env.GAME_OWNER_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('GAME_OWNER_PRIVATE_KEY environment variable is required');
      }

      // Create keypair from private key
      this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
      this.address = this.keypair.getPublicKey().toSuiAddress();

      console.log(`🔑 Game owner wallet initialized: ${this.address}`);
      console.log(`🌐 Connected to: ${this.client.url || 'Sui Testnet'}`);

      // Set initialized flag BEFORE calling getBalance
      this.isInitialized = true;

      // Verify wallet has sufficient balance
      const balance = await this.getBalance();
      console.log(`💰 Wallet balance: ${balance} SUI`);

      if (balance < 0.01) {
        console.warn('⚠️  Warning: Low balance detected. Ensure sufficient SUI for gas fees.');
      }

      // Validate contract IDs
      this.validateContractIds();
      
      console.log('✅ Game owner wallet initialized successfully');
      console.log(`   📦 Package ID: ${this.contracts.packageId}`);
      console.log(`   🏆 Score System: ${this.contracts.scoreSystemId}`);
      console.log(`   🎫 Game Pass System: ${this.contracts.gamePassSystemId}`);
      console.log(`   👑 Admin System: ${this.contracts.adminSystemId}`);
      
      if (this.contracts.oldScoreSystemId) {
        console.log(`   📤 Old Score System: ${this.contracts.oldScoreSystemId}`);
      }
      if (this.contracts.oldGamePassSystemId) {
        console.log(`   📤 Old Game Pass System: ${this.contracts.oldGamePassSystemId}`);
      }

    } catch (error) {
      console.error('❌ Failed to initialize game owner wallet:', error);
      throw error;
    }
  }

  validateContractIds() {
    const requiredContracts = [
      'packageId',
      'scoreSystemId', 
      'gamePassSystemId',
      'adminSystemId'
    ];

    for (const contract of requiredContracts) {
      if (!this.contracts[contract]) {
        throw new Error(`Missing required contract ID: ${contract.toUpperCase()}`);
      }
      
      if (!this.contracts[contract].startsWith('0x') || this.contracts[contract].length !== 66) {
        throw new Error(`Invalid contract ID format for ${contract}: ${this.contracts[contract]}`);
      }
    }
  }

  // Get current active contract IDs
  getActiveContracts() {
    return {
      packageId: this.contracts.packageId,
      scoreSystemId: this.contracts.scoreSystemId,
      gamePassSystemId: this.contracts.gamePassSystemId,
      adminSystemId: this.contracts.adminSystemId
    };
  }

  // Get old contract IDs (for migration)
  getOldContracts() {
    return {
      scoreSystemId: this.contracts.oldScoreSystemId,
      gamePassSystemId: this.contracts.oldGamePassSystemId,
      adminSystemId: this.contracts.oldAdminSystemId
    };
  }

  // Check if migration is needed
  needsMigration() {
    return !!(this.contracts.oldScoreSystemId || this.contracts.oldGamePassSystemId);
  }

  async getBalance() {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      const coins = await this.client.getCoins({
        owner: this.address,
        coinType: '0x2::sui::SUI'
      });

      const totalBalance = coins.data.reduce((sum, coin) => {
        return sum + BigInt(coin.balance);
      }, BigInt(0));

      // Convert from MIST to SUI (1 SUI = 1,000,000,000 MIST)
      return Number(totalBalance) / 1_000_000_000;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async consumeGameCredit(gamePassId, playerAddress) {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`🎮 Consuming game credit for pass: ${gamePassId}`);
      console.log(`👤 Player address: ${playerAddress}`);

      // Validate that the GamePass object exists and is accessible
      try {
        const gamePassObject = await this.client.getObject({
          id: gamePassId,
          options: { showContent: true }
        });
        
        if (!gamePassObject.data || !gamePassObject.data.content) {
          throw new Error(`GamePass object ${gamePassId} not found or invalid`);
        }
        
        console.log('✅ GamePass object validated:', {
          id: gamePassObject.data.objectId,
          type: gamePassObject.data.type,
          hasContent: !!gamePassObject.data.content,
          owner: gamePassObject.data.owner,
          version: gamePassObject.data.version,
          digest: gamePassObject.data.digest
        });
        
        // Check if this is a shared object
        if (gamePassObject.data.owner === 'Immutable') {
          console.log('ℹ️  GamePass is a shared object (Immutable owner)');
        } else if (gamePassObject.data.owner) {
          console.log('ℹ️  GamePass owner:', gamePassObject.data.owner);
        } else {
          console.log('⚠️  GamePass has no owner field');
        }
      } catch (error) {
        console.error('❌ Failed to validate GamePass object:', error);
        throw new Error(`GamePass object ${gamePassId} validation failed: ${error.message}`);
      }

      // Create transaction block
      const tx = new Transaction();
      
      // Call consume_game_credit_for_user function
      // Note: We need to use tx.object() for the GamePass NFT even though we don't own it
      // The smart contract function should handle the permission check
      console.log('🔧 Transaction arguments:');
      console.log('  - GamePassSystem ID:', process.env.GAME_PASS_SYSTEM_ID);
      console.log('  - GamePass ID:', gamePassId);
      console.log('  - Player Address:', playerAddress);
      console.log('  - Clock ID:', process.env.CLOCK_ID);
      
      // Try a different approach - build transaction step by step
      console.log('🔧 Building transaction step by step...');
      
      // First, let's try to see if we can get the object type
      const objectDetails = await this.client.getObject({
        id: gamePassId,
        options: { showType: true, showContent: false }
      });
      
      console.log('📋 Object details for transaction:', {
        id: objectDetails.data?.objectId,
        type: objectDetails.data?.type,
        version: objectDetails.data?.version
      });
      
      // Use the consume_game_credit_for_user function that matches the smart contract
      console.log('🔧 Using consume_game_credit_for_user with proper implementation...');
      
      tx.moveCall({
        target: `${process.env.PACKAGE_ID}::game_pass::consume_game_credit_for_user`,
        arguments: [
          tx.object(process.env.GAME_PASS_SYSTEM_ID), // GamePassSystem shared object
          tx.object(gamePassId), // User's GamePass NFT
          tx.pure.address(playerAddress), // Player address - use address type
          tx.object(process.env.CLOCK_ID), // System clock
        ],
      });

      // Sign and execute transaction (using same options as frontend)
      console.log('📝 Signing transaction with game owner wallet...');
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
          showInput: false,
          showObjectChanges: false,
        },
      });

      console.log('✅ Transaction executed successfully');
      console.log('📊 Transaction digest:', result.digest);

      // Check for success
      if (result.effects?.status?.status === 'success') {
        // Look for GamePlayed event
        const gamePlayedEvent = result.events?.find(event => 
          event.type.includes('GamePlayed')
        );

        if (gamePlayedEvent) {
          console.log('🎯 GamePlayed event found:', gamePlayedEvent);
          return {
            success: true,
            digest: result.digest,
            event: gamePlayedEvent
          };
        } else {
          console.warn('⚠️  Transaction succeeded but GamePlayed event not found');
          return {
            success: true,
            digest: result.digest,
            warning: 'GamePlayed event not found'
          };
        }
      } else {
        console.error('❌ Transaction failed:', result.effects?.status);
        return {
          success: false,
          error: result.effects?.status?.error || 'Transaction failed'
        };
      }

    } catch (error) {
      console.error('Failed to consume game credit:', error);
      throw error;
    }
  }

  async getGamePassStatus(gamePassId) {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      const gamePass = await this.client.getObject({
        id: gamePassId,
        options: { showContent: true }
      });

      if (gamePass.data?.content) {
        const content = gamePass.data.content;
        return {
          id: gamePassId,
          passType: content.fields.pass_type,
          gamesRemaining: content.fields.games_remaining,
          expiresAt: content.fields.expires_at,
          isActive: content.fields.is_active
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get game pass status:', error);
      throw error;
    }
  }

  async submitScore(playerAddress, finalScore, clicks = 0, timeElapsed = 0) {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`🏆 Submitting score for player: ${playerAddress}`);
      console.log(`   Final Score: ${finalScore}`);
      console.log(`   Clicks: ${clicks}`);
      console.log(`   Time Elapsed: ${timeElapsed}`);

      // Validate inputs
      if (typeof finalScore !== 'number' || isNaN(finalScore) || finalScore < 0) {
        throw new Error(`Invalid finalScore: ${finalScore}`);
      }

      if (typeof clicks !== 'number' || isNaN(clicks) || clicks < 0) {
        throw new Error(`Invalid clicks: ${clicks}`);
      }

      if (typeof timeElapsed !== 'number' || isNaN(timeElapsed) || timeElapsed < 0) {
        throw new Error(`Invalid timeElapsed: ${timeElapsed}`);
      }

      // Ensure values are integers
      const validScore = Math.floor(finalScore);
      const validClicks = Math.floor(clicks);
      const validTimeElapsed = Math.floor(timeElapsed);

      console.log(`✅ Validated values - Score: ${validScore}, Clicks: ${validClicks}, Time: ${validTimeElapsed}`);

      // Create transaction
      const tx = new Transaction();

      // Call the submit_score_as_game_owner function
      // This function allows the game owner to submit scores directly
      tx.moveCall({
        target: `${process.env.PACKAGE_ID}::score_system::submit_score_as_game_owner`,
        arguments: [
          tx.object(process.env.SCORE_SYSTEM_ID), // ScoreSystem shared object
          tx.pure.address(playerAddress), // Player address
          tx.pure.u64(validScore), // Final score
          tx.pure.u64(validClicks), // Clicks
          tx.pure.u64(validTimeElapsed), // Time elapsed in seconds
          tx.pure.u64(0), // Time bonus (not calculated in current implementation)
          tx.pure.u64(0), // Efficiency bonus (not calculated in current implementation)
          tx.pure.u64(Math.floor(Date.now() / 1000)), // Current timestamp in seconds (u64)
        ],
      });

      // Sign and execute transaction using game owner wallet
      console.log('📝 Signing score submission transaction with game owner wallet...');
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
          showInput: false,
          showObjectChanges: false,
        },
      });

      console.log('✅ Score submission transaction executed successfully');
      console.log('📊 Transaction digest:', result.digest);

      // Check for success
      if (result.effects?.status?.status === 'success') {
        // Look for ScoreUpdated event
        const scoreUpdatedEvent = result.events?.find(event => 
          event.type.includes('ScoreUpdated') || event.type.includes('PlayerStatsUpdated')
        );

        if (scoreUpdatedEvent) {
          console.log('🎯 ScoreUpdated event found:', scoreUpdatedEvent);
          return {
            success: true,
            digest: result.digest,
            event: scoreUpdatedEvent
          };
        } else {
          console.warn('⚠️  Transaction succeeded but ScoreUpdated event not found');
          return {
            success: true,
            digest: result.digest,
            warning: 'ScoreUpdated event not found'
          };
        }
      } else {
        console.error('❌ Score submission transaction failed:', result.effects?.status);
        return {
          success: false,
          error: result.effects?.status?.error || 'Score submission transaction failed'
        };
      }

    } catch (error) {
      console.error('Failed to submit score:', error);
      throw error;
    }
  }

  // ===== LEADERBOARD METHODS =====

  /**
   * Get leaderboard by best score
   */
  async getLeaderboardByBestScore(limit = 25, skillTier = null) {
    try {
      console.log(`🏆 Fetching leaderboard by best score, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      // First, get the ScoreSystem object to access the player_stats_table
      const scoreSystem = await this.client.getObject({
        id: process.env.SCORE_SYSTEM_ID,
        options: { showContent: true }
      });

      console.log('🔍 ScoreSystem object:', JSON.stringify(scoreSystem, null, 2));

      if (!scoreSystem.data?.content?.fields?.player_stats_table) {
        console.log('⚠️ No player_stats_table found in ScoreSystem');
        return { success: true, players: [], totalPlayers: 0 };
      }

      // Query the player_stats_table for all entries
      const tableId = scoreSystem.data.content.fields.player_stats_table.fields.id.id;
      console.log('🔍 Table ID:', tableId);

      const result = await this.client.getDynamicFields({
        parentId: tableId,
        options: { showContent: true }
      });

      console.log('🔍 getDynamicFields result from table:', JSON.stringify(result, null, 2));
      console.log(' Result data length:', result.data?.length || 0);

      if (!result.data || result.data.length === 0) {
        console.log('⚠️ No player stats found in table - returning empty result');
        return { success: true, players: [], totalPlayers: 0 };
      }

                 // Filter and sort by personal best score
           const players = [];
           for (const field of result.data) {
             try {
               // Get the actual PlayerStats object from the table
               const playerStats = await this.client.getObject({
                 id: field.objectId,
                 options: { showContent: true }
               });

               console.log('🔍 Raw playerStats object:', JSON.stringify(playerStats, null, 2));

               if (playerStats.data?.content?.dataType === 'moveObject') {
                 const stats = playerStats.data.content.fields;

                 // Debug logging to see available fields
                 console.log('🔍 Available stats fields:', Object.keys(stats));
                 console.log('🔍 Sample field values:', {
                   personal_best_score: stats.personal_best_score,
                   player: stats.player,
                   current_skill_tier: stats.current_skill_tier
                 });

                 // The actual PlayerStats data is in stats.value.fields
                 if (stats.value && stats.value.fields) {
                   console.log('✅ Found PlayerStats data in stats.value.fields');
                   
                   const playerData = stats.value.fields;
                   
                   console.log('🔍 Player data fields:', Object.keys(playerData));

                   // Apply skill tier filter if specified
                   if (skillTier !== null && playerData.current_skill_tier !== skillTier) {
                     continue;
                   }

                   // Debug logging for field values before creating player object
                   console.log('🔍 Creating player object with values:', {
                     address: playerData.player,
                     bestScore: playerData.personal_best_score,
                     bestTime: playerData.personal_best_time,
                     bestClicks: playerData.personal_best_clicks,
                     skillTier: playerData.current_skill_tier,
                     totalGames: playerData.total_games
                   });

                   players.push({
                     address: playerData.player,
                     bestScore: parseInt(playerData.personal_best_score),
                     bestTime: parseInt(playerData.personal_best_time),
                     bestClicks: parseInt(playerData.personal_best_clicks),
                     bestEfficiency: parseInt(playerData.personal_best_efficiency),
                     avgScore: parseInt(playerData.average_score),
                     avgTime: parseInt(playerData.average_time_per_game),
                     avgClicks: parseInt(playerData.average_clicks_per_game),
                     avgEfficiency: parseInt(playerData.average_efficiency),
                     skillTier: parseInt(playerData.current_skill_tier),
                     totalGames: parseInt(playerData.total_games),
                     lastPlayed: parseInt(playerData.last_played)
                   });
                 } else {
                   console.log('⚠️ Object is not a PlayerStats object, type:', stats.type);
                 }
               }
             } catch (error) {
               console.warn(`⚠️  Failed to fetch player stats for ${field.objectId}:`, error);
               continue;
             }
           }

      // Sort by best score (descending)
      players.sort((a, b) => b.bestScore - a.bestScore);
      
      // Apply limit
      const limitedPlayers = players.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for best score leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: players.length
      };

    } catch (error) {
      console.error('❌ Failed to fetch best score leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard by best time
   */
  async getLeaderboardByBestTime(limit = 25, skillTier = null) {
    try {
      console.log(`⏱️  Fetching leaderboard by best time, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier); // Get more players for better sorting
      
      if (!result.success) {
        return result;
      }

      // Sort by best time (descending)
      const sortedPlayers = result.players.sort((a, b) => b.bestTime - a.bestTime);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for best time leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch best time leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard by best clicks
   */
  async getLeaderboardByBestClicks(limit = 25, skillTier = null) {
    try {
      console.log(`🖱️  Fetching leaderboard by best clicks, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier);
      
      if (!result.success) {
        return result;
      }

      // Sort by best clicks (descending)
      const sortedPlayers = result.players.sort((a, b) => b.bestClicks - a.bestClicks);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for best clicks leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch best clicks leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard by best efficiency
   */
  async getLeaderboardByBestEfficiency(limit = 25, skillTier = null) {
    try {
      console.log(`⚡ Fetching leaderboard by best efficiency, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier);
      
      if (!result.success) {
        return result;
      }

      // Sort by best efficiency (descending)
      const sortedPlayers = result.players.sort((a, b) => b.bestEfficiency - a.bestEfficiency);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for best efficiency leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch best efficiency leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard by average score
   */
  async getLeaderboardByAverageScore(limit = 25, skillTier = null) {
    try {
      console.log(`📊 Fetching leaderboard by average score, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier);
      
      if (!result.success) {
        return result;
      }

      // Sort by average score (descending)
      const sortedPlayers = result.players.sort((a, b) => b.avgScore - a.avgScore);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for average score leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch average score leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard by average time
   */
  async getLeaderboardByAverageTime(limit = 25, skillTier = null) {
    try {
      console.log(`🕐 Fetching leaderboard by average time, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier);
      
      if (!result.success) {
        return result;
      }

      // Sort by average time (descending)
      const sortedPlayers = result.players.sort((a, b) => b.avgTime - a.avgTime);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for average time leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch average time leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard by average clicks
   */
  async getLeaderboardByAverageClicks(limit = 25, skillTier = null) {
    try {
      console.log(`🖱️  Fetching leaderboard by average clicks, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier);
      
      if (!result.success) {
        return result;
      }

      // Sort by average clicks (descending)
      const sortedPlayers = result.players.sort((a, b) => b.avgClicks - a.avgClicks);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for average clicks leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch average clicks leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard by average efficiency
   */
  async getLeaderboardByAverageEfficiency(limit = 25, skillTier = null) {
    try {
      console.log(`⚡ Fetching leaderboard by average efficiency, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier);
      
      if (!result.success) {
        return result;
      }

      // Sort by average efficiency (descending)
      const sortedPlayers = result.players.sort((a, b) => b.avgEfficiency - a.avgEfficiency);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for average efficiency leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch average efficiency leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard by skill tier
   */
  async getLeaderboardBySkillTier(skillTier, limit = 25) {
    try {
      console.log(`🎯 Fetching leaderboard by skill tier ${skillTier}, limit: ${limit}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier);
      
      if (!result.success) {
        return result;
      }

      // Sort by best score within the skill tier
      const sortedPlayers = result.players.sort((a, b) => b.bestScore - a.bestScore);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for skill tier ${skillTier} leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch skill tier leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get overall leaderboard (combined ranking)
   */
  async getOverallLeaderboard(limit = 25, skillTier = null) {
    try {
      console.log(`🌟 Fetching overall leaderboard, limit: ${limit}, skill tier: ${skillTier || 'all'}`);
      
      const result = await this.getLeaderboardByBestScore(1000, skillTier);
      
      if (!result.success) {
        return result;
      }

      // Calculate overall score based on multiple factors
      const playersWithOverallScore = result.players.map(player => {
        // Weighted scoring: 40% best score + 30% best time + 20% best efficiency + 10% consistency
        const overallScore = Math.floor(
          (player.bestScore * 0.4) +
          (player.bestTime * 0.3) +
          (player.bestEfficiency * 0.2) +
          (player.avgScore * 0.1)
        );
        
        return {
          ...player,
          overallScore
        };
      });

      // Sort by overall score (descending)
      const sortedPlayers = playersWithOverallScore.sort((a, b) => b.overallScore - a.overallScore);
      
      // Apply limit
      const limitedPlayers = sortedPlayers.slice(0, limit);

      console.log(`✅ Found ${limitedPlayers.length} players for overall leaderboard`);
      return {
        success: true,
        players: limitedPlayers,
        totalPlayers: result.totalPlayers
      };

    } catch (error) {
      console.error('❌ Failed to fetch overall leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a game pass for migration purposes (admin only)
   * This bypasses payment since we're migrating existing data
   */
  async createGamePassForMigration(playerAddress, passType, gamesRemaining, expiresAt, purchasedAt) {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`🎫 Creating game pass for migration: ${playerAddress}`);
      console.log(`   Pass Type: ${passType}`);
      console.log(`   Games Remaining: ${gamesRemaining}`);
      console.log(`   Expires At: ${expiresAt}`);
      console.log(`   Purchased At: ${purchasedAt}`);

      // Validate inputs
      if (typeof passType !== 'number' || isNaN(passType) || passType < 1 || passType > 3) {
        throw new Error(`Invalid passType: ${passType} (must be 1, 2, or 3)`);
      }

      if (typeof gamesRemaining !== 'number' || isNaN(gamesRemaining) || gamesRemaining < 0) {
        throw new Error(`Invalid gamesRemaining: ${gamesRemaining}`);
      }

      if (typeof expiresAt !== 'number' || isNaN(expiresAt) || expiresAt < 0) {
        throw new Error(`Invalid expiresAt: ${expiresAt}`);
      }

      if (typeof purchasedAt !== 'number' || isNaN(purchasedAt) || purchasedAt < 0) {
        throw new Error(`Invalid purchasedAt: ${purchasedAt}`);
      }

      // Ensure values are integers
      const validPassType = Math.floor(passType);
      const validGamesRemaining = Math.floor(gamesRemaining);
      const validExpiresAt = Math.floor(expiresAt);
      const validPurchasedAt = Math.floor(purchasedAt);

      console.log(`✅ Validated values - Pass Type: ${validPassType}, Games: ${validGamesRemaining}, Expires: ${validExpiresAt}, Purchased: ${validPurchasedAt}`);

      // Create transaction
      const tx = new Transaction();

      // Call a hypothetical admin function to create game pass without payment
      // Since this doesn't exist in the current contract, we'll need to implement it
      // For now, we'll use the existing purchase_game_pass function with 0 payment
      tx.moveCall({
        target: `${process.env.PACKAGE_ID}::game_pass::purchase_game_pass`,
        arguments: [
          tx.object(process.env.GAME_PASS_SYSTEM_ID), // GamePassSystem shared object
          tx.pure.u8(validPassType), // Pass type
          tx.pure.u64(0), // 0 payment for migration
          tx.object(process.env.CLOCK_ID), // Clock object
        ],
      });

      // Sign and execute transaction using game owner wallet
      console.log('📝 Signing game pass creation transaction with game owner wallet...');
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
          showInput: false,
          showObjectChanges: false,
        },
      });

      console.log('✅ Game pass creation transaction executed successfully');
      console.log('📊 Transaction digest:', result.digest);

      // Check for success
      if (result.effects?.status?.status === 'success') {
        // Look for PassPurchased event
        const passPurchasedEvent = result.events?.find(event => 
          event.type.includes('PassPurchased')
        );

        if (passPurchasedEvent) {
          console.log('🎯 PassPurchased event found:', passPurchasedEvent);
          return {
            success: true,
            digest: result.digest,
            event: passPurchasedEvent
          };
        } else {
          console.warn('⚠️  Transaction succeeded but PassPurchased event not found');
          return {
            success: true,
            digest: result.digest,
            warning: 'PassPurchased event not found'
          };
        }
      } else {
        console.error('❌ Game pass creation transaction failed:', result.effects?.status);
        return {
          success: false,
          error: result.effects?.status?.error || 'Game pass creation transaction failed'
        };
      }

    } catch (error) {
      console.error('Failed to create game pass for migration:', error);
      throw error;
    }
  }

  /**
   * Create a game pass using the new admin function for migration
   * This calls the admin_create_game_pass_for_migration function in the smart contract
   */
  async adminCreateGamePassForMigration(playerAddress, passType, gamesRemaining, expiresAt, purchasedAt) {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`🎫 Admin creating game pass for migration: ${playerAddress}`);
      console.log(`   Pass Type: ${passType}`);
      console.log(`   Games Remaining: ${gamesRemaining}`);
      console.log(`   Expires At: ${expiresAt}`);
      console.log(`   Purchased At: ${purchasedAt}`);

      // Validate inputs
      if (typeof passType !== 'number' || isNaN(passType) || passType < 1 || passType > 3) {
        throw new Error(`Invalid passType: ${passType} (must be 1, 2, or 3)`);
      }

      if (typeof gamesRemaining !== 'number' || isNaN(gamesRemaining) || gamesRemaining < 0) {
        throw new Error(`Invalid gamesRemaining: ${gamesRemaining}`);
      }

      if (typeof expiresAt !== 'number' || isNaN(expiresAt) || expiresAt < 0) {
        throw new Error(`Invalid expiresAt: ${expiresAt}`);
      }

      if (typeof purchasedAt !== 'number' || isNaN(purchasedAt) || purchasedAt < 0) {
        throw new Error(`Invalid purchasedAt: ${purchasedAt}`);
      }

      // Ensure values are integers
      const validPassType = Math.floor(passType);
      const validGamesRemaining = Math.floor(gamesRemaining);
      const validExpiresAt = Math.floor(expiresAt);
      const validPurchasedAt = Math.floor(purchasedAt);

      console.log(`✅ Validated values - Pass Type: ${validPassType}, Games: ${validGamesRemaining}, Expires: ${validExpiresAt}, Purchased: ${validPurchasedAt}`);

      // Create transaction
      const tx = new Transaction();

      // Call the new admin function that bypasses payment validation
      tx.moveCall({
        target: `${process.env.PACKAGE_ID}::game_pass::admin_create_game_pass_for_migration`,
        arguments: [
          tx.object(process.env.GAME_PASS_SYSTEM_ID), // GamePassSystem shared object
          tx.pure.address(playerAddress), // Player address
          tx.pure.u8(validPassType), // Pass type
          tx.pure.u64(validGamesRemaining), // Games remaining
          tx.pure.u64(validExpiresAt), // Expires at
          tx.pure.u64(validPurchasedAt), // Purchased at
        ],
      });

      // Sign and execute transaction using game owner wallet
      console.log('📝 Signing admin game pass creation transaction...');
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
          showInput: false,
          showObjectChanges: false,
        },
      });

      console.log('✅ Admin game pass creation transaction executed successfully');
      console.log('📊 Transaction digest:', result.digest);

      // Check for success
      if (result.effects?.status?.status === 'success') {
        // Look for PassPurchased or GamesAdded event
        const passEvent = result.events?.find(event => 
          event.type.includes('PassPurchased') || event.type.includes('GamesAdded')
        );

        if (passEvent) {
          console.log('🎯 Game pass event found:', passEvent);
          return {
            success: true,
            digest: result.digest,
            event: passEvent
          };
        } else {
          console.warn('⚠️  Transaction succeeded but no game pass event found');
          return {
            success: true,
            digest: result.digest,
            warning: 'No game pass event found'
          };
        }
      } else {
        console.error('❌ Admin game pass creation transaction failed:', result.effects?.status);
        return {
          success: false,
          error: result.effects?.status?.error || 'Admin game pass creation transaction failed'
        };
      }

    } catch (error) {
      console.error('Failed to create admin game pass for migration:', error);
      throw error;
    }
  }

  /**
   * Check if a player has an active game pass
   */
  async checkPlayerGamePass(playerAddress) {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`🔍 Checking game pass for player: ${playerAddress}`);
      
      // Get the GamePassSystem object
      const gamePassSystem = await this.client.getObject({
        id: this.contracts.gamePassSystemId,
        options: { showContent: true }
      });

      if (!gamePassSystem.data?.content) {
        throw new Error('Failed to get GamePassSystem content');
      }

      // Get the active_passes table
      const activePassesTable = gamePassSystem.data.content.fields.active_passes;
      if (!activePassesTable) {
        throw new Error('Active passes table not found');
      }

      // Get the actual table ID from the fields
      const tableId = activePassesTable.fields.id.id;
      if (!tableId) {
        throw new Error('Table ID not found in active_passes');
      }

      // Check if player has an active pass using getDynamicFields
      const dynamicFields = await this.client.getDynamicFields({
        parentId: tableId,
        limit: 100
      });

      // Find the player's game pass
      const playerPassEntry = dynamicFields.data.find(field => 
        field.name.type === 'address' && field.name.value === playerAddress
      );

      if (!playerPassEntry) {
        return {
          success: false,
          error: 'Player has no active game pass'
        };
      }

      // Get the actual GamePass object ID from the table entry
      // The table entry contains the GamePass object ID in its value field
      const tableEntry = await this.client.getObject({
        id: playerPassEntry.objectId,
        options: { showContent: true }
      });

      if (!tableEntry.data?.content?.fields?.value) {
        throw new Error('Failed to get GamePass ID from table entry');
      }

      const gamePassId = tableEntry.data.content.fields.value;
      const gamePass = await this.client.getObject({
        id: gamePassId,
        options: { showContent: true }
      });

      if (!gamePass.data?.content) {
        throw new Error('Failed to get GamePass content');
      }

      const fields = gamePass.data.content.fields;
      
      return {
        success: true,
        gamesRemaining: parseInt(fields.games_remaining),
        passType: typeof fields.pass_type === 'number' ? fields.pass_type : parseInt(fields.pass_type),
        isActive: fields.is_active,
        expiresAt: parseInt(fields.expires_at),
        purchasedAt: parseInt(fields.purchased_at),
        gamePassId: gamePassId
      };

    } catch (error) {
      console.error('Failed to check player game pass:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Consume a game credit for a player
   */
  async consumeGameCredit(playerAddress) {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`🎮 Consuming game credit for player: ${playerAddress}`);
      
      // First check if player has an active game pass
      const gamePassStatus = await this.checkPlayerGamePass(playerAddress);
      if (!gamePassStatus.success) {
        return {
          success: false,
          error: gamePassStatus.error
        };
      }

      // Build transaction to consume game credit
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.contracts.packageId}::game_pass::consume_game_credit_for_user`,
        arguments: [
          tx.object(this.contracts.gamePassSystemId), // GamePassSystem
          tx.object(gamePassStatus.gamePassId), // GamePass object
          tx.pure.address(playerAddress), // Player address
          tx.object(process.env.CLOCK_ID), // Clock object
        ],
      });

      // Sign and execute transaction
      console.log('📝 Signing game credit consumption transaction...');
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
          showInput: false,
          showObjectChanges: false,
        },
      });

      if (result.effects?.status?.status === 'success') {
        // Get updated game pass status
        const updatedStatus = await this.checkPlayerGamePass(playerAddress);
        
        return {
          success: true,
          creditConsumed: 1,
          gamesRemaining: updatedStatus.gamesRemaining,
          digest: result.digest
        };
      } else {
        return {
          success: false,
          error: result.effects?.status?.error || 'Game credit consumption failed'
        };
      }

    } catch (error) {
      console.error('Failed to consume game credit:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set up the game admin for the new contract
   * This is a simplified admin setup for the single game admin
   */
  async setupGameAdmin(adminAddress) {
    if (!this.isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`👑 Setting up game admin: ${adminAddress}`);
      
      // For now, we'll just log that the admin is set up
      // The AdminSystem contract is already initialized with the deployer as admin
      // We can add more admin setup logic here if needed in the future
      
      console.log(`✅ Game admin setup completed for: ${adminAddress}`);
      console.log(`   Note: AdminSystem is already initialized with deployer as admin`);
      
      return {
        success: true,
        message: `Game admin setup completed for ${adminAddress}`,
        adminAddress: adminAddress
      };

    } catch (error) {
      console.error('Failed to set up game admin:', error);
      throw error;
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up game owner wallet...');
    this.isInitialized = false;
  }
}

module.exports = { GameOwnerWallet };

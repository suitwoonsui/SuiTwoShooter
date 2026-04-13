// ==========================================
// GAME UPDATE - Update Logic Orchestration
// ==========================================
// Handles all game state updates during the game loop
// Extracted from main.js as part of the refactoring effort

console.log('✅ [GAME UPDATE] GameUpdate module loaded');

/**
 * GameUpdate class - Orchestrates all game state updates
 * 
 * Responsibilities:
 * - System updates (canvas, viewport, touch input)
 * - State checks (menu visible, game over, paused, etc.)
 * - Game logic updates (player, enemies, bosses, projectiles)
 * - Collision detection
 * - Game progression (speed, distance, scrolling)
 * - Boss management
 * - Particle and effect updates
 */
class GameUpdate {
  constructor(gameState) {
    this.gameState = gameState;
  }
  
  /**
   * Main update function - orchestrates all game updates
   */
  update() {
    // Get game state - use window.gameState or window.game (backward compatibility)
    const game = this.gameState || 
                 (typeof window !== 'undefined' && window.gameState) ? window.gameState : 
                 (typeof window !== 'undefined' && window.game) ? window.game : null;
    
    if (!game) {
      if (Math.random() < 0.01) console.error('❌ [GAME UPDATE] Game state not available'); // Throttled log
      return;
    }
    
    // Update responsive canvas system
    if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
      ResponsiveCanvas.update();
    }
    if (typeof ViewportManager !== 'undefined' && ViewportManager.isInitialized) {
      ViewportManager.update();
    }
    
    // Update enhanced touch input
    if (typeof TouchInput !== 'undefined' && TouchInput.isInitialized) {
      TouchInput.update();
    }
    
    // Don't update if menu is visible
    if (typeof gameState !== 'undefined' && gameState.isMenuVisible) {
      if (Math.random() < 0.01) console.log('⏸️ Update skipped - menu visible'); // Throttled log
      return;
    }
    
    if (game.gameOver) {
      if (Math.random() < 0.01) console.log('Game over, updating particles only'); // Throttled log
      // Update particles even in game over
      // Optimized: Update and filter in single pass for better performance
      const particles = game.particles;
      const particlesLength = particles.length;
      const aliveParticles = [];
      for (let i = 0; i < particlesLength; i++) {
        const particle = particles[i];
        particle.update();
        if (particle.life > 0) {
          aliveParticles.push(particle);
        }
      }
      game.particles = aliveParticles;
      return;
    }
    
    if (!game.gameRunning) {
      if (Math.random() < 0.01) console.log('Game not running, skipping update'); // Throttled log
      return;
    }
    
    // Skip all game logic if paused
    if (game.paused) {
      if (Math.random() < 0.01) console.log('Game paused, skipping update'); // Throttled log
      return;
    }
    
    // Handle boss victory timeout - STOP ALL MOVEMENT during victory screen
    // This must be checked BEFORE any game updates to prevent next stage from loading
    if (game.bossVictoryTimeout) {
      this._updateBossVictoryTimeout();
      return; // Skip ALL game updates during victory period - no movement, no spawning, nothing!
    }
    
    // Delegate to specific update methods
    this._updateInput();
    this._updatePlayer();
    this._updateBoss();
    this._updateGameProgression();
    this._updateTilesAndEnemies();
    this._updateProjectiles();
    this._updateCollisions();
    this._updateCollectibles();
    this._updateConsumables();
    this._updateTimers();
    this._updateBossSpawning();
  }
  
  /**
   * Update input handling
   * @private
   */
  _updateInput() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    if (typeof handleInput === 'function') {
      handleInput();
    }
    
    // Continuous auto fire (disabled during boss entrance, victory, and boss kill shot charge)
    const autoFireDisabled = typeof isAutoFireDisabled === 'function' ? isAutoFireDisabled() : false;
    if (!game.bossWarning && !game.bossVictoryTimeout && !(game.bossActive && !game.boss.vulnerable) && !autoFireDisabled) {
      if (typeof handleAutoFire === 'function') {
        handleAutoFire();
      }
    }
  }
  
  /**
   * Update player
   * @private
   */
  _updatePlayer() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    if (typeof updatePlayer === 'function') {
      updatePlayer();
    }
  }
  
  /**
   * Update boss logic
   * @private
   */
  _updateBoss() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    // Update enemy behavior
    if (typeof updateEnemyShooting === 'function') {
      updateEnemyShooting();
    }
    
    // Boss warning handling
    if (game.bossWarning) {
      // Use delta time for timer (already in milliseconds)
      const deltaTime = game.deltaTime || 16;
      
      // Pre-load boss assets during warning (only once, when warning just started)
      // Check if we're at the start of the warning (bossWarningTime is near max)
      // Only check the flag first to avoid expensive function call check every frame
      if (!game._bossWarningAssetsPrepared && typeof window.handleBossWarningTransition === 'function') {
        // Only call once when warning starts (bossWarningTime is at max ~2000ms)
        if (game.bossWarningTime >= 1990) {
          window.handleBossWarningTransition(game.currentTier);
          game._bossWarningAssetsPrepared = true;
        }
      }
      
      game.bossWarningTime -= deltaTime;
      if (game.bossWarningTime <= 0) {
        // Reset flag for next boss warning
        game._bossWarningAssetsPrepared = false;
        if (typeof createBoss === 'function') {
          createBoss();
        }
      }
      return;
    }
    
    // Boss active logic
    if (game.bossActive) {
      this._updateBossActive();
    }
    
    // Check if boss is defeated
    // Note: bossVictoryTimeout is now handled early in update() to stop all game updates
    if (game.bossActive && game.boss && game.boss.hp <= 0) {
      this._handleBossDefeat();
    }
  }
  
  /**
   * Update boss active state
   * @private
   */
  _updateBossActive() {
    const game = this.gameState || window.gameState || window.game;
    if (!game || !game.boss) return;
    
    // Boss entrance phase handling
    const now = game.now();
    const elapsedTime = now - game.boss.entranceStart;
    
    if (!game.boss.vulnerable && elapsedTime >= game.boss.entranceTime) {
      game.boss.vulnerable = true; // Boss becomes vulnerable after 2 seconds
      game.boss.lastPatternChange = now; // Start first pattern
      game.boss.enrageStart = now; // Start enrage timer
    }
    
    // Enrage system handling
    if (game.boss.vulnerable && !game.boss.enraged) {
      const enrageElapsed = now - game.boss.enrageStart;
      if (enrageElapsed >= game.boss.enrageTime) {
        // ENRAGE MODE ACTIVATED!
        game.boss.enraged = true;
        // Halve fire rate (double shooting speed) - uses already-scaled fire rate
        game.boss.fireRate = Math.floor(game.boss.fireRate * 0.5); // Double fire rate
        game.boss.speed *= 1.5; // Increase speed
        console.log('🔥 BOSS ENRAGED! Fire rate doubled, speed increased!');
      }
    }
    
    // Boss movement to position (apply slow time multiplier and delta time)
    if (game.boss.x > game.boss.targetX) {
      const bossSpeedMultiplier = typeof getEffectiveBossSpeedMultiplier === 'function' ? getEffectiveBossSpeedMultiplier() : 1.0;
      const deltaMultiplier = game.deltaMultiplier || 1.0;
      game.boss.x -= game.boss.moveSpeed * bossSpeedMultiplier * deltaMultiplier;
      
      // Clamp boss x position to prevent overshooting
      if (game.boss.x < game.boss.targetX) {
        game.boss.x = game.boss.targetX;
      }
    }
    
    // Boss vertical movement once in position (more aggressive by tier and when enraged)
    // Apply post-tier-4 speed multiplier and slow time multiplier to vertical movement speed
    // IMPORTANT: Only allow vertical movement when boss has actually reached targetX (within 1 pixel tolerance)
    // This prevents vertical movement from starting before horizontal movement completes
    const bossAtTargetX = Math.abs(game.boss.x - game.boss.targetX) < 1;
    if (game.boss.vulnerable && bossAtTargetX) {
      const baseVerticalSpeed = (1 + (game.boss.tier * 0.5));
      const speedMultiplier = typeof getProjectileSpeedMultiplier === 'function' ? getProjectileSpeedMultiplier() : 1.0;
      const bossSpeedMultiplier = typeof getEffectiveBossSpeedMultiplier === 'function' ? getEffectiveBossSpeedMultiplier() : 1.0;
      const deltaMultiplier = game.deltaMultiplier || 1.0;
      const moveSpeed = baseVerticalSpeed * speedMultiplier * bossSpeedMultiplier * (game.boss.enraged ? 2 : 1) * deltaMultiplier;
      game.boss.y += game.boss.moveDirection * moveSpeed;
      
      // Clamp boss Y position to stay within canvas bounds
      const minY = 0;
      const maxY = game.height - game.boss.height;
      if (game.boss.y < minY) {
        game.boss.y = minY;
        game.boss.moveDirection *= -1;
      } else if (game.boss.y > maxY) {
        game.boss.y = maxY;
        game.boss.moveDirection *= -1;
      }
      
      // Keep all bosses on the right side - no horizontal movement toward player
      // Bosses stay at their targetX position (right side of screen)
      
      // Only start firing once boss is in position
      if (typeof handleBossFire === 'function') {
        handleBossFire();
      }
    }
  }
  
  /**
   * Update boss victory timeout
   * @private
   */
  _updateBossVictoryTimeout() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    // Use delta time for timer (already in milliseconds)
    const deltaTime = game.deltaTime || 16;
    game.bossVictoryTime -= deltaTime;
    if (game.bossVictoryTime <= 0) {
      // Victory period over, start next stage
      game.bossVictoryTimeout = false;
      game.scrollSpeed = game.baseScrollSpeed;
      
      // Pre-load next level assets during level start delay (1 second available)
      if (typeof window.handleLevelStartDelay === 'function') {
        window.handleLevelStartDelay();
      }
      // Reset enemySpeed after tier 4 (when enemies move faster than tiles)
      // This ensures enemies start at base speed and gradually increase each stage
      if (game.bossesDefeated > 4) {
        game.enemySpeed = game.baseEnemySpeed;
        // Clear tiles and enemies to ensure clean start - prevent enemies/projectiles from being on screen
        if (typeof window !== 'undefined') {
          window.tiles = [];
          window.enemies = [];
        }
        game.enemyProjectiles = []; // Clear enemy projectiles
        game.projectiles = []; // Clear player projectiles too for clean start
        console.log('Enemy speed reset to base for new stage after boss', game.bossesDefeated);
        console.log('Cleared tiles, enemies, and projectiles for clean stage start');
      }
      // Start spawn delay timer - prevent enemies/projectiles from spawning for 1 second
      game.levelStartDelay = game.levelStartDelayDuration;
      console.log('Level start delay activated:', game.levelStartDelay, 'ms');
      
      // Pre-generate tiles during level start delay (1 second available)
      if (typeof window.handleLevelStartDelay === 'function') {
        window.handleLevelStartDelay();
      }
      
      // Distance speed remains constant
      
      // Start regular music after victory screen ends
      if (typeof resumeGameplayMusic === 'function') {
        resumeGameplayMusic();
      }
      
      // Don't reset distanceSinceBoss here - it should reset when boss warning appears
    }
  }
  
  /**
   * Handle boss defeat
   * @private
   */
  async _handleBossDefeat() {
    const game = this.gameState || window.gameState || window.game;
    if (!game || !game.bossActive || !game.boss || game.boss.hp > 0) {
      return; // Boss not defeated or already handled
    }
    
    // Stop boss music immediately when HP reaches zero
    if (typeof stopBackgroundMusic === 'function') {
      stopBackgroundMusic();
    }
    
    // Start victory timeout period
    game.bossVictoryTimeout = true;
    game.bossVictoryTime = 3000; // 3 seconds victory period
    
    game.bossActive = false;
    // Track boss tier BEFORE incrementing bossesDefeated (use the boss's actual tier)
    const defeatedBossTier = game.boss ? game.boss.tier : game.currentTier;
    const bossDefeatBonus = 5000 * defeatedBossTier;
    
    // Pre-load next level assets during victory transition (3 seconds available)
    // Calculate next tier (current tier stays same, but prepare for next boss)
    const nextTier = game.currentTier; // Will be same tier for next boss
    if (typeof window.handleBossVictoryTransition === 'function') {
      window.handleBossVictoryTransition(nextTier);
    }
    const scoreBeforeBossDefeat = game.score;
    console.log('🎯 [BOSS DEFEAT] Tier:', defeatedBossTier, 'Bonus:', bossDefeatBonus, 'Score before:', scoreBeforeBossDefeat);
    
    game.bossTiers.push(defeatedBossTier);
    game.bossesDefeated++;
    if (typeof window !== 'undefined' && window.ReplayRecorder && typeof window.ReplayRecorder.recordBossKill === 'function') {
      window.ReplayRecorder.recordBossKill(defeatedBossTier);
    }
    game.currentTier = Math.min(4, Math.floor(game.bossesDefeated / 1) + 1); // New tier after each boss
    
    // Recalculate power-up cap based on current orb level at start of new tier
    // Cap = current orb level + 2 (allows 2 more power-ups in the new tier)
    game.orbLevelCap = game.projectileLevel + 2;
    console.log(`🔮 [ORB LEVEL] Cap recalculated to Level ${game.orbLevelCap} for new tier (current level: ${game.projectileLevel}, tier: ${game.currentTier})`);
    
    console.log('Boss defeated! bossesDefeated:', game.bossesDefeated, 'defeatedBossTier:', defeatedBossTier, 'new currentTier:', game.currentTier);
    
    // IMPORTANT: Add boss defeat bonus BEFORE showing End Demo modal
    // This ensures the score is correct when the modal displays
    if (typeof updateScore === 'function') {
      updateScore(bossDefeatBonus); // Much more points to reward effort (use defeated boss's tier, not new tier)
    }
    
    // Check if this is the first boss (bossesDefeated === 1 after increment)
    // Show End Demo modal if in demo mode
    // Also check if player has credits even though they're in demo mode (consumption failed at start)
    if (game.bossesDefeated === 1 && game.isDemoMode) {
      // Get wallet address
      let walletAddress = null;
      if (typeof getWalletAddress === 'function') {
        walletAddress = getWalletAddress();
      } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
        walletAddress = window.walletAPIInstance.getAddress();
      }
      
      if (walletAddress && window.EndDemoModal) {
        // Pause the game when showing the modal
        game.paused = true;
        console.log('⏸️ [BOSS DEFEAT] Game paused for End Demo modal');
        
        // Check if player has credits (even though in demo mode - consumption may have failed at start)
        let hasCredits = false;
        if (window.GamePassService) {
          try {
            const status = await window.GamePassService.getCreditsAndTickets(walletAddress, true);
            hasCredits = status.success && (status.credits || 0) > 0;
          } catch (error) {
            console.warn('Error checking credits after boss defeat', error);
          }
        }
        
        // Get score using the same logic as the game UI overlay
        // Priority: _fallbackScore > secureGame.score > game.score getter
        let currentScore = 0;
        
        // First check _fallbackScore (most reliable after boss defeat)
        if (game._fallbackScore !== undefined && game._fallbackScore !== null && game._fallbackScore > 0) {
          currentScore = game._fallbackScore;
        }
        // Then check secureGame directly (from window.secureGame)
        else if (currentScore === 0 && typeof window !== 'undefined' && window.secureGame) {
          try {
            const directScore = window.secureGame.score;
            if (directScore > 0) {
              currentScore = directScore;
            }
          } catch (e) {
            // Ignore errors accessing secureGame.score
          }
        }
        // Finally use game.score getter
        else if (currentScore === 0) {
          const getterScore = game.score;
          currentScore = (getterScore !== undefined && getterScore !== null && getterScore > 0) ? getterScore : 0;
        }
        
        // Show End Demo modal (async, but don't block game)
        // Pass hasCredits flag to modal so it can show appropriate options
        window.EndDemoModal.show({
          playerAddress: walletAddress,
          score: currentScore,
          bossesDefeated: game.bossesDefeated,
          hasCredits: hasCredits, // Pass flag to indicate if player has credits
        }).then((result) => {
          if (result.action === 'continue') {
            // Player has credits - consume and continue
            if (window.GamePassService) {
              window.GamePassService.consumeGameCredit(walletAddress).then((consumeResult) => {
                if (consumeResult.success) {
                  // Switch to full game mode
                  game.isDemoMode = false;
                  // Unpause the game to continue playing
                  game.paused = false;
                  console.log('✅ Switched to full game mode after credit consumption', {
                    gamesRemaining: consumeResult.gamesRemaining,
                  });
                  
                  // Refresh credit display
                  if (window.GamePassDisplay) {
                    window.GamePassDisplay.refresh(walletAddress, true, false).catch(err => {
                      console.warn('Failed to refresh credit display after consumption', err);
                    });
                  }
                } else {
                  // Improved error handling
                  const errorMsg = consumeResult.error || 'Unknown error';
                  console.error('❌ Failed to consume credit for continuation', errorMsg);
                  
                  // Show user-friendly error message
                  if (errorMsg.includes('not have an active game pass') || errorMsg.includes('credits remaining')) {
                    alert(`No credits available.\n\n${errorMsg}\n\nReturning to menu.`);
                  } else if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('connection')) {
                    alert(`Network error while consuming credit.\n\n${errorMsg}\n\nPlease check your connection and try again.`);
                  } else {
                    alert(`Failed to consume game credit.\n\n${errorMsg}\n\nReturning to menu.`);
                  }
                  
                  // Return to menu on failure
                  if (typeof gameOver === 'function') {
                    gameOver();
                  }
                }
              }).catch((error) => {
                console.error('❌ Error consuming credit for continuation', error);
                alert(`Error consuming credit: ${error.message || 'Unknown error'}\n\nReturning to menu.`);
                // Return to menu on error
                if (typeof gameOver === 'function') {
                  gameOver();
                }
              });
            }
          } else if (result.action === 'purchase') {
            // Show store with credits-only mode (Game Pass tab only)
            if (typeof showStore === 'function') {
              // Pause game and show store
              game.paused = true;
              showStore('credits-only'); // Pass context to show credits-only store
              
              // Store the wallet address and game state for after-purchase check
              const purchaseContext = {
                walletAddress,
                game,
                checkCreditsAndContinue: async () => {
                  // Check if player now has credits after purchase
                  if (window.GamePassService) {
                    try {
                      const status = await window.GamePassService.getCreditsAndTickets(walletAddress, true);
                      if (status.success && (status.credits || 0) > 0) {
                        // Player has credits now - show continue option
                        // Ensure game is still paused
                        game.paused = true;
                        if (window.EndDemoModal) {
                          window.EndDemoModal.show({
                            playerAddress: walletAddress,
                            score: game.score,
                            bossesDefeated: game.bossesDefeated,
                          }).then((continueResult) => {
                            if (continueResult.action === 'continue') {
                              // Consume credit and continue
                              window.GamePassService.consumeGameCredit(walletAddress).then((consumeResult) => {
                                if (consumeResult.success) {
                                  game.isDemoMode = false;
                                  game.paused = false;
                                  console.log('✅ Switched to full game mode after credit purchase and consumption');
                                  
                                  // Refresh credit display
                                  if (window.GamePassDisplay) {
                                    window.GamePassDisplay.refresh(walletAddress, true, false).catch(err => {
                                      console.warn('Failed to refresh credit display', err);
                                    });
                                  }
                                } else {
                                  alert(`Failed to consume credit: ${consumeResult.error || 'Unknown error'}\n\nReturning to menu.`);
                                  if (typeof gameOver === 'function') {
                                    gameOver();
                                  }
                                }
                              });
                            } else if (continueResult.action === 'close') {
                              // Return to menu - use returnToMainMenu instead of gameOver
                              // First, ensure game is unpaused if it was paused
                              if (game && game.paused) {
                                game.paused = false;
                              }
                              
                              // Use GameLifecycle.returnToMainMenu() if available
                              if (typeof getGameLifecycle === 'function') {
                                const lifecycle = getGameLifecycle();
                                if (lifecycle && typeof lifecycle.returnToMainMenu === 'function') {
                                  lifecycle.returnToMainMenu();
                                  return;
                                }
                              }
                              
                              // Fallback: Use GameService.closeGame() with returnToMenu to handle tournament check
                              if (typeof GameService !== 'undefined' && typeof GameService.closeGame === 'function') {
                                GameService.closeGame(true); // Return to appropriate menu (tournament or main)
                              } else {
                                // Final fallback if GameService not available
                              if (typeof MenuService !== 'undefined' && typeof MenuService.show === 'function') {
                                MenuService.show({ afterGame: true });
                              } else if (typeof showMainMenu === 'function') {
                                showMainMenu({ afterGame: true });
                                }
                              }
                            }
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Error checking credits after store close', error);
                    }
                  }
                }
              };
              
              // Store context globally so store can call it after purchase
              window._endDemoPurchaseContext = purchaseContext;
            }
          } else {
            // Return to menu - use returnToMainMenu instead of gameOver to avoid game over flow
            // First, ensure game is unpaused if it was paused
            if (game && game.paused) {
              game.paused = false;
            }
            
            // Use GameLifecycle.returnToMainMenu() if available (proper cleanup and menu display)
            if (typeof getGameLifecycle === 'function') {
              const lifecycle = getGameLifecycle();
              if (lifecycle && typeof lifecycle.returnToMainMenu === 'function') {
                lifecycle.returnToMainMenu();
                return;
              }
            }
            
            // Fallback: Use GameService.closeGame() with returnToMenu to handle tournament check
            if (typeof GameService !== 'undefined' && typeof GameService.closeGame === 'function') {
              GameService.closeGame(true); // Return to appropriate menu (tournament or main)
            } else {
              // Final fallback if GameService not available
            if (typeof MenuService !== 'undefined' && typeof MenuService.show === 'function') {
              MenuService.show({ afterGame: true });
            } else if (typeof showMainMenu === 'function') {
              showMainMenu({ afterGame: true });
              }
            }
          }
        }).catch((error) => {
          console.error('Error showing End Demo modal:', error);
          // Continue game on error
        });
      }
    }
    
    // When separate enemies system activates (after tier 4 boss), clear enemies array
    // EnemySpeed will be reset when victory timeout ends, ensuring clean start
    if (game.bossesDefeated === 5) {
      // Clear any existing separate enemies and projectiles to ensure clean start
      if (typeof window !== 'undefined') {
        window.enemies = [];
      }
      game.enemyProjectiles = []; // Clear enemy projectiles immediately
      console.log('Separate enemies system activated. Cleared enemies array and projectiles for fresh start.');
    }
    game.boss = null;
    
    // Clear boss projectiles when boss is defeated
    game.bossProjectiles = [];
    
    // Score bonus was already added above (before End Demo modal)
    // Verify the bonus was added using the same score retrieval logic
    setTimeout(() => {
      // Get score using the same priority as elsewhere: _fallbackScore > secureGame.score > game.score getter
      let scoreAfterBossDefeat = 0;
      
      // First check _fallbackScore (most reliable after boss defeat)
      if (game._fallbackScore !== undefined && game._fallbackScore !== null && game._fallbackScore > 0) {
        scoreAfterBossDefeat = game._fallbackScore;
      }
      // Then check secureGame directly (from window.secureGame)
      else if (scoreAfterBossDefeat === 0 && typeof window !== 'undefined' && window.secureGame) {
        try {
          const directScore = window.secureGame.score;
          if (directScore > 0) {
            scoreAfterBossDefeat = directScore;
          }
        } catch (e) {
          // Ignore errors accessing secureGame.score
        }
      }
      // Finally use game.score getter
      else if (scoreAfterBossDefeat === 0) {
        const getterScore = game.score;
        scoreAfterBossDefeat = (getterScore !== undefined && getterScore !== null && getterScore > 0) ? getterScore : 0;
      }
      
      // Also get scoreBeforeBossDefeat using the same logic for accurate comparison
      let scoreBefore = scoreBeforeBossDefeat;
      if (scoreBefore === 0) {
        // Try to reconstruct what the score was before (scoreAfter - bonus)
        scoreBefore = scoreAfterBossDefeat - bossDefeatBonus;
      }
      
      const actualBonus = scoreAfterBossDefeat - scoreBefore;
      console.log('🎯 [BOSS DEFEAT VERIFY] Score after:', scoreAfterBossDefeat, 'Score before:', scoreBefore, 'Expected bonus:', bossDefeatBonus, 'Actual bonus:', actualBonus, 'Match:', actualBonus === bossDefeatBonus);
      if (actualBonus !== bossDefeatBonus) {
        console.error('❌ [BOSS DEFEAT] Bonus NOT added correctly! Expected:', bossDefeatBonus, 'Got:', actualBonus);
      }
    }, 100);
    
    // Play boss destroyed sound
    if (typeof playBossDestroyedSound === 'function') {
      playBossDestroyedSound();
    }
    
    // Massive victory effect
    if (typeof Particle !== 'undefined') {
      for (let i = 0; i < 100; i++) {
        game.particles.push(new Particle(
          game.width/2 + (Math.random()-0.5)*300, 
          game.height/2 + (Math.random()-0.5)*300, 
          '#FFD700'
        ));
      }
    }
  }
  
  /**
   * Update game progression (speed, distance, scrolling)
   * @private
   */
  _updateGameProgression() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    // Get delta time multiplier (1.0 at 60 FPS)
    const deltaMultiplier = game.deltaMultiplier || 1.0;
    const deltaTime = game.deltaTime || 16;
    
    // Only update game progression if not in boss fight
    if (!game.bossActive) {
      // Update visual/scroll speed (for gameplay difficulty) - scale increment by delta
      game.scrollSpeed = Math.min(game.maxScrollSpeed, game.scrollSpeed + game.scrollSpeedIncrement * deltaMultiplier);
      
      // Update enemy speed (after tier 4: enemies move faster than tiles with increasing cap)
      if (game.bossesDefeated > 4) {
        // Calculate enemy speed cap based on bosses defeated after tier 4
        // Base cap is maxScrollSpeed (6.0), increase by 0.25 per boss after tier 4
        const enemySpeedCap = game.maxScrollSpeed + (game.bossesDefeated - 4) * 0.25;
        game.enemySpeed = Math.min(enemySpeedCap, game.enemySpeed + game.enemySpeedIncrement * deltaMultiplier);
      } else {
        // Before tier 4: Enemy speed matches scrollSpeed (enemies move at same speed as tiles)
        game.enemySpeed = game.scrollSpeed;
      }
      
      // Update distance calculations (constant speed for consistent boss timing) - scale by delta
      const distanceDelta = game.distanceSpeed * deltaMultiplier;
      game.distance += distanceDelta;
      game.distanceSinceBoss += distanceDelta;
      if (typeof window !== 'undefined' && window.ReplayRecorder && typeof window.ReplayRecorder.recordDistanceTick === 'function') {
        window.ReplayRecorder.recordDistanceTick(distanceDelta);
      }
      
      // Update visual scrolling (background) - use effective scroll speed (with slow time multiplier) - scale by delta
      const effectiveScrollSpeed = typeof getEffectiveScrollSpeed === 'function' ? getEffectiveScrollSpeed() : game.scrollSpeed;
      game.bgX += effectiveScrollSpeed * deltaMultiplier;
      if (game.bgX >= game.width) game.bgX = 0;
      
      // Debug boss progress
      if (game.distanceSinceBoss > 0 && game.distanceSinceBoss % 1000 < game.distanceSpeed * deltaMultiplier) {
        console.log('Boss progress:', Math.floor(game.distanceSinceBoss), '/', game.bossThreshold);
      }
    }
    
    // Update level start delay timer - use delta time (already in milliseconds)
    if (game.levelStartDelay > 0) {
      game.levelStartDelay -= deltaTime;
      if (game.levelStartDelay < 0) game.levelStartDelay = 0;
    }
  }
  
  /**
   * Update tiles and enemies
   * @private
   */
  _updateTilesAndEnemies() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    // Get tiles and enemies arrays from window (exposed by main.js)
    const tilesArray = (typeof window !== 'undefined' && window.tiles) ? window.tiles : [];
    const enemiesArray = (typeof window !== 'undefined' && window.enemies) ? window.enemies : [];
    
    // Clear enemies during boss warning or boss battle (they should not be visible)
    if (game.bossWarning || game.bossActive) {
      // Ensure enemies are cleared during boss fights
      if (typeof window !== 'undefined') {
        // Clear enemies array (always use enemies[] array)
        if (window.enemies && window.enemies.length > 0) {
          window.enemies = [];
          if (typeof enemies !== 'undefined') {
            enemies = [];
          }
        }
        // Sync arrays
        if (typeof window.syncGameArrays === 'function') {
          window.syncGameArrays();
        }
      }
      return; // Don't update tiles/enemies during boss fights
    }
    
    // Only scroll tiles and generate new ones if not in boss fight
    if (!game.bossActive) {
      // Get effective speeds (with slow time multiplier applied if active)
      const effectiveScrollSpeed = typeof getEffectiveScrollSpeed === 'function' ? getEffectiveScrollSpeed() : game.scrollSpeed;
      const effectiveEnemySpeed = typeof getEffectiveEnemySpeed === 'function' ? getEffectiveEnemySpeed() : game.enemySpeed;
      
      // Get delta time multiplier (1.0 at 60 FPS)
      const deltaMultiplier = game.deltaMultiplier || 1.0;
      
      // ALWAYS move enemies from enemies[] array
      // Before tier 4: enemies move at scrollSpeed (same as tiles)
      // After tier 4: enemies move at enemySpeed (faster than tiles)
      // Determine which speed to use based on tier
      const shouldUseEnemySpeed = game.bossesDefeated > 4;
      const enemyMoveSpeed = shouldUseEnemySpeed ? effectiveEnemySpeed : effectiveScrollSpeed;
      
      // Move enemies at appropriate speed - scale by delta time
      // Optimized: Use for loop instead of forEach for better performance
      const enemiesLength = enemiesArray.length;
      for (let i = 0; i < enemiesLength; i++) {
        enemiesArray[i].x -= enemyMoveSpeed * deltaMultiplier;
      }
      
      // Move tiles at scrollSpeed (always) - scale by delta time
      // Optimized: Use for loop instead of forEach for better performance
      const tilesLength = tilesArray.length;
      for (let i = 0; i < tilesLength; i++) {
        tilesArray[i].x -= effectiveScrollSpeed * deltaMultiplier;
      }
      
      // Remove off-screen enemies and update global reference
      // Optimized: Use for loop for filtering (more efficient than filter)
      const filteredEnemies = [];
      for (let i = 0; i < enemiesLength; i++) {
        if (enemiesArray[i].x > -200) {
          filteredEnemies.push(enemiesArray[i]);
        }
      }
      if (typeof window !== 'undefined') {
        window.enemies = filteredEnemies;
      }
      
      // Generate new tiles ONLY if spawn delay has passed (before filtering out off-screen tiles)
      // IMPORTANT: Generate BEFORE filtering, so we always have enough tiles
      if (game.levelStartDelay <= 0 && typeof generateTiles === 'function') {
        // Get current tiles count before generation
        const tilesBeforeGen = (typeof window !== 'undefined' && window.tiles) ? window.tiles.length : 0;
        generateTiles();
        // Get tiles count after generation
        const tilesAfterGen = (typeof window !== 'undefined' && window.tiles) ? window.tiles.length : 0;
        if (tilesAfterGen <= tilesBeforeGen && tilesAfterGen < 30) {
          console.warn('⚠️ [TILES] generateTiles() did not add tiles! Before:', tilesBeforeGen, 'After:', tilesAfterGen);
        }
      }
      
      // Remove off-screen tiles and update global reference
      // IMPORTANT: Get fresh reference AFTER generateTiles() (it may have updated window.tiles)
      const currentTiles = (typeof window !== 'undefined' && window.tiles) ? window.tiles : [];
      // Optimized: Use for loop for filtering (more efficient than filter)
      const currentTilesLength = currentTiles.length;
      const filteredTiles = [];
      for (let i = 0; i < currentTilesLength; i++) {
        if (currentTiles[i].x > -200) {
          filteredTiles.push(currentTiles[i]);
        }
      }
      if (typeof window !== 'undefined') {
        window.tiles = filteredTiles;
        // Also update the local tiles variable in main.js to keep them in sync
        if (typeof window.syncGameArrays === 'function') {
          window.syncGameArrays();
        }
      }
      
      // Debug: Log if tiles count is getting too low
      if (filteredTiles.length < 10) {
        console.warn('⚠️ [TILES] Low tile count after filtering:', filteredTiles.length, 'Expected: ~30');
      }
    }
  }
  
  /**
   * Update projectiles
   * @private
   */
  _updateProjectiles() {
    const game = this.gameState || window.gameState || window.game;
    if (!game || !game.projectiles) return;
    
    // Get enemies array once (before projectile loop) - CRITICAL for performance
    // Filter out already-destroyed enemies once, not per projectile
    const enemiesArray = (typeof window !== 'undefined' && window.enemies) ? window.enemies : [];
    const aliveEnemies = [];
    const enemiesLength = enemiesArray.length;
    for (let i = 0; i < enemiesLength; i++) {
      if (enemiesArray[i].hp > 0) {
        aliveEnemies.push(enemiesArray[i]);
      }
    }
    
    // Pre-calculate enemy dimensions per type (cache to avoid repeated lookups in collision loop)
    const enemyDimensionsCache = new Map();
    const enemyTypesToCheck = new Set();
    for (let i = 0; i < aliveEnemies.length; i++) {
      enemyTypesToCheck.add(aliveEnemies[i].type);
    }
    enemyTypesToCheck.forEach(enemyType => {
      const enemyImage = typeof enemyImages !== 'undefined' ? enemyImages[enemyType - 1] : null;
      if (enemyImage) {
        const enemyDims = typeof getEnemyDimensions === 'function' ? getEnemyDimensions(enemyImage) : { width: 60, height: 60, centerOffset: 0 };
        enemyDimensionsCache.set(enemyType, enemyDims);
      } else {
        enemyDimensionsCache.set(enemyType, { width: 60, height: 60, centerOffset: 0 });
      }
    });
    
    // Helper function to check projectile collision with enemy
    const checkProjectileEnemyCollision = (projectile, enemy, enemyX, orbSize) => {
      const oy = enemy.lane * game.laneHeight + (game.laneHeight - 60) / 2;
      
      // Use cached enemy dimensions (calculated once per enemy type, not per collision)
      const enemyDims = enemyDimensionsCache.get(enemy.type) || { width: 60, height: 60, centerOffset: 0 };
      const drawX = enemyX + enemyDims.centerOffset;
      const enemyY = oy;
      
      // Calculate projectile collision box (proper collision detection)
      const projectileX = projectile.x;
      const projectileY = projectile.y - orbSize / 2;
      const projectileWidth = orbSize;
      const projectileHeight = orbSize;
      
      // Check collision between projectile and enemy
      if (projectileX < drawX + enemyDims.width && projectileX + projectileWidth > drawX &&
          projectileY < enemyY + enemyDims.height && projectileY + projectileHeight > enemyY) {
        // Use old level equivalent for damage calculation (level 10 = old level 6 = 6 damage)
        const oldLevel = typeof getOldLevelEquivalent === 'function' ? getOldLevelEquivalent(projectile.level) : projectile.level;
        const hpBefore = enemy.hp;
        enemy.hp -= oldLevel; // Decrease HP by old level equivalent (bigger orbs = more damage)
        console.log(`🎯 [COLLISION] Enemy hit! HP: ${hpBefore} -> ${enemy.hp}, damage: ${oldLevel}`);
        
        // Calculate collision point (where projectile intersects with enemy)
        const collisionX = Math.max(projectileX, drawX);
        const collisionY = Math.max(projectileY, enemyY);
        
        // Play enemy hit sound - ALWAYS play when enemy is hit, regardless of destruction
        if (typeof playEnemyHitSound === 'function') {
          console.log('🎯 [ENEMY HIT] Calling playEnemyHitSound()');
          playEnemyHitSound();
        } else {
          console.warn('🎯 [ENEMY HIT] playEnemyHitSound function not available');
        }
        
        if (enemy.hp <= 0) {
          console.log(`💀 [ENEMY DESTROYED] Enemy destroyed (HP: ${enemy.hp})`);
          // Monster destroyed - SECURE SCORING
          if (typeof updateScore === 'function') {
            updateScore(15 * enemy.type); // SECURE: More points for high tier monsters
          }
          // Track enemy defeat for blockchain/burn calculation
          game.enemiesDefeated++;
          // Track enemy type for accurate score calculation
          if (!game.enemyTypes) game.enemyTypes = [];
          game.enemyTypes.push(enemy.type);
          if (typeof window !== 'undefined' && window.ReplayRecorder && typeof window.ReplayRecorder.recordEnemyKill === 'function') {
            window.ReplayRecorder.recordEnemyKill(enemy.type);
          }
          // Play enemy destroyed sound - DISABLED (keeping only enemy hit sound)
          // if (typeof playEnemyDestroyedSound === 'function') {
          //   playEnemyDestroyedSound();
          // }
          if (typeof createExplosionEffect === 'function') {
            createExplosionEffect(collisionX, collisionY);
          }
          return true; // Enemy destroyed
        } else {
          // Monster hit but not destroyed
          if (typeof createProjectileHitEffect === 'function') {
            createProjectileHitEffect(collisionX, collisionY);
          }
          return false; // Enemy still alive
        }
      }
      return null; // No collision
    };
    
    // Pre-calculate boss collision data ONCE (not per projectile) - CRITICAL for performance
    let bossCollisionData = null;
    if (game.bossActive && game.boss && game.boss.vulnerable && game.boss.x <= game.boss.targetX) {
      // Calculate dynamic boss dimensions (same as rendering) - ONCE, not per projectile
      const imageToUse = (typeof bossImage !== 'undefined' ? bossImage : null) || 
                        (typeof bossImages !== 'undefined' ? bossImages[game.boss.type - 1] : null) || 
                        (typeof enemyImages !== 'undefined' ? enemyImages[0] : null);
      if (imageToUse) {
        const bossDims = typeof getBossDimensions === 'function' ? getBossDimensions(imageToUse, game.boss.width, game.boss.height) : { width: game.boss.width, height: game.boss.height, centerOffset: 0 };
        const bossX = game.boss.x + bossDims.centerOffset;
        const bossY = game.boss.y;
        const bossCenterX = bossX + bossDims.width / 2;
        const collisionLineWidth = 50; // Wider collision line (50 pixels wide) for better hit detection
        const collisionLeft = bossCenterX - collisionLineWidth / 2;
        const collisionRight = bossCenterX + collisionLineWidth / 2;
        
        bossCollisionData = {
          bossX,
          bossY,
          bossCenterX,
          bossDims,
          collisionLeft,
          collisionRight,
          imageToUse
        };
      }
    }
    
    // Update projectiles using for loop (more efficient than filter when we need to modify enemies)
    const deltaMultiplier = game.deltaMultiplier || 1.0;
    const projectiles = game.projectiles;
    const projectilesLength = projectiles.length;
    const aliveProjectiles = [];
    
    for (let i = 0; i < projectilesLength; i++) {
      const b = projectiles[i];
      let projectileHit = false;
      
      // Don't update projectiles if boss is active but not in position yet
      if (game.bossActive && game.boss && game.boss.x > game.boss.targetX) {
        aliveProjectiles.push(b); // Keep projectile but don't update it
        continue;
      }
      
      // Scale projectile movement by delta time
      b.x += b.speed * deltaMultiplier;
      
      // Add current position to trail (center of projectile image)
      // Use old level equivalent for size calculation (level 10 = old level 6 = 64px)
      const oldLevel = typeof getOldLevelEquivalent === 'function' ? getOldLevelEquivalent(b.level) : b.level;
      const orbSize = oldLevel * 8 + 16;
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.x + orbSize / 2, y: b.y }); // Center of the projectile image
      
      // Remove old trail points
      if (b.maxTrailLength && b.trail.length > b.maxTrailLength) {
        b.trail.shift();
      }
      
      // Remove projectile if it's off screen
      if (b.x > game.width + 50) {
        continue; // Skip this projectile
      }
      
      // Check collisions with enemies (using pre-filtered alive enemies array)
      const aliveEnemiesLength = aliveEnemies.length;
      for (let j = 0; j < aliveEnemiesLength; j++) {
        const enemy = aliveEnemies[j];
        if (enemy.hp <= 0) continue; // Skip already destroyed enemies
        
        const result = checkProjectileEnemyCollision(b, enemy, enemy.x, orbSize);
        if (result === true) {
          projectileHit = true;
          break; // Projectile hit enemy, stop checking other enemies
        } else if (result === false) {
          projectileHit = true;
          break; // Projectile hit enemy but didn't destroy it, stop checking
        }
      }
      
      // Check collision with boss (using pre-calculated collision data)
      if (!projectileHit && bossCollisionData && game.boss && game.boss.hp > 0) {
        // Calculate projectile collision box
        const projectileX = b.x;
        const projectileY = b.y - orbSize / 2;
        const projectileWidth = orbSize;
        const projectileHeight = orbSize;
        
        // Adjust collision zone so projectile's RIGHT edge hits the green line
        const projectileRightEdge = projectileX + projectileWidth;
        
        if (projectileRightEdge > bossCollisionData.collisionLeft && 
            projectileRightEdge < bossCollisionData.collisionRight &&
            projectileY < bossCollisionData.bossY + bossCollisionData.bossDims.height && 
            projectileY + projectileHeight > bossCollisionData.bossY) {
          const previousHP = game.boss.hp;
          // Use old level equivalent for damage calculation (level 10 = old level 6 = 6 damage)
          const damageDealt = oldLevel; // Damage equals old level equivalent
          game.boss.hp -= damageDealt; // Decrease HP by orb level (bigger orbs = more damage)
          game.boss.hitTime = 10;
          // Only award points and track damage if the hit actually damaged the boss (HP was > 0 before hit)
          if (previousHP > 0) {
            if (typeof updateScore === 'function') {
              updateScore(damageDealt); // Points equal to damage dealt (orb level)
            }
            game.bossHits += damageDealt; // Track total damage dealt for accurate score calculation
            for (let i = 0; i < damageDealt; i++) {
              if (typeof window !== 'undefined' && window.ReplayRecorder && typeof window.ReplayRecorder.recordBossHit === 'function') {
                window.ReplayRecorder.recordBossHit();
              }
            }
          }
          
          // Check if boss was defeated immediately after HP decrement
          if (game.boss && game.boss.hp <= 0 && game.bossActive) {
            // Trigger boss defeat immediately to ensure score is added right away
            this._handleBossDefeat();
            projectileHit = true;
          }
          
          // Play boss hit sound
          if (typeof playBossHitSound === 'function') {
            playBossHitSound();
          }
          
          // Calculate collision point (at the green line - boss center)
          const collisionX = bossCollisionData.bossCenterX;
          const collisionY = Math.max(projectileY, bossCollisionData.bossY);
          if (typeof createBossHitEffect === 'function') {
            createBossHitEffect(collisionX, collisionY);
          }
          projectileHit = true;
        }
      }
      
      // Keep projectile if it didn't hit something
      if (!projectileHit) {
        aliveProjectiles.push(b);
      }
    }
    
    // Update projectiles array
    game.projectiles = aliveProjectiles;
    
    // Update enemies array (filter out destroyed enemies once, after all projectiles processed)
    const finalEnemies = [];
    const aliveEnemiesLength = aliveEnemies.length;
    for (let i = 0; i < aliveEnemiesLength; i++) {
      if (aliveEnemies[i].hp > 0) {
        finalEnemies.push(aliveEnemies[i]);
      }
    }
    if (typeof window !== 'undefined') {
      window.enemies = finalEnemies;
    }
  }
  
  /**
   * Update collisions
   * @private
   */
  _updateCollisions() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    // Update enemy projectiles
    if (typeof updateEnemyProjectiles === 'function') {
      updateEnemyProjectiles();
    }
    
    // Update boss projectiles
    if (typeof updateBossProjectiles === 'function') {
      updateBossProjectiles();
    }
    
    // Update particles
    // Optimized: Use for loop instead of forEach for better performance
    const particles = game.particles;
    const particlesLength = particles.length;
    
    // Only filter if array is large or we expect dead particles (optimization: skip filtering if array is small and likely all alive)
    let needsFiltering = particlesLength > 50; // Only filter if array is large (many particles = likely some are dead)
    
    if (needsFiltering) {
      // Update and filter in a single pass for better performance
      const aliveParticles = [];
      for (let i = 0; i < particlesLength; i++) {
        const particle = particles[i];
        particle.update();
        if (particle.life > 0) {
          aliveParticles.push(particle);
        }
      }
      game.particles = aliveParticles;
    } else {
      // Small array - just update (most particles are likely alive)
      for (let i = 0; i < particlesLength; i++) {
        particles[i].update();
      }
      // Only filter if we detect dead particles (check first, filter only if needed)
      let hasDeadParticles = false;
      for (let i = 0; i < particlesLength; i++) {
        if (particles[i].life <= 0) {
          hasDeadParticles = true;
          break;
        }
      }
      if (hasDeadParticles) {
        const aliveParticles = [];
        for (let i = 0; i < particlesLength; i++) {
          if (particles[i].life > 0) {
            aliveParticles.push(particles[i]);
          }
        }
        game.particles = aliveParticles;
      }
    }
    
    // Collision detection
    if (typeof checkObstacleCollision === 'function' && checkObstacleCollision()) {
      game.lives--;
      if (game.lives <= 0 && typeof gameOver === 'function') {
        gameOver();
      }
    }
    
    if (typeof checkEnemyProjectileCollision === 'function' && checkEnemyProjectileCollision()) {
      game.lives--;
      if (game.lives <= 0 && typeof gameOver === 'function') {
        gameOver();
      }
    }
    
    if (typeof checkBossProjectileCollision === 'function' && checkBossProjectileCollision()) {
      game.lives--;
      if (game.lives <= 0 && typeof gameOver === 'function') {
        gameOver();
      }
    }
  }
  
  /**
   * Update collectibles
   * @private
   */
  _updateCollectibles() {
    if (typeof checkCoinCollection === 'function') {
      checkCoinCollection();
    }
    if (typeof checkPowerupCollection === 'function') {
      checkPowerupCollection();
    }
  }
  
  /**
   * Update consumables
   * @private
   */
  _updateConsumables() {
    // Initialize consumable system if not already initialized
    if (typeof ConsumableSystem !== 'undefined' && ConsumableSystem.initialize && !ConsumableSystem._initialized) {
      ConsumableSystem.initialize();
      console.log('🔧 [CONSUMABLES] Consumable system initialized');
    }
    
    // Update coin tractor beam
    if (typeof updateCoinTractorBeam === 'function') {
      updateCoinTractorBeam();
    }
    
    // Update slow time
    if (typeof updateSlowTime === 'function') {
      updateSlowTime();
    }
    
    // Update destroy all missiles
    if (typeof updateDestroyAll === 'function') {
      updateDestroyAll();
    }
    
    // Update boss kill shot
    if (typeof updateBossKillShot === 'function') {
      updateBossKillShot();
    }
    
    // Update consumable button states
    if (typeof ConsumableSystem !== 'undefined' && ConsumableSystem.updateButtonStates) {
      ConsumableSystem.updateButtonStates();
    }
  }
  
  /**
   * Update timers
   * @private
   */
  _updateTimers() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    // Flash effect
    if (game.flashTime > 0) {
      game.flashTime--;
    }
    
    // Invulnerability timer
    if (game.invulnerabilityTime > 0) {
      game.invulnerabilityTime--;
    }
    
    // Force field invulnerability timer
    if (game.forceField && game.forceField.invulnerabilityTime > 0) {
      game.forceField.invulnerabilityTime--;
    }
  }
  
  /**
   * Update boss spawning
   * @private
   */
  _updateBossSpawning() {
    const game = this.gameState || window.gameState || window.game;
    if (!game) return;
    
    // Boss spawning
    if (!game.bossActive && !game.bossVictoryTimeout && game.distanceSinceBoss >= game.bossThreshold) {
      console.log('Boss spawning! distanceSinceBoss:', game.distanceSinceBoss, 'bossThreshold:', game.bossThreshold);
      if (typeof spawnBoss === 'function') {
        spawnBoss();
      }
    }
  }
}

// Instance is managed in main.js to avoid duplicate declarations
// This module just provides the class and initialization function

/**
 * Initialize the game update system
 * @param {Object} gameState - The game state object
 * @returns {GameUpdate} The game update instance
 */
function initGameUpdate(gameState) {
  // Check if instance already exists (managed by main.js)
  if (typeof window !== 'undefined' && window.gameUpdateInstance) {
    console.warn('⚠️ [GAME UPDATE] GameUpdate already initialized');
    return window.gameUpdateInstance;
  }
  
  const instance = new GameUpdate(gameState);
  
  // Store in window for access from main.js
  if (typeof window !== 'undefined') {
    window.gameUpdateInstance = instance;
  }
  
  console.log('✅ [GAME UPDATE] GameUpdate initialized');
  return instance;
}

/**
 * Get the game update instance
 * @returns {GameUpdate|null} The game update instance
 */
function getGameUpdate() {
  if (typeof window !== 'undefined' && window.gameUpdateInstance) {
    return window.gameUpdateInstance;
  }
  return null;
}

// Export for use in main.js and other modules
if (typeof window !== 'undefined') {
  window.GameUpdate = GameUpdate;
  window.initGameUpdate = initGameUpdate;
  window.getGameUpdate = getGameUpdate;
}

console.log('✅ [GAME UPDATE] GameUpdate module ready');


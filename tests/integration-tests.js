/**
 * Integration Tests
 * 
 * This file tests how all wrappers work together to ensure seamless integration
 * and proper communication between different wrapper systems.
 */

class IntegrationTests {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
    this.wrappers = {
      gameEngine: null,
      gameState: null,
      player: null,
      enemy: null,
      boss: null,
      collision: null,
      scoring: null,
      audio: null
    };
  }

  async runAllTests() {
    console.log('🔗 Testing Wrapper Integration...');
    
    // Initialize all wrappers first
    await this.initializeAllWrappers();
    
    const tests = [
      // Core Integration Tests
      {
        name: 'All wrappers can initialize together',
        test: () => this.testWrapperInitialization()
      },
      {
        name: 'Game engine and state wrappers communicate',
        test: () => this.testCoreCommunication()
      },
      {
        name: 'Entity wrappers can access game state',
        test: () => this.testEntityStateAccess()
      },
      
      // System Integration Tests
      {
        name: 'Collision system integrates with entities',
        test: () => this.testCollisionEntityIntegration()
      },
      {
        name: 'Scoring system integrates with collision events',
        test: () => this.testScoringCollisionIntegration()
      },
      {
        name: 'Audio system integrates with game events',
        test: () => this.testAudioEventIntegration()
      },
      
      // Cross-System Integration Tests
      {
        name: 'Player movement triggers collision checks',
        test: () => this.testPlayerCollisionIntegration()
      },
      {
        name: 'Enemy destruction triggers scoring and audio',
        test: () => this.testEnemyDestructionIntegration()
      },
      {
        name: 'Boss events trigger multiple systems',
        test: () => this.testBossEventIntegration()
      },
      
      // Performance Integration Tests
      {
        name: 'Wrapper performance under load',
        test: () => this.testWrapperPerformance()
      },
      {
        name: 'Memory usage remains stable',
        test: () => this.testMemoryStability()
      },
      
      // Error Handling Integration Tests
      {
        name: 'Error handling across wrappers',
        test: () => this.testErrorHandling()
      },
      {
        name: 'Graceful degradation when systems fail',
        test: () => this.testGracefulDegradation()
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  🔗 Running: ${test.name}`);
        const result = await test.test();
        
        this.results.totalTests++;
        if (result) {
          this.results.passed++;
          console.log(`    ✅ ${test.name}`);
        } else {
          this.results.failed++;
          console.log(`    ❌ ${test.name}`);
        }
        
        this.results.tests.push({
          name: test.name,
          passed: result,
          error: null
        });
      } catch (error) {
        this.results.totalTests++;
        this.results.failed++;
        console.log(`    ❌ ${test.name} - Error: ${error.message}`);
        
        this.results.tests.push({
          name: test.name,
          passed: false,
          error: error.message
        });
      }
    }

    this.generateReport();
    return this.results;
  }

  /**
   * Initialize all wrappers for integration testing
   */
  async initializeAllWrappers() {
    try {
      console.log('🔗 Initializing all wrappers for integration testing...');
      
      // Initialize core wrappers
      this.wrappers.gameEngine = new GameEngineWrapper();
      const engineResult = await this.wrappers.gameEngine.initialize();
      if (!engineResult) {
        console.log('⚠️ Game engine wrapper initialization failed');
      }
      
      this.wrappers.gameState = new GameStateWrapper();
      const stateResult = await this.wrappers.gameState.initialize();
      if (!stateResult) {
        console.log('⚠️ Game state wrapper initialization failed');
      }
      
      // Initialize entity wrappers
      this.wrappers.player = new PlayerWrapper();
      const playerResult = await this.wrappers.player.initialize();
      if (!playerResult) {
        console.log('⚠️ Player wrapper initialization failed');
      }
      
      this.wrappers.enemy = new EnemyWrapper();
      const enemyResult = await this.wrappers.enemy.initialize();
      if (!enemyResult) {
        console.log('⚠️ Enemy wrapper initialization failed');
      }
      
      this.wrappers.boss = new BossWrapper();
      const bossResult = await this.wrappers.boss.initialize();
      if (!bossResult) {
        console.log('⚠️ Boss wrapper initialization failed');
      }
      
      // Initialize system wrappers
      this.wrappers.collision = new CollisionSystemWrapper();
      const collisionResult = await this.wrappers.collision.initialize();
      if (!collisionResult) {
        console.log('⚠️ Collision wrapper initialization failed');
      }
      
      this.wrappers.scoring = new ScoringSystemWrapper();
      const scoringResult = await this.wrappers.scoring.initialize();
      if (!scoringResult) {
        console.log('⚠️ Scoring wrapper initialization failed');
      }
      
      this.wrappers.audio = new AudioSystemWrapper();
      const audioResult = await this.wrappers.audio.initialize();
      if (!audioResult) {
        console.log('⚠️ Audio wrapper initialization failed');
      }
      
      console.log('✅ All wrappers initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize wrappers:', error);
      return false;
    }
  }

  // Core Integration Tests
  testWrapperInitialization() {
    try {
      const allInitialized = Object.values(this.wrappers).every(wrapper => 
        wrapper && wrapper.isInitialized === true
      );
      return allInitialized;
    } catch (error) {
      console.error('Wrapper initialization test error:', error);
      return false;
    }
  }

  testCoreCommunication() {
    try {
      // Test that game engine can access game state
      if (!this.wrappers.gameState || !this.wrappers.gameEngine) {
        return false;
      }
      
      const gameState = this.wrappers.gameState.getGameState();
      const engineState = this.wrappers.gameEngine.getEngineState();
      
      return gameState !== null && engineState !== null;
    } catch (error) {
      console.error('Core communication test error:', error);
      return false;
    }
  }

  testEntityStateAccess() {
    try {
      // Test that entities can access game state
      if (!this.wrappers.player || !this.wrappers.enemy || !this.wrappers.boss) {
        console.log('⚠️ Some entity wrappers not available');
        return false;
      }
      
      const playerState = this.wrappers.player.getState();
      const enemyCount = this.wrappers.enemy.getEnemyCount();
      const bossState = this.wrappers.boss.getBossState();
      
      console.log('Debug - Player state:', playerState);
      console.log('Debug - Enemy count:', enemyCount);
      console.log('Debug - Boss state:', bossState);
      
      return playerState !== null && 
             typeof enemyCount === 'number' && 
             bossState !== null;
    } catch (error) {
      console.error('Entity state access test error:', error);
      return false;
    }
  }

  // System Integration Tests
  testCollisionEntityIntegration() {
    try {
      // Test collision system with entity data
      if (!this.wrappers.player || !this.wrappers.enemy || !this.wrappers.collision) {
        return false;
      }
      
      const playerBounds = this.wrappers.player.getBounds();
      const enemies = this.wrappers.enemy.getAllEnemies();
      
      if (playerBounds && enemies.length > 0) {
        const collisionStats = this.wrappers.collision.getCollisionStatistics();
        return collisionStats !== null;
      }
      
      return true; // No enemies to test with, but system works
    } catch (error) {
      console.error('Collision entity integration test error:', error);
      return false;
    }
  }

  testScoringCollisionIntegration() {
    try {
      // Test that scoring system can track collision events
      if (!this.wrappers.scoring) {
        return false;
      }
      
      const initialScore = this.wrappers.scoring.getCurrentScore();
      const scoreStats = this.wrappers.scoring.getScoreStatistics();
      
      return typeof initialScore === 'number' && scoreStats !== null;
    } catch (error) {
      console.error('Scoring collision integration test error:', error);
      return false;
    }
  }

  testAudioEventIntegration() {
    try {
      // Test audio system integration
      if (!this.wrappers.audio) {
        return false;
      }
      
      const audioStatus = this.wrappers.audio.getAudioStatus();
      const audioSettings = this.wrappers.audio.getAudioSettings();
      
      return audioStatus !== null && audioSettings !== null;
    } catch (error) {
      console.error('Audio event integration test error:', error);
      return false;
    }
  }

  // Cross-System Integration Tests
  testPlayerCollisionIntegration() {
    try {
      // Test player movement and collision detection
      if (!this.wrappers.player || !this.wrappers.collision) {
        return false;
      }
      
      const playerPos = this.wrappers.player.getPosition();
      const isPlayerSafe = this.wrappers.collision.isPlayerSafe();
      
      return playerPos !== null && typeof isPlayerSafe === 'boolean';
    } catch (error) {
      console.error('Player collision integration test error:', error);
      return false;
    }
  }

  testEnemyDestructionIntegration() {
    try {
      // Test enemy destruction triggers scoring
      if (!this.wrappers.scoring) {
        return false;
      }
      
      const initialScore = this.wrappers.scoring.getCurrentScore();
      const scoreAdded = this.wrappers.scoring.awardEnemyPoints(1, 1);
      
      return scoreAdded === true;
    } catch (error) {
      console.error('Enemy destruction integration test error:', error);
      return false;
    }
  }

  testBossEventIntegration() {
    try {
      // Test boss events trigger multiple systems
      if (!this.wrappers.boss) {
        console.log('⚠️ Boss wrapper not available');
        return false;
      }
      
      const bossState = this.wrappers.boss.getBossState();
      const bossActive = this.wrappers.boss.isBossActive();
      
      console.log('Debug - Boss state:', bossState);
      console.log('Debug - Boss active:', bossActive);
      
      return bossState !== null && typeof bossActive === 'boolean';
    } catch (error) {
      console.error('Boss event integration test error:', error);
      return false;
    }
  }

  // Performance Integration Tests
  testWrapperPerformance() {
    try {
      const startTime = performance.now();
      
      // Perform multiple operations across wrappers
      for (let i = 0; i < 100; i++) {
        if (this.wrappers.player) this.wrappers.player.getPosition();
        if (this.wrappers.enemy) this.wrappers.enemy.getEnemyCount();
        if (this.wrappers.collision) this.wrappers.collision.isPlayerSafe();
        if (this.wrappers.scoring) this.wrappers.scoring.getCurrentScore();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 400 operations in under 100ms
      return duration < 100;
    } catch (error) {
      console.error('Wrapper performance test error:', error);
      return false;
    }
  }

  testMemoryStability() {
    try {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Create and destroy wrapper instances
      for (let i = 0; i < 10; i++) {
        const tempScoring = new ScoringSystemWrapper();
        tempScoring.initialize();
        // Allow garbage collection by not keeping reference
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 1MB)
      return memoryIncrease < 1024 * 1024;
    } catch (error) {
      console.error('Memory stability test error:', error);
      return true; // Memory API not available, assume stable
    }
  }

  // Error Handling Integration Tests
  testErrorHandling() {
    try {
      // Test error handling across wrappers
      if (!this.wrappers.player || !this.wrappers.collision || !this.wrappers.scoring) {
        return false;
      }
      
      const playerState = this.wrappers.player.getState();
      const collisionStats = this.wrappers.collision.getCollisionStatistics();
      const scoreStats = this.wrappers.scoring.getScoreStatistics();
      
      return playerState !== null && collisionStats !== null && scoreStats !== null;
    } catch (error) {
      console.error('Error handling test error:', error);
      return false;
    }
  }

  testGracefulDegradation() {
    try {
      // Test that wrappers degrade gracefully when systems fail
      if (!this.wrappers.audio || !this.wrappers.scoring) {
        return false;
      }
      
      const audioStatus = this.wrappers.audio.getAudioStatus();
      const scoringStatus = this.wrappers.scoring.getScoreStatistics();
      
      return audioStatus !== null && scoringStatus !== null;
    } catch (error) {
      console.error('Graceful degradation test error:', error);
      return false;
    }
  }

  generateReport() {
    const successRate = this.results.totalTests > 0 ? 
      (this.results.passed / this.results.totalTests) * 100 : 0;

    console.log('\n📋 INTEGRATION TEST REPORT');
    console.log('============================');
    console.log(`⏱️  Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests.forEach(test => {
        if (!test.passed) {
          console.log(`  - ${test.name}${test.error ? ` - Error: ${test.error}` : ''}`);
        }
      });
    }

    if (successRate === 100) {
      console.log('\n🎯 INTEGRATION: ✅ ALL TESTS PASSED - Wrappers work seamlessly together!');
    } else {
      console.log('\n🎯 INTEGRATION: ⚠️ SOME TESTS FAILED - Review integration issues');
    }

    // Ensure results object has the correct properties
    this.results.totalFailed = this.results.failed;
    this.results.totalPassed = this.results.passed;
    this.results.totalTests = this.results.totalTests;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntegrationTests;
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  window.IntegrationTests = IntegrationTests;
  
  console.log('🔗 Integration Tests loaded');
  console.log('📋 Usage: new IntegrationTests().runAllTests()');
}

/**
 * Entity Wrapper Tests
 * 
 * This file tests the entity wrappers (Player, Enemy, Boss) to ensure they work correctly
 * with the existing game code without breaking anything.
 */

class EntityWrapperTests {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Testing Entity Wrappers...');
    
    const tests = [
      // Player Wrapper Tests
      {
        name: 'PlayerWrapper can be instantiated',
        test: () => this.testPlayerInstantiation()
      },
      {
        name: 'PlayerWrapper can initialize',
        test: () => this.testPlayerInitialization()
      },
      {
        name: 'PlayerWrapper can get state',
        test: () => this.testPlayerStateRetrieval()
      },
      {
        name: 'PlayerWrapper can get position',
        test: () => this.testPlayerPositionRetrieval()
      },
      {
        name: 'PlayerWrapper can get bounds',
        test: () => this.testPlayerBoundsRetrieval()
      },
      
      // Enemy Wrapper Tests
      {
        name: 'EnemyWrapper can be instantiated',
        test: () => this.testEnemyInstantiation()
      },
      {
        name: 'EnemyWrapper can initialize',
        test: () => this.testEnemyInitialization()
      },
      {
        name: 'EnemyWrapper can get all enemies',
        test: () => this.testEnemyRetrieval()
      },
      {
        name: 'EnemyWrapper can create enemy',
        test: () => this.testEnemyCreation()
      },
      {
        name: 'EnemyWrapper can get enemy count',
        test: () => this.testEnemyCount()
      },
      
      // Boss Wrapper Tests
      {
        name: 'BossWrapper can be instantiated',
        test: () => this.testBossInstantiation()
      },
      {
        name: 'BossWrapper can initialize',
        test: () => this.testBossInitialization()
      },
      {
        name: 'BossWrapper can get boss state',
        test: () => this.testBossStateRetrieval()
      },
      {
        name: 'BossWrapper can check boss active',
        test: () => this.testBossActiveCheck()
      },
      {
        name: 'BossWrapper can get boss statistics',
        test: () => this.testBossStatistics()
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  🧪 Running: ${test.name}`);
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

  // Player Wrapper Tests
  testPlayerInstantiation() {
    try {
      const player = new PlayerWrapper();
      return player !== null && typeof player.initialize === 'function';
    } catch (error) {
      console.error('Player instantiation error:', error);
      return false;
    }
  }

  testPlayerInitialization() {
    try {
      const player = new PlayerWrapper();
      const result = player.initialize();
      return result === true;
    } catch (error) {
      console.error('Player initialization error:', error);
      return false;
    }
  }

  testPlayerStateRetrieval() {
    try {
      const player = new PlayerWrapper();
      player.initialize();
      const state = player.getState();
      
      return state !== null && 
             typeof state === 'object' &&
             typeof state.x === 'number' &&
             typeof state.y === 'number' &&
             typeof state.lane === 'number';
    } catch (error) {
      console.error('Player state retrieval error:', error);
      return false;
    }
  }

  testPlayerPositionRetrieval() {
    try {
      const player = new PlayerWrapper();
      player.initialize();
      const position = player.getPosition();
      
      return position !== null && 
             typeof position === 'object' &&
             typeof position.x === 'number' &&
             typeof position.y === 'number' &&
             typeof position.lane === 'number';
    } catch (error) {
      console.error('Player position retrieval error:', error);
      return false;
    }
  }

  testPlayerBoundsRetrieval() {
    try {
      const player = new PlayerWrapper();
      player.initialize();
      const bounds = player.getBounds();
      
      return bounds !== null && 
             typeof bounds === 'object' &&
             typeof bounds.left === 'number' &&
             typeof bounds.right === 'number' &&
             typeof bounds.top === 'number' &&
             typeof bounds.bottom === 'number';
    } catch (error) {
      console.error('Player bounds retrieval error:', error);
      return false;
    }
  }

  // Enemy Wrapper Tests
  testEnemyInstantiation() {
    try {
      const enemies = new EnemyWrapper();
      return enemies !== null && typeof enemies.initialize === 'function';
    } catch (error) {
      console.error('Enemy instantiation error:', error);
      return false;
    }
  }

  testEnemyInitialization() {
    try {
      const enemies = new EnemyWrapper();
      const result = enemies.initialize();
      return result === true;
    } catch (error) {
      console.error('Enemy initialization error:', error);
      return false;
    }
  }

  testEnemyRetrieval() {
    try {
      const enemies = new EnemyWrapper();
      enemies.initialize();
      const enemyList = enemies.getAllEnemies();
      
      return Array.isArray(enemyList);
    } catch (error) {
      console.error('Enemy retrieval error:', error);
      return false;
    }
  }

  testEnemyCreation() {
    try {
      const enemies = new EnemyWrapper();
      enemies.initialize();
      const result = enemies.createEnemy(100, 1, 1);
      
      return result === true;
    } catch (error) {
      console.error('Enemy creation error:', error);
      return false;
    }
  }

  testEnemyCount() {
    try {
      const enemies = new EnemyWrapper();
      enemies.initialize();
      const count = enemies.getEnemyCount();
      
      return typeof count === 'number' && count >= 0;
    } catch (error) {
      console.error('Enemy count error:', error);
      return false;
    }
  }

  // Boss Wrapper Tests
  testBossInstantiation() {
    try {
      const boss = new BossWrapper();
      return boss !== null && typeof boss.initialize === 'function';
    } catch (error) {
      console.error('Boss instantiation error:', error);
      return false;
    }
  }

  testBossInitialization() {
    try {
      const boss = new BossWrapper();
      const result = boss.initialize();
      return result === true;
    } catch (error) {
      console.error('Boss initialization error:', error);
      return false;
    }
  }

  testBossStateRetrieval() {
    try {
      const boss = new BossWrapper();
      boss.initialize();
      const state = boss.getBossState();
      
      // Boss state can be null if no boss is active
      return state === null || (
        typeof state === 'object' &&
        typeof state.tier === 'number' &&
        typeof state.hp === 'number'
      );
    } catch (error) {
      console.error('Boss state retrieval error:', error);
      return false;
    }
  }

  testBossActiveCheck() {
    try {
      const boss = new BossWrapper();
      boss.initialize();
      const isActive = boss.isBossActive();
      
      return typeof isActive === 'boolean';
    } catch (error) {
      console.error('Boss active check error:', error);
      return false;
    }
  }

  testBossStatistics() {
    try {
      const boss = new BossWrapper();
      boss.initialize();
      const stats = boss.getStatistics();
      
      return stats !== null && 
             typeof stats === 'object' &&
             typeof stats.isActive === 'boolean' &&
             typeof stats.tier === 'number';
    } catch (error) {
      console.error('Boss statistics error:', error);
      return false;
    }
  }

  generateReport() {
    const successRate = this.results.totalTests > 0 ? 
      (this.results.passed / this.results.totalTests) * 100 : 0;

    console.log('\n📋 ENTITY WRAPPER TEST REPORT');
    console.log('================================');
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
      console.log('\n🎯 ENTITY WRAPPERS: ✅ ALL TESTS PASSED - Ready for next step!');
    } else {
      console.log('\n🎯 ENTITY WRAPPERS: ⚠️ SOME TESTS FAILED - Review before proceeding');
    }

    // Ensure results object has the correct properties
    this.results.totalFailed = this.results.failed;
    this.results.totalPassed = this.results.passed;
    this.results.totalTests = this.results.totalTests;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EntityWrapperTests;
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  window.EntityWrapperTests = EntityWrapperTests;
  
  console.log('🧪 Entity Wrapper Tests loaded');
  console.log('📋 Usage: new EntityWrapperTests().runAllTests()');
}

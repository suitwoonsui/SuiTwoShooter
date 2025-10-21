/**
 * Core Wrapper Tests
 * 
 * This file tests the core wrappers to ensure they work correctly
 * with the existing game code without breaking anything.
 */

class CoreWrapperTests {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Testing Core Wrappers...');
    
    const tests = [
      {
        name: 'GameEngineWrapper can be instantiated',
        test: () => this.testGameEngineInstantiation()
      },
      {
        name: 'GameStateWrapper can be instantiated',
        test: () => this.testGameStateInstantiation()
      },
      {
        name: 'GameEngineWrapper can initialize',
        test: () => this.testGameEngineInitialization()
      },
      {
        name: 'GameStateWrapper can get state',
        test: () => this.testGameStateRetrieval()
      },
      {
        name: 'GameStateWrapper can get player state',
        test: () => this.testPlayerStateRetrieval()
      },
      {
        name: 'GameStateWrapper can get statistics',
        test: () => this.testStatisticsRetrieval()
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

  testGameEngineInstantiation() {
    try {
      const engine = new GameEngineWrapper();
      return engine !== null && typeof engine.initialize === 'function';
    } catch (error) {
      console.error('GameEngine instantiation error:', error);
      return false;
    }
  }

  testGameStateInstantiation() {
    try {
      const state = new GameStateWrapper();
      return state !== null && typeof state.getState === 'function';
    } catch (error) {
      console.error('GameState instantiation error:', error);
      return false;
    }
  }

  async testGameEngineInitialization() {
    try {
      const engine = new GameEngineWrapper();
      const result = await engine.initialize();
      return result === true;
    } catch (error) {
      console.error('GameEngine initialization error:', error);
      return false;
    }
  }

  testGameStateRetrieval() {
    try {
      const state = new GameStateWrapper();
      const gameState = state.getState();
      
      // Check that we get a valid state object
      return gameState !== null && 
             typeof gameState === 'object' &&
             typeof gameState.score === 'number' &&
             typeof gameState.lives === 'number' &&
             typeof gameState.coins === 'number';
    } catch (error) {
      console.error('GameState retrieval error:', error);
      return false;
    }
  }

  testPlayerStateRetrieval() {
    try {
      const state = new GameStateWrapper();
      const playerState = state.getPlayerState();
      
      // Check that we get a valid player state object
      return playerState !== null && 
             typeof playerState === 'object' &&
             typeof playerState.x === 'number' &&
             typeof playerState.y === 'number' &&
             typeof playerState.lane === 'number';
    } catch (error) {
      console.error('PlayerState retrieval error:', error);
      return false;
    }
  }

  testStatisticsRetrieval() {
    try {
      const state = new GameStateWrapper();
      const stats = state.getStatistics();
      
      // Check that we get valid statistics
      return stats !== null && 
             typeof stats === 'object' &&
             typeof stats.score === 'number' &&
             typeof stats.lives === 'number' &&
             typeof stats.coins === 'number' &&
             typeof stats.currentTier === 'number';
    } catch (error) {
      console.error('Statistics retrieval error:', error);
      return false;
    }
  }

  generateReport() {
    const successRate = this.results.totalTests > 0 ? 
      (this.results.passed / this.results.totalTests) * 100 : 0;

    console.log('\n📋 CORE WRAPPER TEST REPORT');
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
      console.log('\n🎯 CORE WRAPPERS: ✅ ALL TESTS PASSED - Ready for next step!');
    } else {
      console.log('\n🎯 CORE WRAPPERS: ⚠️ SOME TESTS FAILED - Review before proceeding');
    }

    // Ensure results object has the correct properties
    this.results.totalFailed = this.results.failed;
    this.results.totalPassed = this.results.passed;
    this.results.totalTests = this.results.totalTests;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CoreWrapperTests;
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  window.CoreWrapperTests = CoreWrapperTests;
  
  console.log('🧪 Core Wrapper Tests loaded');
  console.log('📋 Usage: new CoreWrapperTests().runAllTests()');
}

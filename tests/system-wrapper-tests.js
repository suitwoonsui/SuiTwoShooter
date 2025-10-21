/**
 * System Wrapper Tests
 * 
 * This file tests the system wrappers (Collision, Scoring, Audio) to ensure they work correctly
 * with the existing game code without breaking anything.
 */

class SystemWrapperTests {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Testing System Wrappers...');
    
    const tests = [
      // Collision System Tests
      {
        name: 'CollisionSystemWrapper can be instantiated',
        test: () => this.testCollisionInstantiation()
      },
      {
        name: 'CollisionSystemWrapper can initialize',
        test: () => this.testCollisionInitialization()
      },
      {
        name: 'CollisionSystemWrapper can check bounds intersection',
        test: () => this.testBoundsIntersection()
      },
      {
        name: 'CollisionSystemWrapper can get collision statistics',
        test: () => this.testCollisionStatistics()
      },
      {
        name: 'CollisionSystemWrapper can check player safety',
        test: () => this.testPlayerSafety()
      },
      
      // Scoring System Tests
      {
        name: 'ScoringSystemWrapper can be instantiated',
        test: () => this.testScoringInstantiation()
      },
      {
        name: 'ScoringSystemWrapper can initialize',
        test: () => this.testScoringInitialization()
      },
      {
        name: 'ScoringSystemWrapper can get current score',
        test: () => this.testGetCurrentScore()
      },
      {
        name: 'ScoringSystemWrapper can add score',
        test: () => this.testAddScore()
      },
      {
        name: 'ScoringSystemWrapper can get score statistics',
        test: () => this.testScoringStatistics()
      },
      
      // Audio System Tests
      {
        name: 'AudioSystemWrapper can be instantiated',
        test: () => this.testAudioInstantiation()
      },
      {
        name: 'AudioSystemWrapper can initialize',
        test: () => this.testAudioInitialization()
      },
      {
        name: 'AudioSystemWrapper can get audio settings',
        test: () => this.testGetAudioSettings()
      },
      {
        name: 'AudioSystemWrapper can set master volume',
        test: () => this.testSetMasterVolume()
      },
      {
        name: 'AudioSystemWrapper can get audio status',
        test: () => this.testGetAudioStatus()
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

  // Collision System Tests
  testCollisionInstantiation() {
    try {
      const collision = new CollisionSystemWrapper();
      return collision !== null && typeof collision.initialize === 'function';
    } catch (error) {
      console.error('Collision instantiation error:', error);
      return false;
    }
  }

  testCollisionInitialization() {
    try {
      const collision = new CollisionSystemWrapper();
      const result = collision.initialize();
      return result === true;
    } catch (error) {
      console.error('Collision initialization error:', error);
      return false;
    }
  }

  testBoundsIntersection() {
    try {
      const collision = new CollisionSystemWrapper();
      collision.initialize();
      
      const bounds1 = { left: 0, right: 10, top: 0, bottom: 10 };
      const bounds2 = { left: 5, right: 15, top: 5, bottom: 15 };
      const bounds3 = { left: 20, right: 30, top: 20, bottom: 30 };
      
      const intersect1 = collision.boundsIntersect(bounds1, bounds2);
      const intersect2 = collision.boundsIntersect(bounds1, bounds3);
      
      return intersect1 === true && intersect2 === false;
    } catch (error) {
      console.error('Bounds intersection test error:', error);
      return false;
    }
  }

  testCollisionStatistics() {
    try {
      const collision = new CollisionSystemWrapper();
      collision.initialize();
      const stats = collision.getCollisionStatistics();
      
      return stats !== null && 
             typeof stats === 'object' &&
             typeof stats.totalCollisions === 'number';
    } catch (error) {
      console.error('Collision statistics error:', error);
      return false;
    }
  }

  testPlayerSafety() {
    try {
      const collision = new CollisionSystemWrapper();
      collision.initialize();
      const isSafe = collision.isPlayerSafe();
      
      return typeof isSafe === 'boolean';
    } catch (error) {
      console.error('Player safety test error:', error);
      return false;
    }
  }

  // Scoring System Tests
  testScoringInstantiation() {
    try {
      const scoring = new ScoringSystemWrapper();
      return scoring !== null && typeof scoring.initialize === 'function';
    } catch (error) {
      console.error('Scoring instantiation error:', error);
      return false;
    }
  }

  testScoringInitialization() {
    try {
      const scoring = new ScoringSystemWrapper();
      const result = scoring.initialize();
      return result === true;
    } catch (error) {
      console.error('Scoring initialization error:', error);
      return false;
    }
  }

  testGetCurrentScore() {
    try {
      const scoring = new ScoringSystemWrapper();
      scoring.initialize();
      const score = scoring.getCurrentScore();
      
      return typeof score === 'number' && score >= 0;
    } catch (error) {
      console.error('Get current score error:', error);
      return false;
    }
  }

  testAddScore() {
    try {
      const scoring = new ScoringSystemWrapper();
      scoring.initialize();
      const initialScore = scoring.getCurrentScore();
      const result = scoring.addScore(100, 'test');
      const newScore = scoring.getCurrentScore();
      
      return result === true && newScore >= initialScore;
    } catch (error) {
      console.error('Add score error:', error);
      return false;
    }
  }

  testScoringStatistics() {
    try {
      const scoring = new ScoringSystemWrapper();
      scoring.initialize();
      const stats = scoring.getScoreStatistics();
      
      return stats !== null && 
             typeof stats === 'object' &&
             typeof stats.currentScore === 'number';
    } catch (error) {
      console.error('Scoring statistics error:', error);
      return false;
    }
  }

  // Audio System Tests
  testAudioInstantiation() {
    try {
      const audio = new AudioSystemWrapper();
      return audio !== null && typeof audio.initialize === 'function';
    } catch (error) {
      console.error('Audio instantiation error:', error);
      return false;
    }
  }

  testAudioInitialization() {
    try {
      const audio = new AudioSystemWrapper();
      const result = audio.initialize();
      return result === true;
    } catch (error) {
      console.error('Audio initialization error:', error);
      return false;
    }
  }

  testGetAudioSettings() {
    try {
      const audio = new AudioSystemWrapper();
      audio.initialize();
      const settings = audio.getAudioSettings();
      
      return settings !== null && 
             typeof settings === 'object' &&
             typeof settings.masterVolume === 'number';
    } catch (error) {
      console.error('Get audio settings error:', error);
      return false;
    }
  }

  testSetMasterVolume() {
    try {
      const audio = new AudioSystemWrapper();
      audio.initialize();
      const result = audio.setMasterVolume(0.5);
      
      return result === true;
    } catch (error) {
      console.error('Set master volume error:', error);
      return false;
    }
  }

  testGetAudioStatus() {
    try {
      const audio = new AudioSystemWrapper();
      audio.initialize();
      const status = audio.getAudioStatus();
      
      return status !== null && 
             typeof status === 'object' &&
             typeof status.isInitialized === 'boolean';
    } catch (error) {
      console.error('Get audio status error:', error);
      return false;
    }
  }

  generateReport() {
    const successRate = this.results.totalTests > 0 ? 
      (this.results.passed / this.results.totalTests) * 100 : 0;

    console.log('\n📋 SYSTEM WRAPPER TEST REPORT');
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
      console.log('\n🎯 SYSTEM WRAPPERS: ✅ ALL TESTS PASSED - Ready for next step!');
    } else {
      console.log('\n🎯 SYSTEM WRAPPERS: ⚠️ SOME TESTS FAILED - Review before proceeding');
    }

    // Ensure results object has the correct properties
    this.results.totalFailed = this.results.failed;
    this.results.totalPassed = this.results.passed;
    this.results.totalTests = this.results.totalTests;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SystemWrapperTests;
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  window.SystemWrapperTests = SystemWrapperTests;
  
  console.log('🧪 System Wrapper Tests loaded');
  console.log('📋 Usage: new SystemWrapperTests().runAllTests()');
}

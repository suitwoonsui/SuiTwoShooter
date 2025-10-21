// Performance Monitoring and Baseline Recording
// This script monitors game performance before and during migration

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameRate: 0,
      frameTimes: [],
      memoryUsage: 0,
      collisionChecks: 0,
      renderCalls: 0,
      gameStartTime: 0,
      loadTime: 0
    };
    
    this.isMonitoring = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.startTime = 0;
  }
  
  startMonitoring() {
    console.log('📊 Starting performance monitoring...');
    this.isMonitoring = true;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.frameCount = 0;
    
    // Monitor frame rate
    this.monitorFrameRate();
    
    // Monitor memory usage
    this.monitorMemory();
    
    // Hook into game functions to count operations
    this.hookGameFunctions();
  }
  
  stopMonitoring() {
    console.log('📊 Stopping performance monitoring...');
    this.isMonitoring = false;
    
    // Calculate final metrics
    const duration = performance.now() - this.startTime;
    const avgFrameRate = this.frameCount / (duration / 1000);
    
    this.metrics.frameRate = avgFrameRate;
    this.metrics.loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    
    console.log('📊 Performance monitoring complete');
    console.log('Final metrics:', this.metrics);
    
    return this.metrics;
  }
  
  monitorFrameRate() {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift(); // Keep only last 60 frames
    }
    
    this.frameCount++;
    this.lastFrameTime = now;
    
    // Calculate current FPS
    if (this.frameTimes.length > 0) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.metrics.frameRate = 1000 / avgFrameTime;
    }
    
    // Continue monitoring
    requestAnimationFrame(() => this.monitorFrameRate());
  }
  
  monitorMemory() {
    if (!this.isMonitoring) return;
    
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
    }
    
    // Check memory every second
    setTimeout(() => this.monitorMemory(), 1000);
  }
  
  hookGameFunctions() {
    // Hook into collision detection
    const originalCheckObstacleCollision = window.checkObstacleCollision;
    if (originalCheckObstacleCollision) {
      window.checkObstacleCollision = (...args) => {
        this.metrics.collisionChecks++;
        return originalCheckObstacleCollision.apply(this, args);
      };
    }
    
    const originalCheckEnemyBulletCollision = window.checkEnemyBulletCollision;
    if (originalCheckEnemyBulletCollision) {
      window.checkEnemyBulletCollision = (...args) => {
        this.metrics.collisionChecks++;
        return originalCheckEnemyBulletCollision.apply(this, args);
      };
    }
    
    // Hook into rendering
    const originalDraw = window.draw;
    if (originalDraw) {
      window.draw = (...args) => {
        this.metrics.renderCalls++;
        return originalDraw.apply(this, args);
      };
    }
  }
  
  getCurrentMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      isMonitoring: this.isMonitoring
    };
  }
  
  saveBaseline() {
    const baseline = this.getCurrentMetrics();
    localStorage.setItem('performanceBaseline', JSON.stringify(baseline));
    console.log('📊 Performance baseline saved:', baseline);
    return baseline;
  }
  
  compareWithBaseline() {
    const baseline = JSON.parse(localStorage.getItem('performanceBaseline') || '{}');
    const current = this.getCurrentMetrics();
    
    const comparison = {
      frameRate: {
        baseline: baseline.frameRate || 0,
        current: current.frameRate,
        change: current.frameRate - (baseline.frameRate || 0),
        percentChange: baseline.frameRate ? ((current.frameRate - baseline.frameRate) / baseline.frameRate) * 100 : 0
      },
      memoryUsage: {
        baseline: baseline.memoryUsage || 0,
        current: current.memoryUsage,
        change: current.memoryUsage - (baseline.memoryUsage || 0),
        percentChange: baseline.memoryUsage ? ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100 : 0
      },
      collisionChecks: {
        baseline: baseline.collisionChecks || 0,
        current: current.collisionChecks,
        change: current.collisionChecks - (baseline.collisionChecks || 0)
      },
      renderCalls: {
        baseline: baseline.renderCalls || 0,
        current: current.renderCalls,
        change: current.renderCalls - (baseline.renderCalls || 0)
      }
    };
    
    console.log('📊 Performance comparison:', comparison);
    return comparison;
  }
}

// Game-specific performance tests
class GamePerformanceTests {
  constructor() {
    this.monitor = new PerformanceMonitor();
  }
  
  async runPerformanceTests() {
    console.log('🚀 Running game performance tests...');
    
    const tests = [
      {
        name: 'Game Load Performance',
        test: () => this.testGameLoad()
      },
      {
        name: 'Frame Rate Stability',
        test: () => this.testFrameRate()
      },
      {
        name: 'Memory Usage',
        test: () => this.testMemoryUsage()
      },
      {
        name: 'Collision Detection Performance',
        test: () => this.testCollisionPerformance()
      },
      {
        name: 'Rendering Performance',
        test: () => this.testRenderingPerformance()
      }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        console.log(`🧪 Running ${test.name}...`);
        const result = await test.test();
        results.push({ name: test.name, passed: result.passed, metrics: result.metrics });
        console.log(`${result.passed ? '✅' : '❌'} ${test.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error);
        results.push({ name: test.name, passed: false, error: error.message });
      }
    }
    
    return results;
  }
  
  async testGameLoad() {
    const startTime = performance.now();
    
    // Simulate game initialization
    if (typeof init === 'function') {
      init();
    }
    
    const loadTime = performance.now() - startTime;
    
    return {
      passed: loadTime < 1000, // Should load in under 1 second
      metrics: { loadTime }
    };
  }
  
  async testFrameRate() {
    this.monitor.startMonitoring();
    
    // Run game for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const metrics = this.monitor.stopMonitoring();
    
    return {
      passed: metrics.frameRate >= 55, // Should maintain 55+ FPS
      metrics: { frameRate: metrics.frameRate }
    };
  }
  
  async testMemoryUsage() {
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    // Run game for 10 seconds
    this.monitor.startMonitoring();
    await new Promise(resolve => setTimeout(resolve, 10000));
    const metrics = this.monitor.stopMonitoring();
    
    const memoryIncrease = metrics.memoryUsage - initialMemory;
    const memoryIncreasePercent = initialMemory ? (memoryIncrease / initialMemory) * 100 : 0;
    
    return {
      passed: memoryIncreasePercent < 50, // Memory shouldn't increase by more than 50%
      metrics: { 
        initialMemory, 
        finalMemory: metrics.memoryUsage, 
        increase: memoryIncrease,
        increasePercent: memoryIncreasePercent
      }
    };
  }
  
  async testCollisionPerformance() {
    // Create many objects to test collision performance
    const initialCollisionChecks = this.monitor.metrics.collisionChecks;
    
    // Add many enemies and bullets
    for (let i = 0; i < 50; i++) {
      tiles.push({
        x: Math.random() * game.width,
        obstacles: [{
          lane: Math.floor(Math.random() * 3),
          type: 1,
          hp: 1
        }]
      });
      
      game.bullets.push({
        x: Math.random() * game.width,
        y: Math.random() * game.height,
        speed: 5,
        level: 1
      });
    }
    
    // Run collision detection
    this.monitor.startMonitoring();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const metrics = this.monitor.stopMonitoring();
    
    const collisionChecksPerSecond = metrics.collisionChecks - initialCollisionChecks;
    
    return {
      passed: collisionChecksPerSecond < 10000, // Should handle collisions efficiently
      metrics: { collisionChecksPerSecond }
    };
  }
  
  async testRenderingPerformance() {
    const initialRenderCalls = this.monitor.metrics.renderCalls;
    
    // Run rendering for 1 second
    this.monitor.startMonitoring();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const metrics = this.monitor.stopMonitoring();
    
    const renderCallsPerSecond = metrics.renderCalls - initialRenderCalls;
    
    return {
      passed: renderCallsPerSecond < 1000, // Should render efficiently
      metrics: { renderCallsPerSecond }
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceMonitor, GamePerformanceTests };
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
  window.GamePerformanceTests = GamePerformanceTests;
  
  console.log('📊 Performance monitoring system loaded');
  console.log('🚀 Use: new GamePerformanceTests().runPerformanceTests()');
  console.log('📊 Monitor: new PerformanceMonitor().startMonitoring()');
}

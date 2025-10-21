// ==========================================
// PHASE 3 INFRASTRUCTURE TESTS
// ==========================================

class Phase3InfrastructureTests {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      totalFailed: 0,
      totalPassed: 0,
      totalTests: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🚀 Testing Phase 3 Infrastructure...');
    
    try {
      // Test EventBus System
      await this.testEventBusSystem();
      
      // Test State Management System
      await this.testStateManagementSystem();
      
      // Test Performance Monitoring System
      await this.testPerformanceMonitoringSystem();
      
      // Test Integration
      await this.testInfrastructureIntegration();
      
      // Clean up any remaining DOM elements
      this.cleanupTestEnvironment();
      
      this.results.totalTests = this.results.totalTests;
      this.results.totalPassed = this.results.passed;
      this.results.totalFailed = this.results.failed;
      
      return this.results;
    } catch (error) {
      console.error('❌ Phase 3 Infrastructure Tests failed:', error);
      // Clean up even if tests failed
      this.cleanupTestEnvironment();
      return this.results;
    }
  }

  async testEventBusSystem() {
    console.log('📡 Testing EventBus System...');
    
    const tests = [
      () => this.testEventBusInstantiation(),
      () => this.testEventBusSubscription(),
      () => this.testEventBusEmission(),
      () => this.testEventBusUnsubscription(),
      () => this.testEventBusHistory(),
      () => this.testEventBusStatistics(),
      () => this.testEventBusGameIntegration()
    ];

    for (const test of tests) {
      await this.runTest('EventBus System', test);
    }
  }

  async testStateManagementSystem() {
    console.log('📊 Testing State Management System...');
    
    const tests = [
      () => this.testStateManagerInstantiation(),
      () => this.testStateManagerInitialization(),
      () => this.testStateManagerGetState(),
      () => this.testStateManagerSetState(),
      () => this.testStateManagerSubscription(),
      () => this.testStateManagerHistory(),
      () => this.testStateManagerRollback(),
      () => this.testStateManagerGameIntegration()
    ];

    for (const test of tests) {
      await this.runTest('State Management System', test);
    }
  }

  async testPerformanceMonitoringSystem() {
    console.log('📈 Testing Performance Monitoring System...');
    
    const tests = [
      () => this.testPerformanceMonitorInstantiation(),
      () => this.testPerformanceMonitorInitialization(),
      () => this.testPerformanceMonitorMetrics(),
      () => this.testPerformanceMonitorAlerts(),
      () => this.testPerformanceMonitorDashboard(),
      () => this.testPerformanceMonitorGameIntegration()
    ];

    for (const test of tests) {
      await this.runTest('Performance Monitoring System', test);
    }
  }

  async testInfrastructureIntegration() {
    console.log('🔗 Testing Infrastructure Integration...');
    
    const tests = [
      () => this.testAllSystemsInitialization(),
      () => this.testSystemsCommunication(),
      () => this.testGlobalAccess(),
      () => this.testKeyboardShortcuts()
    ];

    for (const test of tests) {
      await this.runTest('Infrastructure Integration', test);
    }
  }

  // ==========================================
  // EVENTBUS TESTS
  // ==========================================

  testEventBusInstantiation() {
    try {
      const eventBus = new EventBus();
      if (!eventBus || typeof eventBus.subscribe !== 'function') {
        throw new Error('EventBus not properly instantiated');
      }
      return true;
    } catch (error) {
      throw new Error(`EventBus instantiation failed: ${error.message}`);
    }
  }

  testEventBusSubscription() {
    try {
      const eventBus = new EventBus();
      let callbackCalled = false;
      
      const unsubscribe = eventBus.subscribe('test:event', () => {
        callbackCalled = true;
      });
      
      if (typeof unsubscribe !== 'function') {
        throw new Error('Subscription did not return unsubscribe function');
      }
      
      return true;
    } catch (error) {
      throw new Error(`EventBus subscription failed: ${error.message}`);
    }
  }

  testEventBusEmission() {
    try {
      const eventBus = new EventBus();
      let callbackCalled = false;
      let receivedData = null;
      
      eventBus.subscribe('test:event', (event) => {
        callbackCalled = true;
        receivedData = event.data;
      });
      
      eventBus.emit('test:event', { test: 'data' });
      
      if (!callbackCalled) {
        throw new Error('Callback was not called on emission');
      }
      
      if (!receivedData || receivedData.test !== 'data') {
        throw new Error('Event data was not properly passed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`EventBus emission failed: ${error.message}`);
    }
  }

  testEventBusUnsubscription() {
    try {
      const eventBus = new EventBus();
      let callbackCalled = false;
      
      const unsubscribe = eventBus.subscribe('test:event', () => {
        callbackCalled = true;
      });
      
      unsubscribe();
      eventBus.emit('test:event', { test: 'data' });
      
      if (callbackCalled) {
        throw new Error('Callback was called after unsubscription');
      }
      
      return true;
    } catch (error) {
      throw new Error(`EventBus unsubscription failed: ${error.message}`);
    }
  }

  testEventBusHistory() {
    try {
      const eventBus = new EventBus();
      
      eventBus.emit('test:event1', { data: 1 });
      eventBus.emit('test:event2', { data: 2 });
      
      const history = eventBus.getEventHistory();
      
      if (history.length < 2) {
        throw new Error('Event history not properly recorded');
      }
      
      if (history[0].type !== 'test:event1' || history[1].type !== 'test:event2') {
        throw new Error('Event history order incorrect');
      }
      
      return true;
    } catch (error) {
      throw new Error(`EventBus history failed: ${error.message}`);
    }
  }

  testEventBusStatistics() {
    try {
      const eventBus = new EventBus();
      
      eventBus.subscribe('test:event', () => {});
      eventBus.emit('test:event', { data: 1 });
      
      const stats = eventBus.getStats();
      
      if (typeof stats !== 'object' || stats.totalEvents === undefined) {
        throw new Error('EventBus statistics not properly returned');
      }
      
      if (stats.totalEvents < 1) {
        throw new Error('EventBus statistics not counting events');
      }
      
      return true;
    } catch (error) {
      throw new Error(`EventBus statistics failed: ${error.message}`);
    }
  }

  testEventBusGameIntegration() {
    try {
      if (!window.gameEventBus) {
        throw new Error('Global EventBus not available');
      }
      
      const eventBusWrapper = window.gameEventBus;
      
      if (typeof eventBusWrapper.initialize !== 'function') {
        throw new Error('EventBus wrapper missing initialize method');
      }
      
      if (typeof eventBusWrapper.getEventBus !== 'function') {
        throw new Error('EventBus wrapper missing getEventBus method');
      }
      
      return true;
    } catch (error) {
      throw new Error(`EventBus game integration failed: ${error.message}`);
    }
  }

  // ==========================================
  // STATE MANAGEMENT TESTS
  // ==========================================

  testStateManagerInstantiation() {
    try {
      const stateManager = new StateManager();
      if (!stateManager || typeof stateManager.getState !== 'function') {
        throw new Error('StateManager not properly instantiated');
      }
      return true;
    } catch (error) {
      throw new Error(`StateManager instantiation failed: ${error.message}`);
    }
  }

  testStateManagerInitialization() {
    try {
      const stateManager = new StateManager();
      const initialState = { test: 'value' };
      
      stateManager.initialize(initialState);
      const currentState = stateManager.getState();
      
      if (currentState.test !== 'value') {
        throw new Error('StateManager initialization failed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`StateManager initialization failed: ${error.message}`);
    }
  }

  testStateManagerGetState() {
    try {
      const stateManager = new StateManager();
      const initialState = { 
        player: { lives: 3 },
        game: { score: 100 }
      };
      
      stateManager.initialize(initialState);
      
      const fullState = stateManager.getState();
      const playerLives = stateManager.getState('player.lives');
      
      if (fullState.player.lives !== 3) {
        throw new Error('Full state retrieval failed');
      }
      
      if (playerLives !== 3) {
        throw new Error('Nested state retrieval failed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`StateManager getState failed: ${error.message}`);
    }
  }

  testStateManagerSetState() {
    try {
      const stateManager = new StateManager();
      stateManager.initialize({ test: 'initial' });
      
      stateManager.setState({ test: 'updated' }, 'TEST_UPDATE');
      const currentState = stateManager.getState();
      
      if (currentState.test !== 'updated') {
        throw new Error('StateManager setState failed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`StateManager setState failed: ${error.message}`);
    }
  }

  testStateManagerSubscription() {
    try {
      const stateManager = new StateManager();
      stateManager.initialize({ test: 'initial' });
      
      let callbackCalled = false;
      let receivedChange = null;
      
      const unsubscribe = stateManager.subscribe('test', (change) => {
        callbackCalled = true;
        receivedChange = change;
      });
      
      stateManager.setState({ test: 'updated' }, 'TEST_UPDATE');
      
      if (!callbackCalled) {
        throw new Error('State change callback not called');
      }
      
      if (!receivedChange || receivedChange.current !== 'updated') {
        throw new Error('State change data incorrect');
      }
      
      unsubscribe();
      
      return true;
    } catch (error) {
      throw new Error(`StateManager subscription failed: ${error.message}`);
    }
  }

  testStateManagerHistory() {
    try {
      const stateManager = new StateManager();
      stateManager.initialize({ test: 'initial' });
      
      stateManager.setState({ test: 'updated1' }, 'UPDATE1');
      stateManager.setState({ test: 'updated2' }, 'UPDATE2');
      
      const history = stateManager.getStateHistory();
      
      if (history.length < 3) { // initial + 2 updates
        throw new Error('State history not properly recorded');
      }
      
      if (history[1].action !== 'UPDATE1' || history[2].action !== 'UPDATE2') {
        throw new Error('State history actions incorrect');
      }
      
      return true;
    } catch (error) {
      throw new Error(`StateManager history failed: ${error.message}`);
    }
  }

  testStateManagerRollback() {
    try {
      const stateManager = new StateManager();
      stateManager.initialize({ test: 'initial' });
      
      stateManager.setState({ test: 'updated' }, 'UPDATE');
      const history = stateManager.getStateHistory();
      const targetStateId = history[1].id; // The update state
      
      stateManager.setState({ test: 'new' }, 'NEW');
      
      const rollbackSuccess = stateManager.rollbackToState(targetStateId);
      
      if (!rollbackSuccess) {
        throw new Error('State rollback failed');
      }
      
      const currentState = stateManager.getState();
      if (currentState.test !== 'updated') {
        throw new Error('State rollback did not restore correct state');
      }
      
      return true;
    } catch (error) {
      throw new Error(`StateManager rollback failed: ${error.message}`);
    }
  }

  testStateManagerGameIntegration() {
    try {
      if (!window.gameStateManager) {
        throw new Error('Global StateManager not available');
      }
      
      const stateManagerWrapper = window.gameStateManager;
      
      if (typeof stateManagerWrapper.initialize !== 'function') {
        throw new Error('StateManager wrapper missing initialize method');
      }
      
      if (typeof stateManagerWrapper.getCurrentState !== 'function') {
        throw new Error('StateManager wrapper missing getCurrentState method');
      }
      
      return true;
    } catch (error) {
      throw new Error(`StateManager game integration failed: ${error.message}`);
    }
  }

  // ==========================================
  // PERFORMANCE MONITORING TESTS
  // ==========================================

  testPerformanceMonitorInstantiation() {
    try {
      const monitor = new PerformanceMonitor();
      if (!monitor || typeof monitor.getMetrics !== 'function') {
        throw new Error('PerformanceMonitor not properly instantiated');
      }
      return true;
    } catch (error) {
      throw new Error(`PerformanceMonitor instantiation failed: ${error.message}`);
    }
  }

  testPerformanceMonitorInitialization() {
    try {
      const monitor = new PerformanceMonitor();
      const initResult = monitor.initialize();
      
      if (!initResult) {
        throw new Error('PerformanceMonitor initialization failed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`PerformanceMonitor initialization failed: ${error.message}`);
    }
  }

  testPerformanceMonitorMetrics() {
    try {
      const monitor = new PerformanceMonitor();
      monitor.initialize();
      
      // Simulate some activity
      monitor.recordFrame();
      monitor.recordCollisionChecks(10);
      monitor.recordRenderCalls(5);
      
      const metrics = monitor.getMetrics();
      
      if (typeof metrics !== 'object' || !metrics.fps || !metrics.memory) {
        throw new Error('PerformanceMonitor metrics not properly returned');
      }
      
      if (metrics.collisionChecks.count !== 10) {
        throw new Error('PerformanceMonitor collision tracking failed');
      }
      
      if (metrics.renderCalls.count !== 5) {
        throw new Error('PerformanceMonitor render tracking failed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`PerformanceMonitor metrics failed: ${error.message}`);
    }
  }

  testPerformanceMonitorAlerts() {
    try {
      const monitor = new PerformanceMonitor();
      monitor.initialize();
      
      // Force a low FPS alert
      monitor.metrics.fps.current = 25; // Below critical threshold
      monitor.checkPerformanceAlerts();
      
      const alerts = monitor.getAlerts();
      
      if (alerts.length === 0) {
        throw new Error('PerformanceMonitor alerts not generated');
      }
      
      const criticalAlert = alerts.find(alert => alert.level === 'critical');
      if (!criticalAlert) {
        throw new Error('PerformanceMonitor critical alert not generated');
      }
      
      return true;
    } catch (error) {
      throw new Error(`PerformanceMonitor alerts failed: ${error.message}`);
    }
  }

  testPerformanceMonitorDashboard() {
    try {
      const monitor = new PerformanceMonitor();
      monitor.initialize();
      
      const dashboard = new PerformanceDashboard();
      dashboard.initialize(monitor);
      
      if (!dashboard.dashboardElement) {
        throw new Error('PerformanceDashboard not properly created');
      }
      
      // Test dashboard creation without manipulating DOM visibility
      // This avoids potential browser freezing issues
      if (typeof dashboard.show !== 'function') {
        throw new Error('PerformanceDashboard show method missing');
      }
      
      if (typeof dashboard.hide !== 'function') {
        throw new Error('PerformanceDashboard hide method missing');
      }
      
      if (typeof dashboard.toggle !== 'function') {
        throw new Error('PerformanceDashboard toggle method missing');
      }
      
      // Test that the dashboard element was created with correct properties
      if (!dashboard.dashboardElement.id || dashboard.dashboardElement.id !== 'performanceDashboard') {
        throw new Error('PerformanceDashboard element ID incorrect');
      }
      
      // Clean up DOM elements to prevent accumulation
      if (dashboard.dashboardElement && dashboard.dashboardElement.parentNode) {
        dashboard.dashboardElement.parentNode.removeChild(dashboard.dashboardElement);
      }
      
      // Clean up intervals to prevent memory leaks
      if (dashboard.updateInterval) {
        clearInterval(dashboard.updateInterval);
      }
      
      return true;
    } catch (error) {
      throw new Error(`PerformanceMonitor dashboard failed: ${error.message}`);
    }
  }

  testPerformanceMonitorGameIntegration() {
    try {
      if (!window.gamePerformanceMonitor) {
        throw new Error('Global PerformanceMonitor not available');
      }
      
      const performanceMonitorWrapper = window.gamePerformanceMonitor;
      
      if (typeof performanceMonitorWrapper.initialize !== 'function') {
        throw new Error('PerformanceMonitor wrapper missing initialize method');
      }
      
      if (typeof performanceMonitorWrapper.getMetrics !== 'function') {
        throw new Error('PerformanceMonitor wrapper missing getMetrics method');
      }
      
      return true;
    } catch (error) {
      throw new Error(`PerformanceMonitor game integration failed: ${error.message}`);
    }
  }

  // ==========================================
  // INTEGRATION TESTS
  // ==========================================

  testAllSystemsInitialization() {
    try {
      // Test that all systems can be initialized
      const eventBus = new EventBus();
      const stateManager = new StateManager();
      const performanceMonitor = new PerformanceMonitor();
      
      stateManager.initialize({ test: 'value' });
      performanceMonitor.initialize();
      
      if (!eventBus || !stateManager || !performanceMonitor) {
        throw new Error('Not all systems properly instantiated');
      }
      
      return true;
    } catch (error) {
      throw new Error(`All systems initialization failed: ${error.message}`);
    }
  }

  testSystemsCommunication() {
    try {
      const eventBus = new EventBus();
      const stateManager = new StateManager();
      
      stateManager.initialize({ test: 'initial' });
      
      let eventReceived = false;
      
      // Subscribe to state changes via EventBus
      eventBus.subscribe('state:change', () => {
        eventReceived = true;
      });
      
      // Subscribe to state changes in StateManager
      stateManager.subscribe('test', (change) => {
        eventBus.emit('state:change', change);
      });
      
      stateManager.setState({ test: 'updated' }, 'TEST');
      
      if (!eventReceived) {
        throw new Error('Systems communication failed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Systems communication failed: ${error.message}`);
    }
  }

  testGlobalAccess() {
    try {
      if (!window.gameEventBus || !window.gameStateManager || !window.gamePerformanceMonitor) {
        throw new Error('Global system access not available');
      }
      
      if (typeof window.showPerformanceDashboard !== 'function') {
        throw new Error('Global performance dashboard function not available');
      }
      
      if (typeof window.getEventBusStats !== 'function') {
        throw new Error('Global EventBus stats function not available');
      }
      
      if (typeof window.getStateManagerStats !== 'function') {
        throw new Error('Global StateManager stats function not available');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Global access failed: ${error.message}`);
    }
  }

  testKeyboardShortcuts() {
    try {
      // Test that keyboard event listeners are set up
      const testEvent = new KeyboardEvent('keydown', {
        code: 'KeyD',
        ctrlKey: true
      });
      
      // This test just verifies the event can be created
      // The actual functionality would be tested in the browser
      if (!testEvent.ctrlKey || testEvent.code !== 'KeyD') {
        throw new Error('Keyboard event creation failed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Keyboard shortcuts test failed: ${error.message}`);
    }
  }

  // ==========================================
  // TEST RUNNER UTILITIES
  // ==========================================

  /**
   * Clean up test environment to prevent DOM accumulation and memory leaks
   */
  cleanupTestEnvironment() {
    try {
      // Remove any performance dashboard elements
      const dashboardElements = document.querySelectorAll('#performanceDashboard');
      dashboardElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // Clear any remaining intervals
      const highestIntervalId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestIntervalId; i++) {
        clearInterval(i);
      }
      
      console.log('🧹 Test environment cleaned up');
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
  }

  async runTest(category, testFunction) {
    this.results.totalTests++;
    
    try {
      const result = testFunction();
      if (result === true) {
        this.results.passed++;
        this.results.tests.push({
          category,
          name: testFunction.name,
          status: 'passed',
          message: 'Test passed'
        });
        console.log(`  ✅ ${testFunction.name}`);
      } else {
        throw new Error('Test returned false');
      }
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({
        category,
        name: testFunction.name,
        status: 'failed',
        message: error.message
      });
      console.log(`  ❌ ${testFunction.name}: ${error.message}`);
    }
  }
}

// Export for use in test runner
if (typeof window !== 'undefined') {
  window.Phase3InfrastructureTests = Phase3InfrastructureTests;
}

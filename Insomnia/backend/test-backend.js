/**
 * Simple test script to verify backend service
 * Run with: node test-backend.js
 */

const { GameOwnerWallet } = require('./src/services/gameOwnerWallet');

async function testBackend() {
  console.log('🧪 Testing backend service...');
  
  try {
    // Test wallet initialization
    console.log('\n1️⃣ Testing wallet initialization...');
    const wallet = new GameOwnerWallet();
    await wallet.initialize();
    console.log('✅ Wallet initialized successfully');
    
    // Test balance check
    console.log('\n2️⃣ Testing balance check...');
    const balance = await wallet.getBalance();
    console.log(`✅ Balance: ${balance} SUI`);
    
    // Test health check
    console.log('\n3️⃣ Testing health check...');
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      const health = await response.json();
      console.log('✅ Health check:', health);
    } else {
      console.log('❌ Health check failed:', response.status);
    }
    
    console.log('\n🎉 Backend test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Backend test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testBackend();
}

module.exports = { testBackend };

require('dotenv').config();
const { GameOwnerWallet } = require('./src/services/gameOwnerWallet');

async function verifyGamePass() {
  const playerAddress = "0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02";
  
  console.log('🔍 Verifying Game Pass in New Contract...');
  console.log('👤 Player Address:', playerAddress);
  console.log('🎫 New Game Pass System:', process.env.GAME_PASS_SYSTEM_ID);
  console.log('');

  try {
    // Initialize game owner wallet
    console.log('🔧 Initializing game owner wallet...');
    const gameOwnerWallet = new GameOwnerWallet();
    await gameOwnerWallet.initialize();
    console.log('✅ Game owner wallet initialized successfully');
    console.log('');

    // Check if player has an active game pass
    console.log('🔍 Checking player game pass status...');
    const hasGamePass = await gameOwnerWallet.checkPlayerGamePass(playerAddress);
    
    if (hasGamePass.success) {
      console.log('✅ Player has active game pass!');
      console.log('📊 Game Pass Details:');
      console.log('   - Games Remaining:', hasGamePass.gamesRemaining);
      console.log('   - Pass Type:', hasGamePass.passType);
      console.log('   - Is Active:', hasGamePass.isActive);
      console.log('   - Expires At:', hasGamePass.expiresAt);
      console.log('   - Purchased At:', hasGamePass.purchasedAt);
      console.log('');
      
      // Try to consume a game credit
      console.log('🎮 Testing game credit consumption...');
      const consumeResult = await gameOwnerWallet.consumeGameCredit(playerAddress);
      
      if (consumeResult.success) {
        console.log('✅ Successfully consumed 1 game credit!');
        console.log('📊 Updated Game Pass Details:');
        console.log('   - Games Remaining:', consumeResult.gamesRemaining);
        console.log('   - Credit Consumed:', consumeResult.creditConsumed);
        console.log('');
        
        // Check final status
        const finalStatus = await gameOwnerWallet.checkPlayerGamePass(playerAddress);
        console.log('🔍 Final Game Pass Status:');
        console.log('   - Games Remaining:', finalStatus.gamesRemaining);
        console.log('   - Is Active:', finalStatus.isActive);
        
      } else {
        console.error('❌ Failed to consume game credit:', consumeResult.error);
      }
      
    } else {
      console.error('❌ Player does not have an active game pass:', hasGamePass.error);
    }

    // Cleanup
    if (gameOwnerWallet) {
      gameOwnerWallet.cleanup();
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyGamePass().catch(console.error);




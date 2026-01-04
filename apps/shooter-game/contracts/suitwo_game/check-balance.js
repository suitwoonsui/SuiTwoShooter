// Check MEWS token balance for a wallet
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const walletAddress = process.argv[2] || '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0';
const tokenTypeId = '0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS';

async function checkBalance() {
  try {
    console.log('🔍 Checking MEWS balance...');
    console.log('   Wallet:', walletAddress);
    console.log('   Token Type:', tokenTypeId);
    console.log('');
    
    // Get all coins of this type owned by the address
    const coins = await client.getCoins({
      owner: walletAddress,
      coinType: tokenTypeId,
    });
    
    console.log('📊 Balance Information:');
    console.log('   Total Coin Objects:', coins.data.length);
    
    if (coins.data.length === 0) {
      console.log('   ⚠️  No MEWS tokens found in this wallet');
      console.log('');
      console.log('   This could mean:');
      console.log('   - The tokens haven\'t been minted yet');
      console.log('   - The wallet address is incorrect');
      console.log('   - The tokens were transferred to another wallet');
      return;
    }
    
    // Calculate total balance
    let totalBalance = BigInt(0);
    for (const coin of coins.data) {
      totalBalance += BigInt(coin.balance);
    }
    
    // Convert to MEWS (divide by 10^9)
    const mewsAmount = Number(totalBalance) / 1_000_000_000;
    
    console.log('   Total Balance (raw units):', totalBalance.toString());
    console.log('   Total Balance (MEWS):', mewsAmount.toLocaleString('en-US', { maximumFractionDigits: 9 }));
    console.log('');
    
    // Show individual coin objects
    if (coins.data.length > 0) {
      console.log('💰 Coin Objects:');
      coins.data.forEach((coin, index) => {
        const coinMews = Number(coin.balance) / 1_000_000_000;
        console.log(`   ${index + 1}. Coin ID: ${coin.coinObjectId}`);
        console.log(`      Balance: ${coinMews.toLocaleString('en-US', { maximumFractionDigits: 9 })} MEWS`);
      });
    }
    
    // Check if there are more pages
    if (coins.hasNextPage) {
      console.log('');
      console.log('   ⚠️  Note: There are more coin objects. Use pagination to see all.');
    }
    
  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
    if (error.message.includes('not found')) {
      console.log('');
      console.log('   This might mean:');
      console.log('   - The token type ID is incorrect');
      console.log('   - The wallet has no tokens of this type');
    }
  }
}

checkBalance();


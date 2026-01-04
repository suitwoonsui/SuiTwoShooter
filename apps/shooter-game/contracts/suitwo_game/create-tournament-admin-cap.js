// Create tournament admin capability
// This creates a NEW admin capability without needing the old (locked) one
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env.local') });
require('dotenv').config(); // Also load from process.env

// Current package ID from latest deployment (DEPLOYMENT_IDS.md)
const packageId = process.env.GAME_SCORE_CONTRACT_TESTNET || '0xb2ca3fa6aadeee30171073bdc30b9847ceb3c1b431874ced439ce8039b82ef1b';

// Get private key from environment (check multiple possible names)
const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY 
  || process.env.GAME_WALLET_PRIVATE_KEY
  || process.env.ADMIN_PRIVATE_KEY
  || process.env.SUI_PRIVATE_KEY;

if (!privateKey) {
  console.error('❌ Error: Private key not found in environment variables');
  console.error('   Looking for: ADMIN_WALLET_PRIVATE_KEY, GAME_WALLET_PRIVATE_KEY, or ADMIN_PRIVATE_KEY');
  console.error('   Please set one of these in backend/.env.local');
  console.error('   Current env file path:', require('path').join(__dirname, '../../backend/.env.local'));
  console.error('   Current working directory:', process.cwd());
  console.error('\n   Available env vars:', Object.keys(process.env).filter(k => k.includes('PRIVATE') || k.includes('WALLET')).join(', ') || 'none');
  process.exit(1);
}

function decodePrivateKey(privateKey) {
  if (privateKey.startsWith('suiprivkey1')) {
    const decoded = bech32.decode(privateKey);
    const bytes = bech32.fromWords(decoded.words);
    if (bytes.length === 33) {
      return new Uint8Array(bytes.slice(1));
    } else if (bytes.length === 32) {
      return new Uint8Array(bytes);
    } else {
      throw new Error(`Unexpected key length: ${bytes.length} bytes`);
    }
  } else {
    let hexKey = privateKey.trim();
    if (hexKey.startsWith('0x') || hexKey.startsWith('0X')) {
      hexKey = hexKey.slice(2);
    }
    return fromHEX(hexKey);
  }
}

async function createTournamentAdminCap() {
  try {
    console.log('🔧 Initializing admin wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Admin wallet initialized');
    console.log('   Address:', address);
    
    // Initialize Sui client
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('\n📦 Creating NEW Tournament AdminCapability...');
    console.log('   Package ID:', packageId);
    console.log('   ⚠️  This will create a NEW admin capability (old one is locked)');
    console.log('   📝 You will need to update TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET in backend/.env.local');
    
    // Select an unlocked gas coin (filter out ALL known locked coins)
    console.log('\n💰 Selecting unlocked gas coin...');
    const KNOWN_LOCKED_COINS = [
      '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a', // Original locked coin
      '0x059b1843b59dd50f48aa1f810a51624e1b41b57c7ab9bc6f65ffb1d4397f6c31', // Also locked (from 504 timeout)
    ];
    
    const coins = await client.getCoins({
      owner: address,
      coinType: '0x2::sui::SUI',
    });
    
    if (!coins.data || coins.data.length === 0) {
      throw new Error('No SUI coins available for gas');
    }
    
    console.log(`   Found ${coins.data.length} total coin(s)`);
    
    // Filter out ALL known locked coins
    const availableCoins = coins.data.filter(coin => !KNOWN_LOCKED_COINS.includes(coin.coinObjectId));
    
    console.log(`   After filtering locked coins: ${availableCoins.length} available coin(s)`);
    
    // List all coins for debugging
    coins.data.forEach(coin => {
      const isLocked = KNOWN_LOCKED_COINS.includes(coin.coinObjectId);
      const balanceSui = (BigInt(coin.balance) / BigInt(1_000_000_000)).toString();
      console.log(`   ${isLocked ? '🔒 LOCKED' : '✅'} ${coin.coinObjectId.substring(0, 10)}...: ${balanceSui} SUI`);
    });
    
    if (availableCoins.length === 0) {
      throw new Error('No unlocked SUI coins available. Please add more SUI to your wallet.');
    }
    
    // Sort by version (prefer newer coins)
    const sortedCoins = [...availableCoins].sort((a, b) => parseInt(a.version) - parseInt(b.version));
    
    // Select coin with sufficient balance
    const minBalance = 100_000_000; // 0.1 SUI
    const selectedCoin = sortedCoins.find(c => BigInt(c.balance) >= BigInt(minBalance));
    
    if (!selectedCoin) {
      throw new Error('No SUI coin with sufficient balance for gas (need at least 0.1 SUI)');
    }
    
    console.log(`   ✅ Selected coin: ${selectedCoin.coinObjectId.substring(0, 10)}... (${(BigInt(selectedCoin.balance) / BigInt(1_000_000_000)).toString()} SUI)`);
    
    const txb = new Transaction();
    txb.setSender(address);
    
    // Explicitly set gas payment to the selected unlocked coin
    txb.setGasPayment([{
      objectId: selectedCoin.coinObjectId,
      version: selectedCoin.version,
      digest: selectedCoin.digest,
    }]);
    
    // Create admin capability for tournaments module (transfers directly to admin_address)
    txb.moveCall({
      target: `${packageId}::tournaments::create_admin_capability`,
      arguments: [
        txb.pure.address(address),
      ],
    });
    
    txb.setGasBudget(50_000_000);
    
    // Build and sign transaction
    const transactionBytes = await txb.build({ client });
    
    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: transactionBytes,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    if (result.effects?.status?.status === 'success') {
      // Find the admin capability object ID
      let adminCapId = null;
      
      if (result.effects?.objectChanges) {
        for (const change of result.effects.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('AdminCapability') && change.objectType?.includes('tournaments')) {
            adminCapId = change.objectId;
            break;
          }
        }
      }
      
      console.log('\n✅ Tournament AdminCapability created successfully!');
      console.log('\n📋 Admin Capability ID:');
      if (adminCapId) {
        console.log(`   ${adminCapId}`);
      } else {
        console.log('   ⚠️  Not found automatically - check transaction');
      }
      console.log('   📝 Transaction Digest:', result.digest);
      console.log('\n🔗 View on Sui Explorer:');
      console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
      
      if (adminCapId) {
        console.log('\n📝 Add to backend/.env.local:');
        console.log(`   TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=${adminCapId}`);
      }
      
      return adminCapId;
    } else {
      throw new Error(`Transaction failed: ${result.effects?.status?.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('\n❌ Failed to create Tournament AdminCapability:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createTournamentAdminCap().catch(console.error);


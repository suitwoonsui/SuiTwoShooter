// Mint MEWS testnet tokens
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');
const { Transaction } = require('@mysten/sui/transactions');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

// Update these after deployment:
const packageId = '0x6e2cb689422cb1a2d4d3ed3817242e2f298ee6e5ab7afbcbb548475118834faa';
const treasuryCapObjectId = '0x8c2b1a8a38d2e39679f58db83da83efd31b27e8a49358c2a65f1547dd81c74b1';

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

async function mintMews() {
  try {
    console.log('🔧 Initializing wallet...');
    const decodedKey = decodePrivateKey(privateKey);
    const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
    const address = keypair.toSuiAddress();
    
    console.log('✅ Wallet initialized');
    console.log('   Address:', address);
    
    // Initialize Sui client
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    // Constants
    const DECIMALS = 9;
    const DECIMAL_MULTIPLIER = BigInt(10 ** DECIMALS); // 1,000,000,000
    
    // Get recipient address and amount from command line
    const recipientAddress = process.argv[2] || address;
    const mewsAmount = process.argv[3] || '1'; // Default: 1 MEWS
    
    // Convert MEWS amount to raw units (multiply by 10^9)
    const mewsAmountFloat = parseFloat(mewsAmount);
    if (isNaN(mewsAmountFloat) || mewsAmountFloat <= 0) {
      throw new Error(`Invalid MEWS amount: ${mewsAmount}. Must be a positive number.`);
    }
    
    // Convert to raw units (handle decimals in input)
    const rawAmount = BigInt(Math.floor(mewsAmountFloat * Number(DECIMAL_MULTIPLIER)));
    
    console.log('\n📦 Minting MEWS tokens...');
    console.log('   Package ID:', packageId);
    console.log('   TreasuryCap:', treasuryCapObjectId);
    console.log('   Recipient:', recipientAddress);
    console.log('   Amount:', mewsAmount, 'MEWS');
    console.log('   Raw units:', rawAmount.toString(), `(with ${DECIMALS} decimals)`);
    
    // Build transaction
    const txb = new Transaction();
    
    // Call mint function
    txb.moveCall({
      target: `${packageId}::mews::mint`,
      arguments: [
        txb.object(treasuryCapObjectId),  // treasury: &mut TreasuryCap<MEWS>
        txb.pure.u64(rawAmount),          // amount: u64 (in raw units)
        txb.pure.address(recipientAddress), // recipient: address
      ],
    });
    
    // Set gas budget
    txb.setGasBudget(50_000_000);
    
    console.log('🔐 Signing and executing transaction...');
    
    // Sign and execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    
    console.log('\n✅ Transaction executed successfully!');
    console.log('   Transaction Digest:', result.digest);
    
    // Extract minted coin object ID
    let coinObjectId = null;
    if (result.objectChanges) {
      for (const change of result.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          if (change.objectType.includes('Coin') && change.objectType.includes('MEWS')) {
            coinObjectId = change.objectId;
            console.log('   ✅ Minted Coin Object ID:', coinObjectId);
            break;
          }
        }
      }
    }
    
    console.log('\n🔗 View on Sui Explorer:');
    console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=testnet`);
    
    console.log('\n📝 Usage:');
    console.log('   node mint-mews.js [recipient_address] [mews_amount]');
    console.log('');
    console.log('   Examples:');
    console.log('     node mint-mews.js                    # Mint 1 MEWS to your address');
    console.log('     node mint-mews.js 0x1234...         # Mint 1 MEWS to specified address');
    console.log('     node mint-mews.js 0x1234... 10      # Mint 10 MEWS to specified address');
    console.log('     node mint-mews.js 0x1234... 100.5   # Mint 100.5 MEWS (supports decimals)');
    console.log('');
    console.log('   Note: Amount is in MEWS (not raw units). Decimals are supported.');
    
  } catch (error) {
    console.error('❌ Error minting MEWS:', error);
    process.exit(1);
  }
}

mintMews();


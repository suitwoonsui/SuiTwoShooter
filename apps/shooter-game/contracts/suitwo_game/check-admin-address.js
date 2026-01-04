// Check what address the admin private key corresponds to
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

function decodePrivateKey(privateKey) {
  if (privateKey.startsWith('suiprivkey1')) {
    const decoded = bech32.decode(privateKey);
    const bytes = bech32.fromWords(decoded.words);
    // Bech32 includes a version byte (first byte), skip it for Ed25519
    // Ed25519 private keys are 32 bytes
    if (bytes.length === 33) {
      return new Uint8Array(bytes.slice(1)); // Skip first byte (version)
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

try {
  const decodedKey = decodePrivateKey(privateKey);
  const keypair = Ed25519Keypair.fromSecretKey(decodedKey);
  const address = keypair.toSuiAddress();
  
  console.log('🔑 Admin Wallet Information:');
  console.log('   Address:', address);
  console.log('');
  console.log('This is the wallet that will:');
  console.log('  1. Deploy the contract');
  console.log('  2. Sign score submissions (backend)');
  console.log('  3. Pay gas fees');
  console.log('');
  console.log('Make sure this wallet has testnet SUI for deployment!');
} catch (error) {
  console.error('❌ Error:', error.message);
}


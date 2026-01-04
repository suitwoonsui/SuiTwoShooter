// Quick script to verify wallet address from private key
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui/utils');
const { bech32 } = require('bech32');

const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';

function decodePrivateKey(privateKey) {
  if (privateKey.startsWith('suiprivkey1')) {
    const decoded = bech32.decode(privateKey);
    const bytes = bech32.fromWords(decoded.words);
    return new Uint8Array(bytes);
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
  
  console.log('🔑 Private Key Address:');
  console.log('   Address:', address);
  console.log('');
  console.log('Is this the wallet you want to use for deployment?');
} catch (error) {
  console.error('Error:', error.message);
}


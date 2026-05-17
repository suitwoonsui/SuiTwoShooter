// Tournament admin capability is created on the PLATFORM (platform::station AdminCapability).
// The game package no longer has a tournaments module. Use platform backend/contracts for tournament admin.
// This script is kept for reference; it no longer calls the game package.
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
  console.log('Tournaments are provided by the platform (platform::station + platform_tournaments).');
  console.log('The game package no longer has a tournaments module.');
  console.log('Tournament/event admin capability is created and managed on the platform.');
  console.log('See TOURNAMENTS_PLATFORM_ONLY.md and platform backend for event/tournament admin.');
  console.log('Set TOURNAMENT_REGISTRY_OBJECT_ID / TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID to platform objects (App Event Registry, Events Admin Cap) in game backend .env.');
}

createTournamentAdminCap().catch(console.error);


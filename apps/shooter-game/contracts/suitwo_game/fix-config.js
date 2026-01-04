// Script to fix corrupted Sui CLI config file
const fs = require('fs');
const path = require('path');

const configPath = 'C:\\Users\\TheCe\\.sui\\sui_config\\client.yaml';
const keystorePath = 'C:\\Users\\TheCe\\.sui\\sui_config\\sui.keystore';

try {
  // Check if keystore exists
  if (!fs.existsSync(keystorePath)) {
    console.error('❌ Keystore file not found:', keystorePath);
    process.exit(1);
  }

  // Read keystore to verify it exists
  const keystore = fs.readFileSync(keystorePath, 'utf8');
  console.log('✅ Keystore file found');

  // Create a proper config file
  const config = {
    active_address: '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3',
    active_env: 'testnet',
    keystore: {
      File: keystorePath.replace(/\\/g, '/')
    },
    envs: [
      {
        alias: 'testnet',
        rpc: 'https://fullnode.testnet.sui.io:443',
        ws: 'wss://fullnode.testnet.sui.io:443'
      }
    ]
  };

  // Convert to YAML format
  const yaml = `active_address: "${config.active_address}"
active_env: "${config.active_env}"
keystore:
  File: "${config.keystore.File}"
envs:
  - alias: "${config.envs[0].alias}"
    rpc: "${config.envs[0].rpc}"
    ws: "${config.envs[0].ws}"
`;

  // Backup old config if it exists
  if (fs.existsSync(configPath)) {
    const backupPath = configPath + '.backup.' + Date.now();
    try {
      fs.copyFileSync(configPath, backupPath);
      console.log('📦 Backed up old config to:', backupPath);
    } catch (e) {
      console.warn('⚠️  Could not backup old config:', e.message);
    }
  }

  // Write new config
  fs.writeFileSync(configPath, yaml, 'utf8');
  console.log('✅ Config file created/updated:', configPath);
  console.log('\n📋 Config contents:');
  console.log(yaml);
  console.log('\n✅ You can now try: sui client publish --gas-budget 10000000');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}


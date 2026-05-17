/**
 * One-off: fetch UpgradeCap from the game package publish tx and write UPGRADE_CAP.json
 * so deploy.js can perform an upgrade. Run: node fetch-upgrade-cap.js
 */
const { SuiClient } = require('@mysten/sui/client');
const fs = require('fs');
const path = require('path');

const PUBLISH_DIGEST = 'BgxqxZCxokZiaLioeHEQvsvK1uHPRSGsW64fQTK9Khtj';
const PACKAGE_ID = '0x4430e6c44ccced43dbb57e8a6cf135dd9cf71b75b1ff3f16d0a6e2cf40e033da';
const RPC = 'https://fullnode.testnet.sui.io:443';

async function main() {
  const client = new SuiClient({ url: RPC });
  const tx = await client.getTransactionBlock({
    digest: PUBLISH_DIGEST,
    options: { showObjectChanges: true },
  });
  const changes = tx.objectChanges || [];
  const upgradeCap = changes.find(
    (c) => c.type === 'created' && c.objectType && c.objectType.includes('UpgradeCap')
  );
  if (!upgradeCap || upgradeCap.type !== 'created') {
    console.error('UpgradeCap not found in objectChanges:', changes.map((c) => ({ type: c.type, objectType: c.objectType })));
    process.exit(1);
  }
  const upgradeCapId = upgradeCap.objectId;
  const data = {
    upgradeCapId,
    packageId: PACKAGE_ID,
    network: 'testnet',
  };
  const outPath = path.join(__dirname, 'UPGRADE_CAP.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log('Wrote', outPath);
  console.log('  upgradeCapId:', upgradeCapId);
  console.log('  packageId:', PACKAGE_ID);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

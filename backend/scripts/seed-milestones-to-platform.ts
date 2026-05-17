// ==========================================
// Seed milestone definitions to platform storage
// Run once after deploy so the platform has the game-defined milestones.
// Usage: npx tsx scripts/seed-milestones-to-platform.ts
// Requires: PLATFORM_BACKEND_URL (or default localhost:3000), API_KEY or ADMIN_API_KEY for platform.
// ==========================================

import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '../.env') });

import { MILESTONE_DEFINITIONS } from '../data/initialization-data';
import {
  getPlatformBackendUrl,
  getApiKeyForEcosystemApp,
  getAppIdFromEnv,
  getCorridorCapabilityObjectIdFromEnv,
  getEcosystemIdFromEnv,
} from '../lib/services/platform/client/platform-client';

async function main() {
  const corridorCapId = getCorridorCapabilityObjectIdFromEnv();
  if (!corridorCapId) {
    console.error('CORRIDOR_CAPABILITY_OBJECT_ID (or _TESTNET/_MAINNET) must be set in config/contracts.<network>.json. Identity is from corridor only.');
    process.exit(1);
  }
  const baseUrl = getPlatformBackendUrl();
  const apiKey = getApiKeyForEcosystemApp(getEcosystemIdFromEnv(), getAppIdFromEnv());
  const url = `${baseUrl}/api/admin/milestones/definitions`;

  console.log('Seeding milestone definitions to platform (corridor only)...', { url: url.replace(/\/\/.*@/, '//***@') });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Corridor-Capability-Object-Id': corridorCapId,
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify({ definitions: MILESTONE_DEFINITIONS }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Platform returned', response.status, data);
    process.exit(1);
  }
  console.log('Success:', data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

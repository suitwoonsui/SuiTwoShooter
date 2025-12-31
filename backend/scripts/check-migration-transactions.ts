// ==========================================
// Check Migration Transaction Status
// ==========================================
// Verifies if the migration transactions actually succeeded

import * as dotenv from 'dotenv';
import * as path from 'path';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Load environment variables
const possiblePaths = [
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../.env.local'),
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

// Transaction digests from the successful migration
const migrationTransactions = [
  { digest: '47J6pTNZ9AhSQg1AqQHBt2PQDDh8NoLJMk5pNwDzCoXV', category: 'bossesPerGame' },
  { digest: '6XsrxXe99XXK8yNreCaCi8c1ZA5vkG9VMYbaMG9MtARH', category: 'bossesCumulative' },
  { digest: '9DThYX2JZhfRtXDa92qfa8yH2fvE944Vch6r5iSmZMuz', category: 'scorePerGame' },
  { digest: 'FF9t9kx4NC8mkRgJstFoLCRMHn1Hm5C36vVuLAEZ3CHh', category: 'scoreCumulative' },
  { digest: 'DPRV8AWnDPsxsetHTJ5GnAoGY49fX2udqPs3Lv9URV1P', category: 'distancePerGame' },
  { digest: '5PWBVjR5KXoA9m4PwVb47E7efEeVuHkMMDnbp6aFZcMM', category: 'distanceCumulative' },
];

const network = process.env.SUI_TESTNET_NETWORK ? 'testnet' : 
                process.env.SUI_MAINNET_NETWORK ? 'mainnet' :
                (process.env.SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';

const client = new SuiClient({
  url: network === 'testnet' 
    ? getFullnodeUrl('testnet')
    : getFullnodeUrl('mainnet'),
});

async function checkTransactions() {
  console.log('🔍 Checking migration transaction status...\n');
  console.log(`Network: ${network}\n`);
  
  for (const { digest, category } of migrationTransactions) {
    try {
      console.log(`📋 Checking ${category}: ${digest}`);
      const tx = await client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showInput: true,
        },
      });
      
      if (tx.effects?.status?.status === 'success') {
        console.log(`   ✅ Transaction SUCCEEDED`);
        console.log(`   📊 Effects status: ${tx.effects.status.status}`);
        
        // Check for events
        if (tx.events && tx.events.length > 0) {
          const milestoneEvents = tx.events.filter(e => 
            e.type?.includes('MilestoneDefinitionAdded') || 
            e.type?.includes('milestone')
          );
          console.log(`   📊 Found ${milestoneEvents.length} milestone-related event(s)`);
          if (milestoneEvents.length > 0) {
            milestoneEvents.forEach((event, i) => {
              console.log(`      Event ${i + 1}: ${event.type}`);
              if (event.parsedJson) {
                console.log(`         Data: ${JSON.stringify(event.parsedJson, null, 2)}`);
              }
            });
          }
        } else {
          console.log(`   ⚠️  No events found in transaction`);
        }
        
        // Check object changes
        if (tx.objectChanges && tx.objectChanges.length > 0) {
          console.log(`   📊 Object changes: ${tx.objectChanges.length}`);
          const registryChanges = tx.objectChanges.filter(change => 
            change.type === 'mutated' && 
            (change.objectId?.includes('52fd32c6c634250f569d0d4b13faf753140942583f2a22517ad8a5181618d98d') ||
             change.objectType?.includes('AchievementRegistry'))
          );
          if (registryChanges.length > 0) {
            console.log(`   ✅ Registry was mutated (milestones should be stored)`);
          }
        }
      } else if (tx.effects?.status?.status === 'failure') {
        console.log(`   ❌ Transaction FAILED`);
        console.log(`   📊 Error: ${tx.effects?.status?.error || 'Unknown error'}`);
      } else {
        console.log(`   ⚠️  Transaction status: ${tx.effects?.status?.status || 'unknown'}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.log(`   ⚠️  Transaction NOT FOUND (may have been pruned or never existed)`);
      } else {
        console.log(`   ❌ Error checking transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    console.log('');
  }
}

checkTransactions().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

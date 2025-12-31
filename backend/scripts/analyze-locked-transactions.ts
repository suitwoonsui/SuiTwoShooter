// ==========================================
// Analyze Locked Transactions Script
// ==========================================
// Attempts to identify what functions/methods the locked transactions were calling
// Even if transactions are pruned, we can infer from context and coin history

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
    console.log(`📁 Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

const STUCK_TRANSACTIONS = [
  'EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A',
  'H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc',
];

const LOCKED_COIN_ID = '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a';
const ADMIN_WALLET = '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';

const network = process.env.SUI_TESTNET_NETWORK ? 'testnet' : 
                process.env.SUI_MAINNET_NETWORK ? 'mainnet' :
                (process.env.SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';

const client = new SuiClient({
  url: network === 'testnet' 
    ? getFullnodeUrl('testnet')
    : getFullnodeUrl('mainnet'),
});

/**
 * Try to query transaction details (even if pruned)
 */
async function queryTransactionDetails(txDigest: string): Promise<any> {
  try {
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });
    return tx;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null; // Transaction pruned
    }
    throw error;
  }
}

/**
 * Extract function name from transaction
 */
function extractFunctionName(tx: any): string | null {
  // Try multiple paths to find the function
  let transactions: any[] = [];
  
  // Path 1: tx.transaction.data.transaction.transactions
  if (tx.transaction?.data?.transaction?.transactions) {
    transactions = tx.transaction.data.transaction.transactions;
  }
  // Path 2: tx.transaction.data.transactions
  else if (tx.transaction?.data?.transactions) {
    transactions = tx.transaction.data.transactions;
  }
  // Path 3: tx.data.transaction.transactions
  else if (tx.data?.transaction?.transactions) {
    transactions = tx.data.transaction.transactions;
  }
  // Path 4: tx.data.transactions
  else if (tx.data?.transactions) {
    transactions = tx.data.transactions;
  }
  
  for (const txn of transactions) {
    if (txn.kind === 'MoveCall' || txn.MoveCall) {
      const moveCall = txn.MoveCall || txn;
      if (moveCall.target || moveCall.function || moveCall.module) {
        const packageId = moveCall.package || moveCall.packageId || '';
        const module = moveCall.module || '';
        const functionName = moveCall.function || moveCall.target?.split('::')[2] || '';
        
        if (packageId && module && functionName) {
          return `${packageId}::${module}::${functionName}`;
        } else if (moveCall.target) {
          return moveCall.target;
        }
      }
    }
  }
  
  // Try to find in transaction input
  if (tx.transaction?.data?.input) {
    for (const input of tx.transaction.data.input) {
      if (input.type === 'moveCall' || input.kind === 'MoveCall') {
        const moveCall = input.value || input;
        if (moveCall.target || moveCall.function) {
          return moveCall.target || `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
        }
      }
    }
  }
  
  return null;
}

/**
 * Check coin's transaction history
 */
async function checkCoinHistory(coinId: string): Promise<void> {
  console.log('\n📜 Checking coin transaction history...\n');
  
  try {
    const coin = await client.getObject({
      id: coinId,
      options: {
        showContent: true,
        showOwner: true,
        showPreviousTransaction: true,
      },
    });
    
    if (!coin.data) {
      console.log('   ❌ Coin not found');
      return;
    }
    
    console.log(`   💰 Coin: ${coinId.substring(0, 10)}...`);
    console.log(`   📊 Version: ${coin.data.version}`);
    console.log(`   📊 Previous TX: ${coin.data.previousTransaction || 'none'}`);
    
    // Try to get recent transactions for the admin wallet
    console.log('\n   🔍 Checking admin wallet transaction history...');
    
    // Note: Sui doesn't have a direct "get transactions by address" API
    // But we can check the coin's previous transaction
    if (coin.data.previousTransaction) {
      console.log(`   🔍 Querying previous transaction: ${coin.data.previousTransaction}`);
      try {
        const prevTx = await queryTransactionDetails(coin.data.previousTransaction);
        if (prevTx) {
          console.log(`   ✅ Found previous transaction: ${coin.data.previousTransaction}`);
          const funcName = extractFunctionName(prevTx);
          if (funcName) {
            console.log(`   📋 Function: ${funcName}`);
            
            // Identify service based on function
            if (funcName.includes('tournaments::admin_set_distribution_status')) {
              console.log('   🎯 Service: Tournament Scheduler');
              console.log('   📍 File: backend/lib/services/tournament-scheduler.ts');
              console.log('   🔧 Method: setDistributionStatusBatch()');
            } else if (funcName.includes('achievement_system::add_milestone_definition_entry')) {
              console.log('   🎯 Service: Milestone Migration Script');
              console.log('   📍 File: backend/scripts/migrate-milestones.ts');
              console.log('   🔧 Method: addMilestoneDefinitionsBatch()');
            } else if (funcName.includes('achievement_system::claim_milestone')) {
              console.log('   🎯 Service: Achievement Service');
              console.log('   📍 File: backend/lib/sui/achievement-service.ts');
              console.log('   🔧 Method: markMilestoneClaimed()');
            } else if (funcName.includes('game_pass::add_free_credits')) {
              console.log('   🎯 Service: Achievement Service');
              console.log('   📍 File: backend/lib/sui/achievement-service.ts');
              console.log('   🔧 Method: addCreditsToPlayer()');
            } else if (funcName.includes('premium_store::consume_items')) {
              console.log('   🎯 Service: Store Service');
              console.log('   📍 File: backend/lib/sui/store-service.ts');
              console.log('   🔧 Method: consumeItems()');
            } else {
              console.log('   ⚠️  Unknown function - check Sui Explorer for details');
            }
            
            // Show transaction timestamp if available
            if (prevTx.timestampMs) {
              const timestamp = new Date(Number(prevTx.timestampMs));
              console.log(`   🕐 Timestamp: ${timestamp.toISOString()}`);
            }
          } else {
            console.log('   ⚠️  Could not extract function name');
          }
        }
      } catch (error) {
        if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Could not find'))) {
          console.log(`   ⚠️  Previous transaction also pruned: ${coin.data.previousTransaction}`);
        } else {
          console.log(`   ❌ Error querying previous transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze based on context and timing
 */
function analyzeContext(): void {
  console.log('\n🔍 Contextual Analysis:\n');
  
  console.log('   📋 Known Information:');
  console.log('      - Two transactions locked the same coin');
  console.log('      - Both transactions were pruned (deleted after ~1 day)');
  console.log('      - Coin version: 696136829');
  console.log('      - Admin wallet: ' + ADMIN_WALLET);
  console.log('');
  
  console.log('   🎯 Likely Scenarios:');
  console.log('');
  
  console.log('   1. Tournament Scheduler (MOST LIKELY):');
  console.log('      - Function: setDistributionStatusBatch()');
  console.log('      - Operation: Setting tournament distribution status to "no participants"');
  console.log('      - Evidence: User reported scheduler status changes locked coins');
  console.log('      - Location: backend/lib/services/tournament-scheduler.ts');
  console.log('      - Move call: tournaments::admin_set_distribution_status');
  console.log('');
  
  console.log('   2. Milestone Migration Script:');
  console.log('      - Function: addMilestoneDefinitionsBatch()');
  console.log('      - Operation: Adding milestone definitions to AchievementRegistry');
  console.log('      - Evidence: Script was running around the same time');
  console.log('      - Location: backend/scripts/migrate-milestones.ts');
  console.log('      - Move call: achievement_system::add_milestone_definition_entry');
  console.log('');
  
  console.log('   3. Achievement Service:');
  console.log('      - Function: addCreditsToPlayer() or markMilestoneClaimed()');
  console.log('      - Operation: Adding credits or marking milestones');
  console.log('      - Location: backend/lib/sui/achievement-service.ts');
  console.log('      - Move calls: game_pass::add_free_credits or achievement_system::claim_milestone');
  console.log('');
  
  console.log('   💡 How to Identify:');
  console.log('      - Check server logs around the time coin was locked');
  console.log('      - Look for transaction digests in logs');
  console.log('      - Check Sui Explorer for admin wallet activity');
  console.log('      - Review tournament scheduler logs for status changes');
}

/**
 * Check Sui Explorer links
 */
function showExplorerLinks(): void {
  console.log('\n🌐 Sui Explorer Links:\n');
  
  console.log('   Admin Wallet Activity:');
  console.log(`   https://suiexplorer.com/address/${ADMIN_WALLET}?network=${network}`);
  console.log('');
  
  console.log('   Transaction Details:');
  for (const txDigest of STUCK_TRANSACTIONS) {
    console.log(`   https://suiexplorer.com/txblock/${txDigest}?network=${network}`);
  }
  console.log('');
  
  console.log('   Locked Coin:');
  console.log(`   https://suiexplorer.com/object/${LOCKED_COIN_ID}?network=${network}`);
  console.log('');
}

/**
 * Main analysis function
 */
async function analyzeLockedTransactions() {
  console.log('🔍 Analyzing Locked Transactions');
  console.log('='.repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Admin Wallet: ${ADMIN_WALLET}`);
  console.log(`Locked Coin: ${LOCKED_COIN_ID}`);
  console.log('='.repeat(60));
  
  // Try to query each transaction
  console.log('\n📋 Attempting to Query Transactions:\n');
  
  for (const txDigest of STUCK_TRANSACTIONS) {
    console.log(`\n🔍 Transaction: ${txDigest}`);
    console.log('-'.repeat(60));
    
    let tx;
    try {
      tx = await queryTransactionDetails(txDigest);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Could not find'))) {
        console.log('   ⚠️  Transaction NOT FOUND (pruned or never existed)');
        console.log('   💡 Transaction data is only kept for ~1 day on Sui');
        continue;
      }
      throw error;
    }
    
    if (!tx) {
      console.log('   ⚠️  Transaction NOT FOUND (pruned or never existed)');
      console.log('   💡 Transaction data is only kept for ~1 day on Sui');
      continue;
    }
    
    console.log('   ✅ Transaction found!');
    console.log(`   📊 Status: ${tx.effects?.status?.status || 'unknown'}`);
    
    // Extract function name
    const funcName = extractFunctionName(tx);
    if (funcName) {
      console.log(`   📋 Function Called: ${funcName}`);
      
      // Parse function to identify service
      if (funcName.includes('tournaments::admin_set_distribution_status')) {
        console.log('   🎯 Service: Tournament Scheduler');
        console.log('   📍 File: backend/lib/services/tournament-scheduler.ts');
        console.log('   🔧 Method: setDistributionStatusBatch()');
      } else if (funcName.includes('achievement_system::add_milestone_definition_entry')) {
        console.log('   🎯 Service: Milestone Migration Script');
        console.log('   📍 File: backend/scripts/migrate-milestones.ts');
        console.log('   🔧 Method: addMilestoneDefinitionsBatch()');
      } else if (funcName.includes('achievement_system::claim_milestone')) {
        console.log('   🎯 Service: Achievement Service');
        console.log('   📍 File: backend/lib/sui/achievement-service.ts');
        console.log('   🔧 Method: markMilestoneClaimed()');
      } else if (funcName.includes('game_pass::add_free_credits')) {
        console.log('   🎯 Service: Achievement Service');
        console.log('   📍 File: backend/lib/sui/achievement-service.ts');
        console.log('   🔧 Method: addCreditsToPlayer()');
      } else {
        console.log('   ⚠️  Unknown function - check Sui Explorer for details');
      }
    } else {
      console.log('   ⚠️  Could not extract function name from transaction');
    }
    
    // Show transaction input if available
    if (tx.transaction?.data) {
      console.log('\n   📋 Transaction Input (first 500 chars):');
      const inputStr = JSON.stringify(tx.transaction.data, null, 2);
      console.log('   ' + inputStr.substring(0, 500) + (inputStr.length > 500 ? '...' : ''));
    }
    
    // Show effects
    if (tx.effects?.status?.error) {
      console.log(`\n   ❌ Error: ${tx.effects.status.error}`);
    }
  }
  
  // Check coin history
  await checkCoinHistory(LOCKED_COIN_ID);
  
  // Contextual analysis
  analyzeContext();
  
  // Show explorer links
  showExplorerLinks();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log('\n💡 Most Likely Cause:');
  console.log('   Based on user reports, the tournament scheduler\'s');
  console.log('   setDistributionStatusBatch() function is the most likely');
  console.log('   culprit. It was setting tournament status to "no participants"');
  console.log('   and not waiting for transaction finalization.');
  console.log('\n✅ Fix Applied:');
  console.log('   Tournament scheduler now has retry logic and finalization wait.');
  console.log('   This should prevent future coin locks.');
}

// Run the analysis
analyzeLockedTransactions().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

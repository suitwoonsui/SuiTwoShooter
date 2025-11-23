// ==========================================
// Badge Migration Script
// ==========================================
// Migrates badges from old contract to new contract
// Reads all badges from old contract and creates new badges in new contract

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '../config/config';
import { getAdminWalletService } from '../lib/sui/admin-wallet-service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

interface OldBadgeData {
  badgeId: string;
  owner: string;
  tier: number;
  gamesPlayed: number;
  mintDate: number;
  lastUpdated: number;
  imageData: Uint8Array;
  type: string;
}

/**
 * Read badge data from old contract
 */
async function readOldBadge(
  client: SuiClient,
  oldPackageId: string,
  badgeId: string
): Promise<OldBadgeData | null> {
  try {
    const badgeObject = await client.getObject({
      id: badgeId,
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
      },
    });

    if (!badgeObject.data || !badgeObject.data.content) {
      console.log(`   ⚠️  Badge object not found or has no content: ${badgeId}`);
      return null;
    }

    const type = badgeObject.data.type || '';
    if (!type.includes('badge_system::EarlySupporterBadge')) {
      console.log(`   ⚠️  Object is not a badge: ${type}`);
      return null;
    }

    const fields = (badgeObject.data.content as any).fields;
    if (!fields) {
      console.log(`   ⚠️  Badge has no fields: ${badgeId}`);
      return null;
    }

    // Extract badge data
    const owner = fields.owner || '';
    const tier = parseInt(fields.tier || '0', 10);
    const gamesPlayed = parseInt(fields.games_played || '0', 10);
    const mintDate = parseInt(fields.mint_date || '0', 10);
    const lastUpdated = parseInt(fields.last_updated || '0', 10);
    
    // Extract image data (vector<u8>)
    let imageData = new Uint8Array(0);
    if (fields.image_data) {
      if (Array.isArray(fields.image_data)) {
        imageData = new Uint8Array(fields.image_data);
      } else if (typeof fields.image_data === 'string') {
        // If it's a hex string, convert it
        const hex = fields.image_data.replace('0x', '');
        imageData = new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      }
    }

    return {
      badgeId,
      owner,
      tier,
      gamesPlayed,
      mintDate,
      lastUpdated,
      imageData,
      type,
    };
  } catch (error) {
    console.error(`   ❌ Error reading badge ${badgeId}:`, error);
    return null;
  }
}

/**
 * Find all badges from old contract
 */
async function findAllOldBadges(
  client: SuiClient,
  oldPackageId: string,
  oldRegistryId: string
): Promise<OldBadgeData[]> {
  console.log('🔍 Finding all badges from old contract...');
  console.log(`   Old Package ID: ${oldPackageId}`);
  console.log(`   Old Registry ID: ${oldRegistryId}`);
  console.log('');

  const badges: OldBadgeData[] = [];

  try {
    // Try to read the old registry to get all badge IDs
    const registryObject = await client.getObject({
      id: oldRegistryId,
      options: {
        showType: true,
        showContent: true,
      },
    });

    if (registryObject.data && registryObject.data.content) {
      const fields = (registryObject.data.content as any).fields;
      if (fields && fields.badges) {
        // The badges table contains address -> ID mappings
        // We need to iterate through it, but Sui tables aren't directly queryable
        // So we'll need to query by events or use a different approach
        console.log('   📋 Old registry found, but tables cannot be directly queried');
        console.log('   💡 Will search for badges by querying events...');
      }
    }

    // Alternative: Query BadgeMinted events from old contract
    console.log('   🔍 Querying BadgeMinted events from old contract...');
    
    // Get all BadgeMinted events
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: oldPackageId,
          module: 'badge_system',
        },
      },
      limit: 1000, // Adjust as needed
      order: 'ascending',
    });

    console.log(`   📋 Found ${events.data.length} BadgeMinted events`);

    // Extract badge IDs from events
    const badgeIds = new Set<string>();
    for (const event of events.data) {
      if (event.parsedJson) {
        const badgeId = (event.parsedJson as any).badge_id;
        if (badgeId) {
          badgeIds.add(badgeId);
        }
      }
    }

    console.log(`   📋 Found ${badgeIds.size} unique badge IDs from events`);
    console.log('');

    // Read each badge
    for (const badgeId of badgeIds) {
      console.log(`   🔍 Reading badge: ${badgeId}`);
      const badgeData = await readOldBadge(client, oldPackageId, badgeId);
      if (badgeData) {
        badges.push(badgeData);
        console.log(`   ✅ Badge data extracted:`);
        console.log(`      Owner: ${badgeData.owner}`);
        console.log(`      Tier: ${badgeData.tier}`);
        console.log(`      Games Played: ${badgeData.gamesPlayed}`);
        console.log(`      Mint Date: ${new Date(badgeData.mintDate).toISOString()}`);
        console.log(`      Image Data: ${badgeData.imageData.length} bytes`);
      }
      console.log('');
    }

    return badges;
  } catch (error) {
    console.error('❌ Error finding old badges:', error);
    return [];
  }
}

/**
 * Migrate a single badge using admin_mint_badge
 * NOTE: This creates the badge in admin wallet, not player wallet
 * For proper migration, players should use migrate_badge function themselves
 */
async function migrateBadgeAdmin(
  client: SuiClient,
  config: ReturnType<typeof getConfig>,
  adminWallet: ReturnType<typeof getAdminWalletService>,
  badgeData: OldBadgeData
): Promise<{ success: boolean; digest?: string; error?: string }> {
  try {
    const packageId = config.contracts.gameScore;
    const registryId = config.contracts.badgeRegistry;
    const statsRegistryId = config.contracts.statisticsRegistry;
    const adminCapabilityId = config.contracts.adminCapability;

    if (!packageId || !registryId || !statsRegistryId || !adminCapabilityId) {
      return {
        success: false,
        error: 'Missing required contract IDs in config',
      };
    }

    // Load badge image
    const badgeService = (await import('../lib/sui/badge-service')).BadgeService;
    const badgeServiceInstance = new badgeService();
    const imageData = badgeData.imageData.length > 0 
      ? badgeData.imageData 
      : await badgeServiceInstance.loadBadgeImage(badgeData.tier);

    // Create BadgeImageData object using chunked upload (if >14KB) or direct (if ≤14KB)
    const CHUNK_THRESHOLD = 14 * 1024; // 14KB
    let imageDataObjectId: string;
    const chunkSize = 14 * 1024; // 14KB chunks
    
    if (imageData.length > CHUNK_THRESHOLD) {
      console.log(`   📦 Using chunked upload for ${imageData.length} bytes...`);
      
      // Step 1: Create empty BadgeImageData object
      const txb1 = new Transaction();
      const imageDataObj = txb1.moveCall({
        target: `${packageId}::badge_system::create_empty_image_data`,
        arguments: [],
      });
      txb1.transferObjects([imageDataObj], adminWallet.getAddress());
      txb1.setGasBudget(config.sui.gasBudget);

      const result1 = await client.signAndExecuteTransaction({
        signer: adminWallet.getKeypair(),
        transaction: txb1,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result1.effects?.status?.status !== 'success') {
        return {
          success: false,
          error: `Failed to create empty BadgeImageData object: ${result1.effects?.status?.error || 'Unknown error'}`,
        };
      }

      const createdObjects = result1.objectChanges?.filter(
        (change: any) => change.type === 'created' && change.objectType?.includes('BadgeImageData')
      );
      
      if (!createdObjects || createdObjects.length === 0) {
        return {
          success: false,
          error: 'Failed to get BadgeImageData object ID from transaction',
        };
      }

      imageDataObjectId = (createdObjects[0] as any).objectId;
      console.log(`   ✅ Created BadgeImageData object: ${imageDataObjectId}`);

      // Step 2: Upload image in chunks
      const totalChunks = Math.ceil(imageData.length / chunkSize);
      console.log(`   📦 Uploading ${totalChunks} chunk(s)...`);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, imageData.length);
        const chunk = imageData.slice(start, end);
        
        console.log(`   📦 Uploading chunk ${i + 1}/${totalChunks} (${chunk.length} bytes)...`);

        const txb = new Transaction();
        txb.moveCall({
          target: `${packageId}::badge_system::append_image_chunk`,
          arguments: [
            txb.object(imageDataObjectId),
            txb.pure.vector('u8', Array.from(chunk)),
          ],
        });
        txb.setGasBudget(config.sui.gasBudget);

        const result = await client.signAndExecuteTransaction({
          signer: adminWallet.getKeypair(),
          transaction: txb,
          options: {
            showEffects: true,
          },
        });

        if (result.effects?.status?.status !== 'success') {
          return {
            success: false,
            error: `Failed to append chunk ${i + 1}: ${result.effects?.status?.error || 'Unknown error'}`,
          };
        }

        console.log(`   ✅ Chunk ${i + 1}/${totalChunks} uploaded successfully`);
      }

      console.log(`   ✅ All chunks uploaded. Image object ready.`);
    } else {
      console.log(`   📦 Using direct upload for ${imageData.length} bytes...`);
      // Create directly in a single transaction
      const txbCreate = new Transaction();
      const imageDataObj = txbCreate.moveCall({
        target: `${packageId}::badge_system::create_image_data_small`,
        arguments: [
          txbCreate.pure.vector('u8', Array.from(imageData)),
        ],
      });
      txbCreate.transferObjects([imageDataObj], adminWallet.getAddress());
      txbCreate.setGasBudget(config.sui.gasBudget);

      const resultCreate = await client.signAndExecuteTransaction({
        signer: adminWallet.getKeypair(),
        transaction: txbCreate,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (resultCreate.effects?.status?.status !== 'success') {
        return {
          success: false,
          error: `Failed to create BadgeImageData object: ${resultCreate.effects?.status?.error || 'Unknown error'}`,
        };
      }

      const createdObjects = resultCreate.objectChanges?.filter(
        (change: any) => change.type === 'created' && change.objectType?.includes('BadgeImageData')
      );
      
      if (!createdObjects || createdObjects.length === 0) {
        return {
          success: false,
          error: 'Failed to get BadgeImageData object ID from transaction',
        };
      }

      imageDataObjectId = (createdObjects[0] as any).objectId;
      console.log(`   ✅ Created BadgeImageData object: ${imageDataObjectId}`);
    }

    // Build mint transaction with pre-populated image object
    const txb = new Transaction();
    
    txb.moveCall({
      target: `${packageId}::badge_system::admin_mint_badge`,
      arguments: [
        txb.object(adminCapabilityId),
        txb.object(registryId),
        txb.object(statsRegistryId),
        txb.object('0x6'), // Clock object
        txb.pure.address(badgeData.owner),
        txb.pure.u8(badgeData.tier),
        txb.object(imageDataObjectId), // Pre-populated BadgeImageData object
      ],
    });

    txb.setGasBudget(config.sui.gasBudget);

    console.log(`   🔄 Migrating badge for ${badgeData.owner}...`);

    // Sign and execute
    const keypair = adminWallet.getKeypair();
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    if (result.effects?.status?.status === 'success') {
      console.log(`   ✅ Badge migrated successfully: ${result.digest}`);
      return {
        success: true,
        digest: result.digest,
      };
    } else {
      return {
        success: false,
        error: result.effects?.status?.error || 'Transaction failed',
      };
    }
  } catch (error) {
    console.error(`   ❌ Error migrating badge:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main migration function
 */
async function migrateBadges() {
  console.log('═══════════════════════════════════════');
  console.log('🔄 BADGE MIGRATION SCRIPT');
  console.log('═══════════════════════════════════════\n');

  const config = getConfig();
  const adminWallet = getAdminWalletService();
  const client = new SuiClient({
    url: getFullnodeUrl(config.sui.network as 'testnet' | 'mainnet' | 'devnet'),
  });

  // Get old contract IDs from environment or user input
  const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
  const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;

  if (!oldPackageId || !oldRegistryId) {
    console.error('❌ Missing old contract IDs in environment variables:');
    console.error('   Required: OLD_GAME_SCORE_CONTRACT_TESTNET (or OLD_GAME_SCORE_CONTRACT)');
    console.error('   Required: OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET (or OLD_BADGE_REGISTRY_OBJECT_ID)');
    console.error('');
    console.error('💡 Add these to your .env.local file:');
    console.error('   OLD_GAME_SCORE_CONTRACT_TESTNET=0x...');
    console.error('   OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=0x...');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Old Package ID: ${oldPackageId}`);
  console.log(`   Old Registry ID: ${oldRegistryId}`);
  console.log(`   New Package ID: ${config.contracts.gameScore}`);
  console.log(`   New Registry ID: ${config.contracts.badgeRegistry}`);
  console.log('');

  // Find all old badges
  const oldBadges = await findAllOldBadges(client, oldPackageId, oldRegistryId);

  if (oldBadges.length === 0) {
    console.log('✅ No badges found to migrate.');
    return;
  }

  console.log(`\n📋 Found ${oldBadges.length} badges to migrate\n`);
  console.log('⚠️  IMPORTANT: Soulbound badges CANNOT be migrated via admin functions!');
  console.log('   Admin functions create badges in the admin wallet, which breaks soulbound behavior.');
  console.log('   Players MUST use the migrate_badge function to migrate their own badges.');
  console.log('');
  console.log('📋 Migration Data Extracted:');
  console.log('   Use this data to help players migrate via the migrate_badge function.');
  console.log('   Each player needs to sign a transaction to create the badge in their wallet.\n');

  // Display migration data for each badge
  console.log('═══════════════════════════════════════');
  console.log('📋 MIGRATION DATA');
  console.log('═══════════════════════════════════════\n');

  for (let i = 0; i < oldBadges.length; i++) {
    const badge = oldBadges[i];
    console.log(`Badge ${i + 1}:`);
    console.log(`   Owner: ${badge.owner}`);
    console.log(`   Old Tier: ${badge.tier}`);
    console.log(`   Old Games Played: ${badge.gamesPlayed}`);
    console.log(`   Old Mint Date: ${badge.mintDate} (${new Date(badge.mintDate).toISOString()})`);
    console.log(`   Image Data: ${badge.imageData.length} bytes`);
    console.log(`   Old Badge ID: ${badge.badgeId}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log('📝 NEXT STEPS');
  console.log('═══════════════════════════════════════');
  console.log('1. Create an API endpoint that provides migration data to players');
  console.log('2. Players call the endpoint to get their old badge data');
  console.log('3. Players use buildMigrateBadgeTransaction() to build the migration transaction');
  console.log('4. Players sign and execute the transaction (badge created in their wallet)');
  console.log('');
  console.log('💡 See BADGE_MIGRATION_GUIDE.md for implementation details.');
  console.log('');
}

// Run migration
if (require.main === module) {
  migrateBadges().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

export { migrateBadges, findAllOldBadges, readOldBadge };


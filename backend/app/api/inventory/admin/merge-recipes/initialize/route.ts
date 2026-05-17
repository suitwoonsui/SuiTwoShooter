// ==========================================
// Inventory Merge Recipes Initialization (Admin)
// Registers Reservoir merge recipes (3→1 and optional hyper 9→1) for leveled store items.
// On-chain: `reservoir::register_merge_recipe` (requires CorridorAdminCap).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { buildBatchViaChannel, platformTxClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { DEFAULT_PROVISIONS_SEED } from '@/lib/services/store/catalog/provisions';
import { resolveProvisionItemType } from '@/lib/services/store/catalog/item-id';
import { getCatalogBuildOverrides } from '@/lib/services/platform/client/platform-client';
import { bcs } from '@mysten/bcs';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function deriveReservoirRecipeId(params: { itemType: number; sourceLevel: number; targetLevel: number; isHyperMerge: boolean }): string {
  const { itemType, sourceLevel, targetLevel, isHyperMerge } = params;
  const path = `${sourceLevel}->${targetLevel}`;
  return `inventory_merge:itemType=${itemType}:path=${path}${isHyperMerge ? ':hyper' : ''}`;
}

function aquiferMergeRecipeKey(recipeId: string): string {
  return `reservoir_merge_recipe:${recipeId}`;
}

const BalanceQtyBcs = bcs.struct('BalanceQty', {
  balance_key: bcs.vector(bcs.u8()),
  qty: bcs.u64(),
});

const MergeRecipeBcs = bcs.struct('MergeRecipe', {
  inputs: bcs.vector(BalanceQtyBcs),
  outputs: bcs.vector(BalanceQtyBcs),
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = await getRequestBody<{
    adminWalletAddress?: string;
    includeHyper?: boolean;
    gasBudgetMist?: number;
    ecosystemId?: string;
    appId?: string;
  }>(request);

  if (!hasApiKey) {
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = body.adminWalletAddress?.toLowerCase();
    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Valid API key or admin wallet address required.');
    }
  }

  const includeHyper = body.includeHyper !== false;
  const gasBudgetMist = typeof body.gasBudgetMist === 'number' && body.gasBudgetMist > 0 ? body.gasBudgetMist : 250_000_000;
  const adminId = getAdminIdentifier(request);

  const adminWallet = getAdminWalletService();
  const platformOptions = buildPlatformCallOptions(request, body);
  const overrides = getCatalogBuildOverrides();
  const corridorAdminCapId = overrides.catalogAdminCapId;

  if (!corridorAdminCapId?.trim()?.startsWith('0x')) {
    throw new PlatformError(
      PlatformErrorCode.CONFIG_MISSING,
      'Game contract config missing CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (CorridorAdminCap required to register merge recipes). Set it in config/contracts.<network>.json.'
    );
  }

  // Build a set of recipes for leveled items (3 levels). Source of truth: Aquifer definitions.
  const leveledItemIds = Object.entries(DEFAULT_PROVISIONS_SEED)
    .filter(([, item]) => Array.isArray(item.levels) && item.levels.length >= 3)
    .map(([id]) => id);

  const recipes: Array<{
    itemId: string;
    recipeId: string;
    inputKeys: string[];
    inputQuantities: number[];
    outputKeys: string[];
    outputQuantities: number[];
  }> = [];

  for (const itemId of leveledItemIds) {
    const contractItemType = resolveProvisionItemType(itemId);
    if (contractItemType === undefined) continue;

    // Standard merges: L1->L2 and L2->L3 (3 in -> 1 out)
    recipes.push({
      itemId,
      recipeId: deriveReservoirRecipeId({ itemType: contractItemType, sourceLevel: 1, targetLevel: 2, isHyperMerge: false }),
      inputKeys: [`${itemId}_1`],
      inputQuantities: [3],
      outputKeys: [`${itemId}_2`],
      outputQuantities: [1],
    });
    recipes.push({
      itemId,
      recipeId: deriveReservoirRecipeId({ itemType: contractItemType, sourceLevel: 2, targetLevel: 3, isHyperMerge: false }),
      inputKeys: [`${itemId}_2`],
      inputQuantities: [3],
      outputKeys: [`${itemId}_3`],
      outputQuantities: [1],
    });

    // Hyper merge: L1->L3 (9 in -> 1 out)
    if (includeHyper) {
      recipes.push({
        itemId,
        recipeId: deriveReservoirRecipeId({ itemType: contractItemType, sourceLevel: 1, targetLevel: 3, isHyperMerge: true }),
        inputKeys: [`${itemId}_1`],
        inputQuantities: [9],
        outputKeys: [`${itemId}_3`],
        outputQuantities: [1],
      });
    }
  }

  PlatformLogger.info('Admin merge recipe initialization request', {
    adminId,
    includeHyper,
    recipeCount: recipes.length,
    gasBudgetMist,
  });

  const digests: string[] = [];
  const results: Array<{ recipeId: string; itemId: string; digest?: string; success: boolean; error?: string }> = [];

  for (const r of recipes) {
    const key = aquiferMergeRecipeKey(r.recipeId);
    const valueBytes = MergeRecipeBcs.serialize({
      inputs: r.inputKeys.map((k, i) => ({
        balance_key: Array.from(new TextEncoder().encode(k)),
        qty: BigInt(r.inputQuantities[i]),
      })),
      outputs: r.outputKeys.map((k, i) => ({
        balance_key: Array.from(new TextEncoder().encode(k)),
        qty: BigInt(r.outputQuantities[i]),
      })),
    }).toBytes();
    const value = Buffer.from(valueBytes).toString('base64');

    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'aquifer-set-definition',
            params: {
              key,
              value,
              corridorAdminCapabilityObjectId: corridorAdminCapId,
              senderAddress: adminWallet.getAddress(),
              gasBudgetMist,
            },
          },
        ],
      },
      platformOptions
    );

    if (!build.success || !build.transactions?.length) {
      const msg = build.error || build.errors?.[0] || 'Failed to build transaction';
      results.push({ recipeId: r.recipeId, itemId: r.itemId, success: false, error: msg });
      continue;
    }

    const transactionBase64 = build.transactions[0];
    const txBytes = Buffer.from(transactionBase64, 'base64');
    const signed = await adminWallet.getKeypair().signTransaction(txBytes);
    const signature = typeof signed === 'object' && signed !== null && 'signature' in signed ? (signed as { signature: string }).signature : String(signed);

    const exec = await platformTxClient.executeSigned({ transactionBytesBase64: transactionBase64, signature }, platformOptions);
    if (!exec.success) {
      results.push({ recipeId: r.recipeId, itemId: r.itemId, success: false, error: exec.error || 'Execution failed' });
      continue;
    }
    if (exec.digest) digests.push(exec.digest);
    results.push({ recipeId: r.recipeId, itemId: r.itemId, digest: exec.digest, success: true });
  }

  const ok = results.filter((x) => x.success).length;
  const failed = results.length - ok;

  return {
    success: failed === 0,
    message: failed === 0 ? `Saved ${ok} merge recipes to Aquifer.` : `Saved ${ok} merge recipes to Aquifer; ${failed} failed.`,
    digests,
    results,
  };
});


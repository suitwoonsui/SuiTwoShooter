// ==========================================
// Inventory Merge Recipe Definition (Admin)
// Source of truth: Aquifer definition storage (compressed base64 JSON).
// Also syncs the recipe to Reservoir (register_merge_recipe) so player merges can execute.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  buildBatchViaChannel,
  platformTxClient,
  buildPlatformCallOptions,
} from '@/lib/services/platform/client/platform-client';
import { getCatalogBuildOverrides } from '@/lib/services/platform/client/platform-client';
import { bcs } from '@mysten/bcs';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function aquiferMergeRecipeKey(recipeId: string): string {
  // Aquifer keys are app-defined. Prefix makes it easy to filter/list.
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
    recipeId: string;
    inputKeys: string[];
    inputQuantities: number[];
    outputKeys: string[];
    outputQuantities: number[];
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

  const recipeId = String(body.recipeId || '').trim();
  if (!recipeId) throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'recipeId is required');

  const inputKeys = Array.isArray(body.inputKeys) ? body.inputKeys.map((s) => String(s).trim()).filter(Boolean) : [];
  const outputKeys = Array.isArray(body.outputKeys) ? body.outputKeys.map((s) => String(s).trim()).filter(Boolean) : [];
  const inputQuantities = Array.isArray(body.inputQuantities) ? body.inputQuantities.map((n) => Number(n)) : [];
  const outputQuantities = Array.isArray(body.outputQuantities) ? body.outputQuantities.map((n) => Number(n)) : [];

  if (inputKeys.length < 1 || inputKeys.length !== inputQuantities.length) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'inputKeys and inputQuantities must be arrays of equal length (>= 1)');
  }
  if (outputKeys.length < 1 || outputKeys.length !== outputQuantities.length) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'outputKeys and outputQuantities must be arrays of equal length (>= 1)');
  }
  if (inputQuantities.some((q) => !Number.isInteger(q) || q <= 0)) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'inputQuantities must be positive integers');
  }
  if (outputQuantities.some((q) => !Number.isInteger(q) || q <= 0)) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'outputQuantities must be positive integers');
  }

  const adminId = getAdminIdentifier(request);
  const gasBudgetMist = typeof body.gasBudgetMist === 'number' && body.gasBudgetMist > 0 ? body.gasBudgetMist : 250_000_000;

  const overrides = getCatalogBuildOverrides();
  const corridorAdminCapId = overrides.catalogAdminCapId;
  if (!corridorAdminCapId?.trim()?.startsWith('0x')) {
    throw new PlatformError(
      PlatformErrorCode.CONFIG_MISSING,
      'Game contract config missing CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET (CorridorAdminCap required to write Aquifer definitions). Set it in config/contracts.<network>.json.'
    );
  }

  const key = aquiferMergeRecipeKey(recipeId);
  // Store as BCS bytes of `reservoir::MergeRecipe` (inputs/outputs with balance_key bytes + qty).
  // This allows the on-chain merge to read the recipe from Aquifer without JSON parsing.
  const valueBytes = MergeRecipeBcs.serialize({
    inputs: inputKeys.map((k, i) => ({
      balance_key: Array.from(new TextEncoder().encode(k)),
      qty: BigInt(inputQuantities[i]),
    })),
    outputs: outputKeys.map((k, i) => ({
      balance_key: Array.from(new TextEncoder().encode(k)),
      qty: BigInt(outputQuantities[i]),
    })),
  }).toBytes();
  const value = Buffer.from(valueBytes).toString('base64');

  PlatformLogger.info('Admin define merge recipe (Aquifer)', {
    adminId,
    key,
    recipeId,
    inputCount: inputKeys.length,
    outputCount: outputKeys.length,
  });

  const platformOptions = buildPlatformCallOptions(request, body);
  const adminWallet = getAdminWalletService();
  const senderAddress = adminWallet.getAddress();

  const build = await buildBatchViaChannel(
    {
      operations: [
        {
          operationId: 'aquifer-set-definition',
          params: {
            key,
            value,
            corridorAdminCapabilityObjectId: corridorAdminCapId,
            senderAddress,
            gasBudgetMist,
          },
        },
      ],
    },
    platformOptions
  );

  if (!build.success || !build.transactions?.length) {
    const msg = build.error || build.errors?.[0] || 'Failed to build transaction';
    throw new PlatformError(PlatformErrorCode.TRANSACTION_BUILD_FAILED, msg);
  }

  const digests: string[] = [];
  for (const transactionBytesBase64 of build.transactions) {
    const txBytes = Buffer.from(transactionBytesBase64, 'base64');
    const signed = await adminWallet.getKeypair().signTransaction(txBytes);
    const signature =
      typeof signed === 'object' && signed !== null && 'signature' in signed
        ? (signed as { signature: string }).signature
        : String(signed);
    const exec = await platformTxClient.executeSigned({ transactionBytesBase64, signature }, platformOptions);
    if (!exec.success) {
      throw new PlatformError(PlatformErrorCode.TRANSACTION_FAILED, exec.error || 'Execution failed');
    }
    if (exec.digest) digests.push(exec.digest);
  }

  return { success: true, digest: digests[0], digests, key, recipeId };
});


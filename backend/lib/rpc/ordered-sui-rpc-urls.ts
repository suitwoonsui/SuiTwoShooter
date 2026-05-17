// ==========================================
// Ordered Sui JSON-RPC URLs for server-side failover (game backend).
// Mirrors Aqueduct Platform config-base.buildOrderedSuiRpcUrls behavior.
// ==========================================

import { getContractConfig, pick } from '@/config/contract-config';

const DEFAULT_TESTNET_RPC_FALLBACKS = [
  'https://sui-testnet-rpc.publicnode.com',
  'https://sui-testnet.api.onfinality.io/public',
];

function normalizeRpcUrl(u: string): string {
  return u.trim().replace(/\/+$/, '') || u.trim();
}

function parseCommaRpcList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => normalizeRpcUrl(s)).filter(Boolean);
}

function primaryForNetwork(network: 'testnet' | 'mainnet'): string {
  const cfg = getContractConfig(network);
  if (network === 'mainnet') {
    return (
      pick(cfg, 'SUI_MAINNET_RPC_URL') ||
      process.env.SUI_MAINNET_RPC_URL ||
      'https://fullnode.mainnet.sui.io:443'
    ).trim();
  }
  return (
    pick(cfg, 'SUI_TESTNET_RPC_URL') ||
    process.env.SUI_TESTNET_RPC_URL ||
    process.env.SUI_TESTET_RPC_URL ||
    'https://fullnode.testnet.sui.io:443'
  ).trim();
}

/**
 * Primary first, then env fallbacks, then default testnet mirrors (unless disabled).
 */
export function buildOrderedSuiRpcUrlsForNetwork(network: 'testnet' | 'mainnet'): string[] {
  const primaryRaw = primaryForNetwork(network);
  const primary = normalizeRpcUrl(primaryRaw);
  const fromGeneric = parseCommaRpcList(process.env.SUI_RPC_FALLBACK_URLS);
  const fromNetwork =
    network === 'testnet'
      ? parseCommaRpcList(process.env.SUI_TESTNET_RPC_FALLBACK_URLS)
      : parseCommaRpcList(process.env.SUI_MAINNET_RPC_FALLBACK_URLS);
  const envExtras = fromGeneric.length ? fromGeneric : fromNetwork;
  const defaultsDisabled =
    process.env.SUI_DISABLE_DEFAULT_TESTNET_RPC_FALLBACKS === '1' ||
    process.env.SUI_DISABLE_DEFAULT_TESTNET_RPC_FALLBACKS === 'true';
  const defaultExtras =
    network === 'testnet' && !defaultsDisabled
      ? DEFAULT_TESTNET_RPC_FALLBACKS.map(normalizeRpcUrl)
      : [];
  const ordered = [primary, ...envExtras, ...defaultExtras];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of ordered) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out.length ? out : [primary];
}

export function parseSuiJsonRpcNetworkParam(raw: string | null): 'testnet' | 'mainnet' {
  const n = (raw || 'testnet').trim().toLowerCase();
  if (n === 'mainnet') return 'mainnet';
  return 'testnet';
}

// ==========================================
// Game backend: contract IDs from file (CONTRACT_CONFIG_PATH or config/contracts.<network>.json).
// Secrets and non-ID settings may still use .env; contract / on-chain object & package IDs are not
// overridden from process.env (set them in the JSON only).
// ==========================================

/** True for keys that must come from the contract JSON only (no process.env override). */
export function isContractIdConfigKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith('CORRIDOR_') || key.startsWith('OLD_CORRIDOR_')) return true;
  if (key.includes('_CORRIDOR_')) return true;
  if (/_OBJECT_ID|_PACKAGE_ID|_POLICY_ID|REGISTRY_ID|SYSTEM_OBJECT|_CAP_ID|_CAP_OBJECT/i.test(key)) return true;
  return false;
}

import path from 'path';
import fs from 'fs';

export type SuiNetwork = 'testnet' | 'mainnet' | 'devnet';

export type ContractConfigRaw = Record<string, string>;

let cached: { network: SuiNetwork; data: ContractConfigRaw } | null = null;

/**
 * Load config from file. Resolution order:
 * 1. CONTRACT_CONFIG_PATH if set (absolute or relative to cwd)
 * 2. config/contracts.<network>.json relative to __dirname (source config dir)
 * 3. config/contracts.<network>.json relative to process.cwd() (so Next.js dev finds it when cwd is backend)
 * Returns {} if no file found.
 */
export function loadContractConfigFile(network: SuiNetwork): ContractConfigRaw {
  const configDir = path.resolve(__dirname);
  const explicitPath = process.env.CONTRACT_CONFIG_PATH?.trim();
  if (explicitPath) {
    const p = path.isAbsolute(explicitPath) ? explicitPath : path.resolve(process.cwd(), explicitPath);
    if (fs.existsSync(p)) {
      try {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        return typeof raw === 'object' && raw !== null ? flattenToStringValues(raw) : {};
      } catch {
        return {};
      }
    }
    return {};
  }
  const candidatesFor = (n: SuiNetwork) => [
    path.join(configDir, `contracts.${n}.json`),
    path.join(process.cwd(), 'config', `contracts.${n}.json`),
  ];

  const tryLoad = (n: SuiNetwork): ContractConfigRaw | null => {
    for (const filePath of candidatesFor(n)) {
      if (fs.existsSync(filePath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return typeof raw === 'object' && raw !== null ? flattenToStringValues(raw) : {};
        } catch {
          return {};
        }
      }
    }
    return null;
  };

  // Primary: requested network
  const primary = tryLoad(network);
  if (primary != null) return primary;

  // Fallback: some deployments only include testnet config; avoid hard-failing platform identity
  // (corridor cap IDs) when SUI_NETWORK is set incorrectly.
  if (network !== 'testnet') {
    const fallback = tryLoad('testnet');
    if (fallback != null) return fallback;
  }

  return {};
}

function flattenToStringValues(obj: Record<string, unknown>): ContractConfigRaw {
  const out: ContractConfigRaw = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && typeof v === 'string') out[k] = v;
  }
  return out;
}

/**
 * Get merged config for network: file values with process.env override per key (except contract IDs).
 */
export function getContractConfig(network: SuiNetwork): ContractConfigRaw {
  if (cached && cached.network === network) return cached.data;
  const file = loadContractConfigFile(network);
  const merged: ContractConfigRaw = { ...file };
  for (const key of Object.keys(merged)) {
    if (isContractIdConfigKey(key)) continue;
    const envVal = process.env[key];
    if (envVal != null && envVal.trim() !== '') merged[key] = envVal.trim();
  }
  cached = { network, data: merged };
  return merged;
}

export function pick(config: ContractConfigRaw, ...keys: string[]): string {
  for (const k of keys) {
    const v = config[k]?.trim();
    if (v) return v;
  }
  return '';
}

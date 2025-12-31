/**
 * Blockchain utility functions
 * Common blockchain operations and helper functions
 */

import { SuiClient } from '@mysten/sui/client';

/**
 * Convert MIST to SUI with proper formatting
 */
export function mistToSui(mist: bigint | string | number): string {
  const mistNumber = typeof mist === 'bigint' ? Number(mist) : Number(mist);
  const sui = mistNumber / 1_000_000_000;
  return sui.toFixed(4);
}

/**
 * Convert SUI to MIST
 */
export function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * 1_000_000_000));
}

/**
 * Format address for display (shortened)
 */
export function formatAddress(address: string, length: number = 6): string {
  if (!address || address.length < length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Validate if a string is a valid Sui address
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

/**
 * Get network name from RPC URL
 */
export function getNetworkFromUrl(url: string): string {
  if (url.includes('mainnet')) return 'mainnet';
  if (url.includes('testnet')) return 'testnet';
  if (url.includes('devnet')) return 'devnet';
  if (url.includes('127.0.0.1') || url.includes('localhost')) return 'localnet';
  return 'unknown';
}

/**
 * Create a Sui client with error handling
 */
export function createSuiClient(url: string): SuiClient {
  try {
    return new SuiClient({ url });
  } catch (error) {
    console.error('Failed to create Sui client:', error);
    throw new Error(`Failed to create Sui client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Parse transaction events for specific types
 */
export function parseTransactionEvents(
  events: Array<{ type: string; parsedJson?: Record<string, unknown> }>,
  eventType: string
): Record<string, unknown>[] {
  return events
    .filter(event => event.type.includes(eventType))
    .map(event => event.parsedJson || {})
    .filter(Boolean);
}

/**
 * Get transaction status from digest
 */
export async function getTransactionStatus(
  client: SuiClient,
  digest: string
): Promise<'pending' | 'confirmed' | 'failed'> {
  try {
    const txResponse = await client.getTransactionBlock({
      digest,
      options: { showEffects: true, showEvents: true }
    });
    
    if (txResponse.effects?.status?.status === 'success') {
      return 'confirmed';
    } else if (txResponse.effects?.status?.status === 'failure') {
      return 'failed';
    } else {
      return 'pending';
    }
  } catch (error) {
    console.error('Failed to get transaction status:', error);
    return 'pending';
  }
}

// ==========================================
// Badge Queries - Query operations for badge data
// ==========================================

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { BadgeLogger } from '../badge-logger';
import { BadgeError, BadgeErrorCode } from '../badge-errors';
import { BadgeValidators } from '../badge-validators';
import { getBadgeRequestCache } from '../badge-request-cache';

/**
 * Dependencies needed for badge queries
 */
export interface BadgeQueriesDependencies {
  getClient: () => SuiClient;
  getConfig: () => {
    contracts: {
      badgeRegistry?: string;
      gameScore: string;
    };
  };
  getAdminWalletAddress: () => string;
  getBadgeImageUrl: (tier: number) => string;
}

/**
 * Badge Queries Module
 * Handles all badge query operations (hasBadge, getBadge)
 */
export class BadgeQueries {
  private dependencies: BadgeQueriesDependencies;
  private requestCache = getBadgeRequestCache();

  constructor(dependencies: BadgeQueriesDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * Check if player has a badge
   */
  async hasBadge(playerAddress: string): Promise<boolean> {
    const config = this.dependencies.getConfig();
    
    if (!config.contracts.badgeRegistry) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'BadgeRegistry object ID not configured'
      );
    }

    BadgeLogger.debug('Checking if player has badge', { playerAddress });

    try {
      const client = this.dependencies.getClient();
      
      // Use devInspectTransactionBlock to call view function
      const tx = new Transaction();
      tx.moveCall({
        target: `${config.contracts.gameScore}::badge_system::has_badge`,
        arguments: [
          tx.object(config.contracts.badgeRegistry),
          tx.pure.address(playerAddress),
        ],
      });

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.dependencies.getAdminWalletAddress(),
      });

      BadgeLogger.debug('has_badge result structure', {
        hasResults: !!result.results,
        resultsLength: result.results?.length || 0,
      });

      if (result.results && result.results.length > 0) {
        const firstResult = result.results[0];
        const returnValue = firstResult.returnValues?.[0] as any;
        
        if (returnValue) {
          // Parse the actual value
          let actualValue: any = null;
          
          // Strategy: Check returnValue[0][0] (most common pattern)
          if (Array.isArray(returnValue[0]) && returnValue[0].length > 0) {
            actualValue = returnValue[0][0];
          } else if (returnValue[1] === "0" || returnValue[1] === "1" || returnValue[1] === 0 || returnValue[1] === 1) {
            actualValue = returnValue[1];
          }
          
          const hasBadge = actualValue === "1" || actualValue === 1 || actualValue === true;
          
          BadgeLogger.debug('Parsed badge existence', { hasBadge, actualValue });
          
          return hasBadge;
        }
      }

      BadgeLogger.debug('No badge found - returning false');
      return false;
    } catch (error) {
      BadgeLogger.error('Error checking if player has badge', error);
      throw BadgeError.fromUnknown(error, 'Failed to check badge existence');
    }
  }

  /**
   * Get player's badge data
   */
  async getBadge(playerAddress: string): Promise<{
    badgeId: string | null;
    tier: number;
    gamesPlayed: number;
    mintDate: number;
    lastUpdated: number;
    imageUrl?: string;
  } | null> {
    const config = this.dependencies.getConfig();
    
    if (!config.contracts.badgeRegistry) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'BadgeRegistry object ID not configured'
      );
    }

    // Check cache first
    const cached = this.requestCache.get(playerAddress);
    if (cached !== null) {
      BadgeLogger.debug('Returning cached badge data', { playerAddress });
      return cached;
    }

    BadgeLogger.debug('Getting badge data from blockchain', { playerAddress });

    try {
      const client = this.dependencies.getClient();
      
      // Get badge ID from registry
      BadgeLogger.debug('Calling get_badge_id');
      const tx1 = new Transaction();
      tx1.moveCall({
        target: `${config.contracts.gameScore}::badge_system::get_badge_id`,
        arguments: [
          tx1.object(config.contracts.badgeRegistry),
          tx1.pure.address(playerAddress),
        ],
      });

      const result1 = await client.devInspectTransactionBlock({
        transactionBlock: tx1,
        sender: this.dependencies.getAdminWalletAddress(),
      });

      BadgeLogger.debug('get_badge_id devInspect completed', {
        hasResults: !!result1.results,
        resultsLength: result1.results?.length || 0,
      });

      if (!result1.results || !result1.results[0].returnValues?.[0]) {
        BadgeLogger.debug('No badge ID returned from get_badge_id');
        return null;
      }

      const returnValue = result1.results[0].returnValues[0] as any;
      
      BadgeLogger.debug('Raw returnValue from get_badge_id', returnValue);
      
      // Extract badge ID from return value
      let badgeId: string | null = null;
      
      if (Array.isArray(returnValue) && Array.isArray(returnValue[0]) && returnValue[0].length === 32) {
        // Convert byte array to hex string
        const bytes = returnValue[0] as number[];
        const hexString = bytes.map(byte => {
          const hex = byte.toString(16).padStart(2, '0');
          return hex;
        }).join('');
        badgeId = `0x${hexString}`;
        BadgeLogger.debug('Extracted badge ID', { badgeId });
      } else if (Array.isArray(returnValue) && typeof returnValue[1] === 'string' && returnValue[1].startsWith('0x') && returnValue[1].length === 66) {
        // Fallback: if the value is already a valid object ID hex string, use it
        badgeId = returnValue[1];
        BadgeLogger.debug('Using badge ID from value string', { badgeId });
      } else {
        BadgeLogger.error('Could not extract badge ID from returnValue', {
          returnValue,
        });
        return null;
      }
      
      // Get badge data and image URL in parallel (both only need badgeId, independent of each other)
      BadgeLogger.debug('Calling get_badge_data and get_badge_image_url in parallel', { badgeId });
      
      const tx2 = new Transaction();
      tx2.moveCall({
        target: `${config.contracts.gameScore}::badge_system::get_badge_data`,
        arguments: [tx2.object(badgeId)],
      });

      const tx3 = new Transaction();
      tx3.moveCall({
        target: `${config.contracts.gameScore}::badge_system::get_badge_image_url`,
        arguments: [tx3.object(badgeId)],
      });

      // Execute both queries in parallel
      const [result2, result3] = await Promise.all([
        client.devInspectTransactionBlock({
          transactionBlock: tx2,
          sender: this.dependencies.getAdminWalletAddress(),
        }),
        client.devInspectTransactionBlock({
          transactionBlock: tx3,
          sender: this.dependencies.getAdminWalletAddress(),
        }),
      ]);

      BadgeLogger.debug('get_badge_data and get_badge_image_url devInspect completed');

      if (!result2.results || !result2.results[0].returnValues) {
        BadgeLogger.debug('No badge data returned from get_badge_data');
        return null;
      }

      const returnValues = result2.results[0].returnValues;
      
      BadgeLogger.debug('Parsing badge data from returnValues', { length: returnValues.length });
      
      // Helper function to parse u64 from byte array (little-endian)
      const parseU64 = (byteArray: number[]): number => {
        if (!Array.isArray(byteArray) || byteArray.length !== 8) {
          BadgeLogger.error('Invalid u64 byte array', { byteArray });
          return 0;
        }
        // Convert little-endian byte array to number
        let value = 0;
        for (let i = 0; i < 8; i++) {
          value += byteArray[i] * Math.pow(256, i);
        }
        return value;
      };
      
      // Parse tier (u8) - first element of the array
      const tierValue = Array.isArray(returnValues[1][0]) && returnValues[1][0].length > 0
        ? returnValues[1][0][0]
        : 0;
      
      // Parse u64 values (gamesPlayed, mintDate, lastUpdated)
      const gamesPlayedValue = Array.isArray(returnValues[2][0]) && returnValues[2][0].length === 8
        ? parseU64(returnValues[2][0] as number[])
        : 0;
      
      const mintDateValue = Array.isArray(returnValues[3][0]) && returnValues[3][0].length === 8
        ? parseU64(returnValues[3][0] as number[])
        : 0;
      
      const lastUpdatedValue = Array.isArray(returnValues[4][0]) && returnValues[4][0].length === 8
        ? parseU64(returnValues[4][0] as number[])
        : 0;
      
      // Parse image URL from result3
      let imageUrl: string | undefined;
      if (result3.results && result3.results[0]?.returnValues?.[0]) {
        const imageReturnValue = result3.results[0].returnValues[0] as any;
        
        BadgeLogger.debug('Raw image return value', imageReturnValue);
        
        // The return value is a String, which comes as [byteArray, typeString]
        if (Array.isArray(imageReturnValue) && imageReturnValue.length >= 2) {
          const byteArray = imageReturnValue[0];
          
          // Check if first element is a byte array (array of numbers)
          if (Array.isArray(byteArray) && byteArray.length > 0 && typeof byteArray[0] === 'number') {
            // Convert byte array to string
            const potentialUrl = String.fromCharCode(...byteArray);
            if (potentialUrl.startsWith('http://') || potentialUrl.startsWith('https://')) {
              imageUrl = potentialUrl;
            } else {
              BadgeLogger.warn('Converted string is not a valid URL', { potentialUrl });
            }
          } else if (typeof byteArray === 'string' && (byteArray.startsWith('http://') || byteArray.startsWith('https://'))) {
            imageUrl = byteArray;
          } else {
            BadgeLogger.warn('Unexpected byte array format', { type: typeof byteArray, value: byteArray });
          }
        } else if (typeof imageReturnValue === 'string') {
          // Direct string value
          if (imageReturnValue.startsWith('http://') || imageReturnValue.startsWith('https://')) {
            imageUrl = imageReturnValue;
            BadgeLogger.debug('Image URL fetched (direct string)', { imageUrl });
          } else {
            BadgeLogger.warn('String value is not a valid URL', { value: imageReturnValue });
          }
        } else {
          BadgeLogger.warn('Unexpected return value format', { type: typeof imageReturnValue, value: imageReturnValue });
        }
      }
      
      // Fallback: If imageUrl is not valid, construct from tier
      if (!imageUrl || !imageUrl.startsWith('http')) {
        imageUrl = this.dependencies.getBadgeImageUrl(Number(tierValue));
        BadgeLogger.debug('Constructed image URL from tier', { tier: tierValue, imageUrl });
      }

      const badgeData = {
        badgeId,
        tier: Number(tierValue),
        gamesPlayed: gamesPlayedValue,
        mintDate: mintDateValue,
        lastUpdated: lastUpdatedValue,
        imageUrl,
      };
      
      BadgeLogger.debug('Parsed badge data', {
        badgeData: {
          ...badgeData,
          imageUrl: imageUrl || 'none',
        },
      });
      
      // Cache the result for future requests
      this.requestCache.set(playerAddress, badgeData);
      
      return badgeData;
    } catch (error) {
      BadgeLogger.error('Error getting badge data', error);
      throw BadgeError.fromUnknown(error, 'Failed to get badge data');
    }
  }
}


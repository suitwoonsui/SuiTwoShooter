/**
 * Base blockchain service class
 * Provides common functionality for all blockchain services
 */

import { SuiClient } from '@mysten/sui/client';
import { 
  IBlockchainService, 
  SignAndExecute, 
  NetworkType
} from '../../types/blockchain';
import { getNetworkUrl, getContractConfig, ContractConfig } from '../../config';

export class BaseBlockchainService implements IBlockchainService {
  protected client: SuiClient;
  protected config: ContractConfig;
  protected signAndExecute?: SignAndExecute;
  protected network: NetworkType;

  constructor(network: NetworkType = 'testnet') {
    this.network = network;
    this.config = getContractConfig();
    this.client = new SuiClient({ url: getNetworkUrl(network) });
  }

  /**
   * Check if the service is ready for operations
   */
  public isReady(): boolean {
    return !!this.client && !!this.signAndExecute;
  }

  /**
   * Set the sign and execute function for transactions
   */
  public setSignAndExecute(signAndExecute: SignAndExecute): void {
    this.signAndExecute = signAndExecute;
  }

  /**
   * Get the current network configuration
   */
  public getNetwork(): NetworkType {
    return this.network;
  }

  /**
   * Get the contract configuration
   */
  public getConfig(): ContractConfig {
    return this.config;
  }

  /**
   * Get the Sui client instance
   */
  public getClient(): SuiClient {
    return this.client;
  }

  /**
   * Get the current SUI balance for a wallet address
   */
  public async getBalance(address: string): Promise<bigint> {
    try {
      const balance = await this.client.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI'
      });
      return BigInt(balance.totalBalance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return BigInt(0);
    }
  }

  /**
   * Convert milliseconds to minutes:seconds format
   */
  private formatTime(ms: number): string {
    if (ms === 0) return '0:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get player stats from the blockchain
   */
  public async getPlayerStats(playerAddress: string) {
    try {
      console.log('🎯 Fetching player stats from blockchain for:', playerAddress);
      
      // The ScoreSystem stores player stats in a shared table, not as individual objects
      // We need to query the table directly or call a view function
      // For now, let's try to query the table using Sui's table APIs
      
             const scoreSystemId = process.env.NEXT_PUBLIC_SCORE_SYSTEM_ID;
       console.log('🔧 Environment check - ScoreSystem ID:', scoreSystemId);
       if (!scoreSystemId) {
         console.error('❌ NEXT_PUBLIC_SCORE_SYSTEM_ID environment variable not set');
         throw new Error('ScoreSystem ID not configured');
       }

             console.log('🔍 Attempting to query ScoreSystem table for player:', playerAddress);
       
               // Declare variables in the correct scope
        let playerStatsFound = false;
        let totalScore = 0;
        let gamesPlayed = 0;
        let totalClicks = 0;
        let totalTimeElapsed = 0;
        let averageScore = 0;
        let averageClicks = 0;
        let averageTimeElapsed = 0;
        let personalBestScore = 0;
        let personalBestClicks = 0;
        let personalBestTime = 0;
        let currentSkillTier = 0;
        let highestEnduranceLevel = 0;
        
        try {
          // First, let's examine the ScoreSystem object structure
          console.log('🔍 Examining ScoreSystem object structure...');
          const scoreSystemObject = await this.client.getObject({
            id: scoreSystemId,
            options: { showContent: true }
          });
          
          console.log('📊 ScoreSystem object:', scoreSystemObject);
          
          if (scoreSystemObject.data?.content && scoreSystemObject.data.content.dataType === 'moveObject') {
            const content = scoreSystemObject.data.content as any;
            console.log('📊 ScoreSystem content fields:', content.fields);
            
                         // Try different approaches to access the table
             // Approach 1: Try to access the table directly
             if (content.fields && content.fields.player_stats_table) {
               console.log('✅ Found player_stats_table field:', content.fields.player_stats_table);
               
               // Extract the actual table ID from the nested structure
               const tableId = content.fields.player_stats_table.fields?.id?.id || content.fields.player_stats_table.id;
               console.log('🔍 Extracted table ID:', tableId);
               
               if (!tableId) {
                 console.error('❌ Could not extract table ID from player_stats_table field');
                 throw new Error('Invalid table ID structure');
               }
               
               // Try to get the table object
               const tableObject = await this.client.getObject({
                 id: tableId,
                 options: { showContent: true }
               });
              
              console.log('📊 Table object:', tableObject);
              
                             // Try to query the table using getDynamicFields
               const tableQuery = await this.client.getDynamicFields({
                 parentId: tableId,
                 options: { showContent: true }
               });
              
              console.log('📊 Table query result:', tableQuery);
              
              // Look for the player's stats in the table
              for (const field of tableQuery.data) {
                console.log('🔍 Table field:', field);
                if (field.name?.type === 'address' && field.name.value === playerAddress) {
                  console.log('✅ Found player stats in table:', field);
                  playerStatsFound = true;
                  
                  // Get the actual PlayerStats object
                  if (field.objectId) {
                    const statsObject = await this.client.getObject({
                      id: field.objectId,
                      options: { showContent: true }
                    });
                    
                    if (statsObject.data?.content && statsObject.data.content.dataType === 'moveObject') {
                      const statsContent = statsObject.data.content as any;
                      console.log('📊 Player stats content:', statsContent);
                      
                                             // Extract the actual values from the Move object
                       if (statsContent.fields && statsContent.fields.value) {
                         // The actual PlayerStats is nested in the 'value' field
                         const playerStats = statsContent.fields.value;
                         console.log('📊 Raw PlayerStats fields:', playerStats);
                         
                                                                             // Extract ALL the rich statistics from the blockchain
                           totalScore = Number(playerStats.fields?.total_score || 0);
                           gamesPlayed = Number(playerStats.fields?.total_games || 0);
                           
                           // Extract additional rich statistics with better error handling
                           totalClicks = Number(playerStats.fields?.total_clicks || 0);
                           totalTimeElapsed = Number(playerStats.fields?.total_time_elapsed || 0);
                           averageScore = Number(playerStats.fields?.average_score || 0);
                           averageClicks = Number(playerStats.fields?.average_clicks_per_game || 0);
                           averageTimeElapsed = Number(playerStats.fields?.average_time_per_game || 0);
                           personalBestScore = Number(playerStats.fields?.personal_best_score || 0);
                           personalBestClicks = Number(playerStats.fields?.personal_best_clicks || 0);
                           personalBestTime = Number(playerStats.fields?.personal_best_time || 0);
                           currentSkillTier = Number(playerStats.fields?.current_skill_tier || 0);
                           highestEnduranceLevel = Number(playerStats.fields?.highest_endurance_level || 0);
                           
                           // Debug logging for time values
                           console.log('🔍 Blockchain service - Raw time values:', {
                             personal_best_time_raw: playerStats.fields?.personal_best_time,
                             average_time_per_game_raw: playerStats.fields?.average_time_per_game,
                             personalBestTime_converted: personalBestTime,
                             averageTimeElapsed_converted: averageTimeElapsed
                           });
                           
                           // Ensure all time values are valid numbers
                           if (isNaN(averageTimeElapsed)) averageTimeElapsed = 0;
                           if (isNaN(personalBestTime)) personalBestTime = 0;
                           if (isNaN(totalTimeElapsed)) totalTimeElapsed = 0;
                           
                           // Time values are already in seconds from the smart contract
                           console.log('🔍 Time values are already in seconds, no conversion needed');
                           
                           // No conversion needed - smart contract stores time in seconds
                           console.log('🔍 Using time values as-is from blockchain (already in seconds)');
                          
                          console.log('✅ Extracted rich stats:', { 
                            totalScore, 
                            gamesPlayed, 
                            totalClicks,
                            totalTimeElapsed,
                            averageScore,
                            averageClicks,
                            averageTimeElapsed,
                            personalBestScore,
                            personalBestClicks,
                            personalBestTime,
                            currentSkillTier,
                            highestEnduranceLevel
                          });
                          
                          // Also log the raw values to debug
                          console.log('🔍 Raw values from blockchain:', {
                            total_score: playerStats.fields?.total_score,
                            total_games: playerStats.fields?.total_games,
                            total_clicks: playerStats.fields?.total_clicks,
                            total_time_elapsed: playerStats.fields?.total_time_elapsed,
                            average_score: playerStats.fields?.average_score,
                            average_clicks_per_game: playerStats.fields?.average_clicks_per_game,
                            average_time_per_game: playerStats.fields?.average_time_per_game,
                            personal_best_score: playerStats.fields?.personal_best_score,
                            personal_best_clicks: playerStats.fields?.personal_best_clicks,
                            personal_best_time: playerStats.fields?.personal_best_time,
                            current_skill_tier: playerStats.fields?.current_skill_tier,
                            highest_endurance_level: playerStats.fields?.highest_endurance_level
                          });
                       } else {
                         console.log('❌ No value field found in stats content');
                       }
                    }
                  }
                  break;
                }
              }
            } else {
              console.log('❌ player_stats_table field not found in ScoreSystem');
              console.log('Available fields:', Object.keys(content.fields || {}));
            }
          }

        if (!playerStatsFound) {
          console.log('ℹ️ No player stats found in table for:', playerAddress);
        }

        console.log('✅ Final stats retrieved:', { totalScore, gamesPlayed });
        
      } catch (tableError) {
        console.error('❌ Table query failed:', tableError);
        console.log('ℹ️ Falling back to default stats');
        totalScore = 0;
        gamesPlayed = 0;
      }
      
                                         // Return the new PlayerStats structure with ALL rich data
         return {
           player: playerAddress,
           // Core statistics
           highestClicks: personalBestClicks || 0,
           highestTimeElapsed: personalBestTime || 0, // Time in SECONDS
           highestScore: personalBestScore || totalScore,
           averageClicks: averageClicks || 0,
           averageTimeElapsed: averageTimeElapsed || 0, // Time in SECONDS
           averageScore: averageScore || (gamesPlayed > 0 ? totalScore / gamesPlayed : 0),
           totalGames: gamesPlayed,
           
           // Advanced statistics
           currentStreak: 0, // Will be updated by ScoreSystem
           bestStreak: 0, // Will be updated by ScoreSystem
           currentSkillTier: currentSkillTier || 0,
           highestEnduranceLevel: highestEnduranceLevel || 0,
           
           // Legacy fields for backward compatibility
           personalBest: personalBestScore || totalScore,
           score: totalScore,
           gamesPlayed: gamesPlayed,
           lastPlayed: Date.now(),
           lastScoreUpdate: Date.now()
         };
      
    } catch (error) {
      console.error('❌ Failed to get player stats:', error);
      // Return default PlayerStats structure
      return {
        player: playerAddress,
        highestClicks: 0,
        highestTimeElapsed: 0,
        highestScore: 0,
        averageClicks: 0,
        averageTimeElapsed: 0,
        averageScore: 0,
        totalGames: 0,
        currentStreak: 0,
        bestStreak: 0,
        // Legacy fields for backward compatibility
        personalBest: 0,
        score: 0,
        gamesPlayed: 0,
        highestEnduranceLevel: 0,
        currentSkillTier: 0,
        lastPlayed: Date.now(),
        lastScoreUpdate: Date.now()
      };
    }
  }

  /**
   * Switch to a different network
   */
  public switchNetwork(network: NetworkType): void {
    this.network = network;
    this.client = new SuiClient({ url: getNetworkUrl(network) });
  }

  /**
   * Validate that the service is ready before operations
   */
  protected validateReady(): void {
    if (!this.isReady()) {
      throw new Error('Blockchain service is not ready. Please set the sign and execute function.');
    }
  }

  /**
   * Handle blockchain errors consistently
   */
  protected handleError(error: unknown, operation: string): never {
    console.error(`❌ ${operation} failed:`, error);
    throw new Error(`${operation} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

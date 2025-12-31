/**
 * Score System service for blockchain operations
 * Handles all score-related blockchain interactions
 */

import { Transaction } from '@mysten/sui/transactions';
import { BaseBlockchainService } from './base';
import { IScoreSystemService, TransactionResult } from '../../types/blockchain';

export class ScoreSystemService extends BaseBlockchainService implements IScoreSystemService {
  
  /**
   * Submit a score for a completed game
   */
  public async submitScore(
    playerAddress: string, 
    finalScore: number, 
    clicks: number = 0,
    timeElapsed: number = 0
  ): Promise<TransactionResult> {
    try {
      console.log('🏆 Submitting score via backend API:', finalScore, 'for player:', playerAddress);
      console.log('🎯 Game metrics - Clicks:', clicks, 'Time Elapsed:', timeElapsed);
      
      // Validate score before submitting
      if (typeof finalScore !== 'number' || isNaN(finalScore) || finalScore < 0) {
        console.error('❌ Invalid score value:', finalScore, 'Type:', typeof finalScore);
        return {
          success: false,
          error: `Invalid score value: ${finalScore}`
        };
      }
      
      // Ensure score is an integer
      const validScore = Math.floor(finalScore);
      console.log('🏆 Validated score:', validScore);
      
      // Call backend API instead of direct blockchain call
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const requestBody = {
        playerAddress,
        finalScore: validScore,
        clicks: Math.floor(clicks),
        timeElapsed: Math.floor(timeElapsed)
      };
      
      console.log('🌐 Calling backend API:', `${backendUrl}/api/submit-score`);
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch(`${backendUrl}/api/submit-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        console.error('❌ Backend API HTTP error:', response.status, response.statusText);
        
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Backend API error details:', errorData);
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorData = {};
        }
        
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      const result = await response.json();
      console.log('📥 Backend response:', result);
      console.log('✅ Score submitted successfully via backend!');
      console.log('📊 Transaction digest:', result.transactionDigest);
      
      return {
        success: true,
        digest: result.transactionDigest,
        events: [], // Backend doesn't return events
        effects: '' // Backend doesn't return effects
      };
      
    } catch (error) {
      console.error('❌ Failed to submit score via backend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the top scores from the leaderboard
   */
  public async getTopScores(limit: number = 10): Promise<Array<{ address: string; score: number }>> {
    try {
      console.log('🏆 Fetching top scores, limit:', limit);
      
      // This would typically call a view function on the smart contract
      // For now, we'll return an empty array as placeholder
      // TODO: Implement actual leaderboard query when smart contract supports it
      
      console.log('⚠️ Leaderboard query not yet implemented in smart contract');
      return [];
      
    } catch (error) {
      console.error('❌ Failed to get top scores:', error);
      return [];
    }
  }

  /**
   * Get leaderboard in GameScore format for component compatibility
   */
  public async getLeaderboard(limit: number = 10): Promise<Array<{
    gameId: string;
    playerAddress: string;
    score: number;
    timestamp: number;
    speedLevel: number;
  }>> {
    try {
      console.log('🏆 Fetching leaderboard, limit:', limit);
      
      // Call backend API for leaderboard data
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/leaderboard?category=overall&limit=${limit}`);
      
      if (!response.ok) {
        console.error('❌ Backend API HTTP error:', response.status, response.statusText);
        return [];
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Convert backend format to GameScore format
        const leaderboardData = result.data.map((player: any, index: number) => ({
          gameId: `game_${index + 1}`,
          playerAddress: player.address,
          score: player.bestScore || player.overallScore || 0,
          timestamp: player.lastPlayed * 1000, // Convert to milliseconds
          speedLevel: player.skillTier || 0
        }));
        
        console.log('✅ Leaderboard loaded from backend:', leaderboardData);
        return leaderboardData;
      }
      
      console.log('⚠️ No leaderboard data available');
      return [];
      
    } catch (error) {
      console.error('❌ Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Get leaderboard by category
   */
  public async getLeaderboardByCategory(
    category: string, 
    limit: number = 25, 
    skillTier?: number
  ): Promise<{
    success: boolean;
    data?: any[];
    totalPlayers?: number;
    error?: string;
  }> {
    try {
      console.log('🏆 Fetching leaderboard by category:', category, 'limit:', limit, 'skill tier:', skillTier);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const params = new URLSearchParams({
        category,
        limit: limit.toString()
      });
      
      if (skillTier !== undefined) {
        params.append('skillTier', skillTier.toString());
      }
      
      const response = await fetch(`${backendUrl}/api/leaderboard?${params}`);
      
      if (!response.ok) {
        console.error('❌ Backend API HTTP error:', response.status, response.statusText);
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Leaderboard by category loaded:', result);
        return {
          success: true,
          data: result.data,
          totalPlayers: result.totalPlayers
        };
      }
      
      return { success: false, error: result.error || 'Failed to load leaderboard' };
      
    } catch (error) {
      console.error('❌ Failed to get leaderboard by category:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get available leaderboard categories
   */
  public async getLeaderboardCategories(): Promise<{
    success: boolean;
    categories?: any[];
    error?: string;
  }> {
    try {
      console.log('🏆 Fetching leaderboard categories');
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/leaderboard/categories`);
      
      if (!response.ok) {
        console.error('❌ Backend API HTTP error:', response.status, response.statusText);
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Leaderboard categories loaded:', result.categories);
        return {
          success: true,
          categories: result.categories
        };
      }
      
      return { success: false, error: result.error || 'Failed to load categories' };
      
    } catch (error) {
      console.error('❌ Failed to get leaderboard categories:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get available skill tiers
   */
  public async getSkillTiers(): Promise<{
    success: boolean;
    skillTiers?: any[];
    error?: string;
  }> {
    try {
      console.log('🏆 Fetching skill tiers');
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/leaderboard/skill-tiers`);
      
      if (!response.ok) {
        console.error('❌ Backend API HTTP error:', response.status, response.statusText);
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Skill tiers loaded:', result.skillTiers);
        return {
          success: true,
          skillTiers: result.skillTiers
        };
      }
      
      return { success: false, error: result.error || 'Failed to load skill tiers' };
      
    } catch (error) {
      console.error('❌ Failed to get skill tiers:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get a player's ranking in the leaderboard
   */
  public async getPlayerRanking(playerAddress: string): Promise<number | null> {
    try {
      console.log('🏆 Fetching player ranking for:', playerAddress);
      
      // This would typically call a view function on the smart contract
      // For now, we'll return null as placeholder
      // TODO: Implement actual ranking query when smart contract supports it
      
      console.log('⚠️ Player ranking query not yet implemented in smart contract');
      return null;
      
    } catch (error) {
      console.error('❌ Failed to get player ranking:', error);
      return null;
    }
  }

  /**
   * Validate a score before submission
   */
  private validateScore(score: number, speedLevel: number): boolean {
    if (score < 0) {
      console.error('❌ Score cannot be negative:', score);
      return false;
    }
    
    if (speedLevel < 1 || speedLevel > 10) {
      console.error('❌ Invalid speed level:', speedLevel);
      return false;
    }
    
    return true;
  }
}

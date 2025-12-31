/**
 * Game-related type definitions
 * Types for game state, mechanics, and UI interactions
 */

// Game state interface
export interface GameState {
  isActive: boolean;
  currentScore: number;
  currentEnduranceLevel: number; // Time survived in seconds
  personalBest: number;
  gamesPlayed: number;
  totalScore: number;
  blockchainSessionId: string | null;
  playerStats: PlayerStats | null;
}

// Game pass status for UI
export interface GamePassStatus {
  hasPass: boolean;
  passType: string | null;
  gamesRemaining: number;
  expiresAt: number | null;
  isActive: boolean;
}

// Game session information
export interface GameSession {
  id: string;
  playerAddress: string;
  startTime: number;
  endTime?: number;
  finalScore?: number;
  speedLevel: number;
  status: 'active' | 'completed' | 'cancelled';
}

// Game difficulty levels
export interface GameDifficulty {
  level: number;
  speed: number;
  scoreMultiplier: number;
  description: string;
}

// Game statistics
export interface GameStats {
  totalGames: number;
  totalScore: number;
  personalBest: number;
  averageScore: number;
  gamesToday: number;
  streak: number;
}

// Game settings
export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  difficulty: number;
  theme: string;
  autoSave: boolean;
}

// Game events
export type GameEvent = 
  | 'gameStart'
  | 'gamePause'
  | 'gameResume'
  | 'gameOver'
  | 'scoreUpdate'
  | 'levelUp'
  | 'passPurchase'
  | 'creditConsumption';

// Game mode types
export type GameMode = 'demo' | 'practice' | 'competitive' | 'endurance';

// Import PlayerStats from blockchain types
export interface PlayerStats {
  score: number;
  gamesPlayed: number;
  personalBest?: number;
}

// Game audio settings
export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

// Game theme configuration
export interface GameTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  isDark: boolean;
}

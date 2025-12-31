import { create } from 'zustand';

// Game state interface
export interface GameState {
  // Game status
  isActive: boolean;
  isStarted: boolean;
  
  // Game metrics
  score: number;
  clicks: number;
  timeElapsed: number;
  
  // Game objects
  currentBlock: {
    id: number;
    x: number;
    y: number;
    visible: boolean;
    spawnTime: number;
  } | null;
  
  // Actions
  startGame: () => void;
  clickBlock: () => void;
  updateTime: (time: number) => void;
  spawnBlock: (block: GameState['currentBlock']) => void;
  clearBlock: () => void;
  endGame: () => void;
  resetGame: () => void;
  
  // Computed values
  getCalculatedScore: () => number;
}

// Create the game store
export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  isActive: false,
  isStarted: false,
  score: 0,
  clicks: 0,
  timeElapsed: 0,
  currentBlock: null,
  
  // Actions
  startGame: () => {
    console.log('🎮 Store: Starting new game');
    set({
      isActive: true,
      isStarted: false,
      score: 0,
      clicks: 0,
      timeElapsed: 0,
      currentBlock: null,
    });
  },
  
  clickBlock: () => {
    const { isStarted, clicks, score } = get();
    
    console.log(`🎯 Store: clickBlock called - Current state: isStarted=${isStarted}, clicks=${clicks}, score=${score}`);
    
    if (!isStarted) {
      // First click - start the game
      console.log('🎯 Store: First block clicked, starting game');
      set({
        isStarted: true,
        clicks: 1,
        score: 1,
      });
      console.log('🎯 Store: After first click - State updated to: isStarted=true, clicks=1, score=1');
    } else {
      // Subsequent clicks
      const newClicks = clicks + 1;
      const newScore = score + 1;
      console.log(`🎯 Store: Subsequent block clicked - Old: clicks=${clicks}, score=${score} -> New: clicks=${newClicks}, score=${newScore}`);
      set({
        clicks: newClicks,
        score: newScore,
      });
      console.log(`🎯 Store: After subsequent click - State updated to: clicks=${newClicks}, score=${newScore}`);
    }
  },
  
  updateTime: (time: number) => {
    set({ timeElapsed: time });
  },
  
  spawnBlock: (block) => {
    console.log('🎯 Store: Spawning block:', block);
    set({ currentBlock: block });
  },
  
  clearBlock: () => {
    set({ currentBlock: null });
  },
  
  endGame: () => {
    console.log('🏁 Store: Ending game');
    set({ isActive: false });
  },
  
  resetGame: () => {
    console.log('🔄 Store: Resetting game');
    set({
      isActive: false,
      isStarted: false,
      score: 0,
      clicks: 0,
      timeElapsed: 0,
      currentBlock: null,
    });
  },
  
  // Computed values
  getCalculatedScore: () => {
    const { clicks, timeElapsed } = get();
    // Convert centiseconds to seconds (1 centisecond = 0.01 seconds)
    const timeSeconds = timeElapsed / 100;
    
    // Base score from clicks
    const baseScore = clicks;
    
    // Time bonus (every 10 seconds)
    const timeBonus = Math.floor(timeSeconds / 10);
    
    // Efficiency bonus (clicks per second * 5)
    let efficiencyBonus = 0;
    if (timeSeconds > 0) {
      const clicksPerSecond = clicks / timeSeconds;
      efficiencyBonus = Math.floor(clicksPerSecond * 5);
    }
    
    const finalScore = baseScore + timeBonus + efficiencyBonus;
    
    // Guard against invalid scores
    if (isNaN(finalScore) || finalScore < 0) {
      console.warn('⚠️ Store: Invalid score calculated, using base score only');
      return Math.max(0, baseScore);
    }
    
    console.log(`🎯 Store: Score calculation - Base: ${baseScore}, Time: ${timeBonus}, Efficiency: ${efficiencyBonus}, Final: ${finalScore}`);
    return finalScore;
  },
}));

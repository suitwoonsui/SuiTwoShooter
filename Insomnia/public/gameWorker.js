// Game Worker - Handles heavy game computations off the main thread
let gameState = {
  score: 0,
  timeElapsed: 0,
  level: 'Beginner',
  stats: {},
  isRunning: false
};

// Game computation functions
function calculateEnduranceLevel(timeCentiseconds) {
  const seconds = timeCentiseconds / 100;
  if (seconds < 30) return { level: 'Beginner', speed: '1.0s', multiplier: 1.0 };
  if (seconds < 60) return { level: 'Intermediate', speed: '0.8s', multiplier: 1.2 };
  if (seconds < 90) return { level: 'Advanced', speed: '0.6s', multiplier: 1.5 };
  if (seconds < 120) return { level: 'Expert', speed: '0.4s', multiplier: 2.0 };
  return { level: 'Master', speed: '0.3s', multiplier: 2.5 };
}

function calculateVisibilityTime(timeCentiseconds) {
  const levelData = calculateEnduranceLevel(timeCentiseconds);
  return parseFloat(levelData.speed) * 1000; // Convert to milliseconds
}

function calculateScore(baseScore, timeElapsed, accuracy) {
  const levelData = calculateEnduranceLevel(timeElapsed);
  return Math.floor(baseScore * levelData.multiplier * accuracy);
}

function generateOptimalBlockPosition(gridSize, previousPositions = []) {
  // Avoid placing blocks too close to previous positions
  let attempts = 0;
  let position;
  
  do {
    position = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
    attempts++;
  } while (attempts < 10 && previousPositions.some(prev => 
    Math.abs(prev.x - position.x) <= 1 && Math.abs(prev.y - position.y) <= 1
  ));
  
  return position;
}

// Message handler
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'START_GAME':
      gameState = {
        score: 0,
        timeElapsed: 0,
        level: 'Beginner',
        stats: {},
        isRunning: true,
        startTime: Date.now()
      };
      self.postMessage({ type: 'GAME_STARTED', data: gameState });
      break;
      
    case 'UPDATE_TIME':
      if (gameState.isRunning) {
        gameState.timeElapsed = data.timeElapsed;
        const levelData = calculateEnduranceLevel(gameState.timeElapsed);
        gameState.level = levelData.level;
        
        self.postMessage({ 
          type: 'TIME_UPDATED', 
          data: { 
            timeElapsed: gameState.timeElapsed,
            level: levelData,
            visibilityTime: calculateVisibilityTime(gameState.timeElapsed)
          }
        });
      }
      break;
      
    case 'SCORE_UPDATE':
      const { baseScore, accuracy = 1.0 } = data;
      gameState.score = calculateScore(baseScore, gameState.timeElapsed, accuracy);
      
      self.postMessage({ 
        type: 'SCORE_UPDATED', 
        data: { 
          score: gameState.score,
          level: calculateEnduranceLevel(gameState.timeElapsed)
        }
      });
      break;
      
    case 'GENERATE_BLOCK_POSITION':
      const { gridSize, previousPositions } = data;
      const position = generateOptimalBlockPosition(gridSize, previousPositions);
      
      self.postMessage({ 
        type: 'BLOCK_POSITION_GENERATED', 
        data: { position }
      });
      break;
      
    case 'END_GAME':
      gameState.isRunning = false;
      const finalStats = {
        finalScore: gameState.score,
        timeElapsed: gameState.timeElapsed,
        level: calculateEnduranceLevel(gameState.timeElapsed),
        accuracy: data.accuracy || 1.0,
        blocksClicked: data.blocksClicked || 0
      };
      
      self.postMessage({ 
        type: 'GAME_ENDED', 
        data: finalStats
      });
      break;
      
    case 'CALCULATE_STATS':
      const { scores, times } = data;
      const stats = {
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        bestScore: Math.max(...scores),
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        improvement: scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0
      };
      
      self.postMessage({ 
        type: 'STATS_CALCULATED', 
        data: stats
      });
      break;
      
    default:
      console.warn('Unknown worker message type:', type);
  }
};

// ==========================================
// ITEM CATALOG
// ==========================================
// Premium store item definitions with USD pricing
// Token conversion will be handled dynamically based on current rates

const ITEM_CATALOG = {
  extraLives: {
    id: 'extraLives',
    name: 'Extra Lives',
    description: 'Start with additional lives beyond the default 3',
    category: 'defensive',
    icon: '❤️',
    levels: [
      { 
        level: 1, 
        usdPrice: 0.50,
        effect: '+1 life',
        description: 'Start with 4 total lives (3 base + 1 purchased)'
      },
      { 
        level: 2, 
        usdPrice: 1.25,
        effect: '+2 lives',
        description: 'Start with 5 total lives (3 base + 2 purchased)'
      },
      { 
        level: 3, 
        usdPrice: 2.50,
        effect: '+3 lives',
        description: 'Start with 6 total lives (3 base + 3 purchased)'
      }
    ]
  },
  
  forceField: {
    id: 'forceField',
    name: 'Force Field Start',
    description: 'Begin the game with an active force field at a specified level',
    category: 'defensive',
    icon: '🛡️',
    levels: [
      { 
        level: 1, 
        usdPrice: 1.00,
        effect: 'Level 1 force field',
        description: 'Start with Level 1 force field active (normally requires 5 coin streak)'
      },
      { 
        level: 2, 
        usdPrice: 2.00,
        effect: 'Level 2 force field',
        description: 'Start with Level 2 force field active (normally requires 12 coin streak)'
      },
      { 
        level: 3, 
        usdPrice: 3.00,
        effect: 'Level 3 force field',
        description: 'Start with Level 3 force field active (normally requires 30 coin streak)'
      }
    ]
  },
  
  orbLevel: {
    id: 'orbLevel',
    name: 'Orb Level Start',
    description: 'Begin the game with a higher magic orb level',
    category: 'offensive',
    icon: '🔮',
    levels: [
      { 
        level: 1, 
        usdPrice: 0.75,
        effect: 'Start at Level 2',
        description: 'Begin at Orb Level 2 (skip initial grind)'
      },
      { 
        level: 2, 
        usdPrice: 1.50,
        effect: 'Start at Level 3',
        description: 'Begin at Orb Level 3 (stronger starting power)'
      },
      { 
        level: 3, 
        usdPrice: 2.25,
        effect: 'Start at Level 4',
        description: 'Begin at Orb Level 4 (very strong starting power)'
      }
    ]
  },
  
  coinTractorBeam: {
    id: 'coinTractorBeam',
    name: 'Coin Tractor Beam',
    description: 'Pull all coins on screen toward the player automatically',
    category: 'utility',
    icon: '🧲',
    levels: [
      { 
        level: 1, 
        usdPrice: 1.00,
        effect: '4 seconds, 30% range',
        description: 'Pull coins from 30% of screen range for 4 seconds'
      },
      { 
        level: 2, 
        usdPrice: 1.50,
        effect: '6 seconds, 60% range',
        description: 'Pull coins from 60% of screen range for 6 seconds'
      },
      { 
        level: 3, 
        usdPrice: 2.00,
        effect: '8 seconds, 90% range',
        description: 'Pull coins from 90% of screen range for 8 seconds'
      }
    ]
  },
  
  slowTime: {
    id: 'slowTime',
    name: 'Slow Time Power',
    description: 'Activate a power that slows game speed for a short duration',
    category: 'tactical',
    icon: '⏱️',
    levels: [
      { 
        level: 1, 
        usdPrice: 1.50,
        effect: '4 seconds duration',
        description: 'Slow time for 4 seconds (50% speed reduction)'
      },
      { 
        level: 2, 
        usdPrice: 2.25,
        effect: '6 seconds duration',
        description: 'Slow time for 6 seconds (50% speed reduction)'
      },
      { 
        level: 3, 
        usdPrice: 3.00,
        effect: '8 seconds duration',
        description: 'Slow time for 8 seconds (50% speed reduction)'
      }
    ]
  },
  
  destroyAll: {
    id: 'destroyAll',
    name: 'Destroy All Enemies',
    description: 'Launch seeking missiles that automatically destroy all enemies on screen',
    category: 'tactical',
    icon: '💥',
    levels: [
      { 
        level: 1, 
        usdPrice: 2.50,
        effect: 'Clear all enemies',
        description: 'Instantly destroy all enemies on screen (one-time use per game)'
      }
    ]
  },
  
  bossKillShot: {
    id: 'bossKillShot',
    name: 'Boss Kill Shot',
    description: 'Instant kill the current boss with a powerful screen-wide attack',
    category: 'tactical',
    icon: '🎯',
    levels: [
      { 
        level: 1, 
        usdPrice: 3.75,
        effect: 'Instant boss kill',
        description: 'Instantly defeat any boss regardless of remaining HP (one-time use per game)'
      }
    ]
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get item by ID
 * @param {string} itemId - Item ID (e.g., 'extraLives', 'forceField')
 * @returns {Object|null} Item object or null if not found
 */
function getItemById(itemId) {
  return ITEM_CATALOG[itemId] || null;
}

/**
 * Get item price in USD
 * @param {string} itemId - Item ID
 * @param {number} level - Item level (1, 2, or 3)
 * @returns {number|null} USD price or null if not found
 */
function getItemPrice(itemId, level) {
  const item = getItemById(itemId);
  if (!item) return null;
  
  const levelData = item.levels.find(l => l.level === level);
  return levelData ? levelData.usdPrice : null;
}

/**
 * Get all items
 * @returns {Array} Array of all item objects
 */
function getAllItems() {
  return Object.values(ITEM_CATALOG);
}

/**
 * Get items by category
 * @param {string} category - Category name ('defensive', 'offensive', 'tactical', 'utility')
 * @returns {Array} Array of items in the specified category
 */
function getItemsByCategory(category) {
  return getAllItems().filter(item => item.category === category);
}

/**
 * Get level data for an item
 * @param {string} itemId - Item ID
 * @param {number} level - Item level
 * @returns {Object|null} Level data object or null if not found
 */
function getItemLevelData(itemId, level) {
  const item = getItemById(itemId);
  if (!item) return null;
  
  return item.levels.find(l => l.level === level) || null;
}

/**
 * Check if item has multiple levels
 * @param {string} itemId - Item ID
 * @returns {boolean} True if item has multiple levels
 */
function hasMultipleLevels(itemId) {
  const item = getItemById(itemId);
  return item ? item.levels.length > 1 : false;
}

/**
 * Get max level for an item
 * @param {string} itemId - Item ID
 * @returns {number} Maximum level (or 1 if single-level item)
 */
function getMaxLevel(itemId) {
  const item = getItemById(itemId);
  return item ? item.levels.length : 1;
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.getItemById = getItemById;
  window.getItemPrice = getItemPrice;
  window.getAllItems = getAllItems;
  window.getItemsByCategory = getItemsByCategory;
  window.getItemLevelData = getItemLevelData;
  window.hasMultipleLevels = hasMultipleLevels;
  window.getMaxLevel = getMaxLevel;
  window.ITEM_CATALOG = ITEM_CATALOG; // Expose catalog for debugging
}


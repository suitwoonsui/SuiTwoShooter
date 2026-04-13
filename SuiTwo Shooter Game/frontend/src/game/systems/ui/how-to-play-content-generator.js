// ==========================================
// HOW TO PLAY MODAL - Content Generator
// ==========================================
// Generates the full HTML content for the How to Play modal

/**
 * Generate the HTML content for the How to Play modal
 * Note: Header is already in HTML, so we only generate carousels and content
 */
function generateHowToPlayContent() {
  const tabs = [
    { id: 'getting-started', name: 'Getting Started' },
    { id: 'character', name: 'The Character' },
    { id: 'enemies', name: 'The Enemies' },
    { id: 'bosses', name: 'The Bosses' },
    { id: 'combat', name: 'Combat & Projectiles' },
    { id: 'collectibles', name: 'Collectibles & Items' },
    { id: 'premium-store', name: 'Premium Store' },
    { id: 'tournaments', name: 'Tournaments' },
    { id: 'progression', name: 'Progression & Rewards' }
  ];
  
  const tabsHtml = tabs.map((tab, index) => `
    <button class="how-to-play-tab-btn ${index === 0 ? 'active' : ''}" 
            data-tab-id="${tab.id}" 
            data-tab-index="${index}"
            onclick="howToPlaySelectTab(${index})"
            aria-label="${tab.name}">
      ${tab.name}
    </button>
  `).join('');
  
  return `
    <!-- Tab Carousel Navigation -->
    <div class="how-to-play-tab-carousel">
      <button class="carousel-arrow carousel-arrow-left" id="howToPlayTabPrevBtn" onclick="howToPlayScrollTabs('left')" aria-label="Scroll tabs left">
        <span class="btn-icon">←</span>
      </button>
      
      <!-- Scrollable Tab Container -->
      <div class="how-to-play-tabs-container" id="howToPlayTabsContainer">
        ${tabsHtml}
      </div>
      
      <button class="carousel-arrow carousel-arrow-right" id="howToPlayTabNextBtn" onclick="howToPlayScrollTabs('right')" aria-label="Scroll tabs right">
        <span class="btn-icon">→</span>
      </button>
    </div>

    <!-- Content Carousel -->
    <div class="how-to-play-content-carousel">
      <button class="carousel-arrow carousel-arrow-left" id="howToPlayContentScrollPrevBtn" onclick="howToPlayScrollContent('left')" aria-label="Scroll sections left">
        <span class="btn-icon">←</span>
      </button>
      
      <!-- Content Sections Navigation -->
      <div class="how-to-play-content-sections-nav" id="howToPlayContentSectionsNav">
        <!-- Section buttons will be generated dynamically -->
      </div>
      
      <button class="carousel-arrow carousel-arrow-right" id="howToPlayContentScrollNextBtn" onclick="howToPlayScrollContent('right')" aria-label="Scroll sections right">
        <span class="btn-icon">→</span>
      </button>
    </div>
    
    <!-- Content Container -->
    <div class="how-to-play-content-container" id="howToPlayContentContainer">
      ${generateAllTabContent()}
    </div>
  `;
}

/**
 * Generate all tab content (hidden, shown via carousel)
 */
function generateAllTabContent() {
  return `
    ${generateGettingStartedTab()}
    ${generateCharacterTab()}
    ${generateEnemiesTab()}
    ${generateBossesTab()}
    ${generateCombatTab()}
    ${generateCollectiblesTab()}
    ${generatePremiumStoreTab()}
    ${generateTournamentsTab()}
    ${generateProgressionTab()}
  `;
}

function generateGettingStartedTab() {
  return `
    <div id="tab-getting-started" class="how-to-play-tab-content" data-tab-index="0">
      ${createContentSection('Objective', '🎯', `
        <p>Survive as long as possible, defeat bosses, and achieve the highest score! Navigate through the market chart, fighting against bearish forces that threaten to crash the market.</p>
      `, 0)}
      
      ${createContentSection('Basic Controls', '🎮', `
        <ul>
          <li><strong>Mouse/Touch:</strong> Move your character vertically across lanes</li>
          <li><strong>P Key:</strong> Pause/Resume game</li>
          <li><strong>Auto-Fire:</strong> Your character shoots magic orbs automatically</li>
        </ul>
      `, 1)}
      
      ${createContentSection('Gameplay Overview', '🎯', `
        <ul>
          <li>Move your character to avoid enemies and collect power-ups</li>
          <li>Collect coins to increase your score and activate force fields</li>
          <li>Pick up blue power-ups to increase firepower</li>
          <li>Avoid red power-downs that decrease firepower</li>
          <li>Defeat bosses to progress to higher tiers</li>
          <li>Higher tiers feature stronger enemies and bosses</li>
        </ul>
      `, 2)}
    </div>
  `;
}

function generateCharacterTab() {
  return `
    <div id="tab-character" class="how-to-play-tab-content" data-tab-index="1">
      ${createContentSection('Who is SuiTwo?', '', `
        <div class="how-to-play-split-layout">
          <div class="how-to-play-split-image">
            <img src="assets/SuiTwo_Character.webp" alt="SuiTwo Character" class="how-to-play-image" onerror="console.warn('Failed to load SuiTwo_Character.webp, trying fallback'); this.src='assets/SuiTwo_Profile.webp'; this.onerror=function(){console.error('Both images failed to load'); this.style.display='none';};">
          </div>
          <div class="how-to-play-split-content">
            <p class="how-to-play-narrative">
              SuiTwo is a powerful entity born from the chaos of market volatility. Like a legendary guardian, SuiTwo channels mystical energy to defend against the negative forces that threaten market stability. With each battle, SuiTwo grows stronger, learning to harness the power of market momentum itself.
            </p>
            <p>
              As you play, you embody SuiTwo's journey through the treacherous market chart, fighting against bearish enemies and manipulative forces that seek to crash the market. Your success determines SuiTwo's power and progression.
            </p>
          </div>
        </div>
      `, 0)}
      
      ${createContentSection('Abilities & Powers', '', `
        <div class="how-to-play-abilities-layout">
          <div class="how-to-play-ability-item">
            <div class="how-to-play-ability-preview">
              <canvas id="magicOrbPreview" width="200" height="200" style="max-width: 200px; margin: 0 auto; display: block; background: rgba(0,0,0,0.3); border-radius: 10px;"></canvas>
            </div>
            <div class="how-to-play-ability-content">
              <p class="how-to-play-narrative">
                SuiTwo's primary weapon is the Magic Orb—a manifestation of pure market energy. These blue orbs of power grow stronger with each power-up collected, representing SuiTwo's increasing mastery over market forces.
              </p>
              <div class="how-to-play-gameplay">
                <h4>Magic Orb Levels</h4>
                <ul>
                  <li><strong>Level 1-10:</strong> Your orb power increases with each level</li>
                  <li><strong>Fire Rate:</strong> Decreases as level increases (faster shooting)</li>
                  <li><strong>Base Interval:</strong> 300ms at Level 1, down to 100ms at Level 10</li>
                  <li><strong>Auto-Fire:</strong> Orbs fire automatically at configured intervals</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="how-to-play-ability-item">
            <div class="how-to-play-ability-preview">
              <canvas id="forceFieldPreview" width="200" height="200" style="max-width: 200px; margin: 0 auto; display: block; background: rgba(0,0,0,0.3); border-radius: 10px;"></canvas>
            </div>
            <div class="how-to-play-ability-content">
              <p class="how-to-play-narrative">
                When you collect enough coins in a streak, SuiTwo can activate a protective force field—a shield of market energy that blocks all incoming projectiles. This represents SuiTwo's ability to create stability in volatile markets.
              </p>
              <div class="how-to-play-gameplay">
                <h4>Force Field Levels</h4>
                <ul>
                  <li><strong>Level 1:</strong> Activated after 5 coin streak</li>
                  <li><strong>Level 2:</strong> Activated after 12 coin streak</li>
                  <li><strong>Level 3:</strong> Activated after 30 coin streak</li>
                  <li><strong>Protection:</strong> Blocks all projectile damage while active</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      `, 1)}
    </div>
  `;
}

function generateEnemiesTab() {
  const enemies = [
    {
      name: 'Jeet',
      tier: 1,
      image: 'assets/Enemy_Jeet.webp',
      narrative: 'The Jeet represents quick profit-taking dumps in the market. These fast-moving entities appear early in your journey, symbolizing the impatient traders who sell at the first sign of movement. While weak individually, they come in waves, testing your resolve as you navigate the market chart.',
      stats: { fireRate: '3000ms', speed: '1.0', hp: '1', points: '15' }
    },
    {
      name: 'Market Maker',
      tier: 2,
      image: 'assets/Enemy_Market_Maker.webp',
      narrative: 'Market Makers are manipulative forces that create false patterns in the market. They move with calculated precision, representing the sophisticated traders who use their power to influence market direction. Their presence signals increasing market complexity.',
      stats: { fireRate: '2500ms', speed: '1.2', hp: '1', points: '30' }
    },
    {
      name: 'Little Bear',
      tier: 3,
      image: 'assets/Enemy_Little_Bear.webp',
      narrative: 'Little Bears embody bearish market sentiment—the persistent downward pressure that can overwhelm even strong positions. These resilient enemies have more health, representing the sustained nature of bear markets. They test your endurance and strategic thinking.',
      stats: { fireRate: '2000ms', speed: '1.5', hp: '2', points: '50' }
    },
    {
      name: 'Shadow Hand',
      tier: 4,
      image: 'assets/Enemy_Shadow_Hand.webp',
      narrative: 'Shadow Hands are the most dangerous enemies—hidden trading activities that operate in the shadows of the market. They move with unnatural speed and strike with precision, representing the dark forces of market manipulation that few can detect. Encountering them means you\'ve reached the highest levels of market volatility.',
      stats: { fireRate: '1500ms', speed: '2.0', hp: '3', points: '80' }
    }
  ];

  let content = '<div id="tab-enemies" class="how-to-play-tab-content" data-tab-index="2">';
  enemies.forEach((enemy, index) => {
    content += createContentSection(`${enemy.name} (Tier ${enemy.tier})`, '', `
      <div class="how-to-play-split-layout">
        <div class="how-to-play-split-image">
          <img src="${enemy.image}" alt="${enemy.name}" class="how-to-play-image" onerror="console.warn('Failed to load image: ${enemy.image}'); this.style.display='none';">
        </div>
        <div class="how-to-play-split-content">
          <p class="how-to-play-narrative">${enemy.narrative}</p>
          <div class="how-to-play-gameplay">
            <h4>Stats</h4>
            <div class="how-to-play-stats">
              <div class="how-to-play-stat-item">
                <div class="how-to-play-stat-label">Fire Rate</div>
                <div class="how-to-play-stat-value">${enemy.stats.fireRate}</div>
              </div>
              <div class="how-to-play-stat-item">
                <div class="how-to-play-stat-label">Speed</div>
                <div class="how-to-play-stat-value">${enemy.stats.speed}</div>
              </div>
              <div class="how-to-play-stat-item">
                <div class="how-to-play-stat-label">HP</div>
                <div class="how-to-play-stat-value">${enemy.stats.hp}</div>
              </div>
              <div class="how-to-play-stat-item">
                <div class="how-to-play-stat-label">Points</div>
                <div class="how-to-play-stat-value">${enemy.stats.points}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `, index);
  });
  content += '</div>';
  return content;
}

function generateBossesTab() {
  const bosses = [
    {
      name: 'The Scammer',
      tier: 1,
      image: 'assets/Boss_Scammer.webp',
      narrative: 'The Scammer is the first major threat you\'ll face—a deceptive force that uses market manipulation to create false opportunities. This boss represents the scams and fraudulent schemes that prey on unsuspecting traders. Defeating it proves you can see through deception.',
      stats: { hp: '400', fireRate: '1500ms', patterns: '3' }
    },
    {
      name: 'Market Manipulator',
      tier: 2,
      image: 'assets/Boss_Market_Maker.webp',
      narrative: 'The Market Manipulator wields large-scale market control, using sophisticated techniques to move markets in their favor. This boss represents the powerful entities that can influence entire market sectors. Its defeat marks your mastery over intermediate market forces.',
      stats: { hp: '600', fireRate: '1200ms', patterns: '4' }
    },
    {
      name: 'Bear Boss',
      tier: 3,
      image: 'assets/Boss_Bear.webp',
      narrative: 'The Bear Boss embodies major bear market events—the catastrophic crashes that can wipe out entire portfolios. This massive entity represents the full force of market downturns. Defeating it requires exceptional skill and represents your ability to survive the worst market conditions.',
      stats: { hp: '800', fireRate: '1000ms', patterns: '5' }
    },
    {
      name: 'Shadow Figure',
      tier: 4,
      image: 'assets/Boss_Shadow_Figure.webp',
      narrative: 'The Shadow Figure is the ultimate negative market force—an entity so powerful it exists in the shadows of market manipulation itself. This final boss represents the hidden forces that control markets from behind the scenes. Only the most skilled traders can hope to defeat this legendary threat.',
      stats: { hp: '1000', fireRate: '800ms', patterns: '6' }
    }
  ];

  let content = '<div id="tab-bosses" class="how-to-play-tab-content" data-tab-index="3">';
  bosses.forEach((boss, index) => {
    content += createContentSection(`${boss.name} (Tier ${boss.tier} Boss)`, '', `
      <div class="how-to-play-split-layout">
        <div class="how-to-play-split-image">
          <img src="${boss.image}" alt="${boss.name}" class="how-to-play-image" onerror="console.warn('Failed to load image: ${boss.image}'); this.style.display='none';">
        </div>
        <div class="how-to-play-split-content">
          <p class="how-to-play-narrative">${boss.narrative}</p>
          <div class="how-to-play-gameplay">
            <h4>Stats</h4>
            <div class="how-to-play-stats">
              <div class="how-to-play-stat-item">
                <div class="how-to-play-stat-label">HP</div>
                <div class="how-to-play-stat-value">${boss.stats.hp}</div>
              </div>
              <div class="how-to-play-stat-item">
                <div class="how-to-play-stat-label">Fire Rate</div>
                <div class="how-to-play-stat-value">${boss.stats.fireRate}</div>
              </div>
              <div class="how-to-play-stat-item">
                <div class="how-to-play-stat-label">Attack Patterns</div>
                <div class="how-to-play-stat-value">${boss.stats.patterns}</div>
              </div>
              <div class="how-to-play-stat-item">
                <div class="how-to-play-stat-label">Reward</div>
                <div class="how-to-play-stat-value">${boss.tier * 5000} pts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `, index);
  });
  content += '</div>';
  return content;
}

function generateCombatTab() {
  return `
    <div id="tab-combat" class="how-to-play-tab-content" data-tab-index="4">
      ${createContentSection('Your Magic Orbs', '', `
        <div class="how-to-play-split-layout">
          <div class="how-to-play-split-image">
            <canvas id="playerOrbPreview" width="200" height="200" style="max-width: 200px; margin: 0 auto; display: block; background: rgba(0,0,0,0.3); border-radius: 10px;"></canvas>
          </div>
          <div class="how-to-play-split-content">
            <p class="how-to-play-narrative">
              Your Magic Orbs are manifestations of SuiTwo's power—blue energy projectiles that grow stronger with each power-up. They represent your ability to fight back against market volatility, channeling positive market energy into destructive force.
            </p>
            <div class="how-to-play-gameplay">
              <h4>Orb Mechanics</h4>
              <ul>
                <li><strong>Levels 1-10:</strong> Power increases with each level</li>
                <li><strong>Fire Rate:</strong> 300ms (Level 1) to 100ms (Level 10)</li>
                <li><strong>Auto-Fire:</strong> Fires automatically at configured intervals</li>
                <li><strong>Damage:</strong> Destroys enemies and damages bosses</li>
              </ul>
            </div>
          </div>
        </div>
      `, 0)}
      
      ${createContentSection('Enemy Candles', '', `
        <div class="how-to-play-split-layout">
          <div class="how-to-play-split-image">
            <canvas id="enemyCandlePreview" width="200" height="200" style="max-width: 200px; margin: 0 auto; display: block; background: rgba(0,0,0,0.3); border-radius: 10px;"></canvas>
          </div>
          <div class="how-to-play-split-content">
            <p class="how-to-play-narrative">
              Enemy projectiles appear as spinning candles—bearish candlestick patterns that represent negative market movements. These spinning candles are aimed at your position, symbolizing how bearish forces target traders who stand against market manipulation.
            </p>
            <div class="how-to-play-gameplay">
              <h4>Candle Mechanics</h4>
              <ul>
                <li><strong>Visual:</strong> Spinning candlestick patterns</li>
                <li><strong>Behavior:</strong> Aimed at your current position</li>
                <li><strong>Speed:</strong> Based on enemy tier (4 × enemy speed)</li>
                <li><strong>Damage:</strong> Reduces lives on hit</li>
              </ul>
            </div>
          </div>
        </div>
      `, 1)}
      
      ${createContentSection('Boss Arrows', '', `
        <div class="how-to-play-split-layout">
          <div class="how-to-play-split-image">
            <canvas id="bossArrowPreview" width="200" height="200" style="max-width: 200px; margin: 0 auto; display: block; background: rgba(0,0,0,0.3); border-radius: 10px;"></canvas>
          </div>
          <div class="how-to-play-split-content">
            <p class="how-to-play-narrative">
              Boss projectiles manifest as directional arrows—downward trend indicators that represent major market manipulation. These arrows come in complex patterns, symbolizing the sophisticated attack strategies used by powerful market forces.
            </p>
            <div class="how-to-play-gameplay">
              <h4>Arrow Patterns</h4>
              <ul>
                <li><strong>Pattern 0:</strong> Straight line shots</li>
                <li><strong>Pattern 1:</strong> Fan shot spread</li>
                <li><strong>Pattern 2:</strong> Aimed shots at player</li>
                <li><strong>Pattern 3:</strong> Vertical barrage</li>
                <li><strong>Pattern 4:</strong> Spiral shots (Tier 3+)</li>
                <li><strong>Pattern 5:</strong> Advanced patterns (Tier 4)</li>
              </ul>
            </div>
          </div>
        </div>
      `, 2)}
      
      ${createContentSection('Combat Strategy', '', `
        <div class="how-to-play-gameplay">
          <h4>Tips for Success</h4>
          <ul>
            <li><strong>Movement:</strong> Constantly move to avoid projectiles—standing still is dangerous</li>
            <li><strong>Power-Ups:</strong> Prioritize collecting blue power-ups to increase your firepower</li>
            <li><strong>Coins:</strong> Collect coins to build your force field and increase score</li>
            <li><strong>Boss Patterns:</strong> Learn boss attack patterns to anticipate and dodge attacks</li>
            <li><strong>Tier Progression:</strong> Each boss defeated unlocks harder enemies but better rewards</li>
          </ul>
        </div>
      `, 3)}
    </div>
  `;
}

function generateCollectiblesTab() {
  return `
    <div id="tab-collectibles" class="how-to-play-tab-content" data-tab-index="5">
      ${createContentSection('Coins', '🪙', `
        <div class="how-to-play-split-layout">
          <div class="how-to-play-split-image">
            <canvas id="coinPreview" width="100" height="100" style="max-width: 100px; margin: 0 auto; display: block;"></canvas>
          </div>
          <div class="how-to-play-split-content">
            <p class="how-to-play-narrative">
              Coins represent market value—the tangible rewards for navigating volatile markets successfully. Collecting coins builds your score and, more importantly, creates the energy needed to activate SuiTwo's protective force field.
            </p>
            <div class="how-to-play-gameplay">
              <h4>Coin Mechanics</h4>
              <ul>
                <li><strong>Points:</strong> 10 points per coin</li>
                <li><strong>Force Field:</strong> Coin streaks activate force fields</li>
                <li><strong>Streak Thresholds:</strong> Level 1 (5 coins), Level 2 (12 coins), Level 3 (30 coins)</li>
                <li><strong>Strategy:</strong> Prioritize coin collection for both score and protection</li>
              </ul>
            </div>
          </div>
        </div>
      `, 0)}
      
      ${createContentSection('Power-Ups (Blue)', '⚡', `
        <div class="how-to-play-split-layout">
          <div class="how-to-play-split-image">
            <canvas id="powerupPreview" width="100" height="100" style="max-width: 100px; margin: 0 auto; display: block;"></canvas>
          </div>
          <div class="how-to-play-split-content">
            <p class="how-to-play-narrative">
              Blue power-ups represent the power of the Sui ecosystem—the positive market momentum that strengthens your position. Collecting them increases SuiTwo's magic orb level, symbolizing how the Sui ecosystem amplifies your power and enables growth.
            </p>
            <div class="how-to-play-gameplay">
              <h4>Power-Up Effects</h4>
              <ul>
                <li><strong>Effect:</strong> Increases magic orb level (up to Level 10)</li>
                <li><strong>Fire Rate:</strong> Decreases with each level (faster shooting)</li>
                <li><strong>Points:</strong> 25 points per collection</li>
                <li><strong>Strategy:</strong> Always collect blue power-ups when safe</li>
              </ul>
            </div>
          </div>
        </div>
      `, 1)}
      
      ${createContentSection('Power-Downs (Red)', '⚠️', `
        <div class="how-to-play-split-layout">
          <div class="how-to-play-split-image">
            <canvas id="powerdownPreview" width="100" height="100" style="max-width: 100px; margin: 0 auto; display: block;"></canvas>
          </div>
          <div class="how-to-play-split-content">
            <p class="how-to-play-narrative">
              Red power-downs represent negative market volatility—the sudden crashes that weaken your position. These dangerous items decrease your magic orb level, symbolizing how negative market forces can erode your power.
            </p>
            <div class="how-to-play-gameplay">
              <h4>Power-Down Effects</h4>
              <ul>
                <li><strong>Effect:</strong> Decreases magic orb level (minimum Level 1)</li>
                <li><strong>Fire Rate:</strong> Increases with each level down (slower shooting)</li>
                <li><strong>Strategy:</strong> Avoid red power-downs at all costs</li>
              </ul>
            </div>
          </div>
        </div>
      `, 2)}
      
      ${createContentSection('Force Field System', '🛡️', `
        <div class="how-to-play-split-layout">
          <div class="how-to-play-split-image">
            <canvas id="forceFieldPreviewCollectibles" width="200" height="200" style="max-width: 200px; margin: 0 auto; display: block; background: rgba(0,0,0,0.3); border-radius: 10px;"></canvas>
          </div>
          <div class="how-to-play-split-content">
            <p class="how-to-play-narrative">
              The Force Field is SuiTwo's ultimate defensive ability—a shield of market energy that protects against all projectiles. It represents your ability to create stability in volatile markets, turning collected market value into protective power.
            </p>
            <div class="how-to-play-gameplay">
              <h4>Force Field Levels</h4>
              <ul>
                <li><strong>Level 1:</strong> Activated after 5 coin streak</li>
                <li><strong>Level 2:</strong> Activated after 12 coin streak</li>
                <li><strong>Level 3:</strong> Activated after 30 coin streak</li>
                <li><strong>Protection:</strong> Blocks all projectile damage while active</li>
                <li><strong>Duration:</strong> Temporary protection period</li>
              </ul>
            </div>
          </div>
        </div>
      `, 3)}
    </div>
  `;
}

function generatePremiumStoreTab() {
  const items = [
    {
      id: 'extra_lives',
      name: 'Extra Lives',
      icon: '❤️',
      narrative: 'Extra Lives represent market resilience—the ability to recover from setbacks and continue trading. Starting with additional lives gives you more chances to prove your skill against market volatility.',
      levels: [
        { level: 1, price: '$0.50', effect: '+1 life (4 total)' },
        { level: 2, price: '$1.25', effect: '+2 lives (5 total)' },
        { level: 3, price: '$2.50', effect: '+3 lives (6 total)' }
      ]
    },
    {
      id: 'force_field',
      name: 'Force Field Start',
      icon: '🛡️',
      narrative: 'Begin your journey with active market protection. This item represents starting with market stability already established, giving you an immediate advantage against bearish forces.',
      levels: [
        { level: 1, price: '$1.00', effect: 'Level 1 force field active' },
        { level: 2, price: '$2.00', effect: 'Level 2 force field active' },
        { level: 3, price: '$3.00', effect: 'Level 3 force field active' }
      ]
    },
    {
      id: 'orb_level',
      name: 'Orb Level Start',
      icon: '🔮',
      narrative: 'Enhanced market power from the start. This item represents beginning your journey with already-developed trading skills, skipping the initial learning curve.',
      levels: [
        { level: 1, price: '$0.75', effect: 'Start at Level 2' },
        { level: 2, price: '$1.50', effect: 'Start at Level 3' },
        { level: 3, price: '$2.25', effect: 'Start at Level 4' }
      ]
    },
    {
      id: 'coin_tractor_beam',
      name: 'Coin Tractor Beam',
      icon: '🧲',
      narrative: 'The Coin Tractor Beam harnesses the magnetic pull of market momentum. When activated, it draws coins from across the battlefield toward you, representing the power of strategic positioning in volatile markets.',
      levels: [
        { level: 1, price: '$1.00', effect: '4 seconds, 30% range' },
        { level: 2, price: '$1.50', effect: '6 seconds, 60% range' },
        { level: 3, price: '$2.00', effect: '8 seconds, 90% range' }
      ]
    },
    {
      id: 'slow_time',
      name: 'Slow Time Power',
      icon: '⏱️',
      narrative: 'Time manipulation in volatile markets. This power slows the game speed, giving you more time to react to market movements—representing the ability to analyze situations when markets move too fast.',
      levels: [
        { level: 1, price: '$1.50', effect: '4 seconds (50% speed reduction)' },
        { level: 2, price: '$2.25', effect: '6 seconds (50% speed reduction)' },
        { level: 3, price: '$3.00', effect: '8 seconds (50% speed reduction)' }
      ]
    },
    {
      id: 'destroy_all',
      name: 'Destroy All Enemies',
      icon: '💥',
      narrative: 'Market clearing power—an instant wave of destruction that eliminates all enemies on screen. This represents the ability to clear market volatility in a single decisive action.',
      levels: [
        { level: 1, price: '$2.50', effect: 'Clear all enemies (one-time use)' }
      ]
    },
    {
      id: 'boss_kill_shot',
      name: 'Boss Kill Shot',
      icon: '🎯',
      narrative: 'Ultimate market dominance—a powerful screen-wide attack that instantly defeats any boss regardless of remaining HP. This represents the ability to overcome even the most powerful market forces through decisive action.',
      levels: [
        { level: 1, price: '$3.75', effect: 'Instant boss kill (one-time use)' }
      ]
    },
    {
      id: 'itemMerging',
      name: 'Item Merging',
      icon: '🔗',
      narrative: 'Synthesizing market power—combine lower-level items to create more powerful versions. This represents the ability to consolidate resources and create stronger market positions through strategic combination.',
      mergeInfo: `
        <ul>
          <li><strong>3x Level 1 → 1x Level 2:</strong> $0.25</li>
          <li><strong>3x Level 2 → 1x Level 3:</strong> $0.50</li>
          <li><strong>9x Level 1 → 1x Level 3 (Hyper Merge):</strong> $1.50</li>
        </ul>
        <p><strong>Note:</strong> Badge discounts apply to merge fees. Single-level items (Destroy All, Boss Kill Shot) cannot be merged.</p>
      `
    }
  ];

  let content = '<div id="tab-premium-store" class="how-to-play-tab-content" data-tab-index="6">';
  items.forEach((item, index) => {
    if (item.id === 'itemMerging') {
      content += createContentSection(item.name, item.icon, `
        <p class="how-to-play-narrative">${item.narrative}</p>
        <div class="how-to-play-gameplay">
          <h4>Merge Options</h4>
          ${item.mergeInfo}
        </div>
      `, index);
    } else {
      let levelsHtml = '<div class="how-to-play-gameplay"><h4>Levels & Pricing</h4><ul>';
      item.levels.forEach(level => {
        levelsHtml += `<li><strong>Level ${level.level}:</strong> ${level.price} - ${level.effect}</li>`;
      });
      levelsHtml += '</ul></div>';
      
      content += createContentSection(item.name, item.icon, `
        <p class="how-to-play-narrative">${item.narrative}</p>
        ${levelsHtml}
      `, index);
    }
  });
  content += '</div>';
  return content;
}

function generateTournamentsTab() {
  return `
    <div id="tab-tournaments" class="how-to-play-tab-content" data-tab-index="7">
      ${createContentSection('What are Tournaments?', '', `
        <p class="how-to-play-narrative">
          Tournaments are competitive market battles—time-limited competitions where traders compete for dominance. Each tournament focuses on a specific goal, creating diverse challenges that test different aspects of your market mastery.
        </p>
        <div class="how-to-play-gameplay">
          <h4>Tournament Basics</h4>
          <ul>
            <li><strong>Time-Limited:</strong> Tournaments run for specific durations (daily, weekly, monthly)</li>
            <li><strong>Entry Fee:</strong> Requires tournament tickets to participate</li>
            <li><strong>Leaderboards:</strong> Separate rankings for each tournament category</li>
            <li><strong>Rewards:</strong> Top players receive prizes based on performance</li>
          </ul>
        </div>
      `, 0)}
      
      ${createContentSection('Tournament Categories', '', `
        <div class="how-to-play-gameplay">
          <h4>6 Tournament Types</h4>
          <ul>
            <li><strong>Total Coins:</strong> Collect the most coins during the tournament period</li>
            <li><strong>Longest Coin Streak:</strong> Achieve the longest coin streak in a single game</li>
            <li><strong>Score Tournament:</strong> Achieve the highest score in a single game</li>
            <li><strong>Distance Tournament:</strong> Travel the farthest in a single game</li>
            <li><strong>Bosses Defeated:</strong> Defeat the most bosses in a single game</li>
            <li><strong>Enemies Defeated:</strong> Defeat the most enemies in a single game</li>
          </ul>
        </div>
      `, 1)}
      
      ${createContentSection('Tournament Tickets', '', `
        <p class="how-to-play-narrative">
          Tournament Tickets are the entry currency for competitions—your gateway to competitive market battles. Each ticket represents your commitment to proving your skill against other traders.
        </p>
        <div class="how-to-play-gameplay">
          <h4>Important: Ticket Usage</h4>
          <ul>
            <li><strong>1 Ticket = 1 Game Entry:</strong> Tickets are consumed per game, not per tournament</li>
            <li><strong>Each Game Requires a Ticket:</strong> Every time you want to play in a tournament, you need a ticket</li>
            <li><strong>Tickets are Consumed:</strong> When you start a game in the tournament, your ticket is used</li>
            <li><strong>Multiple Games:</strong> To play again in the same tournament, you need another ticket</li>
            <li><strong>Purchase:</strong> Buy tickets from the Store & Inventory</li>
          </ul>
        </div>
      `, 2)}
      
      ${createContentSection('Creating Tournaments', '', `
        <p class="how-to-play-narrative">
          Organizing market competitions—create your own tournaments to challenge the community. As a tournament creator, you set the rules, define the rewards, and watch as traders compete for dominance.
        </p>
        <div class="how-to-play-gameplay">
          <h4>How to Create</h4>
          <ul>
            <li><strong>Access:</strong> Use the Tournament Creation feature</li>
            <li><strong>Set Category:</strong> Choose from 6 tournament types</li>
            <li><strong>Set Duration:</strong> Define start and end times</li>
            <li><strong>Entry Fee:</strong> Set ticket requirement (typically 1 ticket)</li>
            <li><strong>Custom Rewards:</strong> Optionally set custom reward distribution</li>
            <li><strong>Starting Ante:</strong> Optionally contribute to prize pool</li>
            <li><strong>Creation Fee:</strong> Pay a fee to create the tournament</li>
          </ul>
        </div>
      `, 3)}
      
      ${createContentSection('Tournament Rewards', '', `
        <p class="how-to-play-narrative">
          Rewards for market dominance—top performers in tournaments receive prizes that reflect their skill and dedication. The better you perform, the greater your rewards.
        </p>
        <div class="how-to-play-gameplay">
          <h4>Reward Distribution</h4>
          <ul>
            <li><strong>Prize Pools:</strong> Funded by ticket purchases and starting antes</li>
            <li><strong>Top Players:</strong> Receive credits, items, or tokens based on rank</li>
            <li><strong>Distribution:</strong> Rewards are automatically distributed after tournament ends</li>
            <li><strong>Creator Rewards:</strong> Tournament creators may receive rewards based on participation</li>
          </ul>
        </div>
      `, 4)}
    </div>
  `;
}

/**
 * Construct badge image URL for How to Play modal
 * @param {string} tierName - Badge tier name (Standard, Common, Uncommon, Rare, Epic, Legendary)
 * @returns {string} Badge image URL
 */
function getBadgeImageUrlForHowToPlay(tierName) {
  // Try to use existing constructBadgeImageUrl function if available
  if (typeof window !== 'undefined' && typeof window.constructBadgeImageUrl === 'function') {
    const tierMap = { 'Standard': 0, 'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legendary': 5 };
    const tier = tierMap[tierName] !== undefined ? tierMap[tierName] : 0;
    return window.constructBadgeImageUrl(tier);
  }
  
  // Fallback: construct URL manually - badge images from frontend origin
  const badgeBase = typeof window !== 'undefined' && (window.GAME_CONFIG?.BADGE_IMAGE_BASE_URL || window.location?.origin);
  const baseUrl = badgeBase ? String(badgeBase).replace(/\/api\/?$/, '') : '';
  return baseUrl ? `${baseUrl}/Badges/${tierName}.webp` : '';
}

function generateProgressionTab() {
  // Badge tier data with images
  const badgeTiers = [
    { name: 'Standard', games: '1-4', storeDiscount: '0%', gameplayDiscount: '0%', description: 'Your journey begins' },
    { name: 'Common', games: '5-14', storeDiscount: '5%', gameplayDiscount: '0%', description: '' },
    { name: 'Uncommon', games: '15-34', storeDiscount: '10%', gameplayDiscount: '5%', description: '' },
    { name: 'Rare', games: '35-74', storeDiscount: '15%', gameplayDiscount: '10%', description: '' },
    { name: 'Epic', games: '75-149', storeDiscount: '20%', gameplayDiscount: '15%', description: '' },
    { name: 'Legendary', games: '150+', storeDiscount: '25%', gameplayDiscount: '20%', description: '' }
  ];

  const badgeTiersHtml = badgeTiers.map(tier => {
    const badgeImageUrl = getBadgeImageUrlForHowToPlay(tier.name);
    const discountText = `${tier.storeDiscount} store discount, ${tier.gameplayDiscount} gameplay discount`;
    const descriptionText = tier.description ? ` - ${tier.description}` : '';
    
    return `
      <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <img src="${badgeImageUrl}" 
             alt="${tier.name} Badge" 
             style="width: 48px; height: 48px; object-fit: contain; flex-shrink: 0;"
             onerror="this.style.display='none';">
        <div>
          <strong>${tier.name} (${tier.games} games):</strong> ${discountText}${descriptionText}
        </div>
      </li>
    `;
  }).join('');

  return `
    <div id="tab-progression" class="how-to-play-tab-content" data-tab-index="8">
      ${createContentSection('Badge System', '🏅', `
        <p class="how-to-play-narrative">
          Recognition for market dedication—badges represent your commitment to mastering the markets. Each badge tier unlocks new benefits, reflecting your growing expertise and dedication to the game.
        </p>
        <div class="how-to-play-gameplay">
          <h4>Badge Tiers</h4>
          <ul style="list-style: none; padding-left: 0;">
            ${badgeTiersHtml}
          </ul>
          <h4>Benefits</h4>
          <ul>
            <li><strong>Store Discounts:</strong> Reduced prices on premium items</li>
            <li><strong>Gameplay Discounts:</strong> Reduced costs for gameplay features</li>
            <li><strong>Prestige:</strong> Visual recognition of your dedication</li>
          </ul>
        </div>
      `, 0)}
      
      ${createContentSection('Leaderboards', '🏆', `
        <p class="how-to-play-narrative">
          Market leader recognition—leaderboards showcase the top traders who have mastered the markets. Compete for the highest positions and prove your dominance.
        </p>
        <div class="how-to-play-gameplay">
          <h4>Leaderboard Features</h4>
          <ul>
            <li><strong>Global Rankings:</strong> See how you compare to all players</li>
            <li><strong>Score Categories:</strong> View rankings by different metrics</li>
            <li><strong>Real-Time Updates:</strong> Rankings update as players submit scores</li>
            <li><strong>Historical Data:</strong> View past leaderboard snapshots</li>
          </ul>
        </div>
      `, 1)}
      
      ${createContentSection('Milestones', '🎯', `
        <p class="how-to-play-narrative">
          Market milestones and achievements—track your progress across 12 different categories. Each milestone represents a significant achievement in your market mastery journey.
        </p>
        <div class="how-to-play-gameplay">
          <h4>Milestone Categories</h4>
          <h5>Per-Game Achievements:</h5>
          <ul>
            <li><strong>Score:</strong> Highest score in a single game</li>
            <li><strong>Distance:</strong> Longest distance traveled</li>
            <li><strong>Coins:</strong> Most coins collected</li>
            <li><strong>Bosses:</strong> Most bosses defeated</li>
            <li><strong>Enemies:</strong> Most enemies defeated</li>
            <li><strong>Coin Streak:</strong> Longest coin streak</li>
          </ul>
          <h5>Cumulative Achievements:</h5>
          <ul>
            <li><strong>Games Played:</strong> Total games completed</li>
            <li><strong>Total Score:</strong> Combined score across all games</li>
            <li><strong>Total Distance:</strong> Combined distance traveled</li>
            <li><strong>Total Coins:</strong> Combined coins collected</li>
            <li><strong>Total Bosses:</strong> Combined bosses defeated</li>
            <li><strong>Total Enemies:</strong> Combined enemies defeated</li>
          </ul>
          <h4>Rewards</h4>
          <p>Each milestone rewards you with credits and items when claimed.</p>
        </div>
      `, 2)}
      
      ${createContentSection('Claiming Rewards', '💰', `
        <p class="how-to-play-narrative">
          Collecting market rewards—claim your hard-earned achievements and receive the credits and items you've unlocked through your market mastery.
        </p>
        <div class="how-to-play-gameplay">
          <h4>How to Claim</h4>
          <ul>
            <li><strong>Access:</strong> Go to Leaderboard → Milestones tab</li>
            <li><strong>Eligibility:</strong> Milestones are automatically checked when you reach thresholds</li>
            <li><strong>Claim Button:</strong> Click "Claim Reward" when milestones are eligible</li>
            <li><strong>Distribution:</strong> Credits and items are automatically added to your account</li>
            <li><strong>One-Time:</strong> Each milestone can only be claimed once</li>
          </ul>
        </div>
      `, 3)}
    </div>
  `;
}

/**
 * Helper function to create content section (for carousel)
 */
function createContentSection(title, icon, content, sectionIndex) {
  const iconHtml = icon ? `${icon} ` : '';
  return `
    <div class="how-to-play-content-section" data-section-index="${sectionIndex}">
      <div class="how-to-play-section-header">
        <h3>${iconHtml}${title}</h3>
      </div>
      <div class="how-to-play-section-content">
        ${content}
      </div>
    </div>
  `;
}

/**
 * Helper function to create accordion HTML (legacy - keeping for reference)
 */
function createAccordion(title, icon, content, isActive = false) {
  const activeClass = isActive ? 'active' : '';
  const iconHtml = icon ? `${icon} ` : '';
  return `
    <div class="how-to-play-accordion ${activeClass}">
      <div class="how-to-play-accordion-header">
        <h3>${iconHtml}${title}</h3>
        <span class="how-to-play-accordion-icon">▼</span>
      </div>
      <div class="how-to-play-accordion-content">
        <div class="how-to-play-content-section">
          ${content}
        </div>
      </div>
    </div>
  `;
}

// Export function
if (typeof window !== 'undefined') {
  window.generateHowToPlayContent = generateHowToPlayContent;
}

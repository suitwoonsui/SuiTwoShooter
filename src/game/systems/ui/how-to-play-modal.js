// ==========================================
// HOW TO PLAY MODAL - Enhanced with Tabs and Accordions
// ==========================================

/**
 * Initialize the How to Play modal
 */
function initHowToPlayModal() {
  const modal = document.getElementById('instructionsPanel');
  if (!modal) return;
  
  // Get the content wrapper (like .store, .tournament, .leaderboard in other modals)
  let contentContainer = modal.querySelector('.instructions-content');
  
  // If no content wrapper exists, create one (matching other modals' pattern)
  if (!contentContainer) {
    contentContainer = document.createElement('div');
    contentContainer.className = 'instructions-content';
    modal.appendChild(contentContainer);
  }
  
  // Check if content is already generated
  if (contentContainer.dataset.contentGenerated !== 'true') {
    // Get the existing header (we want to keep it)
    const existingHeader = contentContainer.querySelector('.instructions-header');
    
    // Generate and inject content (without header - header already exists)
    if (typeof generateHowToPlayContent === 'function') {
      // Generate new content (tabs + content, no header)
      const newContent = generateHowToPlayContent();
      
      // Remove old content sections but keep header
      const oldSections = contentContainer.querySelectorAll('.instructions-section, .instructions-buttons');
      oldSections.forEach(section => section.remove());
      
      // Insert new content after header using insertAdjacentHTML
      if (existingHeader) {
        existingHeader.insertAdjacentHTML('afterend', newContent);
      } else {
        // No header found, prepend header and add content
        contentContainer.innerHTML = `
          <div class="instructions-header">
            <h2>📖 How to Play</h2>
            <button class="close-btn" onclick="hideInstructions()">✕</button>
          </div>
          ${newContent}
        `;
      }
      
      contentContainer.dataset.contentGenerated = 'true';
      
      // Defer canvas rendering until after DOM is ready and modal is visible
      // This prevents blocking the UI during modal open
      requestAnimationFrame(() => {
        // Render projectile previews after a short delay to allow DOM to settle
        setTimeout(() => {
          renderProjectilePreviews();
        }, 50);
      });
    } else {
      console.warn('How to Play: Content generator not loaded');
      return;
    }
  } else {
    // Content already generated, just ensure previews are rendered
    requestAnimationFrame(() => {
      setTimeout(() => {
        renderProjectilePreviews();
      }, 50);
    });
  }
  
  // Initialize carousel state
  if (!window.howToPlayState) {
    window.howToPlayState = {
      currentTabIndex: 0,
      currentContentIndex: 0,
      tabs: [
        { id: 'getting-started', name: 'Getting Started' },
        { id: 'character', name: 'The Character' },
        { id: 'enemies', name: 'The Enemies' },
        { id: 'bosses', name: 'The Bosses' },
        { id: 'combat', name: 'Combat & Projectiles' },
        { id: 'collectibles', name: 'Collectibles & Items' },
        { id: 'premium-store', name: 'Premium Store' },
        { id: 'tournaments', name: 'Tournaments' },
        { id: 'progression', name: 'Progression & Rewards' }
      ]
    };
  }
  
  // Setup carousel navigation
  setupHowToPlayCarousels();
  
  // Update scroll button states when tabs container scrolls
  const tabsContainer = document.getElementById('howToPlayTabsContainer');
  if (tabsContainer) {
    tabsContainer.addEventListener('scroll', updateHowToPlayCarouselButtons);
    // Also update on resize
    window.addEventListener('resize', updateHowToPlayCarouselButtons);
  }

  // Close button (use existing close button from header, not generated one)
  const closeBtn = contentContainer.querySelector('.instructions-header .close-btn');
  if (closeBtn) {
    // Ensure it has the onclick handler
    if (!closeBtn.onclick) {
      closeBtn.onclick = hideHowToPlayModal;
    }
  }
}

/**
 * Render projectile previews on canvas elements
 * Optimized: Only renders visible canvases to improve performance
 */
function renderProjectilePreviews() {
  // Early exit if modal is not visible
  const modal = document.getElementById('instructionsPanel');
  if (modal && !modal.classList.contains('instructions-panel-visible')) {
    return; // Don't render if modal is hidden
  }
  // Magic Orb Preview (Level 5) - render like in-game with trail
  // Only render if visible (performance optimization)
  const orbCanvas = document.getElementById('magicOrbPreview');
  if (orbCanvas && orbCanvas.offsetParent !== null) {
    const ctx = orbCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, orbCanvas.width, orbCanvas.height);
      
      // Level 5 orb rendering (matching in-game rendering)
      const orbLevel = 5;
      // Get old level equivalent if function exists, otherwise use level directly
      const getOldLevelEquivalent = typeof window.getOldLevelEquivalent === 'function' 
        ? window.getOldLevelEquivalent 
        : (level) => {
          if (level === 1) return 1;
          if (level <= 3) return 2;
          if (level <= 5) return 3;
          if (level <= 7) return 4;
          if (level <= 9) return 5;
          return 6;
        };
      const oldLevel = getOldLevelEquivalent(orbLevel);
      const orbSize = oldLevel * 8 + 16;
      
      // Center position
      const centerX = orbCanvas.width / 2;
      const centerY = orbCanvas.height / 2;
      const orbX = centerX - orbSize / 2;
      const orbY = centerY - orbSize / 2;
      
      // Try to use the blue orb shot image if available
      // Cache image lookup to avoid repeated checks
      if (!window._howToPlayImageCache) {
        window._howToPlayImageCache = {};
      }
      
      let blueOrbShotImage = window._howToPlayImageCache['projectile_blue_orb'];
      if (!blueOrbShotImage) {
        // Primary method: use getGameImage from image registry
        if (typeof window.getGameImage === 'function') {
          blueOrbShotImage = window.getGameImage('projectile_blue_orb');
        }
        // Fallback: try ImagePreloader directly
        if ((!blueOrbShotImage || !blueOrbShotImage.complete) && window.ImagePreloader) {
          blueOrbShotImage = window.ImagePreloader.get('projectile_blue_orb');
        }
        // Cache the result (even if null/not loaded)
        window._howToPlayImageCache['projectile_blue_orb'] = blueOrbShotImage;
      }
      
      // Last resort: create and load the image directly (only if not cached and not loaded)
      if (!blueOrbShotImage || !blueOrbShotImage.complete || blueOrbShotImage.naturalWidth === 0) {
        if (!orbCanvas._imageLoadAttempted) {
          orbCanvas._imageLoadAttempted = true;
          const img = new Image();
          img.src = 'assets/Blue_Orb_Shot.webp';
          img.onload = () => {
            window._howToPlayImageCache['projectile_blue_orb'] = img;
            // Re-render when image loads (defer to avoid blocking)
            requestAnimationFrame(() => {
              if (document.getElementById('magicOrbPreview')) {
                renderProjectilePreviews();
              }
            });
          };
          img.onerror = () => {
            console.warn('[HOW TO PLAY] Failed to load Blue_Orb_Shot.webp');
          };
          // If image is already loaded (cached), use it immediately
          if (img.complete && img.naturalWidth > 0) {
            blueOrbShotImage = img;
            window._howToPlayImageCache['projectile_blue_orb'] = img;
          }
        }
      }
      
      // Create a mock trail for the preview (simulating movement rightward/forward)
      // Trail should go behind the orb (to the left) as it moves forward
      // In-game: projectiles move rightward, so trail is behind (to the left)
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const trailLength = Math.min(orbLevel + 2, 8); // Trail length based on level
      const trailPoints = [];
      
      // Generate trail points (simulating a projectile moving rightward/forward)
      // Trail goes from left (oldest/behind) to right (newest/current position where orb is)
      // The orb is at the rightmost position (newest point)
      for (let i = 0; i < trailLength; i++) {
        // Calculate position: oldest (leftmost) to newest (rightmost/orb position)
        const offsetX = i * 8; // Spacing between trail segments
        trailPoints.push({
          x: centerX - (trailLength - 1 - i) * 8, // Start from left, move right toward orb
          y: centerY
        });
      }
      // Add the orb's current position as the newest trail point
      trailPoints.push({
        x: centerX,
        y: centerY
      });
      
      // Draw trail first (behind the projectile) - matching in-game trail rendering
      if (trailPoints.length > 1) {
        ctx.save();
        // Trail color based on level (matching in-game: hsl(200 + level * 15, 100%, 60%))
        const trailHue = 200 + orbLevel * 15;
        ctx.strokeStyle = `hsl(${trailHue}, 100%, 60%)`;
        ctx.lineCap = 'butt'; // Flat ends like in-game
        
        // Level 5 gets 3 layers
        const maxLayers = orbLevel >= 5 ? 3 : (orbLevel >= 3 ? 2 : 1);
        
        // Draw trail segments with diminishing size and opacity (from oldest to newest)
        // Loop from oldest (index 0) to newest (index length-2, since last point is orb position)
        for (let i = 0; i < trailPoints.length - 1; i++) {
          const currentPoint = trailPoints[i];
          const nextPoint = trailPoints[i + 1];
          
          // Calculate diminishing properties (progress from old to new)
          // i=0 is oldest (0% progress), i=length-2 is newest (100% progress)
          const progress = (i + 1) / (trailPoints.length - 1);
          const alpha = progress * 0.4; // Fade from 0% (oldest) to 40% (newest)
          const lineWidth = progress * Math.max(3, orbSize); // Diminish from 0 (oldest) to full size (newest)
          
          // Draw multiple layers for flame-like effect
          for (let layer = 0; layer < maxLayers; layer++) {
            const layerAlpha = alpha * (1 - layer * 0.3);
            const layerWidth = lineWidth * (1 - layer * 0.2);
            const layerOffset = (layer - 1) * 2;
            
            ctx.globalAlpha = layerAlpha;
            ctx.lineWidth = Math.max(1, layerWidth);
            
            ctx.beginPath();
            ctx.moveTo(currentPoint.x + layerOffset, currentPoint.y);
            ctx.lineTo(nextPoint.x + layerOffset, nextPoint.y);
            ctx.stroke();
          }
        }
        
        ctx.restore();
      }
      
      // Draw the projectile itself
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * (orbLevel / 3);
      ctx.shadowColor = 'cyan';
      ctx.shadowBlur = 10 + orbLevel * 5;
      
      // Check if we have a valid image (complete and loaded)
      const hasValidImage = blueOrbShotImage && 
                           (blueOrbShotImage.complete || blueOrbShotImage.readyState === 'complete') && 
                           blueOrbShotImage.naturalWidth > 0;
      
      if (hasValidImage) {
        // Use the actual orb image
        try {
          ctx.drawImage(blueOrbShotImage, orbX, orbY, orbSize, orbSize);
        } catch (e) {
          console.warn('[HOW TO PLAY] Error drawing orb image, using fallback:', e);
          // Fallback on error
          ctx.fillStyle = '#4DA2FF';
          ctx.beginPath();
          ctx.arc(centerX, centerY, orbSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Fallback: draw a blue circle with glow
        ctx.fillStyle = '#4DA2FF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Try to load the image for next render
        if (!orbCanvas._imageLoadAttempted) {
          orbCanvas._imageLoadAttempted = true;
          const img = new Image();
          img.src = 'assets/Blue_Orb_Shot.webp';
          img.onload = () => {
            setTimeout(() => renderProjectilePreviews(), 100);
          };
        }
      }
      
      ctx.restore();
      ctx.shadowBlur = 0;
      
      // Animate the trail (re-render on next frame for animation)
      // Only start animation if canvas is visible
      if (orbCanvas.dataset.animating !== 'true' && orbCanvas.offsetParent !== null) {
        orbCanvas.dataset.animating = 'true';
        let lastFrameTime = performance.now();
        const animateOrb = (currentTime) => {
          const canvas = document.getElementById('magicOrbPreview');
          if (canvas && canvas.offsetParent !== null) {
            // Throttle to ~30fps for animations (saves performance)
            if (currentTime - lastFrameTime >= 33) {
              renderProjectilePreviews();
              lastFrameTime = currentTime;
            }
            requestAnimationFrame(animateOrb);
          } else {
            orbCanvas.dataset.animating = 'false';
          }
        };
        requestAnimationFrame(animateOrb);
      }
    }
  }
  
  // Player Orb Preview (same as magicOrbPreview - Level 5 with trail)
  // Only render if visible (performance optimization)
  const playerOrbCanvas = document.getElementById('playerOrbPreview');
  if (playerOrbCanvas && playerOrbCanvas.offsetParent !== null) {
    const ctx = playerOrbCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, playerOrbCanvas.width, playerOrbCanvas.height);
      
      // Level 5 orb rendering (matching in-game rendering)
      const orbLevel = 5;
      const getOldLevelEquivalent = typeof window.getOldLevelEquivalent === 'function' 
        ? window.getOldLevelEquivalent 
        : (level) => {
          if (level === 1) return 1;
          if (level <= 3) return 2;
          if (level <= 5) return 3;
          if (level <= 7) return 4;
          if (level <= 9) return 5;
          return 6;
        };
      const oldLevel = getOldLevelEquivalent(orbLevel);
      const orbSize = oldLevel * 8 + 16;
      
      const centerX = playerOrbCanvas.width / 2;
      const centerY = playerOrbCanvas.height / 2;
      const orbX = centerX - orbSize / 2;
      const orbY = centerY - orbSize / 2;
      
      // Get blue orb image (use cache)
      if (!window._howToPlayImageCache) {
        window._howToPlayImageCache = {};
      }
      
      let blueOrbShotImage = window._howToPlayImageCache['projectile_blue_orb'];
      if (!blueOrbShotImage) {
        if (typeof window.getGameImage === 'function') {
          blueOrbShotImage = window.getGameImage('projectile_blue_orb');
        }
        if ((!blueOrbShotImage || !blueOrbShotImage.complete) && window.ImagePreloader) {
          blueOrbShotImage = window.ImagePreloader.get('projectile_blue_orb');
        }
        window._howToPlayImageCache['projectile_blue_orb'] = blueOrbShotImage;
      }
      
      if (!blueOrbShotImage || !blueOrbShotImage.complete || blueOrbShotImage.naturalWidth === 0) {
        if (!playerOrbCanvas._imageLoadAttempted) {
          playerOrbCanvas._imageLoadAttempted = true;
          const img = new Image();
          img.src = 'assets/Blue_Orb_Shot.webp';
          img.onload = () => {
            window._howToPlayImageCache['projectile_blue_orb'] = img;
            requestAnimationFrame(() => renderProjectilePreviews());
          };
          if (img.complete && img.naturalWidth > 0) {
            blueOrbShotImage = img;
            window._howToPlayImageCache['projectile_blue_orb'] = img;
          }
        }
      }
      
      // Create trail points (same as magicOrbPreview)
      const trailLength = Math.min(orbLevel + 2, 8);
      const trailPoints = [];
      for (let i = 0; i < trailLength; i++) {
        trailPoints.push({
          x: centerX - (trailLength - 1 - i) * 8,
          y: centerY
        });
      }
      trailPoints.push({ x: centerX, y: centerY });
      
      // Draw trail
      if (trailPoints.length > 1) {
        ctx.save();
        const trailHue = 200 + orbLevel * 15;
        ctx.strokeStyle = `hsl(${trailHue}, 100%, 60%)`;
        ctx.lineCap = 'butt';
        const maxLayers = orbLevel >= 5 ? 3 : (orbLevel >= 3 ? 2 : 1);
        
        for (let i = 0; i < trailPoints.length - 1; i++) {
          const currentPoint = trailPoints[i];
          const nextPoint = trailPoints[i + 1];
          const progress = (i + 1) / (trailPoints.length - 1);
          const alpha = progress * 0.4;
          const lineWidth = progress * Math.max(3, orbSize);
          
          for (let layer = 0; layer < maxLayers; layer++) {
            const layerAlpha = alpha * (1 - layer * 0.3);
            const layerWidth = lineWidth * (1 - layer * 0.2);
            const layerOffset = (layer - 1) * 2;
            
            ctx.globalAlpha = layerAlpha;
            ctx.lineWidth = Math.max(1, layerWidth);
            
            ctx.beginPath();
            ctx.moveTo(currentPoint.x + layerOffset, currentPoint.y);
            ctx.lineTo(nextPoint.x + layerOffset, nextPoint.y);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      
      // Draw orb
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * (orbLevel / 3);
      ctx.shadowColor = 'cyan';
      ctx.shadowBlur = 10 + orbLevel * 5;
      
      const hasValidImage = blueOrbShotImage && 
                           (blueOrbShotImage.complete || blueOrbShotImage.readyState === 'complete') && 
                           blueOrbShotImage.naturalWidth > 0;
      
      if (hasValidImage) {
        try {
          ctx.drawImage(blueOrbShotImage, orbX, orbY, orbSize, orbSize);
        } catch (e) {
          ctx.fillStyle = '#4DA2FF';
          ctx.beginPath();
          ctx.arc(centerX, centerY, orbSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#4DA2FF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
      ctx.shadowBlur = 0;
    }
  }
  
  // Enemy Candle Preview - use actual candle image with rotation
  const candleCanvas = document.getElementById('enemyCandlePreview');
  if (candleCanvas) {
    const ctx = candleCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, candleCanvas.width, candleCanvas.height);
      
      // Get enemy candle image (use cache)
      if (!window._howToPlayImageCache) {
        window._howToPlayImageCache = {};
      }
      
      let enemyCandleImage = window._howToPlayImageCache['projectile_enemy_candle'];
      if (!enemyCandleImage) {
        if (typeof window.getGameImage === 'function') {
          enemyCandleImage = window.getGameImage('projectile_enemy_candle');
        }
        if ((!enemyCandleImage || !enemyCandleImage.complete) && window.ImagePreloader) {
          enemyCandleImage = window.ImagePreloader.get('projectile_enemy_candle');
        }
        window._howToPlayImageCache['projectile_enemy_candle'] = enemyCandleImage;
      }
      
      if (!enemyCandleImage || !enemyCandleImage.complete || enemyCandleImage.naturalWidth === 0) {
        if (!candleCanvas._imageLoadAttempted) {
          candleCanvas._imageLoadAttempted = true;
          const img = new Image();
          img.src = 'assets/Enemy_Red_Candle.webp';
          img.onload = () => {
            window._howToPlayImageCache['projectile_enemy_candle'] = img;
            requestAnimationFrame(() => renderProjectilePreviews());
          };
          if (img.complete && img.naturalWidth > 0) {
            enemyCandleImage = img;
            window._howToPlayImageCache['projectile_enemy_candle'] = img;
          }
        }
      }
      
      const centerX = candleCanvas.width / 2;
      const centerY = candleCanvas.height / 2;
      
      // Animate rotation
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const spin = now * 0.002; // Rotation speed (matching in-game)
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(spin);
      
      const hasValidImage = enemyCandleImage && 
                           (enemyCandleImage.complete || enemyCandleImage.readyState === 'complete') && 
                           enemyCandleImage.naturalWidth > 0;
      
      if (hasValidImage) {
        try {
          // Use getProjectileDimensions if available, otherwise use fixed size
          let candleDims;
          if (typeof window.getProjectileDimensions === 'function') {
            candleDims = window.getProjectileDimensions(enemyCandleImage, 40);
          } else {
            // Calculate dimensions maintaining aspect ratio
            const aspectRatio = enemyCandleImage.naturalHeight / enemyCandleImage.naturalWidth;
            const targetSize = 40;
            candleDims = {
              width: targetSize,
              height: targetSize * aspectRatio
            };
          }
          ctx.drawImage(enemyCandleImage, -candleDims.width/2, -candleDims.height/2, candleDims.width, candleDims.height);
        } catch (e) {
          // Fallback
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(-10, -30, 20, 60);
        }
      } else {
        // Fallback: draw a simple candlestick
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-10, -30, 20, 60);
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(-15, -40, 30, 10);
      }
      
      ctx.restore();
      
      // Animate rotation
      // Only start animation if canvas is visible
      if (candleCanvas.dataset.animating !== 'true' && candleCanvas.offsetParent !== null) {
        candleCanvas.dataset.animating = 'true';
        let lastFrameTime = performance.now();
        const animateCandle = (currentTime) => {
          const canvas = document.getElementById('enemyCandlePreview');
          if (canvas && canvas.offsetParent !== null) {
            // Throttle to ~30fps for animations (saves performance)
            if (currentTime - lastFrameTime >= 33) {
              renderProjectilePreviews();
              lastFrameTime = currentTime;
            }
            requestAnimationFrame(animateCandle);
          } else {
            candleCanvas.dataset.animating = 'false';
          }
        };
        requestAnimationFrame(animateCandle);
      }
    }
  }
  
  // Boss Arrow Preview - use actual arrow image
  // Only render if visible (performance optimization)
  const arrowCanvas = document.getElementById('bossArrowPreview');
  if (arrowCanvas && arrowCanvas.offsetParent !== null) {
    const ctx = arrowCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
      
      // Get boss arrow image (use cache)
      if (!window._howToPlayImageCache) {
        window._howToPlayImageCache = {};
      }
      
      let bossArrowImage = window._howToPlayImageCache['projectile_boss_arrow'];
      if (!bossArrowImage) {
        if (typeof window.getGameImage === 'function') {
          bossArrowImage = window.getGameImage('projectile_boss_arrow');
        }
        if ((!bossArrowImage || !bossArrowImage.complete) && window.ImagePreloader) {
          bossArrowImage = window.ImagePreloader.get('projectile_boss_arrow');
        }
        window._howToPlayImageCache['projectile_boss_arrow'] = bossArrowImage;
      }
      
      if (!bossArrowImage || !bossArrowImage.complete || bossArrowImage.naturalWidth === 0) {
        if (!arrowCanvas._imageLoadAttempted) {
          arrowCanvas._imageLoadAttempted = true;
          const img = new Image();
          img.src = 'assets/Boss_Arrow_Bolt.webp';
          img.onload = () => {
            window._howToPlayImageCache['projectile_boss_arrow'] = img;
            requestAnimationFrame(() => renderProjectilePreviews());
          };
          if (img.complete && img.naturalWidth > 0) {
            bossArrowImage = img;
            window._howToPlayImageCache['projectile_boss_arrow'] = img;
          }
        }
      }
      
      const centerX = arrowCanvas.width / 2;
      const centerY = arrowCanvas.height / 2;
      
      // Draw arrow pointing downward (typical boss arrow direction)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.PI); // Point downward (180 degrees)
      
      const hasValidImage = bossArrowImage && 
                           (bossArrowImage.complete || bossArrowImage.readyState === 'complete') && 
                           bossArrowImage.naturalWidth > 0;
      
      if (hasValidImage) {
        try {
          // Use getProjectileDimensions if available, otherwise use fixed size
          let arrowDims;
          if (typeof window.getProjectileDimensions === 'function') {
            arrowDims = window.getProjectileDimensions(bossArrowImage, 50);
          } else {
            // Calculate dimensions maintaining aspect ratio
            const aspectRatio = bossArrowImage.naturalHeight / bossArrowImage.naturalWidth;
            const targetSize = 50;
            arrowDims = {
              width: targetSize,
              height: targetSize * aspectRatio
            };
          }
          ctx.drawImage(bossArrowImage, -arrowDims.width/2, -arrowDims.height/2, arrowDims.width, arrowDims.height);
        } catch (e) {
          // Fallback: draw arrow shape
          ctx.fillStyle = '#ff8844';
          ctx.beginPath();
          ctx.moveTo(0, -25);
          ctx.lineTo(-17, 25);
          ctx.lineTo(0, 17);
          ctx.lineTo(17, 25);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Fallback: draw arrow shape
        ctx.fillStyle = '#ff8844';
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(-17, 25);
        ctx.lineTo(0, 17);
        ctx.lineTo(17, 25);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.restore();
    }
  }
  
  // Coin Preview - use actual coin image
  const coinCanvas = document.getElementById('coinPreview');
  if (coinCanvas) {
    const ctx = coinCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, coinCanvas.width, coinCanvas.height);
      
      // Get coin image (use cache)
      if (!window._howToPlayImageCache) {
        window._howToPlayImageCache = {};
      }
      
      let coinImage = window._howToPlayImageCache['collectible_coin'];
      if (!coinImage) {
        if (typeof window.getGameImage === 'function') {
          coinImage = window.getGameImage('collectible_coin');
        }
        if ((!coinImage || !coinImage.complete) && window.ImagePreloader) {
          coinImage = window.ImagePreloader.get('collectible_coin');
        }
        window._howToPlayImageCache['collectible_coin'] = coinImage;
      }
      
      if (!coinImage || !coinImage.complete || coinImage.naturalWidth === 0) {
        if (!coinCanvas._imageLoadAttempted) {
          coinCanvas._imageLoadAttempted = true;
          const img = new Image();
          img.src = 'assets/SuiTwo_Coin.webp';
          img.onload = () => {
            window._howToPlayImageCache['collectible_coin'] = img;
            requestAnimationFrame(() => renderProjectilePreviews());
          };
          if (img.complete && img.naturalWidth > 0) {
            coinImage = img;
            window._howToPlayImageCache['collectible_coin'] = img;
          }
        }
      }
      
      const centerX = coinCanvas.width / 2;
      const centerY = coinCanvas.height / 2;
      const coinSize = 60; // Preview size
      
      const hasValidImage = coinImage && 
                           (coinImage.complete || coinImage.readyState === 'complete') && 
                           coinImage.naturalWidth > 0;
      
      if (hasValidImage) {
        try {
          // Use getCollectibleDimensions if available, otherwise use fixed size
          let coinDims;
          if (typeof window.getCollectibleDimensions === 'function') {
            coinDims = window.getCollectibleDimensions(coinImage);
            // Scale to fit preview canvas
            const scale = Math.min(coinSize / coinDims.width, coinSize / coinDims.height);
            const scaledWidth = coinDims.width * scale;
            const scaledHeight = coinDims.height * scale;
            ctx.drawImage(coinImage, centerX - scaledWidth/2, centerY - scaledHeight/2, scaledWidth, scaledHeight);
          } else {
            // Calculate dimensions maintaining aspect ratio
            const aspectRatio = coinImage.naturalHeight / coinImage.naturalWidth;
            const width = coinSize;
            const height = coinSize * aspectRatio;
            ctx.drawImage(coinImage, centerX - width/2, centerY - height/2, width, height);
          }
        } catch (e) {
          // Fallback: draw a gold circle
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(centerX, centerY, coinSize/2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Fallback: draw a gold circle
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(centerX, centerY, coinSize/2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Power-up Preview (Blue) - use actual power-up image
  // Only render if visible (performance optimization)
  const powerupCanvas = document.getElementById('powerupPreview');
  if (powerupCanvas && powerupCanvas.offsetParent !== null) {
    const ctx = powerupCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, powerupCanvas.width, powerupCanvas.height);
      
      // Get power-up bonus image (use cache)
      if (!window._howToPlayImageCache) {
        window._howToPlayImageCache = {};
      }
      
      let powerupBonusImage = window._howToPlayImageCache['powerup_bonus'];
      if (!powerupBonusImage) {
        if (typeof window.getGameImage === 'function') {
          powerupBonusImage = window.getGameImage('powerup_bonus');
        }
        if ((!powerupBonusImage || !powerupBonusImage.complete) && window.ImagePreloader) {
          powerupBonusImage = window.ImagePreloader.get('powerup_bonus');
        }
        window._howToPlayImageCache['powerup_bonus'] = powerupBonusImage;
      }
      
      if (!powerupBonusImage || !powerupBonusImage.complete || powerupBonusImage.naturalWidth === 0) {
        if (!powerupCanvas._imageLoadAttempted) {
          powerupCanvas._imageLoadAttempted = true;
          const img = new Image();
          img.src = 'assets/Power_Up_Sui_Rocket.webp';
          img.onload = () => {
            window._howToPlayImageCache['powerup_bonus'] = img;
            requestAnimationFrame(() => renderProjectilePreviews());
          };
          if (img.complete && img.naturalWidth > 0) {
            powerupBonusImage = img;
            window._howToPlayImageCache['powerup_bonus'] = img;
          }
        }
      }
      
      const centerX = powerupCanvas.width / 2;
      const centerY = powerupCanvas.height / 2;
      const powerupSize = 60; // Preview size
      
      const hasValidImage = powerupBonusImage && 
                           (powerupBonusImage.complete || powerupBonusImage.readyState === 'complete') && 
                           powerupBonusImage.naturalWidth > 0;
      
      if (hasValidImage) {
        try {
          // Use getCollectibleDimensions if available, otherwise use fixed size
          let powerupDims;
          if (typeof window.getCollectibleDimensions === 'function') {
            powerupDims = window.getCollectibleDimensions(powerupBonusImage);
            // Scale to fit preview canvas
            const scale = Math.min(powerupSize / powerupDims.width, powerupSize / powerupDims.height);
            const scaledWidth = powerupDims.width * scale;
            const scaledHeight = powerupDims.height * scale;
            ctx.drawImage(powerupBonusImage, centerX - scaledWidth/2, centerY - scaledHeight/2, scaledWidth, scaledHeight);
          } else {
            // Calculate dimensions maintaining aspect ratio
            const aspectRatio = powerupBonusImage.naturalHeight / powerupBonusImage.naturalWidth;
            const width = powerupSize;
            const height = powerupSize * aspectRatio;
            ctx.drawImage(powerupBonusImage, centerX - width/2, centerY - height/2, width, height);
          }
        } catch (e) {
          // Fallback: draw a green circle
          ctx.fillStyle = '#00ff00';
          ctx.beginPath();
          ctx.arc(centerX, centerY, powerupSize/2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Fallback: draw a green circle
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, powerupSize/2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Power-down Preview (Red) - use actual power-down image
  const powerdownCanvas = document.getElementById('powerdownPreview');
  if (powerdownCanvas) {
    const ctx = powerdownCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, powerdownCanvas.width, powerdownCanvas.height);
      
      // Get power-up malus image (use cache)
      if (!window._howToPlayImageCache) {
        window._howToPlayImageCache = {};
      }
      
      let powerupMalusImage = window._howToPlayImageCache['powerup_malus'];
      if (!powerupMalusImage) {
        if (typeof window.getGameImage === 'function') {
          powerupMalusImage = window.getGameImage('powerup_malus');
        }
        if ((!powerupMalusImage || !powerupMalusImage.complete) && window.ImagePreloader) {
          powerupMalusImage = window.ImagePreloader.get('powerup_malus');
        }
        window._howToPlayImageCache['powerup_malus'] = powerupMalusImage;
      }
      
      if (!powerupMalusImage || !powerupMalusImage.complete || powerupMalusImage.naturalWidth === 0) {
        if (!powerdownCanvas._imageLoadAttempted) {
          powerdownCanvas._imageLoadAttempted = true;
          const img = new Image();
          img.src = 'assets/Power_Down_Sui_Rocket.webp';
          img.onload = () => {
            window._howToPlayImageCache['powerup_malus'] = img;
            requestAnimationFrame(() => renderProjectilePreviews());
          };
          if (img.complete && img.naturalWidth > 0) {
            powerupMalusImage = img;
            window._howToPlayImageCache['powerup_malus'] = img;
          }
        }
      }
      
      const centerX = powerdownCanvas.width / 2;
      const centerY = powerdownCanvas.height / 2;
      const powerdownSize = 60; // Preview size
      
      const hasValidImage = powerupMalusImage && 
                           (powerupMalusImage.complete || powerupMalusImage.readyState === 'complete') && 
                           powerupMalusImage.naturalWidth > 0;
      
      if (hasValidImage) {
        try {
          // Use getCollectibleDimensions if available, otherwise use fixed size
          let powerdownDims;
          if (typeof window.getCollectibleDimensions === 'function') {
            powerdownDims = window.getCollectibleDimensions(powerupMalusImage);
            // Scale to fit preview canvas
            const scale = Math.min(powerdownSize / powerdownDims.width, powerdownSize / powerdownDims.height);
            const scaledWidth = powerdownDims.width * scale;
            const scaledHeight = powerdownDims.height * scale;
            ctx.drawImage(powerupMalusImage, centerX - scaledWidth/2, centerY - scaledHeight/2, scaledWidth, scaledHeight);
          } else {
            // Calculate dimensions maintaining aspect ratio
            const aspectRatio = powerupMalusImage.naturalHeight / powerupMalusImage.naturalWidth;
            const width = powerdownSize;
            const height = powerdownSize * aspectRatio;
            ctx.drawImage(powerupMalusImage, centerX - width/2, centerY - height/2, width, height);
          }
        } catch (e) {
          // Fallback: draw a red circle
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(centerX, centerY, powerdownSize/2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Fallback: draw a red circle
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, powerdownSize/2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Force Field Preview (Level 1) - render like in-game
  // Handle both force field previews (Abilities & Powers and Collectibles)
  // Only render if visible (performance optimization)
  const forceFieldCanvasIds = ['forceFieldPreview', 'forceFieldPreviewCollectibles'];
  
  forceFieldCanvasIds.forEach(canvasId => {
    const forceFieldCanvas = document.getElementById(canvasId);
    if (forceFieldCanvas && forceFieldCanvas.offsetParent !== null) {
      const ctx = forceFieldCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, forceFieldCanvas.width, forceFieldCanvas.height);
        
        // Level 1 force field rendering (matching in-game rendering)
        const fieldLevel = 1;
        const fieldRadius = 50 + (fieldLevel * 10) - (fieldLevel === 3 ? 5 : 0); // Level 1: 60px
        const fieldColor = fieldLevel === 1 ? '#4DA2FF' : 
                           fieldLevel === 3 ? '#FFD700' : '#39ff14'; // Level 1: Sui blue
        const fieldAlpha = 0.3 + (fieldLevel * 0.1); // Level 1: 0.4
        
        // Animated pulsing effect
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const pulseIntensity = fieldLevel === 3 ? 0.15 : 0.1; // Level 1: 0.1
        const pulseScale = 1 + pulseIntensity * Math.sin(now * 0.01);
        const pulseRadius = fieldRadius * pulseScale;
        
        const centerX = forceFieldCanvas.width / 2;
        const centerY = forceFieldCanvas.height / 2;
        
        // Create gradient for force field
        const fieldGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
        fieldGrad.addColorStop(0, `rgba(255,255,255,${fieldAlpha * 0.5})`);
        fieldGrad.addColorStop(0.7, fieldColor + Math.floor(fieldAlpha * 255).toString(16).padStart(2, '0'));
        fieldGrad.addColorStop(1, 'rgba(255,255,255,0)');
        
        // Draw force field circle
        ctx.fillStyle = fieldGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw force field outline
        ctx.strokeStyle = fieldColor;
        ctx.lineWidth = fieldLevel === 3 ? 3 : 2; // Level 1: 2
        ctx.globalAlpha = fieldAlpha;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
        
      // Animate the force field (re-render on next frame for animation)
      // Only start animation if canvas is visible
      if (forceFieldCanvas.dataset.animating !== 'true' && forceFieldCanvas.offsetParent !== null) {
        forceFieldCanvas.dataset.animating = 'true';
        let lastFrameTime = performance.now();
        const animateForceField = (currentTime) => {
          const canvas = document.getElementById(canvasId);
          if (canvas && canvas.offsetParent !== null) {
            // Throttle to ~30fps for animations (saves performance)
            if (currentTime - lastFrameTime >= 33) {
              renderProjectilePreviews();
              lastFrameTime = currentTime;
            }
            requestAnimationFrame(animateForceField);
          } else {
            forceFieldCanvas.dataset.animating = 'false';
          }
        };
        requestAnimationFrame(animateForceField);
      }
      }
    }
  });
}

/**
 * Setup carousel navigation
 */
function setupHowToPlayCarousels() {
  // Show initial tab and content
  showHowToPlayTab(0);
  generateContentSectionNav();
  showHowToPlayContent(0);
  
  // Update arrow button states
  updateHowToPlayCarouselButtons();
  
  // Update scroll button states when content sections nav scrolls
  const contentNavContainer = document.getElementById('howToPlayContentSectionsNav');
  if (contentNavContainer) {
    contentNavContainer.addEventListener('scroll', updateHowToPlayCarouselButtons);
  }
}

/**
 * Show specific tab
 */
function showHowToPlayTab(tabIndex) {
  if (!window.howToPlayState) return;
  
  const state = window.howToPlayState;
  if (tabIndex < 0 || tabIndex >= state.tabs.length) return;
  
  state.currentTabIndex = tabIndex;
  const tab = state.tabs[tabIndex];
  
  // Update active tab button
  document.querySelectorAll('.how-to-play-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.querySelector(`[data-tab-index="${tabIndex}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    // Scroll active tab into view
    activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
  
  // Hide all tab contents
  document.querySelectorAll('.how-to-play-tab-content').forEach(content => {
    content.style.display = 'none';
  });
  
  // Show current tab content
  const currentTabContent = document.getElementById(`tab-${tab.id}`);
  if (currentTabContent) {
    currentTabContent.style.display = 'block';
    // Reset content index when switching tabs
    state.currentContentIndex = 0;
    // Generate section navigation for new tab
    generateContentSectionNav();
    // Show first section of new tab
    setTimeout(() => showHowToPlayContent(0), 50);
  }
  
  updateHowToPlayCarouselButtons();
}

/**
 * Select tab by index (called from button click)
 */
function howToPlaySelectTab(tabIndex) {
  showHowToPlayTab(tabIndex);
}

/**
 * Scroll tabs left or right
 */
function howToPlayScrollTabs(direction) {
  const tabsContainer = document.getElementById('howToPlayTabsContainer');
  if (!tabsContainer) return;
  
  const scrollAmount = 200; // pixels to scroll
  const currentScroll = tabsContainer.scrollLeft;
  const newScroll = direction === 'left' 
    ? currentScroll - scrollAmount 
    : currentScroll + scrollAmount;
  
  tabsContainer.scrollTo({
    left: newScroll,
    behavior: 'smooth'
  });
}

/**
 * Show specific content section within current tab
 */
function showHowToPlayContent(contentIndex) {
  if (!window.howToPlayState) return;
  
  const state = window.howToPlayState;
  const currentTab = state.tabs[state.currentTabIndex];
  const currentTabContent = document.getElementById(`tab-${currentTab.id}`);
  
  if (!currentTabContent) return;
  
  const sections = currentTabContent.querySelectorAll('.how-to-play-content-section');
  if (sections.length === 0) return;
  
  // Wrap around if out of bounds
  if (contentIndex < 0) contentIndex = sections.length - 1;
  if (contentIndex >= sections.length) contentIndex = 0;
  
  state.currentContentIndex = contentIndex;
  
  // Update active section button
  const navContainer = document.getElementById('howToPlayContentSectionsNav');
  if (navContainer) {
    const sectionButtons = navContainer.querySelectorAll('.how-to-play-content-section-btn');
    sectionButtons.forEach((btn, idx) => {
      if (idx === contentIndex) {
        btn.classList.add('active');
        // Scroll active button into view
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  // Hide all sections
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show current section
  const currentSection = sections[contentIndex];
  if (currentSection) {
    currentSection.style.display = 'block';
  }
  
  updateHowToPlayCarouselButtons();
}

/**
 * Generate content section navigation buttons for current tab
 */
function generateContentSectionNav() {
  if (!window.howToPlayState) return;
  
  const state = window.howToPlayState;
  const currentTab = state.tabs[state.currentTabIndex];
  const currentTabContent = document.getElementById(`tab-${currentTab.id}`);
  
  if (!currentTabContent) return;
  
  const sections = currentTabContent.querySelectorAll('.how-to-play-content-section');
  const navContainer = document.getElementById('howToPlayContentSectionsNav');
  
  if (!navContainer || sections.length === 0) {
    if (navContainer) navContainer.innerHTML = '';
    return;
  }
  
  let navHtml = '';
  sections.forEach((section, index) => {
    const header = section.querySelector('.how-to-play-section-header h3');
    const title = header ? header.textContent.trim() : `Section ${index + 1}`;
    const isActive = index === state.currentContentIndex ? 'active' : '';
    
    navHtml += `
      <button class="how-to-play-content-section-btn ${isActive}" 
              data-section-index="${index}"
              onclick="howToPlaySelectContent(${index})"
              aria-label="${title}">
        ${title}
      </button>
    `;
  });
  
  navContainer.innerHTML = navHtml;
}

/**
 * Select content section by index (called from button click)
 */
function howToPlaySelectContent(sectionIndex) {
  showHowToPlayContent(sectionIndex);
}

/**
 * Scroll content sections left or right
 */
function howToPlayScrollContent(direction) {
  const navContainer = document.getElementById('howToPlayContentSectionsNav');
  if (!navContainer) return;
  
  const scrollAmount = 200; // pixels to scroll
  const currentScroll = navContainer.scrollLeft;
  const newScroll = direction === 'left' 
    ? currentScroll - scrollAmount 
    : currentScroll + scrollAmount;
  
  navContainer.scrollTo({
    left: newScroll,
    behavior: 'smooth'
  });
}

/**
 * Navigate to next tab
 */
function howToPlayNextTab() {
  if (!window.howToPlayState) return;
  const state = window.howToPlayState;
  const nextIndex = (state.currentTabIndex + 1) % state.tabs.length;
  showHowToPlayTab(nextIndex);
}

/**
 * Navigate to previous tab
 */
function howToPlayPrevTab() {
  if (!window.howToPlayState) return;
  const state = window.howToPlayState;
  const prevIndex = (state.currentTabIndex - 1 + state.tabs.length) % state.tabs.length;
  showHowToPlayTab(prevIndex);
}

/**
 * Navigate to next content section
 */
function howToPlayNextContent() {
  if (!window.howToPlayState) return;
  const state = window.howToPlayState;
  const currentTab = state.tabs[state.currentTabIndex];
  const currentTabContent = document.getElementById(`tab-${currentTab.id}`);
  
  if (!currentTabContent) return;
  
  const sections = currentTabContent.querySelectorAll('.how-to-play-content-section');
  if (sections.length === 0) return;
  
  const nextIndex = (state.currentContentIndex + 1) % sections.length;
  showHowToPlayContent(nextIndex);
}

/**
 * Navigate to previous content section
 */
function howToPlayPrevContent() {
  if (!window.howToPlayState) return;
  const state = window.howToPlayState;
  const currentTab = state.tabs[state.currentTabIndex];
  const currentTabContent = document.getElementById(`tab-${currentTab.id}`);
  
  if (!currentTabContent) return;
  
  const sections = currentTabContent.querySelectorAll('.how-to-play-content-section');
  if (sections.length === 0) return;
  
  const prevIndex = (state.currentContentIndex - 1 + sections.length) % sections.length;
  showHowToPlayContent(prevIndex);
}

/**
 * Update carousel button states (enable/disable based on position)
 */
function updateHowToPlayCarouselButtons() {
  if (!window.howToPlayState) return;
  const state = window.howToPlayState;
  
  // Tab navigation buttons (always enabled - circular navigation)
  const tabPrevBtn = document.getElementById('howToPlayTabPrevBtn');
  const tabNextBtn = document.getElementById('howToPlayTabNextBtn');
  
  if (tabPrevBtn) tabPrevBtn.disabled = false;
  if (tabNextBtn) tabNextBtn.disabled = false;
  
  // Content scroll buttons - check if scrolling is possible
  const contentNavContainer = document.getElementById('howToPlayContentSectionsNav');
  const contentScrollPrevBtn = document.getElementById('howToPlayContentScrollPrevBtn');
  const contentScrollNextBtn = document.getElementById('howToPlayContentScrollNextBtn');
  
  if (contentNavContainer && contentScrollPrevBtn && contentScrollNextBtn) {
    const canScrollLeft = contentNavContainer.scrollLeft > 0;
    const canScrollRight = contentNavContainer.scrollLeft < (contentNavContainer.scrollWidth - contentNavContainer.clientWidth - 1);
    
    contentScrollPrevBtn.disabled = !canScrollLeft;
    contentScrollNextBtn.disabled = !canScrollRight;
  }
}

/**
 * Show the How to Play modal
 */
function showHowToPlayModal() {
  const modal = document.getElementById('instructionsPanel');
  if (modal) {
    modal.classList.remove('instructions-panel-hidden');
    modal.classList.add('instructions-panel-visible');
    
    // Initialize on first show
    if (!modal.dataset.initialized) {
      initHowToPlayModal();
      modal.dataset.initialized = 'true';
    }
    
    // Reset to first tab and first content
    if (window.howToPlayState) {
      showHowToPlayTab(0);
      showHowToPlayContent(0);
    }
  }
}

/**
 * Hide the How to Play modal
 */
function hideHowToPlayModal() {
  const modal = document.getElementById('instructionsPanel');
  if (modal) {
    modal.classList.add('instructions-panel-hidden');
    modal.classList.remove('instructions-panel-visible');
  }
}

// Export functions
if (typeof window !== 'undefined') {
  window.showHowToPlayModal = showHowToPlayModal;
  window.hideHowToPlayModal = hideHowToPlayModal;
  window.howToPlayNextTab = howToPlayNextTab;
  window.howToPlayPrevTab = howToPlayPrevTab;
  window.howToPlayNextContent = howToPlayNextContent;
  window.howToPlayPrevContent = howToPlayPrevContent;
  window.howToPlaySelectTab = howToPlaySelectTab;
  window.howToPlayScrollTabs = howToPlayScrollTabs;
  window.howToPlaySelectContent = howToPlaySelectContent;
  window.howToPlayScrollContent = howToPlayScrollContent;
  window.showHowToPlayTab = showHowToPlayTab;
  window.showHowToPlayContent = showHowToPlayContent;
}

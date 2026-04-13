// ==========================================
// FORCE FIELD RENDERING - Reusable Utility
// ==========================================
// Extracted from player-rendering.js for use in previews and in-game

/**
 * Render force field at specified position and level
 * Reusable function that can be called from in-game or preview contexts
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} centerX - X position of force field center
 * @param {number} centerY - Y position of force field center
 * @param {number} level - Force field level (1, 2, or 3)
 * @param {number} [timeOverride] - Optional time override for animation (defaults to performance.now())
 */
function renderForceFieldAt(ctx, centerX, centerY, level, timeOverride) {
  if (!level || level < 1 || level > 3) return;
  
  ctx.save();
  
  // Force field properties based on level
  // Level 1: 60px radius, Level 2: 70px, Level 3: 75px
  const fieldRadius = 50 + (level * 10) - (level === 3 ? 5 : 0);
  // Level 1: Sui blue, Level 2+: Highlighter green, Level 3: Gold tint
  const fieldColor = level === 1 ? '#4DA2FF' : 
                     level === 3 ? '#FFD700' : '#39ff14';
  // Level 1: 0.4, Level 2: 0.5, Level 3: 0.6
  const fieldAlpha = 0.3 + (level * 0.1);
  
  // Animated pulsing effect (stronger pulse for higher levels)
  // Use performance.now() instead of Date.now() for better performance
  const now = timeOverride !== undefined ? timeOverride : (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const pulseIntensity = level === 3 ? 0.15 : 0.1;
  const pulseScale = 1 + pulseIntensity * Math.sin(now * 0.01);
  const pulseRadius = fieldRadius * pulseScale;
  
  // Create gradient for force field (gradients are context-specific, can't cache effectively)
  // But we can optimize by using simpler gradient for lower levels
  const fieldGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
  fieldGrad.addColorStop(0, `rgba(255,255,255,${fieldAlpha * 0.5})`);
  fieldGrad.addColorStop(0.7, fieldColor + Math.floor(fieldAlpha * 255).toString(16).padStart(2, '0'));
  fieldGrad.addColorStop(1, 'rgba(255,255,255,0)');
  
  // Draw force field circle
  ctx.fillStyle = fieldGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw force field outline (thicker for level 3)
  ctx.strokeStyle = fieldColor;
  ctx.lineWidth = level === 3 ? 3 : 2;
  ctx.globalAlpha = fieldAlpha;
  ctx.beginPath();
  ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Add sparkle effects for level 2 and 3
  if (level >= 2) {
    if (level === 3) {
      // Level 3: Atomic model - orbiting particles around force field
      const orbitRadius = pulseRadius * 0.7; // Orbit slightly inside the force field
      const orbitSpeed = now * 0.003; // Rotation speed (use cached 'now' value)
      const particleSize = 3;
      ctx.globalAlpha = 0.9;
      
      // Create multiple orbital rings for atomic model effect
      const rings = [
        { radius: orbitRadius * 0.6, speed: orbitSpeed, offset: 0, count: 6 },
        { radius: orbitRadius, speed: -orbitSpeed * 0.7, offset: Math.PI / 3, count: 6 }
      ];
      
      rings.forEach(ring => {
        for (let i = 0; i < ring.count; i++) {
          const angle = ring.offset + (i * (Math.PI * 2 / ring.count)) + ring.speed;
          const sparkleX = centerX + Math.cos(angle) * ring.radius;
          const sparkleY = centerY + Math.sin(angle) * ring.radius;
          
          // Gold particles with glow effect
          ctx.fillStyle = '#FFD700';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#FFD700';
          ctx.beginPath();
          ctx.arc(sparkleX, sparkleY, particleSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Reset shadow
          ctx.shadowBlur = 0;
        }
      });
    } else {
      // Level 2: Static sparkles (use cached 'now' value)
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 8; i++) {
        const angle = (now * 0.002 + i * Math.PI / 4) % (Math.PI * 2);
        const sparkleX = centerX + Math.cos(angle) * (pulseRadius * 0.8);
        const sparkleY = centerY + Math.sin(angle) * (pulseRadius * 0.8);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  ctx.restore();
}

// Export for use in preview contexts (like how-to-play modal) and in-game
if (typeof window !== 'undefined') {
  window.renderForceFieldAt = renderForceFieldAt;
}

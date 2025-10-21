// ==========================================
// BACKGROUND RENDERING
// ==========================================

// Render horizontal background
function renderBackground(ctx) {
  if (!game.bossActive && !game.bossWarning) {
    ctx.drawImage(backgroundImage, -game.bgX, 0, game.width, game.height);
    ctx.drawImage(backgroundImage, game.width - game.bgX, 0, game.width, game.height);
  } else {
    // Static background during boss phase
    ctx.drawImage(backgroundImage, 0, 0, game.width, game.height);
  }
}

// Render lane dividers
function renderLaneDividers(ctx) {
  ctx.strokeStyle='#333'; 
  ctx.lineWidth=2; 
  ctx.setLineDash([10,10]);
  ctx.lineDashOffset=-game.score*0.5;
  for (let i=1;i<3;i++){
    const y=i*game.laneHeight;
    ctx.beginPath(); 
    ctx.moveTo(0,y); 
    ctx.lineTo(game.width,y); 
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

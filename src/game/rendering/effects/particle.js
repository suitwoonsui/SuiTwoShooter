// Particle class (moved from utils/helpers.js)
class Particle {
  constructor(x, y, color, velocity) {
    this.x = x; this.y = y;
    this.color = color;
    this.velocity = velocity || { x: Math.random()*2 + 1, y: (Math.random()-0.5)*4 };
    this.life = 1.0; this.decay = 0.02;
    this.size = Math.random()*3 + 2;
  }
  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.life -= this.decay;
    this.size *= 0.98;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}



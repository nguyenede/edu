/* ============================================================================
   KIYOEDU SCROLLYTELLING ENGINE · SUBTLE MINIMALIST ACADEMIC GRID
   Lightweight, Quiet & Resilient Background Canvas Engine
   Zero AI Glow · Zero Noise · Pure Technical Elegance
   ============================================================================ */

export class ScrollytellingEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.storyPos = 0;
    this.targetStoryPos = 0;
    this.globalProgress = 0;
    this.targetGlobalProgress = 0;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.active = true;

    this.resize();
  }

  async init() {
    this.resize();
    return 'canvas2d-minimal';
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    if (this.canvas) {
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      if (this.ctx) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
      }
    }
  }

  setStoryPos(pos, globalProg = 0) {
    this.targetStoryPos = pos;
    this.targetGlobalProgress = globalProg;
  }

  render(timestamp = 0) {
    if (!this.ctx || !this.active) return;

    // Smooth spring interpolation for story position
    this.storyPos += (this.targetStoryPos - this.storyPos) * 0.12;
    this.globalProgress += (this.targetGlobalProgress - this.globalProgress) * 0.12;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Subtle minimalist dot grid (spacing: 48px)
    const gridSize = 48;
    const dotRadius = 0.85;
    const offsetX = (this.width % gridSize) / 2;
    const offsetY = (this.height % gridSize) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.035)';

    for (let x = offsetX; x < this.width; x += gridSize) {
      for (let y = offsetY; y < this.height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

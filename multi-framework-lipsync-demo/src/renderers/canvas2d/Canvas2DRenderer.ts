import { VISEMES } from 'wawa-lipsync';
import { LipsyncRenderer, LipsyncFeatures } from '@/core/types';

export class Canvas2DRenderer implements LipsyncRenderer {
  public readonly id = 'canvas2d';
  public readonly name = '2D Canvas';

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  private animationFrameId: number | null = null;
  private currentViseme: VISEMES = VISEMES.sil;
  
  // Avatar image
  private avatarImage: HTMLImageElement | null = null;
  private imageLoaded = false;
  
  // Animation state
  private time = 0;
  private targetMouthScale = { width: 1, height: 1 };
  private currentMouthScale = { width: 1, height: 1 };
  
  // Mouth overlay parameters (adjusted for portrait)
  private mouthArea = {
    x: 0.5, // Relative position on the face (0-1) - centered
    y: 0.7, // Relative position on the face (0-1) - mouth level
    width: 0.08, // Relative width - smaller
    height: 0.04 // Relative height - smaller
  };

  async init(container: HTMLElement): Promise<void> {
    this.container = container;
    container.innerHTML = '';

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.background = 'linear-gradient(to bottom, #f0f0f0, #e0e0e0)';
    
    container.appendChild(this.canvas);
    
    // Get 2D context
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to get 2D rendering context');
    }

    // Load avatar image
    await this.loadAvatarImage();
    
    // Set up resize handling
    this.handleResize();
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    resizeObserver.observe(container);

    // Start animation loop
    this.startAnimation();
  }

  private async loadAvatarImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.avatarImage = new Image();
      this.avatarImage.crossOrigin = 'anonymous';
      
      this.avatarImage.onload = () => {
        this.imageLoaded = true;
        console.log('Avatar image loaded successfully');
        resolve();
      };
      
      this.avatarImage.onerror = (error) => {
        console.error('Failed to load avatar image:', error);
        reject(error);
      };
      
      // Use the portrait image
      this.avatarImage.src = '/assets/u4711316717_A_hyperrealistic_lifelike_full-frontal_half-body__b275ae75-ddfb-4a20-8aa1-3c58999b635d_0.png';
    });
  }

  updateViseme(viseme: VISEMES, features: LipsyncFeatures): void {
    // Apply viseme animation
    this.currentViseme = viseme;
    this.targetMouthScale = this.getVisemeScale(viseme, features);
  }

  private getVisemeScale(viseme: VISEMES, features: LipsyncFeatures): { width: number; height: number } {
    const volume = Math.min(features.volume * 2, 1); // Amplify volume for visibility
    
    switch (viseme) {
      case VISEMES.sil:
        return { width: 0.8, height: 0.3 };
      
      case VISEMES.aa: // "ah" sound - wide open
        return { width: 1.5 * (1 + volume * 0.5), height: 1.8 * (1 + volume * 0.5) };
      
      case VISEMES.E: // "eh" sound - medium open
        return { width: 1.2 * (1 + volume * 0.3), height: 1.3 * (1 + volume * 0.3) };
      
      case VISEMES.I: // "ih" sound - slightly open
        return { width: 1.0 * (1 + volume * 0.2), height: 0.8 * (1 + volume * 0.2) };
      
      case VISEMES.O: // "oh" sound - round
        return { width: 1.1 * (1 + volume * 0.3), height: 1.4 * (1 + volume * 0.3) };
      
      case VISEMES.U: // "oo" sound - small round
        return { width: 0.8 * (1 + volume * 0.2), height: 1.2 * (1 + volume * 0.2) };
      
      case VISEMES.PP: // P, B, M sounds - closed
        return { width: 0.5 * (1 + volume * 0.1), height: 0.2 * (1 + volume * 0.1) };
      
      case VISEMES.FF: // F, V sounds - narrow
        return { width: 1.0 * (1 + volume * 0.2), height: 0.6 * (1 + volume * 0.2) };
      
      case VISEMES.SS: // S, Z sounds - narrow
        return { width: 0.9 * (1 + volume * 0.2), height: 0.4 * (1 + volume * 0.2) };
      
      case VISEMES.TH: // Th sounds
        return { width: 1.0 * (1 + volume * 0.2), height: 0.7 * (1 + volume * 0.2) };
      
      default:
        return { width: 1.0 * (1 + volume * 0.2), height: 1.0 * (1 + volume * 0.2) };
    }
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.time += 0.016; // Assuming 60fps
      
      this.draw();
    };
    
    animate();
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;

    const { width, height } = this.canvas;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    
    if (!this.imageLoaded || !this.avatarImage) {
      // Show loading message
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Loading avatar...', width / 2, height / 2);
      return;
    }

    // Calculate image dimensions to fit the canvas while maintaining aspect ratio
    const imgAspect = this.avatarImage.width / this.avatarImage.height;
    const canvasAspect = width / height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgAspect > canvasAspect) {
      // Image is wider than canvas
      drawHeight = height;
      drawWidth = height * imgAspect;
      drawX = (width - drawWidth) / 2;
      drawY = 0;
    } else {
      // Image is taller than canvas
      drawWidth = width;
      drawHeight = width / imgAspect;
      drawX = 0;
      drawY = (height - drawHeight) / 2;
    }

    // Draw the avatar image
    this.ctx.drawImage(this.avatarImage, drawX, drawY, drawWidth, drawHeight);

    // Smooth lerp for mouth scaling
    const lerpSpeed = 0.15;
    this.currentMouthScale.width += (this.targetMouthScale.width - this.currentMouthScale.width) * lerpSpeed;
    this.currentMouthScale.height += (this.targetMouthScale.height - this.currentMouthScale.height) * lerpSpeed;

    // Draw mouth animation overlay - NO DARK FILTER, just a subtle outline
    this.drawMouthOverlay(drawX, drawY, drawWidth, drawHeight);
    
    // Draw viseme indicator
    this.drawVisemeIndicator();
  }

  private drawMouthOverlay(imgX: number, imgY: number, imgWidth: number, imgHeight: number): void {
    if (!this.ctx) return;

    // Calculate mouth position on the image
    const mouthX = imgX + imgWidth * this.mouthArea.x;
    const mouthY = imgY + imgHeight * this.mouthArea.y;
    const mouthWidth = imgWidth * this.mouthArea.width * this.currentMouthScale.width;
    const mouthHeight = imgHeight * this.mouthArea.height * this.currentMouthScale.height;

    // Draw VERY subtle mouth animation indicator - just a light outline, NO FILL
    this.ctx.save();
    
    // Very light, barely visible outline when speaking
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + this.currentMouthScale.height * 0.3})`;
    this.ctx.lineWidth = Math.max(1, this.currentMouthScale.height * 1.5);
    this.ctx.beginPath();
    this.ctx.ellipse(
      mouthX,
      mouthY,
      mouthWidth / 2,
      mouthHeight / 2,
      0,
      0,
      2 * Math.PI
    );
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private drawVisemeIndicator(): void {
    if (!this.ctx || !this.canvas) return;

    // Draw current viseme indicator
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 60);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Viseme: ${this.currentViseme}`, 20, 35);
    this.ctx.fillText(`Mouth Scale: ${(this.currentMouthScale.height * 100).toFixed(0)}%`, 20, 55);
    this.ctx.restore();
  }

  private handleResize(): void {
    if (!this.canvas || !this.container) return;
    
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.container && this.canvas && this.container.contains(this.canvas)) {
      this.container.removeChild(this.canvas);
    }
    
    this.avatarImage = null;
    this.imageLoaded = false;
    this.container = null;
  }
}
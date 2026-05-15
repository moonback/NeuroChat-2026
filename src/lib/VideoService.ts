export class VideoService {
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private intervalId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  // Adaptive frequency state
  private lastImageData: ImageData | null = null;
  private lastFrameTime: number = 0;
  private readonly MIN_INTERVAL_MS = 400;   // 2.5 fps on high motion
  private readonly MAX_INTERVAL_MS = 8000;  // Every 8s if static
  private currentInterval = 1000;
  private readonly MOTION_THRESHOLD = 0.03; // 3% of pixels changed
  private consecutiveStaticFrames = 0;

  constructor(
    private onFrame: (base64: string) => void,
    private onMotion?: () => void
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  async start(facingMode: "user" | "environment" = "user") {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: facingMode
        } 
      });
      
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      
      await this.videoElement.play();
      this.loop();
    } catch (error) {
      console.error("Failed to start VideoService:", error);
      throw error;
    }
  }

  private loop() {
    if (!this.videoElement) return;

    this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    const currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const now = Date.now();
    let shouldSend = false;

    if (!this.lastImageData) {
      shouldSend = true;
    } else {
      const diff = this.calculateImageDifference(this.lastImageData, currentImageData);
      const timeSinceLast = now - this.lastFrameTime;

      if (diff > this.MOTION_THRESHOLD) {
        // High activity: increase frequency
        shouldSend = true;
        this.consecutiveStaticFrames = 0;
        this.currentInterval = Math.max(this.MIN_INTERVAL_MS, this.currentInterval * 0.7);
        console.log(`[Vision] 🚀 Mouvement détecté (${(diff * 100).toFixed(1)}%). Intervalle : ${this.currentInterval.toFixed(0)}ms`);
        this.onMotion?.();
      } else {
        // Static scene: decrease frequency
        this.consecutiveStaticFrames++;
        const oldInterval = this.currentInterval;
        this.currentInterval = Math.min(this.MAX_INTERVAL_MS, this.currentInterval + 500);
        
        if (oldInterval !== this.currentInterval && this.consecutiveStaticFrames % 5 === 0) {
          console.log(`[Vision] 💤 Scène statique. Ralentissement : ${this.currentInterval.toFixed(0)}ms`);
        }

        if (timeSinceLast >= this.currentInterval) {
          shouldSend = true;
        }
      }
    }

    if (shouldSend) {
      const base64 = this.canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      this.onFrame(base64);
      this.lastImageData = currentImageData;
      this.lastFrameTime = now;
    }

    this.intervalId = window.setTimeout(() => this.loop(), 100); 
  }

  private calculateImageDifference(last: ImageData, current: ImageData): number {
    const data1 = last.data;
    const data2 = current.data;
    let changedPixels = 0;
    const totalPixels = data1.length / 4;
    
    // Sample more aggressively but intelligently
    // We only check every 8th pixel to keep CPU low while being accurate enough
    const step = 4 * 8; 

    for (let i = 0; i < data1.length; i += step) {
      // Use luminance for better motion detection than raw RGB diff
      const lum1 = 0.299 * data1[i] + 0.587 * data1[i+1] + 0.114 * data1[i+2];
      const lum2 = 0.299 * data2[i] + 0.587 * data2[i+1] + 0.114 * data2[i+2];
      
      if (Math.abs(lum1 - lum2) > 35) { 
        changedPixels++;
      }
    }

    return changedPixels / (totalPixels / 8);
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  stop() {
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.lastImageData = null;
    this.lastFrameTime = 0;
    this.currentInterval = 1000;
    this.consecutiveStaticFrames = 0;
    
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}

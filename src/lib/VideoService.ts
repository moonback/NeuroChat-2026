export class VideoService {
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private intervalId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  // Motion detection state
  private lastImageData: ImageData | null = null;
  private lastFrameTime: number = 0;
  private readonly MOTION_THRESHOLD = 0.05; // 5% of pixels changed
  private readonly FORCE_SEND_MS = 10000; // Force a frame every 10s

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

      this.intervalId = window.setInterval(() => {
        if (!this.videoElement) return;
        
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
        
        const currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const now = Date.now();
        let shouldSend = false;

        if (!this.lastImageData || (now - this.lastFrameTime) > this.FORCE_SEND_MS) {
          shouldSend = true;
        } else {
          const diff = this.calculateImageDifference(this.lastImageData, currentImageData);
          if (diff > this.MOTION_THRESHOLD) {
            shouldSend = true;
            this.onMotion?.();
            console.log(`[Vision] Motion detected: ${(diff * 100).toFixed(1)}%`);
          }
        }

        if (shouldSend) {
          const base64 = this.canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          this.onFrame(base64);
          this.lastImageData = currentImageData;
          this.lastFrameTime = now;
        }
      }, 1000); 
    } catch (error) {
      console.error("Failed to start VideoService:", error);
      throw error;
    }
  }

  private calculateImageDifference(last: ImageData, current: ImageData): number {
    const data1 = last.data;
    const data2 = current.data;
    let changedPixels = 0;
    const totalPixels = data1.length / 4;
    const step = 4 * 4; // Sample every 4th pixel to save CPU

    for (let i = 0; i < data1.length; i += step) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
      
      if (rDiff + gDiff + bDiff > 100) { // Color difference threshold
        changedPixels++;
      }
    }

    return changedPixels / (totalPixels / 4);
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.lastImageData = null;
    this.lastFrameTime = 0;
    
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

export class VideoService {
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private intervalId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;

  constructor(private onFrame: (base64: string) => void) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d')!;
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
      this.videoElement.muted = true; // Avoid feedback if used for preview
      this.videoElement.playsInline = true;
      
      await this.videoElement.play();

      this.intervalId = window.setInterval(() => {
        if (!this.videoElement) return;
        
        // Draw the current video frame onto the canvas
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get the base64 string
        const base64 = this.canvas.toDataURL('image/jpeg', 0.6)
                           .split(',')[1];
        
        this.onFrame(base64);
      }, 1000); // 1 frame per second is enough for Gemini 2.0 Flash
    } catch (error) {
      console.error("Failed to start VideoService:", error);
      throw error;
    }
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
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

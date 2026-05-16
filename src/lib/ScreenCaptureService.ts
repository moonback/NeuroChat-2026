import { SemanticSnapshot } from "./VideoService";

/**
 * Capture d'écran pour le live Gemini : même canal que la caméra (frames JPEG).
 * Utilise l'API standard getDisplayMedia (navigateur ou Electron récent).
 */
export class ScreenCaptureService {
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private onEndedBound: (() => void) | null = null;
  
  // Motion detection state
  private lastImageData: ImageData | null = null;
  private lastFrameTime: number = 0;
  private readonly MOTION_THRESHOLD = 0.02; // 2% for screen
  private readonly FORCE_SEND_MS = 15000;
  
  // Semantic Perception
  private semanticHistory: SemanticSnapshot[] = [];
  private readonly STAGNATION_THRESHOLD_MS = 180000; // 3 minutes
  private lastSemanticChangeTime: number = Date.now();

  constructor(
    private onFrame: (base64: string) => void,
    private onStreamEnded?: () => void,
    private onMotion?: () => void,
    private onStagnation?: () => void
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 960;
    this.canvas.height = 540;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });

      const track = this.stream.getVideoTracks()[0];
      this.onEndedBound = () => {
        this.onStreamEnded?.();
        this.stop();
      };
      track.addEventListener("ended", this.onEndedBound);

      this.videoElement = document.createElement("video");
      this.videoElement.srcObject = this.stream;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      await this.videoElement.play();

      this.lastSemanticChangeTime = Date.now();
      this.loop();
    } catch (error) {
      console.error("ScreenCaptureService: getDisplayMedia failed", error);
      throw error;
    }
  }

  private loop = () => {
    if (!this.videoElement) return;

    const now = Date.now();
    // Screen update frequency: check every 1000ms is enough for most tasks
    if (now - this.lastFrameTime >= 1000) {
      this.processFrame(now);
      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private processFrame(now: number) {
    if (!this.videoElement) return;
    const vw = this.videoElement.videoWidth;
    const vh = this.videoElement.videoHeight;
    if (!vw || !vh) return;

    const scale = Math.min(960 / vw, 540 / vh, 1);
    const cw = Math.round(vw * scale);
    const ch = Math.round(vh * scale);
    
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }

    this.ctx.drawImage(this.videoElement, 0, 0, cw, ch);
    const currentImageData = this.ctx.getImageData(0, 0, cw, ch);
    
    // 1. Motion Detection (Pixels)
    let hasMotion = false;
    if (this.lastImageData) {
      const diff = this.calculateMotionScore(this.lastImageData, currentImageData);
      if (diff > this.MOTION_THRESHOLD) {
        hasMotion = true;
        this.onMotion?.();
      }
    }

    // 2. Semantic Analysis
    const signature = this.generateScreenSignature(currentImageData);
    const snapshot: SemanticSnapshot = {
      timestamp: now,
      signature,
      hasMotion
    };

    this.updateSemanticHistory(snapshot);

    // 3. Conditional Send
    if (hasMotion || !this.lastImageData || (now - this.lastFrameTime > this.FORCE_SEND_MS)) {
      const base64 = this.canvas.toDataURL("image/jpeg", 0.55).split(",")[1];
      this.onFrame(base64);
    }

    this.lastImageData = currentImageData;
  }

  private generateScreenSignature(imgData: ImageData): string {
    const data = imgData.data;
    const grid = 12; // High grid for screen to capture text layouts
    const stepX = Math.floor(imgData.width / grid);
    const stepY = Math.floor(imgData.height / grid);
    let signature = "";

    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const offset = (y * stepY * imgData.width + x * stepX) * 4;
        const avg = (data[offset] + data[offset+1] + data[offset+2]) / 3;
        signature += Math.floor(avg / 32).toString(16); // 8 levels of quantization
      }
    }
    return signature;
  }

  private updateSemanticHistory(snapshot: SemanticSnapshot) {
    const last = this.semanticHistory[this.semanticHistory.length - 1];

    if (!last || snapshot.signature !== last.signature) {
      this.lastSemanticChangeTime = snapshot.timestamp;
    } else {
      const duration = snapshot.timestamp - this.lastSemanticChangeTime;
      if (duration > this.STAGNATION_THRESHOLD_MS) {
        console.log(`[Vision] 🖥️ Stagnation sémantique écran détectée (${(duration/1000).toFixed(0)}s)`);
        this.onStagnation?.();
        this.lastSemanticChangeTime = snapshot.timestamp + (this.STAGNATION_THRESHOLD_MS / 2);
      }
    }

    this.semanticHistory.push(snapshot);
    if (this.semanticHistory.length > 20) this.semanticHistory.shift();
  }

  private calculateMotionScore(last: ImageData, current: ImageData): number {
    const data1 = last.data;
    const data2 = current.data;
    let changedPixels = 0;
    const step = 8 * 4; 

    for (let i = 0; i < data1.length; i += step) {
      if (Math.abs(data1[i] - data2[i]) + Math.abs(data1[i+1] - data2[i+1]) + Math.abs(data1[i+2] - data2[i+2]) > 60) {
        changedPixels++;
      }
    }
    return changedPixels / (data1.length / (4 * 8));
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastImageData = null;
    this.semanticHistory = [];

    if (this.stream) {
      const track = this.stream.getVideoTracks()[0];
      if (track && this.onEndedBound) {
        track.removeEventListener("ended", this.onEndedBound);
      }
      this.onEndedBound = null;
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}

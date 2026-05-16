import type { ScreenSemanticSummary } from "./screenSemanticLayer";

export type SemanticSnapshot = {
  timestamp: number;
  signature: string; // Hash ou identifiant unique de l'état visuel/logique
  userActivity?: "typing" | "reading" | "idle" | "away";
  mood?: string;
  hasMotion: boolean;
  screenSummary?: ScreenSemanticSummary;
};

export class VideoService {
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  
  // Motion detection (Physical)
  private lastImageData: ImageData | null = null;
  private lastFrameTime: number = 0;
  private lastFrameSentTime: number = 0;
  private readonly MOTION_THRESHOLD = 0.15;
  private readonly MIN_INTERVAL_MS = 500;
  private readonly MAX_INTERVAL_MS = 8000;
  private currentInterval = 2000;
  
  // Semantic Perception (Cognitive)
  private semanticHistory: SemanticSnapshot[] = [];
  private readonly MAX_HISTORY = 30;
  private readonly STAGNATION_THRESHOLD_MS = 180000; // 3 minutes
  private lastSemanticChangeTime: number = Date.now();

  private worker: Worker;
  private isAnalyzing = false;

  constructor(
    private onFrame: (base64: string) => void,
    private onMotion?: () => void,
    private onStagnation?: () => void
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

    this.worker = new Worker(new URL('./visionWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
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
      this.lastSemanticChangeTime = Date.now();
      this.loop();
    } catch (error) {
      console.error("Failed to start VideoService:", error);
      throw error;
    }
  }

  private loop = () => {
    if (!this.videoElement) return;

    const now = Date.now();
    const elapsed = now - this.lastFrameTime;

    // Throttling adaptatif basé sur currentInterval
    if (elapsed >= this.currentInterval) {
      this.processFrame(now);
      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private processFrame(now: number) {
    this.ctx.drawImage(this.videoElement!, 0, 0, this.canvas.width, this.canvas.height);
    const currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    // Clone to keep a reference for the next cycle
    const imageDataClone = new ImageData(
      new Uint8ClampedArray(currentImageData.data),
      currentImageData.width,
      currentImageData.height
    );

    this.worker.postMessage({
      type: 'analyze',
      payload: {
        currentImageData,
        lastImageData: this.lastImageData,
        threshold: this.MOTION_THRESHOLD,
        width: this.canvas.width,
        height: this.canvas.height
      }
    }, [currentImageData.data.buffer]);

    this.lastImageData = imageDataClone;
  }

  private handleWorkerMessage(data: any) {
    const { type, payload } = data;
    if (type !== 'analysis_result') return;

    const { signature, hasMotion } = payload;
    const now = Date.now();
    this.isAnalyzing = false;

    // 1. Motion Response
    if (hasMotion) {
      this.currentInterval = Math.max(this.MIN_INTERVAL_MS, this.currentInterval * 0.7);
      this.onMotion?.();
    } else {
      this.currentInterval = Math.min(this.MAX_INTERVAL_MS, this.currentInterval + 400);
    }

    // 2. Semantic History
    const snapshot: SemanticSnapshot = {
      timestamp: now,
      signature,
      hasMotion,
    };
    this.updateSemanticHistory(snapshot);

    // 3. Send frame
    if (hasMotion || !this.lastImageData || (now - this.lastFrameSentTime > this.MAX_INTERVAL_MS)) {
      const base64 = this.canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
      this.onFrame(base64);
      this.lastFrameSentTime = now;
    }
  }

  private updateSemanticHistory(snapshot: SemanticSnapshot) {
    const lastSnapshot = this.semanticHistory[this.semanticHistory.length - 1];

    // Découplage : On ne réinitialise le timer de stagnation QUE si la signature change
    if (!lastSnapshot || snapshot.signature !== lastSnapshot.signature) {
      this.lastSemanticChangeTime = snapshot.timestamp;
    } else {
      // Si la signature est identique depuis trop longtemps
      const stagnationDuration = snapshot.timestamp - this.lastSemanticChangeTime;
      if (stagnationDuration > this.STAGNATION_THRESHOLD_MS) {
        console.log(`[Vision] 🧠 Stagnation sémantique détectée (${(stagnationDuration/1000).toFixed(0)}s)`);
        this.onStagnation?.();
        // On repousse le prochain trigger pour éviter le spam
        this.lastSemanticChangeTime = snapshot.timestamp + (this.STAGNATION_THRESHOLD_MS / 2);
      }
    }

    this.semanticHistory.push(snapshot);
    if (this.semanticHistory.length > this.MAX_HISTORY) {
      this.semanticHistory.shift();
    }
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
    this.lastFrameSentTime = 0;
    this.semanticHistory = [];
    
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    if (this.worker) {
      this.worker.terminate();
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}

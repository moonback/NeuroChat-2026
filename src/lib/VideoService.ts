export type SemanticSnapshot = {
  timestamp: number;
  signature: string; // Hash ou identifiant unique de l'état visuel/logique
  userActivity?: "typing" | "reading" | "idle" | "away";
  mood?: string;
  hasMotion: boolean;
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
  private readonly MOTION_THRESHOLD = 0.15;
  private readonly MIN_INTERVAL_MS = 500;
  private readonly MAX_INTERVAL_MS = 8000;
  private currentInterval = 2000;
  
  // Semantic Perception (Cognitive)
  private semanticHistory: SemanticSnapshot[] = [];
  private readonly MAX_HISTORY = 30;
  private readonly STAGNATION_THRESHOLD_MS = 180000; // 3 minutes
  private lastSemanticChangeTime: number = Date.now();

  constructor(
    private onFrame: (base64: string) => void,
    private onMotion?: () => void,
    private onStagnation?: () => void
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
    if (!this.videoElement) return;

    this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    const currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // 1. Détection de mouvement physique (Pixel-based)
    let hasMotion = false;
    if (this.lastImageData) {
      const diff = this.calculateMotionScore(this.lastImageData, currentImageData);
      if (diff > this.MOTION_THRESHOLD) {
        hasMotion = true;
        this.currentInterval = Math.max(this.MIN_INTERVAL_MS, this.currentInterval * 0.7);
        this.onMotion?.();
      } else {
        this.currentInterval = Math.min(this.MAX_INTERVAL_MS, this.currentInterval + 400);
      }
    }

    // 2. Analyse Sémantique & Snapshot
    const signature = this.generateVisualSignature(currentImageData);
    const snapshot: SemanticSnapshot = {
      timestamp: now,
      signature,
      hasMotion,
    };

    this.updateSemanticHistory(snapshot);
    
    // 3. Envoi de la frame si nécessaire (mouvement ou intervalle forcé)
    if (hasMotion || !this.lastImageData || (now - this.lastFrameTime > this.MAX_INTERVAL_MS)) {
      const base64 = this.canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
      this.onFrame(base64);
    }

    this.lastImageData = currentImageData;
  }

  /**
   * Génère une signature visuelle basée sur la luminance moyenne ET la variance
   * dans chaque zone de la grille (8x8). Cela permet de détecter des changements
   * de texture ou de contraste même si la luminosité moyenne reste proche.
   */
  private generateVisualSignature(imgData: ImageData): string {
    const data = imgData.data;
    const grid = 8;
    const stepX = Math.floor(imgData.width / grid);
    const stepY = Math.floor(imgData.height / grid);
    let signature = "";

    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        
        // Échantillonnage interne à la zone pour calculer la variance
        for (let py = 0; py < stepY; py += 4) {
          for (let px = 0; px < stepX; px += 4) {
            const offset = ((y * stepY + py) * imgData.width + (x * stepX + px)) * 4;
            const lum = 0.299 * data[offset] + 0.587 * data[offset+1] + 0.114 * data[offset+2];
            sum += lum;
            sumSq += lum * lum;
            count++;
          }
        }
        
        const avg = sum / count;
        const variance = (sumSq / count) - (avg * avg);
        
        // Signature = (Moyenne quantifiée) + (Variance quantifiée)
        signature += Math.floor(avg / 32).toString(16);
        signature += Math.floor(Math.min(variance, 1000) / 100).toString(16);
      }
    }
    return signature;
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

  private calculateMotionScore(last: ImageData, current: ImageData): number {
    const data1 = last.data;
    const data2 = current.data;
    const width = current.width;
    const height = current.height;
    let weightedChangedPixels = 0;
    let totalWeight = 0;
    
    const step = 4 * 16; 

    for (let i = 0; i < data1.length; i += step) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      
      // Pondération zonale : le centre a un poids de 3.0, les bords 1.0
      const centerX = width / 2;
      const centerY = height / 2;
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
      const weight = 1 + (2 * (1 - dist / maxDist));
      
      const lum1 = 0.299 * data1[i] + 0.587 * data1[i+1] + 0.114 * data1[i+2];
      const lum2 = 0.299 * data2[i] + 0.587 * data2[i+1] + 0.114 * data2[i+2];
      
      if (Math.abs(lum1 - lum2) > 40) {
        weightedChangedPixels += weight;
      }
      totalWeight += weight;
    }

    return weightedChangedPixels / totalWeight;
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

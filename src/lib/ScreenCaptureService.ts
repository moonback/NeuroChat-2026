/**
 * Capture d'écran pour le live Gemini : même canal que la caméra (frames JPEG).
 * Utilise l'API standard getDisplayMedia (navigateur ou Electron récent).
 */
export class ScreenCaptureService {
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private intervalId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private onEndedBound: (() => void) | null = null;
  
  // Motion detection state
  private lastImageData: ImageData | null = null;
  private lastFrameTime: number = 0;
  private readonly MOTION_THRESHOLD = 0.02; // 2% for screen (more sensitive as text changes are small)
  private readonly FORCE_SEND_MS = 15000; // Force a frame every 15s for screen

  constructor(
    private onFrame: (base64: string) => void,
    private onStreamEnded?: () => void,
    private onMotion?: () => void
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

      this.intervalId = window.setInterval(() => {
        if (!this.videoElement) return;
        const vw = this.videoElement.videoWidth;
        const vh = this.videoElement.videoHeight;
        if (!vw || !vh) return;

        const maxW = 960;
        const maxH = 540;
        const scale = Math.min(maxW / vw, maxH / vh, 1);
        const cw = Math.round(vw * scale);
        const ch = Math.round(vh * scale);
        
        if (this.canvas.width !== cw || this.canvas.height !== ch) {
          this.canvas.width = cw;
          this.canvas.height = ch;
        }

        this.ctx.drawImage(this.videoElement, 0, 0, cw, ch);
        
        const currentImageData = this.ctx.getImageData(0, 0, cw, ch);
        const now = Date.now();
        let shouldSend = false;

        if (!this.lastImageData || (now - this.lastFrameTime) > this.FORCE_SEND_MS) {
          shouldSend = true;
        } else {
          const diff = this.calculateImageDifference(this.lastImageData, currentImageData);
          if (diff > this.MOTION_THRESHOLD) {
            shouldSend = true;
            this.onMotion?.();
            console.log(`[Vision] Screen change detected: ${(diff * 100).toFixed(1)}%`);
          }
        }

        if (shouldSend) {
          const base64 = this.canvas.toDataURL("image/jpeg", 0.55).split(",")[1];
          this.onFrame(base64);
          this.lastImageData = currentImageData;
          this.lastFrameTime = now;
        }
      }, 1000);
    } catch (error) {
      console.error("ScreenCaptureService: getDisplayMedia failed", error);
      throw error;
    }
  }

  private calculateImageDifference(last: ImageData, current: ImageData): number {
    const data1 = last.data;
    const data2 = current.data;
    let changedPixels = 0;
    const totalPixels = data1.length / 4;
    const step = 8 * 4; // Sample every 8th pixel (screen is higher res, optimize more)

    for (let i = 0; i < data1.length; i += step) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
      
      if (rDiff + gDiff + bDiff > 60) { // More sensitive for text
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
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.lastImageData = null;
    this.lastFrameTime = 0;

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

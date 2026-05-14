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

  constructor(
    private onFrame: (base64: string) => void,
    private onStreamEnded?: () => void
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 960;
    this.canvas.height = 540;
    this.ctx = this.canvas.getContext("2d")!;
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
        const base64 = this.canvas.toDataURL("image/jpeg", 0.55).split(",")[1];
        this.onFrame(base64);
      }, 1000);
    } catch (error) {
      console.error("ScreenCaptureService: getDisplayMedia failed", error);
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

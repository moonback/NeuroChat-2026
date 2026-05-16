/**
 * Media Backpressure Queue
 * Prevents overwhelming the IPC or network with too many frames.
 */
export class MediaBackpressureQueue {
  private inFlight = 0;
  private latestFrame: string | null = null;
  private latestType: 'audio' | 'video' = 'video';
  
  constructor(private maxInFlight = 2) {}

  enqueue(frame: string, type: 'audio' | 'video', send: (f: string, t: 'audio' | 'video') => Promise<void>) {
    this.latestFrame = frame;
    this.latestType = type;

    if (this.inFlight >= this.maxInFlight) {
      // Drop frame if already saturated, but keep the latest for next slot
      return;
    }

    this.processNext(send);
  }

  private async processNext(send: (f: string, t: 'audio' | 'video') => Promise<void>) {
    const nextFrame = this.latestFrame;
    const nextType = this.latestType;
    
    if (!nextFrame) return;

    this.latestFrame = null;
    this.inFlight++;

    try {
      await send(nextFrame, nextType);
    } catch (err) {
      console.error('[Backpressure] Failed to send frame', err);
    } finally {
      this.inFlight--;
      if (this.latestFrame) {
        // Schedule next frame if one arrived while this one was in flight
        setTimeout(() => this.processNext(send), 16); // Small delay to avoid tight loop
      }
    }
  }

  getInFlight() {
    return this.inFlight;
  }
}

/**
 * Common interfaces for audio services to allow 
 * cross-platform implementation (Web vs Mobile).
 */

export interface IAudioRecorder {
  /** Start capturing audio and call onAudioData with PCM 16-bit Base64 chunks.
   *  Optionally calls onAudioLevel with a normalized 0-1 RMS volume level. */
  start(
    onAudioData: (base64Data: string) => void,
    onAudioLevel?: (level: number) => void,
  ): Promise<void>;
  /** Stop capturing audio and release hardware resources */
  stop(): void;
}

export interface IAudioPlayer {
  /** Play a chunk of PCM 16-bit Base64 audio */
  play(base64Data: string): void;
  /** Clear the current playback queue */
  clearQueue(): void;
  /** Stop playback and release hardware resources */
  stop(): void;
}

import { IAudioPlayer } from "./AudioService";

export class AudioPlayer implements IAudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime: number = 0;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  play(base64Data: string) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
    }

    const audioBuffer = this.audioContext.createBuffer(
      1,
      float32Array.length,
      24000
    );
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    if (this.nextPlayTime < this.audioContext.currentTime) {
      this.nextPlayTime = this.audioContext.currentTime;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  clearQueue() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.nextPlayTime = 0;
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.nextPlayTime = 0;
  }
}

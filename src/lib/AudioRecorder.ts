import { IAudioRecorder } from "./AudioService";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export class AudioRecorder implements IAudioRecorder {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private monitorGain: GainNode | null = null;
  private stream: MediaStream | null = null;

  async start(onAudioData: (base64Data: string) => void, onAudioLevel: (level: number) => void): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      
      // Load and register the AudioWorklet
      await this.audioContext.audioWorklet.addModule('./audio-processor.js');
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.workletNode.port.onmessage = (event) => {
        const { pcm, rms } = event.data;
        
        // 1. Send PCM data as Base64 without spreading large buffers onto the stack
        const base64Data = arrayBufferToBase64(pcm);
        onAudioData(base64Data);

        // 2. Calculate and send audio level
        // Ensure level is a valid number and never NaN
        const level = Math.min(1, (Number.isFinite(rms) ? rms : 0) * 3);
        onAudioLevel(level);
      };

      this.monitorGain = this.audioContext.createGain();
      this.monitorGain.gain.value = 0;

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.monitorGain);
      this.monitorGain.connect(this.audioContext.destination);
      
      console.log("✅ AudioWorklet démarré avec succès");
    } catch (error) {
      console.error("Error starting AudioWorklet recording:", error);
      throw error;
    }
  }

  stop(): void {
    this.workletNode?.disconnect();
    this.monitorGain?.disconnect();
    this.source?.disconnect();
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
    }
    this.stream?.getTracks().forEach(track => track.stop());
    
    this.workletNode = null;
    this.monitorGain = null;
    this.source = null;
    this.audioContext = null;
    this.stream = null;
  }
}

import { IAudioRecorder } from "./AudioService";

export class AudioRecorder implements IAudioRecorder {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
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
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.workletNode.port.onmessage = (event) => {
        const { pcm, rms } = event.data;
        
        // 1. Send PCM data as Base64
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcm)));
        onAudioData(base64Data);

        // 2. Calculate and send audio level
        // Ensure level is a valid number and never NaN
        const level = Math.min(1, (Number.isFinite(rms) ? rms : 0) * 3);
        onAudioLevel(level);
      };

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);
      
      console.log("✅ AudioWorklet démarré avec succès");
    } catch (error) {
      console.error("Error starting AudioWorklet recording:", error);
      throw error;
    }
  }

  stop(): void {
    this.workletNode?.disconnect();
    this.source?.disconnect();
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
    }
    this.stream?.getTracks().forEach(track => track.stop());
    
    this.workletNode = null;
    this.source = null;
    this.audioContext = null;
    this.stream = null;
  }
}

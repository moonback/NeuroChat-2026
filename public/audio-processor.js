/**
 * AudioProcessor Worklet
 * Handles PCM 16-bit conversion and RMS calculation in a separate thread.
 */
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      
      // Calculate RMS for audio level
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      
      // Convert to Int16
      const pcmData = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Send to main thread
      this.port.postMessage({
        pcm: pcmData.buffer,
        rms: rms
      }, [pcmData.buffer]);
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);

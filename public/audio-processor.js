/**
 * AudioProcessor Worklet
 * Handles PCM 16-bit conversion, RMS calculation, and noise gating in a separate thread.
 * Optimized for performance with minimal allocations and efficient processing.
 */
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Noise gate threshold (adjustable via messages)
    this.noiseThreshold = 0.01;
    
    // Smoothing for RMS calculation (prevents jitter)
    this.smoothedRMS = 0;
    this.smoothingFactor = 0.8;
    
    // Peak detection for clipping warning
    this.peakLevel = 0;
    this.peakDecay = 0.95;
    
    // Listen for configuration messages
    this.port.onmessage = (event) => {
      if (event.data.noiseThreshold !== undefined) {
        this.noiseThreshold = event.data.noiseThreshold;
      }
      if (event.data.smoothingFactor !== undefined) {
        this.smoothingFactor = event.data.smoothingFactor;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // No input or empty channel
    if (!input || input.length === 0) {
      return true;
    }
    
    const channelData = input[0];
    const length = channelData.length;
    
    // Early exit for empty buffer
    if (length === 0) {
      return true;
    }
    
    // Calculate RMS and peak in a single pass (more efficient)
    let sumSquares = 0;
    let peak = 0;
    
    for (let i = 0; i < length; i++) {
      const sample = channelData[i];
      sumSquares += sample * sample;
      const absSample = Math.abs(sample);
      if (absSample > peak) {
        peak = absSample;
      }
    }
    
    const instantRMS = Math.sqrt(sumSquares / length);
    
    // Smooth RMS to reduce visual jitter
    this.smoothedRMS = (this.smoothingFactor * this.smoothedRMS) + 
                       ((1 - this.smoothingFactor) * instantRMS);
    
    // Update peak with decay
    this.peakLevel = Math.max(peak, this.peakLevel * this.peakDecay);
    
    // Noise gate: only process if above threshold
    const isSilent = instantRMS < this.noiseThreshold;
    
    // Convert to Int16 PCM with optimized clamping
    const pcmData = new Int16Array(length);
    
    if (isSilent) {
      // Fill with silence (zeros) - faster than processing
      pcmData.fill(0);
    } else {
      // Process audio samples
      for (let i = 0; i < length; i++) {
        // Clamp to [-1, 1] range
        const clamped = Math.max(-1, Math.min(1, channelData[i]));
        // Convert to 16-bit PCM
        pcmData[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      }
    }

    // Send to main thread with metadata
    this.port.postMessage({
      pcm: pcmData.buffer,
      rms: this.smoothedRMS,
      instantRMS: instantRMS,
      peak: this.peakLevel,
      isSilent: isSilent,
      isClipping: this.peakLevel > 0.95
    }, [pcmData.buffer]);
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);

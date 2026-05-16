/**
 * Runtime Metrics Store
 * Tracks performance, resource usage, and AI costs.
 */
import { runtimeEvents } from './events';

export interface MetricsState {
  audioChunksPerSec: number;
  videoFramesPerSec: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: {
    aiResponse: number[]; // ms
    dbWrite: number[];    // ms
  };
  activeSignals: {
    mic: boolean;
    camera: boolean;
    screen: boolean;
    memory: boolean;
  };
}

class MetricsStore {
  private state: MetricsState = {
    audioChunksPerSec: 0,
    videoFramesPerSec: 0,
    tokenUsage: { prompt: 0, completion: 0, total: 0 },
    latency: { aiResponse: [], dbWrite: [] },
    activeSignals: { mic: false, camera: false, screen: false, memory: false }
  };

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    runtimeEvents.on('media:mic:active', ({ active }) => {
      this.state.activeSignals.mic = active;
    });
    runtimeEvents.on('media:camera:active', ({ active }) => {
      this.state.activeSignals.camera = active;
    });
    runtimeEvents.on('media:screen:active', ({ active }) => {
      this.state.activeSignals.screen = active;
    });
    runtimeEvents.on('memory:write', () => {
      this.state.activeSignals.memory = true;
      setTimeout(() => { this.state.activeSignals.memory = false; }, 1000);
    });
  }

  getSnapshot(): MetricsState {
    return { ...this.state };
  }

  recordTokenUsage(prompt: number, completion: number) {
    this.state.tokenUsage.prompt += prompt;
    this.state.tokenUsage.completion += completion;
    this.state.tokenUsage.total += (prompt + completion);
  }

  recordLatency(type: keyof MetricsState['latency'], ms: number) {
    this.state.latency[type].push(ms);
    if (this.state.latency[type].length > 100) {
      this.state.latency[type].shift();
    }
  }
}

export const metricsStore = new MetricsStore();

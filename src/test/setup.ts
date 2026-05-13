import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage with actual storage
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach(key => delete storage[key]);
  }),
};
global.localStorage = localStorageMock as any;

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 },
  })),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    buffer: null,
  })),
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    fftSize: 2048,
    getByteTimeDomainData: vi.fn(),
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  decodeAudioData: vi.fn(),
  currentTime: 0,
  destination: {},
  sampleRate: 48000,
  state: 'running',
  resume: vi.fn(),
  close: vi.fn(),
})) as any;

// Mock MediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
});

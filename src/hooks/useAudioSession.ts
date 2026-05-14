import { useState, useRef, useEffect, useCallback } from "react";
import { AudioRecorder } from "../lib/AudioRecorder";
import { AudioPlayer } from "../lib/AudioPlayer";
import { IAudioRecorder, IAudioPlayer } from "../lib/AudioService";

const LEVEL_POLL_MS = 64;

export function useAudioSession() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const levelPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRecorder = useRef<IAudioRecorder | null>(null);
  const audioPlayer = useRef<IAudioPlayer | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearLevelPoll = useCallback(() => {
    if (levelPollRef.current) {
      clearInterval(levelPollRef.current);
      levelPollRef.current = null;
    }
  }, []);

  /** Worklet fires very often — only touch a ref here; React is updated on a slow interval. */
  const handleAudioLevel = useCallback((level: number) => {
    const safeLevel = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
    audioLevelRef.current = safeLevel;
  }, []);

  useEffect(() => {
    audioRecorder.current = new AudioRecorder();
    audioPlayer.current = new AudioPlayer();

    return () => {
      clearLevelPoll();
      audioRecorder.current?.stop();
      audioPlayer.current?.stop();
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, [clearLevelPoll]);

  const playAudio = useCallback((base64Data: string) => {
    audioPlayer.current?.play(base64Data);
    setIsSpeaking(true);
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 1500);
  }, []);

  const stopAudio = useCallback(() => {
    audioPlayer.current?.clearQueue();
    setIsSpeaking(false);
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
  }, []);

  const startRecording = useCallback(
    (onAudioData: (base64: string) => void) => {
      clearLevelPoll();
      void (async () => {
        try {
          await audioRecorder.current?.start(onAudioData, handleAudioLevel);
          levelPollRef.current = setInterval(() => {
            const v = audioLevelRef.current;
            setAudioLevel((prev) => (Math.abs(prev - v) < 0.007 ? prev : v));
          }, LEVEL_POLL_MS);
        } catch {
          clearLevelPoll();
        }
      })();
    },
    [handleAudioLevel, clearLevelPoll]
  );

  const stopRecording = useCallback(() => {
    clearLevelPoll();
    audioRecorder.current?.stop();
    audioLevelRef.current = 0;
    setAudioLevel(0);
  }, [clearLevelPoll]);

  return {
    isSpeaking,
    audioLevel: Number.isFinite(audioLevel) ? audioLevel : 0,
    audioPlayer: audioPlayer.current,
    audioRecorder: audioRecorder.current,
    playAudio,
    stopAudio,
    startRecording,
    stopRecording,
    setIsSpeaking
  };
}

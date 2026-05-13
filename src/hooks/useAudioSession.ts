import { useState, useRef, useEffect, useCallback } from "react";
import { AudioRecorder } from "../lib/AudioRecorder";
import { AudioPlayer } from "../lib/AudioPlayer";
import { IAudioRecorder, IAudioPlayer } from "../lib/AudioService";

export function useAudioSession() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const audioRecorder = useRef<IAudioRecorder | null>(null);
  const audioPlayer = useRef<IAudioPlayer | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ultra-robust audio level handler
  const handleAudioLevel = useCallback((level: number) => {
    // 1. Force value to be a finite number or 0
    const safeLevel = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
    
    audioLevelRef.current = safeLevel;

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setAudioLevel(audioLevelRef.current);
        rafRef.current = null;
      });
    }
  }, []);

  useEffect(() => {
    audioRecorder.current = new AudioRecorder();
    audioPlayer.current = new AudioPlayer();

    return () => {
      audioRecorder.current?.stop();
      audioPlayer.current?.stop();
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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

  const startRecording = useCallback((onAudioData: (base64: string) => void) => {
    audioRecorder.current?.start(onAudioData, handleAudioLevel);
  }, [handleAudioLevel]);

  const stopRecording = useCallback(() => {
    audioRecorder.current?.stop();
    setAudioLevel(0);
  }, []);

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

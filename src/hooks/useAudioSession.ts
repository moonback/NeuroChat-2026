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

  const handleAudioLevel = useCallback((level: number) => {
    audioLevelRef.current = level;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        // Ensure level is a safe number
        const safeLevel = typeof audioLevelRef.current === 'number' && !isNaN(audioLevelRef.current) ? audioLevelRef.current : 0;
        setAudioLevel(safeLevel);
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
    audioLevel,
    audioPlayer: audioPlayer.current,
    audioRecorder: audioRecorder.current,
    playAudio,
    stopAudio,
    startRecording,
    stopRecording,
    setIsSpeaking
  };
}

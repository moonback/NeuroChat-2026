import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { ScreenCaptureService } from "../lib/ScreenCaptureService";
import { VideoService } from "../lib/VideoService";
import type { EmotionEngine } from "../lib/EmotionEngine";

type ConversationStatus = "idle" | "connecting" | "listening";
type SendInput = (base64: string, type: "audio" | "video") => void;

interface VisionControllerArgs {
  status: ConversationStatus;
  isSpeaking: boolean;
  sendTextMessage: (message: string) => void;
  setErrorMsg: (message: string | null) => void;
  sendInputRef: RefObject<SendInput | null>;
  emotionEngineRef: RefObject<EmotionEngine>;
}

export function useVisionController({
  status,
  isSpeaking,
  sendTextMessage,
  setErrorMsg,
  sendInputRef,
  emotionEngineRef,
}: VisionControllerArgs) {
  const [cameraActive, setCameraActive] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [visualActivity, setVisualActivity] = useState(false);
  const videoServiceRef = useRef<VideoService | null>(null);
  const screenCaptureServiceRef = useRef<ScreenCaptureService | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const lastVisionNudgeTimeRef = useRef(0);

  const triggerVisualActivity = useCallback((intensity = 0.5) => {
    setVisualActivity(true);
    emotionEngineRef.current.addMotionSignal(intensity);
    emotionEngineRef.current.setStagnation(false);
    setTimeout(() => setVisualActivity(false), 800);

    const now = Date.now();
    const cooldownMs = 60_000;

    if (status === "listening" && !isSpeaking && now - lastVisionNudgeTimeRef.current > cooldownMs) {
      console.log("👁️ [VisionController] Envoi signal [VISION_NUDGE]...");
      lastVisionNudgeTimeRef.current = now;
      sendTextMessage("[VISION_NUDGE] Un changement majeur a été détecté. Regarde l'image : si l'utilisateur te présente un objet, un document ou semble vouloir te montrer quelque chose, interviens avec curiosité. Sinon, reste discret et n'interviens que si c'est vraiment pertinent.");
    }
  }, [emotionEngineRef, isSpeaking, sendTextMessage, status]);

  const triggerStagnationNudge = useCallback((type: "camera" | "screen") => {
    emotionEngineRef.current.setStagnation(true);

    if (status === "listening" && !isSpeaking) {
      console.log(`👁️ [VisionController] Envoi signal [STAGNATION_NUDGE] (${type})...`);
      if (type === "screen") {
        sendTextMessage("[STAGNATION_NUDGE] L'écran est resté statique depuis plus de 3 minutes. Analyse le contenu (code, document, erreur) et demande gentiment à l'utilisateur s'il a besoin d'aide ou s'il est bloqué sur une tâche complexe.");
      } else {
        sendTextMessage("[STAGNATION_NUDGE] L'utilisateur semble inactif ou fixe devant la caméra depuis un moment. Interviens avec douceur pour vérifier s'il va bien ou s'il fait une pause contemplative.");
      }
    }
  }, [emotionEngineRef, isSpeaking, sendTextMessage, status]);

  const stopVisionServices = useCallback(() => {
    if (videoServiceRef.current) {
      videoServiceRef.current.stop();
      videoServiceRef.current = null;
    }
    if (screenCaptureServiceRef.current) {
      screenCaptureServiceRef.current.stop();
      screenCaptureServiceRef.current = null;
    }
    setScreenShareActive(false);
    setVideoStream(null);
  }, []);

  const handleToggleScreenShare = useCallback(async () => {
    if (screenShareActive) {
      screenCaptureServiceRef.current?.stop();
      screenCaptureServiceRef.current = null;
      setScreenShareActive(false);
      setVideoStream(videoServiceRef.current?.getStream() ?? null);
      return;
    }

    if (status !== "listening" || !sendInputRef.current) {
      setErrorMsg("Démarre une conversation avant de partager l’écran.");
      return;
    }

    try {
      const svc = new ScreenCaptureService(
        (videoBase64) => sendInputRef.current?.(videoBase64, "video"),
        () => {
          screenCaptureServiceRef.current = null;
          setScreenShareActive(false);
          setVideoStream(videoServiceRef.current?.getStream() ?? null);
        },
        triggerVisualActivity,
        () => triggerStagnationNudge("screen"),
      );
      await svc.start();
      screenCaptureServiceRef.current = svc;
      setScreenShareActive(true);
      setVideoStream(svc.getStream());
    } catch (err: unknown) {
      const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
      if (name !== "NotAllowedError" && name !== "AbortError") {
        setErrorMsg("Impossible de partager l’écran.");
      }
      console.error("Partage d’écran:", err);
    }
  }, [screenShareActive, sendInputRef, setErrorMsg, status, triggerStagnationNudge, triggerVisualActivity]);

  const toggleCameraFacingMode = useCallback(async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);

    if (videoServiceRef.current && cameraActive) {
      videoServiceRef.current.stop();
      try {
        await videoServiceRef.current.start(nextMode);
        setVideoStream(videoServiceRef.current.getStream() || null);
      } catch (err) {
        console.error("Erreur lors du changement de caméra:", err);
      }
    }
  }, [cameraActive, facingMode]);

  useEffect(() => {
    if (status === "listening" && cameraActive && !videoServiceRef.current && sendInputRef.current) {
      console.log("🎥 Activation de la caméra...");
      videoServiceRef.current = new VideoService((videoBase64) => {
        sendInputRef.current?.(videoBase64, "video");
      }, triggerVisualActivity, () => triggerStagnationNudge("camera"));

      videoServiceRef.current.start(facingMode)
        .then(() => {
          setVideoStream(videoServiceRef.current?.getStream() || null);
        })
        .catch((err) => {
          console.error("Erreur caméra:", err);
          setErrorMsg("Impossible d'accéder à la caméra.");
          setCameraActive(false);
        });
    } else if ((!cameraActive || status !== "listening") && videoServiceRef.current) {
      console.log("🛑 Désactivation de la caméra...");
      videoServiceRef.current.stop();
      videoServiceRef.current = null;
      setVideoStream(null);
    }
  }, [cameraActive, facingMode, sendInputRef, setErrorMsg, status, triggerStagnationNudge, triggerVisualActivity]);

  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  useEffect(() => {
    if (cameraPreviewRef.current && cameraActive && screenShareActive && videoServiceRef.current) {
      cameraPreviewRef.current.srcObject = videoServiceRef.current.getStream();
    }
  }, [cameraActive, screenShareActive]);

  return {
    cameraActive,
    setCameraActive,
    screenShareActive,
    facingMode,
    videoStream,
    videoPreviewRef,
    cameraPreviewRef,
    videoServiceRef,
    visualActivity,
    handleToggleScreenShare,
    toggleCameraFacingMode,
    stopVisionServices,
  };
}

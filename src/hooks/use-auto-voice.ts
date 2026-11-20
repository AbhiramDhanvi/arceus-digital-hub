import { useCallback, useEffect, useRef, useState } from "react";
import { getNirantarAsrUrl } from "@/lib/feature-flags";
import { createBrowserAutoRecognizer, type AutoVoiceController } from "@/lib/nirantar-voice";

/**
 * Automatic voice recognition + auto-mic controller.
 * - Primes microphone permission immediately on click gesture ("Talk to ARCEUS").
 * - Uses browser Web Speech API (en-IN / hi-IN / etc.) when available and no custom Nirantar endpoint overrides it.
 * - Falls back cleanly to MediaRecorder (Nirantar endpoint or Sarvam STT) if browser SpeechRecognition is unavailable.
 * - Bounds TTS playback with a safety timeout so the mic ALWAYS opens even if browser speechSynthesis stalls.
 */
export function useAutoVoice(opts: {
  locale: string;
  onFinalTranscript: (text: string, confidence: number) => void;
  onFallbackListen: () => void;
  onError: (msg: string) => void;
}) {
  const [autoListening, setAutoListening] = useState(false);
  const [interim, setInterim] = useState("");
  const ctrlRef = useRef<AutoVoiceController | null>(null);
  const micPrimedRef = useRef(false);
  const oRef = useRef(opts);
  oRef.current = opts;
  const hasNirantarEndpoint = getNirantarAsrUrl() !== null;

  useEffect(() => {
    const ctrl = createBrowserAutoRecognizer({
      onStart: () => {
        setAutoListening(true);
        setInterim("");
      },
      onInterim: (txt) => setInterim(txt),
      onFinal: (txt, conf) => {
        setAutoListening(false);
        setInterim("");
        oRef.current.onFinalTranscript(txt, conf);
      },
      onError: (code) => {
        setAutoListening(false);
        setInterim("");
        if (code === "not-allowed" || code === "service-not-allowed") {
          oRef.current.onError(
            "Microphone permission was denied. Allow mic access in your browser, or type your answer.",
          );
        } else if (code === "network" || code === "audio-capture") {
          // Fall back to MediaRecorder capture path if Web Speech backend isn't reachable
          oRef.current.onFallbackListen();
        } else if (code === "no-speech") {
          oRef.current.onError(
            "I didn't hear anything. Tap the mic to speak again, or type your answer.",
          );
        }
      },
      onEnd: () => {
        setAutoListening(false);
      },
    });
    ctrlRef.current = ctrl;
    return () => ctrl.abort();
  }, []);

  /**
   * Requests microphone permission immediately inside a user click gesture so
   * opening the mic after speaking the opening question succeeds reliably.
   */
  const primeMic = useCallback(async (): Promise<boolean> => {
    if (micPrimedRef.current) return true;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.getTracks().forEach((t) => t.stop());
      micPrimedRef.current = true;
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        oRef.current.onError(
          "Microphone permission was denied. Allow mic access in your browser, or type your answer.",
        );
      }
      return false;
    }
  }, []);

  const stopAutoListen = useCallback(() => {
    ctrlRef.current?.abort();
    setAutoListening(false);
    setInterim("");
  }, []);

  const openMic = useCallback(() => {
    if (!hasNirantarEndpoint && ctrlRef.current?.isSupported) {
      const started = ctrlRef.current.start(oRef.current.locale);
      if (started) return;
    }
    oRef.current.onFallbackListen();
  }, [hasNirantarEndpoint]);

  /**
   * Wraps TTS playback with a safety timeout so a stalled SpeechSynthesisUtterance
   * in an iframe/headless browser never prevents the microphone from opening.
   */
  const speakBounded = useCallback(
    async (speakFn: (text: string) => Promise<boolean>, text: string): Promise<boolean> => {
      const maxMs = Math.min(8_000, Math.max(2_200, text.length * 80));
      let timer: number | undefined;
      try {
        const result = await Promise.race([
          speakFn(text),
          new Promise<boolean>((resolve) => {
            timer = window.setTimeout(() => {
              try {
                window.speechSynthesis?.cancel();
              } catch {
                // ignore
              }
              resolve(true);
            }, maxMs);
          }),
        ]);
        return result;
      } finally {
        if (timer !== undefined) window.clearTimeout(timer);
      }
    },
    [],
  );

  return {
    autoListening,
    interim,
    primeMic,
    openMic,
    stopAutoListen,
    speakBounded,
    isBrowserRecognitionSupported: ctrlRef.current?.isSupported ?? false,
  };
}

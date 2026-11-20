// Automatic voice recognition adapter:
// 1. Optional AI4Bharat/Nirantar ASR HTTP inference endpoint (when NIRANTAR_ASR_URL is configured)
// 2. Browser Web Speech API (SpeechRecognition / webkitSpeechRecognition) for instant Indian-language ASR
// 3. Clean fallback to existing Sarvam STT server function via MediaRecorder
import { getNirantarAsrUrl } from "./feature-flags";

export interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [altIndex: number]: { transcript: string; confidence: number };
    };
  };
}

export interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

export function getBrowserSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
    SpeechRecognitionCtor | undefined;
  return typeof ctor === "function" ? ctor : null;
}

export interface NirantarTranscriptionResult {
  text: string;
  confidence: number;
  provider: "nirantar" | "browser" | "sarvam";
  error?: string | undefined;
}

/**
 * Sends recorded audio to a self-hosted AI4Bharat/Nirantar (IndicConformer / NeMo) HTTP endpoint
 * when VITE_NIRANTAR_ASR_URL is configured. Returns null when no endpoint is configured.
 */
export async function transcribeWithNirantarEndpoint(
  audioBase64: string,
  mime: string,
  lang: string,
): Promise<NirantarTranscriptionResult | null> {
  const url = getNirantarAsrUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio: audioBase64,
        mime,
        language: lang,
        framework: "ai4bharat-nirantar",
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok)
      return { text: "", confidence: 0, provider: "nirantar", error: `http_${res.status}` };
    const data = (await res.json()) as { transcript?: string; text?: string; confidence?: number };
    const text = (data.transcript ?? data.text ?? "").trim();
    const confidence =
      typeof data.confidence === "number" ? Math.max(0, Math.min(1, data.confidence)) : 0.88;
    return { text, confidence, provider: "nirantar", ...(text ? {} : { error: "no_speech" }) };
  } catch {
    return { text: "", confidence: 0, provider: "nirantar", error: "unavailable" };
  }
}

export interface AutoVoiceController {
  start: (locale: string) => boolean;
  stop: () => void;
  abort: () => void;
  isSupported: boolean;
}

/**
 * Creates a lightweight browser automatic speech recognition controller using Web Speech API.
 * Emits interim transcripts while speaking and final transcript + confidence on utterance end.
 */
export function createBrowserAutoRecognizer(handlers: {
  onStart?: () => void;
  onInterim?: (text: string) => void;
  onFinal: (text: string, confidence: number) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
}): AutoVoiceController {
  const Ctor = getBrowserSpeechRecognitionCtor();
  let active: BrowserSpeechRecognition | null = null;
  let emittedFinal = false;

  const stop = () => {
    try {
      active?.stop();
    } catch {
      // ignore if already stopped
    }
  };

  const abort = () => {
    try {
      active?.abort();
    } catch {
      // ignore
    }
    active = null;
  };

  const start = (locale: string): boolean => {
    if (!Ctor) return false;
    abort();
    const rec = new Ctor();
    active = rec;
    emittedFinal = false;
    rec.lang = locale;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => handlers.onStart?.();
    rec.onresult = (ev) => {
      let interim = "";
      let finalText = "";
      let finalConf = 0.85;
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const alt = res?.[0];
        if (!res || !alt) continue;
        if (res.isFinal) {
          finalText += alt.transcript;
          if (typeof alt.confidence === "number" && alt.confidence > 0) finalConf = alt.confidence;
        } else {
          interim += alt.transcript;
        }
      }
      if (interim.trim()) handlers.onInterim?.(interim.trim());
      if (finalText.trim() && !emittedFinal) {
        emittedFinal = true;
        handlers.onFinal(finalText.trim(), finalConf);
      }
    };
    rec.onerror = (ev) => {
      handlers.onError?.(ev.error);
    };
    rec.onend = () => {
      if (active === rec) active = null;
      handlers.onEnd?.();
    };

    try {
      rec.start();
      return true;
    } catch {
      active = null;
      return false;
    }
  };

  return { start, stop, abort, isSupported: Ctor !== null };
}

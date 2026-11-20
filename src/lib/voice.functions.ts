import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

// Sarvam AI speech, checked against docs.sarvam.ai on 2026-11-20:
// STT POST /speech-to-text (saaras:v4, mode=transcribe, language_code, multipart file, REST < 30 s)
// TTS POST /text-to-speech (bulbul:v3, language_code, speaker, output_audio_codec)
const LOCALES = { en: "en-IN", hi: "hi-IN", te: "te-IN", mr: "mr-IN", ta: "ta-IN", kn: "kn-IN", bn: "bn-IN" } as const;
const lang = z.enum(["en", "hi", "te", "mr", "ta", "kn", "bn"]);
/** Two distinct allow-listed bulbul:v3 voices, validated for English and Hindi. */
export const VOICES = { ishita: "Ishita (female)", ratan: "Ratan (male)" } as const;
const voice = z.enum(["ishita", "ratan"]);
const MIME_EXT: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3" };
const MAX_AUDIO_BYTES = 1_500_000; // ~25 s of compressed speech
const LIMITS = { user: 150, guest: 400 }; // requests per UTC day; guests share one global budget

export type VoiceError = "not_configured" | "auth" | "busy" | "quota" | "no_speech" | "too_long" | "bad_audio" | "unavailable";

async function quota(): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let bucket = "guest";
  const auth = getRequestHeader("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    const { data } = await supabaseAdmin.auth.getUser(token);
    if (data.user) bucket = `user:${data.user.id}`;
  }
  const { data, error } = await supabaseAdmin.rpc("consume_voice_quota", { _bucket: bucket, _max: bucket === "guest" ? LIMITS.guest : LIMITS.user });
  if (error) { console.error("voice quota", error.message); return false; }
  return data === true;
}

function statusError(status: number): VoiceError {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "busy";
  if (status === 400 || status === 422) return "bad_audio";
  return "unavailable";
}

/** Speech-to-text. Audio and transcript are not stored. */
export const transcribeSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ audio: z.string().min(100).max(Math.ceil(MAX_AUDIO_BYTES * 1.37)), mime: z.string().max(80), lang }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["SARVAM_API_KEY"];
    if (!key) return { text: "", locale: null as string | null, error: "not_configured" as VoiceError | null };
    const base = data.mime.split(";")[0]!.trim().toLowerCase();
    const ext = MIME_EXT[base];
    if (!ext) return { text: "", locale: null, error: "bad_audio" as VoiceError | null };
    let bytes: Uint8Array<ArrayBuffer>;
    try { const bin = atob(data.audio); bytes = new Uint8Array(new ArrayBuffer(bin.length)); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); } catch { return { text: "", locale: null, error: "bad_audio" as VoiceError | null }; }
    if (bytes.length > MAX_AUDIO_BYTES) return { text: "", locale: null, error: "too_long" as VoiceError | null };
    if (!(await quota())) return { text: "", locale: null, error: "quota" as VoiceError | null };
    try {
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: base }), `speech.${ext}`);
      form.append("model", "saaras:v4");
      form.append("mode", "transcribe");
      form.append("language_code", LOCALES[data.lang]);
      const r = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key }, body: form, signal: AbortSignal.timeout(20000) });
      if (!r.ok) { console.error("sarvam stt status", r.status); return { text: "", locale: null, error: statusError(r.status) as VoiceError | null }; }
      const j = (await r.json()) as { transcript?: string; language_code?: string | null };
      const text = (j.transcript ?? "").trim();
      return { text, locale: j.language_code ?? null, error: (text ? null : "no_speech") as VoiceError | null };
    } catch (e) {
      console.error("sarvam stt", e instanceof Error ? e.name : "error");
      return { text: "", locale: null, error: "unavailable" as VoiceError | null };
    }
  });

/** Text-to-speech; returns base64 MP3 (audio/mpeg, 24 kHz). */
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1).max(1200), lang, voice }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["SARVAM_API_KEY"];
    if (!key) return { audio: null as string | null, mime: null as string | null, error: "not_configured" as VoiceError | null };
    if (!(await quota())) return { audio: null, mime: null, error: "quota" as VoiceError | null };
    try {
      const r = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: { "api-subscription-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.text, language_code: LOCALES[data.lang], model: "bulbul:v3", speaker: data.voice, speech_sample_rate: 24000, output_audio_codec: "mp3" }),
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) { console.error("sarvam tts status", r.status); return { audio: null, mime: null, error: statusError(r.status) as VoiceError | null }; }
      const j = (await r.json()) as { audios?: string[] };
      const audio = j.audios?.[0] ?? null;
      return { audio, mime: audio ? "audio/mpeg" : null, error: (audio ? null : "unavailable") as VoiceError | null };
    } catch (e) {
      console.error("sarvam tts", e instanceof Error ? e.name : "error");
      return { audio: null, mime: null, error: "unavailable" as VoiceError | null };
    }
  });

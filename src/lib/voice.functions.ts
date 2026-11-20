import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CODES = { en: "en-IN", hi: "hi-IN", te: "te-IN", mr: "mr-IN", ta: "ta-IN", kn: "kn-IN", bn: "bn-IN" } as const;
const lang = z.enum(["en", "hi", "te", "mr", "ta", "kn", "bn"]);

/** Speech-to-text via Sarvam AI. */
export const transcribeSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ audio: z.string().min(10).max(8_000_000), mime: z.string().max(60), lang }).parse(d))
  .handler(async ({ data }) => {
    try {
      const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: data.mime.split(";")[0] }), "speech.webm");
      form.append("model", "saarika:v2.5");
      form.append("language_code", CODES[data.lang]);
      const r = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST", headers: { "api-subscription-key": process.env["SARVAM_API_KEY"]! }, body: form,
      });
      if (!r.ok) { console.error("sarvam stt", r.status, await r.text()); return { text: "", error: "Couldn't understand the audio." as string | null }; }
      const j = (await r.json()) as { transcript?: string };
      return { text: j.transcript ?? "", error: null as string | null };
    } catch (e) {
      console.error("sarvam stt", e);
      return { text: "", error: "Voice service unavailable." as string | null };
    }
  });

/** Text-to-speech via Sarvam AI; returns base64 WAV. */
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1).max(1500), lang }).parse(d))
  .handler(async ({ data }) => {
    try {
      const r = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: { "api-subscription-key": process.env["SARVAM_API_KEY"]!, "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.text.slice(0, 1500), target_language_code: CODES[data.lang], model: "bulbul:v2", speaker: "anushka" }),
      });
      if (!r.ok) { console.error("sarvam tts", r.status, await r.text()); return { audio: null as string | null }; }
      const j = (await r.json()) as { audios?: string[] };
      return { audio: j.audios?.[0] ?? null };
    } catch (e) {
      console.error("sarvam tts", e);
      return { audio: null as string | null };
    }
  });

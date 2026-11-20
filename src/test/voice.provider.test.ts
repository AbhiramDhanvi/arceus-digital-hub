// Live Sarvam round-trip with synthetic text only. Skipped when SARVAM_API_KEY is not set.
import { describe, it, expect } from "vitest";
const key = process.env["SARVAM_API_KEY"];
const tts = async (text: string, language_code: string, speaker: string) => {
  const r = await fetch("https://api.sarvam.ai/text-to-speech", { method: "POST", headers: { "api-subscription-key": key!, "Content-Type": "application/json" },
    body: JSON.stringify({ text, language_code, model: "bulbul:v3", speaker, speech_sample_rate: 24000, output_audio_codec: "mp3" }) });
  expect(r.status).toBe(200);
  return Buffer.from(((await r.json()) as { audios: string[] }).audios[0]!, "base64");
};
const stt = async (audio: Buffer, language_code: string) => {
  // Hand-built multipart body (the jsdom test environment's FormData is not fetch-compatible).
  const bd = "----arceus" + Date.now();
  const field = (n: string, v: string) => `--${bd}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`;
  const head = Buffer.from(field("model", "saaras:v4") + field("mode", "transcribe") + field("language_code", language_code) + `--${bd}\r\nContent-Disposition: form-data; name="file"; filename="speech.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`);
  const body = Buffer.concat([head, audio, Buffer.from(`\r\n--${bd}--\r\n`)]);
  const r = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key!, "Content-Type": `multipart/form-data; boundary=${bd}` }, body });
  expect(r.status).toBe(200);
  return (await r.json()) as { transcript: string; language_code: string | null };
};
describe.skipIf(!key)("sarvam voice", () => {
  it("Hindi turn: TTS (Ishita) → STT returns Hindi number answer", async () => {
    const a = await tts("मेरी उम्र बयालीस साल है", "hi-IN", "ishita");
    expect(a.subarray(0, 2).toString("hex")).toMatch(/^fff|^4944/); // MP3 frame or ID3
    const r = await stt(a, "hi-IN");
    expect(r.language_code).toBe("hi-IN");
    expect(r.transcript).toMatch(/42|बयालीस/);
  }, 60000);
  it("English turn: TTS (Ratan) → STT returns yes", async () => {
    const r = await stt(await tts("Yes, I have a savings account.", "en-IN", "ratan"), "en-IN");
    expect(r.language_code).toBe("en-IN");
    expect(r.transcript.toLowerCase()).toContain("yes");
  }, 60000);
  it("two voices produce different audio for the same text", async () => {
    const [a, b] = await Promise.all([tts("Namaste", "hi-IN", "ishita"), tts("Namaste", "hi-IN", "ratan")]);
    expect(a.equals(b)).toBe(false);
  }, 60000);
});

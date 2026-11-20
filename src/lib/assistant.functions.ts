import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LANGS: Record<string, string> = { en: "English", hi: "Hindi", te: "Telugu", mr: "Marathi", ta: "Tamil", kn: "Kannada", bn: "Bengali" };

async function chat(system: string, user: string): Promise<string> {
  const { generateChatCompletion } = await import("@lovable.dev/ai-gateway");
  const res = await generateChatCompletion({
    model: "openai/gpt-6.1-terra",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  const c = res.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : "";
}

/**
 * Fallback only after the deterministic parser fails. Sends just the one utterance and the
 * expected answer type — no other personal facts. Output is restricted to one typed value,
 * which the client must ask the user to confirm. Never returns verdicts or criteria.
 */
export const extractAnswer = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    text: z.string().min(1).max(300),
    kind: z.enum(["yesno", "age", "money", "monthly", "choice"]),
    choices: z.array(z.string().max(40)).max(8),
  }).parse(d))
  .handler(async ({ data }) => {
    try {
      const out = await chat(
        `You convert one spoken answer (Indian English or Hindi, maybe a speech transcript) into a single value. Expected type: ${data.kind}.
yesno -> true|false|"unknown"; age -> integer years; money -> integer rupees; monthly -> integer rupees per month (divide yearly by 12); choice -> exactly one of ${JSON.stringify(data.choices)}.
Reply ONLY JSON {"value": <value or null>}. Use null if the answer does not clearly give the value. Never guess.`,
        data.text,
      );
      const json = out.match(/\{[\s\S]*\}/)?.[0];
      const v: unknown = json ? (JSON.parse(json) as { value?: unknown }).value : null;
      const ok =
        (data.kind === "yesno" && (v === true || v === false || v === "unknown")) ||
        ((data.kind === "age") && typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 120) ||
        ((data.kind === "money" || data.kind === "monthly") && typeof v === "number" && v >= 0 && v < 1e9) ||
        (data.kind === "choice" && typeof v === "string" && data.choices.includes(v));
      return { value: ok ? (v as string | number | boolean) : null, error: null as string | null };
    } catch (e) {
      console.error("extractAnswer", e instanceof Error ? e.name : "error");
      return { value: null, error: "unavailable" as string | null };
    }
  });

/** Translation for languages without built-in wording. Falls back to the original text. */
export const translateReply = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1).max(2000), lang: z.enum(["en", "hi", "te", "mr", "ta", "kn", "bn"]) }).parse(d))
  .handler(async ({ data }) => {
    if (data.lang === "en") return { text: data.text, translated: false };
    try {
      const t = await chat(`Translate into simple spoken ${LANGS[data.lang]}. Keep scheme names, numbers, rupee amounts and URLs unchanged. Do not add or remove any condition. Reply with the translation only.`, data.text);
      return { text: t || data.text, translated: !!t };
    } catch (e) {
      console.error("translateReply", e instanceof Error ? e.name : "error");
      return { text: data.text, translated: false };
    }
  });

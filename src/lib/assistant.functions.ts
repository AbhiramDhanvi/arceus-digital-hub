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

/** AI only extracts facts from free speech; it never decides eligibility. */
export const extractWithAI = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1).max(500), expecting: z.string().max(40).nullable(), options: z.array(z.string().max(80)).max(20).optional() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const out = await chat(
        `Extract facts about an Indian citizen from their message (any Indian language or English, possibly a speech transcript). Reply ONLY with JSON using these optional keys:
age (number), occupation ("farmer"|"student"|"business"|"salaried"|"unemployed"|"homemaker"|"other"), gender ("female"|"male"|"other"), category ("sc"|"st"|"obc"|"ews"|"general"), annualIncome (number INR per year), state (English state name), area ("rural"|"urban"), disability (bool), bpl (bool, has BPL/Antyodaya ration card), incomeTaxPayer (bool), ownsFarmland (bool), landAcres (number), educationLevel ("school"|"12th"|"diploma"|"ug"|"pg"), businessStage ("idea"|"startup"|"existing").
The assistant just asked about: ${data.expecting ?? "nothing specific"}${data.options?.length ? ` (choices: ${data.options.join(" / ")})` : ""}. A short reply like "yes", "haan", "avunu", a number or a choice answers that question. Omit unknown keys. Never guess.`,
        data.text,
      );
      const json = out.match(/\{[\s\S]*\}/)?.[0];
      return { facts: json ? (JSON.parse(json) as Record<string, string | number | boolean>) : {}, error: null as string | null };
    } catch (e) {
      console.error("extractWithAI", e);
      return { facts: {} as Record<string, string | number | boolean>, error: "AI is unavailable right now." as string | null };
    }
  });

export const translateReply = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1).max(2000), lang: z.enum(["en", "hi", "te", "mr", "ta", "kn", "bn"]) }).parse(d))
  .handler(async ({ data }) => {
    if (data.lang === "en") return { text: data.text };
    try {
      const t = await chat(`Translate into simple spoken ${LANGS[data.lang]}. Keep scheme names, numbers and URLs unchanged. Reply with the translation only.`, data.text);
      return { text: t || data.text };
    } catch (e) {
      console.error("translateReply", e);
      return { text: data.text };
    }
  });

/** AI writes a personalized report from deterministic results; it must not change any verdict or score. */
export const personalizeAnswer = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    facts: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    results: z.array(z.object({ id: z.string().max(60), name: z.string().max(120), status: z.string().max(40), score: z.number(), met: z.array(z.string().max(200)).max(10), failed: z.array(z.string().max(200)).max(10), missing: z.array(z.string().max(40)).max(10) })).max(25),
    lang: z.enum(["en", "hi", "te", "mr", "ta", "kn", "bn"]),
  }).parse(d))
  .handler(async ({ data }) => {
    try {
      const out = await chat(
        `You are ARCEUS, a warm assistant for Indian government schemes. Using ONLY the given statuses and match scores (never change or add a verdict), reply with JSON: {"summary": string, "advice": {"<scheme id>": string}}.
summary: a spoken answer of 80-120 words in simple ${LANGS[data.lang]}, addressed to this person using their details (occupation, age, state, income). Name each likely-eligible scheme with its benefit idea, then the top 1-2 schemes that need verification and what is missing, then the single best next step. Say final approval is by the government office. No markdown, no URLs.
advice: for EVERY scheme, 1-2 sentences in ${LANGS[data.lang]}: if likely eligible, the practical tip to apply; if not eligible, which criterion failed and a realistic alternative or how to bridge the gap; if needs verification, what to confirm.`,
        JSON.stringify({ person: data.facts, results: data.results }),
      );
      const json = out.match(/\{[\s\S]*\}/)?.[0];
      const parsed = json ? (JSON.parse(json) as { summary?: string; advice?: Record<string, string> }) : {};
      return { text: parsed.summary ?? null, advice: parsed.advice ?? {} };
    } catch (e) {
      console.error("personalizeAnswer", e);
      return { text: null as string | null, advice: {} as Record<string, string> };
    }
  });

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
  .inputValidator((d) => z.object({ text: z.string().min(1).max(500), expecting: z.string().max(40).nullable() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const out = await chat(
        `Extract facts about an Indian citizen from their message (any language). Reply ONLY with JSON using these optional keys: age (number), occupation ("farmer"|"student"|"business"|"salaried"|"unemployed"|"other"), annualIncome (number INR), ownsFarmland (bool), incomeTaxPayer (bool), gender ("female"|"male"|"other"), category ("sc"|"st"|"obc"|"general"), bpl (bool). The assistant just asked about: ${data.expecting ?? "nothing specific"}. Omit unknown keys. Never guess.`,
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

/** AI writes a personalized spoken answer from deterministic results; it must not change any verdict. */
export const personalizeAnswer = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    facts: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    results: z.array(z.object({ name: z.string().max(120), status: z.string().max(40), reasons: z.array(z.string().max(300)).max(10) })).max(20),
    lang: z.enum(["en", "hi", "te", "mr", "ta", "kn", "bn"]),
  }).parse(d))
  .handler(async ({ data }) => {
    try {
      const t = await chat(
        `You are ARCEUS, a warm voice assistant for Indian government schemes. Write a short spoken answer (max 90 words) in simple ${LANGS[data.lang]} for this person, using their details. Use ONLY the eligibility statuses given; never change or add a verdict. Mention likely eligible schemes first, then the single most useful next step. Say final approval is by the government office. No markdown, no URLs.`,
        JSON.stringify({ person: data.facts, results: data.results }),
      );
      return { text: t || null };
    } catch (e) {
      console.error("personalizeAnswer", e);
      return { text: null as string | null };
    }
  });

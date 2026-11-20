// Deterministic spoken/display wording for decisions (English and Hindi). No AI.
import type { Result, Status } from "./eligibility";
import type { UiLang } from "./interview";

export const STATUS_TEXT: Record<UiLang, Record<Status, string>> = {
  en: { likely_eligible: "Likely eligible", ineligible: "Not eligible", needs_verification: "Needs verification" },
  hi: { likely_eligible: "संभवतः पात्र", ineligible: "पात्र नहीं", needs_verification: "जाँच ज़रूरी" },
};

export function decisionSentence(r: Result, lang: UiLang): string {
  const d = r.decisive;
  const req = d ? d.requirement : "";
  const ans = d ? d.answer : "";
  if (lang === "hi") {
    if (r.status === "ineligible") return `${r.scheme.name}: पात्र नहीं। कारण — शर्त "${req}", आपका जवाब: ${ans}.${d?.note ? " " + d.note : ""}`;
    if (r.status === "likely_eligible") return `${r.scheme.name}: संभवतः पात्र। सभी ज़रूरी शर्तें पूरी हैं, जैसे "${req}" (${ans})। अंतिम फ़ैसला सरकारी कार्यालय करेगा।`;
    return `${r.scheme.name}: जाँच ज़रूरी। अभी तय नहीं — "${req}"${d?.note ? "। " + d.note : ""}`;
  }
  if (r.status === "ineligible") return `${r.scheme.name}: not eligible. Deciding rule — "${req}"; your answer: ${ans}.${d?.note ? " " + d.note : ""}`;
  if (r.status === "likely_eligible") return `${r.scheme.name}: likely eligible. All required conditions are met, for example "${req}" (${ans}). The office makes the final decision.`;
  return `${r.scheme.name}: needs verification. Not yet settled — "${req}"${ans && ans !== "Not answered" ? ` (your answer: ${ans})` : ""}.${d?.note ? " " + d.note : ""}`;
}

export function summarySpeech(results: Result[], lang: UiLang): string {
  const parts = results.map(r => decisionSentence(r, lang) + (r.nearMiss ? (lang === "hi" ? " 70 वर्ष के होने पर दोबारा जाँचें।" : " " + r.nearMiss) : ""));
  return parts.join(" ");
}

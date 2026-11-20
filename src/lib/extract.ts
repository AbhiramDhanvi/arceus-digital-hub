import type { Facts } from "./eligibility";
// Cheap deterministic parser used before any AI call.
export function extractFacts(text: string, expecting?: keyof Facts | null): Facts {
  const t = text.toLowerCase();
  const f: Facts = {};
  const yes = /\b(yes|yeah|haan|ha|ho|avunu|ji)\b/.test(t), no = /\b(no|nahi|nahin|nahi|kaadu|nako)\b/.test(t);
  const age = t.match(/(\d{1,3})\s*(years?|yrs?|saal|varsh)/) ?? (expecting === "age" ? t.match(/\b(\d{1,3})\b/) : null);
  if (age) f.age = Number(age[1]);
  const lakh = t.match(/(\d+(?:\.\d+)?)\s*lakh/);
  if (lakh) f.annualIncome = Math.round(Number(lakh[1]) * 100000);
  else if (expecting === "annualIncome") { const n = t.replace(/,/g, "").match(/\d{4,}/); if (n) f.annualIncome = Number(n[0]); }
  if (/farmer|kisan|farming|raitu|shetkari/.test(t)) f.occupation = "farmer";
  else if (/student|scholarship|college|study/.test(t)) f.occupation = "student";
  else if (/business|shop|loan|startup|vyapar/.test(t)) f.occupation = "business";
  else if (/salaried|job|employee|naukri/.test(t)) f.occupation = "salaried";
  else if (/unemployed|no job|berozgar/.test(t)) f.occupation = "unemployed";
  if (/\b(female|woman|girl|mahila|widow|mother)\b/.test(t)) f.gender = "female";
  else if (/\b(male|man|boy)\b/.test(t)) f.gender = "male";
  if (/\bsc\b/.test(t)) f.category = "sc"; else if (/\bst\b/.test(t)) f.category = "st";
  else if (/\bobc\b/.test(t)) f.category = "obc"; else if (/general/.test(t)) f.category = "general";
  if (/\bbpl\b|antyodaya/.test(t)) f.bpl = !no;
  if (/own (farm)?land|have land|my land/.test(t)) f.ownsFarmland = true;
  if (/(pay|paying) (income )?tax/.test(t)) f.incomeTaxPayer = !/(don'?t|not|never)/.test(t);
  if (expecting && ["ownsFarmland", "incomeTaxPayer", "bpl"].includes(expecting) && (yes || no) && f[expecting] === undefined)
    (f as Record<string, unknown>)[expecting] = yes && !no;
  return f;
}

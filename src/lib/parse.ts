// Deterministic Hindi/English parsing for interview answers. No AI.
const EN: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const HI: Record<string, number> = {
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chah: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20, pachees: 25, tees: 30, paintees: 35, chalis: 40, chaalis: 40, paintalis: 45, pachas: 50, pachaas: 50, pachpan: 55, saath: 60, painsath: 65, sattar: 70, pachattar: 75, assi: 80, nabbe: 90,
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "ग्यारह": 11, "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "सोलह": 16, "सत्रह": 17, "अठारह": 18, "उन्नीस": 19, "बीस": 20, "पच्चीस": 25, "तीस": 30, "पैंतीस": 35, "चालीस": 40, "उनतालीस": 39, "पैंतालीस": 45, "पचास": 50, "पचपन": 55, "साठ": 60, "पैंसठ": 65, "उनहत्तर": 69, "सत्तर": 70, "इकहत्तर": 71, "बहत्तर": 72, "पचहत्तर": 75, "अस्सी": 80, "नब्बे": 90,
};
const DEV_DIGITS = "०१२३४५६७८९";
export function normalize(text: string) {
  return text.toLowerCase().replace(/[०-९]/g, d => String(DEV_DIGITS.indexOf(d))).replace(/(\d),(?=\d)/g, "$1").replace(/(\d)\.(\d)/g, "$1\u0000$2").replace(/[.,!?।]/g, " ").replace(/\u0000/g, ".").replace(/\s+/g, " ").trim();
}
const words = (t: string) => t.split(" ");

/** Returns a plain number (digits or common number words), or null. */
export function parseNumber(text: string): number | null {
  const t = normalize(text);
  const d = t.match(/\d+(?:\.\d+)?/);
  let n: number | null = d ? Number(d[0]) : null;
  if (n === null) {
    let sum = 0, hit = false;
    for (const w of words(t)) { const v = EN[w] ?? HI[w]; if (v !== undefined) { sum += v; hit = true; } }
    if (hit) n = sum;
  }
  if (n === null) return null;
  if (/\b(lakh|lac)|लाख/.test(t)) n *= 100000;
  else if (/\bcrore|करोड़/.test(t)) n *= 10000000;
  else if (/\b(thousand|hazaar|hazar|k)\b|हज़ार|हजार/.test(t)) n *= 1000;
  return n;
}
export function isApprox(text: string) { return /\b(about|around|approx|approximately|nearly|almost|roughly|lagbhag|karib|kareeb)\b|लगभग|करीब|क़रीब|तकरीबन/.test(normalize(text)); }
export type Period = "month" | "year" | null;
export function parsePeriod(text: string): Period {
  const t = normalize(text);
  if (/month|monthly|per month|mahina|mahine|महीन|मासिक|माह/.test(t)) return "month";
  if (/year|annual|yearly|per annum|saal|saalana|साल|वार्षिक|सालाना/.test(t)) return "year";
  return null;
}
export const UNKNOWN_RE = /(don'?t know|do not know|not sure|no idea|pata nahi|pata nahin|maloom nahi|पता नहीं|मालूम नहीं|पता नही|नहीं पता|skip|छोड़ो|छोड़ें)/;
/** true / false / "unknown" / null when unclear. Unknown is checked first so "pata nahi" is not "no". */
export function parseYesNo(text: string): boolean | "unknown" | null {
  const t = normalize(text);
  if (UNKNOWN_RE.test(t)) return "unknown";
  if (/^(yes|yeah|yep|yup|haan|han|ha|haa|ji|ji haan|sure|correct|right|of course)\b|हाँ|हां|जी हाँ|जी हां|^जी\b|बिल्कुल|सही/.test(t)) return true;
  if (/^(no|nope|nah|nahi|nahin|na|not)\b|नहीं|नही|^ना\b|कोई नहीं/.test(t)) return false;
  return null;
}
/** Age with approximate flag. Ages above 120 are rejected. */
export function parseAge(text: string): { value: number; approx: boolean } | null {
  const n = parseNumber(text);
  if (n === null || n < 0 || n > 120) return null;
  return { value: Math.round(n), approx: isApprox(text) };
}
/** Money per month; a yearly figure is converted. `period` null means the answer did not say. */
export function parseMonthlyAmount(text: string, assume: "month" | "year" = "month"): { value: number; approx: boolean; period: Period } | null {
  const yn = parseYesNo(text);
  if (yn === false) return { value: 0, approx: false, period: null };
  const n = parseNumber(text);
  if (n === null) return null;
  const period = parsePeriod(text);
  const monthly = (period ?? assume) === "year" ? Math.round(n / 12) : n;
  return { value: monthly, approx: isApprox(text) || (period ?? assume) === "year", period };
}
/** Money per year; a monthly figure is multiplied by 12. A converted monthly figure is treated as approximate. */
export function parseAnnualAmount(text: string): { value: number; approx: boolean; period: Period } | null {
  const yn = parseYesNo(text);
  if (yn === false) return { value: 0, approx: false, period: null };
  const n = parseNumber(text);
  if (n === null) return null;
  const period = parsePeriod(text);
  return { value: period === "month" ? n * 12 : n, approx: isApprox(text) || period === "month", period };
}

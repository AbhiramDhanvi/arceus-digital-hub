// Needs-first, deterministic interview. Works with no AI at all.
import { SCHEMES, UNKNOWN, evaluateAll, findSchemeByName, neededFacts, schemesForGoal, type FactKey, type Facts, type FactValue, type Goal, type Result } from "./eligibility";
import { normalize, parseAge, parseMonthlyAmount, parseNumber, parseYesNo, isApprox } from "./parse";

export type UiLang = "en" | "hi";
export interface Choice { value: FactValue; en: string; hi: string }
export interface Question { key: FactKey | "goal"; kind: "goal" | "yesno" | "age" | "money" | "monthly" | "choice"; en: [string, string]; hi: [string, string]; options: Choice[] }

const YN: Choice[] = [{ value: true, en: "Yes", hi: "हाँ" }, { value: false, en: "No", hi: "नहीं" }, { value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }];
export const GOALS: { goal: Goal; en: string; hi: string; re: RegExp }[] = [
  { goal: "farming", en: "Farming & crops", hi: "खेती और फसल", re: /farm|kisan|crop|kheti|agri|खेती|किसान|फसल/ },
  { goal: "health", en: "Health cover", hi: "स्वास्थ्य बीमा / इलाज", re: /health|hospital|treatment|ilaj|इलाज|अस्पताल|स्वास्थ्य|ayushman|आयुष्मान/ },
  { goal: "insurance", en: "Life / accident insurance", hi: "जीवन / दुर्घटना बीमा", re: /insurance|bima|बीमा|accident|life cover/ },
  { goal: "pension", en: "Pension", hi: "पेंशन", re: /pension|पेंशन|retire|old age|budhap|बुढ़ाप/ },
  { goal: "business", en: "Business loan", hi: "व्यापार के लिए लोन", re: /business|loan|shop|dukan|vyapar|व्यापार|दुकान|लोन|कारोबार|ऋण/ },
  { goal: "lpg", en: "Cooking gas (LPG)", hi: "रसोई गैस (LPG)", re: /gas|lpg|cylinder|सिलेंडर|गैस|ujjwala|उज्ज्वला/ },
];

/** [self wording, other-person wording] per language. */
export const QUESTIONS: Record<FactKey, Question> = {
  subject: { key: "subject", kind: "choice", en: ["Who is this check for?", "Who is this check for?"], hi: ["यह जाँच किसके लिए है?", "यह जाँच किसके लिए है?"], options: [{ value: "self", en: "Me", hi: "मेरे लिए" }, { value: "other", en: "A family member", hi: "परिवार के सदस्य के लिए" }] },
  age: { key: "age", kind: "age", en: ["How old are you (as on Aadhaar)?", "How old are they (as on Aadhaar)?"], hi: ["आपकी उम्र कितनी है (आधार के अनुसार)?", "उनकी उम्र कितनी है (आधार के अनुसार)?"], options: [{ value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  age_approx: { key: "age_approx", kind: "yesno", en: ["", ""], hi: ["", ""], options: YN },
  gender: { key: "gender", kind: "choice", en: ["Is the applicant a woman or a man?", "Is the applicant a woman or a man?"], hi: ["आवेदक महिला हैं या पुरुष?", "आवेदक महिला हैं या पुरुष?"], options: [{ value: "female", en: "Woman", hi: "महिला" }, { value: "male", en: "Man", hi: "पुरुष" }, { value: "other", en: "Other", hi: "अन्य" }] },
  hasBankAccount: { key: "hasBankAccount", kind: "yesno", en: ["Do you have a savings account in a bank or post office?", "Do they have a savings account in a bank or post office?"], hi: ["क्या आपका बैंक या डाकघर में बचत खाता है?", "क्या उनका बैंक या डाकघर में बचत खाता है?"], options: YN },
  ownsCultivableLand: { key: "ownsCultivableLand", kind: "yesno", en: ["Does your family own cultivable land in its name?", "Does their family own cultivable land in its name?"], hi: ["क्या आपके परिवार के नाम पर खेती की ज़मीन है?", "क्या उनके परिवार के नाम पर खेती की ज़मीन है?"], options: YN },
  institutionalLand: { key: "institutionalLand", kind: "yesno", en: ["Is the land held by an institution (trust, company, society) rather than the family?", "Is the land held by an institution (trust, company, society) rather than the family?"], hi: ["क्या ज़मीन किसी संस्था (ट्रस्ट, कंपनी, सोसाइटी) के नाम है?", "क्या ज़मीन किसी संस्था (ट्रस्ट, कंपनी, सोसाइटी) के नाम है?"], options: YN },
  incomeTaxLastAY: { key: "incomeTaxLastAY", kind: "yesno", en: ["Did anyone in your family pay income tax in the last assessment year?", "Did anyone in their family pay income tax in the last assessment year?"], hi: ["क्या पिछले आकलन वर्ष में आपके परिवार में किसी ने इनकम टैक्स भरा?", "क्या पिछले आकलन वर्ष में उनके परिवार में किसी ने इनकम टैक्स भरा?"], options: YN },
  pensionMonthly: { key: "pensionMonthly", kind: "monthly", en: ["Does anyone in the family get a retirement pension? If yes, how much per month?", "Does anyone in their family get a retirement pension? If yes, how much per month?"], hi: ["क्या परिवार में किसी को रिटायरमेंट पेंशन मिलती है? अगर हाँ, तो हर महीने कितनी?", "क्या उनके परिवार में किसी को रिटायरमेंट पेंशन मिलती है? अगर हाँ, तो हर महीने कितनी?"], options: [{ value: 0, en: "No pension", hi: "कोई पेंशन नहीं" }, { value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  govtEmployee: { key: "govtEmployee", kind: "yesno", en: ["Is anyone in the family a serving or retired government officer or employee?", "Is anyone in their family a serving or retired government officer or employee?"], hi: ["क्या परिवार में कोई सरकारी अधिकारी/कर्मचारी है या रहा है?", "क्या उनके परिवार में कोई सरकारी अधिकारी/कर्मचारी है या रहा है?"], options: YN },
  registeredProfessional: { key: "registeredProfessional", kind: "yesno", en: ["Is anyone a practising doctor, engineer, lawyer, CA or architect registered with a professional body?", "Is anyone a practising doctor, engineer, lawyer, CA or architect registered with a professional body?"], hi: ["क्या कोई पंजीकृत डॉक्टर, इंजीनियर, वकील, CA या आर्किटेक्ट के रूप में काम करता है?", "क्या कोई पंजीकृत डॉक्टर, इंजीनियर, वकील, CA या आर्किटेक्ट के रूप में काम करता है?"], options: YN },
  incomeTaxPayer: { key: "incomeTaxPayer", kind: "yesno", en: ["Are you an income-tax payer now or in the past?", "Are they an income-tax payer now or in the past?"], hi: ["क्या आप अभी या पहले इनकम टैक्स भरते हैं/थे?", "क्या वे अभी या पहले इनकम टैक्स भरते हैं/थे?"], options: YN },
  householdHasLpg: { key: "householdHasLpg", kind: "yesno", en: ["Does your household already have an LPG connection?", "Does their household already have an LPG connection?"], hi: ["क्या आपके घर में पहले से LPG कनेक्शन है?", "क्या उनके घर में पहले से LPG कनेक्शन है?"], options: YN },
  poorHousehold: { key: "poorHousehold", kind: "yesno", en: ["Is your household poor enough to sign the Ujjwala deprivation declaration?", "Is their household poor enough to sign the Ujjwala deprivation declaration?"], hi: ["क्या आपका परिवार गरीब है और उज्ज्वला का 'वंचना घोषणा पत्र' भर सकता है?", "क्या उनका परिवार गरीब है और उज्ज्वला का 'वंचना घोषणा पत्र' भर सकता है?"], options: YN },
  nonFarmEnterprise: { key: "nonFarmEnterprise", kind: "yesno", en: ["Is the loan for a small non-farm business or a farm-allied activity like dairy, poultry or beekeeping?", "Is the loan for a small non-farm business or a farm-allied activity like dairy, poultry or beekeeping?"], hi: ["क्या लोन छोटे गैर-कृषि व्यापार या डेयरी, मुर्गी पालन, मधुमक्खी पालन जैसे काम के लिए है?", "क्या लोन छोटे गैर-कृषि व्यापार या डेयरी, मुर्गी पालन, मधुमक्खी पालन जैसे काम के लिए है?"], options: YN },
  loanAmount: { key: "loanAmount", kind: "money", en: ["Roughly how much loan do you need?", "Roughly how much loan do they need?"], hi: ["लगभग कितना लोन चाहिए?", "उन्हें लगभग कितना लोन चाहिए?"], options: [{ value: 50000, en: "Up to ₹50,000", hi: "₹50,000 तक" }, { value: 500000, en: "Up to ₹5 lakh", hi: "₹5 लाख तक" }, { value: 1000000, en: "Up to ₹10 lakh", hi: "₹10 लाख तक" }, { value: 2000000, en: "₹10–20 lakh", hi: "₹10–20 लाख" }] },
  priorTarunRepaid: { key: "priorTarunRepaid", kind: "yesno", en: ["Have you already taken and fully repaid a Mudra 'Tarun' loan?", "Have they already taken and fully repaid a Mudra 'Tarun' loan?"], hi: ["क्या आपने पहले मुद्रा 'तरुण' लोन लेकर पूरा चुका दिया है?", "क्या उन्होंने पहले मुद्रा 'तरुण' लोन लेकर पूरा चुका दिया है?"], options: YN },
  pmjayListed: { key: "pmjayListed", kind: "yesno", en: ["Have you checked beneficiary.nha.gov.in and found your family listed for Ayushman?", "Have you checked beneficiary.nha.gov.in and found their family listed for Ayushman?"], hi: ["क्या आपने beneficiary.nha.gov.in पर देखा है कि आपका परिवार आयुष्मान सूची में है?", "क्या आपने beneficiary.nha.gov.in पर देखा है कि उनका परिवार आयुष्मान सूची में है?"], options: [{ value: true, en: "Yes, listed", hi: "हाँ, नाम है" }, { value: false, en: "Checked, not listed", hi: "देखा, नाम नहीं है" }, { value: UNKNOWN, en: "Haven't checked", hi: "अभी नहीं देखा" }] },
  cultivatesCrops: { key: "cultivatesCrops", kind: "yesno", en: ["Do you grow crops — as owner, tenant or sharecropper?", "Do they grow crops — as owner, tenant or sharecropper?"], hi: ["क्या आप खेती करते हैं — मालिक, किरायेदार या बटाईदार के रूप में?", "क्या वे खेती करते हैं — मालिक, किरायेदार या बटाईदार के रूप में?"], options: YN },
  pensionMonthly_approx: { key: "pensionMonthly_approx", kind: "yesno", en: ["", ""], hi: ["", ""], options: YN },
};
export const GOAL_QUESTION: Question = { key: "goal", kind: "goal", en: ["What do you need help with? You can also name a scheme.", ""], hi: ["आपको किस चीज़ में मदद चाहिए? आप किसी योजना का नाम भी बोल सकते हैं।", ""], options: GOALS.map(g => ({ value: g.goal, en: g.en, hi: g.hi })) };

export function questionText(q: Question, lang: UiLang, subject: FactValue | undefined) { return q[lang][subject === "other" ? 1 : 0] || q[lang][0]; }

export interface Interview { goal: Goal | null; schemeIds: string[]; facts: Facts; conflicts: FactKey[]; fromAI: Partial<Record<FactKey, true>> }
export const newInterview = (): Interview => ({ goal: null, schemeIds: [], facts: {}, conflicts: [], fromAI: {} });

/** Facts used for the verdict: conflicted facts are removed until confirmed. */
export function effectiveFacts(iv: Interview): Facts {
  const f = { ...iv.facts };
  for (const k of iv.conflicts) delete f[k];
  return f;
}

/** Pick schemes from a goal choice or a free-text need / scheme name. */
export function chooseNeed(iv: Interview, text: string, goal?: Goal): Interview | null {
  const named = goal ? null : findSchemeByName(text);
  if (named) return { ...iv, goal: named.goals[0] ?? null, schemeIds: [named.id] };
  const g = goal ?? GOALS.find(x => x.re.test(normalize(text)))?.goal;
  if (!g) return null;
  return { ...iv, goal: g, schemeIds: schemesForGoal(g).map(s => s.id) };
}

export function nextQuestion(iv: Interview): Question | null {
  if (!iv.schemeIds.length) return GOAL_QUESTION;
  if (iv.facts.subject === undefined) return QUESTIONS.subject;
  if (iv.conflicts.length) return QUESTIONS[iv.conflicts[0]!];
  const f = effectiveFacts(iv);
  for (const id of iv.schemeIds) {
    const s = SCHEMES.find(x => x.id === id)!;
    const k = neededFacts(s, f)[0];
    if (k) return QUESTIONS[k];
  }
  return null;
}

export function results(iv: Interview): Result[] { return evaluateAll(effectiveFacts(iv), iv.schemeIds); }

export type Parsed = { ok: true; facts: Facts } | { ok: false };
/** Deterministic parse of an answer to `q`. */
export function parseAnswer(q: Question, text: string, lang: UiLang): Parsed {
  if (q.key === "goal") return { ok: false };
  const t = normalize(text);
  const opt = q.options.find(o => t === normalize(o.en) || t === normalize(o.hi));
  if (opt) return { ok: true, facts: { [q.key]: opt.value } as Facts };
  switch (q.kind) {
    case "yesno": { const v = parseYesNo(text); return v === null ? { ok: false } : { ok: true, facts: { [q.key]: v === "unknown" ? UNKNOWN : v } as Facts }; }
    case "age": {
      if (parseYesNo(text) === "unknown") return { ok: true, facts: { age: UNKNOWN } };
      const a = parseAge(text); return a ? { ok: true, facts: { age: a.value, ...(a.approx ? { age_approx: true } : {}) } } : { ok: false };
    }
    case "money": { const n = parseNumber(text); return n === null ? { ok: false } : { ok: true, facts: { [q.key]: n } as Facts }; }
    case "monthly": {
      if (parseYesNo(text) === "unknown") return { ok: true, facts: { [q.key]: UNKNOWN } as Facts };
      const m = parseMonthlyAmount(text); return m ? { ok: true, facts: { pensionMonthly: m.value, ...(m.approx ? { pensionMonthly_approx: true } : {}) } } : { ok: false };
    }
    case "choice": {
      if (q.key === "gender") { if (/female|woman|mahila|महिला|औरत|स्त्री/.test(t)) return { ok: true, facts: { gender: "female" } }; if (/\bmale\b|\bman\b|purush|पुरुष|आदमी/.test(t)) return { ok: true, facts: { gender: "male" } }; }
      if (q.key === "subject") { if (/\b(me|myself|self|mere|main)\b|मेरे|मैं|ख़ुद|खुद/.test(t)) return { ok: true, facts: { subject: "self" } }; if (/family|mother|father|wife|husband|son|daughter|maa|papa|परिवार|माँ|पिता|पत्नी|पति|बेटा|बेटी/.test(t)) return { ok: true, facts: { subject: "other" } }; }
      return { ok: false };
    }
  }
  void lang; return { ok: false };
}

/** Free-text age statement on any question ("I am 38"), used for contradiction checks. */
export function statedAge(text: string): { value: number; approx: boolean } | null {
  const t = normalize(text);
  const m = t.match(/(?:i am|i'm|age is|age|umar|umra|उम्र|आयु)\D{0,12}(\d{1,3})|(\d{1,3})\s*(?:years|yrs|saal|साल|वर्ष)/);
  const v = m ? Number(m[1] ?? m[2]) : NaN;
  return Number.isFinite(v) && v > 0 && v < 121 ? { value: v, approx: isApprox(text) } : null;
}

/** Apply facts. Explicit edits overwrite; implicit restatements that differ create a conflict. */
export function applyFacts(iv: Interview, found: Facts, opts: { explicit?: boolean; fromAI?: boolean } = {}): Interview {
  const facts: Facts = { ...iv.facts };
  let conflicts = iv.conflicts.filter(k => !(k in found));
  const fromAI = { ...iv.fromAI };
  for (const [k, v] of Object.entries(found) as [FactKey, FactValue][]) {
    const prev = iv.facts[k];
    if (!opts.explicit && prev !== undefined && prev !== UNKNOWN && v !== UNKNOWN && prev !== v && !iv.conflicts.includes(k) && !k.endsWith("_approx")) {
      conflicts = [...conflicts, k]; // keep old value but drop from verdict until confirmed
      continue;
    }
    facts[k] = v;
    if (k === "age" && !("age_approx" in found)) delete facts.age_approx;
    if (k === "pensionMonthly" && !("pensionMonthly_approx" in found)) delete facts.pensionMonthly_approx;
    if (opts.fromAI) fromAI[k] = true; else delete fromAI[k];
  }
  return { ...iv, facts, conflicts, fromAI };
}
export function skip(iv: Interview, key: FactKey): Interview { return applyFacts(iv, { [key]: UNKNOWN } as Facts, { explicit: true }); }

// Deterministic eligibility engine. AI never decides eligibility, criteria, sources or dates.
// Every criterion carries the official wording, source URL, citation and the date it was checked.

export const UNKNOWN = "unknown" as const; // explicit "don't know" or skipped
export type FactKey =
  | "subject" | "age" | "age_approx" | "gender" | "hasBankAccount"
  | "ownsCultivableLand" | "institutionalLand" | "incomeTaxLastAY" | "pensionMonthly" | "pensionMonthly_approx"
  | "govtEmployee" | "registeredProfessional" | "incomeTaxPayer"
  | "householdHasLpg" | "poorHousehold" | "nonFarmEnterprise" | "loanAmount" | "priorTarunRepaid"
  | "pmjayListed" | "cultivatesCrops";
export type FactValue = boolean | number | string;
export type Facts = Partial<Record<FactKey, FactValue>>;
/** Legacy alias kept for saved households. */
export type LegacyFacts = Record<string, FactValue>;

export type Outcome = "pass" | "fail" | "unknown";
export type Status = "likely_eligible" | "ineligible" | "needs_verification";
export interface Source { url: string; citation: string; checked: string | null }
export interface CriterionResult { id: string; requirement: string; excerpt: string; answer: string; outcome: Outcome; note?: string | undefined; source: Source }
interface Criterion {
  id: string; facts: FactKey[]; requirement: string; excerpt: string; source: Source;
  check: (f: Facts) => { outcome: Outcome; answer: string; note?: string };
}
type Rule = Criterion | { id: string; requirement: string; anyOf: Criterion[] };

export interface Scheme {
  id: string; name: string; ministry: string; benefit: string; link: string;
  goals: Goal[]; aliases: string[]; documents: string[]; steps: string[];
  /** true when every rule below was read from an official primary source on `checked`. */
  verified: boolean;
  rules: Rule[];
  /** A route-dependent step outside the citizen's facts (e.g. lender approval) that always needs verification. */
  alwaysVerify?: { requirement: string; excerpt: string; source: Source };
  nearMiss?: (f: Facts) => string | null;
}
export type Goal = "farming" | "health" | "insurance" | "pension" | "business" | "lpg";

const CHECKED = "2026-11-20";
const known = (v: FactValue | undefined) => v !== undefined && v !== UNKNOWN;
const yesNo = (v: FactValue | undefined) => (v === true ? "Yes" : v === false ? "No" : v === UNKNOWN ? "Don't know" : "Not answered");
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function boolRule(id: string, key: FactKey, want: boolean, requirement: string, excerpt: string, source: Source, failNote?: string): Criterion {
  return { id, facts: [key], requirement, excerpt, source, check: f => {
    const v = f[key];
    if (!known(v)) return { outcome: "unknown", answer: yesNo(v) };
    return v === want ? { outcome: "pass", answer: yesNo(v) } : { outcome: "fail", answer: yesNo(v), ...(failNote ? { note: failNote } : {}) };
  } };
}

/** Age within [min, maxExclusive). Approximate ages within 2 years of a boundary stay unknown. */
function ageRule(id: string, min: number, maxExclusive: number, requirement: string, excerpt: string, source: Source): Criterion {
  return { id, facts: ["age"], requirement, excerpt, source, check: f => {
    const a = f.age;
    if (typeof a !== "number") return { outcome: "unknown", answer: a === UNKNOWN ? "Don't know" : "Not answered" };
    const approx = f.age_approx === true;
    const answer = `${approx ? "about " : ""}${a} years`;
    if (approx && (Math.abs(a - min) <= 2 || Math.abs(a - maxExclusive) <= 2))
      return { outcome: "unknown", answer, note: "Your approximate age is close to the limit — check the date of birth on Aadhaar." };
    return a >= min && a < maxExclusive ? { outcome: "pass", answer } : { outcome: "fail", answer };
  } };
}

// ---- Official sources (fetched and read on CHECKED unless `checked` is null) ----
const S = {
  pmsby: { url: "https://financialservices.gov.in/pmsby", citation: "DFS, PMSBY FAQ — 'Who will be eligible to subscribe?'", checked: CHECKED },
  pmjjby: { url: "https://www.financialservices.gov.in/pmjjby", citation: "DFS, PMJJBY FAQ — 'Who will be eligible to subscribe?' and termination clause", checked: CHECKED },
  apy: { url: "https://financialservices.gov.in/atal-pension-yojana", citation: "DFS, APY eligibility and FAQ 'If I have completed 40 years, can I join?'", checked: CHECKED },
  apyAcct: { url: "https://financialservices.gov.in/atal-pension-yojana", citation: "DFS, APY FAQ 'Can I open APY Account without savings bank account?'", checked: CHECKED },
  apyTax: { url: "https://financialservices.gov.in/atal-pension-yojana", citation: "DFS APY page (checked) does not state the income-tax exclusion for new accounts — confirm with your bank", checked: null },
  pmuy: { url: "https://pmuy.gov.in/Ujjwala2.html", citation: "PMUY, 'Eligibility criteria to avail connection under PMUY' items 1–3", checked: CHECKED },
  mudra: { url: "https://www.financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy", citation: "DFS, PMMY 'Features' — Purposes and Categories", checked: CHECKED },
  pmkisan: { url: "https://pmkisan.gov.in/", citation: "PM-KISAN portal — scheme description and 'Scheme Exclusion' list", checked: CHECKED },
  pmjay70: { url: "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2053883&lang=2&reg=3", citation: "PIB (MoHFW), 11 Sep 2024 — Cabinet approval for senior citizens aged 70+", checked: CHECKED },
  pmjayList: { url: "https://beneficiary.nha.gov.in/", citation: "NHA beneficiary lookup — family entitlement is decided by the official database", checked: CHECKED },
  pmfby: { url: "https://pmfby.gov.in/", citation: "PMFBY Revamped Operational Guidelines (Aug 2020) — could not be retrieved by ARCEUS on this date", checked: null },
} satisfies Record<string, Source>;

export const SCHEMES: Scheme[] = [
  {
    id: "pm-kisan", name: "PM-KISAN", ministry: "Ministry of Agriculture & Farmers Welfare", benefit: "₹6,000 a year in three equal instalments",
    link: "https://pmkisan.gov.in/", goals: ["farming"], aliases: ["pm kisan", "pm-kisan", "kisan samman", "किसान सम्मान", "पीएम किसान"],
    documents: ["Aadhaar", "Land records in the family's name", "Bank account linked to Aadhaar"],
    steps: ["Open pmkisan.gov.in → New Farmer Registration", "Enter land details; the state verifies land records", "Complete e-KYC"],
    verified: true,
    rules: [
      boolRule("land", "ownsCultivableLand", true, "Land-holding farmer family", "income support … to all land holding farmer families", S.pmkisan),
      boolRule("inst", "institutionalLand", false, "Not an institutional land holder", "Exclusion 1. All Institutional Land holders.", S.pmkisan),
      boolRule("tax", "incomeTaxLastAY", false, "No one paid income tax in the last assessment year", "Exclusion: All Persons who paid Income Tax in last assessment year", S.pmkisan),
      { id: "pension", facts: ["pensionMonthly"], requirement: "No retired pensioner with ₹10,000 or more monthly pension", excerpt: "All superannuated/retired pensioners whose monthly pension is Rs.10,000/-or more", source: S.pmkisan, check: f => {
        const p = f.pensionMonthly;
        if (typeof p !== "number") return { outcome: "unknown", answer: p === UNKNOWN ? "Don't know" : "Not answered" };
        const approx = f.pensionMonthly_approx === true;
        const answer = p === 0 ? "No pension" : `${approx ? "about " : ""}${rupees(p)} per month`;
        if (approx && Math.abs(p - 10000) <= 1500) return { outcome: "unknown", answer, note: "Close to the ₹10,000 limit — check the pension slip." };
        return p >= 10000 ? { outcome: "fail", answer, note: "Multi Tasking Staff / Class IV / Group D pensioners are not excluded — confirm the category." } : { outcome: "pass", answer };
      } },
      { id: "officials", facts: ["govtEmployee", "registeredProfessional"], requirement: "Not a serving/retired government officer or practising registered professional", excerpt: "Exclusion list: serving or retired officers and employees … (Excluding Multi Tasking Staff/Class IV/Group D); Professionals like Doctors, Engineers, Lawyers, Chartered Accountants, and Architects … carrying out profession", source: S.pmkisan, check: f => {
        const g = f.govtEmployee, r = f.registeredProfessional;
        if (g === true) return { outcome: "unknown", answer: "Government employee/officer: Yes", note: "Class IV / Group D staff are not excluded — the officer category decides." };
        if (r === true) return { outcome: "fail", answer: "Practising registered professional: Yes" };
        if (g === false && r === false) return { outcome: "pass", answer: "Neither" };
        return { outcome: "unknown", answer: `Govt employee: ${yesNo(g)}; professional: ${yesNo(r)}` };
      } },
    ],
  },
  {
    id: "pmfby", name: "PM Fasal Bima Yojana", ministry: "Ministry of Agriculture & Farmers Welfare", benefit: "Crop insurance for notified crops at a fixed farmer premium",
    link: "https://pmfby.gov.in/", goals: ["farming", "insurance"], aliases: ["fasal bima", "pmfby", "crop insurance", "फसल बीमा"],
    documents: ["Aadhaar", "Land record or tenancy/sharecropping agreement accepted by the state", "Sowing declaration", "Bank account"],
    steps: ["Check on pmfby.gov.in whether your crop is notified for your area and season", "Apply through your bank, CSC or pmfby.gov.in before the cut-off date", "Pay the farmer share of premium"],
    verified: false,
    rules: [
      boolRule("grow", "cultivatesCrops", true, "Grows crops (owner, tenant or sharecropper)", "Coverage is for farmers growing notified crops in notified areas; tenants and sharecroppers may join with accepted proof", S.pmfby),
    ],
    alwaysVerify: { requirement: "Crop, area and season must be notified by the state; cultivation proof must be accepted", excerpt: "Notified crop / notified area / season cut-off", source: S.pmfby },
  },
  {
    id: "pmjay", name: "Ayushman Bharat PM-JAY", ministry: "National Health Authority", benefit: "Cashless hospital cover up to ₹5 lakh a year",
    link: "https://beneficiary.nha.gov.in/", goals: ["health"], aliases: ["ayushman", "pmjay", "pm-jay", "vay vandana", "आयुष्मान"],
    documents: ["Aadhaar (age is taken from Aadhaar for the 70+ card)", "Ration card or family ID if asked"],
    steps: ["Open beneficiary.nha.gov.in or the Ayushman app", "Search your name / enrol with Aadhaar e-KYC", "Download the Ayushman (or Vay Vandana) card"],
    verified: true,
    rules: [{ id: "path", requirement: "Aged 70 or older, OR family is listed in the PM-JAY database", anyOf: [
      ageRule("age70", 70, 200, "Senior citizen aged 70 or older (any income)", "all senior citizens of the age 70 years and above irrespective of their socio-economic status would be eligible", S.pmjay70),
      boolRule("listed", "pmjayListed", true, "Family found in the official PM-JAY beneficiary list", "Entitlement is checked on the official beneficiary portal; a BPL card alone does not decide it", S.pmjayList),
    ] }],
    nearMiss: f => typeof f.age === "number" && f.age >= 65 && f.age < 70 && f.pmjayListed !== true ? `Check again after turning 70 — the 70+ route does not depend on income.` : null,
  },
  {
    id: "pmsby", name: "PM Suraksha Bima Yojana", ministry: "Department of Financial Services", benefit: "Accident insurance of ₹2 lakh for a small yearly premium",
    link: "https://financialservices.gov.in/pmsby", goals: ["insurance"], aliases: ["suraksha bima", "pmsby", "सुरक्षा बीमा"],
    documents: ["Savings bank / post office account", "Aadhaar for KYC", "Enrolment and auto-debit consent form"],
    steps: ["Visit your bank / post office or net banking", "Fill the PMSBY form and give auto-debit consent", "Premium is deducted once a year"],
    verified: true,
    rules: [
      ageRule("age", 18, 71, "Age 18 to 70", "account holders … in the age group of 18 to 70 years are entitled to join", S.pmsby),
      boolRule("acct", "hasBankAccount", true, "Has a savings account at a participating bank or post office", "All individual (single or joint) account holders of participating banks / Post office", S.pmsby, "Open a savings account first — then you can join."),
    ],
  },
  {
    id: "pmjjby", name: "PM Jeevan Jyoti Bima Yojana", ministry: "Department of Financial Services", benefit: "Life cover of ₹2 lakh for a small yearly premium",
    link: "https://www.financialservices.gov.in/pmjjby", goals: ["insurance"], aliases: ["jeevan jyoti", "pmjjby", "जीवन ज्योति"],
    documents: ["Savings bank / post office account", "Aadhaar for KYC", "Enrolment and auto-debit consent form"],
    steps: ["Visit your bank / post office or net banking", "Fill the PMJJBY form and give auto-debit consent", "Premium is deducted once a year"],
    verified: true,
    rules: [
      ageRule("age", 18, 51, "Age 18 to 50 to join", "in the age group of 18 to 50 years are entitled to join … entry, however, will not be possible beyond the age of 50 years", S.pmjjby),
      boolRule("acct", "hasBankAccount", true, "Has a savings account at a participating bank or post office", "All individual (single or joint) account holders of participating banks / Post office", S.pmjjby, "Open a savings account first — then you can join."),
    ],
  },
  {
    id: "apy", name: "Atal Pension Yojana", ministry: "Department of Financial Services / PFRDA", benefit: "Guaranteed pension of ₹1,000–5,000 a month from age 60",
    link: "https://financialservices.gov.in/atal-pension-yojana", goals: ["pension"], aliases: ["atal pension", "apy", "अटल पेंशन"],
    documents: ["Savings bank / post office account", "Aadhaar", "Mobile number"],
    steps: ["Visit the bank / post office where you have a savings account", "Fill the APY form and choose a pension amount", "Set up auto-debit of the monthly contribution"],
    verified: true,
    rules: [
      ageRule("age", 18, 40, "Age 18 to 39 (not yet 40)", "a person who is in age group of 18 years to 39 years 364 days can join Atal Pension Yojana", S.apy),
      boolRule("acct", "hasBankAccount", true, "Has a savings bank / post office savings account", "the savings bank account/ post office savings bank account is mandatory for joining APY", S.apyAcct, "Open a savings account first — then you can join."),
      { id: "tax", facts: ["incomeTaxPayer"], requirement: "Income-tax status (new accounts)", excerpt: "Not stated on the DFS page checked", source: S.apyTax, check: f => {
        const v = f.incomeTaxPayer;
        if (v === false) return { outcome: "pass", answer: "No" };
        return { outcome: "unknown", answer: yesNo(v), ...(v === true ? { note: "Income-tax payers may not be allowed to open new APY accounts — confirm with your bank." } : {}) };
      } },
    ],
  },
  {
    id: "pmuy", name: "PM Ujjwala Yojana", ministry: "Ministry of Petroleum & Natural Gas", benefit: "Deposit-free LPG connection",
    link: "https://pmuy.gov.in/Ujjwala2.html", goals: ["lpg"], aliases: ["ujjwala", "pmuy", "lpg", "gas connection", "उज्ज्वला", "गैस"],
    documents: ["KYC form", "Aadhaar of the applicant", "Ration card / state document of family composition", "Bank account details", "Deprivation declaration"],
    steps: ["Apply at pmuy.gov.in or any LPG distributor", "Submit KYC and the deprivation declaration", "Distributor verifies and releases the connection"],
    verified: true,
    rules: [
      { id: "woman", facts: ["gender"], requirement: "Applicant is a woman", excerpt: "The applicant must be a woman who has attained 18 years of age.", source: S.pmuy, check: f => {
        const g = f.gender;
        if (!known(g)) return { outcome: "unknown", answer: yesNo(g) };
        return g === "female" ? { outcome: "pass", answer: "Woman" } : { outcome: "fail", answer: g === "male" ? "Man" : "Other", note: "An adult woman of the household can apply instead." };
      } },
      ageRule("age", 18, 200, "Age 18 or older", "The applicant must be a woman who has attained 18 years of age.", S.pmuy),
      boolRule("nolpg", "householdHasLpg", false, "No LPG connection already in the household", "There should be no other LPG connection from any Oil Marketing Company (OMC) within the same household.", S.pmuy),
      boolRule("poor", "poorHousehold", true, "Poor household (can sign the deprivation declaration)", "The adult woman must belong to a poor household based on submission of a deprivation declaration", S.pmuy),
    ],
  },
  {
    id: "mudra", name: "PM Mudra Yojana", ministry: "Department of Financial Services", benefit: "Collateral-free loans for micro enterprises",
    link: "https://www.financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy", goals: ["business"], aliases: ["mudra", "pmmy", "मुद्रा"],
    documents: ["Aadhaar and PAN", "Business plan / quotation", "Bank statements", "Proof of business address"],
    steps: ["Prepare a simple business plan", "Apply at a bank, NBFC or MFI, or on jansamarth.in", "The lender assesses and approves the loan"],
    verified: true,
    rules: [
      boolRule("purpose", "nonFarmEnterprise", true, "Micro enterprise in a non-farm or farm-allied activity", "Purposes: Non-agricultural, including activities allied to agriculture such as poultry, dairy, beekeeping etc.", S.mudra),
      { id: "amount", facts: ["loanAmount", "priorTarunRepaid"], requirement: "Loan up to ₹10 lakh, or up to ₹20 lakh (Tarun Plus) after repaying a Tarun loan", excerpt: "Shishu – upto Rs.50,000; Kishore – upto Rs.5 lakh; Tarun – upto Rs.10 lakh; Tarun Plus – upto Rs.20 lakh (for those … who have availed and successfully repaid previous loans under the ‘Tarun’ Category)", source: S.mudra, check: f => {
        const a = f.loanAmount;
        if (typeof a !== "number") return { outcome: "unknown", answer: a === UNKNOWN ? "Don't know" : "Not answered" };
        const cat = a <= 50000 ? "Shishu" : a <= 500000 ? "Kishore" : a <= 1000000 ? "Tarun" : a <= 2000000 ? "Tarun Plus" : "Above ₹20 lakh";
        const answer = `${rupees(a)} (${cat})`;
        if (a > 2000000) return { outcome: "fail", answer };
        if (a > 1000000) {
          const p = f.priorTarunRepaid;
          if (p === true) return { outcome: "pass", answer: `${answer}; earlier Tarun loan repaid` };
          if (p === false) return { outcome: "fail", answer: `${answer}; no repaid Tarun loan`, note: "Up to ₹10 lakh (Tarun) is open without this condition." };
          return { outcome: "unknown", answer };
        }
        return { outcome: "pass", answer };
      } },
    ],
    alwaysVerify: { requirement: "Loan sanction depends on the lender's appraisal", excerpt: "Member Lending Institutions … Collateral not required.", source: S.mudra },
  },
];

/** Listed for discovery only — not checked by ARCEUS rules; open the official page. */
export const DISCOVERY = [
  { name: "NSAP Old Age / Widow / Disability Pension", link: "https://nsap.nic.in/", goal: "pension" as Goal },
  { name: "Kisan Credit Card", link: "https://www.myscheme.gov.in/schemes/kcc", goal: "farming" as Goal },
  { name: "National Scholarship Portal schemes", link: "https://scholarships.gov.in/", goal: null },
];

export interface Result { scheme: Scheme; status: Status; criteria: CriterionResult[]; decisive: CriterionResult | null; nearMiss: string | null }

function runCriterion(c: Criterion, f: Facts): CriterionResult {
  const r = c.check(f);
  return { id: c.id, requirement: c.requirement, excerpt: c.excerpt, answer: r.answer, outcome: r.outcome, note: r.note, source: c.source };
}

export function evaluate(scheme: Scheme, f: Facts): Result {
  const criteria: CriterionResult[] = [];
  const top: Outcome[] = [];
  for (const rule of scheme.rules) {
    if ("anyOf" in rule) {
      const parts = rule.anyOf.map(c => runCriterion(c, f));
      criteria.push(...parts);
      // An alternative rule fails only when every path fails.
      top.push(parts.some(p => p.outcome === "pass") ? "pass" : parts.every(p => p.outcome === "fail") ? "fail" : "unknown");
    } else {
      const r = runCriterion(rule, f); criteria.push(r); top.push(r.outcome);
    }
  }
  if (scheme.alwaysVerify) criteria.push({ id: "route", requirement: scheme.alwaysVerify.requirement, excerpt: scheme.alwaysVerify.excerpt, answer: "Decided by the office / lender", outcome: "unknown", source: scheme.alwaysVerify.source });
  const failed = top.includes("fail");
  const status: Status = failed ? "ineligible" : top.every(o => o === "pass") && !scheme.alwaysVerify && scheme.verified ? "likely_eligible" : "needs_verification";
  let decisive: CriterionResult | null = null;
  if (failed) {
    scheme.rules.forEach((rule, i) => {
      if (decisive || top[i] !== "fail") return;
      const ids = "anyOf" in rule ? rule.anyOf.map(c => c.id) : [rule.id];
      decisive = criteria.find(c => ids.includes(c.id) && c.outcome === "fail") ?? null;
    });
  } else if (status === "likely_eligible") decisive = criteria.find(c => c.outcome === "pass") ?? null;
  else decisive = criteria.find(c => c.outcome === "unknown") ?? null;
  return { scheme, status, criteria, decisive, nearMiss: scheme.nearMiss?.(f) ?? null };
}

const ORDER: Record<Status, number> = { likely_eligible: 0, needs_verification: 1, ineligible: 2 };
export function evaluateAll(f: Facts, ids?: string[]): Result[] {
  const list = ids ? SCHEMES.filter(s => ids.includes(s.id)) : SCHEMES;
  return list.map(s => evaluate(s, f)).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}

/** Facts still needed (never asked) to settle a scheme; empty once decided. */
export function neededFacts(scheme: Scheme, f: Facts): FactKey[] {
  const r = evaluate(scheme, f);
  if (r.status === "ineligible") return [];
  const out: FactKey[] = [];
  const need = (c: Criterion) => { for (const k of c.facts) if (f[k] === undefined && !out.includes(k)) { out.push(k); break; } };
  for (const rule of scheme.rules) {
    if ("anyOf" in rule) {
      const parts = rule.anyOf.map(c => ({ c, o: runCriterion(c, f).outcome }));
      if (parts.some(p => p.o === "pass")) continue;
      for (const p of parts) if (p.o === "unknown") need(p.c);
    } else if (runCriterion(rule, f).outcome === "unknown") need(rule);
  }
  // Ask the follow-up about a repaid Tarun loan only when the amount needs it.
  return out.filter(k => k !== "priorTarunRepaid" || (typeof f.loanAmount === "number" && f.loanAmount > 1000000));
}

export function schemesForGoal(g: Goal) { return SCHEMES.filter(s => s.goals.includes(g)); }
export function findSchemeByName(text: string): Scheme | null {
  const t = text.toLowerCase();
  return SCHEMES.find(s => s.aliases.some(a => t.includes(a))) ?? null;
}
export const VERIFIED_COUNT = SCHEMES.filter(s => s.verified).length;

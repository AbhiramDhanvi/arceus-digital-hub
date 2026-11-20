// Deterministic eligibility engine. AI never decides eligibility.
export type Occupation = "farmer" | "student" | "business" | "salaried" | "unemployed" | "other";
export interface Facts {
  age?: number;
  occupation?: Occupation;
  annualIncome?: number; // household, INR
  ownsFarmland?: boolean;
  incomeTaxPayer?: boolean;
  gender?: "female" | "male" | "other";
  category?: "sc" | "st" | "obc" | "general";
  bpl?: boolean;
}
export type Status = "likely_eligible" | "ineligible" | "needs_verification";
type Check = { fact: keyof Facts; test: (f: Facts) => boolean; reason: string };

export interface Scheme {
  id: string;
  name: string;
  benefit: string;
  link: string;
  documents: string[];
  steps: string[];
  tags: string[];
  rules: Check[];
}

export const SCHEMES: Scheme[] = [
  {
    id: "pm-kisan", name: "PM-KISAN", benefit: "₹6,000 a year in three instalments",
    link: "https://pmkisan.gov.in/", documents: ["Aadhaar", "Land records", "Bank account"],
    steps: ["Open pmkisan.gov.in", "Choose New Farmer Registration", "Complete e-KYC"], tags: ["farmer"],
    rules: [
      { fact: "ownsFarmland", test: f => f.ownsFarmland === true, reason: "Family must own cultivable land" },
      { fact: "incomeTaxPayer", test: f => f.incomeTaxPayer === false, reason: "Income tax payers are excluded" },
    ],
  },
  {
    id: "ayushman-bharat", name: "Ayushman Bharat PM-JAY", benefit: "Health cover up to ₹5 lakh per family per year",
    link: "https://beneficiary.nha.gov.in/", documents: ["Aadhaar", "Ration card"],
    steps: ["Check your name on beneficiary.nha.gov.in", "Visit an empanelled hospital or CSC", "Get your Ayushman card"], tags: ["health", "parent"],
    rules: [
      { fact: "age", test: f => (f.age ?? 0) >= 70 || f.bpl === true, reason: "Low-income (BPL/SECC) family or a senior aged 70+" },
    ],
  },
  {
    id: "pmmy-mudra", name: "PM Mudra Yojana", benefit: "Business loans up to ₹20 lakh without collateral",
    link: "https://www.mudra.org.in/", documents: ["Aadhaar", "PAN", "Business plan", "Bank statements"],
    steps: ["Prepare a business plan", "Apply at a bank or on jansamarth.in", "Submit KYC documents"], tags: ["business", "loan"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "business", reason: "For non-farm small businesses" },
      { fact: "age", test: f => (f.age ?? 0) >= 18, reason: "Applicant must be at least 18" },
    ],
  },
  {
    id: "nsp-post-matric", name: "Post-Matric Scholarship (NSP)", benefit: "Tuition fees and a maintenance allowance",
    link: "https://scholarships.gov.in/", documents: ["Aadhaar", "Income certificate", "Caste certificate", "Marksheets"],
    steps: ["Register on scholarships.gov.in", "Fill in the application", "Get it verified by your institute"], tags: ["student", "scholarship"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "student", reason: "Must be a student after Class 10" },
      { fact: "category", test: f => f.category === "sc" || f.category === "st" || f.category === "obc", reason: "For SC, ST or OBC students" },
      { fact: "annualIncome", test: f => (f.annualIncome ?? Infinity) <= 250000, reason: "Family income up to ₹2.5 lakh" },
    ],
  },
  {
    id: "atal-pension", name: "Atal Pension Yojana", benefit: "Guaranteed pension of ₹1,000–5,000 a month after 60",
    link: "https://www.npscra.nsdl.co.in/scheme-details.php", documents: ["Aadhaar", "Savings bank account"],
    steps: ["Visit your bank", "Fill in the APY form", "Set up auto-debit"], tags: ["pension"],
    rules: [
      { fact: "age", test: f => (f.age ?? 0) >= 18 && (f.age ?? 0) <= 40, reason: "Age 18 to 40" },
      { fact: "incomeTaxPayer", test: f => f.incomeTaxPayer === false, reason: "Income tax payers are excluded" },
    ],
  },
  {
    id: "pm-ujjwala", name: "PM Ujjwala Yojana", benefit: "Free LPG connection",
    link: "https://www.pmuy.gov.in/", documents: ["Aadhaar", "Ration card", "Bank account"],
    steps: ["Visit an LPG distributor", "Submit the KYC form", "Get your connection"], tags: ["women"],
    rules: [
      { fact: "gender", test: f => f.gender === "female", reason: "Applicant must be a woman" },
      { fact: "age", test: f => (f.age ?? 0) >= 18, reason: "Age 18 or older" },
      { fact: "bpl", test: f => f.bpl === true, reason: "From a poor household" },
    ],
  },
];

export interface Result { scheme: Scheme; status: Status; met: string[]; failed: string[]; missing: (keyof Facts)[] }

export function evaluate(scheme: Scheme, facts: Facts): Result {
  const met: string[] = [], failed: string[] = [], missing: (keyof Facts)[] = [];
  for (const r of scheme.rules) {
    // Ayushman rule accepts either age or bpl
    const known = scheme.id === "ayushman-bharat" ? facts.age !== undefined || facts.bpl !== undefined : facts[r.fact] !== undefined;
    if (!known) { missing.push(r.fact); continue; }
    (r.test(facts) ? met : failed).push(r.reason);
  }
  const status: Status = failed.length ? "ineligible" : missing.length ? "needs_verification" : "likely_eligible";
  return { scheme, status, met, failed, missing };
}

export function evaluateAll(facts: Facts, tag?: string): Result[] {
  const list = tag ? SCHEMES.filter(s => s.tags.includes(tag)) : SCHEMES;
  return list.map(s => evaluate(s, facts));
}

/** Merge new facts; report contradictions instead of silently overwriting. */
export function mergeFacts(prev: Facts, next: Facts): { facts: Facts; conflicts: (keyof Facts)[] } {
  const conflicts: (keyof Facts)[] = [];
  const out: Facts = { ...prev };
  for (const k of Object.keys(next) as (keyof Facts)[]) {
    const v = next[k];
    if (v === undefined) continue;
    if (prev[k] !== undefined && prev[k] !== v) conflicts.push(k);
    (out as Record<string, unknown>)[k] = v;
  }
  return { facts: out, conflicts };
}

export const QUESTIONS: Record<keyof Facts, string> = {
  age: "How old are you?",
  occupation: "What is your main work — farmer, student, business, salaried or unemployed?",
  annualIncome: "What is your family's yearly income in rupees?",
  ownsFarmland: "Does your family own farmland? (yes/no)",
  incomeTaxPayer: "Does anyone in your family pay income tax? (yes/no)",
  gender: "Are you female or male?",
  category: "What is your category — SC, ST, OBC or General?",
  bpl: "Does your family have a BPL or Antyodaya ration card? (yes/no)",
};

/** Next single most useful question, or null. */
export function nextQuestion(results: Result[]): keyof Facts | null {
  for (const r of results) if (r.status === "needs_verification" && r.missing[0]) return r.missing[0];
  return null;
}

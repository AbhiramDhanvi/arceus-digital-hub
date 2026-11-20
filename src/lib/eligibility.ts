// Deterministic eligibility engine. AI never decides eligibility.
export type Occupation = "farmer" | "student" | "business" | "salaried" | "unemployed" | "homemaker" | "other";
export interface Facts {
  occupation?: Occupation;
  age?: number;
  gender?: "female" | "male" | "other";
  category?: "sc" | "st" | "obc" | "ews" | "general";
  annualIncome?: number; // household, INR
  state?: string;
  area?: "rural" | "urban";
  disability?: boolean;
  bpl?: boolean;
  incomeTaxPayer?: boolean;
  ownsFarmland?: boolean;
  landAcres?: number;
  educationLevel?: "school" | "12th" | "diploma" | "ug" | "pg";
  businessStage?: "idea" | "startup" | "existing";
}
export type Status = "likely_eligible" | "ineligible" | "needs_verification";
type Check = { fact: keyof Facts; test: (f: Facts) => boolean; reason: string };

export interface Scheme {
  id: string; name: string; ministry: string; benefit: string; link: string;
  documents: string[]; steps: string[]; tags: string[]; rules: Check[];
}

const age = (f: Facts) => f.age ?? -1;
const inc = (f: Facts) => f.annualIncome ?? Infinity;

export const SCHEMES: Scheme[] = [
  { id: "pm-kisan", name: "PM-KISAN", ministry: "Ministry of Agriculture & Farmers Welfare", benefit: "₹6,000 a year in three instalments",
    link: "https://pmkisan.gov.in/", documents: ["Aadhaar", "Land records", "Bank account"],
    steps: ["Open pmkisan.gov.in", "Choose New Farmer Registration", "Complete e-KYC"], tags: ["farmer"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "farmer", reason: "Farmer" },
      { fact: "ownsFarmland", test: f => f.ownsFarmland === true, reason: "Family owns cultivable land" },
      { fact: "incomeTaxPayer", test: f => f.incomeTaxPayer === false, reason: "Not an income tax payer" },
    ] },
  { id: "kcc", name: "Kisan Credit Card", ministry: "Ministry of Agriculture & Farmers Welfare", benefit: "Crop loans up to ₹3 lakh at 4% effective interest",
    link: "https://www.myscheme.gov.in/schemes/kcc", documents: ["Aadhaar", "Land records", "Passport photo"],
    steps: ["Visit any bank branch", "Fill in the KCC form", "Submit land documents"], tags: ["farmer", "loan"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "farmer", reason: "Farmer, tenant or sharecropper" },
      { fact: "age", test: f => age(f) >= 18 && age(f) <= 75, reason: "Age 18 to 75" },
    ] },
  { id: "pmfby", name: "PM Fasal Bima Yojana", ministry: "Ministry of Agriculture & Farmers Welfare", benefit: "Crop insurance at 1.5–5% premium",
    link: "https://pmfby.gov.in/", documents: ["Aadhaar", "Land records / tenancy proof", "Sowing certificate", "Bank account"],
    steps: ["Open pmfby.gov.in or visit a bank/CSC", "Choose your crop and season", "Pay the farmer premium"], tags: ["farmer"],
    rules: [{ fact: "occupation", test: f => f.occupation === "farmer", reason: "Farmer growing notified crops" }] },
  { id: "ayushman-bharat", name: "Ayushman Bharat PM-JAY", ministry: "National Health Authority", benefit: "Health cover up to ₹5 lakh per family per year",
    link: "https://beneficiary.nha.gov.in/", documents: ["Aadhaar", "Ration card"],
    steps: ["Check your name on beneficiary.nha.gov.in", "Visit an empanelled hospital or CSC", "Get your Ayushman card"], tags: ["health"],
    rules: [{ fact: "bpl", test: f => f.bpl === true || age(f) >= 70, reason: "Low-income (BPL/SECC) family or a senior aged 70+" }] },
  { id: "pmmy-mudra", name: "PM Mudra Yojana", ministry: "Ministry of Finance", benefit: "Business loans up to ₹20 lakh without collateral",
    link: "https://www.mudra.org.in/", documents: ["Aadhaar", "PAN", "Business plan", "Bank statements"],
    steps: ["Prepare a business plan", "Apply at a bank or on jansamarth.in", "Submit KYC documents"], tags: ["business", "loan"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "business", reason: "Non-farm small business" },
      { fact: "age", test: f => age(f) >= 18, reason: "Age 18 or older" },
    ] },
  { id: "standup-india", name: "Stand-Up India", ministry: "Department of Financial Services", benefit: "Loans of ₹10 lakh – ₹1 crore for a new enterprise",
    link: "https://www.standupmitra.in/", documents: ["Aadhaar", "PAN", "Caste certificate (if SC/ST)", "Project report"],
    steps: ["Register on standupmitra.in", "Pick a lending bank", "Submit the project report"], tags: ["business", "women", "loan"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "business", reason: "Setting up a business" },
      { fact: "gender", test: f => f.gender === "female" || f.category === "sc" || f.category === "st", reason: "Woman or SC/ST entrepreneur" },
      { fact: "businessStage", test: f => f.businessStage !== "existing", reason: "Greenfield (new) enterprise" },
      { fact: "age", test: f => age(f) >= 18, reason: "Age 18 or older" },
    ] },
  { id: "startup-seed", name: "Startup India Seed Fund", ministry: "DPIIT", benefit: "Up to ₹50 lakh seed funding via incubators",
    link: "https://seedfund.startupindia.gov.in/", documents: ["DPIIT recognition", "Company registration", "Pitch deck"],
    steps: ["Get DPIIT recognition", "Apply on seedfund.startupindia.gov.in", "Pitch to an incubator"], tags: ["business"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "business", reason: "Entrepreneur" },
      { fact: "businessStage", test: f => f.businessStage === "startup", reason: "Registered startup (under 2 years)" },
    ] },
  { id: "nsp-post-matric", name: "Post-Matric Scholarship (NSP)", ministry: "Ministry of Social Justice", benefit: "Tuition fees and a maintenance allowance",
    link: "https://scholarships.gov.in/", documents: ["Aadhaar", "Income certificate", "Caste certificate", "Marksheets"],
    steps: ["Register on scholarships.gov.in", "Fill in the application", "Get it verified by your institute"], tags: ["student"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "student", reason: "Student" },
      { fact: "educationLevel", test: f => f.educationLevel !== "school", reason: "Studying after Class 10" },
      { fact: "category", test: f => f.category === "sc" || f.category === "st" || f.category === "obc", reason: "SC, ST or OBC" },
      { fact: "annualIncome", test: f => inc(f) <= 250000, reason: "Family income up to ₹2.5 lakh" },
    ] },
  { id: "central-sector-scholarship", name: "Central Sector Scholarship", ministry: "Ministry of Education", benefit: "₹12,000–20,000 a year for college",
    link: "https://scholarships.gov.in/", documents: ["Aadhaar", "Class 12 marksheet", "Income certificate"],
    steps: ["Register on scholarships.gov.in", "Apply for the Central Sector Scheme", "Institute verification"], tags: ["student"],
    rules: [
      { fact: "occupation", test: f => f.occupation === "student", reason: "Student" },
      { fact: "educationLevel", test: f => f.educationLevel === "ug" || f.educationLevel === "pg", reason: "In college (UG/PG)" },
      { fact: "annualIncome", test: f => inc(f) <= 450000, reason: "Family income up to ₹4.5 lakh" },
    ] },
  { id: "pmkvy", name: "PM Kaushal Vikas Yojana", ministry: "Ministry of Skill Development", benefit: "Free skill training with certification",
    link: "https://www.skillindiadigital.gov.in/", documents: ["Aadhaar", "Bank account"],
    steps: ["Register on Skill India Digital", "Pick a course and centre", "Complete training and assessment"], tags: ["skill"],
    rules: [
      { fact: "age", test: f => age(f) >= 15 && age(f) <= 45, reason: "Age 15 to 45" },
      { fact: "occupation", test: f => f.occupation !== "salaried", reason: "Unemployed, student or school drop-out" },
    ] },
  { id: "atal-pension", name: "Atal Pension Yojana", ministry: "PFRDA", benefit: "Guaranteed pension of ₹1,000–5,000 a month after 60",
    link: "https://www.npscra.nsdl.co.in/scheme-details.php", documents: ["Aadhaar", "Savings bank account"],
    steps: ["Visit your bank", "Fill in the APY form", "Set up auto-debit"], tags: ["pension"],
    rules: [
      { fact: "age", test: f => age(f) >= 18 && age(f) <= 40, reason: "Age 18 to 40" },
      { fact: "incomeTaxPayer", test: f => f.incomeTaxPayer === false, reason: "Not an income tax payer" },
    ] },
  { id: "ignoaps", name: "Old Age Pension (IGNOAPS)", ministry: "Ministry of Rural Development", benefit: "Monthly pension from ₹200–500 plus state top-up",
    link: "https://nsap.nic.in/", documents: ["Aadhaar", "Age proof", "BPL card", "Bank account"],
    steps: ["Apply at the gram panchayat / municipal office", "Submit age and BPL proof", "Verification and sanction"], tags: ["pension"],
    rules: [
      { fact: "age", test: f => age(f) >= 60, reason: "Age 60 or older" },
      { fact: "bpl", test: f => f.bpl === true, reason: "Below poverty line household" },
    ] },
  { id: "igndps", name: "Disability Pension (IGNDPS)", ministry: "Ministry of Rural Development", benefit: "Monthly pension for persons with severe disability",
    link: "https://nsap.nic.in/", documents: ["Aadhaar", "Disability certificate (80%+)", "BPL card", "Bank account"],
    steps: ["Get a UDID disability certificate", "Apply at the panchayat / municipal office", "Verification and sanction"], tags: ["pension", "disability"],
    rules: [
      { fact: "disability", test: f => f.disability === true, reason: "Person with disability" },
      { fact: "age", test: f => age(f) >= 18, reason: "Age 18 or older" },
      { fact: "bpl", test: f => f.bpl === true, reason: "Below poverty line household" },
    ] },
  { id: "pm-ujjwala", name: "PM Ujjwala Yojana", ministry: "Ministry of Petroleum & Natural Gas", benefit: "Free LPG connection",
    link: "https://www.pmuy.gov.in/", documents: ["Aadhaar", "Ration card", "Bank account"],
    steps: ["Visit an LPG distributor", "Submit the KYC form", "Get your connection"], tags: ["women"],
    rules: [
      { fact: "gender", test: f => f.gender === "female", reason: "Woman applicant" },
      { fact: "age", test: f => age(f) >= 18, reason: "Age 18 or older" },
      { fact: "bpl", test: f => f.bpl === true, reason: "Poor household" },
    ] },
  { id: "pmay-g", name: "PM Awas Yojana – Gramin", ministry: "Ministry of Rural Development", benefit: "₹1.2–1.3 lakh to build a pucca house",
    link: "https://pmayg.nic.in/", documents: ["Aadhaar", "Job card", "Bank account"],
    steps: ["Check the gram panchayat beneficiary list", "Apply through the panchayat", "Geo-tagged verification"], tags: ["housing"],
    rules: [
      { fact: "area", test: f => f.area === "rural", reason: "Lives in a rural area" },
      { fact: "bpl", test: f => f.bpl === true, reason: "Poor / houseless household" },
    ] },
  { id: "pmay-u", name: "PM Awas Yojana – Urban 2.0", ministry: "Ministry of Housing & Urban Affairs", benefit: "Up to ₹2.5 lakh help to build or buy a home",
    link: "https://pmay-urban.gov.in/", documents: ["Aadhaar", "Income proof", "Bank account"],
    steps: ["Apply on pmay-urban.gov.in", "Upload income proof", "Urban local body verification"], tags: ["housing"],
    rules: [
      { fact: "area", test: f => f.area === "urban", reason: "Lives in an urban area" },
      { fact: "annualIncome", test: f => inc(f) <= 900000, reason: "Family income up to ₹9 lakh" },
    ] },
];

export interface Result { scheme: Scheme; status: Status; score: number; met: string[]; failed: string[]; missing: (keyof Facts)[] }

export function evaluate(scheme: Scheme, facts: Facts): Result {
  const met: string[] = [], failed: string[] = [], missing: (keyof Facts)[] = [];
  for (const r of scheme.rules) {
    const known = scheme.id === "ayushman-bharat" ? facts.age !== undefined || facts.bpl !== undefined
      : scheme.id === "standup-india" && r.fact === "gender" ? facts.gender !== undefined || facts.category !== undefined
      : facts[r.fact] !== undefined;
    if (!known) { missing.push(r.fact); continue; }
    (r.test(facts) ? met : failed).push(r.reason);
  }
  const status: Status = failed.length ? "ineligible" : missing.length ? "needs_verification" : "likely_eligible";
  const score = Math.round((met.length / scheme.rules.length) * 100);
  return { scheme, status, score, met, failed, missing };
}

const ORDER: Record<Status, number> = { likely_eligible: 0, needs_verification: 1, ineligible: 2 };
export function evaluateAll(facts: Facts, tag?: string): Result[] {
  const list = tag ? SCHEMES.filter(s => s.tags.includes(tag)) : SCHEMES;
  return list.map(s => evaluate(s, facts)).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.score - a.score);
}

/** Merge new facts; report contradictions instead of silently overwriting. */
export function mergeFacts(prev: Facts, next: Facts): { facts: Facts; conflicts: (keyof Facts)[] } {
  const conflicts: (keyof Facts)[] = [];
  const out: Facts = { ...prev };
  for (const k of Object.keys(next) as (keyof Facts)[]) {
    const v = next[k];
    if (v === undefined || v === null) continue;
    if (prev[k] !== undefined && prev[k] !== v) conflicts.push(k);
    (out as Record<string, unknown>)[k] = v;
  }
  return { facts: out, conflicts };
}

export type Option = { label: string; value: string | number | boolean };
export interface Question { key: keyof Facts; text: string; options: Option[]; when?: (f: Facts) => boolean }
const yn: Option[] = [{ label: "Yes", value: true }, { label: "No", value: false }];

/** Guided questionnaire, asked in this order; conditional questions follow the profile. */
export const QUESTIONNAIRE: Question[] = [
  { key: "occupation", text: "Which best describes you?", options: [
    { label: "Farmer", value: "farmer" }, { label: "Student", value: "student" }, { label: "Business owner", value: "business" },
    { label: "Employee", value: "salaried" }, { label: "Job seeker", value: "unemployed" }, { label: "Homemaker", value: "homemaker" }, { label: "Other", value: "other" }] },
  { key: "age", text: "How old are you?", options: [
    { label: "Below 18", value: 16 }, { label: "18–25", value: 22 }, { label: "26–40", value: 33 }, { label: "41–59", value: 50 }, { label: "60–69", value: 65 }, { label: "70+", value: 72 }] },
  { key: "gender", text: "What is your gender?", options: [{ label: "Female", value: "female" }, { label: "Male", value: "male" }, { label: "Other", value: "other" }] },
  { key: "category", text: "What is your social category?", options: [
    { label: "General", value: "general" }, { label: "OBC", value: "obc" }, { label: "SC", value: "sc" }, { label: "ST", value: "st" }, { label: "EWS", value: "ews" }] },
  { key: "annualIncome", text: "What is your family's yearly income?", options: [
    { label: "Below ₹1.5 lakh", value: 120000 }, { label: "₹1.5–2.5 lakh", value: 200000 }, { label: "₹2.5–4.5 lakh", value: 350000 },
    { label: "₹4.5–9 lakh", value: 650000 }, { label: "Above ₹9 lakh", value: 1200000 }] },
  { key: "state", text: "Which state do you live in?", options: [
    "Andhra Pradesh", "Bihar", "Gujarat", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal", "Other"].map(s => ({ label: s, value: s })) },
  { key: "area", text: "Do you live in a village or a town/city?", options: [{ label: "Village (rural)", value: "rural" }, { label: "Town / city (urban)", value: "urban" }] },
  { key: "bpl", text: "Does your family have a BPL or Antyodaya ration card?", options: yn },
  { key: "disability", text: "Do you have a disability?", options: yn },
  { key: "incomeTaxPayer", text: "Does anyone in your family pay income tax?", options: yn },
  { key: "ownsFarmland", text: "Does your family own farmland?", options: yn, when: f => f.occupation === "farmer" },
  { key: "landAcres", text: "How much land do you hold?", options: [{ label: "Below 1 acre", value: 0.5 }, { label: "1–5 acres", value: 3 }, { label: "Above 5 acres", value: 8 }], when: f => f.ownsFarmland === true },
  { key: "educationLevel", text: "What are you studying now?", options: [
    { label: "School (till 10th)", value: "school" }, { label: "11th–12th", value: "12th" }, { label: "Diploma", value: "diploma" }, { label: "Undergraduate", value: "ug" }, { label: "Postgraduate", value: "pg" }], when: f => f.occupation === "student" },
  { key: "businessStage", text: "What stage is your business in?", options: [
    { label: "Just an idea", value: "idea" }, { label: "Startup (under 2 years)", value: "startup" }, { label: "Existing business", value: "existing" }], when: f => f.occupation === "business" },
];

export const QUESTIONS = Object.fromEntries(QUESTIONNAIRE.map(q => [q.key, q.text])) as Record<keyof Facts, string>;

/** Next unanswered questionnaire item, or null when the profile is complete. */
export function nextQuestionnaireItem(f: Facts): Question | null {
  return QUESTIONNAIRE.find(q => f[q.key] === undefined && (!q.when || q.when(f))) ?? null;
}
export function questionProgress(f: Facts): { done: number; total: number } {
  const applicable = QUESTIONNAIRE.filter(q => !q.when || q.when(f));
  return { done: applicable.filter(q => f[q.key] !== undefined).length, total: applicable.length };
}

/** Kept for compatibility: next missing fact among results. */
export function nextQuestion(results: Result[]): keyof Facts | null {
  for (const r of results) if (r.status === "needs_verification" && r.missing[0]) return r.missing[0];
  return null;
}

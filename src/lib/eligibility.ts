// Deterministic eligibility engine. AI never decides eligibility, criteria, sources or dates.
// Every criterion carries the official wording, source URL, citation and the date it was checked.

export const UNKNOWN = "unknown" as const; // explicit "don't know" or skipped
export type FactKey =
  | "subject" | "age" | "age_approx" | "ageOnAadhaar" | "ageOnAadhaar_approx" | "gender" | "hasBankAccount" | "indianCitizen"
  | "ownsCultivableLand" | "institutionalLand" | "incomeTaxLastAY" | "pensionMonthly" | "pensionMonthly_approx"
  | "govtEmployee" | "govtStaffGroupD" | "constitutionalPost" | "registeredProfessional" | "incomeTaxPayer"
  | "householdHasLpg" | "poorHousehold" | "nonFarmEnterprise" | "loanAmount" | "priorTarunRepaid"
  | "pmjayListed" | "cultivatesCrops" | "cropNotified" | "cultivationProof"
  | "familyIncomeAnnual" | "familyIncomeAnnual_approx" | "socialCategory"
  | "class12Top20" | "regularDegree" | "otherScholarship"
  | "inClass8" | "class7Marks" | "schoolType"
  | "livesUrban" | "ownsPuccaHouse" | "govtHouse20y"
  | "unorganisedWorker" | "monthlyIncome" | "monthlyIncome_approx" | "coveredNpsEsicEpfo"
  | "traditionalTrade" | "govtLoan5y" | "familyInPmv" | "govtServiceFamily"
  | "girlAge" | "girlHasSsy" | "familySsyGirls"
  | "streetVendor" | "vendingCertificate" | "greenfield";
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
export type Goal = "farming" | "health" | "insurance" | "pension" | "business" | "lpg" | "education" | "housing" | "savings";

const CHECKED = "2026-11-20";
const known = (v: FactValue | undefined) => v !== undefined && v !== UNKNOWN;
const yesNo = (v: FactValue | undefined) => (v === true ? "Yes" : v === false ? "No" : v === UNKNOWN ? "Don't know" : "Not answered");
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const notNum = (v: FactValue | undefined) => ({ outcome: "unknown" as const, answer: v === UNKNOWN ? "Don't know" : "Not answered" });

function boolRule(id: string, key: FactKey, want: boolean, requirement: string, excerpt: string, source: Source, failNote?: string): Criterion {
  return { id, facts: [key], requirement, excerpt, source, check: f => {
    const v = f[key];
    if (!known(v)) return { outcome: "unknown", answer: yesNo(v) };
    return v === want ? { outcome: "pass", answer: yesNo(v) } : { outcome: "fail", answer: yesNo(v), ...(failNote ? { note: failNote } : {}) };
  } };
}

/** Age within [min, maxExclusive). Approximate ages within 2 years of a boundary stay unknown. */
function ageRule(id: string, min: number, maxExclusive: number, requirement: string, excerpt: string, source: Source, key: "age" | "ageOnAadhaar" | "girlAge" = "age"): Criterion {
  return { id, facts: [key], requirement, excerpt, source, check: f => {
    const a = f[key];
    if (typeof a !== "number") return notNum(a);
    const approx = key !== "girlAge" && f[`${key}_approx` as FactKey] === true;
    const answer = `${approx ? "about " : ""}${a} years${key === "ageOnAadhaar" ? " (as on Aadhaar)" : ""}`;
    if (approx && (Math.abs(a - min) <= 2 || Math.abs(a - maxExclusive) <= 2))
      return { outcome: "unknown", answer, note: "Your approximate age is close to the limit — check the date of birth on Aadhaar." };
    return a >= min && a < maxExclusive ? { outcome: "pass", answer } : { outcome: "fail", answer };
  } };
}

/** Money at most `max`. Approximate answers within 10% of the limit stay unknown. */
function maxMoneyRule(id: string, key: "familyIncomeAnnual" | "monthlyIncome", max: number, per: string, requirement: string, excerpt: string, source: Source): Criterion {
  return { id, facts: [key], requirement, excerpt, source, check: f => {
    const v = f[key];
    if (typeof v !== "number") return notNum(v);
    const approx = f[`${key}_approx` as FactKey] === true;
    const answer = `${approx ? "about " : ""}${rupees(v)} ${per}`;
    if (approx && Math.abs(v - max) <= max * 0.1) return { outcome: "unknown", answer, note: `Close to the ${rupees(max)} limit — the income certificate decides.` };
    return v <= max ? { outcome: "pass", answer } : { outcome: "fail", answer };
  } };
}

// ---- Official sources (fetched and read on CHECKED unless `checked` is null) ----
const S = {
  pmsby: { url: "https://financialservices.gov.in/pmsby", citation: "DFS, PMSBY FAQ — 'Who will be eligible to subscribe?'", checked: CHECKED },
  pmjjby: { url: "https://www.financialservices.gov.in/pmjjby", citation: "DFS, PMJJBY FAQ — 'Who will be eligible to subscribe?' and termination clause", checked: CHECKED },
  apy: { url: "https://pfrda.org.in/web/pfrda/w/faqs/atal-pension-yojana", citation: "PFRDA APY FAQ — 'Who can subscribe to APY?' (i)–(iii)", checked: CHECKED },
  apyTax: { url: "https://pfrda.org.in/web/pfrda/w/faqs/atal-pension-yojana", citation: "PFRDA APY FAQ — 'Who can subscribe?' (iii) and 'Any effect on existing APY subscribers…?'", checked: CHECKED },
  pmuy: { url: "https://pmuy.gov.in/Ujjwala2.html", citation: "PMUY, 'Eligibility criteria to avail connection under PMUY' items 1–3", checked: CHECKED },
  mudra: { url: "https://www.financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy", citation: "DFS, PMMY 'Features' — Purposes and Categories", checked: CHECKED },
  pmkisan: { url: "https://pmkisan.gov.in/", citation: "PM-KISAN portal — 'Scheme Exclusion' table (page last updated 20/06/2025)", checked: CHECKED },
  pmjay70: { url: "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2053883&lang=2&reg=3", citation: "PIB (MoHFW), 11 Sep 2024 — senior citizens aged 70+. Age is taken from Aadhaar (NHA senior-citizen FAQ, nha.gov.in — not retrievable by ARCEUS: HTTP 403)", checked: CHECKED },
  pmjayList: { url: "https://beneficiary.nha.gov.in/", citation: "NHA beneficiary lookup — family entitlement is decided by the official database", checked: CHECKED },
  pmfby: { url: "https://pmfby.gov.in/pdf/Revamped%20Operational%20Guidelines_17th%20August%202020.pdf", citation: "PMFBY Revamped Operational Guidelines (17 Aug 2020), para 3.1 'Coverage of Farmers'", checked: CHECKED },
  pmusp: { url: "https://scholarships.gov.in/public/schemeGuidelines/CSSS_GUIDLINES_07022024_updated.pdf", citation: "PM-USP CSSS Guidelines (AY 2022-23 onwards, NSP copy 07-02-2024), para 4 (i)–(v). The education.gov.in link returned 'Page Not Found'", checked: CHECKED },
  nmmss: { url: "https://www.dsel-education.gov.in/static/uploads/2026/05/ba0c7a437a67ff22496301b55ca46da5.pdf", citation: "DoSEL document (uploaded 2026-05), 'National Means-cum-Merit Scholarship Scheme' — (i) Eligibility criteria, (ii) Selection", checked: CHECKED },
  pmay: { url: "https://pmay-urban.gov.in/uploads/guidelines/Operational-Guidelines-of-PMAY-U-2.pdf", citation: "PMAY-U 2.0 Scheme Guidelines, paras 1.3, 3.1–3.3 and vertical tables", checked: CHECKED },
  pmsym: { url: "https://www.labour.gov.in/offerings/schemes-and-services/details/pm-sym-QTOzATMtQWa", citation: "Ministry of Labour & Employment, PM-SYM — eligibility paragraph", checked: CHECKED },
  pmv: { url: "https://www.dcmsme.gov.in/PMV-Ebook/PMV.pdf", citation: "PM Vishwakarma Guidelines (MoMSME e-book), Chapter 4 'Eligibility' (i)–(v)", checked: CHECKED },
  ssy: { url: "https://www.nsiindia.gov.in/writereaddata/SchemeRules/SukanyaSamriddhiAccountSchemeRule.pdf", citation: "Sukanya Samriddhi Account Scheme, 2019 (G.S.R. 914(E)), para 3(1), 3(2), 3(4) and provisos", checked: CHECKED },
  svan: { url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2267102&lang=1&reg=3", citation: "PIB Backgrounder FAQ, 30 May 2026 — Q4, Q5, Q6, Q9", checked: CHECKED },
  standup: { url: "https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2334979&lang=1&reg=1", citation: "PIB, 11 Nov 2026 — Cabinet approves continuation of Stand-Up India up to 31.03.2031", checked: CHECKED },
} satisfies Record<string, Source>;

const cat = (f: Facts) => f.socialCategory;
const isScSt = (f: Facts) => cat(f) === "sc" || cat(f) === "st";

export const SCHEMES: Scheme[] = [
  {
    id: "pm-kisan", name: "PM-KISAN", ministry: "Ministry of Agriculture & Farmers Welfare", benefit: "₹6,000 a year in three equal instalments",
    link: "https://pmkisan.gov.in/", goals: ["farming"], aliases: ["pm kisan", "pm-kisan", "kisan samman", "किसान सम्मान", "पीएम किसान"],
    documents: ["Aadhaar", "Land records in the family's name", "Bank account linked to Aadhaar"],
    steps: ["Open pmkisan.gov.in → New Farmer Registration", "Enter land details; the state verifies land records", "Complete e-KYC"],
    verified: true,
    rules: [
      boolRule("land", "ownsCultivableLand", true, "Land-holding farmer family", "income support … to all land holding farmer families", S.pmkisan),
      boolRule("inst", "institutionalLand", false, "Not an institutional land holder", "All Institutional Land holders.", S.pmkisan),
      boolRule("const", "constitutionalPost", false, "No one holds or held a constitutional post, minister, MP/MLA/MLC, mayor or district panchayat chairperson post", "Former and present holders of constitutional posts; Former and present Ministers/ State Ministers and former/present Members of LokSabha/ RajyaSabha/ State Legislative Assemblies/ State Legislative Councils, former and present Mayors of Municipal Corporations, former and present Chairpersons of District Panchayats.", S.pmkisan),
      boolRule("tax", "incomeTaxLastAY", false, "No one paid income tax in the last assessment year", "All Persons who paid Income Tax in last assessment year", S.pmkisan),
      { id: "officials", facts: ["govtEmployee", "govtStaffGroupD"], requirement: "Not a serving/retired government, PSE or local-body regular employee — Multi Tasking Staff / Class IV / Group D are not excluded", excerpt: "All serving or retired officers and employees of Central/ State Government … Central or State PSEs … Autonomous Institutions … as well as regular employees of the Local Bodies (Excluding Multi Tasking Staff /Class IV/Group D employees)", source: S.pmkisan, check: f => {
        const g = f.govtEmployee, d = f.govtStaffGroupD;
        if (g === false) return { outcome: "pass", answer: "No government/PSE/local-body employee" };
        if (g === true && d === true) return { outcome: "pass", answer: "Government employee: Multi Tasking Staff / Class IV / Group D" };
        if (g === true && d === false) return { outcome: "fail", answer: "Government employee above Group D" };
        return { outcome: "unknown", answer: g === true ? "Government employee; staff group not confirmed" : yesNo(g), ...(g === true ? { note: "Multi Tasking Staff / Class IV / Group D are not excluded — confirm the group." } : {}) };
      } },
      { id: "pension", facts: ["pensionMonthly", "govtStaffGroupD"], requirement: "No retired pensioner with ₹10,000 or more monthly pension (Multi Tasking Staff / Class IV / Group D excepted)", excerpt: "All superannuated/retired pensioners whose monthly pension is Rs.10,000/-or more (Excluding Multi Tasking Staff / Class IV/Group D employees) of above category", source: S.pmkisan, check: f => {
        const p = f.pensionMonthly;
        if (typeof p !== "number") return notNum(p);
        const approx = f.pensionMonthly_approx === true;
        const answer = p === 0 ? "No pension" : `${approx ? "about " : ""}${rupees(p)} per month`;
        if (approx && Math.abs(p - 10000) <= 1500) return { outcome: "unknown", answer, note: "Close to the ₹10,000 limit — check the pension slip." };
        if (p < 10000) return { outcome: "pass", answer };
        if (f.govtStaffGroupD === true) return { outcome: "pass", answer: `${answer}; retired as MTS / Class IV / Group D` };
        if (f.govtStaffGroupD === false) return { outcome: "fail", answer: `${answer}; not MTS / Class IV / Group D` };
        return { outcome: "unknown", answer, note: "Pensioners who retired as Multi Tasking Staff / Class IV / Group D are not excluded — confirm the group." };
      } },
      boolRule("prof", "registeredProfessional", false, "No practising registered doctor, engineer, lawyer, CA or architect", "Professionals like Doctors, Engineers, Lawyers, Chartered Accountants, and Architects registered with Professional bodies and carrying out profession by undertaking practices.", S.pmkisan),
    ],
    alwaysVerify: { requirement: "The state verifies land records (cases such as land acquired after 01-02-2019 or more than one family member receiving are held for physical verification)", excerpt: "The Department has identified certain suspected cases… (i) Farmers who acquired land ownership after 01-02-2019, (ii) Cases where more than one family member is receiving benefits… withheld till physical verification", source: S.pmkisan },
  },
  {
    id: "pmfby", name: "PM Fasal Bima Yojana", ministry: "Ministry of Agriculture & Farmers Welfare", benefit: "Crop insurance for notified crops at a fixed farmer premium",
    link: "https://pmfby.gov.in/", goals: ["farming"], aliases: ["fasal bima", "pmfby", "crop insurance", "फसल बीमा"],
    documents: ["Aadhaar", "Land record (RoR/LPC) or tenancy/sharecropping document notified by the state", "Sowing declaration", "Bank account"],
    steps: ["Check on pmfby.gov.in whether your crop is notified for your area and season", "Apply through your bank, CSC or pmfby.gov.in before the cut-off date", "Pay the farmer share of premium"],
    verified: true,
    rules: [
      boolRule("grow", "cultivatesCrops", true, "Grows crops (owner, tenant or sharecropper)", "All farmers including sharecroppers and tenant farmers growing the notified crops in the notified areas are eligible for coverage.", S.pmfby),
      boolRule("notified", "cropNotified", true, "Crop is notified for your area this season", "growing the notified crops in the notified areas", S.pmfby, "Only notified crops in notified areas can be insured."),
      boolRule("proof", "cultivationProof", true, "Has land record or state-accepted tenancy/sharecropping document", "farmers should have insurable interest… documentary evidence of land records prevailing in the State (RoR, LPC etc.) and/or applicable contract/ agreement details", S.pmfby),
    ],
    alwaysVerify: { requirement: "Enrolment must be done before the season's cut-off date", excerpt: "at least seven days prior to the cut-off date for enrolment of farmers for the respective season", source: S.pmfby },
  },
  {
    id: "pmjay", name: "Ayushman Bharat PM-JAY", ministry: "National Health Authority", benefit: "Cashless hospital cover up to ₹5 lakh a year",
    link: "https://beneficiary.nha.gov.in/", goals: ["health"], aliases: ["ayushman", "pmjay", "pm-jay", "vay vandana", "आयुष्मान"],
    documents: ["Aadhaar (age is taken from Aadhaar for the 70+ card)", "Ration card or family ID if asked"],
    steps: ["Open beneficiary.nha.gov.in or the Ayushman app", "Search your name / enrol with Aadhaar e-KYC", "Download the Ayushman (or Vay Vandana) card"],
    verified: true,
    rules: [{ id: "path", requirement: "Aged 70 or older on Aadhaar, OR family is listed in the PM-JAY database", anyOf: [
      ageRule("age70", 70, 200, "Senior citizen aged 70 or older as per Aadhaar (any income)", "all senior citizens of the age 70 years and above irrespective of their socio-economic status would be eligible", S.pmjay70, "ageOnAadhaar"),
      boolRule("listed", "pmjayListed", true, "Family found in the official PM-JAY beneficiary list", "Entitlement is checked on the official beneficiary portal; a BPL card alone does not decide it", S.pmjayList),
    ] }],
    nearMiss: f => typeof f.ageOnAadhaar === "number" && f.ageOnAadhaar >= 65 && f.ageOnAadhaar < 70 && f.pmjayListed !== true ? `Check again after turning 70 on Aadhaar — the 70+ route does not depend on income.` : null,
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
    link: "https://pfrda.org.in/web/pfrda/w/faqs/atal-pension-yojana", goals: ["pension"], aliases: ["atal pension", "apy", "अटल पेंशन"],
    documents: ["Savings bank / post office account", "Aadhaar", "Mobile number"],
    steps: ["Visit the bank / post office where you have a savings account", "Fill the APY form and choose a pension amount", "Set up auto-debit of the monthly contribution"],
    verified: true,
    rules: [
      boolRule("citizen", "indianCitizen", true, "Indian citizen", "APY is open to all citizens of India who fulfil the following eligibility criteria", S.apy),
      ageRule("age", 18, 40, "Age 18 to 39 (not yet 40)", "The age of an individual should be between 18 and 40 years.", S.apy),
      boolRule("acct", "hasBankAccount", true, "Has a savings bank / post office savings account", "He / She should have a savings bank account/ post office savings bank account.", S.apy, "Open a savings account first — then you can join."),
      boolRule("tax", "incomeTaxPayer", false, "Not now, and never been, an income-tax payer (new accounts from 1 Oct 2022)", "From 1st October, 2022, any Indian citizen who is or has been an income-tax payer under the Income-tax Act, 1961, as on the date of application will not be eligible to open a new APY account.", S.apyTax,
        "This applies to opening a new account. People who joined on or before 30 Sep 2022 can continue. A spouse who has never paid income tax may open their own account."),
    ],
  },
  {
    id: "pmsym", name: "PM Shram Yogi Maan-dhan (PM-SYM)", ministry: "Ministry of Labour & Employment", benefit: "Assured pension of ₹3,000 a month from age 60 (matching government contribution)",
    link: "https://maandhan.in/", goals: ["pension"], aliases: ["shram yogi", "maandhan", "maan-dhan", "pm-sym", "pmsym", "श्रम योगी", "मानधन"],
    documents: ["Aadhaar", "Savings bank / Jan-Dhan account", "Mobile phone"],
    steps: ["Visit the nearest Common Services Centre (CSC)", "Enrol with Aadhaar and savings account on self-certification", "Monthly contribution is auto-debited until age 60"],
    verified: true,
    rules: [
      boolRule("unorg", "unorganisedWorker", true, "Works in the unorganised sector", "unorganized workers mostly engaged as home based workers, street vendors, mid-day meal workers, head loaders, … agricultural workers, construction workers … and similar other occupations", S.pmsym),
      ageRule("age", 18, 41, "Entry age 18 to 40", "belong to the entry age group of 18-40 years", S.pmsym),
      maxMoneyRule("income", "monthlyIncome", 15000, "per month", "Monthly income ₹15,000 or less", "whose monthly income is Rs 15,000/ per month or less", S.pmsym),
      boolRule("covered", "coveredNpsEsicEpfo", false, "Not covered under NPS, ESIC or EPFO", "They should not be covered under New Pension Scheme (NPS), Employees’ State Insurance Corporation (ESIC) scheme or Employees’ Provident Fund Organisation (EPFO).", S.pmsym),
      boolRule("tax", "incomeTaxPayer", false, "Not an income-tax payer", "Further, he/she should not be an income tax payer.", S.pmsym),
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
        if (typeof a !== "number") return notNum(a);
        const c = a <= 50000 ? "Shishu" : a <= 500000 ? "Kishore" : a <= 1000000 ? "Tarun" : a <= 2000000 ? "Tarun Plus" : "Above ₹20 lakh";
        const answer = `${rupees(a)} (${c})`;
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
  {
    id: "svanidhi", name: "PM SVANidhi", ministry: "MoHUA / Department of Financial Services", benefit: "Collateral-free working-capital loans of ₹15,000, ₹25,000 and ₹50,000 (lending period to March 2030)",
    link: "https://pmsvanidhi.mohua.gov.in/", goals: ["business"], aliases: ["svanidhi", "swanidhi", "street vendor", "रेहड़ी", "ठेला", "स्वनिधि"],
    documents: ["Certificate of Vending or Letter of Recommendation from the Urban Local Body", "Aadhaar", "Bank account"],
    steps: ["Get a Certificate of Vending (CoV) or Letter of Recommendation (LoR) from your Urban Local Body", "Apply on the PM SVANidhi portal / app or with ULB help", "The lender verifies and sanctions the loan"],
    verified: true,
    rules: [
      boolRule("vendor", "streetVendor", true, "Street vendor / hawker", "Any person engaged in the vending of articles, goods, wares, food items, or merchandise of daily use or offering services to the public in a street, footpath, pavement, etc.", S.svan),
      boolRule("cov", "vendingCertificate", true, "Holds a Certificate of Vending or Letter of Recommendation", "A street vendor holding a valid Letter of Recommendation or Certificate of Vending can apply for a PM SVANidhi loan", S.svan, "Ask your Urban Local Body for a Letter of Recommendation first."),
    ],
    alwaysVerify: { requirement: "Loan approval after verification by the lender", excerpt: "On average, it takes about 23 days … subject to verification and completion of required formalities.", source: S.svan },
  },
  {
    id: "pmv", name: "PM Vishwakarma", ministry: "Ministry of MSME", benefit: "Recognition, skill training, toolkit incentive and collateral-free loans up to ₹3 lakh in two tranches",
    link: "https://pmvishwakarma.gov.in/", goals: ["business"], aliases: ["vishwakarma", "विश्वकर्मा", "artisan", "कारीगर"],
    documents: ["Aadhaar", "Mobile number", "Bank details", "Ration card"],
    steps: ["Register at a Common Services Centre with Aadhaar", "Three-stage verification (Gram Panchayat / ULB, district, state)", "Basic training, then first loan tranche"],
    verified: true,
    rules: [
      boolRule("trade", "traditionalTrade", true, "Self-employed artisan in one of the 18 listed family-based trades", "An artisan or craftsperson working with hands and tools and engaged in one of the family-based traditional trades specified in Para 2.3, in the unorganized or informal sector, on self-employment basis", S.pmv),
      ageRule("age", 18, 200, "Age 18 or older on the date of registration", "The minimum age of the beneficiary should be 18 years on the date of registration.", S.pmv),
      { id: "loans", facts: ["govtLoan5y"], requirement: "No PMEGP / PM SVANidhi / MUDRA-type government loan in the past 5 years — unless a MUDRA or SVANidhi loan is fully repaid", excerpt: "should not have availed loans under similar credit-based schemes … e.g. PMEGP, PM SVANidhi, MUDRA, in the past 5 years. However, the beneficiaries of MUDRA and SVANidhi who have fully repaid their loan, will be eligible", source: S.pmv, check: f => {
        const v = f.govtLoan5y;
        if (v === "none") return { outcome: "pass", answer: "No such loan in 5 years" };
        if (v === "repaid_mudra_svanidhi") return { outcome: "pass", answer: "MUDRA / SVANidhi loan fully repaid" };
        if (v === "other") return { outcome: "fail", answer: "Unrepaid MUDRA/SVANidhi or a PMEGP-type loan in 5 years" };
        return { outcome: "unknown", answer: yesNo(v) };
      } },
      boolRule("family", "familyInPmv", false, "No other family member (husband, wife, unmarried children) already registered", "The registration and benefits under the Scheme shall be restricted to one member of the family.", S.pmv),
      boolRule("govt", "govtServiceFamily", false, "No one in the family is in government service", "A person in government service and his/her family members shall not be eligible under the Scheme.", S.pmv),
    ],
    alwaysVerify: { requirement: "Registration is verified at Gram Panchayat / ULB, district and state level", excerpt: "Aadhaar authenticated … enrolment through CSCs … verification", source: S.pmv },
  },
  {
    id: "standup", name: "Stand-Up India", ministry: "Department of Financial Services", benefit: "Bank loans above ₹10 lakh up to ₹1 crore for a new enterprise (continued to 31 Mar 2031)",
    link: "https://www.standupmitra.in/", goals: ["business"], aliases: ["stand up india", "stand-up india", "standup", "स्टैंड अप"],
    documents: ["Aadhaar and PAN", "Caste certificate (SC/ST applicants)", "Project report", "Business address proof"],
    steps: ["Prepare a project report for a new (greenfield) enterprise", "Apply at a bank branch or on standupmitra.in", "The bank appraises and sanctions the loan"],
    verified: true,
    rules: [
      { id: "who", requirement: "Woman, or Scheduled Caste / Scheduled Tribe entrepreneur", anyOf: [
        { id: "woman", facts: ["gender"], requirement: "Woman entrepreneur", excerpt: "Eligible borrowers: Women, SC and ST entrepreneurs", source: S.standup, check: f => !known(f.gender) ? { outcome: "unknown", answer: yesNo(f.gender) } : f.gender === "female" ? { outcome: "pass", answer: "Woman" } : { outcome: "fail", answer: f.gender === "male" ? "Man" : "Other" } },
        { id: "scst", facts: ["socialCategory"], requirement: "SC or ST entrepreneur", excerpt: "Eligible borrowers: Women, SC and ST entrepreneurs", source: S.standup, check: f => !known(cat(f)) ? { outcome: "unknown", answer: yesNo(cat(f)) } : isScSt(f) ? { outcome: "pass", answer: String(cat(f)).toUpperCase() } : { outcome: "fail", answer: String(cat(f)).toUpperCase() } },
      ] },
      boolRule("green", "greenfield", true, "Setting up a new (greenfield) enterprise", "for setting up new/green field enterprises", S.standup),
      { id: "amount", facts: ["loanAmount"], requirement: "Loan above ₹10 lakh and up to ₹1 crore", excerpt: "Term loan for amounts above Rs.10.00 lakh and upto Rs.1.00 crore (upto 85% of the project cost)", source: S.standup, check: f => {
        const a = f.loanAmount;
        if (typeof a !== "number") return notNum(a);
        return a > 1000000 && a <= 10000000 ? { outcome: "pass", answer: rupees(a) } : { outcome: "fail", answer: rupees(a), ...(a <= 1000000 ? { note: "Up to ₹10 lakh is covered by MUDRA instead." } : {}) };
      } },
    ],
    alwaysVerify: { requirement: "Sector, project cost and other conditions are appraised by the bank", excerpt: "Eligible Sectors: Manufacturing, Services, Trading and Agri allied activities.", source: S.standup },
  },
  {
    id: "pmusp", name: "PM-USP Central Sector Scholarship (College & University)", ministry: "Ministry of Education", benefit: "₹12,000 a year at graduation, ₹20,000 a year at post-graduation",
    link: "https://scholarships.gov.in/", goals: ["education"], aliases: ["pm-usp", "pmusp", "central sector scholarship", "csss", "उच्चतर शिक्षा प्रोत्साहन"],
    documents: ["Class XII marksheet", "Income certificate (fresh applicants)", "College admission proof (AISHE code)", "Bank account in the student's name"],
    steps: ["Apply on the National Scholarships Portal (scholarships.gov.in) within the window", "Institute verifies, then the State Nodal Agency", "Renewal each year needs 50% marks and 75% attendance"],
    verified: true,
    rules: [
      boolRule("merit", "class12Top20", true, "Above the 80th percentile of successful Class XII candidates in the same stream and board", "Students who are above 80th percentile of successful candidates in the relevant stream from the respective Board of Examination in Class XII", S.pmusp, "Your board publishes the cut-off marks each year."),
      boolRule("regular", "regularDegree", true, "Pursuing a regular degree course at a recognised college (not distance, correspondence or diploma)", "Pursuing regular degree courses and not correspondence or distance mode or pursuing Diploma courses; Pursuing courses at colleges/institutions recognized by AICTE and respective Regulatory Bodies", S.pmusp),
      boolRule("other", "otherScholarship", false, "Not receiving another merit/state scholarship, fee waiver or reimbursement", "Not availing benefit of any other merit scholarship schemes, State run scholarship schemes, fee waiver, reimbursement scheme.", S.pmusp),
      maxMoneyRule("income", "familyIncomeAnnual", 450000, "per year", "Gross family income up to ₹4.5 lakh a year", "Students with gross parental/family income upto ₹ 4.5 lakh per annum are eligible", S.pmusp),
    ],
  },
  {
    id: "nmmss", name: "National Means-cum-Merit Scholarship (NMMSS)", ministry: "Ministry of Education (DoSEL)", benefit: "₹12,000 a year from Class IX to XII",
    link: "https://scholarships.gov.in/", goals: ["education"], aliases: ["nmmss", "nmms", "means cum merit", "मेधा छात्रवृत्ति"],
    documents: ["Class VII marksheet", "Parental income certificate", "School certificate", "Caste certificate (SC/ST relaxation)"],
    steps: ["Appear in the State's NMMSS test (MAT + SAT) in Class VIII", "Score at least 40% aggregate (32% for SC/ST)", "Selected students apply on the National Scholarships Portal"],
    verified: true,
    rules: [
      boolRule("class8", "inClass8", true, "Studying in Class VIII now (the selection test is held at that stage)", "The test is conducted at stage of class-VIII.", S.nmmss, "Fresh scholarships are selected only through the Class VIII test."),
      maxMoneyRule("income", "familyIncomeAnnual", 350000, "per year", "Parental income from all sources up to ₹3.5 lakh a year", "Students whose parental income from all sources is not more than ₹3,50,000/- per annum are eligible", S.nmmss),
      { id: "marks", facts: ["class7Marks", "socialCategory"], requirement: "At least 55% in Class VII (50% for SC/ST)", excerpt: "minimum of 55 % marks or equivalent grade in Class VII examination … (relaxable by 5% for SC/ST students)", source: S.nmmss, check: f => {
        const m = f.class7Marks;
        if (typeof m !== "number") return notNum(m);
        const answer = `${m}%`;
        if (m >= 55) return { outcome: "pass", answer };
        if (m < 50) return { outcome: "fail", answer };
        if (isScSt(f)) return { outcome: "pass", answer: `${answer} (SC/ST relaxation)` };
        if (known(cat(f))) return { outcome: "fail", answer };
        return { outcome: "unknown", answer, note: "50–54% qualifies only with the SC/ST relaxation." };
      } },
      { id: "school", facts: ["schoolType"], requirement: "Regular student of a Government, Government-aided or local body school (not KVS, NVS or residential)", excerpt: "The students should be studying as regular student in a Government, Government-aided and local body schools. Students of NVS, KVS and residential schools are not entitled", source: S.nmmss, check: f => {
        const v = f.schoolType;
        if (v === "govt") return { outcome: "pass", answer: "Government / aided / local body school" };
        if (v === "kvs_nvs_res" || v === "private") return { outcome: "fail", answer: v === "private" ? "Private unaided school" : "KVS / NVS / residential school" };
        return { outcome: "unknown", answer: yesNo(v) };
      } },
    ],
    alwaysVerify: { requirement: "Selection depends on the State test result and reservation", excerpt: "must pass both the tests, i.e., MAT and SAT … with at least 40 % marks in aggregate … For the SC/ST students, this cut off is 32% marks.", source: S.nmmss },
  },
  {
    id: "pmayu", name: "PM Awas Yojana – Urban 2.0", ministry: "Ministry of Housing & Urban Affairs", benefit: "Help to build, buy or rent a pucca house (vertical depends on income and ULB)",
    link: "https://pmay-urban.gov.in/", goals: ["housing"], aliases: ["pmay", "awas yojana", "pm awas", "आवास योजना", "पीएम आवास"],
    documents: ["Aadhaar of all family members", "Income certificate / self-declaration", "Undertaking of no pucca house", "Land document (for self-construction)"],
    steps: ["Apply on pmay-urban.gov.in or at your Urban Local Body", "ULB verifies eligibility and assigns a vertical (BLC / AHP / ARH / ISS)", "District/ULB committee approves the beneficiary list"],
    verified: true,
    rules: [
      boolRule("urban", "livesUrban", true, "Family lives in an urban area", "Families belonging to EWS/LIG/MIG category, living in urban areas", S.pmay, "Rural families apply under PMAY-Gramin instead."),
      maxMoneyRule("income", "familyIncomeAnnual", 900000, "per year", "Household income up to ₹9 lakh a year (EWS ≤ ₹3L, LIG ₹3–6L, MIG ₹6–9L)", "EWS households … annual income of up to ₹3 lakh. LIG … from ₹3 lakh up to ₹6 lakh. MIG … from ₹6 lakh up to ₹9 lakh.", S.pmay),
      boolRule("pucca", "ownsPuccaHouse", false, "No pucca house anywhere in India in the name of any family member (husband, wife, unmarried children)", "should not own a pucca house [(an all-weather dwelling unit)] either in his/her name or in the name of any member of his/her family in any part of India.", S.pmay),
      boolRule("prior", "govtHouse20y", false, "Not allotted a house under any government housing scheme in the last 20 years", "The beneficiary who has been allotted house under any of the housing scheme of Central Government, State/UT Government and Local Self Government in last 20 years in urban or rural areas, shall not be eligible", S.pmay),
    ],
    alwaysVerify: { requirement: "The ULB verifies and picks the vertical: BLC and AHP are for EWS only; ISS for houses up to ₹35 lakh", excerpt: "BLC … EWS categories; AHP … EWS beneficiaries; ISS … House Value ₹35 lakh", source: S.pmay },
  },
  {
    id: "ssy", name: "Sukanya Samriddhi Account", ministry: "Ministry of Finance (National Savings)", benefit: "High-interest savings account for a girl child (₹250 to ₹1.5 lakh a year)",
    link: "https://www.nsiindia.gov.in/", goals: ["savings"], aliases: ["sukanya", "ssy", "सुकन्या"],
    documents: ["Girl's birth certificate", "Guardian's ID and address proof", "Affidavit for twins/triplets (if a third account)"],
    steps: ["Visit a post office or authorised bank", "Fill Form-1 with the birth certificate", "Deposit at least ₹250"],
    verified: true,
    rules: [
      ageRule("age", 0, 10, "The girl is under 10 years old", "opened by one of the guardian in the name of a girl child, who has not attained the age of ten years as on the date of opening of the account", S.ssy, "girlAge"),
      boolRule("single", "girlHasSsy", false, "She does not already have an SSY account", "Every account holder shall have a single account under this Scheme.", S.ssy),
      { id: "family", facts: ["familySsyGirls"], requirement: "At most two girl children per family (twins/triplets exception)", excerpt: "An account … may be opened for a maximum of two girl children in one family: Provided that more than two accounts may be opened … if such children are born in the first or in the second order of birth … twins/triplets", source: S.ssy, check: f => {
        const n = f.familySsyGirls;
        if (typeof n !== "number") return notNum(n);
        if (n < 2) return { outcome: "pass", answer: `${n} other girl${n === 1 ? "" : "s"} with an account` };
        return { outcome: "unknown", answer: `${n} other girls with accounts`, note: "A third account is allowed only for twins/triplets in the first two births, with an affidavit." };
      } },
    ],
  },
];

/** Listed for discovery only — not checked by ARCEUS rules; open the official page. */
export const DISCOVERY = [
  { name: "NSAP Old Age / Widow / Disability Pension", link: "https://nsap.nic.in/", goal: "pension" as Goal },
  { name: "Kisan Credit Card", link: "https://www.myscheme.gov.in/schemes/kcc", goal: "farming" as Goal },
  { name: "PMAY-Gramin (rural housing)", link: "https://pmayg.dord.gov.in/", goal: "housing" as Goal },
  { name: "National Scholarship Portal schemes", link: "https://scholarships.gov.in/", goal: "education" as Goal },
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
  return out.filter(k =>
    (k !== "priorTarunRepaid" || (typeof f.loanAmount === "number" && f.loanAmount > 1000000)) &&
    // Staff group matters only for a government employee or a ₹10,000+ pension.
    (k !== "govtStaffGroupD" || f.govtEmployee === true || (typeof f.pensionMonthly === "number" && f.pensionMonthly >= 10000)) &&
    // Category matters for NMMSS only at 50–54%.
    (k !== "socialCategory" || scheme.id !== "nmmss" || (typeof f.class7Marks === "number" && f.class7Marks >= 50 && f.class7Marks < 55)));
}

export function schemesForGoal(g: Goal) { return SCHEMES.filter(s => s.goals.includes(g)); }
export function findSchemeByName(text: string): Scheme | null {
  const t = text.toLowerCase();
  return SCHEMES.find(s => s.aliases.some(a => t.includes(a))) ?? null;
}
export const VERIFIED_COUNT = SCHEMES.filter(s => s.verified).length;

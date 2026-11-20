import { describe, it, expect } from "vitest";
import { SCHEMES, evaluate, UNKNOWN, type Facts } from "@/lib/eligibility";
import { QUESTIONS, applyFacts, chooseNeed, newInterview, nextQuestion, parseAnswer } from "@/lib/interview";
import { parseAnnualAmount } from "@/lib/parse";

const get = (id: string) => SCHEMES.find(s => s.id === id)!;
const st = (id: string, f: Facts) => evaluate(get(id), f).status;

describe("APY — PFRDA FAQ income-tax rule (new accounts from 1 Oct 2022)", () => {
  const ok = { indianCitizen: true, age: 30, hasBankAccount: true };
  it("current or past income-tax payer is not eligible for a new account", () => {
    const r = evaluate(get("apy"), { ...ok, incomeTaxPayer: true });
    expect(r.status).toBe("ineligible");
    expect(r.decisive?.requirement).toMatch(/income-tax/);
    expect(r.decisive?.note).toMatch(/30 Sep 2022/);
  });
  it("non-citizen fails; unknown citizenship needs verification", () => {
    expect(st("apy", { ...ok, incomeTaxPayer: false, indianCitizen: false })).toBe("ineligible");
    expect(st("apy", { ...ok, incomeTaxPayer: false, indianCitizen: UNKNOWN })).toBe("needs_verification");
    expect(st("apy", { ...ok, incomeTaxPayer: false })).toBe("likely_eligible");
  });
  it("interview asks citizenship and past tax status", () => {
    let iv = chooseNeed(newInterview(), "atal pension")!;
    iv = applyFacts(iv, { subject: "self" });
    expect(nextQuestion(iv)?.key).toBe("indianCitizen");
    iv = applyFacts(iv, { indianCitizen: true, age: 30, hasBankAccount: true });
    expect(nextQuestion(iv)?.key).toBe("incomeTaxPayer");
  });
});

describe("PM-KISAN — Group D exemption and other exclusions", () => {
  const base = { ownsCultivableLand: true, institutionalLand: false, constitutionalPost: false, incomeTaxLastAY: false, govtEmployee: false, registeredProfessional: false };
  it("₹12,000 pension is not rejected until the staff group is known", () => {
    expect(st("pm-kisan", { ...base, pensionMonthly: 12000 })).toBe("needs_verification");
    let iv = chooseNeed(newInterview(), "pm kisan")!;
    iv = applyFacts(iv, { subject: "self", ...base, pensionMonthly: 12000 });
    expect(nextQuestion(iv)?.key).toBe("govtStaffGroupD");
  });
  it("Group D pensioner is not excluded; higher-group pensioner is", () => {
    expect(evaluate(get("pm-kisan"), { ...base, pensionMonthly: 12000, govtStaffGroupD: true }).criteria.find(c => c.id === "pension")!.outcome).toBe("pass");
    expect(st("pm-kisan", { ...base, pensionMonthly: 12000, govtStaffGroupD: false })).toBe("ineligible");
  });
  it("serving MTS/Group D employee passes the officials rule", () => {
    expect(evaluate(get("pm-kisan"), { ...base, govtEmployee: true, govtStaffGroupD: true, pensionMonthly: 0 }).criteria.find(c => c.id === "officials")!.outcome).toBe("pass");
  });
  it("constitutional post holder in family is excluded", () => {
    expect(st("pm-kisan", { ...base, pensionMonthly: 0, constitutionalPost: true })).toBe("ineligible");
  });
  it("staff group is never asked when pension is below ₹10,000 and nobody is a govt employee", () => {
    let iv = chooseNeed(newInterview(), "pm kisan")!;
    iv = applyFacts(iv, { subject: "self", ...base, pensionMonthly: 5000 });
    expect(nextQuestion(iv)).toBeNull();
  });
});

describe("PM-JAY — age on Aadhaar is its own fact", () => {
  it("generic age does not decide the 70+ route", () => {
    expect(st("pmjay", { age: 75 })).toBe("needs_verification");
    expect(st("pmjay", { ageOnAadhaar: 75 })).toBe("likely_eligible");
  });
  it("asks the Aadhaar-age question, never for the number", () => {
    let iv = chooseNeed(newInterview(), "", "health")!;
    iv = applyFacts(iv, { subject: "self", age: 72 });
    expect(nextQuestion(iv)?.key).toBe("ageOnAadhaar");
    expect(QUESTIONS.ageOnAadhaar.en[0]).toMatch(/don't tell me the Aadhaar number/);
  });
  it("beneficiary-list route stays independent of age", () => {
    expect(st("pmjay", { ageOnAadhaar: 40, pmjayListed: true })).toBe("likely_eligible");
  });
});

describe("new verified records — thresholds", () => {
  it("PM-USP income ₹4.5 lakh passes, ₹4.6 lakh fails, 'about 4.4 lakh' needs verification", () => {
    const b = { class12Top20: true, regularDegree: true, otherScholarship: false };
    expect(st("pmusp", { ...b, familyIncomeAnnual: 450000 })).toBe("likely_eligible");
    expect(st("pmusp", { ...b, familyIncomeAnnual: 460000 })).toBe("ineligible");
    expect(st("pmusp", { ...b, familyIncomeAnnual: 440000, familyIncomeAnnual_approx: true })).toBe("needs_verification");
    expect(st("pmusp", { ...b, otherScholarship: true, familyIncomeAnnual: 200000 })).toBe("ineligible");
  });
  it("monthly income is converted to yearly (₹30,000/month = ₹3.6 lakh/year)", () => {
    expect(parseAnnualAmount("30000 per month")).toMatchObject({ value: 360000, approx: true });
    expect(parseAnswer(QUESTIONS.familyIncomeAnnual, "3.6 lakh saal", "hi")).toEqual({ ok: true, facts: { familyIncomeAnnual: 360000 } });
  });
  it("NMMSS: 52% passes only for SC/ST; KVS fails; ₹3.5 lakh cap", () => {
    const b = { inClass8: true, familyIncomeAnnual: 300000, schoolType: "govt" };
    expect(st("nmmss", { ...b, class7Marks: 52 })).toBe("needs_verification");
    expect(evaluate(get("nmmss"), { ...b, class7Marks: 52, socialCategory: "sc" }).criteria.find(c => c.id === "marks")!.outcome).toBe("pass");
    expect(st("nmmss", { ...b, class7Marks: 52, socialCategory: "general" })).toBe("ineligible");
    expect(st("nmmss", { ...b, class7Marks: 70, schoolType: "kvs_nvs_res" })).toBe("ineligible");
    expect(st("nmmss", { ...b, class7Marks: 70, familyIncomeAnnual: 360000 })).toBe("ineligible");
  });
  it("PMAY-U: ₹9 lakh limit, pucca house and 20-year rule", () => {
    const b = { livesUrban: true, ownsPuccaHouse: false, govtHouse20y: false };
    expect(st("pmayu", { ...b, familyIncomeAnnual: 900000 })).toBe("needs_verification"); // ULB picks vertical
    expect(st("pmayu", { ...b, familyIncomeAnnual: 910000 })).toBe("ineligible");
    expect(st("pmayu", { ...b, familyIncomeAnnual: 200000, ownsPuccaHouse: true })).toBe("ineligible");
    expect(st("pmayu", { ...b, familyIncomeAnnual: 200000, govtHouse20y: true })).toBe("ineligible");
  });
  it("PM-SYM: 40 joins, 41 cannot; ₹15,000/month cap; EPFO excludes", () => {
    const b = { unorganisedWorker: true, monthlyIncome: 12000, coveredNpsEsicEpfo: false, incomeTaxPayer: false };
    expect(st("pmsym", { ...b, age: 40 })).toBe("likely_eligible");
    expect(st("pmsym", { ...b, age: 41 })).toBe("ineligible");
    expect(st("pmsym", { ...b, age: 30, monthlyIncome: 15001 })).toBe("ineligible");
    expect(st("pmsym", { ...b, age: 30, coveredNpsEsicEpfo: true })).toBe("ineligible");
  });
  it("PM Vishwakarma: repaid MUDRA is fine, unrepaid loan fails, family member already registered fails", () => {
    const b = { traditionalTrade: true, age: 30, familyInPmv: false, govtServiceFamily: false };
    expect(evaluate(get("pmv"), { ...b, govtLoan5y: "repaid_mudra_svanidhi" }).criteria.find(c => c.id === "loans")!.outcome).toBe("pass");
    expect(st("pmv", { ...b, govtLoan5y: "other" })).toBe("ineligible");
    expect(st("pmv", { ...b, govtLoan5y: "none", familyInPmv: true })).toBe("ineligible");
  });
  it("Sukanya: under 10 only; third girl needs the twins/triplets check", () => {
    expect(st("ssy", { girlAge: 9, girlHasSsy: false, familySsyGirls: 1 })).toBe("likely_eligible");
    expect(st("ssy", { girlAge: 10, girlHasSsy: false, familySsyGirls: 0 })).toBe("ineligible");
    expect(st("ssy", { girlAge: 3, girlHasSsy: false, familySsyGirls: 2 })).toBe("needs_verification");
  });
  it("Stand-Up India: man who is SC qualifies by the other path; ₹10 lakh exactly is outside", () => {
    expect(evaluate(get("standup"), { gender: "male", socialCategory: "sc", greenfield: true, loanAmount: 2000000 }).status).toBe("needs_verification");
    expect(st("standup", { gender: "male", socialCategory: "general", greenfield: true, loanAmount: 2000000 })).toBe("ineligible");
    expect(st("standup", { gender: "female", greenfield: true, loanAmount: 1000000 })).toBe("ineligible");
  });
  it("PMFBY: non-notified crop fails; notified crop still needs season cut-off check", () => {
    expect(st("pmfby", { cultivatesCrops: true, cropNotified: false })).toBe("ineligible");
    expect(st("pmfby", { cultivatesCrops: true, cropNotified: true, cultivationProof: true })).toBe("needs_verification");
  });
  it("SVANidhi: without CoV/LoR it is not a likely result, and not a rejection", () => {
    expect(st("svanidhi", { streetVendor: true, vendingCertificate: false })).toBe("needs_verification");
    expect(st("svanidhi", { streetVendor: false, vendingCertificate: true })).toBe("ineligible");
  });
});

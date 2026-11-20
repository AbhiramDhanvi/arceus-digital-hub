import { describe, it, expect } from "vitest";
import { SCHEMES, evaluate, UNKNOWN } from "@/lib/eligibility";
import { applyFacts, chooseNeed, effectiveFacts, newInterview, nextQuestion, parseAnswer, QUESTIONS, results, skip, statedAge } from "@/lib/interview";
import { parseAge, parseMonthlyAmount, parseNumber, parseYesNo } from "@/lib/parse";
import { decisionSentence } from "@/lib/decision-text";

const get = (id: string) => SCHEMES.find(s => s.id === id)!;

describe("thresholds", () => {
  it("APY: 39 can join, 40 cannot", () => {
    expect(evaluate(get("apy"), { age: 39, hasBankAccount: true, incomeTaxPayer: false }).status).toBe("likely_eligible");
    expect(evaluate(get("apy"), { age: 40, hasBankAccount: true, incomeTaxPayer: false }).status).toBe("ineligible");
  });
  it("approximate age near a limit stays unverified", () => {
    expect(evaluate(get("apy"), { age: 40, age_approx: true, hasBankAccount: true, incomeTaxPayer: false }).status).toBe("needs_verification");
  });
  it("PMJJBY entry 18–50; PMSBY 18–70", () => {
    expect(evaluate(get("pmjjby"), { age: 51, hasBankAccount: true }).status).toBe("ineligible");
    expect(evaluate(get("pmsby"), { age: 70, hasBankAccount: true }).status).toBe("likely_eligible");
    expect(evaluate(get("pmsby"), { age: 71, hasBankAccount: true }).status).toBe("ineligible");
  });
  it("PM-KISAN pension: yearly ₹1.5 lakh = ₹12,500/month fails; ₹1.2 lakh/yr straddles ₹10,000", () => {
    const m = parseMonthlyAmount("1.5 lakh per year")!;
    expect(m.value).toBe(12500);
    const base = { ownsCultivableLand: true, institutionalLand: false, incomeTaxLastAY: false, govtEmployee: false, registeredProfessional: false };
    expect(evaluate(get("pm-kisan"), { ...base, pensionMonthly: 12500 }).status).toBe("ineligible");
    const s = parseMonthlyAmount("1.2 lakh saal")!;
    expect(evaluate(get("pm-kisan"), { ...base, pensionMonthly: s.value, pensionMonthly_approx: s.approx }).status).toBe("needs_verification");
  });
  it("MUDRA: ₹15 lakh needs a repaid Tarun loan", () => {
    expect(evaluate(get("mudra"), { nonFarmEnterprise: true, loanAmount: 1500000, priorTarunRepaid: false }).status).toBe("ineligible");
    expect(evaluate(get("mudra"), { nonFarmEnterprise: true, loanAmount: 1500000, priorTarunRepaid: true }).status).toBe("needs_verification"); // lender approval
  });
});

describe("alternative paths", () => {
  it("PM-JAY: age 72 is likely eligible without any BPL fact", () => {
    expect(evaluate(get("pmjay"), { age: 72 }).status).toBe("likely_eligible");
  });
  it("PM-JAY: age 45 does not fail while the family list is unchecked", () => {
    expect(evaluate(get("pmjay"), { age: 45 }).status).toBe("needs_verification");
    expect(evaluate(get("pmjay"), { age: 45, pmjayListed: UNKNOWN }).status).toBe("needs_verification");
  });
  it("PM-JAY: fails only when both paths fail, with near-miss at 67", () => {
    const r = evaluate(get("pmjay"), { age: 67, pmjayListed: false });
    expect(r.status).toBe("ineligible");
    expect(r.nearMiss).toMatch(/70/);
  });
  it("farmer label alone never grants PM-KISAN or PMFBY", () => {
    expect(evaluate(get("pm-kisan"), { ownsCultivableLand: true }).status).toBe("needs_verification");
    expect(evaluate(get("pmfby"), { cultivatesCrops: true }).status).toBe("needs_verification");
  });
});

describe("unknown vs no", () => {
  it("no LPG in house passes; unknown stays unverified; yes fails", () => {
    const b = { gender: "female", age: 30, poorHousehold: true };
    expect(evaluate(get("pmuy"), { ...b, householdHasLpg: false }).status).toBe("likely_eligible");
    expect(evaluate(get("pmuy"), { ...b, householdHasLpg: UNKNOWN }).status).toBe("needs_verification");
    expect(evaluate(get("pmuy"), { ...b, householdHasLpg: true }).status).toBe("ineligible");
  });
  it("Hindi 'pata nahi' is unknown, not no", () => {
    expect(parseYesNo("पता नहीं")).toBe("unknown");
    expect(parseYesNo("नहीं")).toBe(false);
    expect(parseYesNo("हाँ जी")).toBe(true);
    expect(parseYesNo("nahi")).toBe(false);
  });
});

describe("numbers", () => {
  it("parses Hindi/English number words and digits", () => {
    expect(parseNumber("पैंतीस")).toBe(35);
    expect(parseNumber("thirty five")).toBe(35);
    expect(parseNumber("२ लाख")).toBe(200000);
    expect(parseAge("lagbhag 70")).toEqual({ value: 70, approx: true });
  });
});

describe("interview", () => {
  it("starts needs-first and goes to a named scheme directly", () => {
    expect(nextQuestion(newInterview())?.key).toBe("goal");
    const iv = chooseNeed(newInterview(), "Can I get Ujjwala gas?")!;
    expect(iv.schemeIds).toEqual(["pmuy"]);
    expect(nextQuestion(iv)?.key).toBe("subject");
  });
  it("asks only decisive facts and stops a scheme after a decisive fail", () => {
    let iv = chooseNeed(newInterview(), "", "lpg")!;
    iv = applyFacts(iv, { subject: "self" });
    iv = applyFacts(iv, { gender: "male" });
    expect(nextQuestion(iv)).toBeNull();
    expect(results(iv)[0]!.status).toBe("ineligible");
  });
  it("skip marks unknown and moves on", () => {
    let iv = chooseNeed(newInterview(), "", "insurance")!;
    iv = applyFacts(iv, { subject: "self" });
    iv = skip(iv, "age");
    expect(iv.facts.age).toBe(UNKNOWN);
    expect(nextQuestion(iv)?.key).toBe("hasBankAccount");
  });
  it("contradiction removes the fact from the verdict until confirmed", () => {
    let iv = chooseNeed(newInterview(), "", "pension")!;
    iv = applyFacts(iv, { subject: "self", age: 30, hasBankAccount: true, incomeTaxPayer: false });
    expect(results(iv)[0]!.status).toBe("likely_eligible");
    const said = statedAge("actually I am 45 years")!;
    iv = applyFacts(iv, { age: said.value });
    expect(iv.conflicts).toEqual(["age"]);
    expect(effectiveFacts(iv).age).toBeUndefined();
    expect(results(iv)[0]!.status).toBe("needs_verification");
    expect(nextQuestion(iv)?.key).toBe("age");
    iv = applyFacts(iv, { age: 45 }, { explicit: true });
    expect(results(iv)[0]!.status).toBe("ineligible");
  });
  it("parses answers deterministically", () => {
    expect(parseAnswer(QUESTIONS.age, "मेरी उम्र 62 साल है", "hi")).toEqual({ ok: true, facts: { age: 62 } });
    expect(parseAnswer(QUESTIONS.hasBankAccount, "haan", "hi")).toEqual({ ok: true, facts: { hasBankAccount: true } });
    expect(parseAnswer(QUESTIONS.gender, "महिला", "hi")).toEqual({ ok: true, facts: { gender: "female" } });
  });
  it("spoken decision names the exact deciding rule", () => {
    const r = evaluate(get("apy"), { age: 45, hasBankAccount: true });
    expect(decisionSentence(r, "en")).toContain("Age 18 to 39");
    expect(decisionSentence(r, "en")).toContain("45 years");
  });
});

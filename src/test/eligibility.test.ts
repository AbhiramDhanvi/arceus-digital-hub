import { describe, it, expect } from "vitest";
import { SCHEMES, evaluate, mergeFacts } from "@/lib/eligibility";
import { extractFacts } from "@/lib/extract";
const kisan = SCHEMES.find(s => s.id === "pm-kisan")!;
describe("eligibility", () => {
  it("land-owning non-taxpayer farmer is likely eligible for PM-KISAN", () => {
    expect(evaluate(kisan, { ownsFarmland: true, incomeTaxPayer: false }).status).toBe("likely_eligible");
  });
  it("income tax payer is ineligible for PM-KISAN", () => {
    expect(evaluate(kisan, { ownsFarmland: true, incomeTaxPayer: true }).status).toBe("ineligible");
  });
  it("missing facts give needs_verification", () => {
    expect(evaluate(kisan, { ownsFarmland: true }).status).toBe("needs_verification");
  });
  it("contradictory answers are flagged", () => {
    expect(mergeFacts({ age: 30 }, { age: 45 }).conflicts).toEqual(["age"]);
  });
  it("parses age and lakh income", () => {
    expect(extractFacts("I am 34 years old, income 2 lakh")).toMatchObject({ age: 34, annualIncome: 200000 });
  });
});

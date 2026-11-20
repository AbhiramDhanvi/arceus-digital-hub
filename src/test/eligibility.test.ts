import { describe, it, expect } from "vitest";
import { SCHEMES, VERIFIED_COUNT } from "@/lib/eligibility";
describe("records", () => {
  it("every criterion of a verified scheme cites an official URL", () => {
    for (const s of SCHEMES.filter(x => x.verified)) for (const r of s.rules) {
      const list = "anyOf" in r ? r.anyOf : [r];
      for (const c of list) expect(c.source.url).toMatch(/^https:\/\/(www\.)?[a-z.-]*(gov\.in|nic\.in|pfrda\.org\.in)\//);
    }
  });
  it("verified count matches records", () => { expect(VERIFIED_COUNT).toBe(16); expect(SCHEMES.length).toBe(16); });
});

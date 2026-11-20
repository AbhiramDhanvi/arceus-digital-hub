import { describe, it, expect } from "vitest";
import { SCHEMES } from "@/lib/eligibility";
import { isAdaptivePlannerEnabled } from "@/lib/feature-flags";
import {
  createLedger,
  evaluateRangeBound,
  parseMoneyClaim,
  pendingConflicts,
  recordClaim,
  resolveConflict,
} from "@/lib/claim-ledger";
import {
  confirmBatch,
  createPlannerState,
  evaluateSchemeAdaptive,
  extractMultipleFacts,
  next_question,
  submitUtterance,
} from "@/lib/adaptive-planner";

const scheme = (id: string) => SCHEMES.find((s) => s.id === id)!;

describe("ENABLE_ADAPTIVE_PLANNER feature flag", () => {
  it("defaults to OFF when unset", () => {
    const prev = process.env["ENABLE_ADAPTIVE_PLANNER"];
    delete process.env["ENABLE_ADAPTIVE_PLANNER"];
    expect(isAdaptivePlannerEnabled()).toBe(false);
    expect(isAdaptivePlannerEnabled(true)).toBe(true);
    if (prev !== undefined) process.env["ENABLE_ADAPTIVE_PLANNER"] = prev;
  });
});

describe("Claim Ledger: exact at limit vs one unit over", () => {
  it("APY: age 39 (exact max limit) is ELIGIBLE; age 40 (one unit over) is INELIGIBLE", () => {
    let atLimit = createLedger();
    atLimit = recordClaim(atLimit, {
      key: "indianCitizen",
      value: true,
      confidence: 1,
      source_quote: "Indian",
      turn: 1,
    }).ledger;
    atLimit = recordClaim(atLimit, {
      key: "age",
      value: 39,
      confidence: 1,
      source_quote: "39",
      turn: 2,
    }).ledger;
    atLimit = recordClaim(atLimit, {
      key: "hasBankAccount",
      value: true,
      confidence: 1,
      source_quote: "yes",
      turn: 3,
    }).ledger;
    atLimit = recordClaim(atLimit, {
      key: "incomeTaxPayer",
      value: false,
      confidence: 1,
      source_quote: "no",
      turn: 4,
    }).ledger;

    expect(evaluateSchemeAdaptive(scheme("apy"), atLimit).verdict).toBe("ELIGIBLE");

    const oneOver = recordClaim(atLimit, {
      key: "age",
      value: 40,
      confidence: 1,
      source_quote: "40",
      turn: 5,
      forceOverwrite: true,
    }).ledger;
    expect(evaluateSchemeAdaptive(scheme("apy"), oneOver).verdict).toBe("INELIGIBLE");
  });

  it("PM-SYM: monthly income ₹15,000 (exact limit) is ELIGIBLE; ₹15,001 (one unit over) is INELIGIBLE", () => {
    let base = createLedger();
    base = recordClaim(base, {
      key: "unorganisedWorker",
      value: true,
      confidence: 1,
      source_quote: "yes",
      turn: 1,
    }).ledger;
    base = recordClaim(base, {
      key: "age",
      value: 30,
      confidence: 1,
      source_quote: "30",
      turn: 2,
    }).ledger;
    base = recordClaim(base, {
      key: "coveredNpsEsicEpfo",
      value: false,
      confidence: 1,
      source_quote: "no",
      turn: 3,
    }).ledger;
    base = recordClaim(base, {
      key: "incomeTaxPayer",
      value: false,
      confidence: 1,
      source_quote: "no",
      turn: 4,
    }).ledger;

    const exact = recordClaim(base, {
      key: "monthlyIncome",
      value: 15_000,
      confidence: 1,
      source_quote: "15000",
      turn: 5,
    }).ledger;
    expect(evaluateSchemeAdaptive(scheme("pmsym"), exact).verdict).toBe("ELIGIBLE");

    const over = recordClaim(base, {
      key: "monthlyIncome",
      value: 15_001,
      confidence: 1,
      source_quote: "15001",
      turn: 5,
    }).ledger;
    expect(evaluateSchemeAdaptive(scheme("pmsym"), over).verdict).toBe("INELIGIBLE");
  });
});

describe("Claim Ledger: vague income ranges (lakh/hazaar, monthly/yearly, straddling thresholds)", () => {
  it("parses vague lakh/hazaar and monthly/yearly ranges", () => {
    expect(parseMoneyClaim("2-3 lakh", "annual")?.range).toEqual([200_000, 300_000]);
    expect(parseMoneyClaim("दो से तीन लाख", "annual")?.range).toEqual([200_000, 300_000]);
    expect(parseMoneyClaim("10-15 hazaar per month", "annual")?.range).toEqual([120_000, 180_000]);
    expect(parseMoneyClaim("10-15 hazaar per month", "monthly")?.range).toEqual([10_000, 15_000]);
    expect(parseMoneyClaim("3-4 lakh per year", "monthly")?.range).toEqual([25_000, 33_333]);
  });

  it("range wholly passes -> ELIGIBLE; wholly fails -> INELIGIBLE; straddles threshold -> targeted question and NEVER hard INELIGIBLE", () => {
    let base = createLedger();
    base = recordClaim(base, {
      key: "inClass8",
      value: true,
      confidence: 1,
      source_quote: "yes",
      turn: 1,
    }).ledger;
    base = recordClaim(base, {
      key: "class7Marks",
      value: 70,
      confidence: 1,
      source_quote: "70%",
      turn: 2,
    }).ledger;
    base = recordClaim(base, {
      key: "schoolType",
      value: "govt",
      confidence: 1,
      source_quote: "govt",
      turn: 3,
    }).ledger;

    // 2-3 lakh wholly passes NMMSS <= ₹3.5 lakh
    const passRange = recordClaim(base, {
      key: "familyIncomeAnnual",
      range: [200_000, 300_000],
      confidence: 0.82,
      source_quote: "2-3 lakh",
      turn: 4,
    }).ledger;
    expect(evaluateSchemeAdaptive(scheme("nmmss"), passRange).verdict).toBe("ELIGIBLE");

    // 4-5 lakh wholly fails NMMSS <= ₹3.5 lakh
    const failRange = recordClaim(base, {
      key: "familyIncomeAnnual",
      range: [400_000, 500_000],
      confidence: 0.82,
      source_quote: "4-5 lakh",
      turn: 4,
    }).ledger;
    expect(evaluateSchemeAdaptive(scheme("nmmss"), failRange).verdict).toBe("INELIGIBLE");

    // 3-4 lakh straddles ₹3.5 lakh threshold -> NEVER INELIGIBLE; planner asks one targeted question
    const straddleState = createPlannerState(["nmmss"]);
    straddleState.ledger = recordClaim(base, {
      key: "familyIncomeAnnual",
      range: [300_000, 400_000],
      confidence: 0.82,
      source_quote: "3-4 lakh",
      turn: 4,
    }).ledger;

    const evalStraddle = evaluateSchemeAdaptive(scheme("nmmss"), straddleState.ledger);
    expect(evalStraddle.verdict).toBe("UNDECIDED");
    expect(evalStraddle.verdict).not.toBe("INELIGIBLE");
    expect(evalStraddle.straddles.length).toBe(1);

    const step = next_question(straddleState);
    expect(step.question?.kind).toBe("straddle");
    expect(step.question?.question.en).toContain("3,50,000");

    // Answering "Yes" narrows range to <= ₹3,50,000 -> ELIGIBLE
    const afterYes = submitUtterance(straddleState, "Yes", { currentStep: step });
    expect(afterYes.step.statuses["nmmss"]?.verdict).toBe("ELIGIBLE");
  });

  it("evaluateRangeBound handles inclusive and exclusive bounds accurately", () => {
    expect(evaluateRangeBound([200_000, 300_000], { max: 350_000 }).outcome).toBe("pass");
    expect(evaluateRangeBound([400_000, 500_000], { max: 350_000 }).outcome).toBe("fail");
    expect(evaluateRangeBound([300_000, 400_000], { max: 350_000 }).outcome).toBe("straddle");
    expect(evaluateRangeBound([38, 41], { min: 18, maxExclusive: 40 }).outcome).toBe("straddle");
  });
});

describe("Claim Ledger: contradictions & CONDITIONAL two-branch verdicts", () => {
  it("never silently overwrites 'no land' vs '2 acres', asks neutral question quoting both, and produces CONDITIONAL verdict if unresolved", () => {
    let state = createPlannerState(["pm-kisan"]);
    // Turn 1: "I have no land"
    const t1 = submitUtterance(state, "I have no land");
    state = t1.state;
    expect(state.ledger.claims.ownsCultivableLand?.value).toBe(false);

    // Fill other PM-KISAN non-land facts so land is the deciding factor
    for (const [k, v] of [
      ["institutionalLand", false],
      ["constitutionalPost", false],
      ["incomeTaxLastAY", false],
      ["govtEmployee", false],
      ["pensionMonthly", 0],
      ["registeredProfessional", false],
    ] as const) {
      state.ledger = recordClaim(state.ledger, {
        key: k,
        value: v,
        confidence: 1,
        source_quote: String(v),
      }).ledger;
    }

    // Turn 2: contradicts with "I farm 2 acres of land"
    const t2 = submitUtterance(state, "Actually I have 2 acres of land");
    state = t2.state;
    // Original claim was NOT silently overwritten
    expect(state.ledger.claims.ownsCultivableLand?.value).toBe(false);
    expect(pendingConflicts(state.ledger).length).toBe(1);

    // Neutral question quotes both statements
    expect(t2.step.question?.kind).toBe("conflict");
    expect(t2.step.question?.question.en).toContain("I have no land");
    expect(t2.step.question?.question.en).toContain("Actually I have 2 acres of land");

    // Leave conflict unresolved -> CONDITIONAL verdict showing both branches (INELIGIBLE vs ELIGIBLE)
    const conflictId = pendingConflicts(state.ledger)[0]!.id;
    state.ledger = resolveConflict(state.ledger, conflictId, "unresolved");
    const ev = evaluateSchemeAdaptive(scheme("pm-kisan"), state.ledger);
    expect(ev.verdict).toBe("CONDITIONAL");
    expect(ev.branches).toHaveLength(2);
    expect(ev.branches?.[0].verdict).toBe("INELIGIBLE");
    expect(ev.branches?.[1].verdict).toBe("ELIGIBLE");
  });

  it("detects cross-field contradiction: age 35 vs Class VIII student", () => {
    let ledger = createLedger();
    ledger = recordClaim(ledger, {
      key: "age",
      value: 35,
      confidence: 0.95,
      source_quote: "I am 35 years old",
      turn: 1,
    }).ledger;
    const res = recordClaim(ledger, {
      key: "inClass8",
      value: true,
      confidence: 0.95,
      source_quote: "I am studying in class 8",
      turn: 2,
    });
    expect(res.conflict).not.toBeNull();
    expect(res.conflict?.ruleId).toBe("age_vs_class8");
    expect(res.conflict?.question.en).toContain("I am 35 years old");
    expect(res.conflict?.question.en).toContain("I am studying in class 8");
  });
});

describe("Adaptive Question Planner: split-maximizing, tie-breaking, multi-field extraction, batch confirm", () => {
  it("picks the field that splits the most UNDECIDED schemes, breaking ties easy-first and income-last", () => {
    // Across all 16 schemes, `age` affects the largest number of schemes AND is tier 1 (easiest)
    const allState = createPlannerState();
    const step1 = next_question(allState);
    expect(step1.question?.key).toBe("age");
    expect(step1.schemes_open.length).toBe(16);

    // For PM-SYM alone (all rules split 1 scheme -> tie!), easy field `age` must come before `monthlyIncome` (income last!)
    const pmsymState = createPlannerState(["pmsym"]);
    const pmsymFirst = next_question(pmsymState);
    expect(pmsymFirst.question?.key).toBe("age");

    // For PMAY-U alone (`livesUrban`, `ownsPuccaHouse`, `govtHouse20y`, `familyIncomeAnnual` all split 1 scheme):
    // `livesUrban` (location/easy) must come before `familyIncomeAnnual` (income last!)
    const pmayState = createPlannerState(["pmayu"]);
    const pmayFirst = next_question(pmayState);
    expect(pmayFirst.question?.key).toBe("livesUrban");
  });

  it("extracts multiple fields from a single utterance and asks batch confirmation once at the end", () => {
    const extracted = extractMultipleFacts(
      "I am a 32 year old woman with a bank account, no income tax, Indian citizen",
    );
    const byKey = Object.fromEntries(extracted.map((e) => [e.key, e.value ?? e.range]));
    expect(byKey["age"]).toBe(32);
    expect(byKey["gender"]).toBe("female");
    expect(byKey["hasBankAccount"]).toBe(true);
    expect(byKey["incomeTaxPayer"]).toBe(false);
    expect(byKey["indianCitizen"]).toBe(true);

    // Feed that single utterance to APY planner -> settles APY immediately and requests batch confirmation once at the end
    const apyState = createPlannerState(["apy"]);
    const res = submitUtterance(
      apyState,
      "I am a 32 year old woman with a bank account, no income tax, Indian citizen",
    );
    expect(res.step.statuses["apy"]?.verdict).toBe("ELIGIBLE");
    expect(res.step.question).toBeNull();
    expect(res.step.schemes_open).toEqual([]);
    // Age 32 is far from 18 and 40, confidence is high -> no early confirm, batch confirm at end!
    expect(res.step.early_confirmation).toBeNull();
    expect(res.step.needs_batch_confirmation).toBe(true);

    const confirmed = confirmBatch(res.state);
    expect(next_question(confirmed).needs_batch_confirmation).toBe(false);
  });

  it("triggers early single-field confirmation when a value is near a rule threshold", () => {
    const apyState = createPlannerState(["apy"]);
    // Age 39 is within 2 years of APY's age-40 limit -> triggers early confirmation
    const res = submitUtterance(apyState, "I am 39 years old");
    expect(res.step.early_confirmation?.key).toBe("age");
    expect(res.step.early_confirmation?.value).toBe(39);
  });
});

describe("Automatic voice recognition & mic controller", () => {
  it("starts browser SpeechRecognition, emits interim & final transcripts with confidence, and aborts cleanly", async () => {
    const { createBrowserAutoRecognizer } = await import("@/lib/nirantar-voice");
    const ref: { current: MockRecognition | null } = { current: null };
    let startedCount = 0;
    let abortedCount = 0;

    class MockRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((ev: { error: string }) => void) | null = null;
      onresult: ((ev: unknown) => void) | null = null;
      start() {
        startedCount++;
        ref.current = this;
        this.onstart?.();
      }
      stop() {
        this.onend?.();
      }
      abort() {
        abortedCount++;
        this.onend?.();
      }
    }

    const w = window as unknown as Record<string, unknown>;
    const prev = w["webkitSpeechRecognition"];
    w["webkitSpeechRecognition"] = MockRecognition;

    try {
      const interimLog: string[] = [];
      const finalLog: Array<{ text: string; conf: number }> = [];
      const ctrl = createBrowserAutoRecognizer({
        onInterim: (t) => interimLog.push(t),
        onFinal: (text, conf) => finalLog.push({ text, conf }),
      });

      expect(ctrl.isSupported).toBe(true);
      expect(ctrl.start("hi-IN")).toBe(true);
      expect(startedCount).toBe(1);
      expect(ref.current?.lang).toBe("hi-IN");

      ref.current?.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: false, length: 1, 0: { transcript: "पेंशन", confidence: 0.7 } },
        },
      });
      expect(interimLog).toEqual(["पेंशन"]);

      ref.current?.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, length: 1, 0: { transcript: "पेंशन चाहिए", confidence: 0.94 } },
        },
      });
      expect(finalLog).toEqual([{ text: "पेंशन चाहिए", conf: 0.94 }]);

      ctrl.abort();
      expect(abortedCount).toBe(1);
    } finally {
      if (prev === undefined) delete w["webkitSpeechRecognition"];
      else w["webkitSpeechRecognition"] = prev;
    }
  });
});

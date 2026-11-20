// Feature 1: Adaptive Question Planner (read-only adapter over SCHEMES in eligibility.ts).
// Never modifies scheme data; works deterministically without any LLM.
import {
  SCHEMES,
  UNKNOWN,
  evaluate as legacyEvaluate,
  type FactKey,
  type FactValue,
  type Facts,
  type Scheme,
} from "./eligibility";
import { GOAL_QUESTION, QUESTIONS, parseAnswer, type Question, type UiLang } from "./interview";
import { normalize, parseYesNo } from "./parse";
import {
  confirmAllClaims,
  createLedger,
  evaluateRangeBound,
  formatClaimValue,
  ledgerToFacts,
  parseAgeClaim,
  parseMoneyClaim,
  pendingConflicts,
  recordClaim,
  resolveConflict,
  unresolvedConflicts,
  type ClaimConflict,
  type ClaimEntry,
  type ClaimLedger,
  type NumericBound,
  type NumericRange,
} from "./claim-ledger";

export type AdaptiveVerdict = "ELIGIBLE" | "INELIGIBLE" | "UNDECIDED" | "CONDITIONAL";

export interface StraddleInfo {
  schemeId: string;
  schemeName: string;
  ruleId: string;
  key: FactKey;
  range: NumericRange;
  threshold: number;
  boundKind: "min" | "minExclusive" | "max" | "maxExclusive";
  question: { en: string; hi: string };
}

export interface BranchVerdict {
  assumption: string;
  source_quote: string;
  turn: number;
  verdict: Exclude<AdaptiveVerdict, "CONDITIONAL">;
  reason: string;
}

export interface SchemeEvaluation {
  scheme: Scheme;
  verdict: AdaptiveVerdict;
  neededFacts: FactKey[];
  straddles: StraddleInfo[];
  officeVerificationNote?: string | undefined;
  decisiveReason?: string | undefined;
  branches?: [BranchVerdict, BranchVerdict] | undefined;
  conflict?: ClaimConflict | undefined;
}

export interface PlannerQuestion {
  kind: "fact" | "straddle" | "conflict";
  key?: FactKey | undefined;
  question: { en: string; hi: string };
  baseQuestion?: Question | undefined;
  straddle?: StraddleInfo | undefined;
  conflict?: ClaimConflict | undefined;
}

export interface PlannerState {
  schemeIds: string[];
  ledger: ClaimLedger;
  questionsAsked: FactKey[];
  questionsSkipped: FactKey[];
  straddlesSkipped: string[]; // `${schemeId}:${ruleId}`
  batchConfirmed: boolean;
}

export interface PlannerStep {
  question: PlannerQuestion | null;
  needs_batch_confirmation: boolean;
  early_confirmation: ClaimEntry | null;
  questions_asked: FactKey[];
  questions_skipped: FactKey[];
  schemes_open: string[];
  statuses: Record<string, SchemeEvaluation>;
}

/**
 * Easy-first tie-breaking tiers (lower = asked earlier; income is ALWAYS last).
 * Mirrors: age, gender, state/urban, occupation -> specific rules -> tax/loan -> income.
 */
export const FIELD_DIFFICULTY: Record<FactKey, number> = {
  subject: 0,
  // Tier 1: basic demographics (easiest)
  age: 10,
  ageOnAadhaar: 11,
  girlAge: 12,
  gender: 13,
  age_approx: 99,
  ageOnAadhaar_approx: 99,
  // Tier 2: location & basic status
  livesUrban: 20,
  indianCitizen: 21,
  socialCategory: 22,
  hasBankAccount: 23,
  // Tier 3: occupation / primary role
  ownsCultivableLand: 30,
  cultivatesCrops: 31,
  unorganisedWorker: 32,
  traditionalTrade: 33,
  streetVendor: 34,
  nonFarmEnterprise: 35,
  inClass8: 36,
  regularDegree: 37,
  govtEmployee: 38,
  // Tier 4: specific scheme conditions
  householdHasLpg: 40,
  poorHousehold: 41,
  pmjayListed: 42,
  ownsPuccaHouse: 43,
  govtHouse20y: 44,
  greenfield: 45,
  cropNotified: 46,
  cultivationProof: 47,
  institutionalLand: 48,
  constitutionalPost: 49,
  registeredProfessional: 50,
  govtStaffGroupD: 51,
  govtServiceFamily: 52,
  familyInPmv: 53,
  vendingCertificate: 54,
  class12Top20: 55,
  otherScholarship: 56,
  class7Marks: 57,
  schoolType: 58,
  girlHasSsy: 59,
  familySsyGirls: 60,
  priorTarunRepaid: 61,
  govtLoan5y: 62,
  coveredNpsEsicEpfo: 63,
  // Tier 5: financial / tax / loan
  loanAmount: 70,
  incomeTaxPayer: 75,
  incomeTaxLastAY: 76,
  pensionMonthly: 78,
  pensionMonthly_approx: 99,
  // Tier 6: income ALWAYS last on ties
  monthlyIncome: 90,
  familyIncomeAnnual: 95,
  monthlyIncome_approx: 99,
  familyIncomeAnnual_approx: 99,
};

/**
 * Numeric rule threshold metadata extracted by reading SCHEMES in eligibility.ts (adapter only).
 * Used for interval/range checks and near-threshold early confirmation checks.
 */
interface NumericRuleSpec {
  schemeId: string;
  ruleId: string;
  key: FactKey;
  bound: (facts: Facts) => NumericBound | "needs_dep" | "pass_override";
  unitEn: string;
  unitHi: string;
  nearMargin: number; // exact value within this distance triggers early single-field confirmation
}

const NUMERIC_RULE_SPECS: NumericRuleSpec[] = [
  {
    schemeId: "pm-kisan",
    ruleId: "pension",
    key: "pensionMonthly",
    bound: (f) => (f.govtStaffGroupD === true ? "pass_override" : { maxExclusive: 10_000 }),
    unitEn: "per month",
    unitHi: "प्रति माह",
    nearMargin: 1_000,
  },
  {
    schemeId: "pmjay",
    ruleId: "age70",
    key: "ageOnAadhaar",
    bound: () => ({ min: 70, maxExclusive: 200 }),
    unitEn: "years",
    unitHi: "साल",
    nearMargin: 2,
  },
  {
    schemeId: "pmsby",
    ruleId: "age",
    key: "age",
    bound: () => ({ min: 18, maxExclusive: 71 }),
    unitEn: "years",
    unitHi: "साल",
    nearMargin: 2,
  },
  {
    schemeId: "pmjjby",
    ruleId: "age",
    key: "age",
    bound: () => ({ min: 18, maxExclusive: 51 }),
    unitEn: "years",
    unitHi: "साल",
    nearMargin: 2,
  },
  {
    schemeId: "apy",
    ruleId: "age",
    key: "age",
    bound: () => ({ min: 18, maxExclusive: 40 }),
    unitEn: "years",
    unitHi: "साल",
    nearMargin: 2,
  },
  {
    schemeId: "pmsym",
    ruleId: "age",
    key: "age",
    bound: () => ({ min: 18, maxExclusive: 41 }),
    unitEn: "years",
    unitHi: "साल",
    nearMargin: 2,
  },
  {
    schemeId: "pmsym",
    ruleId: "income",
    key: "monthlyIncome",
    bound: () => ({ max: 15_000 }),
    unitEn: "per month",
    unitHi: "प्रति माह",
    nearMargin: 1_500,
  },
  {
    schemeId: "pmuy",
    ruleId: "age",
    key: "age",
    bound: () => ({ min: 18, maxExclusive: 200 }),
    unitEn: "years",
    unitHi: "साल",
    nearMargin: 2,
  },
  {
    schemeId: "mudra",
    ruleId: "amount",
    key: "loanAmount",
    bound: (f) => (f.priorTarunRepaid === true ? { max: 2_000_000 } : { max: 1_000_000 }),
    unitEn: "",
    unitHi: "",
    nearMargin: 100_000,
  },
  {
    schemeId: "pmv",
    ruleId: "age",
    key: "age",
    bound: () => ({ min: 18, maxExclusive: 200 }),
    unitEn: "years",
    unitHi: "साल",
    nearMargin: 2,
  },
  {
    schemeId: "standup",
    ruleId: "amount",
    key: "loanAmount",
    bound: () => ({ minExclusive: 1_000_000, max: 10_000_000 }),
    unitEn: "",
    unitHi: "",
    nearMargin: 100_000,
  },
  {
    schemeId: "pmusp",
    ruleId: "income",
    key: "familyIncomeAnnual",
    bound: () => ({ max: 450_000 }),
    unitEn: "per year",
    unitHi: "सालाना",
    nearMargin: 45_000,
  },
  {
    schemeId: "nmmss",
    ruleId: "income",
    key: "familyIncomeAnnual",
    bound: () => ({ max: 350_000 }),
    unitEn: "per year",
    unitHi: "सालाना",
    nearMargin: 35_000,
  },
  {
    schemeId: "nmmss",
    ruleId: "marks",
    key: "class7Marks",
    bound: (f) => {
      if (f.socialCategory === "sc" || f.socialCategory === "st") return { min: 50 };
      if (f.socialCategory !== undefined && f.socialCategory !== UNKNOWN) return { min: 55 };
      return "needs_dep";
    },
    unitEn: "%",
    unitHi: "%",
    nearMargin: 2,
  },
  {
    schemeId: "pmayu",
    ruleId: "income",
    key: "familyIncomeAnnual",
    bound: () => ({ max: 900_000 }),
    unitEn: "per year",
    unitHi: "सालाना",
    nearMargin: 90_000,
  },
  {
    schemeId: "ssy",
    ruleId: "age",
    key: "girlAge",
    bound: () => ({ min: 0, maxExclusive: 10 }),
    unitEn: "years",
    unitHi: "साल",
    nearMargin: 1,
  },
];

function findNumericSpec(schemeId: string, ruleId: string): NumericRuleSpec | undefined {
  return NUMERIC_RULE_SPECS.find((s) => s.schemeId === schemeId && s.ruleId === ruleId);
}

function formatThreshold(key: FactKey, threshold: number, unit: string): string {
  const isMoney = ["familyIncomeAnnual", "monthlyIncome", "pensionMonthly", "loanAmount"].includes(
    key,
  );
  const base = isMoney ? `₹${threshold.toLocaleString("en-IN")}` : String(threshold);
  return unit ? `${base} ${unit}` : base;
}

function buildStraddleQuestion(
  scheme: Scheme,
  spec: NumericRuleSpec,
  range: NumericRange,
  threshold: number,
  boundKind: "min" | "minExclusive" | "max" | "maxExclusive",
): { en: string; hi: string } {
  const rangeStr = formatClaimValue({ range }, spec.key);
  const thrEn = formatThreshold(spec.key, threshold, spec.unitEn);
  const thrHi = formatThreshold(spec.key, threshold, spec.unitHi);

  const cmpEn =
    boundKind === "max"
      ? `${thrEn} or less`
      : boundKind === "maxExclusive"
        ? `less than ${thrEn}`
        : boundKind === "min"
          ? `${thrEn} or more`
          : `more than ${thrEn}`;

  const cmpHi =
    boundKind === "max"
      ? `${thrHi} या उससे कम`
      : boundKind === "maxExclusive"
        ? `${thrHi} से कम`
        : boundKind === "min"
          ? `${thrHi} या उससे ज़्यादा`
          : `${thrHi} से ज़्यादा`;

  return {
    en: `Your stated range (${rangeStr}) crosses the ${thrEn} threshold for ${scheme.name}. Is the exact figure ${cmpEn}?`,
    hi: `आपकी बताई सीमा (${rangeStr}) ${scheme.name} की ${thrHi} सीमा के दोनों तरफ़ है। क्या सही आंकड़ा ${cmpHi} है?`,
  };
}

function schemeUsesKeys(scheme: Scheme): Set<FactKey> {
  const keys = new Set<FactKey>();
  for (const rule of scheme.rules) {
    const list = "anyOf" in rule ? rule.anyOf : [rule];
    for (const c of list) {
      for (const k of c.facts) keys.add(k);
    }
  }
  return keys;
}

/**
 * Evaluates a single scheme without conflict branching (core range-aware adapter).
 */
function evaluateSchemeCore(
  scheme: Scheme,
  ledger: ClaimLedger,
): Omit<SchemeEvaluation, "branches" | "conflict"> {
  const facts = ledgerToFacts(ledger);
  const straddles: StraddleInfo[] = [];
  const neededFacts: FactKey[] = [];
  const ruleOutcomes: ("pass" | "fail" | "unknown" | "straddle")[] = [];
  let decisiveReason: string | undefined;

  const evalSingleCriterion = (c: {
    id: string;
    facts: FactKey[];
    requirement: string;
    check: (f: Facts) => { outcome: "pass" | "fail" | "unknown"; answer: string; note?: string };
  }): "pass" | "fail" | "unknown" | "straddle" => {
    const spec = findNumericSpec(scheme.id, c.id);
    const claim = spec ? ledger.claims[spec.key] : undefined;

    // Range-aware interval evaluation
    if (spec && claim?.range) {
      const boundOrSpecial = spec.bound(facts);
      if (boundOrSpecial === "pass_override") return "pass";

      // Special handling for MUDRA > ₹10L–₹20L with unknown priorTarunRepaid
      if (scheme.id === "mudra" && c.id === "amount") {
        const [lo, hi] = claim.range;
        if (hi <= 1_000_000) return "pass";
        if (lo > 2_000_000) {
          decisiveReason = `${c.requirement}: ${formatClaimValue(claim, spec.key)}`;
          return "fail";
        }
        if (lo > 1_000_000 && hi <= 2_000_000) {
          if (facts.priorTarunRepaid === true) return "pass";
          if (facts.priorTarunRepaid === false) {
            decisiveReason = `${c.requirement}: no repaid Tarun loan`;
            return "fail";
          }
          if (!neededFacts.includes("priorTarunRepaid")) neededFacts.push("priorTarunRepaid");
          return "unknown";
        }
        const thr = lo <= 1_000_000 ? 1_000_000 : 2_000_000;
        straddles.push({
          schemeId: scheme.id,
          schemeName: scheme.name,
          ruleId: c.id,
          key: spec.key,
          range: claim.range,
          threshold: thr,
          boundKind: "max",
          question: buildStraddleQuestion(scheme, spec, claim.range, thr, "max"),
        });
        return "straddle";
      }

      // Special handling for NMMSS marks when socialCategory is unknown
      if (boundOrSpecial === "needs_dep" && scheme.id === "nmmss" && c.id === "marks") {
        const [lo, hi] = claim.range;
        if (lo >= 55) return "pass";
        if (hi < 50) {
          decisiveReason = `${c.requirement}: ${formatClaimValue(claim, spec.key)}`;
          return "fail";
        }
        if (!neededFacts.includes("socialCategory")) neededFacts.push("socialCategory");
        return "unknown";
      }

      if (boundOrSpecial !== "needs_dep") {
        const r = evaluateRangeBound(claim.range, boundOrSpecial);
        if (r.outcome === "pass") return "pass";
        if (r.outcome === "fail") {
          // For pm-kisan pension >= 10000, wait for govtStaffGroupD before failing
          if (
            scheme.id === "pm-kisan" &&
            c.id === "pension" &&
            facts.govtStaffGroupD === undefined
          ) {
            if (!neededFacts.includes("govtStaffGroupD")) neededFacts.push("govtStaffGroupD");
            return "unknown";
          }
          decisiveReason = `${c.requirement}: ${formatClaimValue(claim, spec.key)}`;
          return "fail";
        }
        // Range straddles the threshold -> NEVER hard fail!
        if (r.thresholdHit !== undefined && r.boundKind !== undefined) {
          straddles.push({
            schemeId: scheme.id,
            schemeName: scheme.name,
            ruleId: c.id,
            key: spec.key,
            range: claim.range,
            threshold: r.thresholdHit,
            boundKind: r.boundKind,
            question: buildStraddleQuestion(scheme, spec, claim.range, r.thresholdHit, r.boundKind),
          });
        }
        return "straddle";
      }
    }

    // Exact / scalar evaluation delegated directly to existing criterion check in eligibility.ts
    const res = c.check(facts);
    if (res.outcome === "fail" && !decisiveReason) {
      decisiveReason = `${c.requirement}: ${res.answer}`;
    }
    if (res.outcome === "unknown") {
      for (const k of c.facts) {
        if (ledger.claims[k] === undefined && !neededFacts.includes(k)) {
          neededFacts.push(k);
          break;
        }
      }
    }
    return res.outcome;
  };

  for (const rule of scheme.rules) {
    if ("anyOf" in rule) {
      const partOutcomes = rule.anyOf.map((c) => evalSingleCriterion(c));
      if (partOutcomes.includes("pass")) {
        ruleOutcomes.push("pass");
      } else if (partOutcomes.every((o) => o === "fail")) {
        ruleOutcomes.push("fail");
      } else if (partOutcomes.includes("straddle")) {
        ruleOutcomes.push("straddle");
      } else {
        ruleOutcomes.push("unknown");
      }
    } else {
      ruleOutcomes.push(evalSingleCriterion(rule));
    }
  }

  // Filter conditional dependencies (mirrors eligibility.ts neededFacts)
  const filteredNeeded = neededFacts.filter((k) => {
    const loanClaim = ledger.claims.loanAmount;
    const loanHi = loanClaim?.range
      ? loanClaim.range[1]
      : typeof facts.loanAmount === "number"
        ? facts.loanAmount
        : 0;
    const penClaim = ledger.claims.pensionMonthly;
    const penHi = penClaim?.range
      ? penClaim.range[1]
      : typeof facts.pensionMonthly === "number"
        ? facts.pensionMonthly
        : 0;
    if (k === "priorTarunRepaid" && loanHi <= 1_000_000) return false;
    if (k === "govtStaffGroupD" && facts.govtEmployee !== true && penHi < 10_000) return false;
    if (k === "socialCategory" && scheme.id === "nmmss") {
      const mClaim = ledger.claims.class7Marks;
      const mLo = mClaim?.range
        ? mClaim.range[0]
        : typeof facts.class7Marks === "number"
          ? facts.class7Marks
          : -1;
      const mHi = mClaim?.range
        ? mClaim.range[1]
        : typeof facts.class7Marks === "number"
          ? facts.class7Marks
          : -1;
      if (mLo < 0 || mLo >= 55 || mHi < 50) return false;
    }
    return true;
  });

  // Never mark INELIGIBLE if only straddles exist; hard INELIGIBLE requires a genuine "fail"
  if (ruleOutcomes.includes("fail")) {
    return {
      scheme,
      verdict: "INELIGIBLE",
      neededFacts: [],
      straddles: [],
      ...(decisiveReason ? { decisiveReason } : {}),
    };
  }

  // Never mark ELIGIBLE if scheme is unverified
  if (ruleOutcomes.every((o) => o === "pass") && scheme.verified) {
    return {
      scheme,
      verdict: "ELIGIBLE",
      neededFacts: [],
      straddles: [],
      ...(scheme.alwaysVerify ? { officeVerificationNote: scheme.alwaysVerify.requirement } : {}),
    };
  }

  return {
    scheme,
    verdict: "UNDECIDED",
    neededFacts: filteredNeeded,
    straddles,
    ...(scheme.alwaysVerify ? { officeVerificationNote: scheme.alwaysVerify.requirement } : {}),
  };
}

/**
 * Evaluates a scheme against the Claim Ledger, returning:
 * - ELIGIBLE / INELIGIBLE / UNDECIDED
 * - CONDITIONAL with two explicit branches if an unresolved conflict affects this scheme.
 */
export function evaluateSchemeAdaptive(scheme: Scheme, ledger: ClaimLedger): SchemeEvaluation {
  const keysUsed = schemeUsesKeys(scheme);
  const relevantUnresolved = unresolvedConflicts(ledger).find((c) =>
    c.keys.some((k) => keysUsed.has(k)),
  );

  if (relevantUnresolved) {
    const ledgerA = resolveConflict(ledger, relevantUnresolved.id, "A");
    const ledgerB = resolveConflict(ledger, relevantUnresolved.id, "B");
    const evalA = evaluateSchemeCore(scheme, ledgerA);
    const evalB = evaluateSchemeCore(scheme, ledgerB);

    const branchA: BranchVerdict = {
      assumption: `${relevantUnresolved.claimA.key} = ${relevantUnresolved.claimA.label}`,
      source_quote: relevantUnresolved.claimA.source_quote,
      turn: relevantUnresolved.claimA.turn,
      verdict: evalA.verdict as Exclude<AdaptiveVerdict, "CONDITIONAL">,
      reason:
        evalA.decisiveReason ??
        (evalA.verdict === "ELIGIBLE"
          ? "All checked conditions pass under this statement."
          : "Additional details needed under this statement."),
    };
    const branchB: BranchVerdict = {
      assumption: `${relevantUnresolved.claimB.key} = ${relevantUnresolved.claimB.label}`,
      source_quote: relevantUnresolved.claimB.source_quote,
      turn: relevantUnresolved.claimB.turn,
      verdict: evalB.verdict as Exclude<AdaptiveVerdict, "CONDITIONAL">,
      reason:
        evalB.decisiveReason ??
        (evalB.verdict === "ELIGIBLE"
          ? "All checked conditions pass under this statement."
          : "Additional details needed under this statement."),
    };

    return {
      scheme,
      verdict: "CONDITIONAL",
      neededFacts: [],
      straddles: [],
      conflict: relevantUnresolved,
      branches: [branchA, branchB],
      ...(scheme.alwaysVerify ? { officeVerificationNote: scheme.alwaysVerify.requirement } : {}),
    };
  }

  return evaluateSchemeCore(scheme, ledger);
}

/** Ensures exact-value parity check helper with legacy eligibility.ts when needed. */
export function legacyStatusForExactFacts(scheme: Scheme, ledger: ClaimLedger) {
  return legacyEvaluate(scheme, ledgerToFacts(ledger));
}

export function createPlannerState(schemeIds?: string[]): PlannerState {
  return {
    schemeIds: schemeIds && schemeIds.length ? [...schemeIds] : SCHEMES.map((s) => s.id),
    ledger: createLedger(),
    questionsAsked: [],
    questionsSkipped: [],
    straddlesSkipped: [],
    batchConfirmed: false,
  };
}

/**
 * Checks whether an unconfirmed claim requires early single-field confirmation:
 * ONLY when confidence < 0.75 OR its exact numeric value sits near a threshold of an active scheme.
 */
export function findEarlyConfirmation(state: PlannerState): ClaimEntry | null {
  const activeSet = new Set(state.schemeIds);
  for (const claim of Object.values(state.ledger.claims)) {
    if (!claim || claim.confirmed || claim.value === UNKNOWN || claim.key === "subject") continue;
    // 1) Low confidence -> confirm early
    if (claim.confidence < 0.75) return claim;
    // 2) Exact numeric value close to an active scheme threshold -> confirm early
    if (typeof claim.value === "number") {
      const val = claim.value;
      const facts = ledgerToFacts(state.ledger);
      for (const spec of NUMERIC_RULE_SPECS) {
        if (!activeSet.has(spec.schemeId) || spec.key !== claim.key) continue;
        const b = spec.bound(facts);
        if (b === "needs_dep" || b === "pass_override") continue;
        const thresholds = [b.min, b.minExclusive, b.max, b.maxExclusive].filter(
          (t): t is number => t !== undefined && t < 200_000_000 && t !== 200 && t !== 0,
        );
        if (thresholds.some((t) => Math.abs(val - t) <= spec.nearMargin)) {
          return claim;
        }
      }
    }
  }
  return null;
}

/** Representative candidate values to simulate whether asking `key` resolves/splits a scheme. */
function representativeValuesFor(key: FactKey): FactValue[] {
  const q = QUESTIONS[key];
  if (!q) return [true, false];
  switch (q.kind) {
    case "yesno":
      return [true, false];
    case "choice": {
      const vals = q.options.map((o) => o.value).filter((v) => v !== UNKNOWN);
      return vals.length ? vals : [true, false];
    }
    case "age":
      if (key === "girlAge") return [5, 12];
      if (key === "ageOnAadhaar") return [45, 72];
      return [15, 25, 40, 55, 75];
    case "annual":
      return [200_000, 400_000, 700_000, 1_200_000];
    case "monthly":
      if (key === "pensionMonthly") return [0, 12_000];
      return [10_000, 25_000];
    case "money":
      return [200_000, 1_500_000, 15_000_000];
    case "pct":
      return [45, 52, 65];
    case "count":
      return [0, 2];
    default:
      return [true, false];
  }
}

/**
 * Core Adaptive Question Planner step.
 * - Evaluates every active scheme as ELIGIBLE / INELIGIBLE / UNDECIDED / CONDITIONAL.
 * - Picks the next unknown field that resolves or splits the most UNDECIDED schemes.
 * - Breaks ties by easy fields first (age, gender, urban/status, occupation) and income last.
 * - Stops when all schemes are decided or no unknown field can change a verdict.
 */
export function next_question(state: PlannerState): PlannerStep {
  const activeSchemes = state.schemeIds
    .map((id) => SCHEMES.find((s) => s.id === id))
    .filter((s): s is Scheme => s !== undefined);

  const statuses: Record<string, SchemeEvaluation> = {};
  const openSchemes: SchemeEvaluation[] = [];

  for (const scheme of activeSchemes) {
    const ev = evaluateSchemeAdaptive(scheme, state.ledger);
    statuses[scheme.id] = ev;
    if (ev.verdict === "UNDECIDED") openSchemes.push(ev);
  }

  const schemes_open = openSchemes.map((e) => e.scheme.id);
  const early_confirmation = findEarlyConfirmation(state);

  const baseReturn = {
    early_confirmation,
    questions_asked: [...state.questionsAsked],
    questions_skipped: [...state.questionsSkipped],
    schemes_open,
    statuses,
  };

  // 1) Resolve pending conflicts first — never overwrite silently, quote both statements neutrally.
  const activeConflict = pendingConflicts(state.ledger)[0];
  if (activeConflict) {
    return {
      ...baseReturn,
      question: {
        kind: "conflict",
        key: activeConflict.keys[0],
        question: activeConflict.question,
        conflict: activeConflict,
      },
      needs_batch_confirmation: false,
    };
  }

  // 2) If a range straddles a rule threshold on an UNDECIDED scheme, ask one targeted question.
  for (const open of openSchemes) {
    for (const st of open.straddles) {
      const sig = `${st.schemeId}:${st.ruleId}`;
      if (!state.straddlesSkipped.includes(sig)) {
        return {
          ...baseReturn,
          question: {
            kind: "straddle",
            key: st.key,
            question: st.question,
            straddle: st,
          },
          needs_batch_confirmation: false,
        };
      }
    }
  }

  // 3) If no open schemes remain, stop (trigger batch confirm once if unconfirmed claims exist).
  if (openSchemes.length === 0) {
    const hasUnconfirmed = Object.values(state.ledger.claims).some(
      (c) => c && !c.confirmed && c.key !== "subject" && c.value !== UNKNOWN,
    );
    return {
      ...baseReturn,
      question: null,
      needs_batch_confirmation: !state.batchConfirmed && hasUnconfirmed,
    };
  }

  // 4) Gather candidate unknown fields needed by at least one UNDECIDED scheme.
  const candidateKeys = new Set<FactKey>();
  for (const open of openSchemes) {
    for (const k of open.neededFacts) {
      if (state.ledger.claims[k] === undefined && !state.questionsSkipped.includes(k)) {
        candidateKeys.add(k);
      }
    }
  }

  // 5) Score each candidate key by how many UNDECIDED schemes it can resolve or split.
  interface CandidateScore {
    key: FactKey;
    resolves: number;
    splits: number;
    difficulty: number;
  }

  const scored: CandidateScore[] = [];
  for (const key of candidateKeys) {
    const simValues = representativeValuesFor(key);
    let resolves = 0;
    let splits = 0;

    for (const open of openSchemes) {
      if (!open.neededFacts.includes(key)) continue;
      let canResolve = false;
      const seenVerdicts = new Set<AdaptiveVerdict>();

      for (const val of simValues) {
        const simLedger: ClaimLedger = {
          ...state.ledger,
          claims: {
            ...state.ledger.claims,
            [key]: {
              key,
              value: val,
              confidence: 1,
              source_quote: "",
              turn: state.ledger.turn + 1,
              confirmed: true,
            },
          },
        };
        const simEval = evaluateSchemeCore(open.scheme, simLedger);
        seenVerdicts.add(simEval.verdict);
        if (simEval.verdict === "ELIGIBLE" || simEval.verdict === "INELIGIBLE") {
          canResolve = true;
        }
      }

      if (canResolve) resolves += 1;
      if (seenVerdicts.size > 1 || canResolve) splits += 1;
    }

    // Only keep fields that can actually resolve or split at least one UNDECIDED scheme
    if (resolves > 0 || splits > 0) {
      scored.push({
        key,
        resolves,
        splits,
        difficulty: FIELD_DIFFICULTY[key] ?? 50,
      });
    }
  }

  // Stop if no unknown field can change any verdict
  if (scored.length === 0) {
    const hasUnconfirmed = Object.values(state.ledger.claims).some(
      (c) => c && !c.confirmed && c.key !== "subject" && c.value !== UNKNOWN,
    );
    return {
      ...baseReturn,
      question: null,
      needs_batch_confirmation: !state.batchConfirmed && hasUnconfirmed,
    };
  }

  // Sort: highest resolves -> highest splits -> lowest difficulty (easy first, income last)
  scored.sort((a, b) => {
    if (b.resolves !== a.resolves) return b.resolves - a.resolves;
    if (b.splits !== a.splits) return b.splits - a.splits;
    return a.difficulty - b.difficulty;
  });

  const chosenKey = scored[0]!.key;
  const qDef = QUESTIONS[chosenKey];
  const subj = state.ledger.claims.subject?.value;
  const idx = subj === "other" ? 1 : 0;

  return {
    ...baseReturn,
    question: {
      kind: "fact",
      key: chosenKey,
      baseQuestion: qDef,
      question: {
        en: qDef.en[idx] || qDef.en[0],
        hi: qDef.hi[idx] || qDef.hi[0],
      },
    },
    needs_batch_confirmation: false,
  };
}

export const nextQuestionAdaptive = next_question;

export interface ExtractedClaim {
  key: FactKey;
  value?: FactValue | undefined;
  range?: NumericRange | undefined;
  confidence: number;
  source_quote: string;
}

/**
 * Deterministic multi-field extractor: extracts multiple facts from one English or Hindi
 * utterance (e.g. "I am a 32 year old woman farmer with a bank account, income 2-3 lakh").
 */
export function extractMultipleFacts(
  text: string,
  currentKey?: FactKey,
  lang: UiLang = "en",
  baseConfidence = 0.92,
): ExtractedClaim[] {
  const raw = text.trim();
  if (!raw) return [];
  const t = normalize(raw);
  const found = new Map<FactKey, ExtractedClaim>();

  const put = (
    key: FactKey,
    data: { value?: FactValue | undefined; range?: NumericRange | undefined; confidence?: number },
  ) => {
    if (found.has(key)) return;
    found.set(key, {
      key,
      confidence: data.confidence ?? baseConfidence,
      source_quote: raw,
      ...(data.value !== undefined ? { value: data.value } : {}),
      ...(data.range !== undefined ? { range: data.range } : {}),
    });
  };

  // 1) Age (explicit phrases: "32 year old", "I am 35", "age 40", "उम्र 35 साल")
  const ageRangePhrase = t.match(
    /(?:age|umar|umra|उम्र|आयु)\D{0,10}(\d{1,3}\s*(?:-|–|to|se|से)\s*\d{1,3})/,
  );
  if (ageRangePhrase && ageRangePhrase[1]) {
    const parsed = parseAgeClaim(ageRangePhrase[1]);
    if (parsed?.range)
      put("age", { range: parsed.range, confidence: Math.min(baseConfidence, parsed.confidence) });
  } else {
    const agePhrase = t.match(
      /(?:i am|i'm|age is|age|aged|umar|umra|उम्र|आयु)\D{0,12}(\d{1,3})\b|\b(\d{1,3})\s*(?:year old|years old|yrs old|years|yrs|saal|साल|वर्ष)\b/,
    );
    if (agePhrase) {
      const numStr = agePhrase[1] ?? agePhrase[2];
      const v = numStr ? Number(numStr) : NaN;
      if (Number.isFinite(v) && v >= 0 && v <= 120) {
        const approx = /\b(about|around|approx|lagbhag|karib)\b|लगभग|करीब/.test(t);
        if (approx) {
          put("age", {
            range: [Math.max(0, v - 2), Math.min(120, v + 2)],
            confidence: Math.min(baseConfidence, 0.72),
          });
        } else {
          put("age", { value: v, confidence: baseConfidence });
        }
      }
    }
  }

  // 2) Gender
  if (/\b(woman|female|lady|girl|mother|wife|mahila)\b|महिला|औरत|स्त्री/.test(t)) {
    put("gender", { value: "female" });
  } else if (/\b(man|male|gentleman|father|husband|purush)\b|पुरुष|आदमी/.test(t)) {
    put("gender", { value: "male" });
  }

  // 3) Urban vs Rural
  if (/\b(urban|city|town|metro|municipality)\b|शहर|शहरी|कस्ब/.test(t)) {
    put("livesUrban", { value: true });
  } else if (/\b(rural|village|gaon|gramin)\b|गाँव|गांव|ग्रामीण/.test(t)) {
    put("livesUrban", { value: false });
  }

  // 4) Indian citizen
  if (
    /\bindian citizen\b|\bcitizen of india\b|भारतीय नागरिक|भारत का नागरिक|भारत की नागरिक/.test(t)
  ) {
    put("indianCitizen", { value: true });
  }

  // 5) Savings / Bank account
  if (
    /\b(no|don't have|do not have|without)\s+(?:a\s+)?(?:savings\s+)?bank\s+account\b|बैंक खाता नहीं|खाता नहीं/.test(
      t,
    )
  ) {
    put("hasBankAccount", { value: false });
  } else if (
    /\b(?:have|with|own|got)?\s*(?:a\s+)?(?:savings\s+)?bank\s+account\b|\bpost office account\b|बैंक खाता है|बचत खाता/.test(
      t,
    )
  ) {
    put("hasBankAccount", { value: true });
  }

  // 6) Cultivable land & acreage (handles "no land" vs "2 acres" contradiction cleanly!)
  if (
    /\b(no|don't own|do not own|without|zero)\s+(?:cultivable\s+|farm\s+|agricultural\s+)?land\b|\blandless\b|ज़मीन नहीं|जमीन नहीं|भूमिहीन/.test(
      t,
    )
  ) {
    put("ownsCultivableLand", { value: false });
  } else if (
    /\b\d+(?:\.\d+)?\s*(?:acres?|acre|hectares?|hectare|bigha|bighas|guntas?|cents?)\b|एकड़|बीघा|हेक्टेयर|\b(?:own|have|with)\s+(?:cultivable\s+|farm\s+)?land\b|खेती की ज़मीन है|ज़मीन है/.test(
      t,
    )
  ) {
    put("ownsCultivableLand", { value: true });
  }

  // 7) Farmer / grows crops
  if (
    /\b(farmer|grow crops|growing crops|cultivate|cultivating|farming|kisan)\b|किसान|खेती करता|खेती करती/.test(
      t,
    )
  ) {
    put("cultivatesCrops", { value: true });
  }

  // 8) Income tax payer
  if (
    /\b(no|not|never|don't|do not|didn't)\s+(?:an?\s+)?(?:pay|paid|paying)?\s*income[\s-]?tax\b|\bnon[\s-]?tax\s*payer\b|इनकम टैक्स नहीं|टैक्स नहीं/.test(
      t,
    )
  ) {
    put("incomeTaxPayer", { value: false });
  } else if (
    /\b(?:pay|paid|paying)\s+income[\s-]?tax\b|\bincome[\s-]?tax\s*payer\b|\btaxpayer\b|इनकम टैक्स भर/.test(
      t,
    )
  ) {
    put("incomeTaxPayer", { value: true });
  }

  // 9) LPG connection
  if (
    /\b(no|don't have|without)\s+(?:an?\s+)?(?:lpg|gas)\s*(?:connection)?\b|गैस कनेक्शन नहीं|एलपीजी नहीं/.test(
      t,
    )
  ) {
    put("householdHasLpg", { value: false });
  } else if (
    /\b(?:already\s+have|have)\s+(?:an?\s+)?(?:lpg|gas)\s+connection\b|गैस कनेक्शन है/.test(t)
  ) {
    put("householdHasLpg", { value: true });
  }

  // 10) Pucca house
  if (
    /\b(no|don't own|do not own|without)\s+(?:a\s+)?pucca\s+house\b|\bkaccha\s+house\b|पक्का घर नहीं|कच्चा घर/.test(
      t,
    )
  ) {
    put("ownsPuccaHouse", { value: false });
  } else if (/\b(?:own|have)\s+(?:a\s+)?pucca\s+house\b|पक्का घर है/.test(t)) {
    put("ownsPuccaHouse", { value: true });
  }

  // 11) Government employee
  if (
    /\b(no|not a?)\s+(?:govt|government)\s+(?:employee|officer|job|servant)\b|सरकारी नौकरी नहीं/.test(
      t,
    )
  ) {
    put("govtEmployee", { value: false });
  } else if (
    /\b(?:govt|government)\s+(?:employee|officer|job|servant)\b|सरकारी कर्मचारी|सरकारी नौकरी/.test(t)
  ) {
    put("govtEmployee", { value: true });
  }

  // 12) Unorganised worker / Street vendor / Artisan
  if (
    /\b(unorganised|unorganized|daily wage|construction worker|domestic worker|farm labour)\b|असंगठित|दिहाड़ी/.test(
      t,
    )
  ) {
    put("unorganisedWorker", { value: true });
  }
  if (/\b(street vendor|hawker|footpath vendor|thela)\b|रेहड़ी|ठेला/.test(t)) {
    put("streetVendor", { value: true });
  }
  if (
    /\b(carpenter|blacksmith|potter|goldsmith|cobbler|mason|tailor|barber|artisan)\b|कारीगर|बढ़ई|दर्ज़ी|कुम्हार|लोहार/.test(
      t,
    )
  ) {
    put("traditionalTrade", { value: true });
  }

  // 13) Class 8 student
  if (
    /\b(in class 8|class viii|8th class|class 8 student|8th standard|std 8)\b|कक्षा 8|आठवीं/.test(t)
  ) {
    put("inClass8", { value: true });
  }

  // 14) Social category
  const catMatch = t.match(/\b(sc|st|obc)\b|\bgeneral category\b|अनुसूचित जाति|अनुसूचित जनजाति/);
  if (catMatch) {
    const val = catMatch[1]
      ? catMatch[1]
      : /जनजाति/.test(catMatch[0])
        ? "st"
        : /जाति/.test(catMatch[0])
          ? "sc"
          : "general";
    put("socialCategory", { value: val });
  }

  // 15) Income / Loan amounts & ranges mentioned in utterance
  const mentionsIncome = /\b(income|earn|earning|salary|kamai|aay)\b|आय|कमाई|वेतन/.test(t);
  const mentionsMonthly = /\b(month|monthly|per month|mahina|mahine)\b|महीन|मासिक/.test(t);
  const mentionsAnnual = /\b(year|yearly|annual|per annum|saal|saalana)\b|साल|वार्षिक|सालाना/.test(
    t,
  );
  const mentionsLoan = /\b(loan|mudra|credit)\b|लोन|ऋण/.test(t);

  if (mentionsLoan && currentKey !== "familyIncomeAnnual" && currentKey !== "monthlyIncome") {
    const loanSnippet = t.match(/(?:loan|लोन|ऋण)[^,;.]*/)?.[0] ?? raw;
    const parsedLoan = parseMoneyClaim(loanSnippet, "lump");
    if (parsedLoan) {
      put("loanAmount", {
        value: parsedLoan.value,
        range: parsedLoan.range,
        confidence: Math.min(baseConfidence, parsedLoan.confidence),
      });
    }
  }

  if (mentionsIncome) {
    const incSnippet =
      t.match(/(?:income|earn|earning|salary|kamai|aay|आय|कमाई)[^,;.]*/)?.[0] ?? raw;
    if (mentionsMonthly && !mentionsAnnual && currentKey !== "familyIncomeAnnual") {
      const m = parseMoneyClaim(incSnippet, "monthly");
      if (m) {
        put("monthlyIncome", {
          value: m.value,
          range: m.range,
          confidence: Math.min(baseConfidence, m.confidence),
        });
      }
    } else {
      const a = parseMoneyClaim(incSnippet, "annual");
      if (a) {
        put("familyIncomeAnnual", {
          value: a.value,
          range: a.range,
          confidence: Math.min(baseConfidence, a.confidence),
        });
      }
    }
  }

  // 16) Direct answer for currentKey if not already extracted
  if (currentKey && !found.has(currentKey)) {
    const q = QUESTIONS[currentKey];
    if (q) {
      if (q.kind === "annual" || q.kind === "monthly" || q.kind === "money") {
        const yn = parseYesNo(raw);
        if (yn === "unknown") {
          put(currentKey, { value: UNKNOWN, confidence: 1 });
        } else if (yn === false) {
          put(currentKey, { value: 0, confidence: baseConfidence });
        } else {
          const target = q.kind === "annual" ? "annual" : q.kind === "monthly" ? "monthly" : "lump";
          const m = parseMoneyClaim(raw, target);
          if (m) {
            put(currentKey, {
              value: m.value,
              range: m.range,
              confidence: Math.min(baseConfidence, m.confidence),
            });
          }
        }
      } else if (q.kind === "age") {
        const yn = parseYesNo(raw);
        if (yn === "unknown") {
          put(currentKey, { value: UNKNOWN, confidence: 1 });
        } else {
          const a = parseAgeClaim(raw);
          if (a) {
            put(currentKey, {
              value: a.value,
              range: a.range,
              confidence: Math.min(baseConfidence, a.confidence),
            });
          }
        }
      } else {
        const parsed = parseAnswer(q, raw, lang);
        if (parsed.ok) {
          const v = parsed.facts[currentKey];
          if (v !== undefined) put(currentKey, { value: v, confidence: baseConfidence });
        }
      }
    }
  }

  return Array.from(found.values());
}

/**
 * Processes one user turn against PlannerState:
 * - Extracts 1..N facts from the utterance (or handles targeted straddle yes/no).
 * - Records each fact into the Claim Ledger (never silently overwriting conflicts).
 * - Tracks questions_asked and returns the next PlannerStep.
 */
export function submitUtterance(
  state: PlannerState,
  text: string,
  opts: { lang?: UiLang; confidence?: number; currentStep?: PlannerStep } = {},
): {
  state: PlannerState;
  step: PlannerStep;
  extracted: ExtractedClaim[];
  conflicts: ClaimConflict[];
} {
  const lang = opts.lang ?? "en";
  const conf = opts.confidence ?? 0.92;
  const currentStep = opts.currentStep ?? next_question(state);
  const q = currentStep.question;

  let nextLedger = state.ledger;
  const nextTurn = state.ledger.turn + 1;
  const questionsAsked = [...state.questionsAsked];
  const straddlesSkipped = [...state.straddlesSkipped];
  const newConflicts: ClaimConflict[] = [];

  if (q?.key && !questionsAsked.includes(q.key)) {
    questionsAsked.push(q.key);
  }

  // Handle targeted straddle yes/no answer cleanly by narrowing the range to the chosen side
  if (q?.kind === "straddle" && q.straddle) {
    const st = q.straddle;
    const yn = parseYesNo(text);
    if (yn === "unknown") {
      const sig = `${st.schemeId}:${st.ruleId}`;
      if (!straddlesSkipped.includes(sig)) straddlesSkipped.push(sig);
      const nextState: PlannerState = { ...state, questionsAsked, straddlesSkipped };
      return { state: nextState, step: next_question(nextState), extracted: [], conflicts: [] };
    }
    if (yn === true || yn === false) {
      const [lo, hi] = st.range;
      let narrowed: NumericRange;
      if (st.boundKind === "max") {
        narrowed = yn ? [lo, Math.min(hi, st.threshold)] : [Math.max(lo, st.threshold + 1), hi];
      } else if (st.boundKind === "maxExclusive") {
        narrowed = yn ? [lo, Math.min(hi, st.threshold - 1)] : [Math.max(lo, st.threshold), hi];
      } else if (st.boundKind === "min") {
        narrowed = yn ? [Math.max(lo, st.threshold), hi] : [lo, Math.min(hi, st.threshold - 1)];
      } else {
        narrowed = yn ? [Math.max(lo, st.threshold + 1), hi] : [lo, Math.min(hi, st.threshold)];
      }
      const rec = recordClaim(nextLedger, {
        key: st.key,
        range: narrowed,
        confidence: 0.95,
        source_quote: text.trim(),
        turn: nextTurn,
        confirmed: true,
        forceOverwrite: true,
      });
      nextLedger = rec.ledger;
      const nextState: PlannerState = {
        ...state,
        ledger: nextLedger,
        questionsAsked,
        straddlesSkipped,
      };
      return {
        state: nextState,
        step: next_question(nextState),
        extracted: [{ key: st.key, range: narrowed, confidence: 0.95, source_quote: text.trim() }],
        conflicts: [],
      };
    }
  }

  const extracted = extractMultipleFacts(text, q?.key, lang, conf);
  for (const item of extracted) {
    const rec = recordClaim(nextLedger, {
      key: item.key,
      value: item.value,
      range: item.range,
      confidence: item.confidence,
      source_quote: item.source_quote,
      turn: nextTurn,
    });
    nextLedger = rec.ledger;
    if (rec.conflict) newConflicts.push(rec.conflict);
  }

  const nextState: PlannerState = {
    ...state,
    ledger: nextLedger,
    questionsAsked,
    straddlesSkipped,
    batchConfirmed: false,
  };
  return { state: nextState, step: next_question(nextState), extracted, conflicts: newConflicts };
}

export function skipCurrentQuestion(state: PlannerState): {
  state: PlannerState;
  step: PlannerStep;
} {
  const step = next_question(state);
  const q = step.question;
  if (!q) return { state, step };

  if (q.kind === "conflict" && q.conflict) {
    const nextLedger = resolveConflict(state.ledger, q.conflict.id, "unresolved");
    const nextState: PlannerState = { ...state, ledger: nextLedger };
    return { state: nextState, step: next_question(nextState) };
  }

  if (q.kind === "straddle" && q.straddle) {
    const sig = `${q.straddle.schemeId}:${q.straddle.ruleId}`;
    const nextState: PlannerState = {
      ...state,
      straddlesSkipped: state.straddlesSkipped.includes(sig)
        ? state.straddlesSkipped
        : [...state.straddlesSkipped, sig],
    };
    return { state: nextState, step: next_question(nextState) };
  }

  if (q.key) {
    const questionsSkipped = state.questionsSkipped.includes(q.key)
      ? state.questionsSkipped
      : [...state.questionsSkipped, q.key];
    const rec = recordClaim(state.ledger, {
      key: q.key,
      value: UNKNOWN,
      confidence: 1,
      source_quote: "Skipped",
      forceOverwrite: true,
      confirmed: true,
    });
    const nextState: PlannerState = { ...state, ledger: rec.ledger, questionsSkipped };
    return { state: nextState, step: next_question(nextState) };
  }

  return { state, step };
}

export function confirmEarlyClaim(
  state: PlannerState,
  key: FactKey,
  accepted: boolean,
): PlannerState {
  const claim = state.ledger.claims[key];
  if (!claim) return state;
  if (accepted) {
    return {
      ...state,
      ledger: {
        ...state.ledger,
        claims: {
          ...state.ledger.claims,
          [key]: { ...claim, confirmed: true, confidence: Math.max(claim.confidence, 0.95) },
        },
      },
    };
  }
  const nextClaims = { ...state.ledger.claims };
  delete nextClaims[key];
  return {
    ...state,
    ledger: { ...state.ledger, claims: nextClaims },
  };
}

export function confirmBatch(state: PlannerState): PlannerState {
  return {
    ...state,
    ledger: confirmAllClaims(state.ledger),
    batchConfirmed: true,
  };
}

export function getOpeningQuestion(lang: UiLang): string {
  return lang === "hi" ? GOAL_QUESTION.hi[0] : GOAL_QUESTION.en[0];
}

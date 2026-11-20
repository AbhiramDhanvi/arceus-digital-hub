// Additive Claim Ledger: provenance, vague-value ranges, interval-threshold checks,
// and cross-field consistency checks with non-destructive conflict tracking.
import type { FactKey, FactValue, Facts } from "./eligibility";
import { UNKNOWN } from "./eligibility";
import { isApprox, normalize, parseNumber, parsePeriod, type Period } from "./parse";

export type NumericRange = [number, number];

export interface ClaimEntry {
  key: FactKey;
  value?: FactValue | undefined;
  range?: NumericRange | undefined;
  confidence: number; // 0..1
  source_quote: string;
  turn: number;
  confirmed?: boolean | undefined;
}

export interface ConflictSide {
  key: FactKey;
  label: string;
  source_quote: string;
  turn: number;
  value?: FactValue | undefined;
  range?: NumericRange | undefined;
}

export interface ClaimConflict {
  id: string;
  ruleId: string;
  keys: FactKey[];
  claimA: ConflictSide;
  claimB: ConflictSide;
  question: { en: string; hi: string };
  resolved: boolean;
  /** True when the user leaves the conflict unresolved -> triggers CONDITIONAL branches. */
  unresolved: boolean;
}

export interface ClaimLedger {
  claims: Partial<Record<FactKey, ClaimEntry>>;
  history: ClaimEntry[];
  conflicts: ClaimConflict[];
  turn: number;
}

export function createLedger(): ClaimLedger {
  return { claims: {}, history: [], conflicts: [], turn: 0 };
}

const EN_NUM: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  twentyfive: 25,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const HI_NUM: Record<string, number> = {
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  chah: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  pandrah: 15,
  bees: 20,
  pachees: 25,
  tees: 30,
  chalis: 40,
  pachas: 50,
  saath: 60,
  sattar: 70,
  assi: 80,
  nabbe: 90,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  पंद्रह: 15,
  बीस: 20,
  पच्चीस: 25,
  तीस: 30,
  चालीस: 40,
  पचास: 50,
  साठ: 60,
  सत्तर: 70,
};

function unitMultiplier(text: string): number {
  if (/\bcrore\b|करोड़/.test(text)) return 10_000_000;
  if (/\b(lakh|lac|lakhs|lacs)\b|लाख/.test(text)) return 100_000;
  if (/\b(thousand|hazaar|hazar|k)\b|हज़ार|हजार/.test(text)) return 1_000;
  return 1;
}

function parseTokenNumber(token: string): number | null {
  const clean = token.trim();
  if (!clean) return null;
  const numMatch = clean.match(/^(\d+(?:\.\d+)?)(k)?$/i);
  if (numMatch && numMatch[1]) {
    const base = Number(numMatch[1]);
    return numMatch[2] ? base * 1000 : base;
  }
  const parts = clean.split(/\s+/);
  let sum = 0;
  let hit = false;
  for (const w of parts) {
    const v = EN_NUM[w] ?? HI_NUM[w];
    if (v !== undefined) {
      sum += v;
      hit = true;
    }
  }
  return hit ? sum : null;
}

export interface ParsedAmountOrRange {
  value?: number | undefined;
  range?: NumericRange | undefined;
  confidence: number;
  period: Period;
  convertedPeriod: boolean;
}

/**
 * Parses exact numbers AND vague ranges such as:
 * - "2-3 lakh", "2 to 3 lakh", "दो से तीन लाख" -> [200000, 300000]
 * - "10-15 hazaar per month" -> monthly [10000, 15000] or annual [120000, 180000]
 * - "lagbhag 3.5 lakh" / "around 15000" -> +-10% range
 * - "below 3 lakh" / "under 50 hazaar" -> [0, bound]
 */
export function parseMoneyClaim(
  text: string,
  targetPeriod: "annual" | "monthly" | "lump",
): ParsedAmountOrRange | null {
  const t = normalize(text);
  const period = parsePeriod(text);

  const convert = (n: number): { val: number; converted: boolean } => {
    if (targetPeriod === "annual" && period === "month")
      return { val: Math.round(n * 12), converted: true };
    if (targetPeriod === "monthly" && period === "year")
      return { val: Math.round(n / 12), converted: true };
    return { val: Math.round(n), converted: false };
  };

  // 1) Explicit range: "2-3 lakh", "2 to 3 lakh", "10 se 15 hazaar", "2.5 – 4 lakh", "दो से तीन लाख"
  const rangeRe =
    /(\d+(?:\.\d+)?k?|(?:[\p{L}\p{M}])+)\s*(?:lakh|lac|lakhs|lacs|लाख|hazaar|hazar|thousand|हज़ार|हजार|crore|करोड़)?\s*(?:-|–|—|\bto\b|\bse\b|से)\s*(\d+(?:\.\d+)?k?|(?:[\p{L}\p{M}])+)\s*(lakh|lac|lakhs|lacs|लाख|hazaar|hazar|thousand|k|हज़ार|हजार|crore|करोड़)?/iu;
  const rm = t.match(rangeRe);
  if (rm && rm[1] && rm[2]) {
    const n1 = parseTokenNumber(rm[1]);
    const n2 = parseTokenNumber(rm[2]);
    if (n1 !== null && n2 !== null) {
      const rightUnit = rm[3] ? unitMultiplier(rm[3]) : unitMultiplier(t);
      // If left side already had 'k' (e.g. "10k-15k"), n1 is already scaled
      const leftScaled = /k$/i.test(rm[1]) ? n1 : n1 < 1000 && rightUnit > 1 ? n1 * rightUnit : n1;
      const rightScaled = /k$/i.test(rm[2]) ? n2 : n2 < 1000 && rightUnit > 1 ? n2 * rightUnit : n2;
      const lo = Math.min(leftScaled, rightScaled);
      const hi = Math.max(leftScaled, rightScaled);
      const cLo = convert(lo);
      const cHi = convert(hi);
      return {
        range: [cLo.val, cHi.val],
        confidence: 0.82,
        period,
        convertedPeriod: cLo.converted,
      };
    }
  }

  // 2) Upper/lower bounded vague statements: "under 3 lakh", "3 lakh se kam", "less than 15 hazaar"
  const num = parseNumber(text);
  if (num !== null) {
    if (/\b(under|below|less than|at most|up to|upto|within)\b|से कम|तक/.test(t)) {
      const cHi = convert(num);
      return { range: [0, cHi.val], confidence: 0.78, period, convertedPeriod: cHi.converted };
    }
    if (/\b(above|over|more than|at least)\b|से ज़्यादा|से ज्यादा|से अधिक/.test(t)) {
      const cLo = convert(num);
      return {
        range: [cLo.val, Math.max(cLo.val * 2, 100_000_000)],
        confidence: 0.78,
        period,
        convertedPeriod: cLo.converted,
      };
    }

    // 3) Approximate single figure -> +-10% range
    const approx = isApprox(text);
    const c = convert(num);
    if (approx) {
      const delta = Math.max(1, Math.round(c.val * 0.1));
      return {
        range: [Math.max(0, c.val - delta), c.val + delta],
        confidence: 0.74,
        period,
        convertedPeriod: c.converted,
      };
    }

    return {
      value: c.val,
      confidence: c.converted ? 0.85 : 0.95,
      period,
      convertedPeriod: c.converted,
    };
  }

  return null;
}

/** Parses exact age or vague age range ("35-40", "around 40", "early 30s"). */
export function parseAgeClaim(
  text: string,
): { value?: number; range?: NumericRange; confidence: number } | null {
  const t = normalize(text);
  const rm = t.match(/(\d{1,3})\s*(?:-|–|—|\bto\b|\bse\b|से)\s*(\d{1,3})/);
  if (rm && rm[1] && rm[2]) {
    const a = Number(rm[1]);
    const b = Number(rm[2]);
    if (a >= 0 && b <= 120) {
      return { range: [Math.min(a, b), Math.max(a, b)], confidence: 0.8 };
    }
  }
  const n = parseNumber(text);
  if (n === null || n < 0 || n > 120) return null;
  const rounded = Math.round(n);
  if (isApprox(text)) {
    return { range: [Math.max(0, rounded - 2), Math.min(120, rounded + 2)], confidence: 0.72 };
  }
  return { value: rounded, confidence: 0.95 };
}

export type IntervalRuleOutcome = "pass" | "fail" | "straddle";

export interface NumericBound {
  min?: number | undefined; // inclusive
  minExclusive?: number | undefined; // strict >
  max?: number | undefined; // inclusive
  maxExclusive?: number | undefined; // strict <
}

export interface RangeCheckResult {
  outcome: IntervalRuleOutcome;
  thresholdHit?: number | undefined;
  boundKind?: "min" | "minExclusive" | "max" | "maxExclusive" | undefined;
}

/**
 * Evaluates a numeric interval [lo, hi] against a threshold rule.
 * - Entirely inside valid region -> "pass"
 * - Entirely outside valid region -> "fail"
 * - Crosses any boundary -> "straddle" (NEVER hard fail!)
 */
export function evaluateRangeBound(range: NumericRange, bound: NumericBound): RangeCheckResult {
  const [lo, hi] = range;
  const passesPoint = (x: number): boolean => {
    if (bound.min !== undefined && x < bound.min) return false;
    if (bound.minExclusive !== undefined && x <= bound.minExclusive) return false;
    if (bound.max !== undefined && x > bound.max) return false;
    if (bound.maxExclusive !== undefined && x >= bound.maxExclusive) return false;
    return true;
  };

  // For convex single intervals, check endpoints and whether the interval intersects the valid region
  const validLo =
    bound.min !== undefined
      ? bound.min
      : bound.minExclusive !== undefined
        ? bound.minExclusive + 1e-9
        : -Infinity;
  const validHi =
    bound.max !== undefined
      ? bound.max
      : bound.maxExclusive !== undefined
        ? bound.maxExclusive - 1e-9
        : Infinity;

  const allPass = passesPoint(lo) && passesPoint(hi);
  if (allPass) return { outcome: "pass" };

  // Completely disjoint from valid region?
  const overlapsValid = Math.max(lo, validLo) <= Math.min(hi, validHi);
  if (!overlapsValid) return { outcome: "fail" };

  // Straddles at least one bound — identify which threshold is crossed
  if (bound.max !== undefined && lo <= bound.max && hi > bound.max) {
    return { outcome: "straddle", thresholdHit: bound.max, boundKind: "max" };
  }
  if (bound.maxExclusive !== undefined && lo < bound.maxExclusive && hi >= bound.maxExclusive) {
    return { outcome: "straddle", thresholdHit: bound.maxExclusive, boundKind: "maxExclusive" };
  }
  if (bound.min !== undefined && lo < bound.min && hi >= bound.min) {
    return { outcome: "straddle", thresholdHit: bound.min, boundKind: "min" };
  }
  if (bound.minExclusive !== undefined && lo <= bound.minExclusive && hi > bound.minExclusive) {
    return { outcome: "straddle", thresholdHit: bound.minExclusive, boundKind: "minExclusive" };
  }
  return { outcome: "straddle" };
}

export function formatClaimValue(
  entry: { value?: FactValue | undefined; range?: NumericRange | undefined },
  key: FactKey,
): string {
  const moneyKeys: FactKey[] = [
    "familyIncomeAnnual",
    "monthlyIncome",
    "pensionMonthly",
    "loanAmount",
  ];
  const isMoney = moneyKeys.includes(key);
  const fmtNum = (n: number) => (isMoney ? `₹${n.toLocaleString("en-IN")}` : String(n));
  if (entry.range) {
    const unit =
      key === "age" || key === "ageOnAadhaar" || key === "girlAge"
        ? " years"
        : key === "class7Marks"
          ? "%"
          : "";
    return `${fmtNum(entry.range[0])}–${fmtNum(entry.range[1])}${unit}`;
  }
  const v = entry.value;
  if (v === undefined || v === UNKNOWN) return "unknown";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") {
    if (key === "age" || key === "ageOnAadhaar" || key === "girlAge") return `${v} years`;
    if (key === "class7Marks") return `${v}%`;
    return fmtNum(v);
  }
  return String(v);
}

function claimMin(c: ClaimEntry | undefined): number | null {
  if (!c) return null;
  if (c.range) return c.range[0];
  return typeof c.value === "number" ? c.value : null;
}

function claimMax(c: ClaimEntry | undefined): number | null {
  if (!c) return null;
  if (c.range) return c.range[1];
  return typeof c.value === "number" ? c.value : null;
}

function sameValueOrRange(a: ClaimEntry, b: ClaimEntry): boolean {
  if (a.range && b.range) return a.range[0] === b.range[0] && a.range[1] === b.range[1];
  if (!a.range && !b.range) return a.value === b.value;
  return false;
}

/** True when a new narrower exact value refines an existing range without contradicting it. */
function isRefinementOfRange(existing: ClaimEntry, incoming: ClaimEntry): boolean {
  if (!existing.range || typeof incoming.value !== "number") return false;
  return incoming.value >= existing.range[0] && incoming.value <= existing.range[1];
}

function makeNeutralQuestion(a: ConflictSide, b: ConflictSide): { en: string; hi: string } {
  return {
    en: `I noticed two different details: in turn ${a.turn} you said "${a.source_quote}" (${a.label}), and in turn ${b.turn} you said "${b.source_quote}" (${b.label}). Which one is right?`,
    hi: `मुझे दो अलग बातें मिलीं: पहले (बारी ${a.turn}) आपने कहा "${a.source_quote}" (${a.label}), और फिर (बारी ${b.turn}) आपने कहा "${b.source_quote}" (${b.label})। इनमें से कौन सा सही है?`,
  };
}

interface ConsistencyCheckDef {
  id: string;
  check: (
    claims: Partial<Record<FactKey, ClaimEntry>>,
    incoming: ClaimEntry,
  ) => [ClaimEntry, ClaimEntry] | null;
}

/**
 * 10 cross-field consistency checks. Each returns the two conflicting claims if a
 * contradiction is detected, or null when consistent.
 */
const CONSISTENCY_CHECKS: ConsistencyCheckDef[] = [
  // 1. Age vs Class VIII student (Class 8 students are typically 11–18 years old)
  {
    id: "age_vs_class8",
    check: (claims) => {
      const age = claims.age;
      const c8 = claims.inClass8;
      if (!age || !c8 || c8.value !== true) return null;
      const lo = claimMin(age);
      const hi = claimMax(age);
      if (lo !== null && hi !== null && (lo > 18 || hi < 10)) return [age, c8];
      return null;
    },
  },
  // 2. Age vs Class XII / college degree (< 15 years old claiming college/Class 12)
  {
    id: "age_vs_college",
    check: (claims) => {
      const age = claims.age;
      const deg =
        claims.regularDegree?.value === true
          ? claims.regularDegree
          : claims.class12Top20?.value === true
            ? claims.class12Top20
            : undefined;
      if (!age || !deg) return null;
      const hi = claimMax(age);
      if (hi !== null && hi < 15) return [age, deg];
      return null;
    },
  },
  // 3. No cultivable land vs institutional land or land-based crop claim
  {
    id: "no_land_vs_institutional_land",
    check: (claims) => {
      const owns = claims.ownsCultivableLand;
      const inst = claims.institutionalLand;
      if (owns?.value === false && inst?.value === true) return [owns, inst];
      return null;
    },
  },
  // 4. Monthly income vs annual family income (individual monthly * 12 >> family annual)
  {
    id: "monthly_vs_annual_income",
    check: (claims) => {
      const m = claims.monthlyIncome;
      const a = claims.familyIncomeAnnual;
      if (!m || !a) return null;
      const mLo = claimMin(m);
      const aHi = claimMax(a);
      if (mLo !== null && aHi !== null && mLo * 12 > aHi * 1.25 && aHi > 0) return [m, a];
      return null;
    },
  },
  // 5. Income-tax payer vs very low family income (< ₹2.5L basic exemption)
  {
    id: "taxpayer_vs_low_income",
    check: (claims) => {
      const tax =
        claims.incomeTaxPayer?.value === true
          ? claims.incomeTaxPayer
          : claims.incomeTaxLastAY?.value === true
            ? claims.incomeTaxLastAY
            : undefined;
      const inc = claims.familyIncomeAnnual;
      if (!tax || !inc) return null;
      const hi = claimMax(inc);
      if (hi !== null && hi < 250_000) return [tax, inc];
      return null;
    },
  },
  // 6. Paid income tax last assessment year vs "never been an income-tax payer"
  {
    id: "tax_last_ay_vs_never_taxpayer",
    check: (claims) => {
      const lastAy = claims.incomeTaxLastAY;
      const ever = claims.incomeTaxPayer;
      if (lastAy?.value === true && ever?.value === false) return [lastAy, ever];
      return null;
    },
  },
  // 7. Serving/retired government employee (self) vs unorganised-sector worker
  {
    id: "govt_employee_vs_unorganised",
    check: (claims) => {
      const govt = claims.govtEmployee;
      const unorg = claims.unorganisedWorker;
      const subj = claims.subject?.value;
      if (govt?.value === true && unorg?.value === true && subj !== "other") return [govt, unorg];
      return null;
    },
  },
  // 8. Government officer/employee in family vs "no one in family in govt service"
  {
    id: "govt_employee_vs_govt_service_family",
    check: (claims) => {
      const govt = claims.govtEmployee;
      const fam = claims.govtServiceFamily;
      if (govt?.value === true && fam?.value === false) return [govt, fam];
      return null;
    },
  },
  // 9. Age vs Aadhaar age differing by more than 2 years
  {
    id: "age_vs_aadhaar_age",
    check: (claims) => {
      const age = claims.age;
      const aad = claims.ageOnAadhaar;
      if (!age || !aad) return null;
      const aLo = claimMin(age);
      const aHi = claimMax(age);
      const bLo = claimMin(aad);
      const bHi = claimMax(aad);
      if (aLo === null || aHi === null || bLo === null || bHi === null) return null;
      const gap = Math.max(aLo - bHi, bLo - aHi);
      if (gap > 2) return [age, aad];
      return null;
    },
  },
  // 10. Retirement pension vs young age (< 25)
  {
    id: "pension_vs_young_age",
    check: (claims) => {
      const age = claims.age;
      const pen = claims.pensionMonthly;
      const subj = claims.subject?.value;
      if (!age || !pen || subj === "other") return null;
      const aHi = claimMax(age);
      const pLo = claimMin(pen);
      if (aHi !== null && aHi < 25 && pLo !== null && pLo > 0) return [age, pen];
      return null;
    },
  },
  // 11. Allotted government house in last 20y vs owns no pucca house
  {
    id: "govt_house_vs_no_pucca",
    check: (claims) => {
      const gh = claims.govtHouse20y;
      const pucca = claims.ownsPuccaHouse;
      if (gh?.value === true && pucca?.value === false) return [gh, pucca];
      return null;
    },
  },
];

function toConflictSide(c: ClaimEntry): ConflictSide {
  return {
    key: c.key,
    label: formatClaimValue(c, c.key),
    source_quote: c.source_quote,
    turn: c.turn,
    ...(c.value !== undefined ? { value: c.value } : {}),
    ...(c.range !== undefined ? { range: c.range } : {}),
  };
}

/**
 * Adds a claim to the ledger without silently overwriting contradicting claims.
 * - If the new claim refines an existing range (falls inside [lo, hi]), it narrows cleanly.
 * - If it contradicts an existing claim on the same key OR trips any cross-field consistency
 *   check, a ClaimConflict is recorded quoting both statements and the existing claim is preserved.
 */
export function recordClaim(
  ledger: ClaimLedger,
  input: Omit<ClaimEntry, "turn"> & { turn?: number; forceOverwrite?: boolean },
): { ledger: ClaimLedger; conflict: ClaimConflict | null } {
  const turn = input.turn ?? ledger.turn + 1;
  const entry: ClaimEntry = {
    key: input.key,
    confidence: input.confidence,
    source_quote: input.source_quote,
    turn,
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.range !== undefined ? { range: input.range } : {}),
    ...(input.confirmed !== undefined ? { confirmed: input.confirmed } : {}),
  };

  const nextHistory = [...ledger.history, entry];
  const existing = ledger.claims[entry.key];

  // Explicit overwrite (e.g. user resolved a conflict or clicked Change)
  if (input.forceOverwrite) {
    const nextClaims: Partial<Record<FactKey, ClaimEntry>> = {
      ...ledger.claims,
      [entry.key]: entry,
    };
    const nextConflicts = ledger.conflicts.map((c) =>
      c.keys.includes(entry.key) ? { ...c, resolved: true, unresolved: false } : c,
    );
    return {
      ledger: {
        claims: nextClaims,
        history: nextHistory,
        conflicts: nextConflicts,
        turn: Math.max(ledger.turn, turn),
      },
      conflict: null,
    };
  }

  // Same-key contradiction check (ignore UNKNOWN or exact duplicates or range refinement)
  if (
    existing &&
    existing.value !== UNKNOWN &&
    entry.value !== UNKNOWN &&
    !sameValueOrRange(existing, entry) &&
    !isRefinementOfRange(existing, entry)
  ) {
    const sideA = toConflictSide(existing);
    const sideB = toConflictSide(entry);
    const conflict: ClaimConflict = {
      id: `same:${entry.key}:${existing.turn}:${entry.turn}`,
      ruleId: "same_key_conflict",
      keys: [entry.key],
      claimA: sideA,
      claimB: sideB,
      question: makeNeutralQuestion(sideA, sideB),
      resolved: false,
      unresolved: false,
    };
    return {
      ledger: {
        claims: ledger.claims, // Never overwrite silently!
        history: nextHistory,
        conflicts: [...ledger.conflicts, conflict],
        turn: Math.max(ledger.turn, turn),
      },
      conflict,
    };
  }

  // Temporarily merge to run cross-field consistency checks
  const candidateClaims: Partial<Record<FactKey, ClaimEntry>> = {
    ...ledger.claims,
    [entry.key]: entry,
  };
  for (const chk of CONSISTENCY_CHECKS) {
    const hit = chk.check(candidateClaims, entry);
    if (hit) {
      const [cA, cB] = hit;
      const alreadyTracked = ledger.conflicts.some(
        (c) =>
          !c.resolved && c.ruleId === chk.id && c.keys.includes(cA.key) && c.keys.includes(cB.key),
      );
      if (!alreadyTracked) {
        const sideA = toConflictSide(cA);
        const sideB = toConflictSide(cB);
        const conflict: ClaimConflict = {
          id: `cross:${chk.id}:${cA.turn}:${cB.turn}`,
          ruleId: chk.id,
          keys: cA.key === cB.key ? [cA.key] : [cA.key, cB.key],
          claimA: sideA,
          claimB: sideB,
          question: makeNeutralQuestion(sideA, sideB),
          resolved: false,
          unresolved: false,
        };
        return {
          ledger: {
            claims: ledger.claims, // Preserve prior state until user clarifies
            history: nextHistory,
            conflicts: [...ledger.conflicts, conflict],
            turn: Math.max(ledger.turn, turn),
          },
          conflict,
        };
      }
    }
  }

  return {
    ledger: {
      claims: candidateClaims,
      history: nextHistory,
      conflicts: ledger.conflicts,
      turn: Math.max(ledger.turn, turn),
    },
    conflict: null,
  };
}

/**
 * Resolves a recorded conflict either by accepting side A, accepting side B, or
 * marking it unresolved (which triggers CONDITIONAL two-branch verdicts).
 */
export function resolveConflict(
  ledger: ClaimLedger,
  conflictId: string,
  choice: "A" | "B" | "unresolved",
): ClaimLedger {
  const target = ledger.conflicts.find((c) => c.id === conflictId);
  if (!target) return ledger;

  if (choice === "unresolved") {
    return {
      ...ledger,
      conflicts: ledger.conflicts.map((c) =>
        c.id === conflictId ? { ...c, resolved: false, unresolved: true } : c,
      ),
    };
  }

  const chosen = choice === "A" ? target.claimA : target.claimB;
  const rejected = choice === "A" ? target.claimB : target.claimA;
  const nextClaims: Partial<Record<FactKey, ClaimEntry>> = { ...ledger.claims };

  // If cross-field conflict, drop the rejected side's key so it no longer contradicts
  if (rejected.key !== chosen.key) {
    delete nextClaims[rejected.key];
  }
  nextClaims[chosen.key] = {
    key: chosen.key,
    confidence: 1,
    source_quote: chosen.source_quote,
    turn: chosen.turn,
    confirmed: true,
    ...(chosen.value !== undefined ? { value: chosen.value } : {}),
    ...(chosen.range !== undefined ? { range: chosen.range } : {}),
  };

  return {
    ...ledger,
    claims: nextClaims,
    conflicts: ledger.conflicts.map((c) =>
      c.id === conflictId ? { ...c, resolved: true, unresolved: false } : c,
    ),
  };
}

/** Marks all currently recorded claims as confirmed (used after end-of-interview batch confirm). */
export function confirmAllClaims(ledger: ClaimLedger): ClaimLedger {
  const claims: Partial<Record<FactKey, ClaimEntry>> = {};
  for (const [k, c] of Object.entries(ledger.claims) as [FactKey, ClaimEntry][]) {
    claims[k] = { ...c, confirmed: true };
  }
  return { ...ledger, claims };
}

/** Projects exact (non-range) claims into a plain Facts dictionary for compatibility with eligibility.ts. */
export function ledgerToFacts(ledger: ClaimLedger): Facts {
  const facts: Facts = {};
  for (const [k, c] of Object.entries(ledger.claims) as [FactKey, ClaimEntry][]) {
    if (c.value !== undefined) facts[k] = c.value;
  }
  return facts;
}

/** Returns unresolved conflicts that have not yet been deferred by the user. */
export function pendingConflicts(ledger: ClaimLedger): ClaimConflict[] {
  return ledger.conflicts.filter((c) => !c.resolved && !c.unresolved);
}

/** Returns conflicts left unresolved after asking (these drive CONDITIONAL verdicts). */
export function unresolvedConflicts(ledger: ClaimLedger): ClaimConflict[] {
  return ledger.conflicts.filter((c) => !c.resolved && c.unresolved);
}

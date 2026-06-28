// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL REHAB CONTENT + TIMELINE MATH (storage-agnostic, no React, no I/O).
//
// The canonical evidence-based phase structure lives here as blueprints. Both
// the first-run seed (lib/seed.ts) and the Dexie v2 migration (lib/db.ts) build
// editable Stage records from these blueprints, so fresh installs and upgraded
// installs converge on the same content. Everything is editable in Dexie after.
//
// All timeframes are guidance; the gating criteria are the real gate. The
// return-to-sport phase additionally carries a HARD time gate (9 months) that
// cannot be overridden by checking criteria.
// ─────────────────────────────────────────────────────────────────────────────

import type { PhaseCriterion, Stage } from "./types";
import {
  DEFAULT_GRAFT_TYPE,
  DEFAULT_SURGERY_DATE,
  DEFAULT_TARGET_SPORT,
  GRAFT_TYPE_KEY,
  SURGERY_DATE_KEY,
  TARGET_SPORT_KEY,
} from "./types";
import { addMonths, daysBetween, parseLocalDate } from "./date";

// ── Phase blueprints ─────────────────────────────────────────────────────────

export interface PhaseBlueprint {
  phaseKey: string;
  /** Used when creating a NEW stage (existing stages keep their own name). */
  name: string;
  note: string;
  goals: string[];
  /** Gating exit-criteria labels (ids are generated when records are built). */
  criteria: string[];
  /** Post-op window in weeks (guidance). maxWeekPostOp omitted = open-ended. */
  minWeekPostOp: number;
  maxWeekPostOp?: number;
  hardGate?: boolean;
  /** Months post-op the hard gate lifts (return-to-sport only). */
  hardGateMonthsPostOp?: number;
}

export const CLINICAL_PHASES: PhaseBlueprint[] = [
  {
    phaseKey: "early-recovery",
    name: "Phase 1 — Early recovery (0–2 wks)",
    note: "Control swelling, restore full passive extension, wake the quad up, and move through protected range.",
    goals: [
      "Control swelling / effusion",
      "Restore full passive extension (equal to the other side)",
      "Quad activation — quad set / SLR with no extension lag",
      "Protected range of motion",
    ],
    criteria: [
      "Full passive extension equal to the other side",
      "Effusion (swelling) controlled",
      "Straight-leg raise with no extension lag",
      "ROM approximately 0–90°",
    ],
    minWeekPostOp: 0,
    maxWeekPostOp: 2,
  },
  {
    phaseKey: "foundation",
    name: "Phase 2 — Foundation (2–6 wks)",
    note: "Normalize gait off crutches, restore full ROM, begin basic strengthening. Hamstring autograft: keep early hamstring loading conservative.",
    goals: [
      "Normalize gait, off crutches",
      "Range of motion to full",
      "Begin basic strengthening",
      "Hamstring autograft — keep early hamstring loading conservative",
    ],
    criteria: [
      "Normal gait with no aids / crutches",
      "Full range of motion",
      "Minimal / no effusion",
      "Basic double-leg strength, pain-free",
    ],
    minWeekPostOp: 2,
    maxWeekPostOp: 6,
  },
  {
    phaseKey: "strength",
    name: "Phase 3 — Strength (6–12 wks)",
    note: "Progressive closed-chain and single-leg strengthening of the quad and hamstring.",
    goals: [
      "Progressive closed-chain strengthening",
      "Single-leg strengthening (quad + hamstring)",
    ],
    criteria: [
      "Single-leg squat with good control",
      "No effusion after loading",
      "Quad strength clearly trending toward symmetry",
    ],
    minWeekPostOp: 6,
    maxWeekPostOp: 12,
  },
  {
    phaseKey: "running-plyo",
    name: "Phase 4 — Running & plyometric prep (3–5 mo)",
    note: "Introduce running on criteria, then progress double-leg → single-leg plyometrics with a focus on landing quality.",
    goals: [
      "Introduce running once criteria are met",
      "Double-leg → single-leg plyometric progression",
      "Landing-quality focus (no valgus collapse)",
    ],
    criteria: [
      "Pain-free running",
      "Controlled double-leg landings (no valgus collapse)",
      "Quad LSI ~70%+ and rising",
    ],
    minWeekPostOp: 13,
    maxWeekPostOp: 22,
  },
  {
    phaseKey: "agility",
    name: "Phase 5 — Agility & sport-specific (5–9 mo)",
    note: "Change-of-direction, deceleration, planned cutting → reactive/unplanned cutting, small-sided non-contact.",
    goals: [
      "Change-of-direction and deceleration",
      "Planned cutting → reactive / unplanned cutting",
      "Small-sided, non-contact play",
    ],
    criteria: [
      "Clean planned cutting mechanics",
      "Clean unplanned / reactive cutting mechanics",
      "Controlled single-leg landings",
      "Quad + hamstring LSI ≥ 90%",
    ],
    minWeekPostOp: 22,
    maxWeekPostOp: 39,
  },
  {
    phaseKey: "return-to-sport",
    name: "Phase 6 — Return to sport (9+ mo)",
    note: "Pass the return-to-sport test battery, then graded return to futsal: drills → small-sided → full play. A hard 9-month time gate applies regardless of criteria.",
    goals: [
      "Pass the return-to-sport test battery",
      "Graded return to futsal: drills → small-sided → full play",
    ],
    criteria: [
      "Quad LSI ≥ 90% (isokinetic if available)",
      "Single hop LSI ≥ 90%",
      "Triple hop LSI ≥ 90%",
      "Crossover hop LSI ≥ 90%",
      "6 m timed hop LSI ≥ 90%",
      "Landing / movement-quality check passed (no valgus collapse)",
      "Hamstring symmetry adequate (hamstring graft)",
      "ACL-RSI psychological readiness score logged and acceptable",
      "No effusion",
      "Full range of motion",
    ],
    minWeekPostOp: 39,
    hardGate: true,
    hardGateMonthsPostOp: 9,
  },
];

/** phaseKeys of the four phases produced by the original v1 seed, in order. */
export const V1_PHASE_KEYS = [
  "early-recovery",
  "foundation",
  "strength",
  "return-to-sport",
] as const;

/** Build PhaseCriterion records (with ids) from a blueprint's labels. */
export function buildCriteria(
  labels: string[],
  newId: () => string,
): PhaseCriterion[] {
  return labels.map((label) => ({ id: newId(), label, checked: false }));
}

/** The date a phase's hard gate lifts, given the current surgery date. */
export function effectiveHardGateDate(
  bp: Pick<PhaseBlueprint, "hardGateMonthsPostOp">,
  surgeryDate: string,
): string {
  return addMonths(surgeryDate, bp.hardGateMonthsPostOp ?? 9);
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface RehabSettings {
  surgeryDate: string;
  graftType: string;
  targetSport: string;
}

export const DEFAULT_REHAB_SETTINGS: RehabSettings = {
  surgeryDate: DEFAULT_SURGERY_DATE,
  graftType: DEFAULT_GRAFT_TYPE,
  targetSport: DEFAULT_TARGET_SPORT,
};

/** Resolve settings from a meta key→value map, falling back to defaults. */
export function resolveSettings(meta: Record<string, string | undefined>): RehabSettings {
  return {
    surgeryDate: meta[SURGERY_DATE_KEY] || DEFAULT_SURGERY_DATE,
    graftType: meta[GRAFT_TYPE_KEY] || DEFAULT_GRAFT_TYPE,
    targetSport: meta[TARGET_SPORT_KEY] || DEFAULT_TARGET_SPORT,
  };
}

// ── Timeline math ────────────────────────────────────────────────────────────

/** Whole days since surgery (negative before surgery). */
export function daysPostOp(surgeryDate: string, todayStr: string): number {
  return daysBetween(surgeryDate, todayStr);
}

/** Whole weeks since surgery, floored, never below 0. */
export function weeksPostOp(surgeryDate: string, todayStr: string): number {
  return Math.max(0, Math.floor(daysBetween(surgeryDate, todayStr) / 7));
}

/**
 * The current phase by time: the latest phase whose window has started
 * (greatest minWeekPostOp ≤ weeks). Returns the stage id, or null if none.
 */
export function currentPhaseId(stages: Stage[], weeks: number): string | null {
  let best: Stage | null = null;
  for (const s of stages) {
    if (s.minWeekPostOp == null) continue;
    if (s.minWeekPostOp <= weeks && (!best || s.minWeekPostOp > best.minWeekPostOp!)) {
      best = s;
    }
  }
  return best?.id ?? null;
}

export interface PhaseReadiness {
  /** Whether every gating criterion is checked. */
  allChecked: boolean;
  checkedCount: number;
  totalCount: number;
  /** Whether the phase's minimum time window has elapsed. */
  timeElapsed: boolean;
  /** True for the return-to-sport hard gate while it is still locked. */
  hardLocked: boolean;
  /** Effective hard-gate date (YYYY-MM-DD) if this phase has a hard gate. */
  hardGateDate?: string;
  /** Days remaining until the hard gate lifts (≥0), if locked. */
  daysToGate?: number;
  /** Final verdict: ready to advance / clearable. */
  ready: boolean;
}

/**
 * Compute a phase's readiness. A phase is "ready to advance" only when all
 * gating criteria are checked AND its minimum time window has elapsed. The
 * return-to-sport phase additionally cannot be ready before its hard gate date,
 * regardless of criteria.
 */
export function phaseReadiness(
  stage: Stage,
  weeks: number,
  todayStr: string,
  surgeryDate: string,
): PhaseReadiness {
  const criteria = stage.gatingCriteria ?? [];
  const totalCount = criteria.length;
  const checkedCount = criteria.filter((c) => c.checked).length;
  const allChecked = totalCount > 0 && checkedCount === totalCount;

  // Time window: the minimum time to spend is reaching the window's upper
  // bound; the next phase starts there. Open-ended phases rely on the hard gate.
  const timeElapsed =
    stage.maxWeekPostOp != null ? weeks >= stage.maxWeekPostOp : true;

  let hardLocked = false;
  let daysToGate: number | undefined;
  let hardGateDate: string | undefined;
  if (stage.hardGate) {
    hardGateDate =
      stage.hardGateDate ?? addMonths(surgeryDate, 9);
    const remaining = daysBetween(todayStr, hardGateDate);
    hardLocked = remaining > 0;
    daysToGate = Math.max(0, remaining);
  }

  const ready = allChecked && timeElapsed && !hardLocked;

  return {
    allChecked,
    checkedCount,
    totalCount,
    timeElapsed,
    hardLocked,
    hardGateDate,
    daysToGate,
    ready,
  };
}

/** Format a YYYY-MM-DD as e.g. "17 Mar 2027". */
export function longDate(s: string): string {
  return parseLocalDate(s).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

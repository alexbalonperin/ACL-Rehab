import type { Exercise, Stage } from "./types";
import { newId } from "./id";
import { buildCriteria, CLINICAL_PHASES, effectiveHardGateDate } from "./rehab";
import { DEFAULT_SURGERY_DATE } from "./types";

// NOTE: All seed exercises, sets, reps and progressions below are PLACEHOLDERS.
// They reflect the user's stated current clearance but must be confirmed with a
// surgeon / physiotherapist. This app tracks the plan they give you; it does not
// prescribe one. Everything here is fully editable in-app after first run.
//
// The PHASE structure (names, goals, gating exit criteria, time windows, the
// return-to-sport hard gate) comes from the evidence-based blueprints in
// lib/rehab.ts. Exercises are mapped onto phases by phaseKey below.

interface SeedExercise extends Omit<Exercise, "id" | "stageId" | "order"> {}

// Exercises are attached to a phase by its stable phaseKey.
const EXERCISES_BY_PHASE: Record<string, SeedExercise[]> = {
  "early-recovery": [
      // --- Active: operated leg, explicitly cleared ---
      {
        name: "Quad set (isometric quad squeeze)",
        status: "active",
        howTo: [
          "Sit or lie with the operated leg straight.",
          "Tighten the thigh, pressing the back of the knee down toward the floor.",
          "Hold the squeeze, keeping the kneecap pulled up.",
          "Relax fully, then repeat.",
        ],
        musclesActivated: ["Quadriceps (VMO)", "Operated leg"],
        difficulty: 1,
        sets: 3,
        reps: 10,
        holdSeconds: 5,
        restBetweenRepsSeconds: 3,
        restBetweenSetsSeconds: 30,
        notes: "Quality of contraction matters more than reps early on.",
      },
      {
        name: "Straight-leg raise (SLR)",
        status: "active",
        howTo: [
          "Lie on your back, operated leg straight, other knee bent.",
          "Set the quad first (tighten the thigh).",
          "Keeping the knee locked straight, lift the leg to ~45°.",
          "Lower slowly with control.",
        ],
        musclesActivated: ["Quadriceps", "Hip flexors", "Operated leg"],
        difficulty: 2,
        sets: 3,
        reps: 10,
        restBetweenRepsSeconds: 2,
        restBetweenSetsSeconds: 45,
        notes: "Stop if the knee bends or lags — re-set the quad.",
      },
      {
        name: "Ankle pumps",
        status: "active",
        howTo: [
          "Lie or sit with the leg supported.",
          "Point the toes away, then pull them back toward you.",
          "Move through a full, comfortable range.",
        ],
        musclesActivated: ["Calf (gastroc/soleus)", "Tibialis anterior"],
        difficulty: 1,
        sets: 3,
        reps: 20,
        restBetweenSetsSeconds: 20,
        notes: "Helps circulation and reduces swelling / clot risk.",
      },
      // --- Active: non-operated / whole-body (operated leg not loaded or moved) ---
      {
        name: "Glute squeeze (isometric glute sets)",
        status: "active",
        howTo: [
          "Lie on your back or sit tall.",
          "Squeeze both glutes together.",
          "Hold the contraction without arching the back.",
          "Relax and repeat.",
        ],
        musclesActivated: ["Gluteus maximus"],
        difficulty: 1,
        sets: 3,
        reps: 10,
        holdSeconds: 5,
        restBetweenSetsSeconds: 30,
        notes: "Pure isometric — does not load or move the operated leg.",
      },
      {
        name: "Core activation (abdominal bracing / dead-bug)",
        status: "active",
        howTo: [
          "Lie on your back, gently brace the abdominals.",
          "Dead-bug: move OPPOSITE arm only, or the NON-operated leg only.",
          "Keep the operated leg still and unloaded throughout.",
          "Breathe normally; keep the low back flat.",
        ],
        musclesActivated: ["Transverse abdominis", "Obliques", "Rectus abdominis"],
        difficulty: 2,
        sets: 3,
        reps: 10,
        holdSeconds: 3,
        restBetweenSetsSeconds: 30,
        notes: "Do dead-bug variations WITHOUT loading or moving the operated leg.",
        caution:
          "Standard dead-bugs move both legs. Confirm with your PT and only move the non-operated leg until the operated leg is cleared for motion.",
      },
      {
        name: "Healthy-leg work (extension / leg press / calf raises)",
        status: "active",
        howTo: [
          "Use the NON-operated leg only.",
          "Seated leg extension, single-leg leg press, or standing calf raises.",
          "Keep the operated leg relaxed and unloaded.",
          "Work in a comfortable, controlled range.",
        ],
        musclesActivated: ["Quadriceps", "Hamstrings", "Calf", "Non-operated leg"],
        difficulty: 2,
        sets: 3,
        reps: 12,
        restBetweenSetsSeconds: 60,
        notes: "Maintains strength on the healthy side without touching the graft.",
        caution:
          "Single-leg only on the NON-operated side. Avoid any setup that requires the operated leg to brace, push, or balance.",
      },
    ],
  "foundation": [
      {
        name: "Heel slides",
        status: "upcoming",
        howTo: [
          "Lie or sit with the operated leg straight.",
          "Slide the heel toward you, bending the knee within a pain-free range.",
          "Slide back out to straight.",
        ],
        musclesActivated: ["Hamstrings", "Quadriceps", "Operated leg"],
        difficulty: 2,
        sets: 3,
        reps: 10,
        restBetweenSetsSeconds: 30,
        notes: "Early ROM drill — range guided by your PT.",
        caution: "Moves the operated knee through range. Confirm cleared ROM before activating.",
      },
      {
        name: "Mini-squats",
        status: "upcoming",
        howTo: [
          "Stand with feet shoulder-width, support nearby.",
          "Bend both knees to a shallow depth (~30–45°).",
          "Keep weight even and return to standing.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Hamstrings", "Operated leg"],
        difficulty: 3,
        sets: 3,
        reps: 10,
        restBetweenSetsSeconds: 60,
        notes: "Closed-chain loading of the operated leg.",
        caution: "Loads the operated leg through both legs. Confirm with your PT before activating.",
      },
      {
        name: "Step-ups",
        status: "upcoming",
        howTo: [
          "Use a low step.",
          "Step up leading with the operated leg, controlled.",
          "Step down with control. Increase height as cleared.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Operated leg"],
        difficulty: 3,
        sets: 3,
        reps: 8,
        restBetweenSetsSeconds: 60,
        notes: "Single-leg loading — progress height gradually.",
        caution: "Significant single-leg loading of the operated leg. Confirm with your PT before activating.",
      },
    ],
};

/**
 * Build concrete Stage + Exercise records from the clinical phase blueprints,
 * wiring in ids, ordering, gating criteria, time windows and the RTS hard gate.
 * `surgeryDate` drives the hard-gate date (defaults to the seeded surgery date).
 */
export function buildSeedData(
  surgeryDate: string = DEFAULT_SURGERY_DATE,
): { stages: Stage[]; exercises: Exercise[] } {
  const stages: Stage[] = [];
  const exercises: Exercise[] = [];

  CLINICAL_PHASES.forEach((bp, si) => {
    const stageId = newId();
    const stage: Stage = {
      id: stageId,
      name: bp.name,
      order: si,
      note: bp.note,
      phaseKey: bp.phaseKey,
      goals: bp.goals,
      gatingCriteria: buildCriteria(bp.criteria, newId),
      minWeekPostOp: bp.minWeekPostOp,
      maxWeekPostOp: bp.maxWeekPostOp,
    };
    if (bp.hardGate) {
      stage.hardGate = true;
      stage.hardGateDate = effectiveHardGateDate(bp, surgeryDate);
    }
    stages.push(stage);

    (EXERCISES_BY_PHASE[bp.phaseKey] ?? []).forEach((e, ei) => {
      exercises.push({ ...e, id: newId(), stageId, order: ei });
    });
  });

  return { stages, exercises };
}

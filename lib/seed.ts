import type { Exercise, Stage } from "./types";
import { newId } from "./id";

// NOTE: All seed exercises, sets, reps and progressions below are PLACEHOLDERS.
// They reflect the user's stated current clearance but must be confirmed with a
// surgeon / physiotherapist. This app tracks the plan they give you; it does not
// prescribe one. Everything here is fully editable in-app after first run.

interface SeedExercise extends Omit<Exercise, "id" | "stageId" | "order"> {}

interface SeedStage {
  name: string;
  note?: string;
  /** Post-op week range that anchors this phase on the Timeline (week 1 = days 0–6). */
  startWeekPostOp?: number;
  endWeekPostOp?: number;
  exercises: SeedExercise[];
}

const SEED: SeedStage[] = [
  {
    name: "Phase 1 — Weeks 0–2 (Protection & Activation)",
    note: "Protect the graft, restore quad activation, manage swelling. Operated leg is not loaded or moved through range yet.",
    startWeekPostOp: 1,
    endWeekPostOp: 2,
    exercises: [
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
  },
  {
    name: "Phase 2 — Early Progression (operated-leg, not cleared yet)",
    note: "Operated-leg progressions to unlock once your PT clears motion and light loading. Keep these in Upcoming until then.",
    startWeekPostOp: 3,
    endWeekPostOp: 6,
    exercises: [
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
      {
        name: "Stationary bike (light / ROM)",
        status: "upcoming",
        howTo: [
          "Set the saddle high enough to avoid forcing knee flexion.",
          "Start with partial revolutions if a full pedal stroke isn't comfortable.",
          "Progress to smooth full revolutions with minimal resistance.",
        ],
        musclesActivated: ["Quadriceps", "Hamstrings", "Operated leg"],
        difficulty: 2,
        sets: 1,
        reps: 1,
        holdSeconds: 300,
        notes: "Gentle ROM and circulation. Duration is a placeholder (~5 min).",
        caution: "Range guided by your PT — back off if the knee pinches.",
      },
      {
        name: "Prone / seated hamstring curls",
        status: "upcoming",
        howTo: [
          "Lie face down or sit at a curl machine / use a band.",
          "Bend the operated knee, drawing the heel toward the glutes in a pain-free range.",
          "Lower slowly with control.",
        ],
        musclesActivated: ["Hamstrings", "Operated leg"],
        difficulty: 2,
        sets: 3,
        reps: 12,
        restBetweenSetsSeconds: 45,
        notes: "Early isolated hamstring work — light and controlled.",
        caution: "Especially confirm loading with your PT if you had a hamstring graft.",
      },
    ],
  },
  {
    name: "Phase 3 — Strengthening",
    note: "Progressive strengthening of the operated leg. Add exercises here as your PT prescribes them.",
    startWeekPostOp: 7,
    endWeekPostOp: 12,
    exercises: [
      {
        name: "Leg press (double → single leg)",
        status: "upcoming",
        howTo: [
          "Set a comfortable, pain-free range on the leg press.",
          "Press with both legs to start; bias effort toward the operated leg as cleared.",
          "Progress toward single-leg press on the operated side over time.",
          "Control the lowering phase — no bouncing at the bottom.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Hamstrings", "Operated leg"],
        difficulty: 3,
        sets: 3,
        reps: 12,
        restBetweenSetsSeconds: 90,
        notes: "Load progression guided by your PT — quality over weight.",
        caution: "Avoid deep ranges or heavy loads until your PT clears them.",
      },
      {
        name: "Goblet / bodyweight squats",
        status: "upcoming",
        howTo: [
          "Stand feet shoulder-width, hold a light weight at the chest (or bodyweight).",
          "Sit back and down to a pain-free depth, knees tracking over the toes.",
          "Drive up through both feet, keeping weight even.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Hamstrings", "Operated leg"],
        difficulty: 3,
        sets: 3,
        reps: 10,
        restBetweenSetsSeconds: 75,
        notes: "Keep weight symmetrical between legs — don't offload the operated side.",
        caution: "Increase depth and load gradually as cleared.",
      },
      {
        name: "Romanian deadlift / hamstring curls",
        status: "upcoming",
        howTo: [
          "RDL: hinge at the hips with a soft knee, lower the weight along the shins, return tall.",
          "Or use a hamstring curl machine / band through a pain-free range.",
          "Keep the spine neutral throughout.",
        ],
        musclesActivated: ["Hamstrings", "Glutes", "Operated leg"],
        difficulty: 3,
        sets: 3,
        reps: 10,
        restBetweenSetsSeconds: 75,
        notes: "Hamstring strength is especially important with a hamstring-graft repair.",
        caution: "Confirm graft-appropriate hamstring loading with your PT.",
      },
      {
        name: "Reverse lunges",
        status: "upcoming",
        howTo: [
          "Stand tall, support nearby if needed.",
          "Step one leg back and lower into a lunge to a pain-free depth.",
          "Push through the front foot to return to standing.",
          "Work both legs; keep the operated knee tracking forward.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Operated leg"],
        difficulty: 3,
        sets: 3,
        reps: 8,
        restBetweenSetsSeconds: 75,
        notes: "Single-leg control drill — progress depth as cleared.",
        caution: "Significant single-leg loading. Confirm with your PT before activating.",
      },
      {
        name: "Single-leg calf raises (operated leg)",
        status: "upcoming",
        howTo: [
          "Stand on the operated leg, support nearby for balance.",
          "Rise onto the ball of the foot, then lower slowly.",
          "Keep the motion controlled through a full range.",
        ],
        musclesActivated: ["Calf (gastroc/soleus)", "Operated leg"],
        difficulty: 2,
        sets: 3,
        reps: 15,
        restBetweenSetsSeconds: 45,
        notes: "Builds lower-leg strength and ankle stability for running prep.",
      },
      {
        name: "Single-leg balance / proprioception",
        status: "upcoming",
        howTo: [
          "Balance on the operated leg with a soft knee.",
          "Progress: eyes closed, on a cushion, or with small reaches.",
          "Hold steady, controlling wobble at the knee and hip.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Ankle stabilizers", "Operated leg"],
        difficulty: 2,
        sets: 3,
        reps: 5,
        holdSeconds: 20,
        restBetweenSetsSeconds: 45,
        notes: "Retrains balance and joint position sense — key before agility work.",
      },
      {
        name: "Stationary bike (resistance)",
        status: "upcoming",
        howTo: [
          "Set the saddle so the knee isn't forced into deep flexion.",
          "Pedal at a steady cadence, adding light resistance as cleared.",
          "Build duration gradually.",
        ],
        musclesActivated: ["Quadriceps", "Hamstrings", "Glutes", "Operated leg"],
        difficulty: 2,
        sets: 1,
        reps: 1,
        holdSeconds: 600,
        notes: "Low-impact conditioning and ROM. Duration shown is a placeholder (~10 min).",
      },
    ],
  },
  {
    name: "Phase 4 — Return to Sport",
    note: "Power, agility and sport-specific work once strength and stability criteria are met.",
    startWeekPostOp: 13,
    exercises: [
      {
        name: "Running progression (walk → jog → run)",
        status: "upcoming",
        howTo: [
          "Begin with a walk/jog interval program on a flat, even surface.",
          "Progress jog duration only when pain- and swelling-free the next day.",
          "Build toward continuous running before adding speed.",
        ],
        musclesActivated: ["Quadriceps", "Hamstrings", "Glutes", "Calf", "Operated leg"],
        difficulty: 3,
        sets: 1,
        reps: 1,
        holdSeconds: 1200,
        notes: "Only start once your PT clears running criteria. Duration is a placeholder (~20 min).",
        caution: "Don't begin running until cleared — typically gated by strength/hop tests.",
      },
      {
        name: "Bulgarian split squats",
        status: "upcoming",
        howTo: [
          "Rear foot elevated on a bench, front foot forward.",
          "Lower straight down to a pain-free depth, front knee tracking over the toes.",
          "Drive up through the front foot. Work both legs.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Hamstrings", "Operated leg"],
        difficulty: 4,
        sets: 3,
        reps: 8,
        restBetweenSetsSeconds: 90,
        notes: "Advanced single-leg strength — add load as cleared.",
        caution: "High single-leg demand. Master bodyweight before loading.",
      },
      {
        name: "Double-leg → single-leg hops (plyometrics)",
        status: "upcoming",
        howTo: [
          "Start with small double-leg hops in place, landing softly.",
          "Progress to forward/lateral hops, then single-leg hops as cleared.",
          "Emphasize soft, controlled landings with the knee aligned.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Calf", "Operated leg"],
        difficulty: 4,
        sets: 3,
        reps: 8,
        restBetweenSetsSeconds: 90,
        notes: "Builds power and tendon stiffness for cutting and jumping.",
        caution: "Plyometrics are gated by strength and landing control. Confirm with your PT.",
      },
      {
        name: "Landing mechanics / hop-test drills",
        status: "upcoming",
        howTo: [
          "Practice drop-landings and single-leg landings, sticking the landing.",
          "Keep the knee over the foot — no inward collapse (valgus).",
          "Use hop tests (single, triple, crossover) to gauge symmetry with the other leg.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Hamstrings", "Operated leg"],
        difficulty: 4,
        sets: 3,
        reps: 6,
        restBetweenSetsSeconds: 90,
        notes: "Limb symmetry (often ≥90%) is a common return-to-sport criterion.",
        caution: "Stop if the knee caves inward or feels unstable.",
      },
      {
        name: "Lateral agility (side shuffle / carioca)",
        status: "upcoming",
        howTo: [
          "Side-shuffle in an athletic stance, staying low.",
          "Progress to carioca (cross-over running) and figure-8 runs.",
          "Increase speed and change-of-direction sharpness gradually.",
        ],
        musclesActivated: ["Glutes", "Quadriceps", "Adductors", "Operated leg"],
        difficulty: 4,
        sets: 3,
        reps: 6,
        restBetweenSetsSeconds: 90,
        notes: "Reintroduces multi-directional movement before sport drills.",
        caution: "Build up cutting/pivoting load slowly — a common re-injury mechanism.",
      },
      {
        name: "Sport-specific cutting & deceleration drills",
        status: "upcoming",
        howTo: [
          "Rehearse the cuts, pivots and decelerations your sport demands.",
          "Start planned and sub-maximal; progress to reactive/unplanned as cleared.",
          "Integrate ball/implement skills last.",
        ],
        musclesActivated: ["Quadriceps", "Glutes", "Hamstrings", "Calf", "Operated leg"],
        difficulty: 5,
        sets: 3,
        reps: 5,
        restBetweenSetsSeconds: 120,
        notes: "Final bridge to full return — clear with your surgeon/PT first.",
        caution: "Only after meeting strength, hop-symmetry and stability criteria.",
      },
    ],
  },
];

/**
 * The default protocol definitions (no ids/ordering). Exported so the timeline
 * backfill in lib/db.ts reuses the same source of truth as buildSeedData().
 */
export const SEED_STAGES: readonly SeedStage[] = SEED;

/** Build concrete Stage + Exercise records with ids and ordering. */
export function buildSeedData(): { stages: Stage[]; exercises: Exercise[] } {
  const stages: Stage[] = [];
  const exercises: Exercise[] = [];

  SEED.forEach((s, si) => {
    const stageId = newId();
    stages.push({
      id: stageId,
      name: s.name,
      order: si,
      note: s.note,
      startWeekPostOp: s.startWeekPostOp,
      endWeekPostOp: s.endWeekPostOp,
    });
    s.exercises.forEach((e, ei) => {
      exercises.push({ ...e, id: newId(), stageId, order: ei });
    });
  });

  return { stages, exercises };
}

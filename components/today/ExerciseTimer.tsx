"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/lib/types";
import { Button, Sheet } from "@/components/ui/primitives";

interface Phase {
  kind: "hold" | "restRep" | "restSet" | "work";
  seconds: number; // 0 for manual "work" steps
  label: string;
  reps?: number; // shown for "work" steps
}

function buildPhases(ex: Exercise): Phase[] {
  const phases: Phase[] = [];
  const sets = Math.max(1, ex.sets || 1);
  const reps = Math.max(1, ex.reps || 1);
  for (let s = 0; s < sets; s++) {
    if (ex.holdSeconds) {
      // Timed per-rep work: a hold countdown for each rep (+ optional rest between reps).
      for (let r = 0; r < reps; r++) {
        phases.push({
          kind: "hold",
          seconds: ex.holdSeconds,
          label: `Set ${s + 1}/${sets} · Rep ${r + 1}/${reps} — Hold`,
        });
        if (ex.restBetweenRepsSeconds && r < reps - 1) {
          phases.push({ kind: "restRep", seconds: ex.restBetweenRepsSeconds, label: "Rest" });
        }
      }
    } else {
      // Untimed reps: a single manual step for the set ("do your reps, tap Next").
      phases.push({ kind: "work", seconds: 0, label: `Set ${s + 1}/${sets}`, reps });
    }
    if (ex.restBetweenSetsSeconds && s < sets - 1) {
      phases.push({ kind: "restSet", seconds: ex.restBetweenSetsSeconds, label: "Rest between sets" });
    }
  }
  return phases;
}

function buzz(ms = 120) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}

export function ExerciseTimer({
  ex,
  open,
  onClose,
}: {
  ex: Exercise;
  open: boolean;
  onClose: () => void;
}) {
  const phases = useMemo(() => buildPhases(ex), [ex]);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(phases[0]?.seconds ?? 0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when opened.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setRemaining(phases[0]?.seconds ?? 0);
      setRunning(false);
      setFinished(false);
    }
  }, [open, phases]);

  const current = phases[index];
  const isWork = current?.kind === "work";
  const isRest = current ? current.kind === "restRep" || current.kind === "restSet" : false;
  const isLast = index >= phases.length - 1;

  // Move to the next phase, or finish. Pauses when landing on a manual "work" step.
  const goTo = useCallback(
    (nextIdx: number) => {
      if (nextIdx >= phases.length) {
        setFinished(true);
        setRunning(false);
        return;
      }
      setIndex(nextIdx);
      setRemaining(phases[nextIdx].seconds);
      if (phases[nextIdx].kind === "work") setRunning(false);
    },
    [phases],
  );

  // Countdown ticking — only for timed phases.
  useEffect(() => {
    if (!running || !current || current.kind === "work") return;
    tick.current = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, current]);

  // Advance when a timed phase reaches zero.
  useEffect(() => {
    if (!running || !current || current.kind === "work") return;
    if (remaining === 0) {
      buzz(180);
      goTo(index + 1);
    }
  }, [remaining, running, current, index, goTo]);

  if (phases.length === 0) return null;

  const manualNext = () => {
    buzz(120);
    setRunning(false);
    goTo(index + 1);
  };

  return (
    <Sheet open={open} onClose={onClose} title={ex.name}>
      <div className="flex flex-col items-center gap-4 py-2">
        {finished ? (
          <>
            <p className="text-sm font-medium text-neutral-500">Done! 🎉</p>
            <div className="flex h-44 w-44 items-center justify-center rounded-full border-8 border-brand text-5xl font-bold text-brand">
              ✓
            </div>
            <p className="text-xs text-neutral-400">{phases.length} steps complete</p>
            <Button className="w-full" onClick={onClose}>
              Close
            </Button>
          </>
        ) : isWork ? (
          <>
            <p className="text-sm font-medium text-neutral-500">{current.label}</p>
            <div className="flex h-44 w-44 flex-col items-center justify-center rounded-full border-8 border-brand text-brand">
              <span className="text-5xl font-bold tabular-nums">{current.reps}</span>
              <span className="text-sm font-medium">reps</span>
            </div>
            <p className="text-xs text-neutral-400">
              Step {index + 1} of {phases.length}
            </p>
            <Button className="w-full" onClick={manualNext}>
              {isLast ? "Finish" : "Done — next"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-neutral-500">{current?.label}</p>
            <div
              className={
                "flex h-44 w-44 items-center justify-center rounded-full border-8 font-mono text-5xl font-bold tabular-nums " +
                (isRest
                  ? "border-amber-300 text-amber-600 dark:border-amber-700"
                  : "border-brand text-brand")
              }
            >
              {remaining}
            </div>
            <p className="text-xs text-neutral-400">
              Step {index + 1} of {phases.length}
            </p>

            <div className="flex w-full gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setRunning(false);
                  setRemaining(current?.seconds ?? 0);
                }}
              >
                Reset step
              </Button>
              <Button className="flex-1" onClick={() => setRunning((v) => !v)}>
                {running ? "Pause" : "Start"}
              </Button>
              <Button variant="ghost" onClick={manualNext}>
                Skip ⏭
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

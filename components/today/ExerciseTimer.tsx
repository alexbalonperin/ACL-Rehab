"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/lib/types";
import { Button, Sheet } from "@/components/ui/primitives";

interface Phase {
  kind: "hold" | "restRep" | "restSet";
  seconds: number;
  label: string;
}

function buildPhases(ex: Exercise): Phase[] {
  const phases: Phase[] = [];
  const sets = Math.max(1, ex.sets || 1);
  const reps = Math.max(1, ex.reps || 1);
  for (let s = 0; s < sets; s++) {
    for (let r = 0; r < reps; r++) {
      if (ex.holdSeconds) {
        phases.push({
          kind: "hold",
          seconds: ex.holdSeconds,
          label: `Set ${s + 1}/${sets} · Rep ${r + 1}/${reps} — Hold`,
        });
      }
      if (ex.restBetweenRepsSeconds && r < reps - 1) {
        phases.push({ kind: "restRep", seconds: ex.restBetweenRepsSeconds, label: "Rest" });
      }
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
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when opened.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setRemaining(phases[0]?.seconds ?? 0);
      setRunning(false);
    }
  }, [open, phases]);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        // Phase finished — advance.
        buzz(180);
        setIndex((i) => {
          const nextIdx = i + 1;
          if (nextIdx >= phases.length) {
            setRunning(false);
            return i;
          }
          setRemaining(phases[nextIdx].seconds);
          return nextIdx;
        });
        return 0;
      });
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, phases]);

  const current = phases[index];
  const done = index >= phases.length - 1 && remaining === 0 && !running;
  const isRest = current?.kind !== "hold";

  if (phases.length === 0) return null;

  return (
    <Sheet open={open} onClose={onClose} title={ex.name}>
      <div className="flex flex-col items-center gap-4 py-2">
        <p className="text-sm font-medium text-neutral-500">
          {done ? "Done! 🎉" : current?.label}
        </p>
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
          Step {Math.min(index + 1, phases.length)} of {phases.length}
        </p>

        <div className="flex w-full gap-2">
          {!done ? (
            <>
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
                {running ? "Pause" : remaining === 0 ? "Next" : "Start"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const next = Math.min(index + 1, phases.length - 1);
                  setIndex(next);
                  setRemaining(phases[next].seconds);
                }}
              >
                Skip ⏭
              </Button>
            </>
          ) : (
            <Button className="flex-1" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

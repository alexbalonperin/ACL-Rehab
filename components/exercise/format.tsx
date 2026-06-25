"use client";

import type { Exercise } from "@/lib/types";
import { Chip } from "@/components/ui/primitives";

export function summaryLine(ex: Exercise): string {
  let s = `${ex.sets}×${ex.reps}`;
  if (ex.holdSeconds) s += ` · ${ex.holdSeconds}s hold`;
  return s;
}

export function DifficultyDots({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Difficulty ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            i <= value
              ? "h-1.5 w-1.5 rounded-full bg-brand"
              : "h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700"
          }
        />
      ))}
    </span>
  );
}

/** The expandable detail block: how-to, muscles, timings, notes. */
export function ExerciseDetails({ ex }: { ex: Exercise }) {
  return (
    <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
      {ex.caution && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          ⚠️ {ex.caution}
        </p>
      )}

      {ex.howTo.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            How to
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-neutral-700 dark:text-neutral-300">
            {ex.howTo.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {ex.musclesActivated.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Muscles
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ex.musclesActivated.map((m) => (
              <Chip key={m} tone="brand">
                {m}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Prescription
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{ex.sets} sets</Chip>
          <Chip>{ex.reps} reps</Chip>
          {ex.holdSeconds ? <Chip>{ex.holdSeconds}s hold</Chip> : null}
          {ex.restBetweenRepsSeconds ? (
            <Chip>{ex.restBetweenRepsSeconds}s rest / rep</Chip>
          ) : null}
          {ex.restBetweenSetsSeconds ? (
            <Chip>{ex.restBetweenSetsSeconds}s rest / set</Chip>
          ) : null}
        </div>
      </div>

      {ex.notes && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Notes
          </p>
          <p className="text-neutral-700 dark:text-neutral-300">{ex.notes}</p>
        </div>
      )}
    </div>
  );
}

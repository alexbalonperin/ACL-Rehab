"use client";

import { useExercisesByStatus, useTodayLog } from "@/lib/hooks/useData";
import { TodayExerciseRow } from "./TodayExerciseRow";

export function TodayList() {
  const active = useExercisesByStatus("active");
  const logs = useTodayLog();

  if (!active || !logs) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        No active exercises yet. Move some into the <strong>Active</strong> bucket on the
        Plan screen.
      </p>
    );
  }

  const sorted = [...active].sort((a, b) => a.order - b.order);
  const logByEx = new Map(logs.map((l) => [l.exerciseId, l]));
  const doneCount = sorted.filter((e) => logByEx.get(e.id)?.completed).length;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-neutral-500">
        {doneCount}/{sorted.length} done today
      </p>
      {sorted.map((ex) => (
        <TodayExerciseRow key={ex.id} ex={ex} log={logByEx.get(ex.id)} />
      ))}
    </div>
  );
}

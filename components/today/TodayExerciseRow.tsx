"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Exercise, LogEntry } from "@/lib/types";
import { db } from "@/lib/db";
import { today } from "@/lib/date";
import { useSessionStore } from "@/lib/session-store";
import { summaryLine } from "@/components/exercise/format";
import { NumberStepper, TextInput } from "@/components/ui/primitives";
import { ExerciseTimer } from "./ExerciseTimer";

export function TodayExerciseRow({ ex, log }: { ex: Exercise; log?: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);

  const completed = log?.completed ?? false;
  const hasTimer = Boolean(
    ex.holdSeconds || ex.restBetweenRepsSeconds || ex.restBetweenSetsSeconds,
  );

  const upsert = (patch: Partial<LogEntry>) =>
    db.logs.upsertForExerciseToday(today(), ex.id, patch, currentSessionId());

  return (
    <div
      className={clsx(
        "rounded-xl border p-3 transition-colors",
        completed
          ? "border-brand/40 bg-brand/5"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => upsert({ completed: !completed })}
          aria-label={completed ? "mark not done" : "mark done"}
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-lg",
            completed
              ? "border-brand bg-brand text-white"
              : "border-neutral-300 text-transparent dark:border-neutral-600",
          )}
        >
          ✓
        </button>
        <button className="flex-1 text-left" onClick={() => setExpanded((v) => !v)}>
          <div className="flex items-center gap-2">
            <span className={clsx("font-semibold", completed && "line-through opacity-60")}>
              {ex.name}
            </span>
            {ex.caution && <span title="Caution">⚠️</span>}
          </div>
          <span className="text-xs text-neutral-500">{summaryLine(ex)}</span>
        </button>
        {hasTimer && (
          <button
            onClick={() => setTimerOpen(true)}
            className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            ⏱ Timer
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Sets done
              </p>
              <NumberStepper
                value={log?.setsDone ?? ex.sets}
                onChange={(v) => upsert({ setsDone: v })}
                max={50}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Reps done
              </p>
              <NumberStepper
                value={log?.repsDone ?? ex.reps}
                onChange={(v) => upsert({ repsDone: v })}
                max={200}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Pain (0–10)
            </p>
            <NumberStepper
              value={log?.painLevel}
              onChange={(v) => upsert({ painLevel: v })}
              max={10}
            />
          </div>
          <TextInput
            placeholder="Quick note…"
            defaultValue={log?.notes ?? ""}
            onBlur={(e) => upsert({ notes: e.target.value })}
          />
        </div>
      )}

      {timerOpen && (
        <ExerciseTimer ex={ex} open={timerOpen} onClose={() => setTimerOpen(false)} />
      )}
    </div>
  );
}

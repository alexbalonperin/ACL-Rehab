"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Exercise, ExerciseStatus } from "@/lib/types";
import { DifficultyDots, ExerciseDetails, summaryLine } from "@/components/exercise/format";

const ORDER: ExerciseStatus[] = ["upcoming", "active", "graduated"];

export function ExerciseCard({
  ex,
  onSetStatus,
}: {
  ex: Exercise;
  onSetStatus: (id: string, status: ExerciseStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ex.id });

  const idx = ORDER.indexOf(ex.status);
  const prev = ORDER[idx - 1];
  const next = ORDER[idx + 1];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        "rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        isDragging && "opacity-60 ring-2 ring-brand",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle (desktop). On mobile, tap buttons below are primary. */}
        <button
          {...attributes}
          {...listeners}
          className="hidden cursor-grab touch-none select-none px-1 text-neutral-300 hover:text-neutral-500 sm:block"
          aria-label="drag to move"
        >
          ⠿
        </button>

        <button
          className="flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold leading-tight">{ex.name}</span>
            {ex.caution && <span title="Caution">⚠️</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
            <DifficultyDots value={ex.difficulty} />
            <span>{summaryLine(ex)}</span>
          </div>
        </button>
      </div>

      {/* Tap-to-move (primary on mobile) */}
      <div className="mt-2 flex items-center gap-2">
        <button
          disabled={!prev}
          onClick={() => prev && onSetStatus(ex.id, prev)}
          className="flex-1 rounded-lg bg-neutral-100 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-300"
        >
          ◀ {prev ?? ""}
        </button>
        <button
          disabled={!next}
          onClick={() => next && onSetStatus(ex.id, next)}
          className="flex-1 rounded-lg bg-neutral-100 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {next ?? ""} ▶
        </button>
      </div>

      {expanded && <ExerciseDetails ex={ex} />}
    </div>
  );
}

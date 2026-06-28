"use client";

import { useMemo } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import clsx from "clsx";
import type { Exercise, ExerciseStatus, Stage } from "@/lib/types";
import { db } from "@/lib/db";
import { useExercises, useRehabSettings, useStages } from "@/lib/hooks/useData";
import { currentPhaseId, weeksPostOp } from "@/lib/rehab";
import { tokyoToday } from "@/lib/date";
import { ExerciseCard } from "./ExerciseCard";
import { PhaseDetail } from "./PhaseDetail";

const BUCKETS: { status: ExerciseStatus; label: string; tone: string }[] = [
  { status: "active", label: "Active — cleared to do now", tone: "border-brand/40" },
  { status: "upcoming", label: "Upcoming", tone: "border-neutral-200 dark:border-neutral-800" },
  { status: "graduated", label: "Graduated", tone: "border-neutral-200 dark:border-neutral-800" },
];

function Bucket({
  id,
  label,
  tone,
  items,
  onSetStatus,
}: {
  id: string;
  label: string;
  tone: string;
  items: Exercise[];
  onSetStatus: (id: string, s: ExerciseStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "rounded-2xl border-2 border-dashed p-2 transition-colors",
        tone,
        isOver && "border-brand bg-brand/5",
      )}
    >
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label} <span className="text-neutral-400">({items.length})</span>
      </p>
      <SortableContext items={items.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((ex) => (
            <ExerciseCard key={ex.id} ex={ex} onSetStatus={onSetStatus} />
          ))}
          {items.length === 0 && (
            <p className="px-1 py-3 text-center text-xs text-neutral-400">Nothing here yet</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function Board() {
  const stages = useStages();
  const exercises = useExercises();
  const settings = useRehabSettings();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Delay activation on touch so vertical scrolling still works.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // bucketKey -> ordered exercises
  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    if (!exercises) return map;
    for (const ex of exercises) {
      const key = `${ex.stageId}:${ex.status}`;
      const arr = map.get(key) ?? [];
      arr.push(ex);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order);
    return map;
  }, [exercises]);

  function bucketOf(id: string): string | null {
    // A droppable id is "stageId:status"; a draggable id is an exercise id.
    if (id.includes(":")) return id;
    const ex = exercises?.find((e) => e.id === id);
    return ex ? `${ex.stageId}:${ex.status}` : null;
  }

  async function handleDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    if (!e.over) return;
    const overBucket = bucketOf(String(e.over.id));
    const fromEx = exercises?.find((x) => x.id === activeId);
    if (!overBucket || !fromEx) return;

    const [stageId, status] = overBucket.split(":") as [string, ExerciseStatus];
    const targetItems = (grouped.get(overBucket) ?? []).filter((x) => x.id !== activeId);

    // Determine insertion index from the element we dropped over.
    let insertAt = targetItems.length;
    const overId = String(e.over.id);
    if (!overId.includes(":")) {
      const i = targetItems.findIndex((x) => x.id === overId);
      if (i >= 0) insertAt = i;
    }
    targetItems.splice(insertAt, 0, { ...fromEx, stageId, status });

    // Persist: update moved exercise's stage/status, then renumber the bucket.
    await db.exercises.update(activeId, { stageId, status });
    await db.exercises.bulkPut(targetItems.map((x, i) => ({ ...x, order: i })));
  }

  if (!stages || !exercises) {
    return <BoardSkeleton />;
  }

  const setStatus = (id: string, status: ExerciseStatus) =>
    db.exercises.setStatus(id, status);

  const todayStr = tokyoToday();
  const weeks = settings ? weeksPostOp(settings.surgeryDate, todayStr) : 0;
  const currentId = settings ? currentPhaseId(stages, weeks) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {stages.map((stage: Stage) => (
          <section key={stage.id}>
            <h2 className="text-base font-bold">{stage.name}</h2>
            {stage.note && (
              <p className="mb-2 mt-0.5 text-xs text-neutral-500">{stage.note}</p>
            )}
            {settings && (
              <PhaseDetail
                stage={stage}
                weeks={weeks}
                todayStr={todayStr}
                surgeryDate={settings.surgeryDate}
                isCurrent={stage.id === currentId}
              />
            )}
            <div className="mt-3 space-y-3">
              {BUCKETS.map((b) => (
                <Bucket
                  key={b.status}
                  id={`${stage.id}:${b.status}`}
                  label={b.label}
                  tone={b.tone}
                  items={grouped.get(`${stage.id}:${b.status}`) ?? []}
                  onSetStatus={setStatus}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </DndContext>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
      ))}
    </div>
  );
}

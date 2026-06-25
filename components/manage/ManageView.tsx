"use client";

import { useState } from "react";
import type { Exercise, Stage } from "@/lib/types";
import { db } from "@/lib/db";
import { useExercises, useStages } from "@/lib/hooks/useData";
import { Button, Card, SectionTitle } from "@/components/ui/primitives";
import { summaryLine } from "@/components/exercise/format";
import { ExerciseForm } from "./ExerciseForm";
import { StageForm } from "./StageForm";
import { PtNotesPanel } from "./PtNotesPanel";
import { BackupPanel } from "./BackupPanel";
import { SurgeryDateSetting } from "./SurgeryDateSetting";

function ReorderArrows({ onUp, onDown, first, last }: { onUp: () => void; onDown: () => void; first: boolean; last: boolean }) {
  return (
    <div className="flex flex-col">
      <button
        onClick={onUp}
        disabled={first}
        className="px-2 text-neutral-400 disabled:opacity-20"
        aria-label="move up"
      >
        ▲
      </button>
      <button
        onClick={onDown}
        disabled={last}
        className="px-2 text-neutral-400 disabled:opacity-20"
        aria-label="move down"
      >
        ▼
      </button>
    </div>
  );
}

export function ManageView() {
  const stages = useStages();
  const exercises = useExercises();

  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | undefined>();
  const [exFormOpen, setExFormOpen] = useState(false);
  const [exContext, setExContext] = useState<{ stageId: string; existing?: Exercise; nextOrder: number }>({
    stageId: "",
    nextOrder: 0,
  });

  if (!stages || !exercises) {
    return <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />;
  }

  const exByStage = (stageId: string) =>
    exercises.filter((e) => e.stageId === stageId).sort((a, b) => a.order - b.order);

  async function moveStage(idx: number, dir: -1 | 1) {
    const ordered = [...stages!];
    const j = idx + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[idx], ordered[j]] = [ordered[j], ordered[idx]];
    await db.stages.reorder(ordered.map((s) => s.id));
  }

  async function moveExercise(stageId: string, idx: number, dir: -1 | 1) {
    const list = exByStage(stageId);
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    await db.exercises.reorderInStage(stageId, list.map((e) => e.id));
  }

  return (
    <div>
      <SectionTitle
        action={
          <Button
            onClick={() => {
              setEditingStage(undefined);
              setStageFormOpen(true);
            }}
          >
            + Stage
          </Button>
        }
      >
        Stages &amp; exercises
      </SectionTitle>

      <div className="space-y-4">
        {stages.map((stage, si) => {
          const list = exByStage(stage.id);
          return (
            <Card key={stage.id}>
              <div className="flex items-start gap-2">
                <ReorderArrows
                  onUp={() => moveStage(si, -1)}
                  onDown={() => moveStage(si, 1)}
                  first={si === 0}
                  last={si === stages.length - 1}
                />
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    setEditingStage(stage);
                    setStageFormOpen(true);
                  }}
                >
                  <p className="font-bold">{stage.name}</p>
                  {stage.note && <p className="text-xs text-neutral-500">{stage.note}</p>}
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                {list.map((ex, ei) => (
                  <div
                    key={ex.id}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
                  >
                    <ReorderArrows
                      onUp={() => moveExercise(stage.id, ei, -1)}
                      onDown={() => moveExercise(stage.id, ei, 1)}
                      first={ei === 0}
                      last={ei === list.length - 1}
                    />
                    <button
                      className="flex-1 text-left"
                      onClick={() => {
                        setExContext({ stageId: stage.id, existing: ex, nextOrder: ex.order });
                        setExFormOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ex.name}</span>
                        {ex.caution && <span title="Caution">⚠️</span>}
                      </div>
                      <span className="text-xs capitalize text-neutral-500">
                        {ex.status} · {summaryLine(ex)}
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => {
                  setExContext({ stageId: stage.id, existing: undefined, nextOrder: list.length });
                  setExFormOpen(true);
                }}
              >
                + Add exercise
              </Button>
            </Card>
          );
        })}
      </div>

      <SectionTitle>Rehab settings</SectionTitle>
      <SurgeryDateSetting />

      <SectionTitle>PT notes</SectionTitle>
      <PtNotesPanel />

      <SectionTitle>Backup</SectionTitle>
      <BackupPanel />

      {stageFormOpen && (
        <StageForm
          open={stageFormOpen}
          onClose={() => setStageFormOpen(false)}
          existing={editingStage}
          nextOrder={stages.length}
        />
      )}
      {exFormOpen && (
        <ExerciseForm
          open={exFormOpen}
          onClose={() => setExFormOpen(false)}
          stages={stages}
          stageId={exContext.stageId}
          existing={exContext.existing}
          nextOrder={exContext.nextOrder}
        />
      )}
    </div>
  );
}
